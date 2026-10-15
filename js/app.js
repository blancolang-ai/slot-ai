'use strict';
const APP_VERSION='1.3.1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D=()=>Store.data;
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MCORTO=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sept','Oct','Nov','Dic'];
const DIAS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const I=(k,cls,sw)=>svgIcon(ICONS[k]||ICONS.tag,cls,sw);
const U=(k,cls,sw)=>svgIcon(UI[k],cls,sw);

// ---------- formato ----------
function fmtNum(cents){const neg=cents<0;cents=Math.abs(Math.round(cents));const e=Math.floor(cents/100).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (neg?'-':'')+e+','+String(cents%100).padStart(2,'0');}
const money=c=>fmtNum(c)+'\u00a0'+D().settings.currency;
function moneyH(c){const s=fmtNum(c),i=s.lastIndexOf(',');return `${s.slice(0,i)}<small class="c">${s.slice(i)}</small>\u00a0${esc(D().settings.currency)}`;}
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parseIso=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
const fmtDate=s=>{const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
const fmtShort=s=>{const d=parseIso(s);return d.getDate()+' '+MCORTO[d.getMonth()]+' '+String(d.getFullYear()).slice(2);};
const fmtDM=s=>{const d=parseIso(s);return d.getDate()+' '+MCORTO[d.getMonth()].toLowerCase();};
const fmtLong=s=>{const d=parseIso(s);const m=MESES[d.getMonth()];return DIAS[d.getDay()]+', '+d.getDate()+' '+m[0].toUpperCase()+m.slice(1)+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'');};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
function shade(hex,f){const n=parseInt(hex.slice(1),16);const ch=s=>Math.max(0,Math.min(255,Math.round(((n>>s)&255)*f)));return '#'+[16,8,0].map(s=>ch(s).toString(16).padStart(2,'0')).join('');}

// ---------- estado ----------
const st={ptype:'month',anchor:new Date(),from:iso(new Date()),to:iso(new Date()),account:'all',left:false,right:false,accDrop:false,open:{},catTab:'expense',sort:'amount',searching:false,q:''};
const today=()=>iso(new Date());
function range(){
  const a=new Date(st.anchor.getFullYear(),st.anchor.getMonth(),st.anchor.getDate());
  switch(st.ptype){
    case 'day':return[iso(a),iso(a)];
    case 'week':{const off=(a.getDay()-D().settings.weekStart+7)%7;const s=addDays(a,-off);return[iso(s),iso(addDays(s,6))];}
    case 'month':return[iso(new Date(a.getFullYear(),a.getMonth(),1)),iso(new Date(a.getFullYear(),a.getMonth()+1,0))];
    case 'year':return[a.getFullYear()+'-01-01',a.getFullYear()+'-12-31'];
    case 'range':return[st.from,st.to];
    default:return['0000-01-01','9999-12-31'];
  }
}
function periodLabel(){
  const[f,t]=range();
  if(st.ptype==='all'){const ds=D().transactions.map(x=>x.date).sort();const a=ds[0]||today(),b=ds.length&&ds[ds.length-1]>today()?ds[ds.length-1]:today();return fmtShort(a)+' - '+fmtShort(b);}
  if(st.ptype==='day')return fmtLong(f);
  if(st.ptype==='month'){const m=MESES[st.anchor.getMonth()];return m[0].toUpperCase()+m.slice(1)+' '+st.anchor.getFullYear();}
  if(st.ptype==='year')return String(st.anchor.getFullYear());
  return fmtShort(f)+' - '+fmtShort(t);
}
function shift(n){const a=st.anchor;
  if(st.ptype==='day')st.anchor=addDays(a,n);
  else if(st.ptype==='week')st.anchor=addDays(a,7*n);
  else if(st.ptype==='month')st.anchor=new Date(a.getFullYear(),a.getMonth()+n,1);
  else if(st.ptype==='year')st.anchor=new Date(a.getFullYear()+n,0,1);
  else return;render();}

const cat=id=>D().categories.find(c=>c.id===id)||{name:'Sin categoría',icon:'tag',color:'#9e9e9e'};
const acc=id=>D().accounts.find(a=>a.id===id)||{name:'¿?',icon:'wallet'};
const inAcc=x=>st.account==='all'||x.accountId===st.account||x.toAccountId===st.account;
function txInPeriod(){const[f,t]=range();return D().transactions.filter(x=>x.date>=f&&x.date<=t&&inAcc(x));}
function totals(list){let inc=0,exp=0;for(const x of list){if(st.account!=='all'&&x.accountId!==st.account)continue;if(x.type==='income')inc+=x.amount;else if(x.type==='expense')exp+=x.amount;}return{inc,exp};}
function accountBalance(id,upto='9999-12-31'){let b=acc(id).initial||0;
  for(const x of D().transactions){if(x.date>upto)continue;
    if(x.accountId===id)b+=x.type==='income'?x.amount:-x.amount;
    if(x.type==='transfer'&&x.toAccountId===id)b+=x.amount;}
  return b;}
