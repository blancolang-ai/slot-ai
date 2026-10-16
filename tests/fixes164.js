// Pruebas de v1.6.4: total de gastos con signo menos «−» (solo datos sintéticos). ENGINE=webkit para el motor del iPhone. SHOT=ruta guarda captura (opcional).
const pw=require('playwright');const URL=process.env.URL||'http://localhost:8123/gastos/';const ENG=pw[process.env.ENGINE||'chromium'];
const results=[];const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' → '+JSON.stringify(x)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
const MINUS='\u2212';const T=s=>s.replace(/\s+/g,' ').trim();
const data=()=>({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'A',name:'Caja',icon:'banknotes',initial:20000}],
 categories:[{id:'c1',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'c2',type:'expense',name:'Casa',icon:'house',color:'#5aa5dc'},{id:'i1',type:'income',name:'Ventas',icon:'store',color:'#43a86a'}],
 transactions:[{id:'t1',type:'expense',amount:10000,date:'2026-10-02',accountId:'A',categoryId:'c1',note:''},{id:'t2',type:'expense',amount:2345,date:'2026-10-03',accountId:'A',categoryId:'c2',note:''},{id:'t3',type:'income',amount:5000,date:'2026-10-04',accountId:'A',categoryId:'i1',note:''}]});
(async()=>{const b=await ENG.launch();const errs=[];
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){const tag=`${vp.width}x${vp.height}: `;
  const c=await b.newContext({viewport:vp,locale:'es-ES',timezoneId:'Europe/Madrid'});await c.addInitScript(()=>localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9)));
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.evaluate(d=>{localStorage.setItem('gastos.v1',JSON.stringify(d));localStorage.removeItem('slotai.view');},data());await p.reload();await p.waitForSelector('#totExp');
  await p.evaluate(()=>{st.ptype='all';st.account='all';render();});
  const before=await p.evaluate(()=>localStorage.getItem('gastos.v1'));
  ok(tag+'total de gastos con −: '+T(await p.textContent('#totExp')),T(await p.textContent('#totExp'))===MINUS+'123,45 €');
  ok(tag+'total de ingresos sin signo',T(await p.textContent('#totInc'))==='50,00 €');
  ok(tag+'saldo sin cambios (126,55)',/Saldo 126,55/.test(T(await p.textContent('#balance'))));
  if(vp.width===390&&process.env.SHOT)await p.screenshot({path:process.env.SHOT});
  const r=await p.$eval('#totExp',e=>{const n=e.querySelector('.num'),c=e.querySelector('small.c');const t=document.createElement('span');t.textContent='0';n.insertBefore(t,c);const bi=t.getBoundingClientRect().bottom,bc=c.getBoundingClientRect().bottom;t.remove();
    return{ratio:parseFloat(getComputedStyle(c).fontSize)/parseFloat(getComputedStyle(n).fontSize),db:Math.abs(bi-bc),va:getComputedStyle(c).verticalAlign,first:n.textContent[0]};});
  ok(tag+'céntimos a 0,8 en la misma línea base con el signo delante',Math.abs(r.ratio-.8)<.02&&r.db<2.5&&r.va==='baseline'&&r.first===MINUS,r);
  ok(tag+'el total cabe en el centro del gráfico',await p.$eval('#totExp .num',e=>e.getBoundingClientRect().width<=e.closest('.center').clientWidth+1));
  await p.evaluate(()=>{location.hash='#/lista';});await p.waitForTimeout(100);
  const g=await p.$$eval('.grow',es=>es.map(e=>e.querySelector('.nm').textContent+'='+e.querySelector('.amt').textContent.replace(/\s+/g,' ').trim()));
  ok(tag+'lista: totales de categorías de gasto con −, ingresos sin signo',g.join('|')===`Ventas=50,00 €|Comida=${MINUS}100,00 €|Casa=${MINUS}23,45 €`,g);
  await p.click('.grow >> nth=1');ok(tag+'movimientos individuales sin cambios (sin signo)',T(await p.textContent('.tx .a'))==='100,00 €');
  await p.evaluate(()=>{location.hash='#/';st.ptype='week';st.anchor=new Date(2026,6,1);render();});await p.waitForTimeout(100);
  const z=T(await p.textContent('#totExp'));ok(tag+'sin gastos: 0,00 sin signo',z==='0,00 €',z);
  ok(tag+'datos guardados sin cambios',(await p.evaluate(()=>localStorage.getItem('gastos.v1')))===before);
  ok(tag+'sin desbordes',!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));
  if(vp.width===390){
   const e=await p.evaluate(()=>[0,-0,0.4,0.6,100,123456789].map(v=>document.createRange().createContextualFragment(moneyH(v,true)).textContent.replace(/\s+/g,' ')).join('|'));
   ok('moneyH gasto: 0, -0 y fracciones sin signo; resto con −',e===`0,00 €|0,00 €|0,00 €|${'\u2212'}0,01 €|${'\u2212'}1,00 €|${'\u2212'}1.234.567,89 €`,e);
   await p.evaluate(()=>{location.hash='#/ajustes';});await p.waitForTimeout(100);
   await p.setInputFiles('#fileMonefy',{name:'m.csv',mimeType:'text/csv',buffer:Buffer.from('date,account,category,amount\n01/01/2025,Norte,X,-5\n02/01/2025,Norte,Y,7\n')});await p.waitForSelector('#mfPrev');
   const mf=await p.$$eval('#mfPrev li .exp,#mfPrev li .inc',es=>es.map(e=>e.className+':'+e.textContent.replace(/\s+/g,' ')));ok('vista previa Monefy: gastos con −, ingresos sin signo',mf.join('|')===`exp:${'\u2212'}5,00 €|inc:7,00 €`,mf);}
  await c.close();}
 ok('sin errores de página',!errs.length,errs);await b.close();})();
