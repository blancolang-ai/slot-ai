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
 const mk=async(dark,banner)=>{const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,locale:'es-ES',timezoneId:'Europe/Madrid'});if(!banner)await c.addInitScript(()=>{if(!localStorage.getItem('t.banner'))localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9));});return c;};
 const errs=[];const watch=p=>{p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());};
 const seed=async(p,v)=>{await p.goto(URL);await p.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),v);await p.reload();await p.waitForSelector('.ci');return p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));};
 // --- migraciones ---
 {const c=await mk();const p=await c.newPage();watch(p);
  let d=await seed(p,V2);
  ok('v2→v3: cuenta Efectivo con saldo inicial 50,00',d.accounts.length===1&&d.accounts[0].name==='Efectivo'&&d.accounts[0].initial===5000&&!('initialBalance' in d.settings));
  ok('v2→v3: transacciones asignadas a Efectivo',d.transactions.every(t=>t.accountId==='cash'));
  ok('v2→v3: nombre renombrado conservado e iconos de línea',d.categories.find(c=>c.id==='exp-comida').name==='Súper'&&d.categories.every(c=>!/[^\x00-\x7f]/.test(c.icon)));
  ok('v2→v4: conserva sus 6 categorías de gasto',d.categories.filter(c=>c.type==='expense').length===6);
  d=await seed(p,V1);
  ok('v1→v3: cuentas y transferencias conservadas',d.accounts.length===2&&d.transactions.some(t=>t.type==='transfer'));
  ok('v1→v4: categorías propias sin predeterminadas (Comida, Taxi)',d.categories.filter(c=>c.type==='expense').map(c=>c.name).join()==='Comida,Taxi'&&d.transactions.find(t=>t.id==='t2').categoryId==='b');
  // categorías = exactamente las de los datos (sintéticos)
  {const BK={app:'slot-ai',version:3,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'cash',name:'Efectivo',icon:'banknotes',initial:0}],
    categories:[{id:'exp-comida',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'exp-casa',type:'expense',name:'Hogar',icon:'house',color:'#5aa5dc'},{id:'exp-transporte',type:'expense',name:'Coche',icon:'car',color:'#e57373'},
      {id:'exp-ocio',type:'expense',name:'Regalos',icon:'gift',color:'#f0a040'},{id:'exp-salud',type:'expense',name:'Recibos',icon:'tag',color:'#d9534f'},{id:'exp-otros',type:'expense',name:'Móvil',icon:'phone',color:'#cfa80a'},
      {id:'i1',type:'income',name:'Nómina',icon:'briefcase',color:'#43a86a'},{id:'i2',type:'income',name:'Ingresos',icon:'moneybag',color:'#4caf7a'}],
    transactions:[{id:'s1',type:'expense',amount:500,date:'2026-10-02',accountId:'cash',categoryId:'exp-casa',note:''},{id:'s2',type:'income',amount:900,date:'2026-10-01',accountId:'cash',categoryId:'i1',note:''}]};
   fs.writeFileSync('/tmp/bk8.json',JSON.stringify(BK));
   await p.goto(URL+'#/ajustes');await p.waitForSelector('#fileImport',{state:'attached'});await p.setInputFiles('#fileImport','/tmp/bk8.json');await p.click('#dlgOk');await p.waitForTimeout(300);
   await p.goto(URL+'#/categorias');await p.reload();await p.waitForSelector('.tabs');await p.click('[data-act="catTab"][data-t="expense"]');
   const ex=await p.$$eval('.page .grow .nm',e=>e.map(x=>x.textContent).join());await p.click('[data-act="catTab"][data-t="income"]');const ic=await p.$$eval('.page .grow .nm',e=>e.map(x=>x.textContent).join());
   ok('restaurar copia: categorías exactamente las de la copia ('+ex+' | '+ic+')',ex==='Comida,Hogar,Coche,Regalos,Recibos,Móvil'&&ic==='Nómina,Ingresos');
   const BK2={...BK,categories:[{id:'g1',type:'expense',name:'Facturas',icon:'tag',color:'#d9534f'},{id:'g2',type:'expense',name:'Automóvil',icon:'car',color:'#e57373'},{id:'g3',type:'expense',name:'Viajes',icon:'tag',color:'#7986cb'},{id:'g4',type:'expense',name:'Mascotas',icon:'tag',color:'#a1887f'},{id:'g5',type:'expense',name:'Ropa',icon:'tag',color:'#4db6ac'},{id:'g6',type:'expense',name:'Libros',icon:'tag',color:'#9575cd'},{id:'g7',type:'expense',name:'Café',icon:'tag',color:'#cfa80a'},{id:'i1',type:'income',name:'Nómina',icon:'briefcase',color:'#43a86a'}],
     transactions:[{id:'u1',type:'expense',amount:700,date:'2026-10-02',accountId:'cash',categoryId:'g7',note:''}]};
   fs.writeFileSync('/tmp/bk9.json',JSON.stringify(BK2));await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport','/tmp/bk9.json');await p.click('#dlgOk');await p.waitForTimeout(300);
   let dd=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));
   ok('restaurar copia con 7 gastos ajenos: sin predeterminadas ni fusión en Otros',dd.categories.filter(c=>c.type==='expense').map(c=>c.id).join()==='g1,g2,g3,g4,g5,g6,g7'&&dd.transactions[0].categoryId==='g7');
   await p.goto(URL);await p.waitForSelector('.ci');ok('panel: 7 iconos de categoría',(await p.$$('.ci')).length===7);
   // instalación ya rota (v3 con predeterminadas añadidas a categorías importadas): se corrige al cargar sin perder datos
   const BR={...BK2,version:3,categories:[{id:'exp-comida',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'exp-transporte',type:'expense',name:'Transporte',icon:'bus',color:'#e57373'},{id:'exp-otros',type:'expense',name:'Otros',icon:'tag',color:'#cfa80a'},...BK2.categories],
     transactions:[...BK2.transactions,{id:'u2',type:'expense',amount:100,date:'2026-10-03',accountId:'cash',categoryId:'exp-otros',note:''}]};
   dd=await seed(p,BR);
   ok('migración v4: quita predeterminadas sin movimientos y conserva las usadas',dd.version===4&&dd.categories.filter(c=>c.type==='expense').map(c=>c.name).join()==='Otros,Facturas,Automóvil,Viajes,Mascotas,Ropa,Libros,Café'&&dd.transactions.length===2);
   await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForSelector('.ci');
   ok('instalación nueva vacía: siembra las 6 predeterminadas',(await p.evaluate(()=>Store.data.categories.filter(c=>c.type==='expense').map(c=>c.id).join()))==='exp-comida,exp-casa,exp-transporte,exp-ocio,exp-salud,exp-otros');
   d=await seed(p,V1);}
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
 ok('formato −1.246,50 € (1.6.4: signo menos tipográfico)',(await txt('#totExp')).replace(/\s/g,' ').includes('\u22121.246,50'));
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
 await p.click('[data-act="go"][data-r="/categorias"]');await p.waitForSelector('.tabs');ok('instalación nueva: 6 categorías predeterminadas y botón añadir',(await p.$$('.page .grow')).length===6&&!!(await p.$('.fab')));
 ok('categorías: flecha volver en cabecera',!!(await p.$('.top [data-act="back"]')));
 await p.click('.grow:has-text("Otros")');await p.goBack();await p.waitForTimeout(200);ok('categoría: atrás cierra formulario y sigue en categorías',!(await p.$('#form'))&&!!(await p.$('.tabs')));
 await p.click('.grow:has-text("Otros")');await p.click('[data-f="close"]');ok('categoría: X cierra',!(await p.$('#form'))&&!!(await p.$('.tabs')));
 await p.click('.grow:has-text("Otros")');ok('se puede eliminar categoría de gasto',!!(await p.$('#fDel')));
 await p.fill('#fName','Varios');await p.click('[data-f="icon"][data-k="gift"]');await p.click('#fSave');ok('renombrada',(await txt('.page')).includes('Varios'));
 await p.click('[data-t="income"]');await p.click('.fab');await p.fill('#fName','Extra');await p.click('#fSave');ok('nueva categoría ingreso',(await txt('.page')).includes('Extra'));
 await p.click('.grow:has-text("Extra")');await p.click('#fDel');ok('categoría: confirmación',!!(await p.$('#dlg')));await p.click('#dlgOk');ok('categoría eliminada',!(await txt('.page')).includes('Extra'));
 await p.goto(URL);await p.waitForSelector('.ci');ok('donut usa nuevo nombre',!!(await p.$('.ci[title="Varios"]')));
 // ajustes / backup
 await p.goto(URL+'#/ajustes');
 ok('copia: sin copia previa → Nunca y aviso',(await txt('#lastBackup')).includes('Nunca')&&!!(await p.$('#backupWarn')));
 let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnExport')]);
 ok('copia: nombre slot-ai-copia-AAAA-MM-DD.json',/^slot-ai-copia-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()));await p.waitForTimeout(100);
 ok('copia: muestra última copia y quita el aviso',!(await txt('#lastBackup')).includes('Nunca')&&!(await p.$('#backupWarn')));
 await p.evaluate(()=>localStorage.setItem('slotai.lastBackup',new Date(Date.now()-10*864e5).toISOString()));await p.reload();ok('copia: aviso si hace más de 7 días',(await txt('#backupWarn')).includes('10 días'));
