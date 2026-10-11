// shop.js — หน้าลูกค้า (ไม่แสดงราคา — คุยราคาในแชต Facebook)
const PAGE=24;
const SHOP_LAT=16.842186444945238,SHOP_LNG=99.93208137099553; // พิกัดที่ตั้งบริษัท (แก้ได้ที่นี่)
const SHOP_TEL='091-383-0459'; // เบอร์โทรเพจ/ร้าน (แก้ได้ที่นี่)
const telLink=(c='')=>`<a class="tel ${c}" href="tel:${SHOP_TEL.replace(/\D/g,'')}">${ic('phone',18)} โทร ${SHOP_TEL}</a>`;
let onlyFav=false,greet='',cat='',shownN=0,anim=false,ord={id:'',st:'',err:''},ag={name:'',phone:'',busy:false,res:null,err:''},loadErr='',cart=[],q='',view='shop',pv=null,shopY=0,errs={},msg='',limit=PAGE,cust={name:'',phone:'',prov:'',amp:'',tam:'',zip:'',addr:'',note:'',tax:false,taxName:'',taxId:'',taxAddr:''};
try{cart=JSON.parse(localStorage.getItem(CKEY))||[]}catch(e){}
try{const u=JSON.parse(localStorage.getItem(UKEY));if(u)Object.assign(cust,{name:u.name||'',phone:u.phone||'',prov:u.prov||'',amp:u.amp||'',tam:u.tam||'',zip:u.zip||'',addr:u.addr||'',taxName:u.taxName||'',taxId:u.taxId||'',taxAddr:u.taxAddr||''})}catch(e){}
const saveCart=()=>{try{localStorage.setItem(CKEY,JSON.stringify(cart))}catch(e){}};
const saveCust=()=>{try{localStorage.setItem(UKEY,JSON.stringify({name:cust.name,phone:cust.phone,prov:cust.prov,amp:cust.amp,tam:cust.tam,zip:cust.zip,addr:cust.addr,taxName:cust.taxName,taxId:cust.taxId,taxAddr:cust.taxAddr}))}catch(e){}};
const prod=id=>D&&D.products.find(p=>p.id===id);
const priceNote=()=>'ราคาที่แสดงเป็นราคาโดยประมาณ ตัวเลือกที่แสดง $$$ บาท ราคาอยู่ระหว่างกำหนด ค่าจัดส่งและราคาสุดท้ายยืนยันกับบริษัทผ่านแชต Facebook';
const lineP=i=>hasP(i.v)?Number(i.v.price)*i.qty:null;
const sumP=l=>l.reduce((t,i)=>t+(lineP(i)||0),0);
const unkN=l=>l.filter(i=>lineP(i)==null).length;
const totalHtml=l=>{if(!l.length)return'';const u=unkN(l);return `<div class="total"><span>ยอดรวมโดยประมาณ${u?`<small>ไม่รวม ${u} รายการที่ยังไม่กำหนดราคา</small>`:''}</span><b>${money(sumP(l))}</b></div>`};
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

const STEPS=['เลือกสินค้า','รายการสั่งซื้อ','ข้อมูลผู้สั่ง','ตรวจสอบ','ส่งคำสั่งซื้อ'],SI={shop:0,product:0,again:0,cart:1,info:2,review:3,done:4};
const BACK={product:'shop',again:'shop',cart:'shop',info:'cart',review:'info'};

function head(){
 const n=count();
 return `<header class="top"><div class="bar"><img class="logo-img" src="logo.gif" width="56" height="56" alt="โลโก้ บริษัท แม่ดอนรุ่งเรืองฟู้ดส์"><h1 class="brand" aria-label="บริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด"><b class="bn" aria-hidden="true"><span class="w w1">บริษัท</span><span class="w w2">แม่ดอนรุ่งเรืองฟู้ดส์</span><span class="w w3">จำกัด</span></b></h1>
 <a class="swbtn" href="admin.html" aria-label="เข้าสู่ระบบแอดมิน (สำหรับร้านค้า)">${ic('user',18)}<span class="t">แอดมิน</span></a>
 <button class="cartbtn" onclick="go('cart')" aria-label="รายการสั่งซื้อ ${n} รายการ">${ic('cart')}<span class="hide-s">รายการสั่งซื้อ</span>${n?`<span class="badge${n>shownN?' bump':''}">${n}</span>`:''}</button></div></header>`;
}
function fabHtml(){
 const n=count();
 if(!D||view!=='shop'||!n)return'';
 return `<div class="fabwrap"><button class="fab${n>shownN?' bump':''}" onclick="go('cart')"><span>${ic('cart')} รายการสั่งซื้อ</span><span>${n} รายการ ${ic('chev')}</span></button></div>`;
}
const CATK={'กล้วย':'banana','มันฝรั่ง':'potato','มัน / เผือก':'taro','พักทอง':'pumpkin'};
const CATS=[['กล้วย',n=>n.startsWith('กล้วย')],['มันฝรั่ง',n=>n.startsWith('มันฝรั่ง')],['มัน / เผือก',n=>/^(มัน|เผือก)/.test(n)&&!n.startsWith('มันฝรั่ง')],['พักทอง',n=>n.startsWith('พักทอง')]];
const inCat=(p,k)=>{const c=CATS.find(x=>x[0]===k);return !c||c[1](String(p.name))};
const chrome=()=>{const n=count();$('#hdr').innerHTML=head();$('#fab').innerHTML=fabHtml();shownN=n};
const prog=()=>{const i=SI[view];return `<div class="prog"><div class="segs">${STEPS.map((s,k)=>`<i class="${k<i?'d':k===i?'c':''}"></i>`).join('')}</div><div class="plabel">ขั้นที่ ${i+1} จาก 5 · <b>${STEPS[i]}</b></div></div>`};
const hero=()=>{
 const nm=T(greet).replace(/^คุณ/,'').split(/\s+/)[0]; // แสดงชื่อเฉพาะหลังลูกค้าเลือกสั่งซ้ำรายการเดิม
 return `<section class="hero"><div class="hero-in"><h2>${nm?`ยินดีต้อนรับกลับ คุณ${esc(nm)}`:'ยินดีต้อนรับสู่ แม่ดอนรุ่งเรืองฟู้ดส์'}</h2><p>${nm?'ท่านสามารถปรับจำนวนรายการเดิม หรือเลือกสินค้าเพิ่มเติมได้ตามต้องการ':'ผู้ผลิตและจำหน่ายผลิตภัณฑ์ขนมทอดกรอบจากกล้วย เผือก มัน มันฝรั่ง และฟักทอง เลือกสินค้า จัดทำรายการสั่งซื้อ และส่งให้บริษัทผ่านเพจ Facebook'}</p>
 <div class="hero-act"><button class="btn" onclick="go('again')">${ic('copy',18)} ลูกค้าเดิม สั่งซ้ำรายการเดิม</button>${telLink('hchip')}</div>
 <span class="hnote">${ic('info',15)} ${priceNote()}</span></div></section>`;
};

