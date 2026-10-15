const {chromium}=require('playwright');const fs=require('fs');
const URL=process.env.URL||'http://localhost:8123/gastos/';const SS='/workspace/monefy-app/screenshots/';const SHOTS=!process.env.NOSHOTS;
const results=[];const ok=(n,c)=>{results.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1;};
const V1={version:1,settings:{currency:'€',weekStart:1,dark:false},
 accounts:[{id:'cash',name:'Efectivo',icon:'💵',initial:10000},{id:'card',name:'Tarjeta',icon:'💳',initial:5000}],
 categories:[{id:'a',type:'expense',name:'Comida',icon:'🛒',color:'#81c784'},{id:'b',type:'expense',name:'Taxi',icon:'🚕',color:'#ffd54f'},{id:'d',type:'income',name:'Salario',icon:'💼',color:'#43a047'}],
 transactions:[{id:'t1',type:'expense',amount:1000,date:'2026-10-02',accountId:'cash',categoryId:'a',note:''},
  {id:'t2',type:'expense',amount:700,date:'2026-10-03',accountId:'card',categoryId:'b',note:'taxi'},
  {id:'t4',type:'income',amount:20000,date:'2026-10-01',accountId:'card',categoryId:'d',note:''},
  {id:'t5',type:'transfer',amount:4000,date:'2026-10-05',accountId:'card',toAccountId:'cash',note:''}]};
const V2={version:2,settings:{currency:'€',weekStart:1,dark:false,initialBalance:5000},
 categories:[{id:'exp-comida',type:'expense',name:'Súper',icon:'🛒',color:'#81c784'},{id:'exp-casa',type:'expense',name:'Casa',icon:'🏠',color:'#a1887f'},{id:'exp-transporte',type:'expense',name:'Transporte',icon:'🚌',color:'#7986cb'},{id:'exp-ocio',type:'expense',name:'Ocio',icon:'🎬',color:'#f48fb1'},{id:'exp-salud',type:'expense',name:'Salud',icon:'💊',color:'#4db6ac'},{id:'exp-otros',type:'expense',name:'Otros',icon:'📦',color:'#90a4ae'},{id:'i1',type:'income',name:'Salario',icon:'💼',color:'#43a047'}],
 transactions:[{id:'x1',type:'expense',amount:1500,date:'2026-10-02',categoryId:'exp-comida',note:'pan'},{id:'x2',type:'income',amount:10000,date:'2026-10-01',categoryId:'i1',note:''}]};
