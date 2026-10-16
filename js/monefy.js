// Importador de exportaciones CSV de Monefy. Funciones puras (sin DOM) para poder probarlas también en Node.
(function(root){
const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
// Decodifica bytes: UTF-8 (con o sin BOM), UTF-16 con BOM, y si no es UTF-8 válido, Windows-1252.
function decode(buf){const b=new Uint8Array(buf);
  if(b[0]===0xff&&b[1]===0xfe)return new TextDecoder('utf-16le').decode(b.subarray(2));
  if(b[0]===0xfe&&b[1]===0xff)return new TextDecoder('utf-16be').decode(b.subarray(2));
  try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}catch(e){return new TextDecoder('windows-1252').decode(b);}}
function detectSep(line){let best=',',n=-1;for(const s of [',',';','\t','|']){let c=0,q=false;for(const ch of line){if(ch==='"')q=!q;else if(!q&&ch===s)c++;}if(c>n){n=c;best=s;}}return best;}
function parseRows(text,sep){const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
    else if(ch==='"')q=true;else if(ch===sep){row.push(f);f='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.some(x=>x.trim()))rows.push(row);row=[];}
    else f+=ch;}
  row.push(f);if(row.some(x=>x.trim()))rows.push(row);return rows;}
// Importe → céntimos enteros (sin coma flotante). Admite 1.234,56 / 1,234.56 / -27.2 / 27,2 / "−14 €" / (14,00) / 1 234,56.
// dec = separador decimal: ',' o '.' (detectado para todo el archivo con detectDecimal), 'typed' (escrito a mano:
// un separador único es siempre decimal y se rechazan más de 2 decimales) o undefined (un separador único seguido de
// exactamente 3 cifras con parte entera 1-999 sin cero inicial se toma como miles: 1.234 / 1,234).
function cleanAmount(s){s=String(s??'').trim();const paren=/^\(.*\)$/.test(s);
  s=s.replace(/[\u2212\u2012\u2013\u2014]/g,'-').replace(/[^\d,.\-+]/g,'');return{s,paren};}
function parseAmount(input,dec){let{s,paren}=cleanAmount(input);if(!/\d/.test(s))return NaN;
  const neg=paren||/^[+]?-|-$/.test(s)||(s.match(/-/g)||[]).length===1;if(/\d[-+]\d/.test(s))return NaN;s=s.replace(/[-+]/g,'');
  const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');let ip,fp='';
  const grouped=(parts)=>parts.slice(1).every(x=>x.length===3)&&/^\d{1,3}$/.test(parts[0]);
  if(lc>=0&&ld>=0){const d=lc>ld?',':'.',th=d===','?'.':',';const i=s.lastIndexOf(d);const ipr=s.slice(0,i);fp=s.slice(i+1);
    if(ipr.includes(d))return NaN;const parts=ipr.split(th);if(parts.length>1&&!grouped(parts))return NaN;ip=parts.join('');}
  else if(lc>=0||ld>=0){const sep=lc>=0?',':'.',parts=s.split(sep);
    if(parts.length>2){if(!grouped(parts))return NaN;ip=parts.join('');}
    else{const thousands=dec==='typed'?false:(dec===','||dec==='.')?sep!==dec:(parts[1].length===3&&/^[1-9]\d{0,2}$/.test(parts[0]));
      if(thousands){if(!grouped(parts))return NaN;ip=parts.join('');}else{ip=parts[0];fp=parts[1];}}}
  else ip=s;
  if(!/^\d*$/.test(ip)||!/^\d*$/.test(fp)||(!ip&&!fp))return NaN;
  if(dec==='typed'&&fp.length>2)return NaN;
  let c=BigInt(ip||'0')*100n+BigInt((fp+'00').slice(0,2)||'0');if(fp.length>2&&+fp[2]>=5)c+=1n; // redondeo a céntimos (mitad hacia arriba)
  if(c>BigInt(Number.MAX_SAFE_INTEGER))return NaN;const v=Number(c);return neg&&v?-v:v;}
// Detecta el separador decimal de un archivo a partir de los importes inequívocos (ambos separadores, o un separador seguido de 1-2 o 4+ cifras).
function detectDecimal(values){let dot=0,com=0;
  for(const v of values){const{s}=cleanAmount(v);const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
    if(lc>=0&&ld>=0){lc>ld?com++:dot++;continue;}
    const sep=lc>=0?',':ld>=0?'.':null;if(!sep)continue;const parts=s.split(sep);if(parts.length!==2)continue;
    if(parts[1].length!==3)sep===','?com++:dot++;}
  return dot>com?'.':com>dot?',':undefined;}
const pad=n=>String(n).padStart(2,'0');
function dateParser(samples){let dmy=0,mdy=0;
  for(const s of samples){const m=String(s).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);if(!m)continue;if(+m[1]>12)dmy++;if(+m[2]>12)mdy++;}
  const md=mdy>dmy;
  return s=>{s=String(s).trim();let m=s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);if(m)return valid(m[1],m[2],m[3]);
    m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);if(!m)return null;let[d,mo]=md?[m[2],m[1]]:[m[1],m[2]];let y=+m[3];if(y<100)y+=2000;
    return valid(y,mo,d);};}
