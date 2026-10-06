// data.js — ข้อมูลและฟังก์ชันที่ใช้ร่วมกัน (หน้าร้าน + หน้าผู้ดูแล)
// ถ้าจะเปลี่ยนที่เก็บข้อมูลเป็น Google Sheets / Firebase / ฐานข้อมูล ให้แก้เฉพาะ Service ด้านล่าง
const KEY='mdr_data_v1',CKEY='mdr_cart_v1',UKEY='mdr_cust_v1',MAXV=5;
const FB_DEFAULT='https://www.facebook.com/share/1C4DTWS3ef/?mibextid=wwXIfr'; // ลิงก์เพจ Facebook ของบริษัท
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
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 dots:'<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>'
};
const ic=(n,s=20)=>`<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_I[n]||''}</svg>`;

// ตัวเลือกสินค้า (Variant) — ทุกช่องไม่บังคับ
const mkV=(size='',sizeUnit='',packaging='',price='',i=0)=>({id:uid(),size,sizeUnit,packaging,price,status:true,sortOrder:i});

// ข้อความหมายเหตุราคา (แสดงที่หน้ารายละเอียดสินค้า — แก้ได้รายสินค้าในหน้าแอดมิน)
const PRICE_NOTE='ราคาอาจมีการปรับเปลี่ยน กรุณายืนยันราคากับทางร้านในแชต Facebook ก่อนสั่งซื้อ';
const noteOf=p=>p.note===undefined?PRICE_NOTE:T(p.note);
// ชุดขนาดมาตรฐานของสินค้าทุกรายการ
const SIZES=[['500','กรัม'],['1','กิโลกรัม'],['ยกลัง','']];
const defVariants=()=>SIZES.map((s,i)=>mkV(s[0],s[1],'','',i));
// รายการสินค้าเริ่มต้น (ตามใบรายการสินค้า) — แก้/เพิ่ม/ลบได้ในหน้าแอดมิน
const NAMES=[
 'พักทองอบเนย',
 'พักทอง ไม่หวาน',
 'กล้วยเบรกแตก',
 'กล้วย รสปาปริก้า',
 'กล้วยฉาบหวาน',
 'กล้วยอบเนย',
 'กล้วยม้วน',
 'กล้วยเส้น สมุนไพร',
 'กล้วยเส้น ปาปริก้า',
 'กล้วยม้วน รสปาปริก้า',
 'กล้วยฉาบเค็ม',
 'กล้วยฉาบน้ำตาล',
 'เผือกเส้นเค็ม',
 'เผือกแผ่น อบเนย',
 'มันม่วง อบเนย',
 'มันม่วง ไม่หวาน',
 'มันม่วงเส้นเค็ม',
 'มันไข่อบเนย',
 'มันไข่เส้นเค็ม',
 'มันฝรั่ง รสปาปริก้า',
 'มันแครอท อบเนย',
 'กล้วย รสสไปซี่',
 'กล้วย รสต้มยำ',
 'กล้วยทอดไส้มะขาม',
 'กล้วย ไส้มะพร้าว',
 'กล้วย ไส้สับปะรด',
 'กล้วย ไส้สตรอเบอร์รี่',
 'กล้วย รสบาร์บีคิว',
 'กล้วย รสวิงแซ่บ',
 'กล้วย รสโนริสาหร่าย',
 'กล้วย รสชีส',
 'กล้วย รสกุ้งล็อบเตอร์',
 'กล้วย รสหม่าล่า',
 'กล้วย รสลาบ',
 'กล้วย รสหมึกย่าง',
 'กล้วย รสซาวด์ครีม',
 'กล้วย รสไก่แซ่บ',
 'กล้วย รสไข่เค็ม',
 'เผือก ไส้มะขาม',
 'กล้วยฉาบจืด',
 'กล้วยฉาบเค็ม ไม่ใส่ใบเตย',
 'มันฝรั่ง รสซาวด์ครีม',
 'มันฝรั่ง พริกไทยดำ',
 'มันฝรั่ง รสพิซซ่า',
 'มันฝรั่ง รสเบคอน',
 'มันฝรั่ง รสมะเขือเทศ',
 'มันฝรั่ง รสสวีทคอร์น',
 'กล้วยเบรกแตก ไม่ใส่ใบเตย',
 'มันฝรั่ง รสเนยกระเทียม'
];
function seed(){
 const P=NAMES.map((n,i)=>({id:'p'+(i+1),name:n,description:'',image:'',status:true,sortOrder:i,
  variants:SIZES.map((s,j)=>({id:'p'+(i+1)+'v'+(j+1),size:s[0],sizeUnit:s[1],packaging:'',price:'',status:true,sortOrder:j}))}));
 return{fbUrl:FB_DEFAULT,units:['กรัม','กิโลกรัม','มิลลิกรัม','มิลลิลิตร','ลิตร','ถุง','ห่อ','กล่อง','ลัง','แพ็ก','ชุด'],packs:['ถุง','ห่อ','กล่อง','ลัง','แพ็ก','ชุด'],products:P};
}

