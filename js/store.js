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
  d.accounts=Array.isArray(d.accounts)?d.accounts.filter(a=>a&&typeof a==='object'&&typeof a.id==='string'&&a.id):d.accounts;
  d.transactions=d.transactions.filter(t=>t&&typeof t==='object');
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
  // Movimientos con categoría inexistente: quedan «Sin categoría» (sin referencia colgante).
  const catIds=new Set(d.categories.map(c=>c.id));d.transactions.forEach(t=>{if(t.type==='transfer'||(t.categoryId!=null&&!catIds.has(t.categoryId)))delete t.categoryId;});
  d.version=SCHEMA;
  return d;
}
// Validación estricta de una copia antes de restaurarla: nunca se aceptan datos que cambien importes o saldos en silencio.
const okDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;};
const okId=s=>typeof s==='string'&&/^[A-Za-z0-9_.:-]{1,64}$/.test(s);
const okCents=(n,pos)=>Number.isSafeInteger(n)&&(pos?n>0:true);
function validate(d){const bad=m=>{throw new Error('Copia no válida: '+m);};
  if(!d||typeof d!=='object'||Array.isArray(d))bad('no es una copia de Slot-AI');
  if(!Array.isArray(d.categories)||!Array.isArray(d.transactions))bad('faltan categorías o movimientos');
  if(d.version!=null&&!(Number.isInteger(d.version)&&d.version>=1&&d.version<=SCHEMA))bad('versión '+d.version+' desconocida (actualiza la app)');
  const ids=new Set(),accs=new Set(),cats=new Set(),catType={};
  if(d.accounts!=null){if(!Array.isArray(d.accounts))bad('cuentas');for(const a of d.accounts){if(!a||!okId(a.id)||accs.has(a.id))bad('cuenta con id no válido o repetido');if(typeof a.name!=='string')bad('cuenta sin nombre');if(a.initial!=null&&!okCents(a.initial))bad('saldo inicial no válido en «'+a.name+'»');accs.add(a.id);}}
  for(const c of d.categories){if(!c||!okId(c.id)||cats.has(c.id))bad('categoría con id no válido o repetido');if(c.type!=='expense'&&c.type!=='income')bad('tipo de categoría');if(typeof c.name!=='string')bad('categoría sin nombre');cats.add(c.id);catType[c.id]=c.type;}
  if(d.settings!=null){const s=d.settings;if(typeof s!=='object'||Array.isArray(s))bad('ajustes');
    if(s.weekStart!=null&&s.weekStart!==0&&s.weekStart!==1)bad('primer día de la semana');
    if(s.currency!=null&&!(typeof s.currency==='string'&&s.currency.trim()&&s.currency.length<=4))bad('símbolo de moneda');
    if(s.dark!=null&&typeof s.dark!=='boolean')bad('tema oscuro');}
  d.transactions.forEach((t,i)=>{const w=' (movimiento '+(i+1)+')';
    if(!t||!okId(t.id)||ids.has(t.id))bad('id no válido o repetido'+w);ids.add(t.id);
    if(!['expense','income','transfer'].includes(t.type))bad('tipo «'+(t&&t.type)+'»'+w);
    if(!okCents(t.amount,true))bad('importe no válido «'+t.amount+'»'+w);
    if(!okDate(t.date))bad('fecha no válida «'+t.date+'»'+w);
    if(accs.size&&!accs.has(t.accountId))bad('cuenta inexistente'+w);
    if(t.type==='transfer'&&(!accs.has(t.toAccountId)||t.toAccountId===t.accountId))bad('transferencia con cuentas no válidas'+w);
    if(t.categoryId!=null&&!okId(t.categoryId))bad('categoría no válida'+w);
    if(t.categoryId!=null&&catType[t.categoryId]&&catType[t.categoryId]!==t.type)bad('categoría de otro tipo'+w);
    if(t.note!=null&&typeof t.note!=='string')bad('nota'+w);});
  return d;}
