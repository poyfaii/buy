/* pos.js — ขายหน้าร้าน (บิลเงินสด) · เครื่องยิงบาร์โค้ด · สต๊อก · รายงาน */
'use strict';
const API=(typeof API_URL!=='undefined'&&API_URL)||'/api',CRK='mdr_pos_cred',CARTK='mdr_pos_cart';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const fm=n=>{n=r2(n||0);return n.toLocaleString('th-TH',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})};
const bkkNow=()=>new Date(Date.now()+7*3600e3);
const today=()=>bkkNow().toISOString().slice(0,10);
const dthai=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');return m?`${m[3]}/${m[2]}/${Number(m[1])+543}`:s||''};
const tthai=s=>dthai(s)+' '+String(s||'').slice(11,16);
let CRED=null,items=[],cfg={mk:30,shop:'',addr:'',tel:'',note:''},cart=[],view='sell',q='',busy=false,lerr='',logging=false,report=null,rng='today',rfrom='',rto='',flt='',istk='';
try{CRED=JSON.parse(sessionStorage.getItem(CRK))}catch(e){}
try{cart=JSON.parse(localStorage.getItem(CARTK))||[]}catch(e){}
const saveCart=()=>{try{localStorage.setItem(CARTK,JSON.stringify(cart))}catch(e){}};

async function api(b){
 let r;
 try{r=await fetch(API,{method:'POST',headers:{'content-type':'text/plain;charset=utf-8'},body:JSON.stringify({...(CRED||{}),...b})})}catch(e){throw new Error('เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่')}
 let j;try{j=await r.json()}catch(e){throw new Error('ระบบตอบกลับผิดปกติ')}
 if(j&&j.ok===false)throw new Error(j.error||'ผิดพลาด');
 return j;
}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>t.style.display='none',2600)}
const beep=(ok)=>{try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.frequency.value=ok?880:220;g.gain.value=.05;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+(ok?.08:.25))}catch(e){}};

/* ---------- ราคาจากต้นทุน: กำไร min–max% ปัดเลขกลม ---------- */
function calcPrice(cost){ // ต้นทุน + กำไร % แล้วปัดขึ้นเป็นบาทเต็ม (คิดเป็นสตางค์ ไม่ใช้ทศนิยมลอยตัว)
 cost=Number(cost);if(!(cost>0))return 0;
 const mk=Number(cfg.mk)>=0?Number(cfg.mk):30,satang=Math.round(cost*100);
 return Math.ceil(satang*(100+mk)/10000-1e-9);
}
const mkPct=(cost,price)=>cost>0?(price-cost)/cost*100:null;
function mkTag(cost,price){const m=mkPct(cost,price);if(m===null)return '';const bad=m<-.01;return `<span class="mk${bad?' warn':''}">กำไร ${r2(m)}%</span>`}

/* ---------- โครงหน้า ---------- */
function loginView(){
 return `<main class="login"><section class="sec"><img class="logo-img" src="logo.svg" alt="" style="width:72px;height:72px;margin-bottom:12px"><h1 class="h2" style="margin:0 0 2px">ร้านชำ · ขายหน้าร้าน</h1><p class="sub">เข้าสู่ระบบเพื่อเริ่มขาย</p>
 <form onsubmit="return doLogin(event)"><div class="fld"><label class="lbl" for="lu">ชื่อผู้ใช้</label><input id="lu" class="inp" autocomplete="username" autocapitalize="off" spellcheck="false"></div>
 <div class="fld"><label class="lbl" for="lp">รหัสผ่าน</label><input id="lp" class="inp" type="password" autocomplete="current-password"></div>
 ${lerr?`<div class="err" role="alert">${esc(lerr)}</div>`:''}<button class="btn pri lg w" style="margin-top:16px" type="submit"${logging?' disabled':''}>${logging?'กำลังตรวจสอบ…':'เข้าสู่ระบบ'}</button></form></section></main>`;
}
async function doLogin(e){
 e.preventDefault();if(logging)return false;
 const u=$('#lu').value.trim(),p=$('#lp').value;logging=true;lerr='';render();
 try{CRED={user:u,pass:p};await api({action:'login'});try{sessionStorage.setItem(CRK,JSON.stringify(CRED))}catch(x){}await boot()}catch(x){CRED=null;lerr=x.message==='unauthorized'?'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง':x.message}
 logging=false;render();return false;
}
function logout(){CRED=null;try{sessionStorage.removeItem(CRK)}catch(e){}render()}
async function boot(){const j=await api({action:'posInit'});items=j.items;cfg=j.cfg;view=view||'sell'}
function render(){
 if(!CRED){$('#app').innerHTML=loginView();return}
 const tab=(k,t)=>`<a href="#" class="${view===k?'on':''}" onclick="return nav('${k}')">${t}</a>`;
 $('#app').innerHTML=`<header class="top"><div class="bar"><img class="logo-img" src="logo.svg" alt=""><h1 class="brand"><b>${esc(cfg.shop||'ร้านชำ')}</b></h1><button class="iconbtn" onclick="logout()" aria-label="ออกจากระบบ" title="ออกจากระบบ"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div></header>
 <main class="pwrap"><nav class="tabs" aria-label="เมนู">${tab('sell','ขาย')}${tab('items','สินค้า / สต๊อก')}${tab('rep','รายงาน')}${tab('set','ตั้งค่า')}</nav>
 <div id="pv">${view==='sell'?sellView():view==='items'?itemsView():view==='rep'?repView():setView()}</div></main>${view==='sell'?payBar():''}`;
 if(view==='sell')focusScan();
}
function nav(k){view=k;q='';render();if(k==='rep'&&!report)loadReport();window.scrollTo(0,0);return false}