function balance(){const upto=range()[1];const ids=st.account==='all'?D().accounts.map(a=>a.id):[st.account];return ids.reduce((s,id)=>s+accountBalance(id,upto),0);}

// ---------- render ----------
const route=()=>(location.hash||'#/').slice(1)||'/';
function render(){
  document.body.classList.toggle('dark',!!D().settings.dark);
  if(st.account!=='all'&&!D().accounts.some(a=>a.id===st.account))st.account='all';
  const r=route();
  const v=r==='/lista'?viewList():r==='/ajustes'?viewSettings():r==='/categorias'?viewCategories():viewMain();
  $('#app').innerHTML=v+(st.left?leftDrawer():'')+(st.right?rightDrawer():'');
  if(r==='/')bindSwipe();
  const q=$('#q');if(q&&st.searching&&document.activeElement!==q&&st.focusQ){q.focus();q.setSelectionRange(q.value.length,q.value.length);st.focusQ=false;}
}
function header(){
  const sub=st.account==='all'?'Todas las cuentas':acc(st.account).name;
  return `<div class="top"><button class="ib" data-act="left" aria-label="Filtro: cuenta y periodo">${U('funnel')}</button>
  <div class="brand"><div class="nm">Slot-AI</div><div class="sub" id="accName">${esc(sub)}</div></div>
  <button class="ib" data-act="search" aria-label="Buscar">${U('search')}</button>
  <button class="ib" data-act="transfer" aria-label="Transferencia">${U('transfer')}</button>
  <button class="ib" data-act="right" aria-label="Cuentas y más">${U('kebab')}</button></div>`;
}
function subHeader(title){return `<div class="top"><button class="ib" data-act="back" aria-label="Volver">${U('back',"",1.8)}</button><h1>${title}</h1></div>`;}
function dateLine(){const nav=!['all','range'].includes(st.ptype);
  return `<div class="dateline"><button class="ar" data-act="prev" aria-label="Anterior" ${nav?'':'style="visibility:hidden"'}>‹</button><span id="plabel">${esc(periodLabel())}</span><button class="ar" data-act="next" aria-label="Siguiente" ${nav?'':'style="visibility:hidden"'}>›</button></div>`;}
function bigButtons(){return `<div class="bigbtns"><button class="circ m" data-act="add" data-type="expense" aria-label="Añadir gasto">${svgIcon('<path d="M4 12h16"/>','',3)}</button><button class="circ p" data-act="add" data-type="income" aria-label="Añadir ingreso">${svgIcon(UI.plus,'',3)}</button></div>`;}
function saldoBtn(act){const b=balance();return `<button class="saldo" id="balance" data-act="${act}">Saldo <b>${moneyH(b)}</b></button>`;}

