// Pruebas de v1.6.5: sin zoom por pellizco ni doble toque; toques rápidos del teclado cuentan todos (solo datos sintéticos). ENGINE=webkit para el motor del iPhone.
const pw=require('playwright');const URL=process.env.URL||'http://localhost:8123/gastos/';const ENG=pw[process.env.ENGINE||'chromium'];
const results=[];const ok=(n,c,x)=>{results.push((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' → '+JSON.stringify(x)));if(!c)process.exitCode=1;};
process.on('exit',()=>{console.log(results.join('\n'));const f=results.filter(r=>r.startsWith('FAIL')).length;console.log(`${results.length-f}/${results.length} OK`);});
const data=()=>({version:4,settings:{currency:'€',weekStart:1,dark:false},accounts:[{id:'A',name:'Caja',icon:'banknotes',initial:20000}],
 categories:[{id:'c1',type:'expense',name:'Comida',icon:'cart',color:'#e573a0'},{id:'i1',type:'income',name:'Ventas',icon:'store',color:'#4caf50'}],
 transactions:[{id:'t1',type:'expense',amount:1000,date:'2026-10-02',accountId:'A',categoryId:'c1',note:''}]});
(async()=>{const b=await ENG.launch();const errs=[];const iph=pw.devices['iPhone 13'];
 const confs=[['iPhone 390x844',{...iph,isMobile:process.env.ENGINE==='webkit'||!process.env.ENGINE?iph.isMobile:false}],['escritorio 1280x800',{viewport:{width:1280,height:800}}]];
 for(const [name,opt] of confs){const tag=name+': ';const touch=!!opt.hasTouch;
  const c=await b.newContext({...opt,locale:'es-ES',timezoneId:'Europe/Madrid'});await c.addInitScript(()=>localStorage.setItem('slotai.backupSnooze',String(Date.now()+864e9)));
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.evaluate(d=>{localStorage.setItem('gastos.v1',JSON.stringify(d));localStorage.removeItem('slotai.view');},data());await p.reload();await p.waitForSelector('#totExp');
  ok(tag+'viewport con 390/1280 de ancho',(await p.evaluate(()=>innerWidth))===(touch?390:1280));
  const vp=await p.getAttribute('meta[name=viewport]','content');ok(tag+'viewport maximum-scale=1, user-scalable=no',/maximum-scale=1/.test(vp)&&/user-scalable=no/.test(vp)&&/width=device-width/.test(vp),vp);
  const g=await p.evaluate(()=>['gesturestart','gesturechange','gestureend'].map(t=>{const e=new Event(t,{cancelable:true,bubbles:true});document.body.dispatchEvent(e);return e.defaultPrevented;}));
  ok(tag+'gesturestart/change/end con preventDefault',g.every(Boolean),g);
  await p.evaluate(()=>openEntry('expense'));await p.waitForSelector('#entry [data-key="7"]');
  const ta=await p.evaluate(()=>['html','body','#entry [data-key="7"]','#eNote','.grow,button'].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).touchAction:'-'}));
  ok(tag+'touch-action: manipulation en html, body y controles',ta.every(t=>t==='manipulation'),ta);
  const fs=await p.evaluate(()=>{const host=document.createElement('div');host.className='dlgsel';host.innerHTML='<select><option>x</option></select><input>';document.body.append(host);
    const r=[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=color]),select,textarea')].map(e=>(e.id||e.className||e.tagName)+':'+parseFloat(getComputedStyle(e).fontSize));host.remove();return r;});
  ok(tag+'todos los campos >= 16px (entrada + diálogo de 13px)',fs.length>=4&&fs.every(s=>+s.split(':').pop()>=16),fs);
  const amt=()=>p.$eval('#amt',e=>e.textContent.replace(/\s+/g,''));
  const box=await p.locator('#entry [data-key="7"]').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await p.evaluate(()=>{window.__pd=[];window.addEventListener('touchend',e=>window.__pd.push(e.defaultPrevented));});
  if(touch){await p.touchscreen.tap(x,y);await p.touchscreen.tap(x,y);await p.waitForTimeout(80);
    ok(tag+'doble toque rápido en el teclado: dos dígitos (77)',/^77/.test(await amt()),await amt());
    ok(tag+'el segundo toque no amplía (preventDefault) y el primero es normal',JSON.stringify(await p.evaluate(()=>window.__pd))==='[false,true]',await p.evaluate(()=>window.__pd));
    for(let i=0;i<3;i++)await p.touchscreen.tap(x,y);await p.waitForTimeout(80);ok(tag+'cinco toques rápidos = 77777',/^77777/.test(await amt()),await amt());
    const k8=await p.locator('#entry [data-key="8"]').boundingBox();await p.touchscreen.tap(k8.x+k8.width/2,k8.y+k8.height/2);await p.waitForTimeout(80);
    ok(tag+'toque rápido en otra tecla cuenta (777778)',/^777778/.test(await amt()),await amt());
    ok(tag+'sin zoom: escala 1',(await p.evaluate(()=>visualViewport.scale))===1);
  }else{await p.dblclick('#entry [data-key="7"]');ok(tag+'doble clic en el teclado: dos dígitos (77)',/^77/.test(await amt()),await amt());}
  {const bef=await amt();await p.click('#entry [data-key="⌫"]');const aft=await amt();ok(tag+'borrar quita un dígito: '+bef+' → '+aft,aft.replace(/\D/g,'')===bef.replace(/\D/g,'').slice(0,-1));}
  await p.keyboard.press('Escape');await p.evaluate(()=>{location.hash='#/';});await p.waitForTimeout(150);
  // deslizar/scroll: los gestos de un dedo no se bloquean
  const mv=await p.evaluate(()=>{try{const el=document.querySelector('#chart')||document.body;const T=(x)=>new Touch({identifier:1,target:el,clientX:x,clientY:200});
    const s=new TouchEvent('touchstart',{touches:[T(300)],changedTouches:[T(300)],bubbles:true,cancelable:true});el.dispatchEvent(s);
    const m=new TouchEvent('touchmove',{touches:[T(150)],changedTouches:[T(150)],bubbles:true,cancelable:true});el.dispatchEvent(m);
    const e=new TouchEvent('touchend',{touches:[],changedTouches:[T(150)],bubbles:true,cancelable:true});el.dispatchEvent(e);return [s.defaultPrevented,m.defaultPrevented,e.defaultPrevented];}catch(x){return 'sin Touch'}});
  ok(tag+'deslizar con un dedo no se bloquea',mv==='sin Touch'||JSON.stringify(mv)==='[false,false,false]',mv);
  await p.evaluate(()=>{location.hash='#/ajustes';});await p.waitForTimeout(150);
  const fs2=await p.$$eval('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=color]),select',es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)));
  ok(tag+'ajustes: campos >= 16px',fs2.length>0&&fs2.every(f=>f>=16),fs2);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(tag+'sin desbordes horizontales',ov);
  await c.close();}
 ok('sin errores de página',errs.length===0,errs);await b.close();})();