const jp='/tmp/backup.json';await dl.saveAs(jp);
 const bj=JSON.parse(fs.readFileSync(jp,'utf8'));ok('export JSON v4 con cuentas ('+bj.transactions.length+' tx)',bj.version===4&&bj.accounts.length===2&&bj.transactions.length===3);
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnCsv')]);await dl.saveAs('/tmp/g.csv');const c=fs.readFileSync('/tmp/g.csv','utf8');
 ok('CSV BOM ; con Cuenta y transferencia',c.charCodeAt(0)===0xfeff&&c.includes('Fecha;Tipo;Cuenta;Categoría')&&c.includes('Transferencia;Efectivo;→ Local Norte;50,00'));
 await p.click('[data-act="reset"]');ok('reset: confirmación',!!(await p.$('#dlg')));await p.click('#dlgOk');await p.goto(URL);ok('reset',(await txt('#totExp')).includes('0,00'));
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport',jp);await p.click('#dlgOk');await p.waitForTimeout(300);
 await p.goto(URL);ok('import restaura',(await txt('#totExp')).includes('1.234,00')&&(await txt('#balance')).includes('866,00'));
 fs.writeFileSync('/tmp/v2.json',JSON.stringify(V2));await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport','/tmp/v2.json');await p.click('#dlgOk');await p.waitForTimeout(300);
 const d2=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));ok('importar copia v2 migra',d2.version===4&&d2.accounts[0].initial===5000);
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
 await p.goto(URL);await p.waitForSelector('.ci');for(const w of [360,412]){await p.setViewportSize({width:w,height:760});await p.waitForTimeout(100);const m=await p.$eval('#chart .center',c=>{const s=getComputedStyle(c);return{fs:parseFloat(s.fontSize),tn:s.fontVariantNumeric,fit:[...c.querySelectorAll('.num')].every(d=>d.getBoundingClientRect().width<=c.clientWidth),tf:s.transform}});ok('totales donut legibles a '+w+'px ('+m.fs+'px, tnum, sin escalar)',m.fs>=17.5&&m.fs<=20.5&&m.tn.includes('tabular')&&m.tn.includes('lining')&&m.fit&&/^matrix\(1, 0, 0, 1,/.test(m.tf));}
 {await p.setViewportSize({width:412,height:760});const r=await p.$$eval('#totInc,#totExp,#balance',els=>els.map(e=>{const n=e.querySelector('.num'),c=e.querySelector('small.c');if(!n||!c)return null;const sn=getComputedStyle(n),sc=getComputedStyle(c);const t=document.createElement('span');t.textContent='0';n.insertBefore(t,c);const bi=t.getBoundingClientRect().bottom,bc=c.getBoundingClientRect().bottom;t.remove();return{ratio:parseFloat(sc.fontSize)/parseFloat(sn.fontSize),same:sc.fontFamily===sn.fontFamily,lining:sc.fontVariantNumeric.includes('lining'),va:sc.verticalAlign,db:Math.abs(bi-bc)};}));
  ok('céntimos 0,8em, misma fuente y línea base '+JSON.stringify(r),r.every(x=>x&&Math.abs(x.ratio-.8)<.02&&x.same&&x.lining&&x.va==='baseline'&&x.db<2.5));}
 {const sc=await mk();const q=await sc.newPage();watch(q);
  await q.addInitScript(()=>{window.__shared=null;navigator.canShare=o=>!!(o&&o.files&&o.files.length);navigator.share=async o=>{if(localStorage.getItem('t.abort'))throw new DOMException('x','AbortError');window.__shared={name:o.files[0].name,type:o.files[0].type,size:o.files[0].size,text:await o.files[0].text()};};});
  await q.goto(URL+'#/ajustes');await q.waitForSelector('#btnExport');await q.click('#btnExport');await q.waitForFunction(()=>window.__shared);
  const sh=await q.evaluate(()=>window.__shared);ok('copia: usa Web Share con archivo JSON',/^slot-ai-copia-\d{4}-\d{2}-\d{2}\.json$/.test(sh.name)&&sh.type==='application/json'&&JSON.parse(sh.text).version===4);
  ok('copia: tras compartir se actualiza «Última copia»',!(await q.textContent('#lastBackup')).includes('Nunca'));
  await q.evaluate(()=>{localStorage.removeItem('slotai.lastBackup');localStorage.setItem('t.abort','1');});await q.reload();await q.click('#btnExport');await q.waitForTimeout(200);
  ok('copia: cancelar compartir no marca copia',(await q.textContent('#lastBackup')).includes('Nunca'));await sc.close();}
 // --- arranque: periodo Todo y vista recordada ---
 {const sc=await mk();const q=await sc.newPage();watch(q);const T=x=>q.textContent(x);const isAll=async()=>/\d+ \w+ \d\d - \d+ \w+ \d\d/.test(await T('#plabel'));
  await q.goto(URL);await q.evaluate(v=>{localStorage.removeItem('slotai.view');localStorage.setItem('gastos.v1',JSON.stringify(v));},V1);await q.reload();await q.waitForSelector('.ci');
  ok('arranque: periodo Todo y Todas las cuentas',await isAll()&&(await T('#accName'))==='Todas las cuentas');
  await q.click('[data-act="left"]');await q.click('#accCard');await q.click('#accDrop button:has-text("Tarjeta")');await q.click('[data-act="left"]');await q.click('[data-act="period"][data-p="month"]');
  await q.goto(URL+'#/categorias');await q.click('[data-t="income"]');await q.goto(URL);await q.reload();await q.waitForSelector('.ci');
  ok('arranque: recuerda la cuenta y vuelve a Todo',(await T('#accName'))==='Tarjeta'&&await isAll());
  await q.goto(URL+'#/categorias');await q.waitForSelector('.tabs');ok('arranque: recuerda la pestaña Ingresos en Categorías',(await q.getAttribute('[data-t="income"]','class')||'').includes('on'));
  await q.evaluate(()=>{const d=JSON.parse(localStorage.getItem('gastos.v1'));d.accounts=d.accounts.filter(a=>a.id!=='card');d.transactions=d.transactions.filter(t=>t.accountId!=='card'&&t.toAccountId!=='card');localStorage.setItem('gastos.v1',JSON.stringify(d));});
  await q.goto(URL);await q.reload();await q.waitForSelector('.ci');ok('arranque: cuenta borrada → Todas las cuentas',(await T('#accName'))==='Todas las cuentas');
  await q.click('[data-act="left"]');await q.click('#accCard');await q.click('#accDrop button:has-text("Todas las cuentas")');await q.reload();await q.waitForSelector('.ci');ok('arranque: recuerda Todas',(await T('#accName'))==='Todas las cuentas');
  await sc.close();}
 // --- fechas de movimientos con año ---
 {const sc=await mk();const q=await sc.newPage();watch(q);const Y=new Date().getFullYear();const yy=String(Y-1).slice(2);
  const D3=JSON.parse(JSON.stringify(V1));D3.transactions=[{id:'y1',type:'expense',amount:500,date:`${Y-1}-03-12`,accountId:'cash',categoryId:'a',note:'viejo'},{id:'y2',type:'expense',amount:700,date:`${Y}-01-05`,accountId:'cash',categoryId:'a',note:'nuevo'}];
  await q.goto(URL);await q.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),D3);await q.reload();await q.waitForSelector('.ci');
  await q.click('#balance');await q.waitForSelector('.group');await q.click('.grow >> nth=0');
  const dv=(await q.textContent('.tx:has-text("viejo") .d')).trim(),dn=(await q.textContent('.tx:has-text("nuevo") .d')).trim();
  ok('fechas: año anterior con YY ('+dv+'), año actual sin año ('+dn+')',dv==='12 mar '+yy&&dn==='5 ene');
  await sc.close();}
 // --- cajón izquierdo: elegir cierra ---
 {const sc=await mk();const q=await sc.newPage();watch(q);const T=x=>q.textContent(x);const open=async()=>{await q.click('[data-act="left"]');await q.waitForSelector('#leftDrawer');};const closed=async()=>!(await q.$('#leftDrawer'));
  await q.goto(URL);await q.evaluate(v=>{localStorage.removeItem('slotai.view');localStorage.setItem('gastos.v1',JSON.stringify(v));},V1);await q.reload();await q.waitForSelector('.ci');
  await open();await q.click('#accCard');await q.click('#accDrop button:has-text("Tarjeta")');ok('cajón: elegir cuenta cierra y aplica',await closed()&&(await T('#accName'))==='Tarjeta'&&!!(await q.$('#chart')));
  await open();await q.click('[data-act="period"][data-p="year"]');ok('cajón: elegir periodo cierra y aplica',await closed()&&/^\d{4}$/.test((await T('#plabel')).trim()));
  await open();await q.click('[data-act="period"][data-p="range"]');ok('cajón: Intervalo espera a confirmar',!(await closed())&&!!(await q.$('#rApply')));
  await q.fill('#rfrom','2026-10-02');await q.fill('#rto','2026-10-03');ok('cajón: cambiar fechas no cierra',!(await closed()));
  await q.click('#rApply');ok('cajón: Aplicar cierra con el intervalo ('+(await T('#plabel'))+')',await closed()&&(await T('#plabel')).includes('2 Oct')&&(await T('#plabel')).includes('3 Oct'));
  await open();await q.$eval('#pickDate',e=>{e.value='2026-10-05';e.dispatchEvent(new Event('change',{bubbles:true}))});ok('cajón: Elegir fecha cierra',await closed()&&(await T('#plabel')).includes('5 Octubre'));
  await open();await q.click('#accCard');await q.click('#accDrop button:has-text("Todas las cuentas")');ok('cajón: Todas las cuentas cierra',await closed()&&(await T('#accName'))==='Todas las cuentas');
  await sc.close();}
 // --- aviso de copia al abrir ---
 {const sc=await mk(false,true);const q=await sc.newPage();watch(q);
  await q.addInitScript(()=>{window.__sh=0;navigator.canShare=()=>true;navigator.share=async()=>{window.__sh++;};});
  await q.goto(URL);await q.evaluate(()=>localStorage.clear());await q.reload();await q.waitForSelector('.ci');await q.waitForTimeout(900);ok('aviso: sin datos no aparece',!(await q.$('#bkBanner')));
  await q.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),V1);await q.reload();await q.waitForSelector('#bkBanner');ok('aviso: nunca copiado → aparece',(await q.textContent('#bkBanner')).includes('ninguna copia'));
  ok('aviso: no bloquea (se puede usar la app)',await q.evaluate(()=>{const r=document.querySelector('[data-act="right"]').getBoundingClientRect();const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!el.closest('[data-act="right"]');}));
  await q.click('#bkLater');ok('aviso: Más tarde lo oculta',!(await q.$('#bkBanner')));await q.reload();await q.waitForTimeout(900);ok('aviso: pospuesto 1 día',!(await q.$('#bkBanner')));
  const sn=await q.evaluate(()=>+localStorage.getItem('slotai.backupSnooze')-Date.now());ok('aviso: pospuesto ~24 h',sn>23*36e5&&sn<=24*36e5);
  await q.evaluate(()=>{localStorage.removeItem('slotai.backupSnooze');localStorage.setItem('slotai.lastBackup',new Date(Date.now()-9*864e5).toISOString());localStorage.setItem('slotai.lastBackupCount','4');});await q.reload();await q.waitForSelector('#bkBanner');ok('aviso: >7 días',(await q.textContent('#bkBanner')).includes('9 días'));
  await q.click('#bkNow');await q.waitForTimeout(200);ok('aviso: Exportar copia usa compartir y lo oculta',(await q.evaluate(()=>window.__sh))===1&&!(await q.$('#bkBanner')));
  await q.reload();await q.waitForTimeout(900);ok('aviso: tras copiar no aparece',!(await q.$('#bkBanner')));
  await q.evaluate(()=>{const d=JSON.parse(localStorage.getItem('gastos.v1'));for(let i=0;i<31;i++)d.transactions.push({id:'n'+i,type:'expense',amount:100,date:'2026-10-01',accountId:'cash',categoryId:'exp-otros',note:''});localStorage.setItem('gastos.v1',JSON.stringify(d));});await q.reload();await q.waitForSelector('#bkBanner');ok('aviso: >30 movimientos nuevos',(await q.textContent('#bkBanner')).includes('31 movimientos'));
  await sc.close();}
 // --- importar de Monefy (fixtures sintéticos) ---
 {const M=require('../js/monefy.js');
  ok('monefy: importes',M.parseAmount('-1.234,56')===-123456&&M.parseAmount('-1,234.56')===-123456&&M.parseAmount('27,2')===2720&&M.parseAmount('-27.2')===-2720&&M.parseAmount('1.000.000')===100000000);
  const q=M.parse(fs.readFileSync(__dirname+'/monefy-sample-1252.csv'));
  ok('monefy: Windows-1252, ; y coma decimal, fecha dd.mm.aaaa',q.sep===';'&&q.summary.expense.some(e=>e.name==='Categoría'||e.name==='Ropa')&&q.summary.from==='2024-04-01'&&q.summary.income[0].total===200000);
  const m=M.mapExpense(q.summary.expense.map(e=>e.name));ok('monefy: >6 categorías → se agrupan las menores en Otros',m.merged.length===2&&new Set(Object.values(m.map)).size===6);}
 await p.goto(URL);await p.evaluate(v=>localStorage.setItem('gastos.v1',JSON.stringify(v)),V1);await p.reload();await p.waitForSelector('.ci');
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileMonefy',__dirname+'/monefy-sample.csv');await p.waitForSelector('#mfPrev');
 {const pv=await txt('#mfPrev');ok('monefy: vista previa (6 mov., 1 transferencia, 2 cuentas, 1 fila ignorada)',pv.includes('6 movimientos')&&pv.includes('1 transferencias')&&pv.includes('Caja A')&&pv.includes('Banco B')&&pv.includes('1.234,56')&&pv.includes('1 filas ignoradas'));}
 await p.click('#dlgCancel');ok('monefy: cancelar no cambia nada',(await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).transactions.length))===4);
 await p.setInputFiles('#fileMonefy',__dirname+'/monefy-sample.csv');await p.waitForSelector('#mfPrev');await p.click('#dlgOk');await p.waitForTimeout(200);
 {const d=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));const an=id=>d.accounts.find(a=>a.id===id).name;const tr=d.transactions.find(t=>t.type==='transfer');
  ok('monefy: reemplazar → cuentas, categorías reales y transferencia',d.accounts.map(a=>a.name).join()==='Caja A,Banco B'&&d.transactions.length===6&&an(tr.accountId)==='Caja A'&&an(tr.toAccountId)==='Banco B'&&tr.amount===20000
   &&d.categories.filter(c=>c.type==='expense').every(c=>!/^exp-/.test(c.id))&&!d.categories.some(c=>c.name==='Transporte'||c.name==='Ocio')&&d.categories.some(c=>c.name==='Súper')&&d.categories.some(c=>c.name==='Coche')&&d.categories.some(c=>c.type==='income'&&c.name==='Nómina')&&d.transactions.some(t=>t.note==='Pan, leche'));}
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileMonefy',__dirname+'/monefy-sample.csv');await p.waitForSelector('#mfPrev');await p.check('input[value="merge"]');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('monefy: añadir de nuevo no duplica',(await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')).transactions.length))===6);
 await p.goto(URL);await p.waitForSelector('.ci');await leftPick('all');ok('monefy: la app muestra los datos importados',(await txt('#totExp')).includes('1.254,31'));
 ok('sin errores de consola '+JSON.stringify(errs),errs.length===0);
 console.log(results.join('\n'));console.log(results.filter(r=>r.startsWith('PASS')).length+'/'+results.length+' OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
