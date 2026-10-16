// Capa de datos. Todo pasa por Store; para añadir sync (p. ej. Google Drive) basta con
// implementar otro "backend" con load()/save() y usar exportData()/importData().
// Esquema v3: cuentas (negocios/locales) con saldo inicial, transferencias entre cuentas,
// Esquema v4: las categorías son exactamente las de los datos del usuario (las predeterminadas solo siembran una instalación nueva). Iconos = claves de js/icons.js.
(function(){
const KEY='gastos.v1'; // clave de almacenamiento (se mantiene para conservar los datos existentes)
const SCHEMA=4;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const EXP=[['exp-comida','Comida','cart','#e573a0'],['exp-casa','Casa','house','#5aa5dc'],['exp-transporte','Transporte','bus','#e57373'],['exp-ocio','Ocio','cocktail','#f0a040'],['exp-salud','Salud','thermo','#d9534f'],['exp-otros','Otros','tag','#cfa80a']];
const OTROS='exp-otros';
const INC=[['Salario','briefcase','#43a86a'],['Ahorros','piggy','#26a69a'],['Depósitos','moneybag','#4caf7a']];
const V2COL={'exp-comida':'#81c784','exp-casa':'#a1887f','exp-transporte':'#7986cb','exp-ocio':'#f48fb1','exp-salud':'#4db6ac','exp-otros':'#90a4ae'};
const INCICON={'salario':'briefcase','ahorros':'piggy','depósitos':'moneybag','depositos':'moneybag'};
const defExp=()=>EXP.map(([id,n,i,c])=>({id,type:'expense',name:n,icon:i,color:c}));
function defaults(){
  return {version:SCHEMA,
    settings:{currency:'€',weekStart:1,dark:false},
    accounts:[{id:'cash',name:'Efectivo',icon:'banknotes',initial:0}],
    categories:[...defExp(),...INC.map(([n,i,c])=>({id:uid(),type:'income',name:n,icon:i,color:c}))],
    transactions:[], // {id,type:'expense'|'income'|'transfer',amount(cents),date:'YYYY-MM-DD',accountId,toAccountId?,categoryId?,note,updated}
    updated:Date.now()};
}
const norm=s=>String(s||'').trim().toLowerCase();
const isKey=k=>window.ICONS&&Object.prototype.hasOwnProperty.call(window.ICONS,k);
// Migra cualquier versión anterior al esquema actual (también al importar copias antiguas).
function migrate(d){
  if(!d||!Array.isArray(d.categories)||!Array.isArray(d.transactions))throw new Error('Archivo no válido');
  const v=d.version||1;
  d.settings={...defaults().settings,...(d.settings||{})};
  // Cuentas
  if(!Array.isArray(d.accounts)||!d.accounts.length){
    d.accounts=[{id:'cash',name:'Efectivo',icon:'banknotes',initial:d.settings.initialBalance||0}];
  }
  delete d.settings.initialBalance;
  const accIds=d.accounts.map(a=>a.id);
  d.accounts.forEach(a=>{if(!isKey(a.icon))a.icon=/tarjeta|card/i.test(a.name)?'card':'banknotes';a.initial=Number.isSafeInteger(a.initial)?a.initial:Math.round(+a.initial||0);});
  d.transactions=d.transactions.filter(t=>['expense','income','transfer'].includes(t.type)).map(t=>{
    if(!accIds.includes(t.accountId))t.accountId=accIds[0];
    if(t.type==='transfer'&&(!accIds.includes(t.toAccountId)||t.toAccountId===t.accountId))return null;
    if(t.type!=='transfer')delete t.toAccountId;
    return t;}).filter(Boolean);
  // Categorías: se conservan tal cual (sin añadir ni fusionar predeterminadas); solo se corrigen iconos/colores antiguos.
  const DEF=Object.fromEntries(EXP.map(([id,n,i,c])=>[id,{n,i,c}]));
  d.categories=d.categories.filter(c=>c&&c.id&&(c.type==='expense'||c.type==='income')).map(c=>{
    const df=c.type==='expense'&&DEF[c.id];
    const icon=isKey(c.icon)?c.icon:c.type==='income'?(INCICON[norm(c.name)]||'moneybag'):(df?df.i:'tag');
    const color=df&&(!c.color||c.color===V2COL[c.id]||v<2)?df.c:(c.color||'#9e9e9e');
    return {...c,name:c.name||(df?df.n:'Categoría'),icon,color:/^#[0-9a-f]{6}$/i.test(color)?color:'#9e9e9e'};});
  // v3→v4: hasta v1.4.5 se forzaban las 6 categorías de gasto predeterminadas. Si los datos mezclan categorías
  // propias (importadas) con predeterminadas sin tocar, se quitan las predeterminadas que no tienen movimientos.
  if(v<4){const used=new Set(d.transactions.map(t=>t.categoryId));
    const untouched=c=>c.type==='expense'&&DEF[c.id]&&norm(c.name)===norm(DEF[c.id].n);
    const exp=d.categories.filter(c=>c.type==='expense');
    if(d.transactions.length&&(d.imported||exp.some(c=>!DEF[c.id])))d.categories=d.categories.filter(c=>!untouched(c)||used.has(c.id));}
  d.version=SCHEMA;
  return d;
}
// Validación estricta de una copia antes de restaurarla: nunca se aceptan datos que cambien importes o saldos en silencio.
const okDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;};
const okCents=(n,pos)=>Number.isSafeInteger(n)&&(pos?n>0:true);
function validate(d){const bad=m=>{throw new Error('Copia no válida: '+m);};
  if(!d||typeof d!=='object'||Array.isArray(d))bad('no es una copia de Slot-AI');
  if(!Array.isArray(d.categories)||!Array.isArray(d.transactions))bad('faltan categorías o movimientos');
  if(d.version!=null&&!(Number.isInteger(d.version)&&d.version>=1&&d.version<=SCHEMA))bad('versión '+d.version+' desconocida (actualiza la app)');
  const ids=new Set(),accs=new Set(),cats=new Set();
  if(d.accounts!=null){if(!Array.isArray(d.accounts))bad('cuentas');for(const a of d.accounts){if(!a||typeof a.id!=='string'||!a.id||accs.has(a.id))bad('cuenta sin id o repetida');if(typeof a.name!=='string')bad('cuenta sin nombre');if(a.initial!=null&&!okCents(a.initial))bad('saldo inicial no válido en «'+a.name+'»');accs.add(a.id);}}
  for(const c of d.categories){if(!c||typeof c.id!=='string'||!c.id||cats.has(c.id))bad('categoría sin id o repetida');if(c.type!=='expense'&&c.type!=='income')bad('tipo de categoría');cats.add(c.id);}
  d.transactions.forEach((t,i)=>{const w=' (movimiento '+(i+1)+')';
    if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id))bad('id ausente o repetido'+w);ids.add(t.id);
    if(!['expense','income','transfer'].includes(t.type))bad('tipo «'+(t&&t.type)+'»'+w);
    if(!okCents(t.amount,true))bad('importe no válido «'+t.amount+'»'+w);
    if(!okDate(t.date))bad('fecha no válida «'+t.date+'»'+w);
    if(accs.size&&!accs.has(t.accountId))bad('cuenta inexistente'+w);
    if(t.type==='transfer'&&(!accs.has(t.toAccountId)||t.toAccountId===t.accountId))bad('transferencia con cuentas no válidas'+w);
    if(t.note!=null&&typeof t.note!=='string')bad('nota'+w);});
  return d;}
const LocalBackend={load(){const s=localStorage.getItem(KEY);return s==null?null:JSON.parse(s)},save(d){localStorage.setItem(KEY,JSON.stringify(d))}};
let backend=LocalBackend, data;
// Si los datos guardados no se pueden leer NO se sobrescriben: se guarda una copia intacta en KEY.corrupt-<fecha>.
try{const raw=backend.load();data=raw?migrate(raw):defaults();if(raw)backend.save(data);}
catch(e){console.warn('Datos no válidos',e);try{const s=localStorage.getItem(KEY);if(s)localStorage.setItem(KEY+'.corrupt-'+Date.now(),s);}catch(_){}data=defaults();}
function save(){data.updated=Date.now();try{backend.save(data);}catch(e){throw new Error('No se pudo guardar (almacenamiento lleno o bloqueado). Exporta una copia.');}}
// Ejecuta un cambio de forma atómica: si no se puede guardar, se deshace en memoria.
function atomic(fn){const snap=JSON.stringify(data);try{const r=fn();save();return r;}catch(e){data=JSON.parse(snap);throw e;}}
const PREV=KEY+'.prev';
function snapshot(){try{localStorage.setItem(PREV,JSON.stringify(data));}catch(e){}}
window.Store={uid,migrate,get data(){return data},save,
  upsert(coll,obj){return atomic(()=>{const a=data[coll];obj.updated=Date.now();if(!obj.id)obj.id=uid();const i=a.findIndex(x=>x.id===obj.id);i>=0?a[i]=obj:a.push(obj);return obj;});},
  remove(coll,id){atomic(()=>{data[coll]=data[coll].filter(x=>x.id!==id);});},
  // Mueve los movimientos (y el saldo inicial) de una cuenta a otra; las transferencias entre ambas desaparecen (no cambian el total).
  moveAccount(from,to){return atomic(()=>{let n=0;for(const t of data.transactions){let ch=false;if(t.accountId===from){t.accountId=to;ch=true;}if(t.toAccountId===from){t.toAccountId=to;ch=true;}if(ch){n++;t.updated=Date.now();}}
    data.transactions=data.transactions.filter(t=>!(t.type==='transfer'&&t.accountId===t.toAccountId));
    const a=data.accounts.find(x=>x.id===from),b=data.accounts.find(x=>x.id===to);if(a&&b){b.initial=(b.initial||0)+(a.initial||0);b.updated=Date.now();}
    data.accounts=data.accounts.filter(x=>x.id!==from);return n;});},
  // Elimina una categoría moviendo sus movimientos a otra (to) o dejándolos «Sin categoría» (to=null).
  removeCategory(id,to){return atomic(()=>{let n=0;for(const t of data.transactions)if(t.categoryId===id){n++;t.updated=Date.now();if(to)t.categoryId=to;else delete t.categoryId;}data.categories=data.categories.filter(c=>c.id!==id);return n;});},
  setSetting(k,v){atomic(()=>{data.settings[k]=v;});},
  exportData(){return JSON.stringify({app:'slot-ai',...data},null,1);},
  importData(json){let d;try{d=JSON.parse(json);}catch(e){throw new Error('El archivo no es una copia de Slot-AI (JSON no válido).');}
    if(d&&d.app&&d.app!=='slot-ai'&&d.app!=='gastos-pwa')throw new Error('El archivo no es una copia de Slot-AI.');
    validate(d);delete d.app;const m=migrate(d);snapshot();const old=data;data=m;try{save();}catch(e){data=old;throw e;}},
  reset(){snapshot();const old=data;data=defaults();try{save();}catch(e){data=old;throw e;}},
  hasPrev(){try{return !!localStorage.getItem(PREV)}catch(e){return false}},
  undo(){const s=localStorage.getItem(PREV);if(!s)return false;const old=data;data=migrate(JSON.parse(s));try{save();}catch(e){data=old;throw e;}localStorage.removeItem(PREV);return true;},
  reload(){try{const raw=backend.load();if(raw)data=migrate(raw);}catch(e){}},
  validate,okDate,
  setBackend(b){backend=b;}};
})();