function viewMain(){
  const list=txInPeriod(),{inc,exp}=totals(list);
  const cats=D().categories.filter(c=>c.type==='expense');
  const sums={};for(const x of list)if(x.type==='expense'&&(st.account==='all'||x.accountId===st.account))sums[x.categoryId]=(sums[x.categoryId]||0)+x.amount;
  const CX=50,CY=59,R=26,SW=13,C=2*Math.PI*R,n=cats.length;
  let segs='',shadow='',lines='',off=0;const pos={};
  cats.forEach((c,i)=>{const th=(i+.5)*2*Math.PI/n;pos[c.id]={x:CX+42*Math.sin(th),y:CY-48*Math.cos(th)};});
  if(exp<=0)segs=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--line)" stroke-width="${SW}"/>`;
  else cats.filter(c=>sums[c.id]).forEach(c=>{const len=sums[c.id]/exp*C;
    const ring=col=>`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${CX} ${CY})"/>`;
    shadow+=ring(shade(c.color,.72));segs+=ring(c.color);
    const mid=(off+len/2)/C*2*Math.PI;const p1={x:CX+(R+SW/2)*Math.sin(mid),y:CY-(R+SW/2)*Math.cos(mid)};
    const p=pos[c.id];const dx=p1.x-p.x,dy=p1.y-p.y,dl=Math.hypot(dx,dy)||1;
    lines+=`<line x1="${p1.x}" y1="${p1.y}" x2="${p.x+dx/dl*7.5}" y2="${p.y+dy/dl*7.5}" stroke="${c.color}" stroke-width=".35"/>`;
    off+=len;});
  const icons=cats.map(c=>{const p=pos[c.id];const pc=sums[c.id]?Math.max(1,Math.round(sums[c.id]/exp*100))+'%':'';
    return `<button class="ci" style="left:${p.x}%;top:${p.y/118*100}%;color:${c.color}" data-act="quick" data-cat="${c.id}" title="${esc(c.name)}" aria-label="Gasto en ${esc(c.name)}">${I(c.icon,'',1.1)}${pc?`<span class="pc" style="color:${shade(c.color,.6)}">${pc}</span>`:''}</button>`;}).join('');
  return header()+dateLine()+`<div class="chart" id="chart"><svg viewBox="0 0 100 118"><g transform="translate(.9 1.3)">${shadow}</g>${segs}${lines}</svg>${icons}
   <div class="center"><div class="inc" id="totInc">${moneyH(inc)}</div><div class="exp" id="totExp">${moneyH(-exp)}</div></div></div>
   <div class="saldorow"><button class="lb" data-act="list" aria-label="Lista">${U('lines','',1.4)}</button>${saldoBtn('list')}<button class="lb" data-act="list" aria-label="Lista">${U('lines','',1.4)}</button></div>`+bigButtons();
}
function viewList(){
  let list=txInPeriod();
  if(st.searching&&st.q.trim()){const q=st.q.trim().toLowerCase();list=list.filter(x=>(x.note||'').toLowerCase().includes(q)||(x.type!=='transfer'&&cat(x.categoryId).name.toLowerCase().includes(q))||fmtNum(x.amount).includes(q));}
  const groups={};
  for(const x of list){const k=x.type==='transfer'?'__tr':x.categoryId;if(x.type!=='transfer'&&st.account!=='all'&&x.accountId!==st.account)continue;
    const g=(groups[k]=groups[k]||{type:x.type,items:[],sum:0});g.items.push(x);
    g.sum+=x.type!=='transfer'||st.account==='all'?x.amount:(x.toAccountId===st.account?x.amount:-x.amount);}
  const o={income:0,expense:1,transfer:2};
  const keys=Object.keys(groups).sort((a,b)=>{const ga=groups[a],gb=groups[b];return o[ga.type]-o[gb.type]||(st.sort==='amount'?Math.abs(gb.sum)-Math.abs(ga.sum):cat(a).name.localeCompare(cat(b).name,'es'));});
  const html=keys.map(k=>{const g=groups[k];const c=k==='__tr'?{name:'Transferencias',icon:'transfer',color:'#7d9a88'}:cat(k);
    const cls=g.type==='income'?'inc':g.type==='expense'?'exp':(st.account==='all'?'trc':g.sum<0?'exp':'inc');
    const items=st.open[k]?g.items.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.updated||0)-(a.updated||0)).map(x=>{
      const n=x.type==='transfer'?acc(x.accountId).name+' → '+acc(x.toAccountId).name+(x.note?' · '+x.note:''):(x.note||(st.account==='all'?acc(x.accountId).name:''));
      return `<button class="tx" data-act="edit" data-id="${x.id}"><span class="dot" style="background:${c.color}"></span><span class="a">${moneyH(x.amount)}</span><span class="n">${esc(n)}</span><span class="d">${fmtDM(x.date)}</span></button>`;}).join(''):'';
    return `<div class="group"><button class="grow" data-act="toggle" data-k="${k}">${U(st.open[k]?'chevU':'chevD','chev',1.6)}<span class="gi" style="color:${c.color}">${I(c.icon,'',1.1)}</span><span class="nm" style="color:${shade(c.color,.7)}">${esc(c.name)}</span><span class="badge">${g.items.length}</span><span class="amt ${cls}">${moneyH(g.sum)}</span></button>${items}</div>`;}).join('');
  return header()+dateLine()+`<div class="saldorow"><button class="lb" data-act="main" aria-label="Gráfico">${U('lines','',1.4)}</button>${saldoBtn('main')}<button class="lb" data-act="sort" aria-label="Ordenar (${st.sort==='amount'?'por importe':'por nombre'})" title="Ordenar">${U('sort','',1.2)}</button></div>
   ${st.searching?`<div class="searchbar"><input id="q" type="search" placeholder="Buscar nota, categoría o importe" value="${esc(st.q)}"></div>`:''}
   <div class="list page">${html||'<div class="empty">No hay transacciones en este periodo</div>'}</div>`+bigButtons();
}
function viewSettings(){const s=D().settings;
  return subHeader('Ajustes')+`<div class="page">
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
function viewCategories(){const t=st.catTab;
  return subHeader('Categorías')+`<div class="tabs"><button class="${t==='expense'?'on':''}" data-act="catTab" data-t="expense">Gastos</button><button class="${t==='income'?'on':''}" data-act="catTab" data-t="income">Ingresos</button></div>
  <div class="page list">${D().categories.filter(c=>c.type===t).map(c=>`<button class="grow" data-act="editCat" data-id="${c.id}"><span class="gi" style="color:${c.color}">${I(c.icon,'',1.1)}</span><span class="nm" style="color:${shade(c.color,.7)}">${esc(c.name)}</span><span class="amt trc">${U('pencil','',1.3).replace('<svg','<svg style="width:20px;height:20px"')}</span></button>`).join('')}
  ${t==='expense'?'<div class="empty" style="padding:16px">Toca una categoría para cambiarle el nombre, icono o color.</div>':''}</div>
  ${t==='income'?`<button class="fab" data-act="editCat" aria-label="Nueva categoría">${svgIcon(UI.plus,'',3)}</button>`:''}`;}
function leftDrawer(){
  const a=st.account==='all'?{name:'Todas las cuentas',icon:'banknotes'}:acc(st.account);
  const opts=[['day','Día'],['week','Semana'],['month','Mes'],['year','Año'],['all','Todo'],['range','Intervalo']];
  const items=[{id:'all',name:'Todas las cuentas',icon:'banknotes'},...D().accounts];
  return `<div class="dim" data-act="closeDrawers"><div class="panel left" id="leftDrawer">
   <div class="ddwrap"><button class="acccard" id="accCard" data-act="accDrop">${I(a.icon,'',1.1)}<span class="t">${esc(a.name)}<small>EUR</small></span></button>
   ${st.accDrop?`<div class="dd" id="accDrop">${items.map(x=>`<button data-act="pickAcc" data-id="${x.id}" class="${st.account===x.id?'sel':''}">${I(x.icon,'',1.1)}<span class="t">${esc(x.name)}<small>EUR</small></span></button>`).join('')}</div>`:''}</div>
   ${opts.map(([k,l])=>`<button class="obtn ${st.ptype===k?'on':''}" data-act="period" data-p="${k}">${l}</button>`).join('')}
   ${st.ptype==='range'?`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:13px"><input type="date" id="rfrom" value="${st.from}" aria-label="Desde"><input type="date" id="rto" value="${st.to}" aria-label="Hasta"></div>`:''}
   <div style="height:18px"></div>
   <label class="obtn" style="display:flex;align-items:center;justify-content:center;position:relative">Elegir fecha<input type="date" id="pickDate" value="${iso(st.anchor)}" style="position:absolute;inset:0;opacity:0;width:100%"></label>
  </div></div>`;
}
function rightDrawer(){
  return `<div class="dim r" data-act="closeDrawers"><div class="panel right" id="rightDrawer">
   <div class="hd">${I('wallet','',1.4)}Cuentas</div>
   <div class="add"><span>Añadir</span><button data-act="transfer" aria-label="Nueva transferencia">${U('transfer','',1.3)}</button><button data-act="newAcc" aria-label="Nueva cuenta">${U('plus','',1.3)}</button></div>
   ${D().accounts.map(a=>`<button class="arow ${st.account===a.id?'sel':''}" data-act="editAcc" data-id="${a.id}">${I(a.icon,'',1.1)}<span class="t">${esc(a.name)}<span class="ab">${moneyH(accountBalance(a.id))}</span></span></button>`).join('')}
   <div class="sep"></div>
   <button class="arow" data-act="go" data-r="/categorias">${U('tags','',1.2)}<span class="t">Categorías</span></button>
   <button class="arow" data-act="go" data-r="/ajustes">${U('gear','',1.2)}<span class="t">Ajustes</span></button>
  </div></div>`;
}

// ---------- entrada (calculadora) ----------
let ed=null;
function evalExpr(e){
  const t=e.replace(/,/g,'.').match(/(\d+\.?\d*|\.\d+|[-+×÷])/g);if(!t)return 0;
  const vals=[],ops=[];let expectNum=true;
  for(const k of t){if(/[-+×÷]/.test(k)){if(expectNum)continue;ops.push(k);expectNum=true;}else{vals.push(parseFloat(k));expectNum=false;}}
  if(ops.length>=vals.length)ops.pop();
  const v=[vals[0]],o=[];for(let i=0;i<ops.length;i++){const b=vals[i+1];if(ops[i]==='×')v[v.length-1]*=b;else if(ops[i]==='÷')v[v.length-1]=b?v[v.length-1]/b:0;else{o.push(ops[i]);v.push(b);}}
  let r=v[0];o.forEach((op,i)=>r=op==='+'?r+v[i+1]:r-v[i+1]);return Math.round((r||0)*100);
}
const exprFromCents=c=>{if(!c)return '';const s=(c/100).toFixed(2).replace(/\.?0+$/,'');return s.replace('.',',');};
function openEntry(type,tx,presetCat){
  const defAcc=st.account!=='all'?st.account:(D().accounts[0]||{}).id;
  tx=tx?{...tx}:{type,amount:0,date:today(),accountId:defAcc,note:'',categoryId:presetCat||null,...(type==='transfer'?{toAccountId:(D().accounts.find(a=>a.id!==defAcc)||{}).id}:{})};
  ed={tx,expr:exprFromCents(tx.amount),editing:!!tx.id,picking:false};
  history.pushState({entry:1},'');renderEntry();
}
function closeEntry(){if(!ed)return;ed=null;renderEntry();if(history.state&&history.state.entry)history.back();}
function renderEntry(){
  let o=$('#entry');if(!o){o=document.createElement('div');o.id='entry';document.body.appendChild(o);}
  if(!ed){o.remove();return;}
  const x=ed.tx,t=x.type;
  const title=t==='transfer'?(ed.editing?'Editar transferencia':'Transferencia'):(ed.editing?'Editar ':'Nuevo ')+(t==='expense'?'gasto':'ingreso');
  const accOpts=sel=>D().accounts.map(a=>`<option value="${a.id}" ${sel===a.id?'selected':''}>${esc(a.name)}</option>`).join('');
  o.className='overlay '+t;
  if(ed.picking){
    o.innerHTML=`<div class="top"><button class="ib" data-eact="unpick" aria-label="Volver">${U('back','',1.8)}</button><h1>Elegir categoría</h1></div>
    <div class="catgrid">${D().categories.filter(c=>c.type===t).map(c=>`<button data-eact="pick" data-cat="${c.id}" class="${x.categoryId===c.id?'sel':''}" style="color:${c.color}">${I(c.icon,'',1.1)}<span style="color:${shade(c.color,.7)}">${esc(c.name)}</span></button>`).join('')}</div>`;
    return;
  }
  const disp=ed.expr?esc(ed.expr.replace(/×/g,'*').replace(/÷/g,'/')):'0';
  const c=x.categoryId?cat(x.categoryId):null;
  const keys=['1','2','3','+','4','5','6','-','7','8','9','*',',','0','=','/'];
  o.innerHTML=`<div class="top etop"><button class="ib" data-eact="close" id="eClose" aria-label="Cerrar sin guardar">${U('back','',1.8)}</button><button class="okb" data-eact="ok" id="eOk">OK</button><h1>${title}</h1>
   ${ed.editing?`<button class="ib" data-eact="del" aria-label="Eliminar">${U('trash','',1.4)}</button>`:'<span class="ib"></span>'}
   ${t!=='transfer'?`<button class="ib" data-eact="swap" aria-label="Cambiar a ${t==='expense'?'ingreso':'gasto'}">${U('swap','',1.4)}</button>`:'<span class="ib"></span>'}</div>
   <label class="edate">${U('cal','',1)}<span>${esc(fmtLong(x.date))}</span><input type="date" id="eDate" value="${x.date}" aria-label="Fecha"></label>
   <div class="abar"><label class="aacc" title="Cuenta">${I(acc(x.accountId).icon,'',1.3)}<small>EUR</small><select id="eAcc" aria-label="Cuenta">${accOpts(x.accountId)}</select></label>
     <div class="anum" id="amt" data-cents="${evalExpr(ed.expr)}">${disp}</div><button class="bk" data-key="⌫" aria-label="Borrar">${U('bksp','',1)}</button></div>
   ${t==='transfer'?`<label class="eto">${U('transfer','',1.3)}<span>Hacia</span><select id="eTo" aria-label="Cuenta destino">${accOpts(x.toAccountId)}</select></label>`:''}
   <label class="enote">${U('pen','',1.2)}<input id="eNote" placeholder="Nota" value="${esc(x.note)}"></label>
   ${ed.editing&&c?`<div class="ecat">Categoría: <b style="color:${shade(c.color,.7)}">${esc(c.name)}</b></div>`:''}
   <div class="kp">${keys.map(k=>`<button data-key="${k}">${k}</button>`).join('')}
   ${t==='transfer'?`<button class="kfull" data-eact="ok" id="eSave">TRANSFERIR</button>`
     :!ed.editing&&c?`<button class="kfull" data-eact="ok" id="eSave">GUARDAR EN ${esc(c.name.toUpperCase())}</button>`
     :`<button class="kfull" data-eact="choose" id="eChoose">ELEGIR CATEGORÍA</button>`}</div>`;
}
function readEntryFields(){const x=ed.tx;const g=id=>document.getElementById(id);
  if(g('eAcc'))x.accountId=g('eAcc').value;if(g('eDate')&&g('eDate').value)x.date=g('eDate').value;if(g('eNote'))x.note=g('eNote').value;if(g('eTo'))x.toAccountId=g('eTo').value;}
function saveEntry(){readEntryFields();const x=ed.tx;x.amount=evalExpr(ed.expr);
  if(x.amount<=0){toast('Introduce un importe');return;}
  if(x.type==='transfer'&&x.accountId===x.toAccountId){toast('Elige dos cuentas distintas');return;}
  if(x.type!=='transfer'&&!x.categoryId){ed.picking=true;renderEntry();return;}
  if(x.type!=='transfer')delete x.toAccountId;
  Store.upsert('transactions',x);closeEntry();render();toast('Guardado');}
function onKey(k){let e=ed.expr;const op={'+':'+','-':'-','*':'×','/':'÷'}[k];
  if(k==='⌫')e=e.slice(0,-1);
  else if(k==='='){const c=evalExpr(e);e=c>0?exprFromCents(c):'';}
  else if(op){if(!e)return;e=/[-+×÷]$/.test(e)?e.slice(0,-1)+op:e+op;}
  else if(k===','||k==='.'){const last=e.split(/[-+×÷]/).pop();if(last.includes(','))return;e+=last?',':'0,';}
  else{const last=e.split(/[-+×÷]/).pop();if(/,\d\d$/.test(last))return;if(e.length>18)return;if(last==='0')e=e.slice(0,-1);e+=k;}
  ed.expr=e;readEntryFields();renderEntry();}
document.addEventListener('click',ev=>{
  if(!ed)return;const k=ev.target.closest('[data-key]');if(k&&k.closest('#entry')){onKey(k.dataset.key);return;}
  const b=ev.target.closest('[data-eact]');if(!b)return;const a=b.dataset.eact;
  if(a==='close')closeEntry();
  else if(a==='ok'){if(ed.editing||ed.tx.categoryId||ed.tx.type==='transfer')saveEntry();else{readEntryFields();if(evalExpr(ed.expr)<=0){toast('Introduce un importe');return;}ed.picking=true;renderEntry();}}
  else if(a==='choose'){readEntryFields();ed.picking=true;renderEntry();}
  else if(a==='unpick'){ed.picking=false;renderEntry();}
  else if(a==='swap'){readEntryFields();ed.tx.type=ed.tx.type==='expense'?'income':'expense';ed.tx.categoryId=null;renderEntry();}
  else if(a==='pick'){ed.tx.categoryId=b.dataset.cat;ed.picking=false;saveEntry();}
  else if(a==='del'){const id=ed.tx.id;ask({title:'Eliminar transacción',msg:'¿Eliminar esta transacción? Esta acción no se puede deshacer.'}).then(d=>{if(!d)return;Store.remove('transactions',id);closeEntry();render();toast('Eliminada');});}
});
window.addEventListener('popstate',()=>{const d=$('#dlg');
  if(d){d._close(null);if(ed)history.pushState({entry:1},'');else if($('#form'))history.pushState({form:1},'');return;}
  if(ed){ed=null;renderEntry();}const f=$('#form');if(f)f.remove();});
function closeForm(){const f=$('#form');if(!f)return;f.remove();if(history.state&&history.state.form)history.back();}

// ---------- diálogo de confirmación ----------
function ask({title,msg,ok='Eliminar',body='',cancel='Cancelar',okOnly=false}){return new Promise(res=>{
  const old=$('#dlg');if(old)old._close(null);
  const o=document.createElement('div');o.id='dlg';o.className='dlgback';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
  o.innerHTML=`<div class="dlg"><h2>${esc(title)}</h2><p>${esc(msg)}</p>${body}<div class="dlgbtns">${okOnly?'':`<button class="btn flat" id="dlgCancel">${esc(cancel)}</button>`}<button class="btn ${okOnly?'':'danger'}" id="dlgOk">${esc(ok)}</button></div></div>`;
  o._close=v=>{o.remove();res(v);};
  o.addEventListener('click',e=>{if(e.target===o||e.target.id==='dlgCancel')o._close(null);else if(e.target.id==='dlgOk')o._close(okOnly?null:o);});
  document.body.appendChild(o);$('#dlgOk').focus();});}
function delAccount(id,name,form){
  const D_=D(),used=D_.transactions.filter(t=>t.accountId===id||t.toAccountId===id),others=D_.accounts.filter(a=>a.id!==id);
  if(!used.length){if(!others.length){ask({title:'No se puede eliminar',msg:'Debe existir al menos una cuenta.',ok:'Entendido',okOnly:true});return;}
    ask({title:'Eliminar cuenta',msg:'¿Eliminar la cuenta «'+name+'»?'}).then(d=>{if(!d)return;Store.remove('accounts',id);if(st.account===id)st.account='all';closeForm();render();toast('Cuenta eliminada');});return;}
  if(!others.length){ask({title:'No se puede eliminar',msg:'La cuenta «'+name+'» tiene '+used.length+' transacciones y no hay otra cuenta a la que moverlas. Crea otra cuenta primero.',ok:'Entendido',okOnly:true});return;}
  ask({title:'Eliminar cuenta',ok:'Mover y eliminar',msg:'La cuenta «'+name+'» tiene '+used.length+' transacciones. Se moverán a la cuenta que elijas y después se eliminará la cuenta. Las transferencias entre ambas cuentas se eliminarán.',
    body:`<label class="dlgsel">Mover a<select id="dlgTo">${others.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>`}).then(d=>{if(!d)return;
    const to=d.querySelector('#dlgTo').value,n=Store.moveAccount(id,to);Store.remove('accounts',id);if(st.account===id)st.account=to;closeForm();render();toast(n+' transacciones movidas · cuenta eliminada');});
}

// ---------- formularios: categoría y cuenta ----------
function openForm(kind,id){
  const isAcc=kind==='acc';const coll=isAcc?'accounts':'categories';
  const obj=id?{...D()[coll].find(x=>x.id===id)}:(isAcc?{name:'',icon:'moneybag',initial:0}:{name:'',icon:'moneybag',color:'#4caf7a',type:'income'});
  const canDel=id&&(isAcc||obj.type==='income');
  const keys=isAcc?ACC_ICONS:Object.keys(ICONS).filter(k=>k!=='transfer');
  const o=document.createElement('div');o.id='form';o.className='overlay';
  const draw=()=>{o.innerHTML=`<div class="top"><button class="ib" data-f="close" aria-label="Cerrar">${U('close','',1.6)}</button><h1>${id?'Editar':'Nueva'} ${isAcc?'cuenta':'categoría'}</h1></div><div class="form">
   <label>Nombre<input id="fName" value="${esc(obj.name)}" maxlength="30"></label>
   <label>Icono</label><div class="icongrid">${keys.map(k=>`<button data-f="icon" data-k="${k}" class="${obj.icon===k?'sel':''}" style="color:${isAcc?'#3cbf8f':obj.color}" aria-label="${k}">${I(k,'',1.2)}</button>`).join('')}</div>
   ${isAcc?`<label>Saldo inicial<input id="fInit" inputmode="decimal" value="${fmtNum(obj.initial||0).replace(/\./g,'')}"></label>`:`<label>Color<input type="color" id="fColor" value="${obj.color}"></label>`}
   <button class="btn" data-f="save" id="fSave">Guardar</button>${canDel?`<button class="btn danger" data-f="del" id="fDel">Eliminar</button>`:''}</div>`;};
  draw();const prev=$('#form');if(prev)prev.remove();document.body.appendChild(o);history.pushState({form:1},'');
  o.addEventListener('input',e=>{if(e.target.id==='fName')obj.name=e.target.value;if(e.target.id==='fColor')obj.color=e.target.value;if(e.target.id==='fInit')obj._init=e.target.value;});
  o.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;const f=b.dataset.f;
    if(f==='close')closeForm();
    if(f==='icon'){obj.icon=b.dataset.k;const iv=$('#fInit')&&$('#fInit').value;draw();if(iv!==false&&$('#fInit'))$('#fInit').value=iv;}
    if(f==='save'){obj.name=$('#fName').value.trim();if(!obj.name){toast('Pon un nombre');return;}
      if(isAcc){obj.initial=Math.round(parseFloat($('#fInit').value.replace(/\./g,'').replace(',','.')||'0')*100)||0;delete obj._init;}else obj.color=$('#fColor').value;
      Store.upsert(coll,obj);closeForm();render();toast('Guardado');}
    if(f==='del'){
      if(isAcc){delAccount(id,obj.name,o);return;}
      const used=D().transactions.some(t=>t.categoryId===id);
      ask({title:'Eliminar categoría',msg:'¿Eliminar la categoría «'+obj.name+'»?'+(used?' Hay transacciones con esta categoría; quedarán como "Sin categoría".':'')}).then(d=>{if(!d)return;
      Store.remove(coll,id);closeForm();render();toast('Categoría eliminada');});}
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
const stamp=()=>today();

// ---------- eventos generales ----------
document.addEventListener('click',ev=>{
  if(ed||$('#form'))return;
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='closeDrawers'){if(ev.target.closest('.panel'))return;st.left=st.right=st.accDrop=false;render();return;}
  switch(a){
    case 'left':st.left=!st.left;st.right=false;st.accDrop=false;render();break;
    case 'right':st.right=!st.right;st.left=false;render();break;
    case 'accDrop':st.accDrop=!st.accDrop;render();break;
    case 'pickAcc':st.account=b.dataset.id;st.accDrop=false;render();break;
    case 'period':st.ptype=b.dataset.p;st.anchor=new Date();if(st.ptype==='range'){st.from=iso(new Date(st.anchor.getFullYear(),st.anchor.getMonth(),1));st.to=today();render();}else{st.left=false;render();}break;
    case 'back':location.hash='#/';break;
    case 'go':st.right=false;location.hash='#'+b.dataset.r;break;
    case 'prev':shift(-1);break;case 'next':shift(1);break;
    case 'add':openEntry(b.dataset.type);break;
    case 'quick':openEntry('expense',null,b.dataset.cat);break;
    case 'transfer':st.right=false;if(D().accounts.length<2){render();toast('Necesitas al menos dos cuentas');break;}render();openEntry('transfer');break;
    case 'newAcc':st.right=false;render();openForm('acc');break;
    case 'editAcc':st.right=false;render();openForm('acc',b.dataset.id);break;
    case 'list':st.searching=false;location.hash='#/lista';break;
    case 'main':location.hash='#/';break;
    case 'search':st.searching=!st.searching||route()!=='/lista';st.q='';st.focusQ=true;if(route()!=='/lista')location.hash='#/lista';else render();break;
    case 'sort':st.sort=st.sort==='amount'?'name':'amount';render();toast(st.sort==='amount'?'Ordenado por importe':'Ordenado por nombre');break;
    case 'toggle':st.open[b.dataset.k]=!st.open[b.dataset.k];render();break;
    case 'edit':openEntry(null,D().transactions.find(x=>x.id===b.dataset.id));break;
    case 'editCat':openForm('cat',b.dataset.id);break;
    case 'catTab':st.catTab=b.dataset.t;render();break;
    case 'exportJson':download('slot-ai-copia-'+stamp()+'.json',Store.exportData(),'application/json');break;
    case 'exportCsv':download('slot-ai-'+stamp()+'.csv',csv(),'text/csv;charset=utf-8');break;
    case 'importJson':$('#fileImport').click();break;
    case 'reset':ask({title:'Borrar todos los datos',msg:'¿Borrar TODOS los datos? Esta acción no se puede deshacer.',ok:'Borrar'}).then(d=>{if(!d)return;Store.reset();st.account='all';render();toast('Datos borrados');});break;
  }
});
document.addEventListener('input',ev=>{if(ev.target.id==='q'){st.q=ev.target.value;st.focusQ=true;render();}});
document.addEventListener('change',ev=>{const t=ev.target;
  if(ed&&t.closest('#entry')){readEntryFields();if(t.id!=='eNote')renderEntry();return;}
  if(t.id==='rfrom'||t.id==='rto'){st[t.id==='rfrom'?'from':'to']=t.value;if(st.from>st.to)[st.from,st.to]=[st.to,st.from];render();}
  else if(t.id==='pickDate'&&t.value){st.ptype='day';st.anchor=parseIso(t.value);st.left=false;render();}
  else if(t.id==='setCur'){Store.setSetting('currency',t.value.trim()||'€');render();}
  else if(t.id==='setWeek'){Store.setSetting('weekStart',+t.value);render();}
  else if(t.id==='setDark'){Store.setSetting('dark',t.checked);render();}
  else if(t.id==='fileImport'&&t.files[0]){const r=new FileReader();r.onload=()=>{const txt=r.result;t.value='';ask({title:'Restaurar copia',msg:'Esto sustituirá todos los datos actuales. ¿Continuar?',ok:'Restaurar'}).then(d=>{if(!d)return;try{Store.importData(txt);st.account='all';render();toast('Copia restaurada');}catch(e){toast('Error: '+e.message);}});};r.readAsText(t.files[0]);}
});
function bindSwipe(){const el=$('#chart');if(!el)return;let x0=null,y0=null;
  el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))shift(dx<0?1:-1);});}
let toastT;function toast(msg,actionLabel,fn){const t=$('#toast');t.innerHTML=esc(msg)+(actionLabel?` <button id="toastBtn">${esc(actionLabel)}</button>`:'');t.classList.remove('hidden');
  if(fn)$('#toastBtn').onclick=fn;clearTimeout(toastT);if(!actionLabel)toastT=setTimeout(()=>t.classList.add('hidden'),2200);}
window.addEventListener('hashchange',()=>{st.left=st.right=false;render();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#dlg'))$('#dlg')._close(null);else if(ed)closeEntry();else if($('#form'))closeForm();else if(st.left||st.right){st.left=st.right=false;render();}}});

// ---------- service worker / actualizaciones ----------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const ask=w=>toast('Nueva versión disponible','Actualizar',()=>w.postMessage('skipWaiting'));
    if(reg.waiting&&navigator.serviceWorker.controller)ask(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ask(w);});});
    setInterval(()=>reg.update(),60*60*1000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update();});
  }).catch(e=>console.warn('SW',e));
  const hadController=!!navigator.serviceWorker.controller;let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||!hadController)return;reloaded=true;location.reload();});
}
render();
