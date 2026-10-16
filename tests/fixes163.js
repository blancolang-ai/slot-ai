// Pruebas de v1.6.3: color del saldo según signo (solo datos sintéticos). ENGINE=webkit para el motor del iPhone. SHOT=ruta guarda captura (opcional).
const pw=require('playwright');const URL=process.env.URL||'http://localhost:8123/gastos/';const ENG=pw[process.env.ENGINE||'chromium'];
const results=[];const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' → '+JSON.stringify(x)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
// Cuenta «Negocio Norte» en negativo, «Caja» en positivo, «Vacía» a cero; total global positivo.
const data=()=>({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'N',name:'Negocio Norte',icon:'card',initial:1000},{id:'C',name:'Caja',icon:'banknotes',initial:50000},{id:'Z',name:'Vacía',icon:'moneybag',initial:0}],
 categories:[{id:'c1',type:'expense',name:'Gastos',icon:'tag',color:'#e57373'},{id:'i1',type:'income',name:'Ventas',icon:'store',color:'#43a86a'}],
 transactions:[{id:'t1',type:'expense',amount:23456,date:'2026-10-02',accountId:'N',categoryId:'c1',note:''},{id:'t2',type:'income',amount:700,date:'2026-10-03',accountId:'Z',categoryId:'i1',note:''},{id:'t3',type:'expense',amount:700,date:'2026-10-04',accountId:'Z',categoryId:'c1',note:''}]});
(async()=>{const b=await ENG.launch();const errs=[];
 for(const vp of [{width:390,height:844},{width:1280,height:800}])for(const dark of [false,true]){const tag=`${vp.width}x${vp.height}${dark?' oscuro':''}: `;
  const c=await b.newContext({viewport:vp,locale:'es-ES',timezoneId:'Europe/Madrid'});await c.addInitScript(()=>localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9)));
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));const d=data();d.settings.dark=dark;
  await p.goto(URL);await p.evaluate(d=>{localStorage.setItem('gastos.v1',JSON.stringify(d));localStorage.removeItem('slotai.view');},d);await p.reload();await p.waitForSelector('#balance');
  const css=v=>p.evaluate(v=>{const e=document.createElement('i');e.style.color=`var(${v})`;document.body.appendChild(e);const r=getComputedStyle(e).color;e.remove();return r;},v);
  const RED=await css('--red'),GREEN=await css('--green'),HDR=await css('--hdr'),MUTED=await css('--muted');
  const bal=async()=>p.evaluate(()=>{const e=document.querySelector('#balance');return{cls:e.className,bg:getComputedStyle(e).backgroundColor,txt:e.textContent};});
  const pick=async id=>{await p.evaluate(id=>{st.account=id;st.ptype='all';render();},id);};
  let r=await bal();ok(tag+'saldo global positivo verde',r.cls.includes('pos')&&r.bg===HDR&&/275,44/.test(r.txt),r);
  await pick('N');r=await bal();ok(tag+'saldo de cuenta negativa en rojo',r.cls.includes('neg')&&r.bg===RED&&/-224,56/.test(r.txt),r);
  if(vp.width===390&&!dark&&process.env.SHOT)await p.screenshot({path:process.env.SHOT});
  await p.evaluate(()=>{location.hash='#/lista';});await p.waitForTimeout(100);r=await bal();ok(tag+'saldo negativo rojo también en la lista',r.bg===RED,r);
  await pick('Z');r=await bal();ok(tag+'saldo exactamente 0 neutro (gris)',r.cls.includes('zero')&&r.bg===MUTED&&/0,00/.test(r.txt)&&!/-/.test(r.txt),r);
  await pick('C');r=await bal();ok(tag+'saldo de cuenta positiva verde',r.bg===HDR,r);
  await pick('all');await p.evaluate(()=>{location.hash='#/';});await p.waitForTimeout(100);await p.click('[data-act="right"]');
  const ab=await p.$$eval('#rightDrawer .ab',es=>es.map(e=>({c:e.className,col:getComputedStyle(e).color,t:e.textContent})));
  ok(tag+'cajón de cuentas: negativa roja, positiva verde, cero neutra',ab.length===3&&ab[0].col===RED&&/-224,56/.test(ab[0].t)&&ab[1].col===GREEN&&ab[2].col===MUTED&&!/-/.test(ab[2].t),ab);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);ok(tag+'sin desbordes',!ov);
  if(vp.width===390&&!dark){
   const e=await p.evaluate(()=>[-0,0,-0.001,0.001,-0.4,-0.5,-0.6,0.5,-1,1,-100.4,NaN].map(v=>sgn(v)+':'+fmtNum(v)).join(' '));
   ok('signo y formato coherentes: -0, ±0,001, ±0,5 céntimos, NaN',e==='zero:0,00 zero:0,00 zero:0,00 zero:0,00 zero:0,00 zero:0,00 neg:-0,01 pos:0,01 neg:-0,01 pos:0,01 neg:-1,00 zero:0,00',e);
   const z=await p.evaluate(()=>{Store.data.accounts[2].initial=-0;render();return [...document.querySelectorAll('#rightDrawer .ab')].map(x=>x.className+' '+x.textContent);});
   ok('saldo inicial -0: neutro y sin signo menos',z&&z[2].includes('zero')&&!/-/.test(z[2]),z);
   await p.keyboard.press('Escape');await p.evaluate(()=>{location.hash='#/ajustes';});await p.waitForTimeout(100);
   await p.setInputFiles('#fileMonefy',{name:'m.csv',mimeType:'text/csv',buffer:Buffer.from('date,account,category,amount\n01/01/2025,Norte,X,-5\n02/01/2025,Sur,Y,7\n03/01/2025,Cero,Y,2\n04/01/2025,Cero,X,-2\n')});await p.waitForSelector('#mfPrev');
   const mf=await p.$$eval('#mfPrev .bal',es=>es.map(e=>e.className));ok('vista previa Monefy: saldos con color por signo',mf.join()==='bal neg,bal pos,bal zero',mf);}
  await c.close();}
 ok('sin errores de página',!errs.length,errs);await b.close();})();