function render(){
 chrome();
 let b;
 if(!D&&loadErr)b=`<div class="empty">${ic('info',44)}<p>${esc(loadErr)}</p><button class="btn pri lg" onclick="init()">ลองใหม่</button></div>`;
 else if(!D)b=`<div class="grid">${'<div class="sk"></div>'.repeat(6)}</div>`;
 else b=({shop:shopBody,again:againView,product:productView,cart:cartView,info:infoView,review:reviewView,done:doneView})[view]();
 const back=BACK[view]?`<button class="back" onclick="${view==='product'?'backShop()':`go('${BACK[view]}')`}">${ic('back')} ย้อนกลับ</button>`:'';
 const mn=$('#main');mn.classList.remove('enter');
 $('#main').innerHTML=(view==='shop'?hero():back)+prog()+(D&&D.stale&&view==='shop'?`<div class="note">${ic('info',18)}<span>ตอนนี้เชื่อมต่อไม่ได้ กำลังแสดงรายการล่าสุดที่เคยโหลดไว้ <a href="#" onclick="init();return false">โหลดใหม่</a></span></div>`:'')+b;
 if(D&&view==='shop'){grid();verLine()}
 if(anim){anim=false;void mn.offsetWidth;mn.classList.add('enter')}
}
function go(v){
 if(v==='info'&&!count()){toast('ยังไม่มีสินค้าในรายการสั่งซื้อ');return}
 view=v;pv=null;errs={};anim=true;render();scrollTo(0,0);
}