/* ---------- หน้าขาย ---------- */
const total=()=>r2(cart.reduce((t,l)=>t+l.price*l.qty,0));
const find=id=>items.find(i=>i.id===id);
function sellView(){
 const t=total(),n=cart.reduce((a,l)=>a+l.qty,0);
 return `<div class="scan"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg>
 <input id="scan" class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" placeholder="ยิงบาร์โค้ด หรือพิมพ์ชื่อสินค้า แล้วกด Enter" value="${esc(q)}" oninput="onScan(this.value)" onkeydown="scanKey(event)"><button type="button" class="camb" onclick="camDlg()" aria-label="สแกนด้วยกล้องมือถือ">กล้อง</button></div>
 <p class="hint">พิมพ์ <b>3*บาร์โค้ด</b> เพื่อใส่ 3 ชิ้นในครั้งเดียว · คอมพิวเตอร์: <b>F4</b> เงินสด · <b>F8</b> โอน · ยิงสินค้าที่ยังไม่เคยมี ระบบให้ใส่ชื่อ ราคาทุน และจำนวนรับเข้าครั้งแรกครั้งเดียว</p>
 <div id="sres" class="sres">${sresHtml()}</div>
 <div class="grid2"><section class="sec cartbox" aria-label="รายการในบิล">${cart.length?cart.map(lineHtml).join(''):`<div class="empty2">ยังไม่มีสินค้าในบิล<br><small>ยิงบาร์โค้ดสินค้าได้เลย</small></div>`}</section>
 <aside class="side"><section class="sec"><div class="tot"><span>รวม ${fm(n)} ชิ้น</span><b>${fm(t)}</b></div>
 <div class="payrow"><button class="btn pri" onclick="payCash()"${cart.length?'':' disabled'}>เงินสด</button><button class="btn pri" onclick="payTransfer()"${cart.length?'':' disabled'}>โอน</button></div>
 ${cart.length?`<button class="btn w" style="margin-top:10px" onclick="clearCart()">ล้างบิล</button>`:''}</section></aside></div>`;
}
const payBar=()=>cart.length?`<div class="paybar"><div class="tot" style="padding:0 4px 8px"><span>รวม</span><b style="font-size:30px">${fm(total())}</b></div><div class="payrow"><button class="btn pri" onclick="payCash()">เงินสด</button><button class="btn pri" onclick="payTransfer()">โอน</button></div></div>`:'';
function lineHtml(l,i){
 const it=find(l.id),low=it&&it.stock-l.qty<0;
 return `<div class="cl"><b>${esc(l.name)}</b><span class="amt">${fm(l.price*l.qty)}</span>
 <div class="sub2"><span class="stp"><button onclick="qty(${i},-1)" aria-label="ลด">−</button><input inputmode="decimal" value="${l.qty}" aria-label="จำนวน" onchange="setQty(${i},this.value)" onfocus="this.select()"><button onclick="qty(${i},1)" aria-label="เพิ่ม">+</button></span>
 <span>× <button class="pbtn" onclick="editPrice(${i})" aria-label="แก้ราคา">${fm(l.price)}</button>${l.unit?' / '+esc(l.unit):''}</span>${low?'<span class="mk warn">สต๊อกไม่พอ</span>':''}</div>
 <button class="xbtn rm" onclick="del(${i})" aria-label="ลบรายการ">ลบ</button></div>`;
}
function focusScan(){const s=$('#scan');if(s&&!document.querySelector('#mroot .scrim2')){s.focus({preventScroll:true})}}
function repaintSell(keep){const pv=$('#pv');if(!pv)return;const v=$('#scan')?$('#scan').value:'';pv.innerHTML=sellView();const pb=document.querySelector('.paybar');if(pb)pb.remove();document.body.insertAdjacentHTML('beforeend',payBar());const s=$('#scan');if(s){s.value=keep?v:'';q=s.value;if(!document.querySelector('#mroot .scrim2'))s.focus({preventScroll:true})}}
function sresHtml(){
 const t=q.trim().toLowerCase();if(!t||/^\d+[*xX]/.test(t)||/^\d{6,}$/.test(t))return '';
 const m=items.filter(i=>i.name.toLowerCase().includes(t)||(i.barcode&&i.barcode.includes(t))).slice(0,8);
 return m.map(i=>`<button onclick="addById('${i.id}',1)"><span>${esc(i.name)}<br><small>${i.barcode?esc(i.barcode)+' · ':''}เหลือ ${fm(i.stock)}</small></span><b>${fm(i.price)}</b></button>`).join('')+`<button onclick="newItemDlg('','${esc(q.trim()).replace(/'/g,'')}')"><span>+ เพิ่มสินค้าใหม่ชื่อ “${esc(q.trim())}”</span></button>`;
}
function onScan(v){q=v;const r=$('#sres');if(r)r.innerHTML=sresHtml()}
function scanKey(e){
 if(e.key!=='Enter')return;e.preventDefault();
 const v=e.target.value.trim();if(!v)return;
 let n=1,c=v;const m=/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(.+)$/.exec(v);if(m){n=Number(m[1]);c=m[2].trim()}
 handleScan(c,n);
}
// ใช้ร่วมกันทั้งเครื่องยิงและกล้อง คืนค่า 'add' | 'new' | 'multi' เพื่อให้กล้องรู้ว่าจะทำอะไรต่อ
function handleScan(v,n){
 const it=items.find(i=>i.barcode&&i.barcode===v);
 if(it){addById(it.id,n);return 'add'}
 if(/^[0-9A-Za-z\-._]{6,}$/.test(v)&&/\d/.test(v)){beep(false);newItemDlg(v,'');return 'new'}
 const ms=items.filter(i=>i.name.toLowerCase().includes(v.toLowerCase()));
 if(ms.length===1){addById(ms[0].id,n);return 'add'}
 if(ms.length>1){toast('มีหลายรายการ เลือกจากรายการด้านล่าง');return 'multi'}
 newItemDlg('',v);return 'new';
}
function addById(id,n){
 const it=find(id);if(!it)return;n=n>0?n:1;
 const l=cart.find(x=>x.id===id&&x.price===it.price);
 if(l)l.qty=r2(l.qty+n);else cart.push({id:it.id,name:it.name,unit:it.unit,price:it.price,qty:n});
 saveCart();beep(true);repaintSell(false);
}
function qty(i,d){const l=cart[i];l.qty=r2(l.qty+d);if(l.qty<=0)cart.splice(i,1);saveCart();repaintSell(false)}
function setQty(i,v){const n=Number(v);if(!(n>0))cart.splice(i,1);else cart[i].qty=r2(n);saveCart();repaintSell(false)}
function del(i){cart.splice(i,1);saveCart();repaintSell(false)}
function clearCart(){if(!cart.length||!confirm('ล้างรายการทั้งบิล?'))return;cart=[];saveCart();repaintSell(false)}
function editPrice(i){
 const l=cart[i],it=find(l.id);
 dlg(`<h3>แก้ราคา (ลดราคา)</h3><p class="sub">${esc(l.name)} · ราคาปกติ ${fm(it?it.price:l.price)}${it&&it.maxPrice?` · ราคาสูงสุด ${fm(it.maxPrice)}`:''}</p><label class="fld"><span class="lbl">ราคาต่อหน่วย</span><input id="dp" class="inp" inputmode="decimal" value="${l.price}" onfocus="this.select()" onkeydown="if(event.key==='Enter')okPrice(${i})"></label>
 <div class="acts2"><button class="btn pri lg" onclick="okPrice(${i})">ตกลง</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'dp');
}
function okPrice(i){
 const p=Number($('#dp').value),l=cart[i],it=find(l.id);
 if(!isFinite(p)||p<0){toast('ราคาไม่ถูกต้อง');return}
 if(it&&it.maxPrice>0&&p>it.maxPrice){toast('ราคาเกินราคาสูงสุดที่ตั้งไว้');return}
 l.price=r2(p);saveCart();closeDlg();repaintSell(false);
}

/* ---------- กล่องโต้ตอบ ---------- */
let dlgBack=null;
function dlg(html,focusId,onClose){
 closeDlg(true);dlgBack=onClose||null;
 $('#mroot').innerHTML=`<div class="scrim2" onmousedown="if(event.target===this)closeDlg()"><div class="dlg" role="dialog" aria-modal="true">${html}</div></div>`;
 document.body.style.overflow='hidden';
 if(focusId){const f=document.getElementById(focusId);if(f){f.focus();try{f.select()}catch(e){}}}
}
function closeDlg(silent){
 $('#mroot').innerHTML='';document.body.style.overflow='';document.body.classList.remove('printing');
 const cb=dlgBack;dlgBack=null;
 if(!silent){if(cb)cb();if(view==='sell')setTimeout(focusScan,30)}
}
document.addEventListener('keydown',e=>{if(view==='sell'&&!document.querySelector('#mroot .scrim2')&&cart.length){if(e.key==='F4'){e.preventDefault();payCash()}else if(e.key==='F8'){e.preventDefault();payTransfer()}}
 if(e.key==='Escape'&&document.querySelector('#mroot .scrim2'))closeDlg()});
document.addEventListener('click',e=>{if(view==='sell'&&!document.querySelector('#mroot .scrim2')){const t=e.target;if(!/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)&&!t.closest('button,a,input'))focusScan()}});

/* ---------- สแกนด้วยกล้องมือถือ (ต้องเปิดผ่าน https) ---------- */
let cam=null,camLast='',camAt=0,camNo=0;
function camDlg(){
 dlg(`<h3>สแกนด้วยกล้อง</h3><div id="camv" class="camv"></div><div id="camm" class="camm">เล็งบาร์โค้ดให้อยู่ในกรอบ</div>
 <div id="camb" class="camb2"></div>
 <div class="acts2"><div class="payrow"><button class="btn pri" onclick="camPay('cash')">เงินสด</button><button class="btn pri" onclick="camPay('tr')">โอน</button></div><button class="btn" onclick="camStop(true)">ปิดกล้อง (บิลยังอยู่)</button></div>`,null,()=>camStop(false));
 camBill();camStart();
}
async function camStart(){
 const m=$('#camm');
 if(typeof Html5Qrcode==='undefined'){m.textContent='โหลดตัวสแกนไม่สำเร็จ ลองรีเฟรชหน้า';return}
 try{
  const F=Html5QrcodeSupportedFormats;
  cam=new Html5Qrcode('camv',{formatsToSupport:[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_128,F.CODE_39,F.ITF,F.QR_CODE],useBarCodeDetectorIfSupported:true,verbose:false});
  camLast='';camNo=0;
  await cam.start({facingMode:'environment'},{fps:10,qrbox:(w,h)=>({width:Math.floor(w*.85),height:Math.floor(Math.min(h*.6,w*.45))})},camHit,()=>{camNo=Date.now()});
 }catch(e){cam=null;const mm=$('#camm');if(mm)mm.textContent=/Permission|NotAllowed|denied/i.test(String(e))?'ไม่ได้รับอนุญาตใช้กล้อง กรุณากดอนุญาตในเบราว์เซอร์':'เปิดกล้องไม่ได้ ('+String(e&&e.message||e).slice(0,60)+')'}
}
function camHit(text){
 const v=String(text||'').trim(),now=Date.now();if(!v)return;
 if(v===camLast&&!(camNo>camAt+700))return; // รหัสเดิมค้างอยู่หน้ากล้อง ไม่นับซ้ำ ต้องเลื่อนออกจากเฟรมก่อน
 camLast=v;camAt=now;
 const it=items.find(i=>i.barcode&&i.barcode===v);
 if(it){addById(it.id,1);camBill();const m=$('#camm');if(m)m.innerHTML=`เพิ่มแล้ว: <b>${esc(it.name)}</b> · ในบิล ${fm(cart.filter(l=>l.id===it.id).reduce((t,l)=>t+l.qty,0))} ห่อ · รวม ${fm(total())} บาท`;return}
 camStop(false).then(()=>handleScan(v,1)); // สินค้าใหม่ → ปิดกล้องแล้วเปิดฟอร์ม
}
function camBill(){
 const e=$('#camb');if(!e)return;
 e.innerHTML=cart.length?cart.map((l,i)=>`<div class="cbl"><b>${esc(l.name)}</b><span class="stp"><button onclick="camQty(${i},-1)" aria-label="ลด">−</button><span class="q">${fm(l.qty)}</span><button onclick="camQty(${i},1)" aria-label="เพิ่ม">+</button></span><span class="amt">${fm(l.price*l.qty)}</span><button class="xbtn" onclick="camQty(${i},-1e9)" aria-label="ลบรายการ">ลบ</button></div>`).join('')+`<div class="tot"><span>รวม ${fm(cart.reduce((a,l)=>a+l.qty,0))} ชิ้น</span><b>${fm(total())}</b></div>`:'<div class="camm" style="min-height:0">ยังไม่มีสินค้าในบิล</div>';
}
function camQty(i,d){const l=cart[i];if(!l)return;if(d<=-1e8){cart.splice(i,1)}else{l.qty=r2(l.qty+d);if(l.qty<=0)cart.splice(i,1)}saveCart();repaintSell(false);camBill()}
async function camPay(k){await camStop(true);if(!cart.length)return;k==='cash'?payCash():payTransfer()}
async function camStop(close){
 const c=cam;cam=null;
 if(c){try{await c.stop()}catch(e){}try{c.clear()}catch(e){}}
 if(close===true)closeDlg(true),setTimeout(focusScan,30);
}

/* ---------- เงินสด / โอน ---------- */
let cid='';
const newCid=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function payCash(){
 if(!cart.length)return;cid=newCid();const t=total();
 const qk=[20,50,100,500,1000].filter(v=>v>=t).slice(0,4);
 dlg(`<h3>รับเงินสด</h3><div class="big">${fm(t)}</div>
 <label class="fld"><span class="lbl">เงินที่รับ</span><input id="rec" class="inp" inputmode="decimal" style="font-size:26px;font-weight:700;text-align:center" oninput="recChg()" onkeydown="if(event.key==='Enter')doCash()" placeholder="${fm(t)}"></label>
 <div class="quick"><button onclick="setRec(${t})">พอดี</button>${qk.map(v=>`<button onclick="setRec(${v})">${fm(v)}</button>`).join('')}</div>
 <div id="chg" class="chg"><small>เงินทอน</small><b>0</b></div>
 <div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button id="okb" class="btn pri lg" onclick="doCash()">บันทึกบิล</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'rec');
}
function setRec(v){const r=$('#rec');r.value=v;recChg();r.focus()}
function recChg(){
 const t=total(),v=$('#rec').value.trim(),n=v===''?t:Number(v),c=$('#chg');
 const ok=isFinite(n)&&n+.001>=t;c.className='chg'+(ok?'':' bad');c.innerHTML=ok?`<small>เงินทอน</small><b>${fm(n-t)}</b>`:`<small>เงินไม่พอ ขาดอีก</small><b>${fm(t-(isFinite(n)?n:0))}</b>`;
}
async function doCash(){
 if(busy)return;const t=total(),v=$('#rec').value.trim(),n=v===''?t:Number(v);
 if(!isFinite(n)||n+.001<t){$('#perr').textContent='เงินที่รับน้อยกว่ายอดรวม';return}
 await submitSale('cash',n);
}
function payTransfer(){
 if(!cart.length)return;cid=newCid();const t=total();
 dlg(`<h3>โอนเงิน</h3><div class="big">${fm(t)}</div>
 <p class="sub" style="text-align:center">ให้ลูกค้าสแกนจ่ายตามยอดนี้ ตรวจว่าเงินเข้าแล้วจึงกดบันทึก</p><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button id="okb" class="btn pri lg" onclick="submitSale('transfer')">ได้รับเงินแล้ว บันทึกบิล</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`);
}
async function submitSale(method,rec){
 if(busy)return;busy=true;const b=$('#okb');if(b){b.disabled=true;b.textContent='กำลังบันทึก…'}
 try{
  const j=await api({action:'posSale',clientId:cid,method,received:rec,cart:cart.map(l=>({id:l.id,qty:l.qty,price:l.price}))});
  (j.items||[]).forEach(u=>{const k=items.findIndex(x=>x.id===u.id);if(k>=0)items[k]=u});
  cart=[];saveCart();busy=false;showReceipt(j.sale,true);repaintSell(false);
 }catch(e){busy=false;const p=$('#perr');if(p)p.textContent=e.message;if(b){b.disabled=false;b.textContent=method==='cash'?'บันทึกบิล':'ได้รับเงินแล้ว บันทึกบิล'}}
}

