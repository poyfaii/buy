// data.js — ข้อมูลและฟังก์ชันที่ใช้ร่วมกัน (หน้าร้าน + หน้าผู้ดูแล)
// ถ้าจะเปลี่ยนที่เก็บข้อมูลเป็น Google Sheets / Firebase / ฐานข้อมูล ให้แก้เฉพาะ Service ด้านล่าง
const KEY='mdr_data_v1',CKEY='mdr_cart_v1',UKEY='mdr_cust_v1',MAXV=5;
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const T=x=>String(x??'').trim();
const bySort=(a,b)=>(a.sortOrder??0)-(b.sortOrder??0);

// ไอคอน
const _I={
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 chev:'<path d="m9 18 6-6-6-6"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 check:'<path d="m5 12 5 5L20 7"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
 send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 up:'<path d="m18 15-6-6-6 6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 top:'<path d="M5 4h14M12 20V9m-6 5 6-6 6 6"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
 ext:'<path d="M7 17 17 7M8 7h9v9"/>',
 dots:'<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>'
};
const ic=(n,s=20)=>`<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_I[n]||''}</svg>`;

// ตัวเลือกสินค้า (Variant) — ทุกช่องไม่บังคับ
const mkV=(size='',sizeUnit='',packaging='',price='',i=0)=>({id:uid(),size,sizeUnit,packaging,price,status:true,sortOrder:i});

function seed(){
 const b=(n,d,vs)=>({id:uid(),name:n,description:d,image:'',status:true,sortOrder:0,variants:vs.map((v,i)=>mkV(v[0],v[1],v[2],v[3],i))});
 const P=[
  b('กล้วยเบรกแตก','กล้วยทอดกรอบ หอม กรอบ อร่อย ผลิตใหม่',[[100,'กรัม','ถุง',30],[250,'กรัม','ถุง',55],[500,'กรัม','ถุง',100],[1,'กิโลกรัม','ถุง',150],[3,'กิโลกรัม','ห่อ',400]]),
  b('กล้วยปาปริก้า','กล้วยทอดรสปาปริก้า หอมกรอบ',[[250,'กรัม','ถุง',55],[500,'กรัม','ถุง',100]]),
  b('กล้วยม้วน','กล้วยม้วนกรอบ หวานมัน',[[1,'กิโลกรัม','ถุง',140],[5,'กิโลกรัม','กล่อง',650]]),
  b('กล้วยใส้มะขาม','กล้วยทอดสอดไส้มะขาม เปรี้ยวหวาน',[[250,'กรัม','ถุง',60]])
 ];
 P.forEach((p,i)=>p.sortOrder=i);
 return{fbUrl:'https://www.facebook.com/',units:['กรัม','กิโลกรัม','มิลลิกรัม','มิลลิลิตร','ลิตร','ถุง','ห่อ','กล่อง','แพ็ก','ชุด'],packs:['ถุง','ห่อ','กล่อง','แพ็ก','ชุด'],products:P};
}

// Data service: เปลี่ยน backend (Sheets, Firebase, DB) ได้ที่ตรงนี้ที่เดียว
const Service={
 async load(){
  await new Promise(r=>setTimeout(r,200));
  try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.products))return Object.assign(seed(),d)}catch(e){}
  return seed();
 },
 async save(d){
  try{localStorage.setItem(KEY,JSON.stringify(d));return true}
  catch(e){toast('บันทึกไม่สำเร็จ พื้นที่เก็บข้อมูลเต็ม ลองลดจำนวนหรือขนาดรูปสินค้า');return false}
 }
};

let D=null;
let tt;
function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(tt);tt=setTimeout(()=>e.style.display='none',2400)}

// ป้ายชื่อตัวเลือก — ข้ามช่องที่ว่าง
const vlabel=v=>{const s=[T(v.size),T(v.size)?T(v.sizeUnit):''].filter(Boolean).join(' ');return [s,T(v.packaging)].filter(Boolean).join(' / ')||'ตัวเลือกมาตรฐาน'};
// ตัวเลือกที่เปิดให้ลูกค้าเห็น (สูงสุด MAXV)
const shown=p=>(p.variants||[]).filter(v=>v.status).sort(bySort).slice(0,MAXV);
// สินค้าที่ลูกค้าสั่งได้: เปิดแสดง และ (ไม่มีตัวเลือกเลย หรือมีตัวเลือกที่เปิดอยู่)
const avail=p=>!!p.status&&((p.variants||[]).length===0||shown(p).length>0);