// Reparación al cargar: los datos guardados que no pasarían validate() (p. ej. fechas imposibles importadas antes de 1.6.0)
// se corrigen de forma conservadora; lo irreparable (importe no válido, fecha ilegible) se retira y se lista. El original se guarda aparte.
const pad2=n=>String(n).padStart(2,'0');
function repair(d){const fixes=[],removed=[];const s=d.settings;
  if(s.weekStart!==0&&s.weekStart!==1){s.weekStart=+s.weekStart===0?0:1;fixes.push('Primer día de la semana no válido');}
  if(!(typeof s.currency==='string'&&s.currency.trim()&&s.currency.length<=4)){s.currency=typeof s.currency==='string'&&s.currency.trim()?s.currency.trim().slice(0,4):'€';fixes.push('Símbolo de moneda no válido');}
  if(typeof s.dark!=='boolean'){s.dark=!!s.dark;fixes.push('Tema oscuro no válido');}
  const fixIds=(arr,what)=>{const map={},seen=new Set();for(const x of arr){if(typeof x.name!=='string'){x.name=String(x.name??what);fixes.push('Nombre de '+what+' no válido');}
    if(!okId(x.id)||seen.has(x.id)){const n=uid();if(!seen.has(x.id))map[x.id]=n;x.id=n;fixes.push('Identificador de '+what+' no válido («'+x.name+'»)');}seen.add(x.id);}return map;};
  const am=fixIds(d.accounts,'cuenta'),cm=fixIds(d.categories,'categoría');
  for(const a of d.accounts)if(!okCents(a.initial)){fixes.push('Saldo inicial no válido en «'+a.name+'» (se pone a 0)');a.initial=0;}
  const own=Object.prototype.hasOwnProperty,seen=new Set(),keep=[];
  for(const t of d.transactions){
    if(own.call(am,t.accountId))t.accountId=am[t.accountId];if(t.toAccountId!=null&&own.call(am,t.toAccountId))t.toAccountId=am[t.toAccountId];if(t.categoryId!=null&&own.call(cm,t.categoryId))t.categoryId=cm[t.categoryId];
    if(typeof t.amount==='string'&&/^\d+$/.test(t.amount.trim()))t.amount=+t.amount;
    if(typeof t.amount==='number'&&Number.isFinite(t.amount)&&!Number.isInteger(t.amount)){t.amount=Math.round(t.amount);fixes.push('Importe con fracciones de céntimo (redondeado)');}
    if(!okCents(t.amount,true)){removed.push({t,why:'importe no válido'});continue;}
    if(!okDate(t.date)){const m=typeof t.date==='string'&&t.date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if(m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=31){const last=new Date(Date.UTC(+m[1],+m[2],0)).getUTCDate();const nd=m[1]+'-'+pad2(m[2])+'-'+pad2(Math.min(+m[3],last));fixes.push('Fecha imposible «'+t.date+'» → «'+nd+'»');t.date=nd;}
      else{removed.push({t,why:'fecha no válida'});continue;}}
    if(!okId(t.id)||seen.has(t.id)){t.id=uid();fixes.push('Identificador de movimiento no válido o repetido');}
    if(t.note!=null&&typeof t.note!=='string'){t.note=String(t.note);fixes.push('Nota no válida');}
    if(t.categoryId!=null){const c=d.categories.find(c=>c.id===t.categoryId);if(!okId(t.categoryId)||!c||c.type!==t.type){delete t.categoryId;fixes.push('Movimiento con categoría de otro tipo (queda «Sin categoría»)');}}
    seen.add(t.id);keep.push(t);}
  d.transactions=keep;return{fixes,removed};}
const LocalBackend={load(){const s=localStorage.getItem(KEY);return s==null?null:JSON.parse(s)},save(d){localStorage.setItem(KEY,JSON.stringify(d))}};
let backend=LocalBackend, data;
// Si los datos guardados no se pueden leer NO se sobrescriben nunca: se guarda además una copia en KEY.corrupt-<fecha>
// y se bloquea el guardado hasta que el usuario descargue/restaure o decida empezar de cero (ver app.js).
let corrupt=null,repaired=null;
const copyOnce=(prefix,raw)=>{try{const k=Object.keys(localStorage).find(k=>k.startsWith(prefix)&&localStorage.getItem(k)===raw);if(k)return k;const nk=prefix+Date.now();localStorage.setItem(nk,raw);return nk;}catch(e){return null;}};
try{const raw=backend.load();data=raw?migrate(raw):defaults();
  if(raw){const r=repair(data);if(r.fixes.length||r.removed.length){let orig=null;try{orig=localStorage.getItem(KEY);}catch(e){}repaired={...r,raw:orig,copyKey:orig?copyOnce(KEY+'.prerepair-',orig):null};}}}
