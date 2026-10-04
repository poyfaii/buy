// shop.js — หน้าลูกค้า (ไม่แสดงราคา — คุยราคาในแชต Facebook)
const PAGE=24;
let cart=[],q='',view='shop',modal=null,errs={},msg='',limit=PAGE,cust={name:'',phone:'',addr:'',note:''};
try{cart=JSON.parse(localStorage.getItem(CKEY))||[]}catch(e){}
try{const u=JSON.parse(localStorage.getItem(UKEY));if(u)Object.assign(cust,{name:u.name||'',phone:u.phone||'',addr:u.addr||''})}catch(e){}
const saveCart=()=>{try{localStorage.setItem(CKEY,JSON.stringify(cart))}catch(e){}};
const saveCust=()=>{try{localStorage.setItem(UKEY,JSON.stringify({name:cust.name,phone:cust.phone,addr:cust.addr}))}catch(e){}};
const prod=id=>D&&D.products.find(p=>p.id===id);
const clampQ=n=>Math.max(1,Math.min(999,parseInt(n)||1));

// รายการในตะกร้าที่ยังสั่งได้อยู่ (กันกรณีร้านซ่อนสินค้า/ตัวเลือกไปแล้ว)
function items(){
 if(!D)return[];
 return cart.map(c=>{
  const p=prod(c.pid);if(!p||!avail(p))return null;
  let v=null;
  if(c.vid){v=p.variants.find(x=>x.id===c.vid);if(!v||!v.status)return null}
  else if(shown(p).length)return null;
  return{pid:c.pid,vid:c.vid||null,qty:c.qty,p,v};
 }).filter(Boolean);
}
const count=()=>items().length;

const STEPS=['เลือกสินค้า','รายการสั่งซื้อ','ข้อมูลผู้สั่ง','ตรวจสอบ','ส่ง Facebook'],SI={shop:0,cart:1,info:2,review:3,done:4};
const BACK={cart:'shop',info:'cart',review:'info'};

function head(){
 const n=count();
 return `<header class="top"><div class="bar"><div class="logo">${ic('box',22)}</div><h1 class="brand"><b>บริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด</b></h1>
 <button class="cartbtn" onclick="go('cart')" aria-label="รายการสั่งซื้อ ${n} รายการ">${ic('cart')}<span class="hide-s">รายการสั่งซื้อ</span>${n?`<span class="badge">${n}</span>`:''}</button></div></header>`;
}
function fabHtml(){
 const n=count();
 if(!D||view!=='shop'||!n)return'';
 return `<div class="fabwrap"><button class="fab" onclick="go('cart')"><span>${ic('cart')} รายการสั่งซื้อ</span><span>${n} รายการ ${ic('chev')}</span></button></div>`;
}
const chrome=()=>{$('#hdr').innerHTML=head();$('#fab').innerHTML=fabHtml()};
const prog=()=>{const i=SI[view];return `<div class="prog"><div class="segs">${STEPS.map((s,k)=>`<i class="${k<i?'d':k===i?'c':''}"></i>`).join('')}</div><div class="plabel">ขั้นที่ ${i+1} จาก 5 · <b>${STEPS[i]}</b></div></div>`};
const hero=()=>`<section class="hero"><h2>สั่งซื้อสินค้าได้ง่ายๆ</h2><p>เลือกสินค้า เพิ่มลงรายการ แล้วส่งให้เราทาง Facebook</p><span class="hchip">${ic('info',16)} ราคาและยอดรวม คุยกันต่อในแชต</span></section>`;

function render(){
 chrome();
 let b;
 if(!D)b=`<div class="grid">${'<div class="sk"></div>'.repeat(6)}</div>`;
 else b=({shop:shopBody,cart:cartView,info:infoView,review:reviewView,done:doneView})[view]();
 const back=BACK[view]?`<button class="back" onclick="go('${BACK[view]}')">${ic('back')} ย้อนกลับ</button>`:'';
 $('#main').innerHTML=(view==='shop'?hero():back)+prog()+b;
 if(D&&view==='shop')grid();
}
function go(v){
 if(v==='info'&&!count()){toast('ยังไม่มีสินค้าในรายการสั่งซื้อ');return}
 view=v;errs={};render();scrollTo(0,0);
}