/* ---------- หน้าสินค้า ---------- */
function shopBody(){
 return `<div class="search">${ic('search')}<input id="q" class="inp" type="search" enterkeyhint="search" autocomplete="off" aria-label="ค้นหาสินค้า" placeholder="ค้นหาสินค้า..." value="${esc(q)}" oninput="q=this.value;limit=PAGE;grid()"></div><div id="cats" class="cats" role="group" aria-label="หมวดสินค้า"></div><div id="top"></div><div id="gmeta" class="gmeta"></div><div id="grid" class="grid"></div><div id="gmore"></div>${contactHtml()}<p class="adminlink"><a href="admin.html">สำหรับเจ้าหน้าที่บริษัท (จัดการสินค้า)</a></p><p class="verline" id="verline"></p>`;
}
const starBtn=(id,name)=>`<button type="button" class="star${isFav(id)?' on':''}" aria-pressed="${isFav(id)}" aria-label="${isFav(id)?'เอาดาวออกจาก':'ติดดาว'} ${esc(name)}" onclick="toggleFav('${id}',event)">${ic('star',22)}</button>`;
function toggleFav(id,ev){
 if(ev){ev.stopPropagation();ev.preventDefault()}
 isFav(id)?FAV.delete(id):FAV.add(id);saveFav();
 const p=prod(id);toast(isFav(id)?`ติดดาว “${p?p.name:''}” แล้ว`:'เอาดาวออกแล้ว',1400);
 if(view==='shop')grid();else render();
}
const priceList=p=>{const vs=shown(p);if(!vs.length)return'';return `<ul class="plist" aria-label="ราคาตามขนาด">${vs.map(v=>`<li><span class="pl">${esc(vlabel(v))}</span><span class="pv${hasP(v)?'':' unk'}">${mh(v)}</span></li>`).join('')}</ul>`};
const catKey=n=>{const r=DEFIMG_RULES.find(x=>x[0].test(String(n||'').trim()));return r?r[1]:'default'};
function contactHtml(){
 const ll=`${SHOP_LAT},${SHOP_LNG}`;
 return `<section class="contact" id="contact" aria-label="ติดต่อบริษัท"><div class="sechead"><h3>ติดต่อและที่ตั้งบริษัท</h3></div>
 <div class="cgrid"><div class="cinfo"><b class="cname">${esc(COMPANY.name)}</b><p class="cname2"><b>${esc(COMPANY.branch)}</b><br>${esc(COMPANY.addr)}<br>เลขประจำตัวผู้เสียภาษี ${esc(COMPANY.taxId)}</p>
 <a class="crow2" href="tel:${SHOP_TEL.replace(/\D/g,'')}">${ic('phone',20)}<span><small>โทรศัพท์</small>${SHOP_TEL}</span></a>
 <a class="crow2" href="${esc(D&&D.fbUrl||FB_DEFAULT)}" target="_blank" rel="noopener">${ic('send',20)}<span><small>เพจ Facebook</small>ส่งข้อความถึงบริษัท</span></a>
 <a class="crow2" href="https://www.google.com/maps/search/?api=1&query=${ll}" target="_blank" rel="noopener">${ic('pin',20)}<span><small>พิกัดที่ตั้ง</small>${SHOP_LAT.toFixed(5)}, ${SHOP_LNG.toFixed(5)}</span></a>
 <a class="btn pri go lg" href="https://www.google.com/maps/dir/?api=1&destination=${ll}" target="_blank" rel="noopener">${ic('pin',18)} นำทางไปยังบริษัท</a></div>
 <div class="cmap"><iframe title="แผนที่ที่ตั้งบริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${ll}&z=15&output=embed"></iframe></div></div></section>`;
}
function card(p,rk){
 return `<article class="card tile${rk?' hot':''}" data-k="${catKey(p.name)}"><div class="cimgw"><button class="cimg" onclick="openP('${p.id}')" tabindex="-1" aria-hidden="true"><img referrerpolicy="no-referrer" loading="lazy" decoding="async" src="${imgOf(p)}" alt="" onerror="this.onerror=null;this.src=defImg('')"></button>${starBtn(p.id,p.name)}</div>
 <div class="cbody"><h3><a href="#" onclick="openP('${p.id}');return false">${esc(p.name)}</a></h3>${p.description?`<p class="desc">${esc(p.description)}</p>`:''}${sold(p.id,'sold nopre')}${priceList(p)}</div><button class="btn pri go" onclick="openP('${p.id}')" aria-label="เลือก ${esc(p.name)}">เลือกสินค้า${ic('chev',18)}</button></article>`;
}
const sold=(id,c='sold')=>{const a=soldParts(id);if(!a.length)return'';const sm=/sm|nopre/.test(c);return `<p class="${c}">${ic('flame',14)}<span>${sm?'':'ขายแล้ว '}${a.map(x=>`<b>${esc(x)}</b>`).join(' · ')}</span></p>`};
function pick(p){return `openP('${p.id}')`}
function bestHtml(tops){
 const nm=p=>`<a href="#" onclick="${pick(p)};return false">${esc(p.name)}</a>`;
 const pic=p=>`<img referrerpolicy="no-referrer" loading="lazy" decoding="async" src="${imgOf(p)}" alt="" onerror="this.onerror=null;this.src=defImg('')">`;
 const [a,...rest]=tops;
 return `<section class="best" aria-label="สินค้าขายดี"><div class="best-h"><span class="best-ic">${ic('star',22)}</span><div><h3>สินค้าขายดี</h3><p>ลูกค้าสั่งบ่อยที่สุด พร้อมยอดที่ขายไปแล้ว</p></div></div>
 <article class="b1"><span class="medal m1">1</span><span class="bpic">${pic(a)}</span><div class="b1-b"><span class="tagc">อันดับ 1</span><h4>${nm(a)}</h4>${sold(a.id,'sold big')}</div><button class="btn pri go" onclick="${pick(a)}" aria-label="เลือก ${esc(a.name)}">เลือก${ic('chev',18)}</button></article>
 ${rest.length?`<div class="brow">${rest.map((p,i)=>`<article class="bm"><span class="medal m${i+2}">${i+2}</span><div class="bm-t"><span class="bpic s">${pic(p)}</span><h4>${nm(p)}</h4></div>${sold(p.id,'sold sm')}<button class="btn sm go" onclick="${pick(p)}" aria-label="เลือก ${esc(p.name)}">เลือก${ic('chev',16)}</button></article>`).join('')}</div>`:''}</section>`;
}
function setCat(k){onlyFav=false;cat=cat===k?'':k;limit=PAGE;grid()}
function toggleOnlyFav(){onlyFav=!onlyFav;if(onlyFav)cat='';limit=PAGE;grid()}
function grid(){
 const g=$('#grid');if(!g)return;
 const k=q.trim().toLowerCase();
 const avl=D.products.filter(avail).sort(bySort);
 const cs=CATS.filter(c=>avl.some(p=>c[1](String(p.name))));
 const nFav=avl.filter(p=>isFav(p.id)).length;
 $('#cats').innerHTML=(cs.length?`<button class="cat" aria-pressed="${!cat&&!onlyFav}" onclick="setCat('')">ทั้งหมด</button>`+cs.map(c=>`<button class="cat" data-k="${CATK[c[0]]||''}" aria-pressed="${cat===c[0]&&!onlyFav}" onclick="setCat('${c[0]}')">${c[0]}</button>`).join(''):'')+`<button class="cat favchip" aria-pressed="${onlyFav}" onclick="toggleOnlyFav()">${ic('star',16)} ติดดาว${nFav?` (${nFav})`:''}</button>`;
 const tops=(D.top||[]).map(prod).filter(p=>p&&avail(p)).slice(0,5);
 $('#top').innerHTML=!k&&!cat&&!onlyFav&&tops.length?bestHtml(tops)+`<div class="sechead"><h3>สินค้าทั้งหมด</h3></div>`:'';
 const all=avl.filter(p=>inCat(p,cat)&&(!onlyFav||isFav(p.id))),l=k?all.filter(p=>String(p.name).toLowerCase().includes(k)):all,vis=l.slice(0,limit);
 $('#gmeta').textContent=all.length?(k?`พบ ${l.length} จาก ${all.length} รายการ`:`${onlyFav?'สินค้าที่ติดดาว ':cat?cat+' ':'สินค้าทั้งหมด '}${all.length} รายการ`):'';
 if(!l.length){
  g.className='';
  g.innerHTML=`<div class="empty">${ic('box',44)}<p>${onlyFav&&!k?'ยังไม่มีสินค้าที่ติดดาว กดรูปดาวบนสินค้าเพื่อบันทึกไว้เลือกภายหลัง':all.length?'ไม่พบสินค้าที่ค้นหา':'ขณะนี้ยังไม่มีสินค้า'}</p>${k?`<button class="btn" onclick="q='';$('#q').value='';grid()">ล้างการค้นหา</button>`:''}</div>`;
  $('#gmore').innerHTML='';return;
 }
 g.className='grid';
 g.innerHTML=vis.map(p=>card(p)).join('');
 $('#gmore').innerHTML=l.length>vis.length?`<button class="btn w lg" style="margin-top:16px" onclick="limit+=PAGE;grid()">แสดงเพิ่ม (อีก ${l.length-vis.length} รายการ)</button>`:'';
}