/* ---------- ใบเสร็จ (บิลเงินสด) ---------- */
function rcptHtml(s){
 const L=(a,b,c)=>`<div class="ln"><span>${a}</span><span>${b}</span></div>`;
 return `<div class="rcpt"><h4>${esc(cfg.shop||'ร้านค้า')}</h4>${cfg.addr?`<div class="c">${esc(cfg.addr)}</div>`:''}${cfg.tel?`<div class="c">โทร ${esc(cfg.tel)}</div>`:''}
 <div class="c" style="margin-top:4px"><b>บิลเงินสด</b>${s.status!=='ปกติ'?' (ยกเลิก)':''}</div><hr>
 <div class="ln"><span>เลขที่ ${esc(s.saleNo)}</span><span>${esc(tthai(s.at))}</span></div><hr>
 ${s.items.map(l=>L(`${esc(l.name)}<br><small>${fm(l.qty)} × ${fm(l.price)}${l.unit?' '+esc(l.unit):''}</small>`,fm(l.amt))).join('')}<hr>
 <div class="ln tt"><span>รวมทั้งสิ้น</span><span>${fm(s.total)} บาท</span></div>
 ${s.method==='cash'?L('รับเงินสด',fm(s.received))+L('เงินทอน',fm(s.change)):L('ชำระโดย','โอนเงิน')}
 ${cfg.note?`<hr><div class="c">${esc(cfg.note)}</div>`:''}${s.status!=='ปกติ'?`<div class="vd">ยกเลิกแล้ว${s.voidReason?' · '+esc(s.voidReason):''}</div>`:''}</div>`;
}
function showReceipt(s,fresh){
 window.__rs=s;
 dlg(`${fresh?`<h3 style="text-align:center">บันทึกบิลแล้ว</h3>${s.method==='cash'?`<div class="chg"><small>เงินทอน</small><b>${fm(s.change)}</b></div>`:`<div class="chg"><small>รับโอนแล้ว</small><b>${fm(s.total)}</b></div>`}`:`<h3>${esc(s.saleNo)}</h3>`}
 ${rcptHtml(s)}
 <div class="acts2"><button class="btn pri lg" onclick="printRcpt()">พิมพ์ใบเสร็จ / บันทึก PDF</button><button class="btn" id="donebtn" onclick="closeDlg()">${fresh?'ขายรายการถัดไป':'ปิด'}</button></div>`,'donebtn');
 if(fresh&&cfg.autoPrint)setTimeout(printRcpt,200);
}
function printStyle(){
 const p=cfg.paper||'80',W={'80':['80mm auto','2mm','72mm','13px'],'58':['58mm auto','1.5mm','51mm','11px'],'a4':['A4','12mm','100mm','14px']}[p]||['80mm auto','2mm','72mm','13px'];
 let e=document.getElementById('pstyle');if(!e){e=document.createElement('style');e.id='pstyle';document.head.appendChild(e)}
 e.textContent=`@page{size:${W[0]};margin:${W[1]}}@media print{body.pos.printing #mroot .dlg>.rcpt{width:${W[2]}!important;font-size:${W[3]}!important;padding:0!important}}`;
}
function printRcpt(){printStyle();document.body.classList.add('printing');setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('printing'),500)},30)}