// Data service: เปลี่ยน backend ได้ที่ตรงนี้ที่เดียว
// - API_URL ว่าง  = เก็บในเบราว์เซอร์ (localStorage) โหมดทดลอง
// - API_URL มีค่า = อ่าน/เขียน Google Sheets ผ่าน Apps Script (Code.gs)
const REMOTE=typeof API_URL!=='undefined'&&!!API_URL;
const PUBKEY='mdr_pub_cache_v1',CREDKEY='mdr_admin_cred';
async function net(url,opt,ms=30000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,Object.assign({signal:c.signal},opt));return await r.json()}
 catch(e){throw new Error(e&&e.name==='AbortError'?'เชื่อมต่อช้าเกินไป กรุณาลองใหม่':'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')}
 finally{clearTimeout(t)}
}
const api=async body=>{
 const j=await net(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
 if(!j||!j.ok)throw new Error((j&&j.error)||'ระบบตอบกลับผิดปกติ');
 return j;
};
const norm=d=>{ // เติมค่าที่ขาดให้ครบ
 const r=Object.assign({fbUrl:'',units:[],packs:[],products:[]},d);
 if(!T(r.fbUrl)||r.fbUrl==='https://www.facebook.com/')r.fbUrl=FB_DEFAULT;
 r.products.forEach(p=>{p.variants=p.variants||[];p.status=p.status!==false});
 return r;
};
let CRED=null;
try{CRED=JSON.parse(sessionStorage.getItem(CREDKEY))}catch(e){}
const Service={
 // หน้าลูกค้า (ไม่มีราคา เฉพาะสินค้าที่เปิดแสดง)
 async load(){
  if(!REMOTE){
   await new Promise(r=>setTimeout(r,200));
   try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.products))return norm(Object.assign(seed(),d))}catch(e){}
   return seed();
  }
  try{
   const j=await net(API_URL+(API_URL.includes('?')?'&':'?')+'action=list');
   if(!j||!j.ok)throw new Error((j&&j.error)||'ระบบตอบกลับผิดปกติ');
   try{localStorage.setItem(PUBKEY,JSON.stringify(j))}catch(e){}
   return norm(j);
  }catch(e){
   // เน็ตมีปัญหา: ใช้ข้อมูลล่าสุดที่เคยโหลดไว้ (ถ้ามี)
   try{const c=JSON.parse(localStorage.getItem(PUBKEY));if(c&&Array.isArray(c.products)){const r=norm(c);r.stale=true;return r}}catch(x){}
   throw e;
  }
 },
 // หน้าแอดมิน
 async login(u,p){
  if(!REMOTE){
   const lu=typeof LOCAL_ADMIN_USER!=='undefined'?LOCAL_ADMIN_USER:'admin',lp=typeof LOCAL_ADMIN_PASS!=='undefined'?LOCAL_ADMIN_PASS:'1234';
   return u===lu&&p===lp;
  }
  try{await api({action:'login',user:u,pass:p});CRED={user:u,pass:p};try{sessionStorage.setItem(CREDKEY,JSON.stringify(CRED))}catch(e){}return true}
  catch(e){if(e.message==='unauthorized')return false;throw e}
 },
 logout(){CRED=null;try{sessionStorage.removeItem(CREDKEY)}catch(e){}},
 hasSession(){return REMOTE?!!CRED:false},
 async loadAdmin(){
  if(!REMOTE)return Service.load();
  try{return norm(await api(Object.assign({action:'listAll'},CRED)))}
  catch(e){if(e.message==='unauthorized')Service.logout();throw e}
 },
 async save(d){
  if(!REMOTE){
   try{localStorage.setItem(KEY,JSON.stringify(d));return true}
   catch(e){throw new Error('พื้นที่เก็บข้อมูลเต็ม ลองลดจำนวนหรือขนาดรูปสินค้า')}
  }
  try{
   const j=await api(Object.assign({action:'save',data:Object.assign({},d,{allowEmpty:!d.products.length})},CRED));
   Object.keys(j.images||{}).forEach(id=>{const p=d.products.find(x=>x.id===id);if(p)p.image=j.images[id]});
   return true;
  }catch(e){if(e.message==='unauthorized')Service.logout();throw e}
 }
};

let D=null;
let tt;
function toast(t,ms=2400){const e=$('#toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(tt);tt=setTimeout(()=>e.style.display='none',ms)}

// ป้ายชื่อตัวเลือก — ข้ามช่องที่ว่าง
const vlabel=v=>{const s=[T(v.size),T(v.size)?T(v.sizeUnit):''].filter(Boolean).join(' ');return [s,T(v.packaging)].filter(Boolean).join(' / ')||'ตัวเลือกมาตรฐาน'};
// ตัวเลือกที่เปิดให้ลูกค้าเห็น (สูงสุด MAXV)
const shown=p=>(p.variants||[]).filter(v=>v.status).sort(bySort).slice(0,MAXV);
// สินค้าที่ลูกค้าสั่งได้: เปิดแสดง และ (ไม่มีตัวเลือกเลย หรือมีตัวเลือกที่เปิดอยู่)
const avail=p=>!!p.status&&((p.variants||[]).length===0||shown(p).length>0);