/* ---------- รายละเอียดสินค้า (หน้าในหน้าเดียวกัน ไม่เด้งป๊อบอัพ) ---------- */
const qtyUI=(val,call,unit='')=>`<div class="qwrap"><div class="qty"><button type="button" aria-label="ลดจำนวน" onclick="${call}-1)">−</button><input type="number" inputmode="numeric" min="1" max="999" value="${val}" aria-label="จำนวน" onchange="${call}0,this.value)"><button type="button" aria-label="เพิ่มจำนวน" onclick="${call}1)">+</button></div>${unit?`<span class="qu">${esc(unit)}</span>`:''}</div>`;
function openP(id){
 const p=prod(id);if(!p)return;
 shopY=window.scrollY;
 const vs=shown(p);
 pv={pid:id,vid:vs.length===1?vs[0].id:null,qty:1,err:'',added:false};
 view='product';anim=true;render();scrollTo(0,0);
}
function backShop(){view='shop';pv=null;render();scrollTo(0,shopY)}
function pickV(id){pv.vid=id;pv.err='';pv.added=false;render();const e=document.querySelector('.opt[aria-checked=true]');e&&e.focus()}
function mq(d,v){pv.qty=v!==undefined?clampQ(v):clampQ(pv.qty+d);pv.added=false;render()}
function pTotal(){
 const p=pv&&prod(pv.pid),v=p&&shown(p).find(x=>x.id===pv.vid);
 if(!v)return'';
 return hasP(v)?`<div class="total"><span>ราคาโดยประมาณ<small>${pv.qty} ${qunit(v)||'หน่วย'} × ${money(v.price)}</small></span><b>${money(Number(v.price)*pv.qty)}</b></div>`:`<div class="total unk"><span>ราคาโดยประมาณ<small>ตัวเลือกนี้ราคาอยู่ระหว่างกำหนด</small></span><b>$$$ บาท</b></div>`;
}
function productView(){
 const p=pv&&prod(pv.pid);
 if(!p||!avail(p))return `<div class="empty"><p>ไม่พบสินค้านี้</p><button class="btn" onclick="backShop()">กลับไปเลือกสินค้า</button></div>`;
 const vs=shown(p);
 return `<article class="pdp"><div class="phead"><img referrerpolicy="no-referrer" class="simg" src="${imgOf(p)}" alt="" onerror="this.onerror=null;this.src=defImg('')"><div class="pinfo"><h2 class="h2">${esc(p.name)}</h2>${p.description?`<p class="sdesc">${esc(p.description)}</p>`:''}${soldText(p.id)?sold(p.id):''}</div>${starBtn(p.id,p.name)}</div>
 ${vs.length?`<div class="lbl">เลือกขนาด / บรรจุภัณฑ์</div><div class="opts" role="radiogroup" aria-label="ขนาดและบรรจุภัณฑ์">${vs.map(x=>`<button class="opt" role="radio" aria-checked="${x.id===pv.vid}" onclick="pickV('${x.id}')"><span class="radio"></span><span class="olab">${esc(vlabel(x))}</span><span class="oprice${hasP(x)?'':' unk'}">${mh(x)}${qunit(x)?`<small class="u">/${qunit(x)}</small>`:''}</span></button>`).join('')}</div>`:''}
 ${pv.err?`<div class="err" role="alert">${pv.err}</div>`:''}
 <div class="lbl">จำนวน${qunit(vs.find(x=>x.id===pv.vid))?` <span class="opt-t">(นับเป็น${qunit(vs.find(x=>x.id===pv.vid))})</span>`:''}</div>${qtyUI(pv.qty,'mq(',qunit(vs.find(x=>x.id===pv.vid)))}
 ${pTotal()}${noteOf(p)?`<div class="note">${ic('info',18)}<span>${esc(noteOf(p))}</span></div>`:''}
 ${pv.added?`<div class="note" role="status">${ic('check',18)}<span>เพิ่มลงรายการแล้ว</span></div>`:''}
 <div class="stack"><button class="btn pri lg" onclick="addCart()">${ic('cart')} เพิ่มลงรายการสั่งซื้อ</button>${pv.added?`<button class="btn" onclick="backShop()">เลือกสินค้าเพิ่ม</button><button class="btn" onclick="go('cart')">ดูรายการสั่งซื้อ</button>`:''}</div></article>`;
}
function addCart(){
 const p=prod(pv.pid),vs=shown(p);
 if(vs.length&&!pv.vid){pv.err='กรุณาเลือกขนาดสินค้า';render();return}
 const vid=vs.length?pv.vid:null,e=cart.find(c=>c.pid===pv.pid&&(c.vid||null)===vid);
 if(e)e.qty=Math.min(999,e.qty+pv.qty);else cart.push({pid:pv.pid,vid,qty:pv.qty});
 saveCart();toast(`เพิ่ม “${p.name}” ลงรายการแล้ว`);backShop();
}

/* ---------- รายการสั่งซื้อ ---------- */
const thumb=p=>`<img referrerpolicy="no-referrer" src="${imgOf(p)}" alt="" loading="lazy" onerror="this.onerror=null;this.src=defImg('')">`;
function cartView(){
 const l=items();
 if(!l.length)return `<div class="empty">${ic('cart',44)}<p>ยังไม่มีสินค้าในรายการสั่งซื้อ</p><button class="btn pri lg" onclick="go('shop')">เลือกสินค้า</button></div>`;
 return `<h2 class="h2">รายการสั่งซื้อ</h2>
 <div class="note">${ic('info',18)}<span>${priceNote()} (ราคาอาจมีการเปลี่ยนแปลง)</span></div>
 <div class="list">${l.map(i=>`<div class="line"><div class="lthumb">${thumb(i.p)}</div><div class="linfo"><b>${esc(i.p.name)}</b>${i.v?`<div class="mu">${esc(vlabel(i.v))}</div>`:''}<div class="lprice">${hasP(i.v)?`${money(i.v.price)} × ${i.qty} = <b>${money(lineP(i))}</b>`:`ราคา <b>$$$ บาท</b>`}</div>
 <div class="lctl">${qtyUI(i.qty,`cq('${i.pid}',${i.vid?`'${i.vid}'`:'null'},`,qunit(i.v))}<button class="btn sm dng" onclick="cdel('${i.pid}',${i.vid?`'${i.vid}'`:'null'})">${ic('trash',16)} ลบ</button></div></div></div>`).join('')}</div>${totalHtml(l)}
 <div class="stack"><button class="btn pri lg" onclick="go('info')">ถัดไป: ข้อมูลผู้สั่ง</button><button class="btn" onclick="go('shop')">+ เลือกสินค้าเพิ่ม</button></div>`;
}
function cq(pid,vid,d,v){const c=cart.find(x=>x.pid===pid&&(x.vid||null)===vid);if(!c)return;c.qty=v!==undefined?clampQ(v):clampQ(c.qty+d);saveCart();render()}
function cdel(pid,vid){cart=cart.filter(c=>!(c.pid===pid&&(c.vid||null)===vid));saveCart();render()}

