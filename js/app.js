'use strict';
const APP_VERSION='1.0.1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D=()=>Store.data;
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ---------- formato ----------
function fmtNum(cents){const neg=cents<0;cents=Math.abs(Math.round(cents));const e=Math.floor(cents/100).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (neg?'-':'')+e+','+String(cents%100).padStart(2,'0');}
function money(c){return fmtNum(c)+'\u00a0'+D().settings.currency;}
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parseIso=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
const fmtDate=s=>{const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};

// ---------- estado ----------
const st={ptype:'month',anchor:new Date(),from:iso(new Date()),to:iso(new Date()),account:'all',drawer:false,open:{},catTab:'expense'};

function range(){
  const a=new Date(st.anchor.getFullYear(),st.anchor.getMonth(),st.anchor.getDate());
  switch(st.ptype){
    case 'day':return[iso(a),iso(a)];
    case 'week':{const ws=D().settings.weekStart;const off=(a.getDay()-ws+7)%7;const s=addDays(a,-off);return[iso(s),iso(addDays(s,6))];}
    case 'month':return[iso(new Date(a.getFullYear(),a.getMonth(),1)),iso(new Date(a.getFullYear(),a.getMonth()+1,0))];
    case 'year':return[a.getFullYear()+'-01-01',a.getFullYear()+'-12-31'];
    case 'range':return[st.from,st.to];
    default:return['0000-01-01','9999-12-31'];
  }
}
function periodLabel(){
  const[f,t]=range(),a=st.anchor;
  switch(st.ptype){
    case 'day':return fmtDate(f);
    case 'week':return fmtDate(f).slice(0,5)+' – '+fmtDate(t);
    case 'month':return MESES[a.getMonth()]+' '+a.getFullYear();
    case 'year':return String(a.getFullYear());
    case 'range':return fmtDate(f)+' – '+fmtDate(t);
    default:return 'Todo el periodo';
  }
}
function shift(n){const a=st.anchor;
  if(st.ptype==='day')st.anchor=addDays(a,n);
  else if(st.ptype==='week')st.anchor=addDays(a,7*n);
  else if(st.ptype==='month')st.anchor=new Date(a.getFullYear(),a.getMonth()+n,1);
  else if(st.ptype==='year')st.anchor=new Date(a.getFullYear()+n,0,1);
  else return; render();}

const cat=id=>D().categories.find(c=>c.id===id)||{name:'Sin categoría',icon:'❔',color:'#9e9e9e'};
const acc=id=>D().accounts.find(a=>a.id===id)||{name:'¿?',icon:'❔'};
function txInPeriod(){const[f,t]=range();return D().transactions.filter(x=>x.date>=f&&x.date<=t&&(st.account==='all'||x.accountId===st.account||x.toAccountId===st.account));}
function totals(list){let inc=0,exp=0;for(const x of list){if(x.type==='income')inc+=x.amount;else if(x.type==='expense')exp+=x.amount;}return{inc,exp};}
function accountBalance(id,upto='9999-12-31'){const a=acc(id);let b=a.initial||0;
  for(const x of D().transactions){if(x.date>upto)continue;
    if(x.accountId===id){b+=x.type==='income'?x.amount:-x.amount;}
    if(x.type==='transfer'&&x.toAccountId===id)b+=x.amount;}
  return b;}
function balance(){const upto=range()[1];const ids=st.account==='all'?D().accounts.map(a=>a.id):[st.account];return ids.reduce((s,id)=>s+accountBalance(id,upto),0);}

