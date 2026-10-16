// Pruebas de las correcciones de v1.6.2 (solo datos sintéticos). ENGINE=webkit para probar el motor del iPhone.
const pw=require('playwright');const M=require('../js/monefy.js');
const URL=process.env.URL||'http://localhost:8123/gastos/';const ENG=pw[process.env.ENGINE||'chromium'];
const results=[];const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' → '+JSON.stringify(x)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
const base=()=>({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'A',name:'Caja',icon:'banknotes',initial:10000},{id:'B',name:'Banco',icon:'card',initial:5000}],
 categories:[{id:'c1',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'c2',type:'expense',name:'Casa',icon:'house',color:'#5aa5dc'},{id:'i1',type:'income',name:'Salario',icon:'briefcase',color:'#43a86a'}],
 transactions:[{id:'t1',type:'expense',amount:1000,date:'2026-10-02',accountId:'A',categoryId:'c1',note:''},{id:'t2',type:'expense',amount:500,date:'2026-10-03',accountId:'B',categoryId:'c2',note:''}]});
const CLOCK=`(()=>{const R=Date;let off=0;window.__shift=ms=>{off+=ms};class F extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off);}static now(){return R.now()+off;}};window.Date=F;})()`;
(async()=>{
 {const p=M.parse('date,account,category,amount,currency\n01/01/2025,Caja,X,-5,DOLARES\n');const r=M.build(p,{settings:{currency:'€'},accounts:[],categories:[],transactions:[]},'replace');
  ok('Monefy: moneda de más de 4 caracteres no se aplica',r.data.settings.currency==='€',r.data.settings.currency);}
 const b=await ENG.launch();const errs=[];
 const mk=async(o={})=>{const c=await b.newContext({viewport:o.vp||{width:390,height:844},locale:'es-ES',timezoneId:'Europe/Madrid',acceptDownloads:true});
  await c.addInitScript(()=>localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9)));if(o.clock)await c.addInitScript(CLOCK);if(o.init)await c.addInitScript(o.init);return c;};
 const W=p=>{p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());return p;};
 const seed=async(p,d)=>{await p.goto(URL);await p.evaluate(d=>{localStorage.clear();localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9));localStorage.setItem('gastos.v1',typeof d==='string'?d:JSON.stringify(d));},d);await p.reload();await p.waitForSelector('#app .top');await p.waitForTimeout(150);};
 const toastTxt=p=>p.textContent('#toast');
 // ---- H1: reparación al cargar ----
 {const c=await mk();const p=W(await c.newPage());const d=base();d.transactions[0].date='2025-02-31';d.transactions.push({id:'bad id',type:'expense',amount:300,date:'2025-03-01',accountId:'A',categoryId:'i1',note:5},{id:'t9',type:'expense',amount:-4,date:'2025-03-02',accountId:'A',categoryId:'c1',note:'irreparable'});
  const orig=JSON.stringify(d);await seed(p,d);
  ok('H1 carga: aviso «Se han reparado tus datos»',/reparado/.test(await p.textContent('#dlg h2').catch(()=>'')));
  const li=await p.textContent('#repairList');ok('H1 carga: lista fecha imposible y retirado',/2025-02-31.*2025-02-28/.test(li)&&/Retirado/.test(li)&&/irreparable/.test(li),li);
  const st=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('gastos.v1'));let v=null;try{Store.validate(JSON.parse(JSON.stringify(s)));}catch(e){v=e.message}return{v,dates:s.transactions.map(t=>t.date),n:s.transactions.length,pre:Object.keys(localStorage).filter(k=>k.startsWith('gastos.v1.prerepair-')).map(k=>localStorage.getItem(k))};});
  ok('H1 carga: datos guardados reparados pasan la validación estricta',st.v===null&&st.n===3&&st.dates.includes('2025-02-28'),st);
  ok('H1 carga: original intacto en gastos.v1.prerepair-*',st.pre.length===1&&st.pre[0]===orig);
  const dl=p.waitForEvent('download');await p.click('#rDown');ok('H1 carga: «Descargar original» descarga el original',!!(await dl));
  await p.click('#dlgOk');await p.reload();await p.waitForTimeout(200);ok('H1 carga: no se repite el aviso tras reparar',!(await p.$('#dlg')));
  await p.goto(URL+'#/ajustes');ok('H1: original visible en Ajustes (Datos dañados guardados)',!!(await p.$('#btnCorrupt')));
  await p.click('[data-act="reset"]');await p.click('#dlgOk');await p.click('#undoBtn');await p.waitForTimeout(200);
  ok('H1: Borrar todo + Deshacer recupera los datos reparados',(await p.evaluate(()=>Store.data.transactions.length))===3,await toastTxt(p));
  ok('H1: exportar copia de datos reparados se puede restaurar',await p.evaluate(()=>Store.exportProblem()===null));await c.close();}
 {const c=await mk({init:`(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('gastos.v1.prerepair-'))throw new DOMException('full','QuotaExceededError');return o.call(this,k,v);};})()`});const p=W(await c.newPage());
  const d=base();d.transactions[0].date='2025-02-31';const orig=JSON.stringify(d);await seed(p,d);
  ok('H1 sin espacio para el original: no se sobrescribe y se pide descargarlo',(await p.evaluate(()=>localStorage.getItem('gastos.v1')))===orig&&/descárgalo/.test(await p.textContent('#dlg p')));await c.close();}
 // ---- H1: Deshacer verifica su copia antes de borrarla ----
 {const c=await mk();const p=W(await c.newPage());await seed(p,base());await p.goto(URL+'#/ajustes');await p.click('[data-act="reset"]');await p.click('#dlgOk');
  await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('gastos.v1.prev'));v.data.transactions[0].date='2025-02-30';v.data.transactions[1].id='id con espacio';localStorage.setItem('gastos.v1.prev',JSON.stringify(v));});
  await p.click('#undoBtn');await p.waitForTimeout(150);ok('H1 Deshacer: copia propia reparable (fecha imposible, id) se restaura',(await p.evaluate(()=>Store.data.transactions.map(t=>t.date).join()))==='2025-02-28,2026-10-03');
  await p.click('[data-act="reset"]');await p.click('#dlgOk');await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('gastos.v1.prev'));v.data.transactions[0].amount='mal';localStorage.setItem('gastos.v1.prev',JSON.stringify(v));});
  await p.click('#undoBtn');await p.waitForTimeout(150);const r=await p.evaluate(()=>({n:Store.data.transactions.length,keys:Object.keys(localStorage).filter(k=>k.startsWith('gastos.v1.corrupt-undo-')).map(k=>JSON.parse(localStorage.getItem(k)).transactions.length)}));
  ok('H1 Deshacer: copia irreparable se rechaza sin tocar datos y se guarda (no se pierde)',r.n===0&&r.keys.join()==='2'&&/No se pudo deshacer/.test(await toastTxt(p)),r);
  await p.evaluate(()=>{Store.importData(JSON.stringify({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'A',name:'Caja',icon:'banknotes',initial:0}],categories:[{id:'c1',type:'expense',name:'C',icon:'tag',color:'#e57373'}],transactions:[{id:'x',type:'expense',amount:5,date:'2026-01-01',accountId:'A',categoryId:'c1',note:''}]}));Storage.prototype._o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='gastos.v1')throw new DOMException('full','QuotaExceededError');return this._o(k,v);};});
  const r2=await p.evaluate(()=>{let e;try{Store.undo();}catch(x){e=x.message}return{e,prev:!!localStorage.getItem('gastos.v1.prev')};});
  ok('H1 Deshacer: si no se puede guardar, la copia se conserva para reintentar',/No se pudo guardar/.test(r2.e)&&r2.prev,r2);
  await p.evaluate(()=>{Storage.prototype.setItem=Storage.prototype._o;});const r3=await p.evaluate(()=>{try{Store.undo();return Store.data.transactions.length}catch(e){return e.message}});ok('H1 Deshacer: reintento correcto',r3===0,r3);await c.close();}
 // ---- H1: aviso al exportar ----
 {const c=await mk();const p=W(await c.newPage());await seed(p,base());await p.goto(URL+'#/ajustes');await p.evaluate(()=>{Store.data.transactions[0].date='2025-02-31';});
  p.removeAllListeners('dialog');await p.click('#btnExport');await p.waitForSelector('#dlg');ok('H1 exportar: avisa si la copia no se podría restaurar',/no se podría restaurar/.test(await p.textContent('#dlg h2'))&&/fecha no válida/.test(await p.textContent('#dlg p')));
  await p.click('#dlgCancel');ok('H1 exportar: cancelar no exporta',(await p.evaluate(()=>localStorage.getItem('slotai.lastBackup')))===null);
  const dl=p.waitForEvent('download');await p.click('#btnExport');await p.click('#dlgOk');ok('H1 exportar: «Exportar igualmente» descarga',!!(await dl));
  await p.evaluate(()=>{Store.data.transactions[0].date='2026-10-02';});await p.click('#btnExport');await p.waitForTimeout(200);ok('H1 exportar: copia válida sin aviso',!(await p.$('#dlg')));await c.close();}
 // ---- H1b: errores de importación Monefy visibles ----
 {const c=await mk();const p=W(await c.newPage());await seed(p,base());await p.goto(URL+'#/ajustes');await p.evaluate(()=>{Store.data.accounts[0].id='mi caja';Store.data.transactions[0].accountId='mi caja';});
  await p.setInputFiles('#fileMonefy',{name:'m.csv',mimeType:'text/csv',buffer:Buffer.from('date,account,category,amount\n01/01/2025,Caja,X,-5\n')});await p.waitForSelector('#mfPrev');await p.check('input[value=merge]');await p.click('#dlgOk');await p.waitForTimeout(200);
  ok('H1b Monefy: error de validación se muestra en un diálogo',/No se pudo importar/.test(await p.textContent('#dlg h2').catch(()=>''))&&/No se ha cambiado nada/.test(await p.textContent('#dlg p')));
  ok('H1b Monefy: datos guardados intactos',(await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).transactions.length))===2);await c.close();}
 // ---- M1: pestañas y cuentas eliminadas ----
 {const c=await mk();const A=W(await c.newPage());await seed(A,base());const B=W(await c.newPage());await B.goto(URL);await B.waitForSelector('.ci');
  await A.click('[data-act="quick"][data-cat="c1"]');await A.selectOption('#eAcc','B');for(const k of ['7','7'])await A.click(`#entry [data-key="${k}"]`);
  await B.evaluate(()=>Store.moveAccount('B','A'));await A.waitForTimeout(300);
  ok('M1: aviso al eliminarse la cuenta elegida en otra pestaña',/cuenta elegida se eliminó/.test(await toastTxt(A)));
  ok('M1: el importe tecleado se conserva',(await A.textContent('#amt'))==='77');
  await A.click('#eSave');await A.waitForTimeout(250);const r=await A.evaluate(()=>({acc:Store.data.transactions.find(x=>x.amount===7700).accountId,bal:document.querySelector('#balance').textContent}));
  ok('M1: se guarda en una cuenta existente y el saldo cuadra',r.acc==='A'&&/8,00/.test(r.bal),r);
  await A.click('[data-act="transfer"]').catch(()=>{});
  const e=await A.evaluate(()=>{const o=[];for(const t of [{type:'expense',amount:1,date:'2026-10-01',accountId:'B',categoryId:'c1',note:''},{type:'transfer',amount:1,date:'2026-10-01',accountId:'A',toAccountId:'B',note:''},{type:'expense',amount:1,date:'2026-10-01',accountId:'A',categoryId:'i1',note:''},{type:'expense',amount:1,date:'2026-10-01',accountId:'A',categoryId:'zz',note:''}]){try{Store.upsert('transactions',t);o.push('ok');}catch(x){o.push(x.message.slice(0,14));}}return o;});
  ok('M1: Store rechaza cuenta/destino inexistente y categoría inexistente o de otro tipo',e.join('|')==='La cuenta eleg|La cuenta eleg|La categoría e|La categoría e',e);await c.close();}
 {const c=await mk();const A=W(await c.newPage());await seed(A,base());const B=W(await c.newPage());await B.goto(URL);await B.waitForSelector('.ci');
  await A.click('[data-act="quick"][data-cat="c2"]');await A.click('#entry [data-key="3"]');await B.evaluate(()=>Store.removeCategory('c2','c1'));await A.waitForTimeout(300);
  ok('M1: categoría eliminada en otra pestaña → se pide elegir otra',/categoría elegida se eliminó/.test(await toastTxt(A))&&!!(await A.$('#eChoose')));
  await A.click('#eChoose');await A.click('[data-eact="pick"][data-cat="c1"]');await A.waitForTimeout(200);ok('M1: guardado con la categoría nueva',await A.evaluate(()=>Store.data.transactions.some(t=>t.amount===300&&t.categoryId==='c1')));await c.close();}
 // ---- L1: pestaña con datos dañados se desbloquea ----
 {const c=await mk();const A=W(await c.newPage());await seed(A,'{mal');ok('L1: diálogo de datos dañados',!!(await A.$('#cDown')));const B=await c.newPage();await B.goto(URL);await B.waitForTimeout(200);
  await B.evaluate(d=>localStorage.setItem('gastos.v1',d),JSON.stringify(base()));await A.waitForTimeout(300);
  const r=await A.evaluate(()=>{let e=null;try{Store.setSetting('dark',true);}catch(x){e=x.message}return{c:!!Store.corrupt,e,dlg:!!document.querySelector('#dlg')};});
  ok('L1: tras datos válidos de otra pestaña se puede guardar y se cierra el aviso',!r.c&&r.e===null&&!r.dlg,r);ok('L1: se informa',/recuperaron/.test(await toastTxt(A)));await c.close();}
 // ---- L2/L8: validación de copias ----
 {const c=await mk();const p=W(await c.newPage());await seed(p,base());
  const cases={'categoría con nombre numérico':d=>{d.categories[0].name=12345},'weekStart no válido':d=>{d.settings.weekStart='x'},'moneda larga':d=>{d.settings.currency='€'.repeat(50)},'moneda no texto':d=>{d.settings.currency=5},'tema no booleano':d=>{d.settings.dark='sí'},'L8 categoría de otro tipo':d=>{d.transactions[0].categoryId='i1'},'ajustes no objeto':d=>{d.settings=[1]}};
  for(const k in cases){const d=base();cases[k](d);const r=await p.evaluate(j=>{try{Store.importData(j);return 'aceptada'}catch(e){return e.message}},JSON.stringify(d));ok('L2 copia rechazada: '+k,/Copia no válida/.test(r)&&(await p.evaluate(()=>Store.data.transactions.length))===2,r);}
  const r=await p.evaluate(j=>{try{Store.importData(j);return 'aceptada'}catch(e){return e.message}},JSON.stringify({...base(),settings:{currency:'$',weekStart:0,dark:true}}));ok('L2 copia válida aceptada',r==='aceptada');await c.close();}
 // ---- L3: diálogos y cambios de otra pestaña ----
 {const c=await mk();const A=W(await c.newPage());await seed(A,base());const B=W(await c.newPage());await B.goto(URL);await B.waitForSelector('.ci');
  await A.evaluate(()=>openForm('cat','c1'));await A.click('#fDel');await B.evaluate(()=>Store.setSetting('dark',true));await A.waitForTimeout(250);ok('L3: cambio ajeno no cierra el diálogo',!!(await A.$('#dlg')));
  await B.evaluate(()=>Store.removeCategory('c1','c2'));await A.waitForTimeout(250);ok('L3: eliminar el elemento cierra formulario y diálogo',!(await A.$('#dlg'))&&!(await A.$('#form')));
  await A.click('[data-act="add"][data-type="expense"]');await A.click('#entry [data-key="5"]');await A.click('#eChoose');await B.evaluate(()=>Store.setSetting('dark',false));await A.waitForTimeout(250);ok('L3: selector de categoría sigue abierto',!!(await A.$('.catgrid')));await c.close();}
 // ---- L4: cambio de día ----
 const toMidnight=async(p,month)=>p.evaluate(m=>{const n=new Date();const t=m?new Date(n.getFullYear(),n.getMonth()+1,1).getTime():new Date(n.getFullYear(),n.getMonth(),n.getDate()+1).getTime();window.__shift(t-30000-Date.now());},month);
 {const c=await mk({clock:true});const p=W(await c.newPage());await seed(p,base());await toMidnight(p,true);
  await p.evaluate(()=>{shownDay=today();st.ptype='month';st.anchor=new Date();render();});await p.click('[data-act="prev"]');await p.click('[data-act="next"]');const L0=await p.textContent('#plabel');
  await p.evaluate(()=>{window.__shift(60000);checkDay();});const L1=await p.textContent('#plabel');ok('L4: vista mensual (tras ‹ ›) avanza al mes nuevo',L0!==L1&&L1===await p.evaluate(()=>{const m=MESES[new Date().getMonth()];return m[0].toUpperCase()+m.slice(1)+' '+new Date().getFullYear();}),[L0,L1]);
  await p.click('[data-act="prev"]');await toMidnight(p,false);await p.evaluate(()=>{shownDay=today();});const L2=await p.textContent('#plabel');await p.evaluate(()=>{window.__shift(60000);checkDay();});ok('L4: mes anterior no se mueve',L2===await p.textContent('#plabel'));
  await toMidnight(p,false);await p.evaluate(()=>{shownDay=today();st.ptype='range';st.from='2026-01-01';st.to=today();render();window.__shift(60000);checkDay();});ok('L4: intervalo que acababa hoy avanza',await p.evaluate(()=>st.to===today()));
  await toMidnight(p,false);await p.evaluate(()=>{shownDay=today();location.hash='#/';});await p.waitForTimeout(100);await p.click('[data-act="add"][data-type="expense"]');const d0=await p.inputValue('#eDate');
  await p.evaluate(()=>{window.__shift(60000);checkDay();});const d1=await p.inputValue('#eDate');ok('L4: entrada nueva sin tocar la fecha pasa al nuevo día',d1>d0&&d1===await p.evaluate(()=>today()),[d0,d1]);
  await p.fill('#eDate','2026-05-05');await p.dispatchEvent('#eDate','change');await toMidnight(p,false);await p.evaluate(()=>{shownDay=today();window.__shift(60000);checkDay();});ok('L4: fecha elegida por el usuario se respeta',(await p.inputValue('#eDate'))==='2026-05-05');
  await p.keyboard.press('Escape');await p.evaluate(()=>{location.hash='#/lista';st.ptype='all';st.open={c1:1};render();});await p.click('.tx');const e0=await p.inputValue('#eDate');await toMidnight(p,false);await p.evaluate(()=>{shownDay=today();window.__shift(60000);checkDay();});ok('L4: editar un movimiento no cambia su fecha',(await p.inputValue('#eDate'))===e0&&e0==='2026-10-02');await c.close();}
 // ---- L5: datos dañados + copia no válida → sigue bloqueado ----
 {const c=await mk();const p=W(await c.newPage());await seed(p,'{mal');await p.click('#dlgOk');await p.goto(URL+'#/ajustes');await p.waitForSelector('#fileImport',{state:'attached'});
  await p.setInputFiles('#fileImport',{name:'x.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...base(),transactions:[{id:'t',type:'expense',amount:-1,date:'2026-01-01',accountId:'A'}]}))});await p.click('#dlgOk');await p.waitForTimeout(200);
  ok('L5: copia no válida → los datos dañados siguen protegidos',await p.evaluate(()=>!!Store.corrupt&&localStorage.getItem('gastos.v1')==='{mal'));await p.click('#dlgOk');
  await p.setInputFiles('#fileImport',{name:'y.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(base()))});await p.click('#dlgOk');await p.waitForTimeout(200);
  ok('L5: copia válida → restaurada y desbloqueado',await p.evaluate(()=>!Store.corrupt&&Store.data.transactions.length===2&&JSON.parse(localStorage.getItem('gastos.v1')).transactions.length===2));await c.close();}
 // ---- L6, L7, L9 ----
 {const c=await mk();const p=W(await c.newPage());const d=base();d.transactions.push({id:'t7',type:'expense',amount:123400,date:'2026-10-04',accountId:'A',categoryId:'c1',note:''});await seed(p,d);
  await p.click('.top [data-act="transfer"]');await p.click('#entry [data-key="5"]');await p.click('#eSave');await p.waitForTimeout(150);
  ok('L6: transferencia sin categoryId',await p.evaluate(()=>{const t=Store.data.transactions.find(t=>t.type==='transfer');return t&&!('categoryId' in t);}));
  await p.evaluate(()=>{st.ptype='all';render();});await p.click('[data-act="search"]');await p.fill('#q','1234');await p.waitForTimeout(100);ok('L7: buscar 1234 encuentra 1.234,00',/1\.234/.test(await p.textContent('.list')));
  await p.fill('#q','1.234');await p.waitForTimeout(100);ok('L7: buscar 1.234 también',/1\.234/.test(await p.textContent('.list')));
  await p.fill('#q','zzz');await p.waitForTimeout(100);ok('L7: búsqueda sin coincidencias',/No hay/.test(await p.textContent('.list')));
  await p.keyboard.press('Escape');await p.click('[data-act="add"][data-type="expense"] >> nth=0');await p.click('#entry [data-key="4"]');await p.keyboard.press('Space');await p.keyboard.press('Space');await p.waitForTimeout(100);
  ok('L9: Espacio no repite la tecla pulsada',(await p.textContent('#amt'))==='4',await p.textContent('#amt'));await p.keyboard.press('5');ok('L9: el teclado sigue funcionando',(await p.textContent('#amt'))==='45');await c.close();}
 // ---- tamaños 390x844 y 1280x800 ----
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){const c=await mk({vp});const p=W(await c.newPage());const d=base();d.transactions[0].date='2025-02-31';await seed(p,d);
  const fit=async(n)=>{const r=await p.evaluate(()=>{const de=document.documentElement;const bad=[...document.querySelectorAll('#dlg .dlg,#entry .kp,#entry #eSave,#entry #eChoose,.chart,.bigbtns,.page')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(b.left<-1||b.right>innerWidth+1);}).map(e=>e.className||e.id);return{ov:de.scrollWidth>innerWidth+1,bad};});ok(`${vp.width}x${vp.height}: ${n} sin desbordes`,!r.ov&&!r.bad.length,r);};
  await fit('aviso de reparación');ok(`${vp.width}x${vp.height}: botones del aviso visibles`,await p.isVisible('#rDown')&&await p.isVisible('#dlgOk'));await p.click('#dlgOk');
  await fit('principal');await p.click('[data-act="add"][data-type="expense"]');await fit('entrada');ok(`${vp.width}x${vp.height}: botón de la calculadora visible`,await p.isVisible('#eChoose'));await p.keyboard.press('Escape');
  await p.goto(URL+'#/lista');await fit('lista');await p.goto(URL+'#/ajustes');await fit('ajustes');await p.evaluate(()=>{Store.data.transactions[0].date='2025-02-30';});await p.click('#btnExport');await fit('aviso al exportar');await c.close();}
 ok('sin errores de página',!errs.length,errs);await b.close();})();