/* ---------- สั่งซ้ำ / ดึงข้อมูลเดิม ---------- */
function againView(){
 if(!ag.name&&!ag.phone){ag.name=cust.name;ag.phone=cust.phone}
 const r=ag.res,hist=r&&r.found?(r.history&&r.history.length?r.history:(r.items&&r.items.length?[{createdAt:'',items:r.items}]:[])):[];
 return `<h2 class="h2">สั่งซ้ำ / ดึงข้อมูลเดิม</h2><section class="sec"><p class="sub">กรอกชื่อและเบอร์โทรที่เคยสั่ง เราจะดึงที่อยู่จัดส่งและรายการล่าสุดมาให้ แล้วคุณปรับจำนวนก่อนสั่งได้</p>
 <div class="fld"><label class="lbl" for="a_name">ชื่อผู้สั่งซื้อ</label><input id="a_name" class="inp" autocomplete="name" value="${esc(ag.name)}" oninput="ag.name=this.value"></div>
 <div class="fld"><label class="lbl" for="a_phone">เบอร์โทรศัพท์</label><input id="a_phone" class="inp" type="tel" inputmode="tel" autocomplete="tel" value="${esc(ag.phone)}" oninput="ag.phone=this.value"></div>
 ${ag.err?`<div class="err" role="alert">${esc(ag.err)}</div>`:''}
 <button class="btn pri lg w" style="margin-top:16px" onclick="doLookup()"${ag.busy?' disabled':''}>${ag.busy?'กำลังค้นหา…':ic('search')+' ค้นหาข้อมูลเดิม'}</button></section>
 ${r&&!r.found?`<div class="note">${ic('info',18)}<span>ไม่พบข้อมูลที่ตรงกับชื่อและเบอร์นี้ ตรวจสอบการสะกด หรือ <a href="#" onclick="go('shop');return false"><b>สั่งเป็นลูกค้าใหม่</b></a></span></div>`:''}
 ${r&&r.found?`<section class="sec"><h3>พบข้อมูลของ ${esc(r.customer.name)}</h3><p class="mu" style="margin-top:6px;white-space:pre-line">${esc([r.customer.addr,(r.customer.prov===BKK?'แขวง':'ตำบล')+r.customer.tam+' '+(r.customer.prov===BKK?'เขต':'อำเภอ')+r.customer.amp,(r.customer.prov===BKK?'':'จ.')+r.customer.prov+' '+r.customer.zip].join('\n'))}</p>
 ${hist.length?`<div class="lbl" style="margin-top:14px">เลือกรายการที่เคยสั่ง (ล่าสุด ${hist.length} ครั้ง)</div>${hist.map((h,n)=>`<div class="hcard"><div class="hhead"><b>${n===0?'ครั้งล่าสุด':n===1?'ครั้งก่อนหน้า':'ก่อนหน้านั้นอีก'}</b><span class="mu">${esc(fmtDate(h.createdAt))}</span></div>${h.items.map(i=>`<div class="sumrow"><div><b>${esc(i.name)}</b>${i.label?`<div class="mu">${esc(i.label)}</div>`:''}</div><b>× ${i.qty}${i.unit?' '+esc(i.unit):''}</b></div>`).join('')}<button class="btn pri lg w" style="margin-top:10px" onclick="useLast(true,${n})">สั่งรายการนี้ + ที่อยู่เดิม</button></div>`).join('')}`:'<p class="mu" style="margin-top:10px">ยังไม่มีรายการสั่งก่อนหน้า</p>'}
 <div class="stack"><button class="btn lg" onclick="useLast(false)">ใช้เฉพาะที่อยู่เดิม เลือกสินค้าใหม่</button></div>
 <p class="hint">หลังเลือกรายการ คุณปรับจำนวน เพิ่ม หรือลบสินค้าได้ที่หน้ารายการสั่งซื้อ</p></section>`:''}`;
}
const fmtDate=t=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(t||''));if(!m)return'';const mo=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];return `${+m[3]} ${mo[+m[2]-1]} ${+m[1]+543}`};
async function doLookup(){
 if(ag.busy)return;
 if(!T(ag.name)||normPhone(ag.phone).length<9){ag.err='กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ครบ';ag.res=null;render();return}
 ag.busy=true;ag.err='';ag.res=null;render();
 try{ag.res=await Service.lookup(normPhone(ag.phone),T(ag.name));if(ag.res.found)ag.res.customer.phone=normPhone(ag.phone)}
 catch(e){ag.err=e.message||'ค้นหาไม่สำเร็จ'}
 ag.busy=false;render();
}
function useLast(withItems,idx=0){
 const r=ag.res;if(!r||!r.found)return;
 const c=r.customer,okP=!!ADDR[c.prov],okA=okP&&!!ADDR[c.prov][c.amp];
 Object.assign(cust,{name:c.name,phone:c.phone,prov:okP?c.prov:'',amp:okA?c.amp:'',tam:okA&&ADDR[c.prov][c.amp].some(x=>x[0]===c.tam)?c.tam:'',zip:c.zip||'',addr:c.addr||''});
 saveCust();
 if(!withItems){toast('ดึงที่อยู่เดิมแล้ว');go('shop');return}
 let skip=0;const nc=[];
 ((r.history&&r.history[idx]?r.history[idx].items:r.items)||[]).forEach(it=>{
  const p=prod(it.pid)||D.products.find(x=>x.name===it.name);
  if(!p||!avail(p)){skip++;return}
  const vs=shown(p);let v=vs.find(x=>x.id===it.vid)||vs.find(x=>vlabel(x)===it.label);
  if(!v&&vs.length){skip++;return}
  const vid=v?v.id:null,e=nc.find(c=>c.pid===p.id&&(c.vid||null)===vid);
  if(e)e.qty=Math.min(999,e.qty+clampQ(it.qty));else nc.push({pid:p.id,vid,qty:clampQ(it.qty)});
 });
 if(!nc.length){toast('สินค้าในออเดอร์เดิมไม่มีขายแล้ว กรุณาเลือกสินค้าใหม่');go('shop');return}
 cart=nc;saveCart();greet=c.name;
 toast(skip?`ใส่รายการเดิมแล้ว (มี ${skip} รายการที่ไม่มีขายแล้ว)`:'ใส่รายการเดิมในตะกร้าแล้ว ปรับจำนวนได้เลย');
 go('cart');
}

