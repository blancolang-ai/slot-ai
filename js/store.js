// Capa de datos. Todo pasa por Store; para añadir sync (p. ej. Google Drive) basta con
// implementar otro "backend" con load()/save() y usar exportData()/importData().
// Esquema v2: sin cuentas (todo es efectivo, un único saldo), sin transferencias,
// exactamente 6 categorías de gasto (renombrables) + categorías de ingreso.
(function(){
const KEY='gastos.v1'; // clave de almacenamiento (se mantiene para conservar los datos existentes)
const SCHEMA=2;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const EXP=[['exp-comida','Comida','🛒','#81c784'],['exp-casa','Casa','🏠','#a1887f'],['exp-transporte','Transporte','🚌','#7986cb'],['exp-ocio','Ocio','🎬','#f48fb1'],['exp-salud','Salud','💊','#4db6ac'],['exp-otros','Otros','📦','#90a4ae']];
const OTROS='exp-otros';
const INC=[['Salario','💼','#43a047'],['Ahorros','🐷','#26a69a'],['Depósitos','🏦','#7cb342']];
const defExp=()=>EXP.map(([id,n,i,c])=>({id,type:'expense',name:n,icon:i,color:c}));
function defaults(){
  return {version:SCHEMA,
    settings:{currency:'€',weekStart:1,dark:false,initialBalance:0},
    categories:[...defExp(),...INC.map(([n,i,c])=>({id:uid(),type:'income',name:n,icon:i,color:c}))],
    transactions:[], // {id,type:'expense'|'income',amount(cents),date:'YYYY-MM-DD',categoryId,note,updated}
    updated:Date.now()};
}
const norm=s=>String(s||'').trim().toLowerCase();
// Migra cualquier versión anterior al esquema actual (también se aplica al importar copias antiguas).
function migrate(d){
  if(!d||!Array.isArray(d.categories)||!Array.isArray(d.transactions))throw new Error('Archivo no válido');
  d.settings={...defaults().settings,...(d.settings||{})};
  if((d.version||1)<2){
    if(Array.isArray(d.accounts))d.settings.initialBalance=d.accounts.reduce((s,a)=>s+(a.initial||0),0);
    const oldExp=d.categories.filter(c=>c.type==='expense');
    const map={};const newExp=defExp().map(def=>{
      const old=oldExp.find(c=>norm(c.name)===norm(def.name));
      if(old){map[old.id]=def.id;return {...def,name:old.name,icon:old.icon||def.icon,color:old.color||def.color};}
      return def;});
    oldExp.forEach(c=>{if(!map[c.id])map[c.id]=OTROS;});
    d.categories=[...newExp,...d.categories.filter(c=>c.type==='income')];
    d.transactions=d.transactions.filter(t=>t.type==='expense'||t.type==='income').map(t=>{
      const n={...t};delete n.accountId;delete n.toAccountId;
      if(n.type==='expense')n.categoryId=map[n.categoryId]||(newExp.some(c=>c.id===n.categoryId)?n.categoryId:OTROS);
      return n;});
    delete d.accounts;d.version=SCHEMA;
  }
  // Invariante: exactamente las 6 categorías de gasto fijas.
  const exp=d.categories.filter(c=>c.type==='expense');
  if(exp.length!==6||!EXP.every(([id])=>exp.some(c=>c.id===id))){
    const fixed=defExp().map(def=>exp.find(c=>c.id===def.id)||def);
    const ids=fixed.map(c=>c.id);
    d.transactions.forEach(t=>{if(t.type==='expense'&&!ids.includes(t.categoryId))t.categoryId=OTROS;});
    d.categories=[...fixed,...d.categories.filter(c=>c.type==='income')];
  }
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
