// Auditoría v1.6: pruebas aleatorias (propiedades) de totales/saldos, copia ida y vuelta, validación, calculadora, navegación.
const {chromium}=require('playwright');const fs=require('fs');const M=require('../js/monefy.js');
const URL=process.env.URL||'http://localhost:8123/gastos/';const PRIV='/workspace/private/slot-ai-import.json';
const results=[];const ok=(n,c,extra)=>{results.push((c?'PASS ':'FAIL ')+n+(c||extra===undefined?'':' → '+JSON.stringify(extra)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
// ---- generador determinista ----
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));const pick=a=>a[ri(0,a.length-1)];
const pad=n=>String(n).padStart(2,'0');
function randDate(){const y=pick([2020,2023,2024,2025,2026,2026,2026]);const m=ri(1,12);const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  const d=pick([1,dim,ri(1,dim),ri(1,dim)]);return `${y}-${pad(m)}-${pad(d)}`;}
function dataset(){const na=ri(1,4);const accounts=Array.from({length:na},(_,i)=>({id:'a'+i,name:'Cuenta '+i,icon:'moneybag',initial:pick([0,0,ri(-50000,500000)])}));
  const ne=ri(1,8),ni=ri(1,3);const categories=[...Array.from({length:ne},(_,i)=>({id:'e'+i,type:'expense',name:'G'+i,icon:'tag',color:'#e57373'})),...Array.from({length:ni},(_,i)=>({id:'i'+i,type:'income',name:'I'+i,icon:'moneybag',color:'#43a86a'}))];
  const n=ri(0,250),transactions=[];
  for(let k=0;k<n;k++){const type=na>1&&rnd()<.15?'transfer':rnd()<.3?'income':'expense';const a=pick(accounts).id;
    const t={id:'t'+k,type,amount:pick([1,99,100,ri(1,99999),ri(1,9999999),1999,3]),date:pick(['2024-02-29','2026-03-29','2026-03-28','2026-10-25','2026-10-26','2025-12-31','2026-01-01',randDate(),randDate()]),accountId:a,note:pick(['','x','café "1"; =SUM(A1)'])};
    if(type==='transfer'){t.toAccountId=pick(accounts.filter(x=>x.id!==a)).id;}else t.categoryId=pick(categories.filter(c=>c.type===type)).id;
    transactions.push(t);}
  return {app:'slot-ai',version:4,settings:{currency:'€',weekStart:pick([0,1]),dark:false},accounts,categories,transactions};}
const cents=s=>{s=s.replace(/[^\d,\-]/g,'');return Math.round(+s.replace(',','.')*100);}; // solo para leer el texto ya formateado
(async()=>{
 // ---------- unidad: importes CSV ----------
 const AM={'1.234,56':123456,'1,234.56':123456,'-27.2':-2720,'27,2':2720,'−14 €':-1400,'1.234':123400,'0,5':50,'-0,01':-1,'1.234.567,89':123456789,'(14,00)':-1400,'19.99':1999,'0.1':10,'abc':NaN};
 for(const k in AM){const v=M.parseAmount(k);ok('parseAmount '+k,Object.is(v,AM[k])||(isNaN(v)&&isNaN(AM[k])),v);}
 {const p=M.parse('date,account,category,amount,currency,description\n31/02/2026,A,Comida,-1,EUR,\n29/02/2024,A,Comida,-2,EUR,\n29/02/2025,A,Comida,-3,EUR,\n2026-13-01,A,Comida,-4,EUR,');
  ok('CSV: fechas imposibles rechazadas (31/02, 29/02/2025, mes 13), 29/02/2024 válida',p.tx.length===1&&p.tx[0].date==='2024-02-29'&&p.errors.join()==='2,4,5',p.errors);}
 {let ok1=true;for(let i=0;i<3000;i++){const c=ri(-99999999,99999999);const s=(c<0?'-':'')+Math.floor(Math.abs(c)/100)+','+pad(Math.abs(c)%100);if(M.parseAmount(s)!==c){ok1=false;break;}const s2=s.replace(',','.');if(Math.abs(c)%100&&M.parseAmount(s2)!==c){ok1=false;break;}}ok('parseAmount: 3000 importes aleatorios exactos (coma y punto)',ok1);}
 const b=await chromium.launch();const errs=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-ES',timezoneId:'Europe/Madrid',acceptDownloads:true});
 await ctx.addInitScript(()=>localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9)));
 const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(URL);await p.waitForSelector('.ci');
 // ---------- calculadora ----------
 const CALC={'0,1+0,2':30,'19,99×3':5997,'10÷3×3':1000,'100÷3':3333,'0,05×0,5':3,'1,1×1,1':121,'2-5':-300,'12,5':1250,'5÷0':0,'999999999,99+0,01':100000000000,'1+':100,'+5':500};
 for(const k in CALC){const v=await p.evaluate(e=>evalExpr(e),k);ok('calculadora '+k+' = '+CALC[k],v===CALC[k],v);}
 {const r=await p.evaluate(()=>{let bad=null;for(let i=0;i<5000;i++){const c=Math.floor(Math.random()*1e9);if(evalExpr(exprFromCents(c))!==c){bad=c;break;}}return bad;});ok('calculadora: 5000 importes editados vuelven exactos',r===null,r);}
 // ---------- teclado ----------
 await p.click('[data-act="add"][data-type="expense"]');for(const k of ['1','2',',','3','4','5','+','0',',','6','6','='])await p.click(`#entry [data-key="${k}"]`);
 ok('teclado: 12,34(5 ignorado)+0,66 = 13',(await p.textContent('#amt'))==='13');
 await p.goBack();await p.waitForTimeout(150);ok('Atrás del móvil cierra la entrada',!(await p.$('#entry')));
 // ---------- propiedades: totales y saldos ----------
 const N=+process.env.N||40;let fails=[];
 for(let it=0;it<N;it++){const d=dataset();
  await p.evaluate(d=>{localStorage.setItem('gastos.v1',JSON.stringify(d));localStorage.setItem('slotai.view','{}');},d);await p.reload();await p.waitForSelector('#totInc');
  const views=[['all','all'],...d.accounts.map(a=>['all',a.id]),['month','all'],['year',d.accounts[0].id],['week','all'],['day','all'],['range',pick(['all',d.accounts[0].id])]];
  for(const [pt,acc] of views){
   const anchor=pick(d.transactions.length?d.transactions:[{date:'2026-10-16'}]).date;const from=randDate(),to=randDate();
   const ui=await p.evaluate(({pt,acc,anchor,from,to})=>{st.ptype=pt;st.account=acc;st.anchor=parseIso(anchor);st.from=from<to?from:to;st.to=from<to?to:from;location.hash='#/';render();
     const t=s=>document.querySelector(s).textContent;const r={inc:t('#totInc'),exp:t('#totExp'),bal:t('#balance'),range:range(),pcs:[...document.querySelectorAll('.ci .pc')].map(e=>e.textContent)};
     location.hash='#/lista';render();r.groups=[...document.querySelectorAll('.grow')].map(g=>({n:+g.querySelector('.badge').textContent,a:g.querySelector('.amt').textContent}));return r;},{pt,acc,anchor,from,to});
   const [f,tt]=ui.range;let inc=0,exp=0,n=0;const inP=x=>x.date>=f&&x.date<=tt;
   for(const x of d.transactions)if(inP(x)&&(acc==='all'||x.accountId===acc)){if(x.type==='income')inc+=x.amount;if(x.type==='expense')exp+=x.amount;}
   for(const x of d.transactions)if(inP(x)&&(acc==='all'?true:(x.type==='transfer'?(x.accountId===acc||x.toAccountId===acc):x.accountId===acc)))n++;
   let bal=0;for(const a of d.accounts)if(acc==='all'||a.id===acc){bal+=a.initial;for(const x of d.transactions){if(x.date>tt)continue;if(x.accountId===a.id)bal+=x.type==='income'?x.amount:-x.amount;if(x.type==='transfer'&&x.toAccountId===a.id)bal+=x.amount;}}
   // rango esperado independiente
   const A=new Date(anchor+'T12:00:00Z');let ef,et;const ymd=x=>x.toISOString().slice(0,10);
   if(pt==='all'){ef='0000-01-01';et='9999-12-31';}else if(pt==='day'){ef=et=anchor;}else if(pt==='month'){ef=anchor.slice(0,8)+'01';et=ymd(new Date(Date.UTC(A.getUTCFullYear(),A.getUTCMonth()+1,0,12)));}
   else if(pt==='year'){ef=anchor.slice(0,4)+'-01-01';et=anchor.slice(0,4)+'-12-31';}else if(pt==='week'){const off=(A.getUTCDay()-d.settings.weekStart+7)%7;const s=new Date(A-off*864e5);ef=ymd(s);et=ymd(new Date(+s+6*864e5));}else{ef=from<to?from:to;et=from<to?to:from;}
   const sumPc=ui.pcs.length;
   const gN=ui.groups.reduce((s,g)=>s+g.n,0);
   if(f!==ef||tt!==et||cents(ui.inc)!==inc||cents(ui.exp)!==-exp||cents(ui.bal)!==bal||gN!==n)fails.push({it,pt,acc,anchor,range:ui.range,exp:[ef,et],ui:[ui.inc,ui.exp,ui.bal,gN],want:[inc,exp,bal,n]});
  }
  // saldo de cada cuenta en el cajón
  const dr=await p.evaluate(()=>{location.hash='#/';st.right=true;render();const r=[...document.querySelectorAll('.arow .ab')].map(e=>e.textContent);st.right=false;render();return r;});
  d.accounts.forEach((a,i)=>{let bb=a.initial;for(const x of d.transactions){if(x.accountId===a.id)bb+=x.type==='income'?x.amount:-x.amount;if(x.type==='transfer'&&x.toAccountId===a.id)bb+=x.amount;}if(cents(dr[i])!==bb)fails.push({it,acct:a.id,ui:dr[i],want:bb});});
  // copia ida y vuelta exacta
  const rt=await p.evaluate(()=>{const before=JSON.parse(Store.exportData());Store.importData(Store.exportData());const after=JSON.parse(Store.exportData());delete before.updated;delete after.updated;return JSON.stringify(before)===JSON.stringify(after);});
  const same=await p.evaluate(d=>{const x=JSON.parse(Store.exportData());return JSON.stringify(x.transactions)===JSON.stringify(d.transactions)&&JSON.stringify(x.accounts)===JSON.stringify(d.accounts);},d);
  if(!rt||!same)fails.push({it,roundtrip:rt,same});
 }
 ok(`propiedades: ${N} conjuntos aleatorios × todos los periodos/cuentas: totales, saldos, contadores, rango, saldos por cuenta y copia ida-vuelta exactos`,!fails.length,fails.slice(0,3));
 // ---------- semana con cambio de hora y año bisiesto ----------
 {const r=await p.evaluate(()=>{const o={};D().settings.weekStart=1;st.ptype='week';st.anchor=parseIso('2026-03-29');o.dst1=range();st.anchor=parseIso('2026-10-25');o.dst2=range();st.ptype='month';st.anchor=parseIso('2024-02-10');o.feb=range();st.anchor=new Date(2024,1,29);shift(12);o.next=range();st.ptype='day';st.anchor=parseIso('2026-03-29');shift(1);o.day=range();return o;});
  ok('semana con cambio de hora (mar/oct 2026), feb bisiesto, +12 meses, día tras DST',r.dst1.join()==='2026-03-23,2026-03-29'&&r.dst2.join()==='2026-10-19,2026-10-25'&&r.feb.join()==='2024-02-01,2024-02-29'&&r.next.join()==='2025-02-01,2025-02-28'&&r.day.join()==='2026-03-30,2026-03-30',r);}
 // ---------- fechas ----------
 {const r=await p.evaluate(()=>[fmtDM(today().slice(0,4)+'-03-05'),fmtDM('2025-03-05')]);ok('fechas: año actual «5 mar», anterior «5 mar 25»',r[0]==='5 mar'&&r[1]==='5 mar 25',r);}
 // ---------- validación de copias ----------
 const good=dataset();good.transactions=good.transactions.slice(0,5);
 const BAD={'json roto':'{"a":','otra app':JSON.stringify({app:'x',categories:[],transactions:[]}),'importe texto':{amount:'12'},'importe decimal':{amount:12.5},'importe negativo':{amount:-5},'importe NaN':{amount:null},'fecha imposible':{date:'2025-02-29'},'fecha mal':{date:'16/10/2026'},'tipo raro':{type:'gift'},'id repetido':'dup','cuenta inexistente':{accountId:'zz'},'versión futura':'ver'};
 await p.evaluate(d=>{localStorage.setItem('gastos.v1',JSON.stringify(d));},good);await p.reload();await p.waitForSelector('#totInc');
 const before=await p.evaluate(()=>localStorage.getItem('gastos.v1'));
 for(const k in BAD){let txt;const v=BAD[k];if(typeof v==='string'&&v!=='dup'&&v!=='ver')txt=v;else{const d=JSON.parse(JSON.stringify(good));d.transactions.push({id:'nn',type:'expense',amount:100,date:'2026-01-01',accountId:d.accounts[0].id,categoryId:'e0',note:''});
   if(v==='dup')d.transactions.push({...d.transactions[d.transactions.length-1]});else if(v==='ver')d.version=99;else Object.assign(d.transactions[d.transactions.length-1],v);txt=JSON.stringify(d);}
  const r=await p.evaluate(t=>{try{Store.importData(t);return 'aceptada';}catch(e){return e.message;}},txt);
  const after=await p.evaluate(()=>localStorage.getItem('gastos.v1'));ok('restaurar rechaza '+k+' sin tocar datos',r!=='aceptada'&&after===before,r);}
 // vía interfaz: archivo corrupto → diálogo de error, datos intactos
 fs.writeFileSync('/tmp/corrupt.json','{"categories":[],"transactions":[{"id":"x","type":"expense","amount":"1e3","date":"2026-01-01"}]}');
 await p.goto(URL+'#/ajustes');await p.setInputFiles('#fileImport','/tmp/corrupt.json');await p.click('#dlgOk');await p.waitForSelector('#dlg');
 ok('UI: copia corrupta → aviso «No se pudo restaurar»',/No se pudo restaurar/.test(await p.textContent('#dlg'))&&(await p.evaluate(()=>localStorage.getItem('gastos.v1')))===before);await p.click('#dlgOk');
 // restaurar válido + Deshacer
 const other=dataset();fs.writeFileSync('/tmp/other.json',JSON.stringify(other));await p.setInputFiles('#fileImport','/tmp/other.json');await p.click('#dlgOk');await p.waitForTimeout(200);
 ok('UI: restaurar copia válida',(await p.evaluate(()=>Store.data.transactions.length))===other.transactions.length);
 await p.click('#toastBtn');await p.waitForTimeout(200);ok('Deshacer restauración recupera los datos anteriores',(await p.evaluate(()=>Store.data.transactions.length))===good.transactions.length);
 // datos guardados ilegibles: no se sobrescriben
 await p.evaluate(()=>localStorage.setItem('gastos.v1','{roto'));await p.goto(URL);await p.reload();await p.waitForSelector('.ci');
 ok('datos locales ilegibles: copia intacta en gastos.v1.corrupt-*',await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('gastos.v1.corrupt-')&&localStorage.getItem(k)==='{roto')));
 // ---------- categorías: eliminar con mover ----------
 const CD={version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'a',name:'A',icon:'moneybag',initial:1000},{id:'b',name:'B',icon:'moneybag',initial:2500}],
  categories:[{id:'c1',type:'expense',name:'Uno',icon:'tag',color:'#e57373'},{id:'c2',type:'expense',name:'Dos',icon:'tag',color:'#5aa5dc'},{id:'i1',type:'income',name:'Ing',icon:'moneybag',color:'#43a86a'}],
  transactions:[{id:'x1',type:'expense',amount:300,date:'2026-10-01',accountId:'a',categoryId:'c1',note:''},{id:'x2',type:'expense',amount:200,date:'2026-10-01',accountId:'b',categoryId:'c2',note:''},{id:'x3',type:'transfer',amount:700,date:'2026-10-02',accountId:'a',toAccountId:'b',note:''}]};
 await p.evaluate(d=>localStorage.setItem('gastos.v1',JSON.stringify(d)),CD);await p.goto(URL+'#/categorias');await p.reload();await p.waitForSelector('.tabs');
 await p.click('[data-act="catTab"][data-t="expense"]');await p.click('.grow:has-text("Uno")');await p.click('#fDel');ok('categoría usada: ofrece mover',!!(await p.$('#dlg #dlgTo')));
 await p.selectOption('#dlgTo','c2');await p.click('#dlgOk');await p.waitForTimeout(150);
 let dd=await p.evaluate(()=>Store.data);ok('categoría eliminada y movimientos pasados a «Dos»',!dd.categories.some(c=>c.id==='c1')&&dd.transactions.find(t=>t.id==='x1').categoryId==='c2');
 // cuenta eliminada: saldo inicial pasa a destino → saldo total igual
 await p.goto(URL);const tot0=await p.evaluate(()=>{st.ptype='all';st.account='all';render();return balance();});
 await p.click('[data-act="right"]');await p.click('.arow:has-text("A")');await p.click('#fDel');await p.selectOption('#dlgTo','b');await p.click('#dlgOk');await p.waitForTimeout(150);
 const tot1=await p.evaluate(()=>balance());dd=await p.evaluate(()=>Store.data);ok('eliminar cuenta con movimientos: saldo total se conserva (inicial sumado)',tot0===tot1&&dd.accounts.length===1&&dd.accounts[0].initial===3500,[tot0,tot1]);
 // ring con movimientos sin categoría (copias antiguas)
 await p.evaluate(()=>{Store.data.transactions.push({id:'o1',type:'expense',amount:500,date:'2026-10-03',accountId:'b',categoryId:'gone',note:''});Store.save();render();});
 ok('dashboard: gasto de categoría borrada cuenta en total sin romper el gráfico',cents(await p.textContent('#totExp'))===-1000);
 // ---------- navegación Atrás ----------
 await p.goto(URL);await p.waitForSelector('.ci');
 await p.click('[data-act="left"]');ok('cajón abierto',!!(await p.$('#leftDrawer')));await p.goBack();await p.waitForTimeout(150);ok('Atrás cierra el cajón de filtros',!(await p.$('#leftDrawer')));
 await p.click('[data-act="right"]');await p.click('[data-r="/ajustes"]');await p.waitForSelector('#setCur');await p.click('[data-act="back"]');await p.waitForTimeout(150);
 ok('Ajustes → flecha atrás vuelve al panel',(await p.evaluate(()=>location.hash))!=='#/ajustes'&&!!(await p.$('.ci')));
 await p.goBack().catch(()=>{});await p.waitForTimeout(150);ok('Atrás no vuelve a abrir Ajustes',(await p.evaluate(()=>location.hash))!=='#/ajustes');
 await p.goto(URL);await p.waitForSelector('.ci');await p.click('[data-act="right"]');await p.click('.arow >> nth=0');await p.waitForSelector('#form');await p.goBack();await p.waitForTimeout(150);
 ok('Atrás cierra el formulario de cuenta',!(await p.$('#form'))&&!(await p.$('#rightDrawer')));
 await p.click('[data-act="add"][data-type="income"]');await p.click('#entry [data-key="5"]');await p.click('#eOk');await p.waitForSelector('.catgrid');await p.goBack();await p.waitForTimeout(150);
 ok('Atrás en «Elegir categoría» vuelve a la calculadora',!!(await p.$('#entry #amt'))&&(await p.textContent('#amt'))==='5');await p.goBack();await p.waitForTimeout(150);
 // intervalo: no se aplica hasta Aplicar
 await p.click('[data-act="left"]');await p.click('[data-p="range"]');await p.fill('#rfrom','2026-10-01');await p.dispatchEvent('#rfrom','change');ok('intervalo: cajón sigue abierto hasta Aplicar',!!(await p.$('#leftDrawer')));
 await p.fill('#rto','2026-10-02');await p.click('#rApply');ok('Aplicar cierra y filtra',!(await p.$('#leftDrawer'))&&(await p.evaluate(()=>range().join()))==='2026-10-01,2026-10-02');
 // CSV export sin inyección de fórmulas
 const c=await p.evaluate(()=>{Store.data.transactions[0].note='=HYPERLINK("x")';return csv();});ok('CSV: notas con = se neutralizan',c.includes("'=HYPERLINK"));
 // saldo inicial con punto decimal
 await p.click('[data-act="right"]');await p.click('[data-act="newAcc"]');await p.fill('#fName','Test');await p.fill('#fInit','12.5');await p.click('#fSave');
 ok('saldo inicial «12.5» = 12,50 € (no 125)',(await p.evaluate(()=>Store.data.accounts.find(a=>a.name==='Test').initial))===1250);
 // ---------- datos reales (solo en local, nunca en el repo) ----------
 if(fs.existsSync(PRIV)){await p.evaluate(t=>{Store.importData(t);st.ptype='all';st.account='all';location.hash='#/';render();},fs.readFileSync(PRIV,'utf8'));
  const r=await p.evaluate(()=>({inc:document.querySelector('#totInc').textContent,exp:document.querySelector('#totExp').textContent,n:Store.data.transactions.length,a:Store.data.accounts.length,bal:document.querySelector('#balance').textContent}));
  ok('datos privados: ingresos 13.507,50, gastos 13.175,01, neto 332,49, 290 movimientos, 3 cuentas',r.inc.replace(/\s/g,' ')==='13.507,50 €'&&cents(r.exp)===-1317501&&cents(r.bal)===33249&&r.n===290&&r.a===3,r);}
 ok('sin errores de consola',!errs.length,errs);
 await b.close();
})().catch(e=>{ok('excepción',false,String(e&&e.stack||e));process.exit(1);});