/* ---------- ข้อมูลผู้สั่ง ---------- */
function field(k,l,o={}){
 const bad=errs[k],id='c_'+k,a=bad?` aria-invalid="true" aria-describedby="e_${k}"`:'';
 const lab=`<label class="lbl" for="${id}">${l}${o.req?' <span class="req" aria-hidden="true">*</span>':''}</label>`;
 const inp=o.area
  ?`<textarea id="${id}" class="inp${bad?' bad':''}" rows="3" autocomplete="${o.ac||'off'}"${a} oninput="cust.${k}=this.value;clrE('${k}')">${esc(cust[k])}</textarea>`
  :`<input id="${id}" class="inp${bad?' bad':''}" type="${o.t||'text'}"${o.t==='tel'?' inputmode="tel"':''} autocomplete="${o.ac||'off'}"${a} value="${esc(cust[k])}" oninput="cust.${k}=this.value;clrE('${k}')">`;
 return `<div class="fld">${lab}${inp}${bad?`<div class="err" id="e_${k}" role="alert">${bad}</div>`:''}</div>`;
}
const BKK='กรุงเทพมหานคร';
const th=(a,b)=>a.localeCompare(b,'th');
const opts=(arr,cur,ph)=>`<option value="">${ph}</option>`+arr.map(x=>`<option value="${esc(x)}"${x===cur?' selected':''}>${esc(x)}</option>`).join('');
const amps=()=>cust.prov&&ADDR[cust.prov]?Object.keys(ADDR[cust.prov]).sort(th):[];
const tams=()=>cust.amp&&ADDR[cust.prov]&&ADDR[cust.prov][cust.amp]?ADDR[cust.prov][cust.amp].map(x=>x[0]).sort(th):[];
const lAmp=()=>cust.prov===BKK?'เขต':'อำเภอ',lTam=()=>cust.prov===BKK?'แขวง':'ตำบล';
function sel(k,l,o){
 const bad=errs[k],id='c_'+k;
 return `<div class="fld"><label class="lbl" for="${id}"><span id="l_${k}">${l}</span> <span class="req" aria-hidden="true">*</span></label><select id="${id}" class="inp${bad?' bad':''}"${o.dis?' disabled':''}${bad?` aria-invalid="true" aria-describedby="e_${k}"`:''} onchange="${o.fn}(this.value)">${o.html}</select>${bad?`<div class="err" id="e_${k}" role="alert">${bad}</div>`:''}</div>`;
}
function clrE(k){delete errs[k];const e=$('#e_'+k);e&&e.remove();const i=$('#c_'+k);i&&i.classList.remove('bad')}
function addrSync(){
 ['prov','amp','tam','zip'].forEach(k=>{if(!errs[k])clrE(k)}); // อัปเดตช่องอำเภอ/ตำบล/รหัสไปรษณีย์โดยไม่ต้องวาดหน้าใหม่
 const a=$('#c_amp'),t=$('#c_tam'),z=$('#c_zip');if(!a||!t||!z)return;
 $('#l_amp').textContent=lAmp();$('#l_tam').textContent=lTam();
 a.innerHTML=opts(amps(),cust.amp,'เลือก'+lAmp());a.disabled=!cust.prov;
 t.innerHTML=opts(tams(),cust.tam,'เลือก'+lTam());t.disabled=!cust.amp;
 z.value=cust.zip;
}
function setProv(v){cust.prov=v;cust.amp='';cust.tam='';cust.zip='';delete errs.prov;addrSync();if(v){const a=$('#c_amp');a&&a.focus()}}
function setAmp(v){cust.amp=v;cust.tam='';cust.zip='';delete errs.amp;addrSync();if(v){const t=$('#c_tam');t&&t.focus()}}
function setTam(v){
 cust.tam=v;delete errs.tam;
 const r=(ADDR[cust.prov]&&ADDR[cust.prov][cust.amp]||[]).find(x=>x[0]===v);
 cust.zip=r?r[1]:'';if(cust.zip)delete errs.zip;
 addrSync();
}
function infoView(){
 return `<h2 class="h2">ข้อมูลผู้สั่ง</h2><div class="note">${ic('info',18)}<span>เคยสั่งกับเราแล้ว? <a href="#" onclick="go('again');return false"><b>ดึงที่อยู่เดิม</b></a> ไม่ต้องกรอกใหม่</span></div><section class="sec">${field('name','ชื่อผู้สั่งซื้อ',{req:1,ac:'name'})}${field('phone','เบอร์โทรศัพท์',{req:1,t:'tel',ac:'tel'})}</section>
 <section class="sec"><h3>ที่อยู่จัดส่ง</h3><p class="sub">เลือกจังหวัด แล้วเลือกอำเภอและตำบล รหัสไปรษณีย์จะขึ้นให้เอง</p>
 ${sel('prov','จังหวัด',{fn:'setProv',html:opts(Object.keys(ADDR).sort(th),cust.prov,'เลือกจังหวัด')})}
 ${sel('amp',lAmp(),{fn:'setAmp',dis:!cust.prov,html:opts(amps(),cust.amp,'เลือก'+lAmp())})}
 ${sel('tam',lTam(),{fn:'setTam',dis:!cust.amp,html:opts(tams(),cust.tam,'เลือก'+lTam())})}
 <div class="fld"><label class="lbl" for="c_zip">รหัสไปรษณีย์ <span class="req" aria-hidden="true">*</span></label><input id="c_zip" class="inp${errs.zip?' bad':''}" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="${esc(cust.zip)}" oninput="this.value=this.value.replace(/\D/g,'');cust.zip=this.value;clrE('zip')">${errs.zip?`<div class="err" id="e_zip" role="alert">${errs.zip}</div>`:''}</div>
 ${field('addr','บ้านเลขที่ / หมู่ / ซอย / ถนน',{req:1,area:1,ac:'address-line1'})}</section>
 <section class="sec">${field('note','หมายเหตุเพิ่มเติม (ไม่บังคับ)',{area:1})}</section>
 <section class="sec"><label class="chk"><input type="checkbox" ${cust.tax?'checked':''} onchange="cust.tax=this.checked;render()"> <span><b>ต้องการใบกำกับภาษี</b><small class="mu" style="display:block">กรอกข้อมูลสำหรับออกใบกำกับภาษี (ไม่บังคับ)</small></span></label>
 ${cust.tax?`<div style="margin-top:10px">${field('taxName','ชื่อ-นามสกุล / ชื่อบริษัท ตามใบกำกับภาษี',{req:1})}${field('taxId','เลขประจำตัวผู้เสียภาษี 13 หลัก',{req:1,t:'tel'})}${field('taxAddr','ที่อยู่ตามใบกำกับภาษี',{req:1,area:1})}</div>`:''}</section>
 <div class="stack"><button class="btn pri lg" onclick="toReview()">ถัดไป: ตรวจสอบคำสั่งซื้อ</button></div>`;
}
const fullAddr=()=>`${T(cust.addr)}\n${lTam()}${cust.tam} ${lAmp()}${cust.amp}\n${cust.prov===BKK?'':'จ.'}${cust.prov} ${T(cust.zip)}`;
function toReview(){
 document.activeElement&&document.activeElement.blur();
 errs={};
 if(!count()){toast('กรุณาเลือกสินค้าอย่างน้อย 1 รายการก่อนดำเนินการต่อ');return go('shop')}
 if(!T(cust.name))errs.name='กรุณากรอกชื่อผู้สั่งซื้อ';
 if(!T(cust.phone))errs.phone='กรุณากรอกเบอร์โทรศัพท์';
 if(!cust.prov)errs.prov='กรุณาเลือกจังหวัด';
 if(cust.prov&&!cust.amp)errs.amp='กรุณาเลือก'+lAmp();
 if(cust.amp&&!cust.tam)errs.tam='กรุณาเลือก'+lTam();
 if(!/^\d{5}$/.test(T(cust.zip)))errs.zip='กรุณากรอกรหัสไปรษณีย์ 5 หลัก';
 if(!T(cust.addr))errs.addr='กรุณากรอกบ้านเลขที่ / หมู่ / ซอย / ถนน';
 if(cust.tax){if(!T(cust.taxName))errs.taxName='กรุณากรอกชื่อสำหรับออกใบกำกับภาษี';if(!/^\d{13}$/.test(T(cust.taxId).replace(/\D/g,'')))errs.taxId='กรุณากรอกเลขประจำตัวผู้เสียภาษี 13 หลัก';if(!T(cust.taxAddr))errs.taxAddr='กรุณากรอกที่อยู่ตามใบกำกับภาษี'}
 const ks=['name','phone','prov','amp','tam','zip','addr','taxName','taxId','taxAddr'];
 if(ks.some(k=>errs[k])){render();const k=ks.find(x=>errs[x]);const e=k&&$('#c_'+k);e&&e.focus();return}
 saveCust();view='review';render();scrollTo(0,0);
}

