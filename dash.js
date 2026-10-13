// dash.js — หน้า "ภาพรวม" (หน้าแรกของแอดมิน): สรุปงานวันนี้ ยอดขาย และทางลัด
let dashDocs=null;
async function loadDashDocs(){
 try{dashDocs=await Service.listDocs('')}catch(e){dashDocs=[]}
 if(aview==='dash')render();
}
const dsMoney=n=>{n=Number(n)||0;return Number.isInteger(Math.round(n*100)/100)&&Math.round(n*100)%100===0?n.toLocaleString('th-TH'):rpMoney(n)};
const dsOrdSum=o=>(o.items||[]).reduce((t,i)=>t+(okN(i.price)?Number(i.price)*Number(i.qty):0),0);
const dsLocal=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s||''));return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]):null};
const dsAgo=s=>{const d=dsLocal(s);if(!d)return'';const m=Math.max(0,Math.round((Date.now()-d.getTime())/60000));return m<60?(m<2?'เมื่อสักครู่':m+' นาทีที่แล้ว'):m<1440?Math.floor(m/60)+' ชม.ที่แล้ว':Math.floor(m/1440)+' วันที่แล้ว'};
const dsDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function dsData(){
 const L=(ords||[]).filter(o=>stText(o.status)!=='ยกเลิก'),mon=rpNow();
 const wait=L.filter(o=>stText(o.status)===ST_WAIT);
 const ship=L.filter(o=>stText(o.status)===ST_SHIP);
 const unpaid=ship.filter(o=>payText(o.payStatus)!==ST_PAID);
 const monShip=ship.filter(o=>String(o.shippedAt||'').slice(0,7)===mon);
 const sales=rpR2(monShip.reduce((t,o)=>t+dsOrdSum(o),0));
 const days=[];for(let k=6;k>=0;k--){const d=new Date();d.setHours(12);d.setDate(d.getDate()-k);days.push({d,k:dsDay(d),amt:0})}
 ship.forEach(o=>{const x=days.find(y=>y.k===String(o.shippedAt||'').slice(0,10));if(x)x.amt+=dsOrdSum(o)});
 const prod={};monShip.forEach(o=>(o.items||[]).forEach(i=>{if(!okN(i.price))return;prod[i.name]=(prod[i.name]||0)+Number(i.price)*Number(i.qty)}));
 const top=Object.keys(prod).map(k=>({name:k,amt:prod[k]})).sort((a,b)=>b.amt-a.amt).slice(0,3);
 const docs=(dashDocs||[]).filter(x=>x.status!=='ยกเลิก'&&String(x.issuedAt||'').slice(0,7)===mon).length;
 return{wait,ship,unpaid,sales,days,top,docs,unpaidAmt:rpR2(unpaid.reduce((t,o)=>t+dsOrdSum(o),0)),monN:monShip.length};
}
function dgo(k){
 if(k==='sales')return nav('rep');
 if(k==='docs')return nav('dreg');
 if(k==='wait'||k==='unpaid'){ofl=k==='wait'?ST_WAIT:'unpaid';oq='';oopen=null;aview='ord';render();scrollTo(0,0);return}
 if(k==='orders'){ofl='all';oq='';oopen=null;aview='ord';render();scrollTo(0,0);return}
}
function dopen(id){ofl='all';oq='';oopen=id;aview='ord';render();scrollTo(0,0)}
function dashView(){
 if(oerr)return `<div class="empty">${ic('info',44)}<p>${esc(oerr)}</p><button class="btn pri" onclick="loadOrders()">ลองใหม่</button></div>`;
 if(!ords)return `<div class="dsk"><div class="sk" style="aspect-ratio:auto;height:96px"></div><div class="sk" style="aspect-ratio:auto;height:210px"></div></div>`;
 const d=dsData(),max=Math.max(1,...d.days.map(x=>x.amt)),wk=rpR2(d.days.reduce((t,x)=>t+x.amt,0));
 const today=new Date().toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const tile=(cls,icn,label,big,sub,go)=>`<button class="dtile ${cls}" onclick="dgo('${go}')"><span class="dt-i">${ic(icn,22)}</span><span class="dt-l">${label}</span><b class="dt-n">${big}</b><span class="dt-s">${sub}</span></button>`;
 const tasks=d.wait.slice(0,5).map(o=>({o,t:'wait'})).concat(d.unpaid.slice(0,Math.max(0,6-Math.min(5,d.wait.length))).map(o=>({o,t:'pay'})));
 const row=({o,t})=>{const n=(o.items||[]).length,f=(o.items||[])[0];return `<button class="trow" onclick="dopen('${esc(o.orderId)}')"><span class="tdot ${t}"></span><span class="tmain"><b>${esc(o.name)}</b><small>${esc(f?f.name:'')}${n>1?' และอีก '+(n-1)+' รายการ':''} · ${esc(dsAgo(o.createdAt))}</small></span><span class="stb ${t==='wait'?'wait':'bad'}">${t==='wait'?'รอจัดส่ง':'ค้างชำระ'}</span></button>`};
 return `<section class="dhead"><div><h2>ภาพรวมวันนี้</h2><p>${esc(today)}</p></div><button class="btn sm" onclick="loadOrders();loadDashDocs()">รีเฟรช</button></section>
 <div class="dtiles">
  ${tile('t-wait','truck','รอจัดเตรียม/จัดส่ง',d.wait.length,d.wait.length?'ออเดอร์ที่ต้องส่ง':'ไม่มีงานค้าง','wait')}
  ${tile('t-pay','wallet','ค้างชำระ',d.unpaid.length,d.unpaid.length?(d.unpaidAmt?dsMoney(d.unpaidAmt)+' บาท':'ส่งแล้ว ยังไม่รับเงิน'):'ไม่มียอดค้าง','unpaid')}
  ${tile('t-sale','chart','ยอดขายเดือนนี้',dsMoney(d.sales)+' <small>บาท</small>',d.monN+' ออเดอร์ที่จัดส่งแล้ว','sales')}
  ${tile('t-doc','doc','เอกสารที่ออกเดือนนี้',d.docs,'ใบ (ไม่รวมที่ยกเลิก)','docs')}
 </div>
 <section class="dcardx"><h3>ต้องทำตอนนี้</h3>${tasks.length?`<div class="tlist">${tasks.map(row).join('')}</div>${d.wait.length+d.unpaid.length>tasks.length?`<button class="btn sm w" style="margin-top:8px" onclick="dgo('orders')">ดูคำสั่งซื้อทั้งหมด</button>`:''}`:'<p class="dempty">ไม่มีงานค้าง ออเดอร์ทั้งหมดจัดส่งและรับชำระครบแล้ว</p>'}</section>
 <section class="dcardx"><div class="dch"><h3>ยอดขาย 7 วันล่าสุด</h3><b>${rpMoney(wk)} บาท</b></div>
  <div class="bars" role="img" aria-label="ยอดขายรายวัน 7 วันล่าสุด">${d.days.map((x,i)=>`<div class="bar1${i===6?' now':''}"><span class="bv">${x.amt?Math.round(x.amt).toLocaleString('th-TH'):''}</span><i style="height:${Math.max(x.amt?6:2,Math.round(x.amt/max*100))}px"></i><small>${['อา','จ','อ','พ','พฤ','ศ','ส'][x.d.getDay()]}</small></div>`).join('')}</div></section>
 ${d.top.length?`<section class="dcardx"><h3>สินค้าขายดีเดือนนี้</h3>${d.top.map((p,i)=>`<div class="toprow"><span class="rk">${i+1}</span><span class="tn">${esc(p.name)}</span><b>${rpMoney(p.amt)}</b></div>`).join('')}</section>`:''}
 <section class="dcardx"><h3>ทางลัด</h3><div class="quick">
  <button onclick="nav('new')">${ic('box',22)}<span>เพิ่มสินค้า</span></button>
  <button onclick="dgo('orders')">${ic('doc',22)}<span>ออกเอกสาร<br>(เลือกออเดอร์)</span></button>
  <button onclick="nav('dreg')">${ic('copy',22)}<span>ทะเบียนเอกสาร</span></button>
  <a href="index.html">${ic('store',22)}<span>ดูหน้าร้านลูกค้า</span></a></div></section>`;
}
