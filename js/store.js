// Capa de datos. Todo pasa por Store; para añadir sync (p. ej. Google Drive) basta con
// implementar otro "backend" con load()/save() y usar exportData()/importData().
(function(){
const KEY='gastos.v1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const EXP=[['Facturas','🧾','#e57373'],['Coche','🚗','#64b5f6'],['Ropa','👕','#ba68c8'],['Comunicaciones','📱','#4fc3f7'],['Comer fuera','🍽️','#ff8a65'],['Bebidas','🍸','#f06292'],['Regalos','🎁','#ef5350'],['Comida','🛒','#81c784'],['Amigos','👫','#ffb74d'],['Salud','💊','#4db6ac'],['Casa','🏠','#a1887f'],['Mascotas','🐾','#9575cd'],['Deportes','⚽','#aed581'],['Taxi','🚕','#ffd54f'],['Aseo','🧴','#90caf9'],['Transporte','🚌','#7986cb'],['Ocio','🎬','#f48fb1']];
const INC=[['Salario','💼','#43a047'],['Ahorros','🐷','#26a69a'],['Depósitos','🏦','#7cb342']];
function defaults(){
  return {version:1,
    settings:{currency:'€',weekStart:1,dark:false},
    accounts:[{id:'cash',name:'Efectivo',icon:'💵',initial:0},{id:'card',name:'Tarjeta',icon:'💳',initial:0}],
    categories:[...EXP.map(([n,i,c])=>({id:uid(),type:'expense',name:n,icon:i,color:c})),...INC.map(([n,i,c])=>({id:uid(),type:'income',name:n,icon:i,color:c}))],
    transactions:[], // {id,type:'expense'|'income'|'transfer',amount(cents),date:'YYYY-MM-DD',accountId,toAccountId?,categoryId?,note,updated}
    updated:Date.now()};
}
const LocalBackend={load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},save(d){localStorage.setItem(KEY,JSON.stringify(d))}};
let backend=LocalBackend, data=backend.load()||defaults();
function save(){data.updated=Date.now();backend.save(data);Store.onChange&&Store.onChange();}
function validate(d){if(!d||!Array.isArray(d.accounts)||!Array.isArray(d.categories)||!Array.isArray(d.transactions))throw new Error('Archivo no válido');return d;}
window.Store={uid,get data(){return data},save,
  upsert(coll,obj){const a=data[coll];obj.updated=Date.now();if(!obj.id)obj.id=uid();const i=a.findIndex(x=>x.id===obj.id);i>=0?a[i]=obj:a.push(obj);save();return obj;},
  remove(coll,id){data[coll]=data[coll].filter(x=>x.id!==id);save();},
  setSetting(k,v){data.settings[k]=v;save();},
  exportData(){return JSON.stringify({app:'gastos-pwa',...data},null,1);},
  importData(json){data=validate(JSON.parse(json));data.settings={...defaults().settings,...data.settings};save();},
  reset(){data=defaults();save();},
  setBackend(b){backend=b;}};
})();
