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
  d.accounts.forEach(a=>{if(!isKey(a.icon))a.icon=/tarjeta|card/i.test(a.name)?'card':'banknotes';a.initial=a.initial||0;});
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
    return {...c,name:c.name||(df?df.n:'Categoría'),icon,color};});
  // v3→v4: hasta v1.4.5 se forzaban las 6 categorías de gasto predeterminadas. Si los datos mezclan categorías
  // propias (importadas) con predeterminadas sin tocar, se quitan las predeterminadas que no tienen movimientos.
  if(v<4){const used=new Set(d.transactions.map(t=>t.categoryId));
    const untouched=c=>c.type==='expense'&&DEF[c.id]&&norm(c.name)===norm(DEF[c.id].n);
    const exp=d.categories.filter(c=>c.type==='expense');
    if(d.transactions.length&&(d.imported||exp.some(c=>!DEF[c.id])))d.categories=d.categories.filter(c=>!untouched(c)||used.has(c.id));}
  d.version=SCHEMA;
  return d;
}
const LocalBackend={load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},save(d){localStorage.setItem(KEY,JSON.stringify(d))}};
let backend=LocalBackend, data;
try{const raw=backend.load();data=raw?migrate(raw):defaults();if(raw)backend.save(data);}catch(e){console.warn('Datos no válidos, se reinician',e);data=defaults();}
function save(){data.updated=Date.now();backend.save(data);}
window.Store={uid,migrate,get data(){return data},save,
  upsert(coll,obj){const a=data[coll];obj.updated=Date.now();if(!obj.id)obj.id=uid();const i=a.findIndex(x=>x.id===obj.id);i>=0?a[i]=obj:a.push(obj);save();return obj;},
  remove(coll,id){data[coll]=data[coll].filter(x=>x.id!==id);save();},
  moveAccount(from,to){let n=0;for(const t of data.transactions){let ch=false;if(t.accountId===from){t.accountId=to;ch=true;}if(t.toAccountId===from){t.toAccountId=to;ch=true;}if(ch){n++;t.updated=Date.now();}}
    data.transactions=data.transactions.filter(t=>!(t.type==='transfer'&&t.accountId===t.toAccountId));save();return n;},
  setSetting(k,v){data.settings[k]=v;save();},
  exportData(){return JSON.stringify({app:'slot-ai',...data},null,1);},
  importData(json){const d=JSON.parse(json);delete d.app;data=migrate(d);save();},
  reset(){data=defaults();save();},
  setBackend(b){backend=b;}};
})();