/* ---------- หน้าสินค้า ---------- */
function shopBody(){
 return `<div class="search">${ic('search')}<input id="q" class="inp" type="search" enterkeyhint="search" autocomplete="off" aria-label="ค้นหาสินค้า" placeholder="ค้นหาสินค้า..." value="${esc(q)}" oninput="q=this.value;limit=PAGE;grid()"></div><div id="gmeta" class="gmeta"></div><div id="grid" class="grid"></div><div id="gmore"></div>`;
}
function card(p){
 const n=shown(p).length;
 return `<article class="card"><button class="cimg" onclick="openP('${p.id}')" aria-label="เลือก ${esc(p.name)}">${p.image?`<img loading="lazy" decoding="async" src="${p.image}" alt="">`:`<span class="ph">${ic('box',40)}</span>`}</button>
 <div class="cbody"><h3>${esc(p.name)}</h3>${p.description?`<p class="desc">${esc(p.description)}</p>`:''}${n?`<span class="chip">${n} ขนาด</span>`:''}<button class="btn pri" onclick="openP('${p.id}')">เลือกสินค้า</button></div></article>`;
}
function grid(){
 const g=$('#grid');if(!g)return;
 const k=q.trim().toLowerCase();
 const all=D.products.filter(avail).sort(bySort),l=k?all.filter(p=>String(p.name).toLowerCase().includes(k)):all,vis=l.slice(0,limit);
 $('#gmeta').textContent=all.length?(k?`พบ ${l.length} จาก ${all.length} รายการ`:`สินค้าทั้งหมด ${all.length} รายการ`):'';
 if(!l.length){
  g.className='';
  g.innerHTML=`<div class="empty">${ic('box',44)}<p>${all.length?'ไม่พบสินค้าที่ค้นหา':'ขณะนี้ยังไม่มีสินค้า'}</p>${k?`<button class="btn" onclick="q='';$('#q').value='';grid()">ล้างการค้นหา</button>`:''}</div>`;
  $('#gmore').innerHTML='';return;
 }
 g.className='grid';
 g.innerHTML=vis.map(card).join('');
 $('#gmore').innerHTML=l.length>vis.length?`<button class="btn w lg" style="margin-top:16px" onclick="limit+=PAGE;grid()">แสดงเพิ่ม (อีก ${l.length-vis.length} รายการ)</button>`:'';
}

/* ---------- รายละเอียดสินค้า (modal) ---------- */
const qtyUI=(val,call)=>`<div class="qty"><button type="button" aria-label="ลดจำนวน" onclick="${call}-1)">−</button><input type="number" inputmode="numeric" min="1" max="999" value="${val}" aria-label="จำนวน" onchange="${call}0,this.value)"><button type="button" aria-label="เพิ่มจำนวน" onclick="${call}1)">+</button></div>`;
function openP(id){
 const p=prod(id);if(!p)return;
 const vs=shown(p);
 modal={pid:id,vid:vs.length===1?vs[0].id:null,qty:1,err:''};
 drawModal(true);
}
function closeP(){modal=null;drawModal()}
function pickV(id){modal.vid=id;modal.err='';drawModal();const e=document.querySelector('.opt[aria-checked=true]');e&&e.focus()}
function mq(d,v){modal.qty=v!==undefined?clampQ(v):clampQ(modal.qty+d);drawModal()}
function drawModal(first){
 const r=$('#mroot');
 if(!modal){r.innerHTML='';document.body.classList.remove('lock');return}
 const p=prod(modal.pid),vs=shown(p);
 const old=r.querySelector('.sbody'),st=old?old.scrollTop:0;
 r.innerHTML=`<div class="scrim" onclick="if(event.target===this)closeP()"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(p.name)}" tabindex="-1">
 <div class="shead"><h2>${esc(p.name)}</h2><button class="iconbtn" onclick="closeP()" aria-label="ปิด">${ic('x')}</button></div>
 <div class="sbody">${p.image?`<img class="simg" src="${p.image}" alt="${esc(p.name)}">`:''}${p.description?`<p class="sdesc">${esc(p.description)}</p>`:''}
 ${vs.length?`<div class="lbl">เลือกขนาด / บรรจุภัณฑ์</div><div class="opts" role="radiogroup" aria-label="ขนาดและบรรจุภัณฑ์">${vs.map(x=>`<button class="opt" role="radio" aria-checked="${x.id===modal.vid}" onclick="pickV('${x.id}')"><span class="radio"></span><span>${esc(vlabel(x))}</span></button>`).join('')}</div>`:''}
 ${modal.err?`<div class="err" role="alert">${modal.err}</div>`:''}
 <div class="lbl">จำนวน</div>${qtyUI(modal.qty,'mq(')}</div>
 <div class="sfoot"><button class="btn pri lg w" onclick="addCart()">${ic('cart')} เพิ่มลงรายการ</button></div></div></div>`;
 document.body.classList.add('lock');
 const nb=r.querySelector('.sbody');if(nb)nb.scrollTop=st;
 if(first){const s=r.querySelector('.sheet');s&&s.focus()}
}
function addCart(){
 const p=prod(modal.pid),vs=shown(p);
 if(vs.length&&!modal.vid){modal.err='กรุณาเลือกขนาดสินค้า';drawModal();return}
 const vid=vs.length?modal.vid:null,e=cart.find(c=>c.pid===modal.pid&&(c.vid||null)===vid);
 if(e)e.qty=Math.min(999,e.qty+modal.qty);else cart.push({pid:modal.pid,vid,qty:modal.qty});
 saveCart();closeP();chrome();toast('เพิ่มลงรายการเรียบร้อยแล้ว ✓');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal)closeP()});