// ---------- render ----------
function route(){return (location.hash||'#/').slice(1);}
function render(){
  document.body.classList.toggle('dark',!!D().settings.dark);
  const r=route();
  const v=r==='/lista'?viewList():r==='/ajustes'?viewSettings():r==='/cuentas'?viewAccounts():r==='/categorias'?viewCategories():viewMain();
  $('#app').innerHTML=v+(st.drawer?drawer():'');
  if(r==='/'||r==='')bindSwipe();
}
function accountSelect(){return `<select id="accSel" aria-label="Cuenta"><option value="all">Todas las cuentas</option>${D().accounts.map(a=>`<option value="${a.id}" ${st.account===a.id?'selected':''}>${esc(a.icon+' '+a.name)}</option>`).join('')}</select>`;}
function topbar(title,back){return `<div class="top">${back?`<button class="iconbtn" data-act="back" aria-label="Volver">←</button>`:`<button class="iconbtn" data-act="drawer" aria-label="Menú">☰</button>`}<h1>${title}</h1>${back?'':accountSelect()}${back?'':`<button class="iconbtn" data-act="transfer" title="Transferencia" aria-label="Transferencia">⇄</button>`}</div>`;}
function periodBar(){
  const opts=[['day','Día'],['week','Semana'],['month','Mes'],['year','Año'],['all','Todo'],['range','Intervalo']];
  const nav=!['all','range'].includes(st.ptype);
  return `<div class="period"><button class="iconbtn" data-act="prev" ${nav?'':'style="visibility:hidden"'} aria-label="Anterior">‹</button>
  <div class="lbl"><div id="plabel">${esc(periodLabel())}</div>
  <select id="ptype" aria-label="Periodo">${opts.map(([k,l])=>`<option value="${k}" ${st.ptype===k?'selected':''}>${l}</option>`).join('')}</select>
  ${st.ptype==='range'?`<div style="margin-top:6px"><input type="date" id="rfrom" value="${st.from}"> <input type="date" id="rto" value="${st.to}"></div>`:''}</div>
  <button class="iconbtn" data-act="next" ${nav?'':'style="visibility:hidden"'} aria-label="Siguiente">›</button></div>`;
}
function donutSvg(parts,total){
  const R=30,C=2*Math.PI*R;let off=0,segs='';
  if(total<=0)segs=`<circle r="${R}" cx="50" cy="50" fill="none" stroke="var(--line)" stroke-width="9"/>`;
  else for(const p of parts){const len=p.v/total*C;segs+=`<circle r="${R}" cx="50" cy="50" fill="none" stroke="${p.color}" stroke-width="9" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`;off+=len;}
  return `<svg viewBox="0 0 100 100">${segs}</svg>`;
}
function viewMain(){
  const list=txInPeriod(),{inc,exp}=totals(list);
  const cats=D().categories.filter(c=>c.type==='expense');
  const sums={};for(const x of list)if(x.type==='expense')sums[x.categoryId]=(sums[x.categoryId]||0)+x.amount;
  const parts=cats.filter(c=>sums[c.id]).map(c=>({v:sums[c.id],color:c.color}));
  const n=cats.length;
  const icons=cats.map((c,i)=>{const ang=-Math.PI/2+i*2*Math.PI/n,r=43;const x=50+r*Math.cos(ang),y=50+r*Math.sin(ang);
    return `<button class="caticon ${sums[c.id]?'':'zero'}" style="left:${x}%;top:${y}%;background:${c.color}" data-act="quick" data-cat="${c.id}" title="${esc(c.name)}">${esc(c.icon)}</button>`;}).join('');
  const b=balance();
  return topbar('Slot-AI')+periodBar()+`<div class="chartwrap" id="chart">${donutSvg(parts,exp)}${icons}
   <div class="center"><div class="inc" id="totInc">${money(inc)}</div><div class="exp" id="totExp">${money(exp)}</div></div></div>
   <button class="balance" data-act="list" id="balance"><span>Saldo</span><b class="${b<0?'neg':''}">${money(b)}</b></button>
   <div class="bigbtns"><button class="bminus" data-act="add" data-type="expense" aria-label="Añadir gasto">−</button><button class="bplus" data-act="add" data-type="income" aria-label="Añadir ingreso">+</button></div>`;
}
function viewList(){
  const list=txInPeriod();const{inc,exp}=totals(list);const groups={};
  for(const x of list){const k=x.type==='transfer'?'__tr':x.categoryId;(groups[k]=groups[k]||{type:x.type,items:[],sum:0}).items.push(x);groups[k].sum+=x.amount;}
  const keys=Object.keys(groups).sort((a,b)=>{const ga=groups[a],gb=groups[b];const o={income:0,expense:1,transfer:2};return o[ga.type]-o[gb.type]||gb.sum-ga.sum;});
  const html=keys.map(k=>{const g=groups[k];const c=k==='__tr'?{name:'Transferencias',icon:'⇄',color:'#78909c'}:cat(k);
    const base=g.type==='income'?inc:exp;const pc=g.type==='transfer'||!base?'':Math.round(g.sum/base*100)+'%';
    const cls=g.type==='income'?'inc':g.type==='expense'?'exp':'tr';
    const items=st.open[k]?g.items.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<button class="txrow" data-act="edit" data-id="${x.id}"><span class="d">${fmtDate(x.date)}</span><span class="n">${esc(x.type==='transfer'?acc(x.accountId).name+' → '+acc(x.toAccountId).name:(x.note||acc(x.accountId).name))}</span><span class="amt ${cls}">${money(x.amount)}</span></button>`).join(''):'';
    return `<div class="group"><button class="grow" data-act="toggle" data-k="${k}"><span class="ci" style="background:${c.color}">${esc(c.icon)}</span><span class="nm">${esc(c.name)}</span><span class="pc">${pc}</span><span class="amt ${cls}">${money(g.sum)}</span></button>${items}</div>`;}).join('');
  return topbar('Transacciones',true)+periodBar()+`<div class="page">
   <div class="balance"><span>Ingresos <b class="amt inc">${money(inc)}</b></span><span>Gastos <b class="amt exp">${money(exp)}</b></span></div>
   ${html||'<div class="empty">No hay transacciones en este periodo</div>'}</div>`;
}
function viewSettings(){const s=D().settings;
  return topbar('Ajustes',true)+`<div class="page">
  <div class="section">General</div>
  <div class="row"><label for="setCur">Símbolo de moneda</label><input id="setCur" value="${esc(s.currency)}" maxlength="4" style="width:70px;text-align:center"></div>
  <div class="row"><label for="setWeek">Primer día de la semana</label><select id="setWeek"><option value="1" ${s.weekStart==1?'selected':''}>Lunes</option><option value="0" ${s.weekStart==0?'selected':''}>Domingo</option></select></div>
  <div class="row"><label for="setDark">Tema oscuro</label><input type="checkbox" class="switch" id="setDark" ${s.dark?'checked':''}></div>
  <div class="section">Datos</div>
  <div class="row"><label>Copia de seguridad (JSON)</label><button class="btn" data-act="exportJson" id="btnExport">Exportar</button></div>
  <div class="row"><label>Restaurar copia</label><button class="btn" data-act="importJson">Importar</button><input type="file" id="fileImport" accept=".json,application/json" hidden></div>
  <div class="row"><label>Exportar a CSV (Excel)</label><button class="btn" data-act="exportCsv" id="btnCsv">CSV</button></div>
  <div class="row"><label>Borrar todos los datos</label><button class="btn danger" data-act="reset">Borrar</button></div>
  <div class="section">Acerca de</div>
  <div class="row"><label>Versión</label><span>${APP_VERSION}</span></div></div>`;}
function viewAccounts(){
  const total=D().accounts.reduce((s,a)=>s+accountBalance(a.id),0);
  return topbar('Cuentas',true)+`<div class="page">${D().accounts.map(a=>{const b=accountBalance(a.id);return `<button class="row" style="width:100%" data-act="editAcc" data-id="${a.id}"><span style="font-size:22px">${esc(a.icon)}</span><label>${esc(a.name)}</label><b class="amt ${b<0?'exp':''}">${money(b)}</b></button>`;}).join('')}
  <div class="row"><label><b>Total</b></label><b>${money(total)}</b></div>
  <div class="form"><button class="btn" data-act="transfer">⇄ Nueva transferencia</button></div></div><button class="fab" data-act="editAcc" aria-label="Nueva cuenta">+</button>`;}
function viewCategories(){const t=st.catTab;
  return topbar('Categorías',true)+`<div class="tabs"><button class="${t==='expense'?'on':''}" data-act="catTab" data-t="expense">Gastos</button><button class="${t==='income'?'on':''}" data-act="catTab" data-t="income">Ingresos</button></div>
  <div class="page">${D().categories.filter(c=>c.type===t).map(c=>`<button class="grow" style="border-bottom:1px solid var(--line)" data-act="editCat" data-id="${c.id}"><span class="ci" style="background:${c.color}">${esc(c.icon)}</span><span class="nm">${esc(c.name)}</span></button>`).join('')}</div>
  <button class="fab" data-act="editCat" aria-label="Nueva categoría">+</button>`;}
function drawer(){return `<div class="drawer" data-act="closeDrawer"><nav><div class="hd">💰 Slot-AI</div>
  <a href="#/">📊 Resumen</a><a href="#/lista">📋 Transacciones</a><a href="#/cuentas">💳 Cuentas</a><a href="#/categorias">🏷️ Categorías</a><a href="#/ajustes">⚙️ Ajustes</a></nav></div>`;}

// ---------- entrada con calculadora ----------
let ed=null; // {tx, expr, type}
function evalExpr(e){
  const t=e.replace(/,/g,'.').match(/(\d+\.?\d*|\.\d+|[-+×÷])/g);if(!t)return 0;
  const vals=[],ops=[];let expectNum=true;
  for(const k of t){if(/[-+×÷]/.test(k)){if(expectNum)continue;ops.push(k);expectNum=true;}else{vals.push(parseFloat(k));expectNum=false;}}
  if(ops.length>=vals.length)ops.pop();
  let v=[vals[0]],o=[];for(let i=0;i<ops.length;i++){const b=vals[i+1];if(ops[i]==='×')v[v.length-1]*=b;else if(ops[i]==='÷')v[v.length-1]=b?v[v.length-1]/b:0;else{o.push(ops[i]);v.push(b);}}
  let r=v[0];o.forEach((op,i)=>r=op==='+'?r+v[i+1]:r-v[i+1]);return Math.round((r||0)*100);
}
function openEntry(type,tx,presetCat){
  const today=iso(new Date());
  const defAcc=st.account!=='all'?st.account:(D().accounts[0]||{}).id;
  tx=tx?{...tx}:{type,amount:0,date:today,accountId:defAcc,note:'',categoryId:presetCat||null,toAccountId:type==='transfer'?(D().accounts.find(a=>a.id!==defAcc)||{}).id:undefined};
  ed={tx,expr:tx.amount?fmtNum(tx.amount).replace(/\./g,''):'',editing:!!tx.id,picking:false};
  renderEntry();
}
function renderEntry(){
  let o=$('#entry');if(!o){o=document.createElement('div');o.id='entry';document.body.appendChild(o);}
  if(!ed){o.remove();return;}
  const x=ed.tx,t=x.type;const title=(ed.editing?'Editar ':'Nuevo ')+(t==='expense'?'gasto':t==='income'?'ingreso':'transferencia');
  const accOpts=sel=>D().accounts.map(a=>`<option value="${a.id}" ${sel===a.id?'selected':''}>${esc(a.icon+' '+a.name)}</option>`).join('');
  const val=evalExpr(ed.expr);
  let body;
  if(ed.picking){
    body=`<div class="catgrid">${D().categories.filter(c=>c.type===t).map(c=>`<button data-eact="pick" data-cat="${c.id}" class="${x.categoryId===c.id?'sel':''}"><span class="ci" style="background:${c.color}">${esc(c.icon)}</span>${esc(c.name)}</button>`).join('')}</div>`;
  }else{
    const keys=['7','8','9','÷','4','5','6','×','1','2','3','−',',','0','⌫','+'];
    const c=x.categoryId?cat(x.categoryId):null;
    body=`<div class="amount" id="amt"><small>${/[-+×÷]/.test(ed.expr.replace(/^-/,''))?esc(ed.expr):''}</small>${money(val)}</div>
    <div class="fields">
     <select id="eAcc" aria-label="Cuenta">${accOpts(x.accountId)}</select>
     <input type="date" id="eDate" value="${x.date}" aria-label="Fecha">
     ${t==='transfer'?`<select id="eTo" class="full" aria-label="Cuenta destino">${accOpts(x.toAccountId)}</select>`:''}
     <input id="eNote" class="full" placeholder="Nota" value="${esc(x.note)}">
     ${ed.editing&&t!=='transfer'?`<div class="full">Categoría: <b>${esc(c?c.icon+' '+c.name:'—')}</b></div>`:''}
    </div>
    <div class="keypad">${keys.map(k=>`<button data-key="${k}" class="${/[÷×−+⌫]/.test(k)?'op':''}">${k}</button>`).join('')}</div>
    ${ed.editing?`<div style="display:flex"><button class="action" style="flex:1;background:#757575" data-eact="del">ELIMINAR</button><button class="action" style="flex:2" data-eact="save" id="eSave">GUARDAR</button></div>`
     :t==='transfer'?`<button class="action" data-eact="save" id="eSave">TRANSFERIR</button>`
     :x.categoryId?`<button class="action" data-eact="save" id="eSave">GUARDAR EN ${esc(c.name.toUpperCase())}</button>`
     :`<button class="action" data-eact="choose" id="eChoose">ELEGIR CATEGORÍA</button>`}`;
  }
  o.className='overlay '+t;
  o.innerHTML=`<div class="top"><button class="iconbtn" data-eact="${ed.picking?'unpick':'close'}" aria-label="Cerrar">${ed.picking?'←':'✕'}</button><h1>${ed.picking?'Elegir categoría':title}</h1>${ed.editing&&!ed.picking&&t!=='transfer'?`<button class="iconbtn" data-eact="choose" aria-label="Cambiar categoría">🏷️</button>`:''}</div>${body}`;
}
function readEntryFields(){const x=ed.tx;const g=id=>document.getElementById(id);
  if(g('eAcc'))x.accountId=g('eAcc').value;if(g('eDate')&&g('eDate').value)x.date=g('eDate').value;if(g('eNote'))x.note=g('eNote').value;if(g('eTo'))x.toAccountId=g('eTo').value;}
function saveEntry(){readEntryFields();const x=ed.tx;x.amount=evalExpr(ed.expr);
  if(x.amount<=0){toast('Introduce un importe');return;}
  if(x.type==='transfer'&&x.accountId===x.toAccountId){toast('Elige dos cuentas distintas');return;}
  if(x.type!=='transfer'&&!x.categoryId){ed.picking=true;renderEntry();return;}
  Store.upsert('transactions',x);ed=null;renderEntry();render();toast('Guardado');}
function onKey(k){let e=ed.expr;
  if(k==='⌫')e=e.slice(0,-1);
  else if(/[÷×−+]/.test(k)){const op=k==='−'?'-':k;if(!e)return;e=/[-+×÷]$/.test(e)?e.slice(0,-1)+op:e+op;}
  else if(k===','){const last=e.split(/[-+×÷]/).pop();if(last.includes(','))return;e+=last?',':'0,';}
  else{const last=e.split(/[-+×÷]/).pop();if(/,\d\d$/.test(last))return;if(e.length>18)return;e+=k;}
  ed.expr=e;readEntryFields();renderEntry();}
document.addEventListener('click',ev=>{
  if(!ed)return;const k=ev.target.closest('[data-key]');if(k&&k.closest('#entry')){onKey(k.dataset.key);return;}
  const b=ev.target.closest('[data-eact]');if(!b)return;const a=b.dataset.eact;
  if(a==='close'){ed=null;renderEntry();}
  else if(a==='choose'){readEntryFields();ed.picking=true;renderEntry();}
  else if(a==='unpick'){ed.picking=false;renderEntry();}
  else if(a==='pick'){ed.tx.categoryId=b.dataset.cat;ed.picking=false;if(ed.editing)renderEntry();else saveEntry();}
  else if(a==='save')saveEntry();
  else if(a==='del'){if(confirm('¿Eliminar esta transacción?')){Store.remove('transactions',ed.tx.id);ed=null;renderEntry();render();toast('Eliminada');}}
});

// ---------- formularios cuenta / categoría ----------
function openForm(kind,id){
  const isAcc=kind==='acc';const obj=id?{...D()[isAcc?'accounts':'categories'].find(x=>x.id===id)}:(isAcc?{name:'',icon:'🏦',initial:0}:{name:'',icon:'⭐',color:'#90a4ae',type:st.catTab});
  const o=document.createElement('div');o.id='form';o.className='overlay';
  o.innerHTML=`<div class="top"><button class="iconbtn" data-f="close">✕</button><h1>${id?'Editar':'Nueva'} ${isAcc?'cuenta':'categoría'}</h1></div><div class="form">
   <label>Nombre<input id="fName" value="${esc(obj.name)}"></label>
   <label>Icono (emoji)<input id="fIcon" value="${esc(obj.icon)}" maxlength="4"></label>
   ${isAcc?`<label>Saldo inicial<input id="fInit" inputmode="decimal" value="${fmtNum(obj.initial||0).replace(/\./g,'')}"></label>`:`<label>Color<input type="color" id="fColor" value="${obj.color}"></label>`}
   <button class="btn" data-f="save" id="fSave">Guardar</button>${id?`<button class="btn danger" data-f="del">Eliminar</button>`:''}</div>`;
  document.body.appendChild(o);
  o.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;const f=b.dataset.f;
    if(f==='close')o.remove();
    if(f==='save'){obj.name=$('#fName').value.trim();obj.icon=$('#fIcon').value.trim()||'⭐';if(!obj.name){toast('Pon un nombre');return;}
      if(isAcc)obj.initial=Math.round(parseFloat($('#fInit').value.replace(/\./g,'').replace(',','.')||'0')*100)||0;else obj.color=$('#fColor').value;
      Store.upsert(isAcc?'accounts':'categories',obj);o.remove();render();}
    if(f==='del'){
      if(isAcc){if(D().accounts.length<=1){toast('Debe existir al menos una cuenta');return;}
        if(D().transactions.some(t=>t.accountId===id||t.toAccountId===id)){toast('La cuenta tiene transacciones; elimínalas antes');return;}}
      else if(D().transactions.some(t=>t.categoryId===id)&&!confirm('Hay transacciones con esta categoría; quedarán como "Sin categoría". ¿Continuar?'))return;
      Store.remove(isAcc?'accounts':'categories',id);if(st.account===id)st.account='all';o.remove();render();}
  });
}

// ---------- export / import ----------
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
function csv(){
  const q=v=>{v=String(v??'');return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const rows=[['Fecha','Tipo','Cuenta','Categoría','Importe','Moneda','Nota']];
  const tipos={expense:'Gasto',income:'Ingreso',transfer:'Transferencia'};
  for(const x of D().transactions.slice().sort((a,b)=>a.date.localeCompare(b.date))){
    const amt=x.type==='expense'?-x.amount:x.amount;
    rows.push([fmtDate(x.date),tipos[x.type],acc(x.accountId).name,x.type==='transfer'?'→ '+acc(x.toAccountId).name:cat(x.categoryId).name,fmtNum(amt).replace(/\./g,''),D().settings.currency,x.note]);}
  return '\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n');
}
const stamp=()=>iso(new Date());

// ---------- eventos generales ----------
document.addEventListener('click',ev=>{
  if(ed||$('#form'))return;
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='closeDrawer'){if(ev.target.closest('nav')&&!ev.target.closest('a'))return;st.drawer=false;render();return;}
  switch(a){
    case 'drawer':st.drawer=true;render();break;
    case 'back':location.hash='#/';break;
    case 'prev':shift(-1);break;case 'next':shift(1);break;
    case 'add':openEntry(b.dataset.type);break;
    case 'quick':openEntry('expense',null,b.dataset.cat);break;
    case 'transfer':if(D().accounts.length<2){toast('Necesitas al menos dos cuentas');break;}openEntry('transfer');break;
    case 'list':location.hash='#/lista';break;
    case 'toggle':st.open[b.dataset.k]=!st.open[b.dataset.k];render();break;
    case 'edit':openEntry(null,D().transactions.find(x=>x.id===b.dataset.id));break;
    case 'editAcc':openForm('acc',b.dataset.id);break;
    case 'editCat':openForm('cat',b.dataset.id);break;
    case 'catTab':st.catTab=b.dataset.t;render();break;
    case 'exportJson':download('slot-ai-copia-'+stamp()+'.json',Store.exportData(),'application/json');break;
    case 'exportCsv':download('slot-ai-'+stamp()+'.csv',csv(),'text/csv;charset=utf-8');break;
    case 'importJson':$('#fileImport').click();break;
    case 'reset':if(confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')){Store.reset();render();toast('Datos borrados');}break;
  }
});
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.id==='accSel'){st.account=t.value;render();}
  else if(t.id==='ptype'){st.ptype=t.value;if(t.value==='range'){st.from=iso(new Date(st.anchor.getFullYear(),st.anchor.getMonth(),1));st.to=iso(new Date());}render();}
  else if(t.id==='rfrom'||t.id==='rto'){st[t.id==='rfrom'?'from':'to']=t.value;if(st.from>st.to)[st.from,st.to]=[st.to,st.from];render();}
  else if(t.id==='setCur'){Store.setSetting('currency',t.value.trim()||'€');render();}
  else if(t.id==='setWeek'){Store.setSetting('weekStart',+t.value);render();}
  else if(t.id==='setDark'){Store.setSetting('dark',t.checked);render();}
  else if(t.id==='fileImport'&&t.files[0]){const r=new FileReader();r.onload=()=>{try{if(!confirm('Esto sustituirá todos los datos actuales. ¿Continuar?'))return;Store.importData(r.result);render();toast('Copia restaurada');}catch(e){toast('Error: '+e.message);}};r.readAsText(t.files[0]);}
});
function bindSwipe(){const el=$('#chart');if(!el)return;let x0=null,y0=null;
  el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))shift(dx<0?1:-1);});}
let toastT;function toast(msg,actionLabel,fn){const t=$('#toast');t.innerHTML=esc(msg)+(actionLabel?` <button id="toastBtn">${esc(actionLabel)}</button>`:'');t.classList.remove('hidden');
  if(fn)$('#toastBtn').onclick=fn;clearTimeout(toastT);if(!actionLabel)toastT=setTimeout(()=>t.classList.add('hidden'),2200);}
window.addEventListener('hashchange',()=>{st.drawer=false;render();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&ed){ed=null;renderEntry();}});

// ---------- service worker / actualizaciones ----------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const ask=w=>toast('Nueva versión disponible','Actualizar',()=>w.postMessage('skipWaiting'));
    if(reg.waiting&&navigator.serviceWorker.controller)ask(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ask(w);});});
    setInterval(()=>reg.update(),60*60*1000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update();});
  }).catch(e=>console.warn('SW',e));
  let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded)return;reloaded=true;location.reload();});
}
Store.onChange=null;
render();
