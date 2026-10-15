const {chromium}=require('playwright');const fs=require('fs');
const URL='http://localhost:8123/gastos/';const SS='/workspace/monefy-app/screenshots/';
const results=[];const ok=(n,c)=>{results.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1;};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,locale:'es-ES',timezoneId:'Europe/Madrid'});
 const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>d.accept());
 await p.goto(URL);await p.waitForSelector('.caticon');
 ok('17 iconos de categoría alrededor del donut',(await p.$$('.caticon')).length===17);
 const key=async s=>{for(const k of s)await p.click(`[data-key="${k}"]`);};
 // gasto 12,50 Comida via keypad + calculadora
 await p.click('.bminus');await key('10+2,5');ok('calculadora 10+2,5',(await p.textContent('#amt')).includes('12,50'));
 await p.fill('#eNote','Mercadona');
 await p.screenshot({path:SS+'teclado-claro.png'});
 await p.click('#eChoose');await p.screenshot({path:SS+'categorias-elegir-claro.png'});
 await p.click('[data-eact="pick"]:has-text("Comida")');
 ok('gasto añadido',(await p.textContent('#totExp')).includes('12,50'));
 // gasto rápido desde icono
 await p.click('.caticon[title="Comer fuera"]');await key('1234');await p.click('#eSave');
 ok('formato 1.246,50 €',(await p.textContent('#totExp')).includes('1.246,50'));
 // ingreso
 await p.click('.bplus');await key('2000');await p.click('#eChoose');await p.click('[data-eact="pick"]:has-text("Salario")');
 ok('ingreso',(await p.textContent('#totInc')).includes('2.000,00'));
 ok('saldo 753,50',(await p.textContent('#balance')).includes('753,50'));
 // transferencia
 await p.click('[data-act="transfer"]');await key('100');await p.click('#eSave');
 ok('transferencia no afecta saldo total',(await p.textContent('#balance')).includes('753,50'));
 await p.selectOption('#accSel','card');ok('saldo tarjeta (transfer +100)',(await p.textContent('#balance')).includes('100,00'));
 await p.selectOption('#accSel','all');
 await p.screenshot({path:SS+'principal-claro.png'});
 // persistencia
 await p.reload();await p.waitForSelector('.caticon');ok('persistencia tras recargar',(await p.textContent('#totExp')).includes('1.246,50'));
 // periodos
 await p.selectOption('#ptype','day');ok('periodo día',/\d\d\/\d\d\/\d{4}/.test(await p.textContent('#plabel')));
 await p.selectOption('#ptype','week');const wl=await p.textContent('#plabel');ok('semana lunes-domingo: '+wl,wl.startsWith('12/10'));
 await p.click('[data-act="prev"]');ok('semana anterior vacía',(await p.textContent('#totExp')).includes('0,00'));
 await p.selectOption('#ptype','month');ok('mes',(await p.textContent('#plabel')).includes('octubre 2026'));
 // swipe
 const box=await p.locator('#chart').boundingBox();
 await p.dispatchEvent('#chart','touchstart',{touches:[{identifier:1,clientX:300,clientY:box.y+50}],changedTouches:[],targetTouches:[]}).catch(()=>{});
 await p.evaluate(()=>{const el=document.querySelector('#chart');const mk=(t,x)=>{const tc=new Touch({identifier:1,target:el,clientX:x,clientY:300});el.dispatchEvent(new TouchEvent(t,{touches:t==='touchstart'?[tc]:[],changedTouches:[tc],bubbles:true}));};mk('touchstart',300);mk('touchend',100);});
 ok('swipe → noviembre',(await p.textContent('#plabel')).includes('noviembre'));
 await p.click('[data-act="prev"]');await p.selectOption('#ptype','year');ok('año',(await p.textContent('#plabel'))==='2026');
 await p.selectOption('#ptype','all');await p.selectOption('#ptype','month');
 // lista, expandir, editar, borrar
 await p.click('#balance');await p.waitForSelector('.group');
 ok('lista agrupada (4 grupos)',(await p.$$('.group')).length===4);
 await p.click('.grow:has-text("Comida")');await p.click('.grow:has-text("Comer fuera")');
 await p.screenshot({path:SS+'lista-claro.png'});
 await p.click('.txrow:has-text("Mercadona")');await p.click('[data-key="⌫"]');await p.click('[data-key="⌫"]');await p.click('[data-key="⌫"]');await key('5');
 await p.click('#eSave');ok('editar importe 12,50 → 125,00',(await p.textContent('.grow:has-text("Comida")')).includes('125,00'));
 await p.click('.txrow:has-text("Mercadona")');await p.click('[data-eact="del"]');
 ok('eliminar',(await p.$$('.grow:has-text("Comida")')).length===0);
 // cuentas
 await p.goto(URL+'#/cuentas');await p.click('.fab');await p.fill('#fName','Ahorro');await p.fill('#fInit','500,25');await p.click('#fSave');
 ok('nueva cuenta con saldo inicial',(await p.textContent('.page')).includes('500,25'));
 // categorias
 await p.goto(URL+'#/categorias');await p.click('.fab');await p.fill('#fName','Viajes');await p.fill('#fIcon','✈️');await p.click('#fSave');
 ok('nueva categoría',(await p.textContent('.page')).includes('Viajes'));
 // ajustes, export
 await p.goto(URL+'#/ajustes');await p.screenshot({path:SS+'ajustes-claro.png'});
 let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnExport')]);const jp='/tmp/backup.json';await dl.saveAs(jp);
 const bj=JSON.parse(fs.readFileSync(jp,'utf8'));ok('export JSON ('+bj.transactions.length+' tx)',bj.transactions.length===3);
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#btnCsv')]);await dl.saveAs('/tmp/g.csv');const c=fs.readFileSync('/tmp/g.csv','utf8');
 ok('CSV con BOM y ;',c.charCodeAt(0)===0xfeff&&c.includes('Fecha;Tipo;Cuenta')&&c.includes('-1234,00'));
 await p.click('[data-act="reset"]');await p.goto(URL);ok('reset',(await p.textContent('#totExp')).includes('0,00'));
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport',jp);await p.waitForTimeout(300);
 await p.goto(URL);ok('import restaura',(await p.textContent('#totExp')).includes('1.234,00'));
 // SW + offline
 const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active;});ok('service worker activo',sw);
 await p.reload();await ctx.setOffline(true);await p.reload();await p.waitForSelector('.caticon');ok('funciona offline',(await p.textContent('#totExp')).includes('1.234,00'));await ctx.setOffline(false);
 // modo oscuro
 await p.goto(URL+'#/ajustes');await p.check('#setDark');await p.screenshot({path:SS+'ajustes-oscuro.png'});
 await p.goto(URL);await p.waitForSelector('.caticon');await p.screenshot({path:SS+'principal-oscuro.png'});
 await p.click('.bminus');await key('45,9');await p.screenshot({path:SS+'teclado-oscuro.png'});await p.click('[data-eact="close"]');
 await p.click('#balance');await p.click('.grow >> nth=0');await p.click('.grow >> nth=1');await p.screenshot({path:SS+'lista-oscuro.png'});
 ok('sin errores de consola '+JSON.stringify(errs),errs.length===0);
 console.log(results.join('\n'));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