/* ---------- รายการสั่งซื้อ ---------- */
const thumb=p=>p.image?`<img src="${p.image}" alt="" loading="lazy">`:`<span class="ph">${ic('box',28)}</span>`;
function cartView(){
 const l=items();
 if(!l.length)return `<div class="empty">${ic('cart',44)}<p>ยังไม่มีสินค้าในรายการสั่งซื้อ</p><button class="btn pri lg" onclick="go('shop')">เลือกสินค้า</button></div>`;
 return `<h2 class="h2">รายการสั่งซื้อ</h2>
 <div class="note">${ic('info',18)}<span>ไม่ต้องกังวลเรื่องราคา — ราคาและค่าจัดส่งคุยกันต่อในแชต Facebook หลังส่งคำสั่งซื้อ</span></div>
 <div class="list">${l.map(i=>`<div class="line"><div class="lthumb">${thumb(i.p)}</div><div class="linfo"><b>${esc(i.p.name)}</b>${i.v?`<div class="mu">${esc(vlabel(i.v))}</div>`:''}
 <div class="lctl">${qtyUI(i.qty,`cq('${i.pid}',${i.vid?`'${i.vid}'`:'null'},`)}<button class="btn sm dng" onclick="cdel('${i.pid}',${i.vid?`'${i.vid}'`:'null'})">${ic('trash',16)} ลบ</button></div></div></div>`).join('')}</div>
 <div class="stack"><button class="btn pri lg" onclick="go('info')">ถัดไป: ข้อมูลผู้สั่ง</button><button class="btn" onclick="go('shop')">+ เลือกสินค้าเพิ่ม</button></div>`;
}
function cq(pid,vid,d,v){const c=cart.find(x=>x.pid===pid&&(x.vid||null)===vid);if(!c)return;c.qty=v!==undefined?clampQ(v):clampQ(c.qty+d);saveCart();render()}
function cdel(pid,vid){cart=cart.filter(c=>!(c.pid===pid&&(c.vid||null)===vid));saveCart();render();toast('ลบรายการเรียบร้อยแล้ว')}

/* ---------- ข้อมูลผู้สั่ง ---------- */
function field(k,l,o={}){
 const bad=errs[k],id='c_'+k,a=bad?` aria-invalid="true" aria-describedby="e_${k}"`:'';
 const lab=`<label class="lbl" for="${id}">${l}${o.req?' <span class="req" aria-hidden="true">*</span>':''}</label>`;
 const inp=o.area
  ?`<textarea id="${id}" class="inp${bad?' bad':''}" rows="3" autocomplete="${o.ac||'off'}"${a} oninput="cust.${k}=this.value">${esc(cust[k])}</textarea>`
  :`<input id="${id}" class="inp${bad?' bad':''}" type="${o.t||'text'}"${o.t==='tel'?' inputmode="tel"':''} autocomplete="${o.ac||'off'}"${a} value="${esc(cust[k])}" oninput="cust.${k}=this.value">`;
 return `<div class="fld">${lab}${inp}${bad?`<div class="err" id="e_${k}" role="alert">${bad}</div>`:''}</div>`;
}
function infoView(){
 return `<h2 class="h2">ข้อมูลผู้สั่ง</h2><section class="sec">${field('name','ชื่อผู้สั่งซื้อ',{req:1,ac:'name'})}${field('phone','เบอร์โทรศัพท์',{req:1,t:'tel',ac:'tel'})}${field('addr','ที่อยู่จัดส่ง',{req:1,area:1,ac:'street-address'})}${field('note','หมายเหตุเพิ่มเติม (ไม่บังคับ)',{area:1})}</section>
 <div class="stack"><button class="btn pri lg" onclick="toReview()">ถัดไป: ตรวจสอบคำสั่งซื้อ</button></div>`;
}
function toReview(){
 document.activeElement&&document.activeElement.blur();
 errs={};
 if(!count()){toast('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');return go('shop')}
 if(!T(cust.name))errs.name='กรุณากรอกชื่อผู้สั่งซื้อ';
 if(!T(cust.phone))errs.phone='กรุณากรอกเบอร์โทรศัพท์';
 if(!T(cust.addr))errs.addr='กรุณากรอกที่อยู่จัดส่ง';
 if(Object.keys(errs).length){render();const k=['name','phone','addr'].find(x=>errs[x]);const e=k&&$('#c_'+k);e&&e.focus();return}
 saveCust();view='review';render();scrollTo(0,0);
}

