const {chromium}=require('playwright');const fs=require('fs');
const URL=process.env.URL||'http://localhost:8123/gastos/';const SS='/workspace/monefy-app/screenshots/';
const results=[];const ok=(n,c)=>{results.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1;};
// datos v1 (con cuentas, transferencias y categorías antiguas) para probar la migración
const V1={version:1,settings:{currency:'€',weekStart:1,dark:false},
 accounts:[{id:'cash',name:'Efectivo',icon:'💵',initial:10000},{id:'card',name:'Tarjeta',icon:'💳',initial:5000}],
 categories:[{id:'a',type:'expense',name:'Comida',icon:'🛒',color:'#81c784'},{id:'b',type:'expense',name:'Taxi',icon:'🚕',color:'#ffd54f'},{id:'c',type:'expense',name:'Bebidas',icon:'🍸',color:'#f06292'},{id:'d',type:'income',name:'Salario',icon:'💼',color:'#43a047'}],
 transactions:[{id:'t1',type:'expense',amount:1000,date:'2026-10-02',accountId:'cash',categoryId:'a',note:''},
  {id:'t2',type:'expense',amount:700,date:'2026-10-03',accountId:'card',categoryId:'b',note:'taxi'},
  {id:'t3',type:'expense',amount:300,date:'2026-10-04',accountId:'card',categoryId:'c',note:''},
  {id:'t4',type:'income',amount:20000,date:'2026-10-01',accountId:'card',categoryId:'d',note:''},
  {id:'t5',type:'transfer',amount:4000,date:'2026-10-05',accountId:'card',toAccountId:'cash',note:''}]};