/* ---------- สินค้าใหม่ / แก้ไขสินค้า ---------- */
function itemForm(it,bc,nm){
 const x=it||{barcode:bc,name:nm,unit:'',cost:'',price:'',maxPrice:'',stock:'',minStock:''},pn=it?1:(lastPn||1);
 const top=`<label class="fld"><span class="lbl">บาร์โค้ด</span><input id="f_bc" class="inp" value="${esc(x.barcode)}" ${bc?'readonly':''} placeholder="ไม่มีก็เว้นว่างได้">${bc?'':'<button type="button" class="btn" style="margin-top:6px" onclick="genOwnCode()">สร้างบาร์โค้ดของร้าน (สำหรับสินค้าที่ไม่มีบาร์โค้ด)</button>'}</label>
 <label class="fld"><span class="lbl">ชื่อสินค้า <span class="req">*</span></span><input id="f_nm" class="inp" value="${esc(x.name)}" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#f_cost').focus()}"><span id="f_nmh" class="hint"></span></label>`;
 const mkf=`<label class="fld"><span class="lbl">กำไรสินค้านี้ (%)</span><input id="f_mk2" class="inp" inputmode="decimal" value="${x.mk===''||x.mk==null?'':x.mk}" placeholder="${cfg.mk} (ค่ากลาง)" oninput="fCost()"></label>`;
 const pack=it?`<div class="row2"><label class="fld"><span class="lbl">ราคาทุนต่อห่อ (บาท)</span><input id="f_cost" class="inp" inputmode="decimal" value="${x.cost===''?'':x.cost}" oninput="fCost()"></label>${mkf}</div>
 <label class="fld"><span class="lbl">ราคาขายต่อห่อ <span class="req">*</span></span><input id="f_price" class="inp" inputmode="decimal" value="${x.price===''?'':x.price}" oninput="fMk()" onkeydown="if(event.key==='Enter'){event.preventDefault();saveItemDlg()}"></label>
 <input id="f_pn" type="hidden" value="1"><input id="f_pk" type="hidden" value=""><input id="f_stock" type="hidden" value="${x.stock}">`
 :`<div class="row2"><label class="fld"><span class="lbl">ราคาซื้อมา (บาท)</span><input id="f_cost" class="inp" inputmode="decimal" oninput="fCost()" placeholder="เช่น 200" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#f_pn').focus()}"></label>
 <label class="fld"><span class="lbl">ซื้อมาแพ็คละกี่ห่อ</span><input id="f_pn" class="inp" inputmode="numeric" value="${pn}" oninput="fCost()" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#f_pk').focus()}"></label></div>
 <p class="sub" style="margin:-4px 0 8px">ซื้อเป็นแพ็คใส่ราคาแพ็คกับจำนวนห่อ ซื้อเป็นห่อเดียวใส่ 1</p>
 <div class="row2"><label class="fld"><span class="lbl">รับเข้ากี่แพ็ค</span><input id="f_pk" class="inp" inputmode="decimal" oninput="fCost()" placeholder="เช่น 2" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#f_mk2').focus()}"></label>${mkf}</div>
 <label class="fld"><span class="lbl">ราคาขายต่อห่อ <span class="req">*</span></span><input id="f_price" class="inp" inputmode="decimal" oninput="fMk()" onkeydown="if(event.key==='Enter'){event.preventDefault();saveItemDlg(true)}"></label>
 <input id="f_stock" type="hidden" value="">`;
 return top+pack+`<div id="f_mk" class="hint"></div>
 <div class="row2"><label class="fld"><span class="lbl">หน่วย</span><input id="f_unit" class="inp" value="${esc(x.unit)}" placeholder="ห่อ ขวด ซอง"></label>
 <label class="fld"><span class="lbl">เตือนเมื่อเหลือไม่เกิน</span><input id="f_min" class="inp" inputmode="decimal" value="${x.minStock?x.minStock:''}"></label></div><div id="perr" class="err" role="alert"></div>`;
}
let lastPn=1;
const nOf=()=>{const n=Number($('#f_pn').value);return n>0?n:1};
// ราคาขายต่อห่อ = (ราคาซื้อ ÷ จำนวนห่อ) + กำไร% ปัดขึ้นเต็มบาท คิดจากราคาแพ็คโดยตรง ไม่ปัดทุนก่อน
function itemMk(v){return v!==''&&v!=null&&isFinite(Number(v))&&Number(v)>=0?Number(v):(Number(cfg.mk)>=0?Number(cfg.mk):30)}
function calcPackPrice(pack,n,mkv){pack=Number(pack);if(!(pack>0))return 0;const mk=itemMk(mkv);return Math.ceil(Math.round(pack*100)*(100+mk)/(10000*(n>0?n:1))-1e-9)}
function fCost(){
 const c=Number($('#f_cost').value),n=nOf(),k=Number($('#f_pk').value);
 if(c>0)$('#f_price').value=calcPackPrice(c,n,$('#f_mk2').value.trim());
 $('#f_stock').value=k>0?r2(k*n):'';
 fMk();
}
function fMk(){
 const c=Number($('#f_cost').value),n=nOf(),p=Number($('#f_price').value),k=Number($('#f_pk')?$('#f_pk').value:0),e=$('#f_mk');if(!e)return;
 if(c>0&&p>0){const cp=c/n,m=mkPct(cp,p);
  e.innerHTML=`ทุนห่อละ <b>${fm(r2(cp))}</b> → ขายห่อละ <b>${fm(p)}</b> บาท ${mkTag(cp,p)} (บวก ${itemMk($('#f_mk2').value.trim())}% ปัดขึ้นเป็นบาทเต็ม)${k>0&&n>0?` · รับเข้า <b>${fm(r2(k*n))}</b> ห่อ`:''}`}
 else e.textContent=c>0?'':'ใส่ราคาซื้อ ระบบคำนวณราคาขายต่อห่อให้ หรือกรอกราคาขายเองก็ได้';
}
let editId='';
function newItemDlg(bc,nm){
 editId='';dlg(`<h3>${bc?'สินค้าใหม่ — ยังไม่เคยบันทึก':'เพิ่มสินค้า'}</h3>${bc?`<p class="sub">กรอกชื่อและราคาทุน ระบบบวกกำไรให้และบันทึกเข้าฐานข้อมูลทันที ครั้งต่อไปยิงแล้วเข้าบิลเลย</p>`:''}${itemForm(null,bc,nm)}
 <div class="acts2"><button class="btn pri lg" id="svb" onclick="saveItemDlg(true)">บันทึกและใส่บิล</button><button class="btn" onclick="saveItemDlg(false)">บันทึกอย่างเดียว</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,nm?'f_cost':'f_nm');
 fMk();
 if(bc&&!nm)lookupName(bc);
}
function editItemDlg(id){
 const it=find(id);if(!it)return;editId=id;
 dlg(`<h3>แก้ไขสินค้า</h3>${itemForm(it)}<div class="acts2"><button class="btn pri lg" onclick="saveItemDlg(false)">บันทึก</button><button class="btn" onclick="movesDlg('${id}')">ประวัติสต๊อก</button><button class="btn dng" onclick="delItem('${id}')">ลบสินค้า</button><button class="btn" onclick="closeDlg()">ปิด</button></div>`,'f_nm');
 fMk();
}
async function saveItemDlg(addCart){
 if(busy)return;const g=i=>$('#'+i).value.trim(),isNew=!editId,n=nOf();
 const raw=g('f_cost')===''?0:Number(g('f_cost')),cost=isNew?(raw>0?Math.round(raw/n*10000)/10000:0):raw;
 const stock=isNew&&Number(g('f_pk'))>0?r2(Number(g('f_pk'))*n):0;
 const item={id:editId||undefined,barcode:g('f_bc'),name:g('f_nm'),unit:g('f_unit'),cost,price:g('f_price')===''?NaN:Number(g('f_price')),maxPrice:(editId&&find(editId)?find(editId).maxPrice:0)||0,minStock:g('f_min')===''?0:Number(g('f_min')),mk:g('f_mk2')===''?null:Number(g('f_mk2')),stock};
 const er=$('#perr');
 if(!item.name){er.textContent='กรุณากรอกชื่อสินค้า';return}
 if(!isFinite(item.price)||item.price<=0){er.textContent='กรุณาใส่ราคาขาย (หรือใส่ราคาซื้อให้ระบบคำนวณ)';return}
 if(isNew&&n>1)lastPn=n;
 busy=true;
 try{
  const j=await api({action:'posSaveItem',item}),u=j.item,k=items.findIndex(x=>x.id===u.id);
  if(k>=0)items[k]=u;else items.push(u);items.sort((a,b)=>a.name.localeCompare(b.name,'th'));
  if(isNew)setPk(u.id,n);
  busy=false;closeDlg(true);toast('บันทึกสินค้าแล้ว'+(stock?' · รับเข้า '+fm(stock)+' ห่อ':''));
  if(addCart===true)addById(u.id,1);else render();
  if(view==='sell')setTimeout(focusScan,30);
 }catch(e){busy=false;er.textContent=e.message}
}
const PKK='mdr_pos_pk';
const getPk=id=>{try{return Number((JSON.parse(localStorage.getItem(PKK))||{})[id])||1}catch(e){return 1}};
const setPk=(id,n)=>{try{const m=JSON.parse(localStorage.getItem(PKK))||{};m[id]=n;localStorage.setItem(PKK,JSON.stringify(m))}catch(e){}};
// ค้นชื่อสินค้าจากฐานข้อมูลสินค้าออนไลน์ (Open Food Facts) ถ้าไม่เจอหรือเน็ตช้า ให้พิมพ์ชื่อเอง
async function lookupName(bc){
 const h=$('#f_nmh');if(h)h.textContent='กำลังค้นชื่อสินค้า…';
 let nm='';
 try{
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),4000);
  const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(bc)+'.json?fields=product_name,product_name_th,generic_name,brands',{signal:ac.signal});clearTimeout(tm);
  const j=await r.json();
  if(j&&j.status===1&&j.product){const p=j.product;nm=String(p.product_name_th||p.product_name||p.generic_name||'').trim();const br=String(p.brands||'').split(',')[0].trim();if(nm&&br&&!nm.toLowerCase().includes(br.toLowerCase()))nm=br+' '+nm}
 }catch(e){}
 const f=$('#f_nm'),h2=$('#f_nmh');if(!f||!h2)return;
 if(nm&&!f.value.trim()){f.value=nm;h2.textContent='ชื่อจากฐานข้อมูลสินค้าออนไลน์ ตรวจและแก้ไขได้';try{$('#f_cost').focus()}catch(e){}}
 else h2.textContent=nm?'':'ไม่พบชื่อสินค้านี้ในฐานข้อมูลออนไลน์ พิมพ์ชื่อเอง ครั้งเดียวพอ';
}
function recvDlg(id){
 const it=find(id),pn=getPk(id);
 dlg(`<h3>รับสินค้าเข้า</h3><p class="sub">${esc(it.name)} · คงเหลือ ${fm(it.stock)} ห่อ · ทุนล่าสุดห่อละ ${fm(r2(it.cost))}</p>
 <div class="row2"><label class="fld"><span class="lbl">รับเข้ากี่แพ็ค</span><input id="r_k" class="inp" inputmode="decimal" oninput="rNew('${id}')" onkeydown="if(event.key==='Enter')$('#r_c').focus()"></label>
 <label class="fld"><span class="lbl">แพ็คละกี่ห่อ</span><input id="r_n" class="inp" inputmode="numeric" value="${pn}" oninput="rNew('${id}')" onfocus="this.select()"></label></div>
 <label class="fld"><span class="lbl">ราคาซื้อต่อแพ็ค (บาท)</span><input id="r_c" class="inp" inputmode="decimal" value="${it.cost?r2(it.cost*pn):''}" oninput="rNew('${id}')" onkeydown="if(event.key==='Enter')doRecv('${id}')"></label>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="r_p" checked onchange="rNew('${id}')"> <span>ถ้าทุนเปลี่ยน ให้คำนวณราคาขายใหม่</span></label><div id="r_x" class="hint"></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="doRecv('${id}')">บันทึกรับเข้า</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'r_k');
 rNew(id);
}
function recvVals(id){const it=find(id),k=Number($('#r_k').value),nv=Number($('#r_n').value),n=nv>0?nv:1,c=$('#r_c').value.trim(),pack=c===''?0:Number(c);return{it,k,n,pack,qty:k>0?r2(k*n):0,cost:pack>0?Math.round(pack/n*10000)/10000:it.cost}}
function rNew(id){
 const v=recvVals(id),e=$('#r_x');if(!e)return;let t='';
 if(v.qty>0)t+=`รับเข้า <b>${fm(v.qty)}</b> ห่อ → คงเหลือ ${fm(r2(v.it.stock+v.qty))}`;
 if(v.pack>0){t+=`${t?' · ':''}ทุนห่อละ <b>${fm(r2(v.cost))}</b>`;if($('#r_p').checked&&Math.abs(v.cost-v.it.cost)>1e-6){const p=calcPackPrice(v.pack,v.n,v.it.mk);t+=` · ราคาขายใหม่ <b>${fm(p)}</b> (เดิม ${fm(v.it.price)})`}}
 e.innerHTML=t;
}
async function doRecv(id){
 if(busy)return;const v=recvVals(id);
 if(!(v.qty>0)){$('#perr').textContent='กรุณาใส่จำนวนแพ็คที่รับ';return}
 busy=true;
 try{
  let j=await api({action:'posReceive',id,qty:v.qty,cost:v.pack>0?v.cost:undefined});let u=j.item;
  if($('#r_p').checked&&v.pack>0&&Math.abs(u.cost-v.it.cost)>1e-6){const np=calcPackPrice(v.pack,v.n,v.it.mk);if(np>0&&(!u.maxPrice||np<=u.maxPrice)){u=(await api({action:'posSaveItem',item:{...u,price:np}})).item}}
  setPk(id,v.n);const k=items.findIndex(x=>x.id===id);items[k]=u;busy=false;closeDlg(true);toast('รับเข้าแล้ว คงเหลือ '+fm(u.stock)+' ห่อ');render();
 }catch(e){busy=false;$('#perr').textContent=e.message}
}
function adjDlg(id){
 const it=find(id);
 dlg(`<h3>ปรับยอดสต๊อก (นับจริง)</h3><p class="sub">${esc(it.name)} · ในระบบ ${fm(it.stock)}</p><label class="fld"><span class="lbl">จำนวนที่นับได้จริง</span><input id="a_s" class="inp" inputmode="decimal" value="${it.stock}" onkeydown="if(event.key==='Enter')doAdj('${id}')"></label><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="doAdj('${id}')">บันทึก</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'a_s');
}
async function doAdj(id){
 if(busy)return;const v=$('#a_s').value.trim();if(v===''||!isFinite(Number(v))){$('#perr').textContent='ใส่จำนวนให้ถูกต้อง';return}
 busy=true;try{const u=(await api({action:'posAdjust',id,stock:Number(v)})).item;items[items.findIndex(x=>x.id===id)]=u;busy=false;closeDlg(true);toast('ปรับยอดแล้ว');render()}catch(e){busy=false;$('#perr').textContent=e.message}
}

/* ---------- หน้าสินค้า / สต๊อก ---------- */
function itemsView(){
 const t=q.trim().toLowerCase();
 let l=items.filter(i=>!t||i.name.toLowerCase().includes(t)||(i.barcode||'').includes(t));
 if(flt==='low')l=l.filter(i=>i.stock<=0||(i.minStock>0&&i.stock<=i.minStock));
 const nlow=items.filter(i=>i.stock<=0||(i.minStock>0&&i.stock<=i.minStock)).length,val=r2(items.reduce((a,i)=>a+Math.max(0,i.stock)*i.cost,0));
 return `<div class="lhead"><h2 class="h2">สินค้า / สต๊อก</h2><button class="btn pri" onclick="newItemDlg('','')">+ เพิ่มสินค้า</button></div>
 <div class="sc"><div><small>จำนวนสินค้า</small><b>${fm(items.length)}</b></div><div><small>มูลค่าสต๊อก (ต้นทุน)</small><b>${fm(val)}</b></div><div><small>ใกล้หมด / หมด</small><b style="color:${nlow?'#c0261a':'inherit'}">${fm(nlow)}</b></div></div>
 <input id="isearch" class="inp" placeholder="ค้นหาชื่อ หรือยิงบาร์โค้ด" value="${esc(q)}" oninput="q=this.value;iList()" onkeydown="if(event.key==='Enter')itemScan(this.value)">
 <div class="chips"><button class="cat" aria-pressed="${flt!=='low'}" onclick="flt='';render()">ทั้งหมด</button><button class="cat" aria-pressed="${flt==='low'}" onclick="flt='low';render()">ใกล้หมด (${nlow})</button><button class="cat" onclick="lbDlg()">พิมพ์ป้ายบาร์โค้ด</button><button class="cat" onclick="exportItems()">ส่งออก CSV</button></div>
 <div id="ilist">${iRows(l)}</div>`;
}
function iList(){const t=q.trim().toLowerCase();let l=items.filter(i=>!t||i.name.toLowerCase().includes(t)||(i.barcode||'').includes(t));if(flt==='low')l=l.filter(i=>i.stock<=0||(i.minStock>0&&i.stock<=i.minStock));$('#ilist').innerHTML=iRows(l)}
function itemScan(v){v=v.trim();const it=items.find(i=>i.barcode&&i.barcode===v);if(it){editItemDlg(it.id);return}if(/^\d{6,}$/.test(v))newItemDlg(v,'')}
function iRows(l){
 if(!l.length)return `<div class="empty2">${items.length?'ไม่พบสินค้า':'ยังไม่มีสินค้า — ยิงบาร์โค้ดในหน้าขายเพื่อเพิ่มทีละชิ้น หรือกด “เพิ่มสินค้า”'}</div>`;
 return l.slice(0,300).map(i=>{const low=i.stock<=0||(i.minStock>0&&i.stock<=i.minStock);
  return `<div class="it"><b>${esc(i.name)}</b><div class="stk${low?' low':''}">${fm(i.stock)}<small>${esc(i.unit||'คงเหลือ')}</small></div>
  <div class="meta">${i.barcode?esc(i.barcode)+' · ':''}ขาย ${fm(i.price)}${i.cost?' · ทุน '+fm(r2(i.cost))+' '+mkTag(i.cost,i.price):''}${i.mk!==''&&i.mk!=null?' · <span class="mk">ตั้งกำไรเอง '+i.mk+'%</span>':''}${i.maxPrice?' · สูงสุด '+fm(i.maxPrice):''}</div>
  <div class="acts"><button class="btn" onclick="recvDlg('${i.id}')">รับเข้า</button><button class="btn" onclick="adjDlg('${i.id}')">ปรับยอด</button><button class="btn" onclick="editItemDlg('${i.id}')">แก้ไข</button><button class="btn" onclick="lbDlg(['${i.id}'])">ป้าย</button></div></div>`}).join('');
}
function csvDl(name,rows){
 const c=v=>{v=String(v==null?'':v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 const blob=new Blob(['﻿'+rows.map(r=>r.map(c).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function exportItems(){csvDl(`สินค้า-${today()}.csv`,[['บาร์โค้ด','ชื่อสินค้า','หน่วย','ต้นทุน','ราคาขาย','ราคาสูงสุด','คงเหลือ','เตือนเมื่อเหลือ']].concat(items.map(i=>[i.barcode,i.name,i.unit,i.cost,i.price,i.maxPrice||'',i.stock,i.minStock||''])))}

/* ---------- รายงาน ---------- */
function range(k){
 const t=today(),d=new Date(t+'T00:00:00Z'),ymd=x=>x.toISOString().slice(0,10),y=d.getUTCFullYear(),m=d.getUTCMonth();
 if(k==='today')return[t,t];if(k==='yest'){const x=new Date(d-864e5);return[ymd(x),ymd(x)]}
 if(k==='month')return[ymd(new Date(Date.UTC(y,m,1))),t];
 if(k==='pmonth')return[ymd(new Date(Date.UTC(y,m-1,1))),ymd(new Date(Date.UTC(y,m,0)))];
 if(k==='year')return[ymd(new Date(Date.UTC(y,0,1))),t];
 return[rfrom||t,rto||rfrom||t];
}
async function loadReport(){
 const[f,t]=range(rng);report=null;const pv=$('#pv');if(pv&&view==='rep')pv.innerHTML=repView();
 try{report=await api({action:'posReport',from:f,to:t})}catch(e){toast(e.message)}
 if(view==='rep'&&$('#pv'))$('#pv').innerHTML=repView();
}
function setRng(k){rng=k;if(k==='custom'){rfrom=rfrom||today();rto=rto||today();render();return}loadReport()}
function repView(){
 const chip=(k,t)=>`<button class="cat" aria-pressed="${rng===k}" onclick="setRng('${k}')">${t}</button>`;
 const r=report;
 return `<div class="lhead"><h2 class="h2">รายงานยอดขาย</h2></div>
 <div class="chips">${chip('today','วันนี้')}${chip('yest','เมื่อวาน')}${chip('month','เดือนนี้')}${chip('pmonth','เดือนก่อน')}${chip('year','ปีนี้')}${chip('custom','เลือกช่วง')}</div>
 ${rng==='custom'?`<div class="row2"><label class="fld" style="margin-top:0"><span class="lbl">ตั้งแต่</span><input type="date" class="inp" value="${rfrom}" onchange="rfrom=this.value"></label><label class="fld" style="margin-top:0"><span class="lbl">ถึง</span><input type="date" class="inp" value="${rto}" onchange="rto=this.value"></label></div><button class="btn pri w" style="margin:10px 0" onclick="loadReport()">ดูรายงาน</button>`:''}
 ${!r?'<div class="empty2">กำลังโหลด…</div>':`<p class="sub" style="margin-bottom:10px">${dthai(r.from)}${r.to!==r.from?' – '+dthai(r.to):''}${r.voided?` · ยกเลิก ${r.voided} บิล (ไม่รวมในยอด)`:''}</p>
 <div class="sc"><div><small>ยอดขาย</small><b>${fm(r.total)}</b></div><div class="pf"><small>กำไรขั้นต้น</small><b>${fm(r.profit)}</b></div><div><small>จำนวนบิล</small><b>${fm(r.bills)}</b></div><div><small>เงินสด</small><b>${fm(r.cash)}</b></div><div><small>โอน</small><b>${fm(r.transfer)}</b></div></div>
 <div class="chips"><button class="cat" onclick="exportDays()">ส่งออกสรุปรายวัน CSV</button><button class="cat" onclick="exportBills()">ส่งออกรายการบิล CSV</button></div>
 ${r.byDay.length?`<section class="sec"><h3>รายวัน</h3><table class="t"><tr><th>วันที่</th><th class="r">บิล</th><th class="r">ยอดขาย</th><th class="r">กำไร</th></tr>${r.byDay.map(d=>`<tr><td>${dthai(d.day)}</td><td class="r">${d.bills}</td><td class="r">${fm(d.total)}</td><td class="r">${fm(d.total-d.cost)}</td></tr>`).join('')}</table></section>`:''}
 ${r.top.length?`<section class="sec"><h3>ขายดี (เรียงตามยอดเงิน)</h3><table class="t"><tr><th>สินค้า</th><th class="r">ชิ้น</th><th class="r">ยอด</th><th class="r">กำไร</th></tr>${r.top.map(d=>`<tr><td>${esc(d.name)}</td><td class="r">${fm(d.qty)}</td><td class="r">${fm(d.amt)}</td><td class="r">${fm(d.profit)}</td></tr>`).join('')}</table></section>`:''}
 ${r.fast&&r.fast.length?`<section class="sec"><h3>ขายดี (เรียงตามจำนวนชิ้น)</h3><table class="t"><tr><th>#</th><th>สินค้า</th><th class="r">ขายได้</th><th class="r">กำไร</th></tr>${r.fast.map((d,i)=>`<tr><td>${i+1}</td><td>${esc(d.name)}</td><td class="r">${fm(d.qty)}</td><td class="r">${fm(d.profit)}</td></tr>`).join('')}</table></section>`:''}
 ${r.slow&&r.slow.length?`<section class="sec"><h3>ขายช้า / ค้างสต๊อก</h3><p class="sub">สินค้าที่ยังมีของแต่ขายได้น้อยที่สุดในช่วงนี้ — เงินทุนที่จมอยู่คือต้นทุน × จำนวนคงเหลือ ลองลดราคาหรือเลิกสั่งเพิ่ม</p><table class="t"><tr><th>สินค้า</th><th class="r">คงเหลือ</th><th class="r">ขายได้</th><th class="r">ทุนจม</th></tr>${r.slow.map(d=>`<tr><td>${esc(d.name)}</td><td class="r">${fm(d.stock)}</td><td class="r"${d.sold?'':' style="color:#c0261a;font-weight:700"'}>${d.sold?fm(d.sold):'ไม่เคยขาย'}</td><td class="r">${fm(d.tied)}</td></tr>`).join('')}</table></section>`:''}
 ${r.reorder&&r.reorder.length?`<section class="sec"><h3>แนะนำสั่งเพิ่ม</h3><p class="sub">คิดจากยอดขายเฉลี่ย ${fm(r.days)} วันที่เลือก สต๊อกพอขายไม่ถึง 7 วัน แนะนำจำนวนที่ควรมีไว้ขาย 14 วัน ถ้าเลือกช่วงสั้น (วันนี้) ตัวเลขจะคลาดเคลื่อน ควรดูเดือนนี้ขึ้นไป</p><table class="t"><tr><th>สินค้า</th><th class="r">เหลือ</th><th class="r">ขาย/วัน</th><th class="r">พอขาย</th><th class="r">สั่งเพิ่ม</th></tr>${r.reorder.map(d=>`<tr><td>${esc(d.name)}</td><td class="r">${fm(d.stock)}</td><td class="r">${fm(d.perDay)}</td><td class="r" style="color:#c0261a">${d.stock>0?fm(d.cover)+' วัน':'หมด'}</td><td class="r"><b>${fm(d.need)}</b></td></tr>`).join('')}</table><div class="chips"><button class="cat" onclick="exportReorder()">ส่งออกรายการสั่งของ CSV</button></div></section>`:''}
 ${r.low.length?`<section class="sec"><h3>ควรสั่งของเพิ่ม (${r.low.length})</h3><table class="t">${r.low.map(d=>`<tr><td>${esc(d.name)}</td><td class="r" style="color:#c0261a;font-weight:700">${fm(d.stock)} ${esc(d.unit)}</td></tr>`).join('')}</table></section>`:''}
 <section class="sec"><h3>บิลทั้งหมด (${r.sales.length})</h3>${r.sales.length?r.sales.slice(0,200).map((s,i)=>`<div class="bill${s.status!=='ปกติ'?' void':''}"><b>${esc(s.saleNo)}${s.status!=='ปกติ'?' (ยกเลิก)':''}</b><button class="btn sm" onclick="openBill(${i})">เปิด</button><small>${esc(tthai(s.at))} · ${s.method==='cash'?'เงินสด':'โอน'} · ${fm(s.total)} บาท</small></div>`).join(''):'<div class="empty2">ไม่มีบิลในช่วงนี้</div>'}</section>`}`;
}
function openBill(i){
 const s=report.sales[i];
 dlg(`<h3>${esc(s.saleNo)}</h3>${rcptHtml(s)}<div class="acts2"><button class="btn pri lg" onclick="window.__rs=report.sales[${i}];printRcpt()">พิมพ์ใบเสร็จ / บันทึก PDF</button>${s.status==='ปกติ'?`<button class="btn dng" onclick="voidBill(${i})">ยกเลิกบิล (คืนสต๊อก)</button>`:''}<button class="btn" onclick="closeDlg()">ปิด</button></div>`);
}
async function voidBill(i){
 const s=report.sales[i],why=prompt('เหตุผลที่ยกเลิกบิล '+s.saleNo+' (ไม่บังคับ)');if(why===null)return;
 try{await api({action:'posVoid',saleNo:s.saleNo,reason:why});closeDlg(true);const j=await api({action:'posInit'});items=j.items;toast('ยกเลิกบิลแล้ว');await loadReport()}catch(e){toast(e.message)}
}
function exportReorder(){const r=report;csvDl(`รายการสั่งของ-${r.from}-${r.to}.csv`,[['สินค้า','คงเหลือ','ขายเฉลี่ย/วัน','พอขายกี่วัน','แนะนำสั่งเพิ่ม']].concat(r.reorder.map(d=>[d.name,d.stock,d.perDay,d.stock>0?d.cover:0,d.need])))}
function exportDays(){const r=report;csvDl(`สรุปยอดขายรายวัน-${r.from}-${r.to}.csv`,[['วันที่','จำนวนบิล','ยอดขาย','เงินสด','โอน','ต้นทุน','กำไรขั้นต้น']].concat(r.byDay.map(d=>[d.day,d.bills,d.total,d.cash,d.transfer,d.cost,r2(d.total-d.cost)])).concat([['รวม',r.bills,r.total,r.cash,r.transfer,r.cost,r.profit]]))}
function exportBills(){const r=report;csvDl(`รายการบิล-${r.from}-${r.to}.csv`,[['เลขที่บิล','วันเวลา','ยอดรวม','ชำระโดย','สถานะ','รายการสินค้า']].concat(r.sales.slice().reverse().map(s=>[s.saleNo,s.at,s.total,s.method==='cash'?'เงินสด':'โอน',s.status,s.items.map(l=>`${l.name} x${l.qty}`).join('; ')])))}

/* ---------- ตั้งค่า ---------- */
function setView(){
 const f=(id,l,v,ph='',t='')=>`<label class="fld"><span class="lbl">${l}</span><input id="${id}" class="inp" value="${esc(v)}" placeholder="${ph}" ${t}></label>`;
 return `<div class="lhead"><h2 class="h2">ตั้งค่าร้าน</h2></div>
 <section class="sec"><h3>ข้อมูลบนใบเสร็จ</h3>${f('s_shop','ชื่อร้าน',cfg.shop)}${f('s_addr','ที่อยู่',cfg.addr)}${f('s_tel','เบอร์โทร',cfg.tel)}${f('s_note','ข้อความท้ายใบเสร็จ',cfg.note)}</section>
 <section class="sec"><h3>กำไร</h3><p class="sub">ใส่ราคาทุนแล้วระบบบวกกำไรตามนี้ ปัดขึ้นเป็นบาทเต็ม ไม่มีเศษทศนิยม เช่น ทุน 7 บวก 30% ได้ 9.1 ขาย 10 บาท</p>
 ${f('s_mk','กำไร (%) ของทุกรายการ',cfg.mk,'30','inputmode="decimal"')}</section>
 <section class="sec"><h3>แจ้งเตือนเข้า LINE</h3><p class="sub">ใช้ LINE กลุ่มเดียวกับแจ้งเตือนออเดอร์ (โควตาฟรีประมาณ 300 ข้อความต่อเดือน ข้อความนี้ใช้วันละไม่เกิน 2 ข้อความ)</p>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="s_nst"${cfg.notiStock!==false?' checked':''}> <span>แจ้งสต๊อกตอนเช้า (สินค้าหมด และสินค้าเหลือน้อย)</span></label>
 <label class="fld"><span class="lbl">เวลาแจ้งสต๊อก</span><select id="s_sth" class="inp">${hourOpts(cfg.stockHour==null?8:cfg.stockHour)}</select></label>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="s_nsa"${cfg.notiSales!==false?' checked':''}> <span>สรุปยอดขายและกำไร (วันนี้ เดือนนี้ ปีนี้)</span></label>
 <label class="fld"><span class="lbl">เวลาสรุปยอดขาย</span><select id="s_sah" class="inp">${hourOpts(cfg.salesHour==null?20:cfg.salesHour)}</select></label>
 <label class="fld"><span class="lbl">เตือนเมื่อสต๊อกเหลือไม่เกิน (ใช้กับสินค้าที่ไม่ได้ตั้งเกณฑ์เอง ใส่ 0 = ปิด)</span><input id="s_low" class="inp" inputmode="decimal" value="${cfg.lowDefault||0}"></label>
 <div class="acts2" style="margin-top:8px"><button class="btn" onclick="testNoti('stock')">ส่งสรุปสต๊อกตอนนี้</button><button class="btn" onclick="testNoti('sales')">ส่งสรุปยอดขายตอนนี้</button></div>
 <div class="note2">ต้องตั้งให้ระบบรันทุกชั่วโมงใน Cloudflare (ดูในคู่มือ) ถึงจะส่งตามเวลาที่เลือก กดปุ่มทดสอบได้เลยโดยไม่ต้องรอ เกณฑ์เตือนของสินค้าแต่ละชิ้นตั้งได้ในหน้าแก้ไขสินค้า (ช่อง “เตือนเมื่อเหลือไม่เกิน”)</div></section>
 <section class="sec"><h3>เครื่องพิมพ์ใบเสร็จ</h3><p class="sub">เลือกขนาดกระดาษให้ตรงกับเครื่อง แล้วกด “พิมพ์ใบเสร็จ” ในหน้าบิล ระบบจะส่งเข้าเครื่องพิมพ์ที่เลือกในหน้าต่างพิมพ์</p>
 <label class="fld"><span class="lbl">ขนาดกระดาษ</span><select id="s_paper" class="inp"><option value="80"${cfg.paper==='80'?' selected':''}>เครื่องพิมพ์สลิป 80 มม. (ทั่วไป)</option><option value="58"${cfg.paper==='58'?' selected':''}>เครื่องพิมพ์สลิป 58 มม.</option><option value="a4"${cfg.paper==='a4'?' selected':''}>A4 / เครื่องพิมพ์ทั่วไป</option></select></label>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="s_auto"${cfg.autoPrint?' checked':''}> <span>พิมพ์ใบเสร็จอัตโนมัติหลังบันทึกบิล</span></label>
 <div class="note2">ถ้าอยากให้พิมพ์ทันทีโดยไม่เด้งหน้าต่างถาม: ใน Chrome บนคอมพิวเตอร์ ให้เปิดด้วยตัวเลือก <b>--kiosk-printing</b> (ตั้งในปุ่มลัด) และตั้งเครื่องพิมพ์สลิปเป็นเครื่องพิมพ์เริ่มต้นของเครื่อง</div></section>
 <div id="perr" class="err" role="alert"></div><button class="btn pri lg w" onclick="saveCfg()">บันทึกตั้งค่า</button>
 <section class="sec" style="margin-top:22px"><h3 style="color:#c0261a">ล้างข้อมูลทดสอบ</h3><p class="sub">ใช้ก่อนเริ่มขายจริง เพื่อลบสินค้าและบิลที่ลองไว้ทั้งหมด</p><button class="btn dng w" onclick="resetDlg()">ล้างข้อมูลทดสอบ…</button></section>`;
}
const hourOpts=h=>Array.from({length:24},(_,i)=>`<option value="${i}"${i===Number(h)?' selected':''}>${String(i).padStart(2,'0')}:00 น.</option>`).join('');
async function testNoti(kind){
 try{const j=await api({action:'posNotify',kind});toast(j.ok?'ส่งเข้า LINE แล้ว':(j.error||'ส่งไม่สำเร็จ'))}catch(e){toast(e.message)}
}
async function saveCfg(){
 const g=i=>$('#'+i).value.trim();
 try{const j=await api({action:'posSaveCfg',cfg:{shop:g('s_shop'),addr:g('s_addr'),tel:g('s_tel'),note:g('s_note'),mk:Number(g('s_mk')),paper:$('#s_paper').value,autoPrint:$('#s_auto').checked,notiStock:$('#s_nst').checked,stockHour:Number($('#s_sth').value),notiSales:$('#s_nsa').checked,salesHour:Number($('#s_sah').value),lowDefault:Number(g('s_low')||0)}});cfg=j.cfg;toast('บันทึกตั้งค่าแล้ว');render()}catch(e){$('#perr').textContent=e.message}
}

function resetDlg(){
 dlg(`<h3 style="color:#c0261a">ล้างข้อมูลทดสอบ</h3><p class="sub">จะลบ <b>สินค้า บิลขาย และประวัติสต๊อก</b> ของระบบขายหน้าร้านทั้งหมด ย้อนกลับไม่ได้ (ข้อมูลสั่งซื้อออนไลน์และค่าตั้งค่าร้านไม่ถูกลบ)</p>
 <label class="fld"><span class="lbl">พิมพ์คำว่า <b>ล้างข้อมูล</b> เพื่อยืนยัน</span><input id="rs_t" class="inp" autocomplete="off" oninput="rsChk()" onkeydown="if(event.key==='Enter')doReset()"></label><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button id="rsb" class="btn dng lg" disabled onclick="doReset()">ล้างข้อมูลทั้งหมด</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'rs_t');
}
const rsChk=()=>{$('#rsb').disabled=$('#rs_t').value.trim()!=='ล้างข้อมูล'};
async function doReset(){
 if(busy||$('#rs_t').value.trim()!=='ล้างข้อมูล')return;busy=true;
 try{await api({action:'posReset',confirm:$('#rs_t').value.trim()});items=[];cart=[];saveCart();report=null;busy=false;closeDlg(true);toast('ล้างข้อมูลทดสอบแล้ว');render()}catch(e){busy=false;$('#perr').textContent=e.message}
}

(async()=>{
 if(CRED){try{await boot()}catch(e){CRED=null;try{sessionStorage.removeItem(CRK)}catch(x){}lerr=e.message==='unauthorized'?'':e.message}}
 render();
})();
window.addEventListener('beforeunload',saveCart);
