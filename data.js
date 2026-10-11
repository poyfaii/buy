// data.js — ข้อมูลและฟังก์ชันที่ใช้ร่วมกัน (หน้าร้าน + หน้าผู้ดูแล)
// ถ้าจะเปลี่ยนที่เก็บข้อมูลเป็น Google Sheets / Firebase / ฐานข้อมูล ให้แก้เฉพาะ Service ด้านล่าง
const WEB_VER='v20';
const IS_ADMIN=/admin/i.test(location.pathname);
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
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
 star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 flame:'<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-.5-5 1-8z"/>',
 pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
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
 let r;
 try{r=await fetch(url,Object.assign({signal:c.signal},opt))}
 catch(e){clearTimeout(t);throw new Error(e&&e.name==='AbortError'?'เชื่อมต่อช้าเกินไป กรุณาลองใหม่':IS_ADMIN?'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต และตรวจว่า URL ใน config.js ถูกต้อง':'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง')}
 try{return await r.json()}
 catch(e){throw new Error(IS_ADMIN?'ระบบหลังบ้านตอบกลับผิดปกติ — ตรวจการ Deploy ว่าตั้ง "ผู้มีสิทธิ์เข้าถึง = ทุกคน" และใช้ URL ที่ลงท้าย /exec':'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งภายหลัง')}
 finally{clearTimeout(t)}
}
// แปลข้อความผิดพลาดจากหลังบ้านให้เข้าใจง่าย
const friendly=m=>/^(unauthorized|unknown action)$/.test(m||'')?(IS_ADMIN?'Code.gs ที่ Deploy ไว้ยังเป็นเวอร์ชันเก่า (ต้อง Deploy เป็นเวอร์ชันใหม่)':'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งภายหลัง'):m;
const api=async body=>{
 const j=await net(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
 if(!j||!j.ok)throw new Error((j&&j.error)||'ระบบตอบกลับผิดปกติ');
 return j;
};
const norm=d=>{ // เติมค่าที่ขาดให้ครบ
 const r=Object.assign({fbUrl:'',units:[],packs:[],products:[],sales:{}},d);r.hasSales=!!(d&&d.sales&&typeof d.sales==='object');r.showPrice=true;if(!r.sales||typeof r.sales!=='object')r.sales={};
 if(!T(r.fbUrl)||r.fbUrl==='https://www.facebook.com/')r.fbUrl=FB_DEFAULT;
 r.products.forEach(p=>{p.variants=p.variants||[];p.status=p.status!==false});
 return r;
};
// ---- คำสั่งซื้อ / ข้อมูลลูกค้า ----
const ORDKEY='mdr_orders_v1';
const normPhone=s=>{let x=String(s??'').replace(/\D/g,'');if(x.length===11&&x.startsWith('66'))x='0'+x.slice(2);return x};
const nameKey=s=>String(s??'').replace(/\s+/g,'').toLowerCase().replace(/^(คุณ|นางสาว|น\.ส\.|นาย|นาง)/,'');
const localOrders=()=>{try{const a=JSON.parse(localStorage.getItem(ORDKEY));return Array.isArray(a)?a:[]}catch(e){return[]}};
// สินค้าขายดี: นับจำนวนออเดอร์ที่มีสินค้านั้น (เท่ากันดูจำนวนรวม) เอา 6 อันดับแรก
const topFrom=orders=>{const m={};orders.slice(-500).forEach(o=>(o.items||[]).forEach(i=>{if(!i.pid)return;const x=m[i.pid]||(m[i.pid]={n:0,q:0});x.n++;x.q+=Number(i.qty)||0}));
 const seen=new Set();return Object.keys(m).sort((a,b)=>m[b].n-m[a].n||m[b].q-m[a].q).slice(0,6)};
// ยอดขายต่อสินค้า: {รหัสสินค้า:{n:จำนวนออเดอร์, u:{ถุง:จำนวน, ลัง:จำนวน}}} (ข้ามออเดอร์ที่ status = ยกเลิก)
const salesFrom=orders=>{const m={};orders.forEach(o=>{if(o.status==='ยกเลิก')return;const seen={};(o.items||[]).forEach(i=>{if(!i.pid)return;const x=m[i.pid]||(m[i.pid]={n:0,u:{}});if(!seen[i.pid]){seen[i.pid]=1;x.n++}const un=T(i.unit)||'ชิ้น';x.u[un]=(x.u[un]||0)+(Number(i.qty)||0)});});return m};
let CRED=null;
try{CRED=JSON.parse(sessionStorage.getItem(CREDKEY))}catch(e){}
const Service={
 // หน้าลูกค้า (ไม่มีราคา เฉพาะสินค้าที่เปิดแสดง)
 async load(){
  if(!REMOTE){
   await new Promise(r=>setTimeout(r,200));
   try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.products)){const r=norm(Object.assign(seed(),d));r.top=topFrom(localOrders());r.sales=salesFrom(localOrders());return r}}catch(e){}
   {const r=seed();r.top=topFrom(localOrders());r.sales=salesFrom(localOrders());return r}
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
 // คำสั่งซื้อจากหน้าร้าน (ไม่ต้องล็อกอิน) — บันทึกซ้ำด้วย orderId เดิมได้ ไม่เกิดรายการซ้ำ
 async diag(){
  if(!REMOTE)return{local:true};
  return api(Object.assign({action:'diag'},CRED));
 },
 async placeOrder(o){
  if(!REMOTE){
   const a=localOrders().filter(x=>x.orderId!==o.orderId);a.push(Object.assign({createdAt:new Date().toISOString().slice(0,19).replace('T',' '),status:'ใหม่'},o));
   try{localStorage.setItem(ORDKEY,JSON.stringify(a.slice(-200)))}catch(e){throw new Error('พื้นที่เก็บข้อมูลเต็ม')}
   return{ok:true,orderId:o.orderId};
  }
  try{return await api({action:'order',order:o})}catch(e){throw new Error(friendly(e.message))}
 },
 // ดึงข้อมูลลูกค้าเดิม: ต้องตรงทั้งเบอร์โทรและชื่อ
 async lookup(phone,name){
  if(!REMOTE){
   const p=normPhone(phone),n=nameKey(name);
   const l=localOrders().filter(x=>normPhone(x.phone)===p&&n&&nameKey(x.name)===n);
   if(!l.length)return{ok:true,found:false};
   const x=l[l.length-1];
   const history=l.filter(o=>o.status!=='ยกเลิก'&&(o.items||[]).length).slice(-3).reverse().map(o=>({orderId:o.orderId,createdAt:o.createdAt,items:o.items}));
   return{ok:true,found:true,customer:{name:x.name,prov:x.prov,amp:x.amp,tam:x.tam,zip:x.zip,addr:x.addr},items:x.items||[],history};
  }
  return api({action:'lookup',phone:phone,name:name});
 },
 // ยอดขายล่าสุด (เบามาก ใช้รีเฟรชบนหน้าร้านโดยไม่โหลดสินค้าใหม่)
 async sales(){
  if(!REMOTE){const o=localOrders();return{top:topFrom(o),sales:salesFrom(o)}}
  const j=await net(API_URL+(API_URL.includes('?')?'&':'?')+'action=sales',{},15000);
  if(!j||!j.ok)throw new Error('no sales');
  return j;
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
 async listOrders(){
  if(!REMOTE)return localOrders().slice().reverse();
  try{return(await api(Object.assign({action:'listOrders'},CRED))).orders||[]}
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

// หน่วยนับจำนวนที่ล็อกตามขนาดสินค้า: ขนาดเป็นน้ำหนัก (กรัม/กิโลกรัม) = ถุง, ยกลัง = ลัง
const WUNITS=['กรัม','กิโลกรัม','มิลลิกรัม'];
const qunit=v=>{if(!v)return'';const s=T(v.size),u=T(v.sizeUnit),pk=T(v.packaging);if(/ลัง/.test(s+u+pk))return'ลัง';return WUNITS.includes(u)?'ถุง':''};
// รูปประกอบเริ่มต้นตามหมวด (ฝังในโค้ด ไม่ต้องอัปโหลดไฟล์รูป) — ใช้เมื่อสินค้ายังไม่มีรูปของตัวเอง
// อัปโหลดรูปจริงในหน้าแอดมิน หรือวางลิงก์รูปในคอลัมน์ image ของชีต แล้วรูปจริงจะแทนรูปนี้ทันที
const DEFIMG={
 banana:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23fff4c9%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cg%20stroke=%22%23b88a10%22%20stroke-width=%223%22%20stroke-linejoin=%22round%22%20stroke-linecap=%22round%22%3E%3Cpath%20d=%22M52%20128%20C34%2084%2066%2040%20122%2034%20C132%2033%20136%2044%20128%2049%20C92%2064%2084%20100%20100%20132%20C104%20141%2096%20148%2088%20147%20C72%20145%2058%20138%2052%20128%20Z%22%20fill=%22%23f7d33f%22/%3E%3Cpath%20d=%22M74%20142%20C58%20104%2082%2062%20134%2052%20C144%2050%20148%2061%20140%2066%20C106%2080%20100%20112%20114%20140%20C118%20148%20110%20154%20102%20153%20C90%20152%2079%20149%2074%20142%20Z%22%20fill=%22%23fbe36a%22/%3E%3Cpath%20d=%22M96%20152%20C84%20122%20102%2086%20148%2072%20C158%2069%20162%2080%20154%2085%20C124%2098%20118%20124%20128%20148%20C131%20156%20124%20160%20116%20159%20C108%20159%20100%20157%2096%20152%20Z%22%20fill=%22%23f7d33f%22/%3E%3C/g%3E%3Cpath%20d=%22M118%2036%20l8%20-10%20l9%204%20l-6%2011%20z%22%20fill=%22%237a5a2a%22%20stroke=%22%235b4220%22%20stroke-width=%222.5%22%20stroke-linejoin=%22round%22/%3E%3Cpath%20d=%22M62%20118%20C68%20100%2080%2084%2098%2070%22%20fill=%22none%22%20stroke=%22%23fff%22%20stroke-width=%224%22%20stroke-linecap=%22round%22%20opacity=%22.55%22/%3E%3C/svg%3E',
 taro:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23f1e9f6%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22110%22%20rx=%2258%22%20ry=%2248%22%20fill=%22%238b6b4c%22%20stroke=%22%235f4730%22%20stroke-width=%223%22/%3E%3Cpath%20d=%22M48%20104%20Q100%20124%20152%20104%20M52%20124%20Q100%20144%20148%20124%20M60%2088%20Q100%20104%20140%2088%20M72%2072%20Q100%2082%20128%2072%22%20fill=%22none%22%20stroke=%22%235f4730%22%20stroke-width=%223%22%20stroke-linecap=%22round%22/%3E%3Cpath%20d=%22M118%2092%20C138%2080%20170%2086%20176%20108%20C180%20130%20156%20150%20128%20146%20C112%20140%20106%20104%20118%2092Z%22%20fill=%22%23fbf6ee%22%20stroke=%22%23cdbfae%22%20stroke-width=%223%22/%3E%3Cg%20fill=%22%238e5bb5%22%20opacity=%22.85%22%3E%3Ccircle%20cx=%22134%22%20cy=%22104%22%20r=%223.4%22/%3E%3Ccircle%20cx=%22152%22%20cy=%22100%22%20r=%223%22/%3E%3Ccircle%20cx=%22144%22%20cy=%22120%22%20r=%223.6%22/%3E%3Ccircle%20cx=%22160%22%20cy=%22118%22%20r=%223%22/%3E%3Ccircle%20cx=%22130%22%20cy=%22126%22%20r=%223%22/%3E%3Ccircle%20cx=%22150%22%20cy=%22136%22%20r=%222.8%22/%3E%3C/g%3E%3C/svg%3E',
 sweetpotato:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23f3e6f5%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cg%20transform=%22rotate(-24%20100%20104)%22%3E%3Cpath%20d=%22M26%20108%20C26%2082%2062%2070%20100%2072%20C138%2074%20172%2086%20176%20106%20C178%20128%20140%20142%20100%20140%20C58%20140%2026%20132%2026%20108Z%22%20fill=%22%237d3f93%22%20stroke=%22%23512563%22%20stroke-width=%223.5%22%20stroke-linejoin=%22round%22/%3E%3Cpath%20d=%22M44%2096%20C70%2088%20108%2086%20150%2096%22%20fill=%22none%22%20stroke=%22%23a36bbb%22%20stroke-width=%225%22%20stroke-linecap=%22round%22%20opacity=%22.7%22/%3E%3Cpath%20d=%22M60%20118%20q12%205%2022%200%20M110%20124%20q12%204%2022%20-1%22%20fill=%22none%22%20stroke=%22%23512563%22%20stroke-width=%222.5%22%20stroke-linecap=%22round%22%20opacity=%22.6%22/%3E%3C/g%3E%3Cellipse%20cx=%22146%22%20cy=%22142%22%20rx=%2234%22%20ry=%2230%22%20fill=%22%23fff3da%22%20stroke=%22%23512563%22%20stroke-width=%223.5%22/%3E%3Cellipse%20cx=%22146%22%20cy=%22142%22%20rx=%2224%22%20ry=%2220%22%20fill=%22none%22%20stroke=%22%23b985d0%22%20stroke-width=%225%22/%3E%3Cellipse%20cx=%22146%22%20cy=%22142%22%20rx=%2210%22%20ry=%228%22%20fill=%22%23e6c6f0%22/%3E%3C/svg%3E',
 potato:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23f8eedb%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cpath%20d=%22M38%20112%20C34%2078%2066%2056%20104%2058%20C146%2058%20172%2080%20166%20114%20C160%20146%20124%20160%2088%20156%20C58%20152%2040%20136%2038%20112Z%22%20fill=%22%23d8b074%22%20stroke=%22%239a7338%22%20stroke-width=%223.5%22%20stroke-linejoin=%22round%22/%3E%3Cpath%20d=%22M60%2086%20C74%2072%2094%2068%20112%2070%22%20fill=%22none%22%20stroke=%22%23f0d6a3%22%20stroke-width=%225%22%20stroke-linecap=%22round%22%20opacity=%22.8%22/%3E%3Cg%20fill=%22%239a7338%22%20opacity=%22.8%22%3E%3Cellipse%20cx=%2278%22%20cy=%22112%22%20rx=%224.5%22%20ry=%223%22/%3E%3Cellipse%20cx=%22116%22%20cy=%2298%22%20rx=%224%22%20ry=%222.8%22/%3E%3Cellipse%20cx=%22132%22%20cy=%22130%22%20rx=%224.5%22%20ry=%223%22/%3E%3Cellipse%20cx=%2298%22%20cy=%22136%22%20rx=%223.6%22%20ry=%222.6%22/%3E%3Cellipse%20cx=%22148%22%20cy=%22104%22%20rx=%223.2%22%20ry=%222.4%22/%3E%3C/g%3E%3C/svg%3E',
 carrot:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23ffe9d8%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cg%20transform=%22rotate(32%20100%20100)%22%3E%3Cpath%20d=%22M92%2054%20C60%2054%2054%2070%2060%2090%20L98%20188%20C100%20192%20104%20192%20106%20188%20L144%2090%20C150%2070%20140%2054%20108%2054Z%22%20fill=%22%23f28a24%22%20stroke=%22%23b25a0c%22%20stroke-width=%223.5%22%20stroke-linejoin=%22round%22%20transform=%22translate(0%20-6)%22/%3E%3Cpath%20d=%22M78%2084%20h22%20M118%2098%20h22%20M82%20118%20h20%20M112%20140%20h16%20M92%20160%20h12%22%20stroke=%22%23b25a0c%22%20stroke-width=%223%22%20stroke-linecap=%22round%22%20opacity=%22.6%22%20transform=%22translate(0%20-6)%22/%3E%3Cg%20stroke=%22%233d8f3a%22%20stroke-width=%223.5%22%20stroke-linejoin=%22round%22%20fill=%22%2358b04f%22%3E%3Cpath%20d=%22M100%2046%20C86%2030%2082%2014%2092%206%20C104%2014%20106%2032%20100%2046Z%22/%3E%3Cpath%20d=%22M100%2046%20C112%2028%20124%2020%20134%2024%20C130%2038%20118%2046%20100%2046Z%22/%3E%3Cpath%20d=%22M100%2046%20C86%2034%2070%2032%2062%2038%20C68%2048%2082%2050%20100%2046Z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E',
 pumpkin:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23fff0cf%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cpath%20d=%22M30%20116%20C30%2074%2064%2052%20100%2052%20C136%2052%20170%2074%20170%20116%20C170%20148%20136%20166%20100%20166%20C64%20166%2030%20148%2030%20116Z%22%20fill=%22%233f7a46%22%20stroke=%22%232a5a31%22%20stroke-width=%223.5%22/%3E%3Cpath%20d=%22M62%2062%20C48%2082%2046%20140%2066%20160%20M100%2054%20C88%2080%2088%20140%20100%20164%20M138%2062%20C152%2082%20154%20140%20134%20160%22%20fill=%22none%22%20stroke=%22%232a5a31%22%20stroke-width=%223%22%20opacity=%22.55%22/%3E%3Cpath%20d=%22M104%2096%20C128%2078%20168%2090%20168%20118%20C168%20146%20134%20164%20100%20160%20C94%20130%2096%20108%20104%2096Z%22%20fill=%22%23f9a52a%22%20stroke=%22%23c97812%22%20stroke-width=%223%22/%3E%3Cpath%20d=%22M118%20108%20C132%20102%20150%20108%20154%20120%20M116%20126%20C130%20122%20146%20126%20150%20136%22%20fill=%22none%22%20stroke=%22%23fdd28a%22%20stroke-width=%224%22%20stroke-linecap=%22round%22/%3E%3Cg%20fill=%22%23fff4d4%22%20opacity=%22.9%22%3E%3Ccircle%20cx=%22132%22%20cy=%22116%22%20r=%222.4%22/%3E%3Ccircle%20cx=%22142%22%20cy=%22130%22%20r=%222.4%22/%3E%3Ccircle%20cx=%22124%22%20cy=%22138%22%20r=%222.4%22/%3E%3C/g%3E%3Cpath%20d=%22M96%2052%20C94%2038%20100%2030%20112%2028%20C112%2038%20108%2048%20104%2054Z%22%20fill=%22%236b8f3a%22%20stroke=%22%234a6a24%22%20stroke-width=%223%22/%3E%3C/svg%3E',
 default:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20width=%22200%22%20height=%22200%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23eaf6ec%22/%3E%3Cellipse%20cx=%22100%22%20cy=%22176%22%20rx=%2262%22%20ry=%229%22%20fill=%22%23000%22%20opacity=%22.08%22/%3E%3Cg%20fill=%22none%22%20stroke=%22%232f9457%22%20stroke-width=%225%22%20stroke-linejoin=%22round%22%20stroke-linecap=%22round%22%3E%3Cpath%20d=%22M164%2066%20100%2034%2036%2066v68l64%2032%2064-32z%22%20fill=%22%23fff%22/%3E%3Cpath%20d=%22M36%2066l64%2032%2064-32M100%2098v68%22/%3E%3C/g%3E%3C/svg%3E',
};
const DEFIMG_RULES=[[/^พักทอง/,'pumpkin'],[/^กล้วย/,'banana'],[/^เผือก/,'taro'],[/^มันฝรั่ง/,'potato'],[/^มันแครอท/,'carrot'],[/^มัน/,'sweetpotato']];
const defImg=name=>{const n=String(name||'').trim();const r=DEFIMG_RULES.find(x=>x[0].test(n));return DEFIMG[r?r[1]:'default']};
const imgOf=p=>(p&&p.image)||defImg(p&&p.name);
// ข้อความยอดขาย เช่น "ขายแล้ว 120 ถุง · 3 ลัง" (ว่างถ้ายังไม่มียอด)
const soldParts=pid=>{const x=D&&D.sales&&D.sales[pid];if(!x)return[];const u=x.u||{};return Object.keys(u).filter(k=>u[k]>0).sort((a,b)=>(a==='ถุง'?-1:b==='ถุง'?1:0)).map(k=>u[k].toLocaleString('th-TH')+' '+k)};
const soldText=pid=>{const a=soldParts(pid);return a.length?'ขายแล้ว '+a.join(' · '):''};
const soldOrders=pid=>{const x=D&&D.sales&&D.sales[pid];return x?x.n:0};
// ราคา: แสดงทุกตัวเลือกเสมอ — ตัวเลือกที่ยังไม่กรอกราคา แสดงเป็น "$$$ บาท" (โดยประมาณ)
const money=n=>Number(n).toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท';
const hasP=v=>!!(v&&v.price!==''&&v.price!=null&&!isNaN(Number(v.price)));
const mh=v=>hasP(v)?`<b>${Number(v.price).toLocaleString('th-TH',{maximumFractionDigits:2})}</b> <small>บาท</small>`:`<b class="pq">$$$</b> <small>บาท</small>`;
const minPrice=p=>{const a=shown(p).filter(hasP).map(v=>Number(v.price));return a.length?Math.min(...a):null};
// รายการโปรด (ติดดาว) เก็บในเครื่องลูกค้า
const FAVKEY='mdr_fav_v1';
let FAV=new Set();try{FAV=new Set(JSON.parse(localStorage.getItem(FAVKEY))||[])}catch(e){}
const isFav=id=>FAV.has(id);
const saveFav=()=>{try{localStorage.setItem(FAVKEY,JSON.stringify([...FAV]))}catch(e){}};
// ป้ายชื่อตัวเลือก — ข้ามช่องที่ว่าง
const vlabel=v=>{const s=[T(v.size),T(v.size)?T(v.sizeUnit):''].filter(Boolean).join(' ');return [s,T(v.packaging)].filter(Boolean).join(' / ')||'ตัวเลือกมาตรฐาน'};
// ตัวเลือกที่เปิดให้ลูกค้าเห็น (สูงสุด MAXV)
const shown=p=>(p.variants||[]).filter(v=>v.status).sort(bySort).slice(0,MAXV);
// สินค้าที่ลูกค้าสั่งได้: เปิดแสดง และ (ไม่มีตัวเลือกเลย หรือมีตัวเลือกที่เปิดอยู่)
const avail=p=>!!p.status&&((p.variants||[]).length===0||shown(p).length>0);

// เลขที่คำสั่งซื้อ เช่น MD-261006-K3F9 (สร้างที่หน้าร้าน ใช้ส่งซ้ำได้โดยไม่เกิดรายการซ้ำ)
const newOrderId=()=>{const t=new Date(),p=n=>String(n).padStart(2,'0');return 'MD-'+String(t.getFullYear()).slice(2)+p(t.getMonth()+1)+p(t.getDate())+'-'+Math.random().toString(36).slice(2,6).toUpperCase()};