process.on('exit',()=>console.log(results.join('\n')));
(async()=>{
 const b=await chromium.launch();
 const mk=(dark)=>b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,locale:'es-ES',timezoneId:'Europe/Madrid'});
 const errs=[];const watch=p=>{p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());};
 const seed=async(p,v)=>{await p.goto(URL);await p.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),v);await p.reload();await p.waitForSelector('.ci');return p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));};
 // --- migraciones ---
 {const c=await mk();const p=await c.newPage();watch(p);
  let d=await seed(p,V2);
  ok('v2→v3: cuenta Efectivo con saldo inicial 50,00',d.accounts.length===1&&d.accounts[0].name==='Efectivo'&&d.accounts[0].initial===5000&&!('initialBalance' in d.settings));
  ok('v2→v3: transacciones asignadas a Efectivo',d.transactions.every(t=>t.accountId==='cash'));
  ok('v2→v3: nombre renombrado conservado e iconos de línea',d.categories.find(c=>c.id==='exp-comida').name==='Súper'&&d.categories.every(c=>!/[^\x00-\x7f]/.test(c.icon)));
  ok('v2→v3: 6 categorías de gasto',d.categories.filter(c=>c.type==='expense').length===6);
  d=await seed(p,V1);
  ok('v1→v3: cuentas y transferencias conservadas',d.accounts.length===2&&d.transactions.some(t=>t.type==='transfer'));
  ok('v1→v3: Taxi → Otros',d.transactions.find(t=>t.id==='t2').categoryId==='exp-otros');
  // borrar cuenta con movimientos → mover a otra
  await p.click('[data-act="right"]');await p.click('.arow:has-text("Tarjeta")');await p.click('#fDel');ok('mover: diálogo con selector',!!(await p.$('#dlg #dlgTo')));
  await p.selectOption('#dlgTo','cash');await p.click('#dlgOk');
  let a=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));
  ok('mover: cuenta eliminada, gastos/ingresos movidos',a.accounts.length===1&&a.transactions.find(t=>t.id==='t2').accountId==='cash'&&a.transactions.find(t=>t.id==='t4').accountId==='cash');
  ok('mover: transferencia entre ambas eliminada',!a.transactions.some(t=>t.id==='t5')&&a.transactions.length===3);
  await p.click('[data-act="right"]');await p.click('.arow:has-text("Efectivo")');await p.click('#fDel');
  ok('única cuenta: explica y cancela',(await p.textContent('#dlg')).includes('no hay otra cuenta')&&!(await p.$('#dlgCancel')));await p.click('#dlgOk');
  ok('única cuenta sigue',(await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).accounts.length))===1);
  await c.close();}
 {const c=await mk();const p=await c.newPage();watch(p);
  const V1b=JSON.parse(JSON.stringify(V1));V1b.transactions.push({id:'t6',type:'transfer',amount:100,date:'2026-10-06',accountId:'cash',toAccountId:'x3',note:''});V1b.accounts.push({id:'x3',name:'Hucha',icon:'💰',initial:0});
  await seed(p,V1b);await p.click('[data-act="right"]');await p.click('.arow:has-text("Efectivo")');await p.click('#fDel');await p.selectOption('#dlgTo','x3');await p.click('#dlgOk');
  const a=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));const t5=a.transactions.find(t=>t.id==='t5');
  ok('mover: transferencia con tercera cuenta se reasigna',t5.accountId==='card'&&t5.toAccountId==='x3'&&!a.transactions.some(t=>t.id==='t6'));
  await c.close();}
 // --- flujo principal ---
 const ctx=await mk();const p=await ctx.newPage();watch(p);
 const key=async s=>{for(const k of s)await p.click(`#entry [data-key="${k}"]`);};
 const txt=s=>p.textContent(s);
 const leftPick=async per=>{await p.click('[data-act="left"]');await p.click(`[data-act="period"][data-p="${per}"]`);};
 const pickAcc=async name=>{await p.click('[data-act="left"]');await p.click('#accCard');await p.click(`#accDrop button:has-text("${name}")`);await p.keyboard.press('Escape');};
 await p.goto(URL);await p.waitForSelector('.ci');
 ok('cabecera Slot-AI + "Todas las cuentas"',(await txt('.brand .nm'))==='Slot-AI'&&(await txt('#accName'))==='Todas las cuentas');
 ok('fuente Pacifico cargada',await p.evaluate(async()=>{await document.fonts.ready;return document.fonts.check('22px Pacifico');}));
 ok('6 iconos SVG de línea alrededor del donut',(await p.$$('.ci svg')).length===6);
 await p.click('.circ.m');ok('título "Nuevo gasto"',(await txt('#entry h1'))==='Nuevo gasto');
 ok('tecla decimal muestra coma',(await p.$$('#entry [data-key="."]')).length===0&&(await txt('#entry [data-key=","]'))===',');await key('10+2,5');ok('calculadora 10+2,5 = 12,50',(await p.getAttribute('#amt','data-cents'))==='1250'&&(await txt('#amt'))==='10+2,5');
 await key('=');ok('tecla = evalúa',(await txt('#amt'))==='12,5');
 await p.fill('#eNote','Mercadona');
 await p.click('#eOk');ok('OK sin categoría abre selector (6)',(await p.$$('[data-eact="pick"]')).length===6);
 await p.click('[data-eact="pick"]:has-text("Comida")');
 ok('gasto añadido',(await txt('#totExp')).includes('12,50'));
 await p.click('.ci[title="Ocio"]');await key('1234');await p.click('#eSave');
 ok('formato -1.246,50 €',(await txt('#totExp')).replace(/\s/g,' ').includes('-1.246,50'));
 await p.click('.circ.p');ok('título "Nuevo ingreso"',(await txt('#entry h1'))==='Nuevo ingreso');
 await key('2000');await p.click('#eChoose');await p.click('[data-eact="pick"]:has-text("Salario")');
 ok('ingreso',(await txt('#totInc')).includes('2.000,00'));
 ok('saldo 753,50',(await txt('#balance')).includes('753,50'));
 ok('porcentajes en donut',(await p.$$('.ci .pc')).length===2);
 // cuentas
 await p.click('[data-act="right"]');ok('drawer de cuentas',(await txt('#rightDrawer')).includes('Cuentas')&&(await txt('#rightDrawer')).includes('Efectivo'));
 await p.click('[data-act="newAcc"]');await p.fill('#fName','Local Norte');await p.click('[data-f="icon"][data-k="coins"]');await p.fill('#fInit','100');await p.click('#fSave');
 await p.click('[data-act="right"]');ok('nueva cuenta con saldo 100,00',(await txt('#rightDrawer')).includes('Local Norte')&&(await txt('#rightDrawer')).includes('100,00'));
 {const nTx=async()=>p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).transactions.length);const n0=await nTx();
  await p.click('[data-act="transfer"]');ok('transferencia: botón volver en cabecera',!!(await p.$('#entry #eClose')));await key('5');await p.click('#eClose');ok('transferencia: volver cierra sin cambios',!(await p.$('#entry'))&&(await nTx())===n0);
  await p.click('[data-act="right"]');await p.click('[data-act="transfer"]');await key('5');await p.keyboard.press('Escape');ok('transferencia: Esc cierra sin cambios',!(await p.$('#entry'))&&(await nTx())===n0);
  await p.click('[data-act="right"]');await p.click('[data-act="transfer"]');await key('5');await p.goBack();await p.waitForTimeout(200);ok('transferencia: atrás del móvil cierra sin cambios',!(await p.$('#entry'))&&(await nTx())===n0&&p.url().startsWith(URL));
  await p.click('.circ.m');await key('9');await p.goBack();await p.waitForTimeout(200);ok('gasto: atrás cierra sin cambios',!(await p.$('#entry'))&&(await nTx())===n0);
  await p.click('.circ.p');await p.click('#eClose');ok('ingreso: volver cierra',!(await p.$('#entry')));
  await p.click('[data-act="right"]');await p.click('[data-act="newAcc"]');await p.fill('#fName','Nada');await p.goBack();await p.waitForTimeout(200);
  ok('formulario cuenta: atrás cierra sin guardar',!(await p.$('#form'))&&p.url().startsWith(URL)&&!(await p.evaluate(()=>localStorage.getItem('gastos.v1'))).includes('"Nada"'));
  await p.click('[data-act="right"]');}
 await p.click('[data-act="transfer"]');ok('pantalla transferencia',(await txt('#entry h1'))==='Transferencia');
 await key('50');await p.selectOption('#eTo',{label:'Local Norte'});await p.click('#eSave');
 ok('total no cambia con transferencia (853,50)',(await txt('#balance')).includes('853,50'));
 await pickAcc('Local Norte');ok('cuenta seleccionada en cabecera',(await txt('#accName'))==='Local Norte');
 ok('saldo Local Norte 150,00 y sin gastos',(await txt('#balance')).includes('150,00')&&(await txt('#totExp')).includes('0,00'));
 await pickAcc('Efectivo');ok('saldo Efectivo 703,50',(await txt('#balance')).includes('703,50'));
 await pickAcc('Todas las cuentas');
 await p.reload();await p.waitForSelector('.ci');ok('persistencia tras recargar',(await txt('#totExp')).includes('1.246,50'));
 // periodos
 await leftPick('day');ok('día: '+await txt('#plabel'),/, \d+ /.test(await txt('#plabel')));
 await leftPick('week');const wl=await txt('#plabel');ok('semana empieza lunes: '+wl,wl.startsWith('12 Oct 26'));
 await p.click('[data-act="prev"]');ok('semana anterior vacía',(await txt('#totExp')).includes('0,00'));
 await leftPick('month');ok('mes',(await txt('#plabel'))==='Octubre 2026');
 await p.evaluate(()=>{const el=document.querySelector('#chart');const mk=(t,x)=>{const tc=new Touch({identifier:1,target:el,clientX:x,clientY:300});el.dispatchEvent(new TouchEvent(t,{touches:t==='touchstart'?[tc]:[],changedTouches:[tc],bubbles:true}));};mk('touchstart',300);mk('touchend',100);});
 ok('swipe → Noviembre',(await txt('#plabel')).includes('Noviembre'));
 await leftPick('year');ok('año',(await txt('#plabel'))==='2026');
 await leftPick('all');ok('todo: rango de fechas',/\d+ \w+ \d\d - \d+ \w+ \d\d/.test(await txt('#plabel')));
 await p.click('[data-act="left"]');await p.$eval('#pickDate',e=>{e.value='2026-10-15';e.dispatchEvent(new Event('change',{bubbles:true}))});
 ok('elegir fecha',(await txt('#plabel')).includes('15 Octubre'));
 await leftPick('month');
 // lista
 await p.click('#balance');await p.waitForSelector('.group');
 const names=await p.$$eval('.grow .nm',e=>e.map(x=>x.textContent));ok('lista: ingresos primero, luego gastos por importe: '+names.join(','),names.join(',')==='Salario,Ocio,Comida,Transferencias');
 ok('contador (badge)',(await txt('.grow:has-text("Comida") .badge'))==='1');
 await p.click('.grow:has-text("Comida")');ok('expandir muestra fila con fecha',(await txt('.tx')).includes('Mercadona'));
 await p.click('.tx:has-text("Mercadona")');ok('editar gasto: título y papelera',(await txt('#entry h1'))==='Editar gasto'&&!!(await p.$('[data-eact="del"]')));
 for(let i=0;i<4;i++)await p.click('#entry .bk');await key('125');await p.click('#eOk');
 ok('editar importe → 125,00',(await txt('.grow:has-text("Comida")')).includes('125,00'));
 await p.click('.grow:has-text("Salario")');await p.click('.tx >> nth=0');ok('editar ingreso: título',(await txt('#entry h1'))==='Editar ingreso');
 await p.fill('#eNote','Nómina');await p.click('#eOk');ok('ingreso editado (nota)',(await txt('.list')).includes('Nómina'));
 await p.click('[data-act="sort"]');const n2=await p.$$eval('.grow .nm',e=>e.map(x=>x.textContent));ok('ordenar por nombre',n2.slice(1,3).join()==='Comida,Ocio');await p.click('[data-act="sort"]');
 await p.click('[data-act="search"]');await p.fill('#q','Merc');ok('búsqueda',(await p.$$('.group')).length===1);await p.click('[data-act="search"]');
 await p.click('.tx:has-text("Mercadona")');await key('7');await p.click('#eClose');ok('editar: volver no guarda',(await txt('.grow:has-text("Comida")')).includes('125,00')&&!(await p.$('#entry')));
 await p.click('.tx:has-text("Mercadona")');await p.click('[data-eact="del"]');await p.goBack();await p.waitForTimeout(200);ok('atrás con diálogo abierto: cierra solo el diálogo',!(await p.$('#dlg'))&&!!(await p.$('#entry')));await p.click('#eClose');
 await p.click('.tx:has-text("Mercadona")');await p.click('[data-eact="del"]');ok('confirmar eliminar transacción: diálogo',!!(await p.$('#dlg')));await p.click('#dlgCancel');ok('cancelar no elimina',!(await p.$('#dlg'))&&!!(await p.$('#entry')));
 await p.click('[data-eact="del"]');await p.click('#dlgOk');ok('eliminar',(await p.$$('.grow:has-text("Comida")')).length===0);
 // cambiar tipo
 await p.click('.circ.m');await key('7');await p.click('[data-eact="swap"]');ok('cambiar gasto→ingreso',(await txt('#entry h1'))==='Nuevo ingreso');await p.keyboard.press('Escape');ok('Escape cierra entrada',!(await p.$('#entry')));
 // borrar cuenta
 await p.click('[data-act="right"]');await p.click('.arow:has-text("Local Norte")');await p.click('#fDel');ok('cuenta con movimientos: diálogo mover',!!(await p.$('#dlg #dlgTo')));
 await p.keyboard.press('Escape');ok('Escape cierra solo el diálogo',!(await p.$('#dlg'))&&!!(await p.$('#form')));
 await p.click('#fDel');await p.click('#dlgCancel');ok('cancelar no borra cuenta',(await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).accounts.length))===2);await p.keyboard.press('Escape');
 await p.click('[data-act="right"]');await p.click('[data-act="newAcc"]');await p.fill('#fName','Temporal');await p.click('#fSave');
 await p.click('[data-act="right"]');await p.click('.arow:has-text("Temporal")');await p.click('#fDel');ok('cuenta vacía: confirmación',!!(await p.$('#dlg'))&&!(await p.$('#dlgTo')));await p.click('#dlgOk');await p.click('[data-act="right"]');ok('borra cuenta vacía',!(await txt('#rightDrawer')).includes('Temporal'));
 // categorías
 await p.click('[data-act="go"][data-r="/categorias"]');await p.waitForSelector('.tabs');ok('6 categorías de gasto sin añadir '+(await p.$$('.page .grow')).length+' '+!!(await p.$('.fab')),(await p.$$('.page .grow')).length===6&&!(await p.$('.fab')));
 ok('categorías: flecha volver en cabecera',!!(await p.$('.top [data-act="back"]')));
 await p.click('.grow:has-text("Otros")');await p.goBack();await p.waitForTimeout(200);ok('categoría: atrás cierra formulario y sigue en categorías',!(await p.$('#form'))&&!!(await p.$('.tabs')));
 await p.click('.grow:has-text("Otros")');await p.click('[data-f="close"]');ok('categoría: X cierra',!(await p.$('#form'))&&!!(await p.$('.tabs')));
 await p.click('.grow:has-text("Otros")');ok('no se puede eliminar categoría de gasto',!(await p.$('#fDel')));
 await p.fill('#fName','Varios');await p.click('[data-f="icon"][data-k="gift"]');await p.click('#fSave');ok('renombrada',(await txt('.page')).includes('Varios'));
 await p.click('[data-t="income"]');await p.click('.fab');await p.fill('#fName','Extra');await p.click('#fSave');ok('nueva categoría ingreso',(await txt('.page')).includes('Extra'));
 await p.click('.grow:has-text("Extra")');await p.click('#fDel');ok('categoría: confirmación',!!(await p.$('#dlg')));await p.click('#dlgOk');ok('categoría eliminada',!(await txt('.page')).includes('Extra'));
 await p.goto(URL);await p.waitForSelector('.ci');ok('donut usa nuevo nombre',!!(await p.$('.ci[title="Varios"]')));
 // ajustes / backup
 await p.goto(URL+'#/ajustes');
 let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnExport')]);const jp='/tmp/backup.json';await dl.saveAs(jp);
 const bj=JSON.parse(fs.readFileSync(jp,'utf8'));ok('export JSON v3 con cuentas ('+bj.transactions.length+' tx)',bj.version===3&&bj.accounts.length===2&&bj.transactions.length===3);
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnCsv')]);await dl.saveAs('/tmp/g.csv');const c=fs.readFileSync('/tmp/g.csv','utf8');
 ok('CSV BOM ; con Cuenta y transferencia',c.charCodeAt(0)===0xfeff&&c.includes('Fecha;Tipo;Cuenta;Categoría')&&c.includes('Transferencia;Efectivo;→ Local Norte;50,00'));
 await p.click('[data-act="reset"]');ok('reset: confirmación',!!(await p.$('#dlg')));await p.click('#dlgOk');await p.goto(URL);ok('reset',(await txt('#totExp')).includes('0,00'));
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport',jp);await p.click('#dlgOk');await p.waitForTimeout(300);
 await p.goto(URL);ok('import restaura',(await txt('#totExp')).includes('1.234,00')&&(await txt('#balance')).includes('866,00'));
 fs.writeFileSync('/tmp/v2.json',JSON.stringify(V2));await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport','/tmp/v2.json');await p.click('#dlgOk');await p.waitForTimeout(300);
 const d2=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));ok('importar copia v2 migra',d2.version===3&&d2.accounts[0].initial===5000);
 ok('service worker activo',await p.evaluate(async()=>!!(await navigator.serviceWorker.ready).active));
 await p.goto(URL);await ctx.setOffline(true);await p.reload();await p.waitForSelector('.ci');ok('funciona offline',(await txt('#totExp')).includes('15,00'));await ctx.setOffline(false);
 // --- capturas con datos de ejemplo ficticios ---
 if(SHOTS){
  const S=JSON.parse(fs.readFileSync(__dirname+'/sample-data.json','utf8'));
  const shoot=async(dark)=>{const sfx=dark?'-oscuro':'';const sc=await mk();const q=await sc.newPage();watch(q);
   S.settings.dark=dark;await q.goto(URL);await q.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),S);await q.reload();await q.waitForSelector('.ci');await q.evaluate(()=>document.fonts.ready);
   const L=async per=>{await q.click('[data-act="left"]');await q.click(`[data-act="period"][data-p="${per}"]`);};
   await q.click('[data-act="left"]');await q.click('#accCard');await q.click('#accDrop button:has-text("Bar Central")');await q.keyboard.press('Escape');await L('all');
   await q.screenshot({path:SS+'01-principal'+sfx+'.png'});
   await q.click('[data-act="left"]');await q.screenshot({path:SS+'02-drawer-izquierdo'+sfx+'.png'});
   await q.click('#accCard');await q.screenshot({path:SS+'03-desplegable-cuentas'+sfx+'.png'});
   await q.click('#accDrop button:has-text("Todas las cuentas")');await q.keyboard.press('Escape');
   await q.click('[data-act="right"]');await q.screenshot({path:SS+'04-drawer-cuentas'+sfx+'.png'});await q.keyboard.press('Escape');
   await q.click('#balance');await q.waitForSelector('.group');await q.screenshot({path:SS+'05-lista'+sfx+'.png'});
   await q.click('.grow:has-text("Depósitos")');await q.screenshot({path:SS+'06-lista-expandida'+sfx+'.png'});
   await q.click('.grow:has-text("Depósitos")');await q.click('.grow:has-text("Casa")');await q.click('.tx >> nth=0');await q.screenshot({path:SS+'07-editar-gasto'+sfx+'.png'});await q.keyboard.press('Escape');
   await q.goto(URL+'#/categorias');await q.click('.grow:has-text("Otros")');await q.fill('#fName','Facturas');await q.screenshot({path:SS+'08-renombrar-categoria'+sfx+'.png'});
   await sc.close();};
  await shoot(false);await shoot(true);
 }
 await p.goto(URL);await p.waitForSelector('.ci');for(const w of [360,412]){await p.setViewportSize({width:w,height:760});await p.waitForTimeout(100);const m=await p.$eval('#chart .center',c=>{const s=getComputedStyle(c);return{fs:parseFloat(s.fontSize),tn:s.fontVariantNumeric,fit:[...c.children].every(d=>d.scrollWidth<=c.clientWidth),tf:s.transform}});ok('totales donut legibles a '+w+'px ('+m.fs+'px, tnum, sin escalar)',m.fs>=16&&m.tn.includes('tabular')&&m.fit&&/^matrix\(1, 0, 0, 1,/.test(m.tf));}
 ok('sin errores de consola '+JSON.stringify(errs),errs.length===0);
 console.log(results.join('\n'));console.log(results.filter(r=>r.startsWith('PASS')).length+'/'+results.length+' OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