function valid(y,m,d){y=+y;m=+m;d=+d;const x=new Date(Date.UTC(y,m-1,d));if(!(y>=1900&&y<=2999)||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)return null;return `${y}-${pad(m)}-${pad(d)}`;}
const COLS={date:['date','fecha','datum','data'],account:['account','cuenta','konto','conta'],category:['category','categoria','kategorie'],amount:['amount','importe','cantidad','monto','betrag','valor'],currency:['currency','moneda','divisa','wahrung','moeda'],note:['description','descripcion','nota','note','notes','notas','comentario']};
const TR=/^(?:to|from|a|al|de|del|hacia|desde|para|transfer(?:encia)?\s+(?:to|from|a|de))\s*[:]?\s*['"‘’«“]?(.+?)['"’»”]?\s*$/i;
const OUT=/^(?:to|a|al|hacia|para|transfer(?:encia)?\s+(?:to|a))\b/i;
function parse(input){
  const text=(typeof input==='string'?input:decode(input)).replace(/^\ufeff/,'');
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';const sep=detectSep(first);const rows=parseRows(text,sep);
  if(rows.length<2)throw new Error('El CSV está vacío');
  const head=rows[0].map(norm);const ix={};
  for(const k in COLS){ix[k]=head.findIndex(h=>COLS[k].includes(h));}
  for(const k of ['date','account','category','amount'])if(ix[k]<0)throw new Error('Falta la columna «'+k+'». ¿Es una exportación de Monefy?');
  const dec=detectDecimal(rows.slice(1).map(r=>r[ix.amount]));
  const pd=dateParser(rows.slice(1).map(r=>r[ix.date]));
  const accNames=[...new Set(rows.slice(1).map(r=>(r[ix.account]||'').trim()).filter(Boolean))];
  const accByNorm=Object.fromEntries(accNames.map(a=>[norm(a),a]));
  const items=[],errors=[],cur=new Set();
  rows.slice(1).forEach((r,i)=>{const date=pd(r[ix.date]),amount=parseAmount(r[ix.amount],dec),account=(r[ix.account]||'').trim(),category=(r[ix.category]||'').trim();
    const note=ix.note>=0?(r[ix.note]||'').trim():'';if(ix.currency>=0&&r[ix.currency])cur.add(r[ix.currency].trim());
    if(!date||isNaN(amount)||!account){errors.push(i+2);return;}
    if(!amount)return;
    const m=category.match(TR);const other=m&&accByNorm[norm(m[1])];
    if(other&&norm(other)!==norm(account))items.push({kind:'tr',date,account,other,out:amount<0||OUT.test(category),amount:Math.abs(amount),note});
    else items.push({kind:amount<0?'expense':'income',date,account,category:category||'Sin categoría',amount:Math.abs(amount),note});});
  // Emparejar las dos mitades de cada transferencia (salida A→B y entrada en B desde A).
  const trs=items.filter(x=>x.kind==='tr'),used=new Set(),transfers=[];
  trs.forEach((t,i)=>{if(used.has(i))return;used.add(i);
    const from=t.out?t.account:t.other,to=t.out?t.other:t.account;
    const j=trs.findIndex((u,k)=>!used.has(k)&&u.date===t.date&&u.amount===t.amount&&u.out!==t.out&&u.account===t.other&&u.other===t.account);
    if(j>=0)used.add(j);transfers.push({type:'transfer',date:t.date,from,to,amount:t.amount,note:t.note||(j>=0?trs[j].note:'')});});
  const tx=[...items.filter(x=>x.kind!=='tr').map(x=>({type:x.kind,date:x.date,account:x.account,category:x.category,amount:x.amount,note:x.note})),...transfers].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const sum=(arr,key)=>{const o={};for(const x of arr){const k=x[key];o[k]=o[k]||{n:0,total:0};o[k].n++;o[k].total+=x.amount;}return Object.entries(o).map(([name,v])=>({name,...v})).sort((a,b)=>b.total-a.total);};
  const dates=tx.map(t=>t.date);
  return {sep,tx,errors,currencies:[...cur],accounts:accNames,
    summary:{n:tx.length,from:dates[0]||null,to:dates[dates.length-1]||null,transfers:transfers.length,
      expense:sum(tx.filter(t=>t.type==='expense'),'category'),income:sum(tx.filter(t=>t.type==='income'),'category'),
      perAccount:accNames.map(a=>{const ts=tx.filter(t=>t.account===a||t.from===a||t.to===a);let bal=0;for(const t of ts){if(t.type==='income')bal+=t.amount;else if(t.type==='expense')bal-=t.amount;else bal+=t.to===a?t.amount:-t.amount;}return{name:a,n:ts.length,balance:bal};})}};}
// Asigna las categorías de gasto del CSV a las 6 casillas fijas de Slot-AI.
const SLOTS=[['exp-comida',/comida|super|aliment|mercad|restaur|cafe/,'food'],['exp-casa',/casa|hogar|alquiler|hipoteca|vivienda/,'house'],['exp-transporte',/auto|coche|transp|gasolin|taxi|bus|tren|vehic/,'car'],['exp-ocio',/ocio|regalo|cine|viaje|entreten|deporte/,'gift'],['exp-salud',/salud|farmac|medic|doctor|higiene/,'heart'],['exp-otros',/otros|varios|general/,'tag']];
const KWICON=[[/auto|coche|transp|gasolin|taxi/,'car'],[/ocio|cine|viaje/,'cocktail'],[/comunic|telefon|\bmovil|internet/,'phone'],[/regalo/,'gift'],[/auto|coche/,'car'],[/factur|recibo/,'tag'],[/ropa/,'shirt'],[/comida|super/,'cart'],[/casa|hogar/,'house'],[/salud|farmac/,'heart']];
function mapExpense(names){// names ordenados por total desc. Devuelve {nombre: slotId}, y merged:[nombres a Otros]
  const map={},free=SLOTS.map(s=>s[0]),keep=names.length>6?names.slice(0,5):names.slice();
  for(const n of keep){const s=SLOTS.find(([id,re])=>free.includes(id)&&re.test(norm(n)));if(s){map[n]=s[0];free.splice(free.indexOf(s[0]),1);}}
  for(const n of keep)if(!map[n]){map[n]=free.shift();}
  const merged=names.length>6?names.slice(5):[];for(const n of merged)map[n]=free[0]||'exp-otros';
  return{map,merged,mergedSlot:merged.length?(free[0]||'exp-otros'):null};}
function iconFor(name,fallback){const n=norm(name);const k=KWICON.find(([re])=>re.test(n));return k?k[1]:fallback;}
// Construye datos Slot-AI v3. mode: 'replace' | 'merge'. base: datos actuales (para fusionar o conservar ajustes).
function build(p,base,mode,uid){uid=uid||(()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  const d=JSON.parse(JSON.stringify(base));const merge=mode==='merge';
  // Reemplazar: las categorías pasan a ser exactamente las del CSV (sin predeterminadas). Fusionar: por nombre, creando las que falten.
  if(!merge){d.accounts=[];d.transactions=[];d.categories=[];}
  if(p.currencies.length===1){const c=p.currencies[0].toUpperCase();d.settings.currency={EUR:'€',USD:'$',GBP:'£'}[c]||c;}
  const accId={};for(const name of p.accounts){let a=d.accounts.find(x=>norm(x.name)===norm(name));if(!a){a={id:uid(),name,icon:/tarjeta|card|banco|bank/i.test(name)?'card':'moneybag',initial:0};d.accounts.push(a);}accId[name]=a.id;}
  const EXPCOL=['#e573a0','#5aa5dc','#e57373','#f0a040','#d9534f','#cfa80a','#7986cb','#4db6ac','#a1887f','#9575cd'],INCCOL=['#43a86a','#26a69a','#4caf7a','#7cb342','#00897b'];
  const ensure=(type,name)=>{let c=d.categories.find(x=>x.type===type&&norm(x.name)===norm(name));
    if(!c){const k=d.categories.filter(x=>x.type===type).length;
      c=type==='expense'?{id:uid(),type,name,icon:iconFor(name,'tag'),color:EXPCOL[k%EXPCOL.length]}
        :{id:uid(),type,name,icon:{salario:'briefcase',nomina:'briefcase',ahorros:'piggy',depositos:'moneybag',ventas:'store'}[norm(name)]||'moneybag',color:INCCOL[k%INCCOL.length]};
      d.categories.push(c);}return c.id;};
  const catId={},incId={};
  for(const e of p.summary.expense)catId[e.name]=ensure('expense',e.name);
  for(const e of p.summary.income)incId[e.name]=ensure('income',e.name);
  const key=t=>[t.type,t.date,t.amount,t.accountId,t.toAccountId||'',t.categoryId||'',norm(t.note)].join('|');
  // Duplicados: solo se omiten tantas copias como ya existen en los datos (dos filas iguales reales en el CSV se conservan).
  const seen=new Map();for(const t of d.transactions){const k=key(t);seen.set(k,(seen.get(k)||0)+1);}let added=0,dup=0;
  for(const t of p.tx){const x={id:uid(),type:t.type,amount:t.amount,date:t.date,note:t.note,updated:Date.now()};
    if(t.type==='transfer'){x.accountId=accId[t.from];x.toAccountId=accId[t.to];}else{x.accountId=accId[t.account];x.categoryId=t.type==='expense'?catId[t.category]:incId[t.category];}
    const k=key(x);if(merge&&seen.get(k)>0){seen.set(k,seen.get(k)-1);dup++;continue;}d.transactions.push(x);added++;}
  d.version=4;d.updated=Date.now();return{data:d,added,dup};}
const api={decode,parse,parseAmount,detectDecimal,build,mapExpense};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Monefy=api;
})(typeof window!=='undefined'?window:this);
