/* ---------- โหมดออฟไลน์: ขายตอนเน็ตหลุด แล้วส่งบิลเข้าระบบเมื่อเน็ตกลับมา ---------- */
async function pinHash(p){
 const s='mdr:'+p;
 try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
 catch(e){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'x'+h}
}
function cacheGet(){try{return JSON.parse(localStorage.getItem(CACHEK))||null}catch(e){return null}}
function qGet(){try{return JSON.parse(localStorage.getItem(QK))||[]}catch(e){return []}}
function qSet(a){try{localStorage.setItem(QK,JSON.stringify(a))}catch(e){toast('หน่วยความจำเครื่องเต็ม บันทึกบิลออฟไลน์ไม่ได้')}}
const qLen=()=>qGet().length;
let flushing=false;

function queueSale(body){
 const q=qGet(),n=q.length+1,t=body.at,no='OFF-'+t.slice(2,10).replace(/-/g,'')+'-'+t.slice(11,19).replace(/:/g,'')+(n>1?'-'+n:'');
 const lines=cart.map(l=>{
  const pm=l.pm||1,bq=r2(l.qty*pm),pp=l.price,unitP=pm>1?Math.round(pp/pm*1e6)/1e6:pp;
  const o={id:l.id||'',name:l.name,qty:bq,price:unitP,amt:r2(pp*l.qty),unit:l.pk?(find(l.id)||{}).unit||'':l.unit||''};
  if(l.pk){o.pu=l.pk;o.pn=l.qty;o.pp=pp;o.pm=pm}
  return o;
 });
 const sub=subtotal(),disc=discBaht(),tot=total(),rec=Number(body.received)||0;
 const sale={saleNo:no,at:t,day:t.slice(0,10),total:tot,subtotal:sub,disc,cost:0,method:body.method,received:rec,change:body.method==='cash'?r2(Math.max(0,rec-tot)):0,status:'ปกติ',custId:body.custId||'',items:lines,offline:true};
 // ตัดสต็อกในเครื่อง + ยอดวันนี้ (ชั่วคราวจนกว่าจะส่งเข้าระบบ)
 let cost=0;lines.forEach(l=>{const it=l.id&&find(l.id);if(it){it.stock=r2((it.stock||0)-l.qty);cost+=(it.cost||0)*l.qty}});
 sale.cost=r2(cost);
 stats.total=r2((stats.total||0)+tot);stats.bills=(stats.bills||0)+1;stats.profit=r2((stats.profit||0)+tot-sale.cost);
 q.push({body,sale});qSet(q);OFFLINE=true;offChip();
 return sale;
}
// ใช้ซ้ำหลังโหลดข้อมูลจากแคช: ลงรายการที่ยังค้างส่งทับ
function offReapply(){
 qGet().forEach(e=>{
  (e.sale.items||[]).forEach(l=>{const it=l.id&&find(l.id);if(it)it.stock=r2((it.stock||0)-l.qty)});
  stats.total=r2((stats.total||0)+e.sale.total);stats.bills=(stats.bills||0)+1;stats.profit=r2((stats.profit||0)+e.sale.total-e.sale.cost);
 });
}
async function flushQueue(){
 if(flushing||!CRED)return 0;
 let q=qGet(),ok=0;if(!q.length)return 0;
 flushing=true;
 try{
  for(const e of q.slice()){
   if(e.err)continue;
   try{await api(e.body,20000);ok++;q=qGet().filter(x=>x.body.clientId!==e.body.clientId);qSet(q)}
   catch(x){
    if(x.net||x.message==='unauthorized')break;
    q=qGet();const m=q.find(y=>y.body.clientId===e.body.clientId);if(m){m.err=x.message;qSet(q)}
   }
  }
 }finally{flushing=false}
 offChip();return ok;
}
async function offKick(){
 try{
  if(!qLen())return;
  const n=await flushQueue();
  if(n){toast(`ส่งบิลที่ขายตอนออฟไลน์เข้าระบบแล้ว ${n} ใบ`);const j=await api({action:'posInit'},12000);try{localStorage.setItem(CACHEK,JSON.stringify(j))}catch(e){}bootApply(j);if(!document.querySelector('#mroot .scrim2'))render()}
  if(qLen())offReapply();
 }catch(e){}
 offChip();
}
function offChipHtml(){
 const n=qLen(),bad=qGet().filter(x=>x.err).length;
 if(!OFFLINE&&!n)return '';
 return `<button class="qchip ${bad?'bad':OFFLINE?'off':'wait'}" onclick="qDlg()">${OFFLINE?'ออฟไลน์':'รอส่งบิล'}${n?` · ค้างส่ง ${n}`:''}</button>`;
}
function offChip(){const e=document.getElementById('qchip');if(e)e.innerHTML=offChipHtml()}
function qDlg(){
 const q=qGet();
 dlg(`<h3>บิลที่ขายตอนออฟไลน์</h3><p class="sub">${OFFLINE?'ตอนนี้เชื่อมต่ออินเทอร์เน็ตไม่ได้ ขายต่อได้ตามปกติ ':'เชื่อมต่อได้แล้ว '}บิลจะถูกส่งเข้าระบบอัตโนมัติ — อย่าล้างข้อมูลเบราว์เซอร์/ปิดแอปก่อนส่งครบ</p>
 ${q.length?q.map((e,i)=>`<div class="ln" style="padding:6px 0;border-bottom:1px solid var(--line,#ddd)"><span><b>${esc(e.sale.saleNo)}</b><br><small>${esc(tthai(e.sale.at))} · ${e.sale.items.length} รายการ${e.err?` · <span style="color:#c0392b">ส่งไม่ผ่าน: ${esc(e.err)}</span>`:''}</small></span><span>${fm(e.sale.total)}${e.err?` <button class="btn sm" onclick="qDrop(${i})">ลบ</button>`:''}</span></div>`).join(''):'<p class="sub">ไม่มีบิลค้างส่ง</p>'}
 <div class="acts2"><button class="btn pri lg" onclick="qNow()">ส่งตอนนี้</button><button class="btn" id="donebtn" onclick="closeDlg()">ปิด</button></div>`,'donebtn');
}
async function qNow(){
 try{await api({action:'login'},8000);OFFLINE=false}catch(e){if(e.net){toast('ยังเชื่อมต่ออินเทอร์เน็ตไม่ได้');return}}
 qGet().forEach(x=>{});const q=qGet();q.forEach(x=>delete x.err);qSet(q);
 await offKick();closeDlg(true);offChip();if(qLen())qDlg();
}
function qDrop(i){
 const q=qGet(),e=q[i];if(!e)return;
 if(!confirm(`ลบบิล ${e.sale.saleNo} ที่ส่งไม่ผ่าน? (ต้องบันทึกขายใหม่เองถ้าจำเป็น)`))return;
 q.splice(i,1);qSet(q);offChip();qDlg();
}
// ตรวจเน็ตเป็นระยะ ตอนที่มีบิลค้างหรืออยู่โหมดออฟไลน์
setInterval(async()=>{
 if(!CRED||(!OFFLINE&&!qLen()))return;
 try{await api({action:'login'},8000);if(OFFLINE){OFFLINE=false;offChip()}await offKick()}catch(e){if(e.net&&!OFFLINE){OFFLINE=true;offChip()}}
},15000);
window.addEventListener('online',()=>{if(CRED&&(OFFLINE||qLen()))offKick().then(()=>{OFFLINE=false;offChip()})});
window.addEventListener('offline',()=>{if(CRED){OFFLINE=true;offChip()}});
if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