(async()=>{
 const b=await chromium.launch();
 const mk=()=>b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,locale:'es-ES',timezoneId:'Europe/Madrid'});
 const errs=[];const watch=p=>{p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());};
 // --- migración ---
 {const c=await mk();const p=await c.newPage();watch(p);
  await p.goto(URL);await p.evaluate(v=>{localStorage.setItem('gastos.v1',JSON.stringify(v))},V1);await p.reload();await p.waitForSelector('.caticon');
  const d=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));
  const exp=d.categories.filter(c=>c.type==='expense');
  ok('migración: 6 categorías de gasto',exp.length===6);
  ok('migración: sin cuentas ni transferencias',!d.accounts&&d.transactions.length===4&&d.transactions.every(t=>!('accountId' in t)));
  ok('migración: Taxi/Bebidas → Otros',d.transactions.filter(t=>t.categoryId==='exp-otros').length===2);
  ok('migración: Comida conservada',d.transactions.find(t=>t.id==='t1').categoryId==='exp-comida');
  ok('migración: saldo inicial 150,00 (suma de cuentas)',d.settings.initialBalance===15000);
  await p.selectOption('#ptype','month');await p.evaluate(()=>{});
  await c.close();}
 // --- flujo principal ---
 const ctx=await mk();const p=await ctx.newPage();watch(p);
 await p.goto(URL);await p.waitForSelector('.caticon');
 ok('6 iconos alrededor del donut',(await p.$$('.caticon')).length===6);
 ok('sin selector de cuentas ni botón de transferencia',!(await p.$('#accSel'))&&!(await p.$('[data-act="transfer"]')));
 const key=async s=>{for(const k of s)await p.click(`[data-key="${k}"]`);};
 await p.click('.bminus');ok('entrada sin campo de cuenta',!(await p.$('#eAcc')));
 await key('10+2,5');ok('calculadora 10+2,5',(await p.textContent('#amt')).includes('12,50'));
 await p.fill('#eNote','Mercadona');await p.click('#eChoose');
 ok('selector con 6 categorías de gasto',(await p.$$('[data-eact="pick"]')).length===6);
 await p.click('[data-eact="pick"]:has-text("Comida")');
 ok('gasto añadido',(await p.textContent('#totExp')).includes('12,50'));
 await p.click('.caticon[title="Ocio"]');await key('1234');await p.click('#eSave');
 ok('formato 1.246,50 €',(await p.textContent('#totExp')).includes('1.246,50'));
 await p.click('.bplus');await key('2000');await p.click('#eChoose');await p.click('[data-eact="pick"]:has-text("Salario")');
 ok('ingreso',(await p.textContent('#totInc')).includes('2.000,00'));
 ok('saldo único 753,50',(await p.textContent('#balance')).includes('753,50'));
 await p.waitForTimeout(2300);await p.screenshot({path:SS+'principal-claro.png'});
 await p.reload();await p.waitForSelector('.caticon');ok('persistencia tras recargar',(await p.textContent('#totExp')).includes('1.246,50'));
 // periodos
 await p.selectOption('#ptype','day');ok('periodo día',/\d\d\/\d\d\/\d{4}/.test(await p.textContent('#plabel')));
 await p.selectOption('#ptype','week');const wl=await p.textContent('#plabel');ok('semana lunes-domingo: '+wl,wl.startsWith('12/10'));
 await p.click('[data-act="prev"]');ok('semana anterior vacía',(await p.textContent('#totExp')).includes('0,00'));
 await p.selectOption('#ptype','month');ok('mes',(await p.textContent('#plabel')).includes('octubre 2026'));
 await p.evaluate(()=>{const el=document.querySelector('#chart');const mk=(t,x)=>{const tc=new Touch({identifier:1,target:el,clientX:x,clientY:300});el.dispatchEvent(new TouchEvent(t,{touches:t==='touchstart'?[tc]:[],changedTouches:[tc],bubbles:true}));};mk('touchstart',300);mk('touchend',100);});
 ok('swipe → noviembre',(await p.textContent('#plabel')).includes('noviembre'));
 await p.click('[data-act="prev"]');await p.selectOption('#ptype','year');ok('año',(await p.textContent('#plabel'))==='2026');
 await p.selectOption('#ptype','month');
 // lista
 await p.click('#balance');await p.waitForSelector('.group');ok('lista agrupada (3 grupos)',(await p.$$('.group')).length===3);
 await p.click('.grow:has-text("Comida")');await p.click('.grow:has-text("Ocio")');
 await p.click('.txrow:has-text("Mercadona")');for(let i=0;i<3;i++)await p.click('[data-key="⌫"]');await key('5');await p.click('#eSave');
 ok('editar importe 12,50 → 125,00',(await p.textContent('.grow:has-text("Comida")')).includes('125,00'));
 await p.click('.txrow:has-text("Mercadona")');await p.click('[data-eact="del"]');ok('eliminar',(await p.$$('.grow:has-text("Comida")')).length===0);
 // cuentas eliminadas
 await p.goto(URL+'#/cuentas');ok('ruta #/cuentas ya no existe (muestra resumen)',!!(await p.$('.caticon')));
 await p.click('[data-act="drawer"]');ok('menú sin "Cuentas"',!(await p.textContent('.drawer')).includes('Cuentas'));await p.click('.drawer',{position:{x:380,y:400}});
 // renombrar categoría
 await p.goto(URL+'#/categorias');ok('gastos: 6 categorías, sin botón añadir',(await p.$$('.page .grow')).length===6&&!(await p.$('.fab')));
 await p.click('.grow:has-text("Otros")');ok('categoría de gasto no se puede eliminar',!(await p.$('[data-f="del"]')));
 await p.fill('#fName','Varios');await p.waitForTimeout(2300);await p.screenshot({path:SS+'renombrar-categoria-claro.png'});await p.click('#fSave');
 ok('renombrada a Varios',(await p.textContent('.page')).includes('Varios'));
 await p.goto(URL);await p.waitForSelector('.caticon');ok('donut usa nuevo nombre',!!(await p.$('.caticon[title="Varios"]')));
 await p.goto(URL+'#/categorias');await p.click('[data-t="income"]');await p.click('.fab');await p.fill('#fName','Extra');await p.click('#fSave');
 ok('nueva categoría de ingreso',(await p.textContent('.page')).includes('Extra'));
 // ajustes, export/import
 await p.goto(URL+'#/ajustes');await p.screenshot({path:SS+'ajustes-claro.png'});
 await p.fill('#setInit','100');await p.press('#setInit','Tab');
 let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnExport')]);const jp='/tmp/backup.json';await dl.saveAs(jp);
 const bj=JSON.parse(fs.readFileSync(jp,'utf8'));ok('export JSON ('+bj.transactions.length+' tx, v'+bj.version+')',bj.transactions.length===2&&bj.version===2&&!bj.accounts);
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnCsv')]);await dl.saveAs('/tmp/g.csv');const c=fs.readFileSync('/tmp/g.csv','utf8');
 ok('CSV con BOM, ; y sin columna Cuenta',c.charCodeAt(0)===0xfeff&&c.includes('Fecha;Tipo;Categoría;Importe')&&c.includes('-1234,00'));
 await p.goto(URL);ok('saldo con saldo inicial 100 → 866,00',(await p.textContent('#balance')).includes('866,00'));
 await p.goto(URL+'#/ajustes');await p.click('[data-act="reset"]');await p.goto(URL);ok('reset',(await p.textContent('#totExp')).includes('0,00'));
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport',jp);await p.waitForTimeout(300);
 await p.goto(URL);ok('import restaura',(await p.textContent('#totExp')).includes('1.234,00'));
 fs.writeFileSync('/tmp/v1.json',JSON.stringify(V1));await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport','/tmp/v1.json');await p.waitForTimeout(300);
 const d2=await p.evaluate(()=>JSON.parse(localStorage.getItem('gastos.v1')));ok('importar copia v1 antigua migra',d2.version===2&&d2.categories.filter(c=>c.type==='expense').length===6&&d2.transactions.length===4);
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport',jp);await p.waitForTimeout(300);
 // SW + offline
 ok('service worker activo',await p.evaluate(async()=>!!(await navigator.serviceWorker.ready).active));
 await p.goto(URL);await ctx.setOffline(true);await p.reload();await p.waitForSelector('.caticon');ok('funciona offline',(await p.textContent('#totExp')).includes('1.234,00'));await ctx.setOffline(false);
 // oscuro
 await p.goto(URL+'#/ajustes');await p.check('#setDark');await p.screenshot({path:SS+'ajustes-oscuro.png'});
 await p.goto(URL);await p.waitForSelector('.caticon');await p.screenshot({path:SS+'principal-oscuro.png'});
 await p.click('.bminus');await key('45,9');await p.screenshot({path:SS+'teclado-oscuro.png'});await p.click('#eChoose');await p.screenshot({path:SS+'categorias-elegir-oscuro.png'});await p.click('[data-eact="unpick"]');await p.click('[data-eact="close"]');
 await p.goto(URL+'#/categorias');await p.click('.grow:has-text("Comida")');await p.screenshot({path:SS+'renombrar-categoria-oscuro.png'});
 ok('sin errores de consola '+JSON.stringify(errs),errs.length===0);
 console.log(results.join('\n'));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