catch(e){console.warn('Datos no válidos',e);data=defaults();let raw=null;try{raw=localStorage.getItem(KEY);}catch(_){}
  let copyKey=null;if(raw){try{copyKey=Object.keys(localStorage).find(k=>k.startsWith(KEY+'.corrupt-')&&localStorage.getItem(k)===raw)||null;}catch(_){}
    if(!copyKey){copyKey=KEY+'.corrupt-'+Date.now();try{localStorage.setItem(copyKey,raw);}catch(_){copyKey=null;}}}
  corrupt={raw,copyKey,error:String(e&&e.message||e)};}
if(!corrupt&&!(repaired&&!repaired.copyKey)){try{if(localStorage.getItem(KEY)!=null)backend.save(data);}catch(e){/* sin espacio: los datos siguen en memoria y el original intacto */}}
const SAVE_ERR='No se pudo guardar (almacenamiento lleno o bloqueado). Exporta una copia.';
let onChange=null;
function save(){if(corrupt)throw new Error('No se pudo guardar: tus datos guardados están dañados. Descárgalos o restaura una copia primero.');data.updated=Date.now();try{backend.save(data);}catch(e){throw new Error(SAVE_ERR);}}
// Ejecuta un cambio de forma atómica: si no se puede guardar, se deshace en memoria.
function atomic(fn){const snap=JSON.stringify(data);try{const r=fn();save();clearPrev();if(onChange)onChange();return r;}catch(e){data=JSON.parse(snap);throw e;}}
const PREV=KEY+'.prev';const GONE='Este elemento ya no existe (se eliminó en otra pestaña).';
const ACC_GONE='La cuenta elegida ya no existe (se eliminó en otra pestaña).',CAT_GONE='La categoría elegida ya no existe (se eliminó en otra pestaña).';
// Copia para Deshacer: nunca queda una copia antigua; si no se puede guardar, no se ofrece Deshacer.
function clearPrev(){try{localStorage.removeItem(PREV);}catch(e){}}
function snapshot(){clearPrev();try{localStorage.setItem(PREV,JSON.stringify({ts:Date.now(),data}));return true;}catch(e){clearPrev();return false;}}
const UNDO_MS=15000;
// resolve=true: sustituye datos dañados (solo se desbloquea el guardado si la sustitución se guarda bien).
function replaceAll(m,resolve){const was=corrupt;const undoable=corrupt?(clearPrev(),false):snapshot();const old=data;data=m;if(resolve)corrupt=null;try{save();}catch(e){data=old;corrupt=was;clearPrev();throw e;}if(onChange)onChange();return undoable;}
window.Store={uid,migrate,get data(){return data},save,
  // mustExist: al editar, si el elemento ya no existe (eliminado en otra pestaña) no se vuelve a crear.
  upsert(coll,obj,mustExist){return atomic(()=>{const a=data[coll];if(mustExist&&!a.some(x=>x.id===obj.id))throw new Error(GONE);
    if(coll==='transactions'){const has=id=>data.accounts.some(x=>x.id===id);if(!has(obj.accountId)||(obj.type==='transfer'&&!has(obj.toAccountId)))throw new Error(ACC_GONE);
      if(obj.type==='transfer')delete obj.categoryId;else if(obj.categoryId!=null&&!data.categories.some(c=>c.id===obj.categoryId&&c.type===obj.type))throw new Error(CAT_GONE);}obj.updated=Date.now();if(!obj.id)obj.id=uid();const i=a.findIndex(x=>x.id===obj.id);i>=0?a[i]=obj:a.push(obj);return obj;});},
  remove(coll,id){atomic(()=>{data[coll]=data[coll].filter(x=>x.id!==id);});},
  // Mueve los movimientos de una cuenta a otra y la elimina; las transferencias entre ambas desaparecen. El saldo inicial de la cuenta eliminada deja de contar (decisión de producto; se avisa en el diálogo).
  moveAccount(from,to){return atomic(()=>{if(!data.accounts.some(x=>x.id===from)||!data.accounts.some(x=>x.id===to)||from===to)throw new Error(GONE);let n=0;for(const t of data.transactions){let ch=false;if(t.accountId===from){t.accountId=to;ch=true;}if(t.toAccountId===from){t.toAccountId=to;ch=true;}if(ch){n++;t.updated=Date.now();}}
    data.transactions=data.transactions.filter(t=>!(t.type==='transfer'&&t.accountId===t.toAccountId));
    data.accounts=data.accounts.filter(x=>x.id!==from);return n;});},
  // Elimina una categoría moviendo sus movimientos a otra (to) o dejándolos «Sin categoría» (to=null).
  removeCategory(id,to){return atomic(()=>{if(!data.categories.some(c=>c.id===id)||(to&&!data.categories.some(c=>c.id===to)))throw new Error(GONE);let n=0;for(const t of data.transactions)if(t.categoryId===id){n++;t.updated=Date.now();if(to)t.categoryId=to;else delete t.categoryId;}data.categories=data.categories.filter(c=>c.id!==id);return n;});},
  setSetting(k,v){atomic(()=>{data.settings[k]=v;});},
  exportData(){return JSON.stringify({app:'slot-ai',...data},null,1);},
  importData(json,resolve){let d;try{d=JSON.parse(json);}catch(e){throw new Error('El archivo no es una copia de Slot-AI (JSON no válido).');}
    if(d&&d.app&&d.app!=='slot-ai'&&d.app!=='gastos-pwa')throw new Error('El archivo no es una copia de Slot-AI.');
    validate(d);delete d.app;const m=migrate(d);return replaceAll(m,resolve);},
  reset(resolve){return replaceAll(defaults(),resolve);},
  // null si la copia exportada se podría restaurar; si no, el motivo.
  exportProblem(){try{validate(JSON.parse(this.exportData()));return null;}catch(e){return e.message;}},
  get repaired(){return repaired;},
  // Datos dañados al arrancar
  get corrupt(){return corrupt;},
  // Empezar de cero / restaurar tras datos dañados: solo si la copia dañada está a salvo (o el usuario la descargó).
  resolveCorrupt(){corrupt=null;},
  hasPrev(){try{const p=JSON.parse(localStorage.getItem(PREV));return !!(p&&p.data&&Date.now()-p.ts<UNDO_MS);}catch(e){return false}},
  clearPrev,
  // Deshacer: solo dentro del plazo, sin cambios posteriores (cualquier cambio borra la copia) y con la copia validada.
  // La copia es propia: se migra y repara, se verifica, y solo se borra cuando la restauración se ha guardado.
  undo(){let raw=null,p=null;try{raw=localStorage.getItem(PREV);p=JSON.parse(raw);}catch(e){}
    if(!p||!p.data||Date.now()-p.ts>=UNDO_MS){clearPrev();throw new Error('Ya no se puede deshacer.');}
    let m;try{m=migrate(JSON.parse(JSON.stringify(p.data)));const r=repair(m);if(r.removed.length)throw new Error('movimientos irreparables');validate(m);}
    catch(e){const k=copyOnce(KEY+'.corrupt-undo-',JSON.stringify(p.data));clearPrev();throw new Error('No se pudo deshacer: la copia anterior no es válida.'+(k?' Se ha guardado en Ajustes › Datos dañados guardados.':''));}
    const old=data;data=m;try{save();}catch(e){data=old;throw e;}clearPrev();if(onChange)onChange();return true;},
  // Recarga tras un cambio en otra pestaña. Devuelve false si los datos de la otra pestaña no se pueden leer (se conservan los de memoria).
  // Devuelve 'recovered' si esta pestaña tenía datos dañados y la otra guardó datos válidos.
  reload(){try{const raw=backend.load();if(!raw)return true;const m=migrate(raw);repair(m);data=m;if(corrupt){corrupt=null;return 'recovered';}return true;}catch(e){return false;}},
  onChange(fn){onChange=fn;},
  validate,okDate,repair,
  setBackend(b){backend=b;}};
})();
