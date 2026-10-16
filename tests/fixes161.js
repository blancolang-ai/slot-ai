// Pruebas de las correcciones de v1.6.1 (solo datos sintéticos).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const M=require('../js/monefy.js');
const URL=process.env.URL||'http://localhost:8123/gastos/';const ROOT=path.join(__dirname,'..');const LOCAL=!process.env.LIVE;
const results=[];const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' → '+JSON.stringify(x)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
const base=()=>({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'A',name:'Caja',icon:'banknotes',initial:10000},{id:'B',name:'Banco',icon:'card',initial:5000}],
 categories:[{id:'c1',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'c2',type:'expense',name:'Casa',icon:'house',color:'#5aa5dc'},{id:'i1',type:'income',name:'Salario',icon:'briefcase',color:'#43a86a'}],
 transactions:[{id:'t1',type:'expense',amount:1000,date:'2026-10-02',accountId:'A',categoryId:'c1',note:''},{id:'t2',type:'expense',amount:500,date:'2026-10-03',accountId:'B',categoryId:'c2',note:''}]});
const QUOTA=keys=>`(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(${JSON.stringify(keys)}.some(x=>k===x||k.startsWith(x)))throw new DOMException('full','QuotaExceededError');return o.call(this,k,v);};window.__unq=()=>{Storage.prototype.setItem=o;};})()`;
(async()=>{
 // ---- estáticas (repo) ----
 if(LOCAL){const audit=fs.readFileSync(path.join(__dirname,'audit.js'),'utf8');
  ok('tests no leen la carpeta privada',['audit.js','e2e.js'].every(f=>!/workspace\/priv/.test(fs.readFileSync(path.join(__dirname,f),'utf8'))));
  ok('sin prueba con datos reales en tests',!/datos privados|PRIV\b/.test(audit));
  const app=fs.readFileSync(path.join(ROOT,'js/app.js'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),rd=fs.readFileSync(path.join(ROOT,'README.md'),'utf8');
  const av=app.match(/APP_VERSION='([\d.]+)'/)[1],sv=sw.match(/slot-ai-v([\d.]+)/)[1];
  ok('versión coherente app/sw/README ('+av+')',av===sv&&rd.includes('(v'+av+')'));
  ok('SW: index.html solo como respaldo de navegación',/mode==='navigate'/.test(sw));
  ok('Pages no publica tests/docs/screenshots (_config.yml)',/tests[\s\S]*docs[\s\S]*screenshots/.test(fs.readFileSync(path.join(ROOT,'_config.yml'),'utf8')));}
 // ---- Monefy (Node) ----
 {const csv='date,account,category,amount,currency,description\n02/03/2025,Caja,Café,-2.5,EUR,\n02/03/2025,Caja,Café,-2.5,EUR,\n';const p=M.parse(csv);
  const r1=M.build(p,{settings:{},accounts:[],categories:[],transactions:[]},'merge');ok('Monefy Añadir: dos filas iguales reales se conservan',r1.added===2&&r1.dup===0,r1);
  const r2=M.build(p,r1.data,'merge');ok('Monefy Añadir otra vez: omite exactamente las 2 existentes',r2.added===0&&r2.dup===2,r2);
  const p3=M.parse(csv+'02/03/2025,Caja,Café,-2.5,EUR,\n');const r3=M.build(p3,r1.data,'merge');ok('Monefy Añadir: una tercera copia nueva sí se añade',r3.added===1&&r3.dup===2,r3);
  const amt=c=>M.parse('date,account,category,amount\n'+c.map((a,i)=>`0${i+1}/01/2025,Caja,X,"${a}"`).join('\n')).tx.map(t=>t.amount);
  ok('miles: archivo con punto decimal → -1.250 = 1,25 €',JSON.stringify(amt(['-12.5','-1.250']))==='[1250,125]');
  ok('miles: archivo con coma decimal → -1.250 = 1.250 €',JSON.stringify(amt(['-12,5','-1.250']))==='[1250,125000]');
  ok('miles: 12.345,67 y 12,345.67',M.parseAmount('12.345,67')===1234567&&M.parseAmount('12,345.67')===1234567);
  ok('miles: 1.234 y 1,234 sin contexto = 1.234 €',M.parseAmount('1.234')===123400&&M.parseAmount('1,234')===123400);
  ok('miles: agrupación inválida rechazada (1.23.4, 12.34,5)',isNaN(M.parseAmount('1.23.4'))&&isNaN(M.parseAmount('12.34,5')));
  ok('escrito a mano: 12.5=12,50; 1,234 rechazado; 1.234,56 ok',M.parseAmount('12.5','typed')===1250&&isNaN(M.parseAmount('1,234','typed'))&&M.parseAmount('1.234,56','typed')===123456);}
 const b=await chromium.launch();
 const mk=async()=>{const c=await b.newContext({viewport:{width:390,height:844},locale:'es-ES',timezoneId:'Europe/Madrid',acceptDownloads:true});await c.addInitScript(()=>{try{localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9));}catch(e){}});return c;};
 let ctx=await mk();let p=await ctx.newPage();const errs=[];const watch=pg=>pg.on('pageerror',e=>errs.push(e.message));watch(p);
 const seed=async(d,pg=p)=>{await pg.goto(URL);await pg.evaluate(d=>{for(const k of Object.keys(localStorage))if(k.startsWith('gastos'))localStorage.removeItem(k);localStorage.setItem('gastos.v1',typeof d==='string'?d:JSON.stringify(d));},d);await pg.reload();await pg.waitForTimeout(150);};
 const imp=async(obj,pg=p)=>{fs.writeFileSync('/tmp/f161.json',typeof obj==='string'?obj:JSON.stringify(obj));await pg.goto(URL+'#/ajustes');await pg.waitForSelector('#fileImport',{state:'attached'});await pg.setInputFiles('#fileImport','/tmp/f161.json');await pg.click('#dlgOk');await pg.waitForTimeout(250);};
 const stored=()=>p.evaluate(()=>localStorage.getItem('gastos.v1'));
 const toastTxt=()=>p.textContent('#toast');
 // ---- XSS por id ----
 const X='"><img src=x onerror="window.__x=1">';
 for(const [lab,mut] of [['movimiento',d=>{d.transactions[0].id=X;}],['categoría',d=>{d.categories[0].id=X;d.transactions[0].categoryId=X;}],['cuenta',d=>{d.accounts[0].id=X;d.transactions[0].accountId=X;}]]){
  await seed(base());const before=await stored();const d=base();mut(d);await imp(d);ok('restaurar rechaza id de '+lab+' con HTML',/No se pudo restaurar/.test(await p.textContent('#dlg').catch(()=>''))&&(await stored())===before);await p.keyboard.press('Escape');
  // aunque llegue a localStorage (sin validar), se escapa al pintar
  await seed(d);await p.goto(URL+'#/lista');await p.reload();await p.waitForTimeout(100);for(const g of await p.$$('[data-act="toggle"]'))await g.click().catch(()=>{});
  await p.goto(URL);await p.waitForTimeout(100);await p.click('[data-act="left"]');await p.click('#accCard');await p.keyboard.press('Escape');await p.click('[data-act="right"]');await p.keyboard.press('Escape');
  await p.click('[data-act="add"][data-type="expense"]');await p.click('#entry [data-key="5"]');await p.click('#eChoose');await p.keyboard.press('Escape');await p.goto(URL+'#/categorias');await p.waitForTimeout(100);
  ok('id de '+lab+' con HTML no se ejecuta al pintar',!(await p.evaluate(()=>window.__x)));}
 // ---- C1 ----
 {const d=base();d.transactions.push(null);d.categories.push(null);await seed(d);ok('C1: un registro nulo no borra el resto',(await p.evaluate(()=>[Store.data.transactions.length,!Store.corrupt]))+''==='2,true');}
 await seed('{"version":4,"categories":[],"transactions":[');
 ok('C1: datos ilegibles → aviso claro con recuperación',/No se pudieron leer tus datos/.test(await p.textContent('#dlg'))&&!!(await p.$('#cDown'))&&!!(await p.$('#cRestore')));
 {const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#cDown')]);const f=await dl.path();ok('C1: «Descargar datos dañados» entrega el original',fs.readFileSync(f,'utf8')==='{"version":4,"categories":[],"transactions":[');}
 await p.click('#dlgOk');await p.click('[data-act="add"][data-type="income"]');await p.click('#entry [data-key="5"]');await p.click('#eChoose');await p.click('[data-eact="pick"]');await p.waitForTimeout(150);
 ok('C1: con datos dañados no se guarda nada (original intacto) y se avisa',(await stored())==='{"version":4,"categories":[],"transactions":['&&/datos guardados están dañados/.test(await toastTxt()));
 ok('C1: copia interna gastos.v1.corrupt-* y botón en Ajustes',await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('gastos.v1.corrupt-'))));
 await p.keyboard.press('Escape');await p.goto(URL+'#/ajustes');await p.reload();await p.waitForTimeout(150);await p.keyboard.press('Escape');ok('C1: Ajustes ofrece descargar los datos dañados',!!(await p.$('#btnCorrupt')),await p.evaluate(()=>[location.hash,Object.keys(localStorage),!!document.querySelector('#dlg'),document.querySelector('#app').innerText.slice(0,200)]));
 ok('C1: no se acumulan copias al reabrir',(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('gastos.v1.corrupt-')).length))===1);
 // restaurar copia válida estando dañado
 await imp(base());ok('C1: restaurar copia sustituye los dañados',(await p.evaluate(()=>[Store.data.transactions.length,!Store.corrupt]))+''==='2,true'&&await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('gastos.v1.corrupt-'))));
 // sin espacio para la copia interna: no se puede empezar de cero sin descargar
 await ctx.close();ctx=await mk();await ctx.addInitScript(QUOTA(['gastos.v1.corrupt-']));p=await ctx.newPage();watch(p);
 await p.goto(URL);await p.evaluate(()=>{localStorage.setItem('gastos.v1','{roto');});await p.reload();await p.waitForTimeout(150);
 await p.click('#cFresh');await p.waitForTimeout(100);ok('C1: sin copia interna, «Empezar de cero» exige descargar primero',/Descarga primero/.test(await p.textContent('#dlg'))&&(await stored())==='{roto');
 await p.click('#dlgOk');await p.waitForTimeout(100);const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#cDown')]);await p.click('#cFresh');await p.waitForTimeout(100);
 ok('C1: tras descargar, empezar de cero funciona',(await stored())!=='{roto'&&!(await p.evaluate(()=>Store.corrupt)));
 // ---- C2: cada ruta de guardado avisa y deshace ----
 await ctx.close();ctx=await mk();p=await ctx.newPage();watch(p);await seed(base());
 const q=()=>p.evaluate(QUOTA(['gastos.v1']));const uq=()=>p.evaluate(()=>window.__unq());const clr=()=>p.evaluate(()=>{document.querySelector('#toast').textContent='';});
 await q();await clr();await p.click('[data-act="add"][data-type="income"]');await p.click('#entry [data-key="5"]');await p.click('#eChoose');await p.click('[data-eact="pick"]');await p.waitForTimeout(150);
 ok('C2: nuevo movimiento avisa y no cambia',/No se pudo guardar/.test(await toastTxt())&&(await p.evaluate(()=>Store.data.transactions.length))===2);await p.keyboard.press('Escape');await p.waitForTimeout(100);
 await clr();await p.goto(URL+'#/categorias');await p.waitForTimeout(100);await p.click('.grow:has-text("Comida")');await p.click('#fDel');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('C2: eliminar categoría avisa y deshace',/No se pudo guardar/.test(await toastTxt())&&(await p.evaluate(()=>Store.data.categories.length))===3);await p.keyboard.press('Escape');
 await clr();await p.goto(URL);await q();await p.click('[data-act="right"]');await p.click('.arow:has-text("Banco")');await p.click('#fDel');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('C2: eliminar cuenta avisa y deshace',/No se pudo guardar/.test(await toastTxt())&&(await p.evaluate(()=>[Store.data.accounts.length,Store.data.transactions.filter(t=>t.accountId==='B').length]))+''==='2,1');await p.keyboard.press('Escape');
 await clr();await p.goto(URL+'#/ajustes');await p.waitForTimeout(100);if(!(await p.evaluate(()=>!!window.__unq)))await q();await p.click('[data-act="reset"]');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('C2: borrar todo avisa y deshace',/No se pudo guardar/.test(await toastTxt())&&(await p.evaluate(()=>Store.data.transactions.length))===2);
 await clr();await p.click('#setDark');await p.waitForTimeout(150);ok('C2: ajuste (tema oscuro) avisa y deshace',/No se pudo guardar/.test(await toastTxt())&&!(await p.evaluate(()=>Store.data.settings.dark))&&!(await p.isChecked('#setDark')));
 await clr();await p.setInputFiles('#fileMonefy',{name:'m.csv',mimeType:'text/csv',buffer:Buffer.from('date,account,category,amount\n01/01/2025,Caja,X,-5\n')});await p.waitForSelector('#mfPrev');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('C2: importar Monefy avisa y deshace',/No se pudo guardar/.test(await toastTxt())&&(await p.evaluate(()=>Store.data.transactions.length))===2);
 await clr();fs.writeFileSync('/tmp/f161.json',JSON.stringify(base()));await p.setInputFiles('#fileImport','/tmp/f161.json');await p.click('#dlgOk');await p.waitForTimeout(250);ok('C2: restaurar copia avisa y deshace',/No se pudo/.test((await p.textContent('#dlg').catch(()=>''))+(await toastTxt())));await p.keyboard.press('Escape');await uq();
 // ---- Deshacer seguro ----
 await seed(base());await p.evaluate(()=>{const old=JSON.parse(localStorage.getItem('gastos.v1'));old.accounts[0].name='VIEJA';old.transactions=[];localStorage.setItem('gastos.v1.prev',JSON.stringify({ts:Date.now(),data:old}));});
 await p.evaluate(QUOTA(['gastos.v1.prev']));const d3=base();d3.transactions.push({id:'t9',type:'income',amount:9900,date:'2026-10-04',accountId:'A',categoryId:'i1',note:''});await imp(d3);
 ok('Deshacer: si no se puede guardar la copia no se ofrece y no queda copia antigua',!(await p.$('#undoBtn'))&&!(await p.evaluate(()=>localStorage.getItem('gastos.v1.prev'))));await uq();
 await seed(base());await imp(d3);ok('Deshacer: se ofrece tras restaurar',!!(await p.$('#undoBtn')));
 await p.evaluate(()=>toast('Ordenado por nombre'));ok('Deshacer: otro mensaje no lo tapa',!!(await p.$('#undoBtn')));
 await p.evaluate(()=>Store.upsert('transactions',{type:'expense',amount:777,date:'2026-10-05',accountId:'A',categoryId:'c1',note:'despues'}));
 ok('Deshacer: un cambio posterior lo invalida (no se pierden cambios)',!(await p.$('#undoBtn'))&&!(await p.evaluate(()=>Store.hasPrev()))&&(await p.evaluate(()=>{try{Store.undo();return 'deshecho'}catch(e){return e.message}}))==='Ya no se puede deshacer.');
 await seed(base());await imp(d3);await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('gastos.v1.prev'));v.data.transactions[0].amount='mal';localStorage.setItem('gastos.v1.prev',JSON.stringify(v));});
 await p.click('#undoBtn');await p.waitForTimeout(150);ok('Deshacer: copia manipulada se rechaza sin tocar datos',(await p.evaluate(()=>Store.data.transactions.length))===3&&/Error/.test(await toastTxt()));
 await seed(base());await imp(d3);await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('gastos.v1.prev'));v.ts-=60000;localStorage.setItem('gastos.v1.prev',JSON.stringify(v));});
 ok('Deshacer: caduca (copia vieja no se puede usar)',!(await p.evaluate(()=>Store.hasPrev())));
 await seed(base());await imp(d3);await p.waitForTimeout(10400);ok('Deshacer: a los 10 s desaparece y se borra la copia',!(await p.$('#undoBtn'))&&!(await p.evaluate(()=>localStorage.getItem('gastos.v1.prev'))));
 // ---- Cuenta: saldo inicial descartado con aviso ----
 await seed(base());await p.click('[data-act="right"]');await p.click('.arow:has-text("Banco")');await p.click('#fDel');const w=await p.textContent('#dlg');await p.click('#dlgOk');await p.waitForTimeout(150);
 ok('cuenta: aviso «el saldo total cambiará en -50,00 €» y saldo inicial descartado',/saldo total cambiará en -50,00/.test(w)&&(await p.evaluate(()=>[balance(),Store.data.accounts.map(a=>a.initial).join()]))+''==='8500,10000',w);
 {const d=base();d.transactions=[];await seed(d);await p.click('[data-act="right"]');await p.click('.arow:has-text("Banco")');await p.click('#fDel');ok('cuenta vacía: también avisa del cambio',/saldo total cambiará en -50,00/.test(await p.textContent('#dlg')));await p.keyboard.press('Escape');}
 // ---- última categoría ----
 await seed(base());await p.goto(URL+'#/categorias');await p.click('[data-act="catTab"][data-t="expense"]');await p.click('.grow:has-text("Comida")');await p.click('#fDel');await p.click('#dlgOk');await p.waitForTimeout(150);
 await p.click('.grow:has-text("Casa")');await p.click('#fDel');ok('no se puede eliminar la última categoría de gasto',/al menos una categoría de gasto/.test(await p.textContent('#dlg')));await p.click('#dlgOk');await p.keyboard.press('Escape');
 ok('…y sigue existiendo',(await p.evaluate(()=>Store.data.categories.filter(c=>c.type==='expense').length))===1);
 await p.click('[data-act="catTab"][data-t="income"]');await p.click('.grow:has-text("Salario")');await p.click('#fDel');ok('tampoco la última de ingreso',/al menos una categoría de ingreso/.test(await p.textContent('#dlg')));await p.click('#dlgOk');await p.keyboard.press('Escape');
 // ---- teclado / pegar ----
 await seed(base());await p.click('[data-act="add"][data-type="expense"]');await p.keyboard.type('12,5');ok('teclado: 12,5',(await p.textContent('#amt'))==='12,5');
 await p.keyboard.press('Backspace');await p.keyboard.type('+3*2');await p.keyboard.press('=');ok('teclado: operaciones y = (12+3×2=18)',(await p.textContent('#amt'))==='18');
 await p.keyboard.press('Escape');await p.click('[data-act="add"][data-type="expense"]');
 const paste=async t=>p.evaluate(t=>{const dt=new DataTransfer();dt.setData('text/plain',t);document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}));return document.querySelector('#amt').textContent;},t);
 ok('pegar «1.234,56 €»',(await paste('1.234,56 €'))==='1234,56');ok('pegar texto no válido avisa y no cambia',(await paste('hola'))==='1234,56'&&/no válido/.test(await toastTxt()));
 await p.keyboard.press('Enter');ok('Enter: pasa a elegir categoría',!!(await p.$('.catgrid')));await p.keyboard.press('Escape');
 await p.click('[data-act="add"][data-type="expense"]');await p.click('#eNote');await p.keyboard.type('7x');ok('teclear en la nota no cambia el importe',(await p.textContent('#amt'))==='0'&&(await p.inputValue('#eNote'))==='7x');await p.keyboard.press('Escape');
 // ---- bajos ----
 await p.click('[data-act="add"][data-type="expense"]');for(const k of ['5','-','1','0','='])await p.click(`#entry [data-key="${k}"]`);
 ok('5-10= avisa y conserva la expresión',(await p.textContent('#amt'))==='5-10'&&/positivo/.test(await toastTxt()));
 await p.click('#entry [data-key="⌫"]');await p.click('#entry [data-key="⌫"]');await p.click('#entry [data-key="⌫"]');for(const k of ['/','0','='])await p.click(`#entry [data-key="${k}"]`);
 ok('5÷0 avisa «No se puede dividir entre 0»',/dividir entre 0/.test(await toastTxt()));const n0=await p.evaluate(()=>Store.data.transactions.length);await p.click('#eChoose');await p.click('[data-eact="pick"]');await p.waitForTimeout(100);ok('5÷0 no se puede guardar',(await p.evaluate(()=>Store.data.transactions.length))===n0&&/dividir entre 0/.test(await toastTxt()));await p.keyboard.press('Escape');await p.keyboard.press('Escape');
 ok('mes corto «sep»',(await p.evaluate(()=>[fmtDM('2026-09-05'),fmtShort('2025-09-05')]))+''==='5 sep,5 Sep 25');
 await p.evaluate(()=>{Store.setSetting('currency','$');render();});await p.click('[data-act="left"]');ok('etiqueta de moneda sigue el ajuste (no EUR fijo)',(await p.textContent('#accCard'))?.includes('$')&&!(await p.textContent('#accCard')).includes('EUR'));await p.keyboard.press('Escape');
 await p.evaluate(()=>{bar('upd','Nueva versión disponible','Actualizar',()=>{});toast('Guardado');});ok('aviso de nueva versión no lo tapa otro mensaje',!!(await p.$('#updBtn')));
 await p.evaluate(()=>{st.ptype='day';st.anchor=new Date(Date.now()-864e5);shownDay=iso(st.anchor);checkDay();});ok('cambio de día con la app abierta avanza a hoy',(await p.evaluate(()=>iso(st.anchor)===today())));
 await p.goto(URL+'#/ajustes');await p.evaluate(()=>{localStorage.removeItem('slotai.lastBackup');navigator.canShare=undefined;window.download=()=>{throw new Error('x');};});await p.click('#btnExport');await p.waitForTimeout(100);
 ok('copia: si la descarga falla no se marca «Última copia»',!(await p.evaluate(()=>localStorage.getItem('slotai.lastBackup')))&&/No se pudo descargar/.test(await toastTxt()));
 {const d=base();d.transactions[0].categoryId='borrada';await seed(d);ok('referencia a categoría inexistente queda «Sin categoría»',(await p.evaluate(()=>'categoryId' in Store.data.transactions[0])) ===false);}
 // ---- pestañas ----
 const A=await ctx.newPage(),B=await ctx.newPage();watch(A);await seed(base(),A);await B.goto(URL);await B.waitForTimeout(150);
 await A.click('[data-act="right"]');await A.click('.arow:has-text("Banco")');await A.waitForSelector('#fDel');await B.evaluate(()=>Store.moveAccount('B','A'));await A.waitForTimeout(250);
 ok('pestañas: formulario de cuenta eliminada en otra pestaña se cierra',!(await A.$('#form')));
 ok('pestañas: guardar un objeto eliminado no lo resucita',(await A.evaluate(()=>{try{Store.upsert('accounts',{id:'B',name:'Banco',icon:'card',initial:5000},true);return 'resucitada';}catch(e){return Store.data.accounts.length;}}))===1);
 await A.goto(URL+'#/lista');await A.waitForTimeout(100);await A.evaluate(()=>{for(const x of Store.data.transactions)st.open[x.categoryId]=true;render();});await A.click('.tx >> nth=0');await A.waitForSelector('#entry');
 const tid=await A.evaluate(()=>ed.tx.id);await B.evaluate(id=>Store.remove('transactions',id),tid);await A.waitForTimeout(250);
 ok('pestañas: edición de movimiento eliminado se cierra',!(await A.$('#entry')));
 ok('pestañas: el movimiento sigue eliminado',!(await A.evaluate(id=>Store.data.transactions.some(t=>t.id===id),tid)));
 await A.click('[data-act="right"]');await A.click('.arow >> nth=0');await A.click('#fDel');await A.waitForSelector('#dlg');
 await B.evaluate(()=>Store.upsert('accounts',{id:'Z',name:'Nueva',icon:'card',initial:0}));await A.waitForTimeout(200);ok('pestañas: un diálogo abierto se cierra al cambiar los datos',!(await A.$('#dlg')));
 ok('sin errores de página',!errs.filter(e=>!/No se pudo guardar|Access is denied/.test(e)).length,errs);
 await b.close();
})().catch(e=>{ok('excepción',false,String(e&&e.stack||e));process.exit(1);});
