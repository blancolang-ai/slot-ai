// Capa de datos. Todo pasa por Store; para añadir sync (p. ej. Google Drive) basta con
// implementar otro "backend" con load()/save() y usar exportData()/importData().
// Esquema v3: cuentas (negocios/locales) con saldo inicial, transferencias entre cuentas,
// exactamente 6 categorías de gasto (renombrables) + categorías de ingreso. Iconos = claves de js/icons.js.
(function(){
const KEY='gastos.v1'; // clave de almacenamiento (se mantiene para conservar los datos existentes)
const SCHEMA=3;
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
  // Categorías de gasto: exactamente las 6 fijas
  const oldExp=d.categories.filter(c=>c.type==='expense');const map={};
  const newExp=defExp().map(def=>{
    const old=oldExp.find(c=>c.id===def.id)||oldExp.find(c=>norm(c.name)===norm(def.name));
    if(!old)return def;map[old.id]=def.id;
    const color=(!old.color||old.color===V2COL[def.id]||v<2)?def.color:old.color;
    return {...def,name:old.name||def.name,icon:isKey(old.icon)?old.icon:def.icon,color};});
  oldExp.forEach(c=>{if(!map[c.id])map[c.id]=OTROS;});
  const ids=newExp.map(c=>c.id);
  d.transactions.forEach(t=>{if(t.type==='expense'){t.categoryId=map[t.categoryId]||(ids.includes(t.categoryId)?t.categoryId:OTROS);}});
  const inc=d.categories.filter(c=>c.type==='income').map(c=>({...c,icon:isKey(c.icon)?c.icon:(INCICON[norm(c.name)]||'moneybag')}));
  d.categories=[...newExp,...inc];
  d.version=SCHEMA;
  return d;
}
const LocalBackend={load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},save(d){localStorage.setItem(KEY,JSON.stringify(d))}};
let backend=LocalBackend, data;
try{const raw=backend.load();data=raw?migrate(raw):defaults();if(raw)backend.save(data);}catch(e){console.warn('Datos no válidos, se reinician',e);data=defaults();}
function save(){data.updated=Date.now();backend.save(data);}
window.Store={uid,migrate,get data(){return data},save,
  upsert(coll,obj){const a=data[coll];obj.updated=Date.now();if(!obj.id)obj.id=uid();const i=a.findIndex(x=>x.id===obj.id);i>=0?a[i]=obj:a.push(obj);save();return obj;},
  remove(coll,id){if(coll==='categories'&&EXP.some(([e])=>e===id))return;data[coll]=data[coll].filter(x=>x.id!==id);save();},
  setSetting(k,v){data.settings[k]=v;save();},
  exportData(){return JSON.stringify({app:'slot-ai',...data},null,1);},
  importData(json){data=migrate(JSON.parse(json));save();},
  reset(){data=defaults();save();},
  setBackend(b){backend=b;}};
})();