/* ---------- ตรวจสอบ / ข้อความ ---------- */
const taxTxt=()=>cust.tax?`ชื่อ: ${T(cust.taxName)}\nเลขประจำตัวผู้เสียภาษี: ${T(cust.taxId).replace(/\D/g,'')}\nที่อยู่: ${T(cust.taxAddr)}`:'';
const taxMsg=()=>cust.tax?`\n\n🧾 ขอใบกำกับภาษี\n\n${taxTxt()}`:'';
function makeMsg(){
 const l=items();
 return `📦 ใบสั่งซื้อสินค้า\nบริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด\n🧾 เลขที่: ${ord.id}\n\n👤 ข้อมูลผู้สั่งซื้อ\n\nชื่อ: ${T(cust.name)}\nโทร: ${T(cust.phone)}\n\n🛍️ รายการสินค้า\n\n`
 +l.map((i,n)=>{
   const s=[T(i.v&&i.v.size),T(i.v&&i.v.size)?T(i.v.sizeUnit):''].filter(Boolean).join(' '),pk=i.v?T(i.v.packaging):'';
   return `${n+1}. ${i.p.name}`+(s?`\n   ขนาด: ${s}`:'')+(pk?`\n   บรรจุภัณฑ์: ${pk}`:'')+`\n   จำนวน: ${i.qty}${qunit(i.v)?' '+qunit(i.v):''}`+(hasP(i.v)?`\n   ราคา: ${money(i.v.price)} x ${i.qty} = ${money(lineP(i))}`:'');
  }).join('\n\n')
 +`\n\n📍 ที่อยู่จัดส่ง\n\n${fullAddr()}\n\n📝 หมายเหตุ\n\n${T(cust.note)||'-'}${taxMsg()}${unkN(l)||!l.length?'':`\n\n💰 ยอดรวมโดยประมาณ: ${money(sumP(l))}`}\n\n💬 ขอความกรุณายืนยันราคาและค่าจัดส่งในแชตนี้ (ราคาอาจมีการเปลี่ยนแปลง)`;
}
function reviewView(){
 return `<h2 class="h2">ตรวจสอบคำสั่งซื้อ</h2>
 <section class="sec"><h3>ข้อมูลผู้สั่ง</h3><p style="margin-top:8px"><b>${esc(cust.name)}</b></p><p class="mu">โทร ${esc(cust.phone)}</p><p style="margin-top:8px;white-space:pre-line">${esc(fullAddr())}</p>${T(cust.note)?`<p class="mu" style="margin-top:8px">หมายเหตุ: ${esc(cust.note)}</p>`:''}${cust.tax?`<p class="mu" style="margin-top:8px;white-space:pre-line">ขอใบกำกับภาษี\n${esc(taxTxt())}</p>`:''}</section>
 <section class="sec"><h3>รายการสินค้า</h3>${items().map(i=>`<div class="sumrow"><div><b>${esc(i.p.name)}</b>${i.v?`<div class="mu">${esc(vlabel(i.v))}</div>`:''}</div><b>× ${i.qty}${qunit(i.v)?' '+qunit(i.v):''}<div class="mu" style="font-weight:600">${hasP(i.v)?money(lineP(i)):'$$$ บาท'}</div></b></div>`).join('')}${totalHtml(items())}</section>
 <div class="note">${ic('info',18)}<span>${priceNote()} (ราคาอาจมีการเปลี่ยนแปลง)</span></div>
 <div class="stack"><button class="btn pri lg" onclick="confirmOrder()">ยืนยันคำสั่งซื้อ</button><button class="btn" onclick="go('info')">แก้ไขข้อมูล</button></div>`;
}
// สรุปรายการและคำนวณยอดหลังยืนยันคำสั่งซื้อ
let doneItems=[],doneCust=null;
function viewDoc(){
 const c=doneCust||cust,t=c.tax;
 openDoc(docHtml({type:'order',no:ord.id,date:dmy(new Date()),
  buyer:t?{name:c.taxName,addr:c.taxAddr,taxId:String(c.taxId).replace(/\D/g,''),tel:c.phone}:{name:c.name,addr:c.fa,tel:c.phone},
  lines:doneItems.map(i=>({name:i.p.name,label:i.v?vlabel(i.v):'',qty:i.qty,unit:qunit(i.v),price:hasP(i.v)?i.v.price:''})),
  note:'เอกสารนี้จัดทำจากคำสั่งซื้อทางเว็บไซต์ ราคาและค่าจัดส่งยืนยันกับบริษัทผ่านแชต Facebook'+(t?'\nผู้สั่งขอใบกำกับภาษี บริษัทจะออกให้ตามราคาที่ยืนยัน':''),unknownMark:'$$$'}));
}
function calcHtml(){
 const l=doneItems;if(!l.length)return'';
 return `<section class="sec calc"><h3>สรุปรายการและยอดโดยประมาณ</h3><table class="ctab"><thead><tr><th>สินค้า</th><th class="n">จำนวน</th><th class="n">ราคา/หน่วย</th><th class="n">รวม</th></tr></thead><tbody>${l.map(i=>`<tr><td><b>${esc(i.p.name)}</b>${i.v?`<small>${esc(vlabel(i.v))}</small>`:''}</td><td class="n">${i.qty}${qunit(i.v)?' '+qunit(i.v):''}</td><td class="n">${hasP(i.v)?Number(i.v.price).toLocaleString('th-TH'):'<span class="pq">$$$</span>'}</td><td class="n">${hasP(i.v)?lineP(i).toLocaleString('th-TH'):'<span class="pq">$$$</span>'}</td></tr>`).join('')}</tbody></table>${totalHtml(l)}<p class="hint">${priceNote()}</p></section>`;
}
function doneView(){
 return `<section class="sec" style="text-align:center;display:grid;justify-items:center;gap:6px"><div class="okmark">${ic('check',34)}</div><h2 class="h2" style="margin:6px 0 0">จัดทำคำสั่งซื้อเรียบร้อยแล้ว</h2><p class="mu">ระบบจัดทำข้อความคำสั่งซื้อให้เรียบร้อยแล้ว กรุณาส่งคำสั่งซื้อให้บริษัทผ่านเพจ Facebook ตามขั้นตอนด้านล่าง</p></section>
 ${ordHtml()}${calcHtml()}<section class="sec"><h3>ขั้นตอนการส่งคำสั่งซื้อ</h3><ol class="how"><li>กดปุ่ม “คัดลอกข้อความ”</li><li>กดปุ่ม “เปิด Facebook” เพื่อเข้าสู่แชตของเพจบริษัท</li><li>วางข้อความที่คัดลอกไว้ แล้วกดส่ง</li></ol><pre id="msgbox">${esc(msg)}</pre></section>
 <div class="stack"><button class="btn pri lg" onclick="copyMsg()">${ic('copy')} คัดลอกข้อความ</button>
 <a class="btn lg" href="${esc(D.fbUrl)}" target="_blank" rel="noopener" onclick="copyMsg(1)">${ic('send')} เปิด Facebook</a>
 <button class="btn" onclick="viewDoc()">ดูใบสั่งซื้อ / บันทึกเป็น PDF</button>
 <button class="btn" onclick="cart=[];saveCart();msg='';view='shop';render();scrollTo(0,0)">กลับไปเลือกสินค้า</button></div>
 <p class="adminlink">สอบถามข้อมูลเพิ่มเติม ${telLink()}</p>`;
}
/* ---------- บันทึกคำสั่งซื้อ ---------- */
function ordHtml(){
 const m={saving:[`กำลังบันทึกคำสั่งซื้อ…`,'info'],ok:[REMOTE?`บันทึกคำสั่งซื้อเรียบร้อยแล้ว เลขที่ ${ord.id}`:`โหมดทดลอง: บันทึกในเครื่องนี้เท่านั้น (เลขที่ ${ord.id})`,REMOTE?'check':'info'],fail:[`บันทึกคำสั่งซื้อในระบบไม่สำเร็จ (${esc(ord.err)}) — ยังส่งข้อความทาง Facebook ได้ตามปกติ <a href="#" onclick="sendOrder();return false"><b>ลองบันทึกอีกครั้ง</b></a>`,'info']}[ord.st];
 return `<div id="ordst" class="note" role="status">${m?ic(m[1],18)+'<span>'+m[0]+'</span>':''}</div>`.replace('<div id="ordst" class="note" role="status"></div>','<div id="ordst"></div>');
}
const paintOrd=()=>{const e=$('#ordst');if(e)e.outerHTML=ordHtml()};
function confirmOrder(){doneItems=items();doneCust={...cust,fa:fullAddr().replace(/\n/g,' ')};greet='';ag={name:'',phone:'',busy:false,res:null,err:''};ord={id:newOrderId(),st:'',err:''};msg=makeMsg();view='done';render();scrollTo(0,0);sendOrder()}
let lastOrder=null;
async function sendOrder(){
 const order=lastOrder&&ord.st==='fail'?lastOrder:{orderId:ord.id,name:T(cust.name),phone:normPhone(cust.phone),prov:cust.prov,amp:cust.amp,tam:cust.tam,zip:T(cust.zip),addr:T(cust.addr),note:[T(cust.note),cust.tax?'[ขอใบกำกับภาษี] '+taxTxt().replace(/\n/g,' | '):''].filter(Boolean).join('\n'),
  items:items().map(i=>({pid:i.pid,vid:i.vid||'',name:i.p.name,label:i.v?vlabel(i.v):'',qty:i.qty,unit:qunit(i.v)}))};
 lastOrder=order;ord.st='saving';ord.err='';paintOrd();
 try{await Service.placeOrder(order);ord.st='ok';setTimeout(refreshSales,800)}catch(e){ord.st='fail';ord.err=e.message||'ผิดพลาด'}
 paintOrd();
}
async function copyMsg(){
 try{await navigator.clipboard.writeText(msg);toast('คัดลอกข้อความแล้ว วางในแชต Facebook ได้เลย')}
 catch(e){
  const t=document.createElement('textarea');t.value=msg;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();
  try{document.execCommand('copy');toast('คัดลอกข้อความแล้ว วางในแชต Facebook ได้เลย')}catch(x){toast('คัดลอกไม่ได้ กรุณากดค้างที่ข้อความเพื่อคัดลอก')}
  t.remove();
 }
}

const verLine=()=>{const e=$('#verline');if(e)e.textContent=WEB_VER};
// รีเฟรชยอดขาย/อันดับขายดีเป็นระยะ (ไม่โหลดสินค้าใหม่ ไม่กวนตอนกำลังพิมพ์)
let salesBusy=false;
async function refreshSales(){
 if(salesBusy||!D||document.hidden)return;
 salesBusy=true;
 try{
  const j=await Service.sales();
  D.sales=j.sales||{};D.top=j.top||D.top;
  const typing=document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if(view==='shop'&&!typing){grid();verLine()}
 }catch(e){}
 salesBusy=false;
}
setInterval(refreshSales,20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSales()});
window.addEventListener('focus',refreshSales);
async function init(){loadErr='';D=null;render();try{D=await Service.load()}catch(e){loadErr=e.message||'โหลดรายการสินค้าไม่ได้'}render()}
init();