/* ---------- ตรวจสอบ / ข้อความ ---------- */
function makeMsg(){
 const l=items();
 return `📦 คำสั่งซื้อสินค้า\nบริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด\n\n👤 ข้อมูลลูกค้า\n\nชื่อ: ${T(cust.name)}\nโทร: ${T(cust.phone)}\n\n🛍️ รายการสินค้า\n\n`
 +l.map((i,n)=>{
   const s=[T(i.v&&i.v.size),T(i.v&&i.v.size)?T(i.v.sizeUnit):''].filter(Boolean).join(' '),pk=i.v?T(i.v.packaging):'';
   return `${n+1}. ${i.p.name}`+(s?`\n   ขนาด: ${s}`:'')+(pk?`\n   บรรจุภัณฑ์: ${pk}`:'')+`\n   จำนวน: ${i.qty}`;
  }).join('\n\n')
 +`\n\n📍 ที่อยู่จัดส่ง\n\n${T(cust.addr)}\n\n📝 หมายเหตุ\n\n${T(cust.note)||'-'}\n\n💬 ขอสอบถามราคาและค่าจัดส่งในแชตนี้`;
}
function reviewView(){
 return `<h2 class="h2">ตรวจสอบคำสั่งซื้อ</h2>
 <section class="sec"><h3>ข้อมูลผู้สั่ง</h3><p style="margin-top:8px"><b>${esc(cust.name)}</b></p><p class="mu">โทร ${esc(cust.phone)}</p><p style="margin-top:8px">${esc(cust.addr)}</p>${T(cust.note)?`<p class="mu" style="margin-top:8px">หมายเหตุ: ${esc(cust.note)}</p>`:''}</section>
 <section class="sec"><h3>รายการสินค้า</h3>${items().map(i=>`<div class="sumrow"><div><b>${esc(i.p.name)}</b>${i.v?`<div class="mu">${esc(vlabel(i.v))}</div>`:''}</div><b>× ${i.qty}</b></div>`).join('')}</section>
 <div class="note">${ic('info',18)}<span>ราคาและยอดรวม คุยกันต่อในแชต Facebook</span></div>
 <div class="stack"><button class="btn pri lg" onclick="msg=makeMsg();view='done';render();scrollTo(0,0)">ยืนยันคำสั่งซื้อ</button><button class="btn" onclick="go('info')">แก้ไขข้อมูล</button></div>`;
}
function doneView(){
 return `<section class="sec" style="text-align:center;display:grid;justify-items:center;gap:6px"><div class="okmark">${ic('check',34)}</div><h2 class="h2" style="margin:6px 0 0">เตรียมคำสั่งซื้อเรียบร้อยแล้ว</h2><p class="mu">ระบบสร้างข้อความคำสั่งซื้อให้เรียบร้อย กรุณาส่งคำสั่งซื้อผ่าน Facebook ของบริษัท</p></section>
 <section class="sec"><h3>วิธีส่ง</h3><ol class="how"><li>กด “คัดลอกข้อความ”</li><li>กด “เปิด Facebook” เพื่อเข้าแชตของเพจ</li><li>วางข้อความ แล้วกดส่ง</li></ol><pre id="msgbox">${esc(msg)}</pre></section>
 <div class="stack"><button class="btn pri lg" onclick="copyMsg()">${ic('copy')} คัดลอกข้อความ</button>
 <a class="btn lg" href="${esc(D.fbUrl)}" target="_blank" rel="noopener" onclick="copyMsg(1)">${ic('send')} เปิด Facebook</a>
 <button class="btn" onclick="cart=[];saveCart();msg='';view='shop';render();scrollTo(0,0)">กลับไปเลือกสินค้า</button></div>`;
}
async function copyMsg(){
 try{await navigator.clipboard.writeText(msg);toast('คัดลอกข้อความแล้ว วางในแชต Facebook ได้เลย')}
 catch(e){
  const t=document.createElement('textarea');t.value=msg;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();
  try{document.execCommand('copy');toast('คัดลอกข้อความแล้ว วางในแชต Facebook ได้เลย')}catch(x){toast('คัดลอกไม่ได้ กรุณากดค้างที่ข้อความเพื่อคัดลอก')}
  t.remove();
 }
}

async function init(){render();D=await Service.load();render()}
init();
