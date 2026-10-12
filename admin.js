// admin.js — หน้าผู้ดูแลร้าน (รองรับสินค้าหลายสิบรายการ)
// รหัสผู้ดูแล: โหมดเชื่อม Google Sheets ตรวจที่ Code.gs / โหมดทดลองดูที่ config.js
let authed=false,lerr='',lu='',loadErr='',logging=false,saving=false;
try{authed=REMOTE?Service.hasSession():sessionStorage.getItem('mdr_admin_ok')==='1'}catch(e){}
let ords=null,oerr='',oq='',ofl='all',oopen=null,draft=null,aview='list',aq='',af='all',as='order',menuId=null,dirty=false;
const sorted=()=>[...D.products].sort(bySort);
const persist=async m=>{
 if(saving){toast('กำลังบันทึกอยู่ รอสักครู่แล้วลองใหม่');return false}
 saving=true;if(REMOTE)toast('กำลังบันทึกลง Google Sheets…',60000);
 try{await Service.save(D);lists();toast(m||'บันทึกเรียบร้อยแล้ว');return true}
 catch(e){
  if(e.message==='unauthorized'){toast('หมดเวลาเข้าสู่ระบบ กรุณาเข้าใหม่');setTimeout(logout,300)}
  else toast('บันทึกไม่สำเร็จ: '+friendly(e.message),6000);
  return false;
 }finally{saving=false}
};
function lists(){
 $('#units').innerHTML=D.units.map(u=>`<option value="${esc(u)}">`).join('');
 $('#packs').innerHTML=D.packs.map(u=>`<option value="${esc(u)}">`).join('');
}
document.addEventListener('input',()=>{if(aview==='edit')dirty=true});
document.addEventListener('change',()=>{if(aview==='edit')dirty=true});
function loginView(){
 return `<main class="login"><section class="sec"><img class="logo-img" src="logo.gif" alt="" style="width:72px;height:72px;margin-bottom:12px"><h1 class="h2" style="margin:0 0 2px">เข้าสู่ระบบผู้ดูแล</h1><p class="sub">บริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด</p>
 <form onsubmit="return doLogin(event)"><div class="fld"><label class="lbl" for="lu">ชื่อผู้ใช้</label><input id="lu" class="inp" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(lu)}"></div>
 <div class="fld"><label class="lbl" for="lp">รหัสผ่าน</label><input id="lp" class="inp" type="password" autocomplete="current-password"></div>
 ${lerr?`<div class="err" role="alert">${lerr}</div>`:''}<button class="btn pri lg w" style="margin-top:16px" type="submit"${logging?' disabled':''}>${logging?'กำลังตรวจสอบ…':'เข้าสู่ระบบ'}</button></form></section>
 <p class="adminlink"><a href="index.html">กลับหน้าร้าน</a></p></main>`;
}
async function doLogin(e){
 e.preventDefault();
 if(logging)return false;
 const u=$('#lu').value.trim(),p=$('#lp').value;
 logging=true;lerr='';lu=u;render();
 let ok=false;
 try{ok=await Service.login(u,p)}catch(x){lerr=x.message}
 logging=false;
 if(ok){authed=true;lerr='';lu='';try{sessionStorage.setItem('mdr_admin_ok','1')}catch(x){}await loadAdmin();return false}
 if(!lerr)lerr='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
 render();const f=$('#lp');f&&f.focus();
 return false;
}
function logout(){authed=false;D=null;loadErr='';draft=null;dirty=false;aview='list';menuId=null;Service.logout();try{sessionStorage.removeItem('mdr_admin_ok')}catch(x){}render()}
async function loadAdmin(){
 loadErr='';D=null;render();
 try{D=await Service.loadAdmin();lists()}
 catch(e){if(e.message==='unauthorized'){logout();lerr='รหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่';render();return}loadErr=e.message||'โหลดข้อมูลไม่ได้'}
 render();
}

function render(){
 if(!authed){$('#app').innerHTML=loginView();return}
 if(!D){$('#app').innerHTML=loadErr
  ?`<div class="awrap" style="padding-top:20px"><div class="empty">${ic('info',44)}<p>${esc(loadErr)}</p><button class="btn pri lg" onclick="loadAdmin()">ลองใหม่</button><button class="btn" onclick="logout()">ออกจากระบบ</button></div></div>`
  :`<div class="awrap" style="padding-top:20px"><div class="sk" style="aspect-ratio:auto;height:220px"></div></div>`;return}
 $('#app').innerHTML=`<header class="top"><div class="bar"><img class="logo-img" src="logo.gif" alt=""><h1 class="brand"><b>จัดการสินค้า</b></h1><a class="swbtn" href="index.html">${ic('store',18)}<span class="t">หน้าร้านลูกค้า</span></a><button class="iconbtn" onclick="logout()" aria-label="ออกจากระบบ" title="ออกจากระบบ">${ic('logout')}</button></div></header>
 <main class="awrap">${tabs()}${aview==='edit'?editView():aview==='set'?setView():aview==='ord'?ordView():aview==='doc'?docView():aview==='ship'?shipView():listView()}</main>`;
 if(aview==='list')drawList();
}
function tabs(){
 const list=aview==='list'||(aview==='edit'&&draft&&!draft.isNew),nw=aview==='edit'&&draft&&draft.isNew;
 return `<nav class="tabs" aria-label="เมนูผู้ดูแล"><a href="#" class="${list?'on':''}" onclick="return nav('list')">สินค้า</a><a href="#" class="${nw?'on':''}" onclick="return nav('new')">เพิ่มสินค้า</a><a href="#" class="${aview==='ord'?'on':''}" onclick="return nav('ord')">คำสั่งซื้อ</a><a href="#" class="${aview==='set'?'on':''}" onclick="return nav('set')">ตั้งค่า</a></nav>`;
}
function nav(t){
 if(aview==='edit'&&dirty&&!confirm('ยังไม่ได้บันทึกการเปลี่ยนแปลง ออกจากหน้านี้หรือไม่?'))return false;
 dirty=false;
 if(t==='new')newP();else{draft=null;aview=t;render();if(t==='ord')loadOrders()}
 scrollTo(0,0);return false;
}

/* ---------- รายการสินค้า ---------- */
function connBanner(){return REMOTE?'':`<div class="note" role="alert" style="background:#fdecea;border-color:#f3b8b2">${ic('info',18)}<span><b>ยังไม่ได้เชื่อม Google Sheets</b> — ตอนนี้ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น สินค้าและคำสั่งซื้อจะไม่เข้าชีต ตรวจว่าไฟล์ <b>config.js</b> ยังอยู่ และมี <code>const API_URL='…/exec'</code></span></div>`}
function listView(){
 return connBanner()+`<div class="lhead"><h2 class="h2">สินค้าทั้งหมด</h2><button class="btn pri" onclick="nav('new')">+ เพิ่มสินค้า</button></div>
 <div class="tools"><div class="search">${ic('search')}<input id="aq" class="inp" type="search" autocomplete="off" aria-label="ค้นหาสินค้า" placeholder="ค้นหาชื่อสินค้า..." value="${esc(aq)}" oninput="aq=this.value;drawList()"></div>
 <div class="trow"><div id="achips" class="chips" role="group" aria-label="กรองสินค้า"></div>
 <label><span class="sr">เรียงตาม</span><select class="inp" onchange="as=this.value;drawList()"><option value="order"${as==='order'?' selected':''}>เรียงตามลำดับในร้าน</option><option value="name"${as==='name'?' selected':''}>เรียงตามชื่อ ก-ฮ</option><option value="sales"${as==='sales'?' selected':''}>ขายดีที่สุดก่อน</option></select></label></div></div>
 <div id="ameta" class="gmeta"></div><div id="alist" class="alist"></div>`;
}
function rowHtml(p,pos,total,can){
 const n=(p.variants||[]).length,open=menuId===p.id,id=p.id;
 return `<div class="aitem"><div class="arow${p.status?'':' off'}"><button class="rmain" onclick="editP('${id}')" aria-label="แก้ไข ${esc(p.name)}"><span class="athumb"><img referrerpolicy="no-referrer" src="${imgOf(p)}" alt="" loading="lazy" onerror="this.onerror=null;this.src=defImg('')"></span>
 <span style="min-width:0"><span class="rname">${esc(p.name)}</span><span class="rmeta">${n?n+' ตัวเลือก':'ไม่มีตัวเลือกขนาด'} · ลำดับ ${pos}</span>${soldText(p.id)?`<span class="rsold">${esc(soldText(p.id))} (${soldOrders(p.id)} ออเดอร์)</span>`:''}</span></button>
 <label class="sw"><input type="checkbox" ${p.status?'checked':''} onchange="tgl('${id}')" aria-label="แสดง ${esc(p.name)} ในหน้าร้าน"><span class="trk"></span><span class="swl">${p.status?'แสดง':'ซ่อน'}</span></label>
 <button class="iconbtn" onclick="menu('${id}')" aria-expanded="${open}" aria-label="ตัวเลือกเพิ่มเติมของ ${esc(p.name)}">${ic('dots')}</button></div>
 ${open?`<div class="racts">${can?`<button class="btn sm" ${pos>1?'':'disabled'} onclick="mv('${id}',-1)">${ic('up',16)} ขึ้น</button><button class="btn sm" ${pos<total?'':'disabled'} onclick="mv('${id}',1)">${ic('down',16)} ลง</button><button class="btn sm" ${pos>1?'':'disabled'} onclick="mvTop('${id}')">${ic('top',16)} บนสุด</button>`:`<span class="hint" style="margin:0">จัดลำดับได้เมื่อไม่มีการค้นหา/ตัวกรอง และเรียงตามลำดับในร้าน</span>`}<button class="btn sm" onclick="editP('${id}')">${ic('edit',16)} แก้ไข</button><button class="btn sm dng" onclick="del('${id}')">${ic('trash',16)} ลบ</button></div>`:''}</div>`;
}
function drawList(){
 const all=sorted(),on=all.filter(p=>p.status).length,k=aq.trim().toLowerCase();
 const pos=new Map(all.map((p,i)=>[p.id,i+1])),can=af==='all'&&!k&&as==='order';
 $('#achips').innerHTML=[['all','ทั้งหมด',all.length],['on','แสดงอยู่',on],['off','ซ่อนอยู่',all.length-on]]
  .map(([id,t,n])=>`<button class="chipb" aria-pressed="${af===id}" onclick="af='${id}';drawList()">${t} <b>${n}</b></button>`).join('');
 let l=all.filter(p=>(af==='all'||(af==='on')===!!p.status)&&(!k||String(p.name).toLowerCase().includes(k)));
 if(as==='name')l.sort((a,b)=>String(a.name).localeCompare(String(b.name),'th'));
 if(as==='sales')l.sort((a,b)=>soldOrders(b.id)-soldOrders(a.id)||bySort(a,b));
 $('#ameta').textContent=(all.length?`แสดง ${l.length} จาก ${all.length} รายการ`:'')+(REMOTE&&!D.hasSales?' · ⚠ Code.gs ที่ Deploy ไว้ยังเป็นเวอร์ชันเก่า (ยังไม่มียอดขาย) กรุณา Deploy เวอร์ชันใหม่':'');
 $('#alist').innerHTML=!all.length
  ?`<div class="empty">${ic('box',44)}<p>ยังไม่มีสินค้า</p><button class="btn pri lg" onclick="nav('new')">+ เพิ่มสินค้า</button></div>`
  :!l.length
  ?`<div class="empty">${ic('search',44)}<p>ไม่พบสินค้าที่ตรงกับที่ค้นหา</p><button class="btn" onclick="aq='';af='all';render()">ล้างการค้นหา</button></div>`
  :l.map(p=>rowHtml(p,pos.get(p.id),all.length,can)).join('');
}
async function tgl(id){
 const p=D.products.find(x=>x.id===id);if(!p)return;
 p.status=!p.status;
 if(await persist())drawList();else{p.status=!p.status;drawList()}
}

/* ---------- ตัวเลือกเพิ่มเติม (ย้าย/แก้ไข/ลบ) แสดงใต้แถวสินค้า ไม่เด้งป๊อบอัพ ---------- */
function menu(id){menuId=menuId===id?null:id;drawList()}
async function reorder(L){
 const prev=D.products.map(p=>p.sortOrder);
 L.forEach((p,n)=>p.sortOrder=n);
 if(await persist())drawList();else{D.products.forEach((p,n)=>p.sortOrder=prev[n]);drawList()}
}
function mv(id,d){const L=sorted(),i=L.findIndex(p=>p.id===id),j=i+d;if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];reorder(L)}
function mvTop(id){const L=sorted(),i=L.findIndex(p=>p.id===id);if(i<=0)return;L.unshift(L.splice(i,1)[0]);reorder(L)}
async function del(id){
 const p=D.products.find(x=>x.id===id);if(!p)return;
 if(!confirm(`ต้องการลบ “${p.name||'สินค้านี้'}” หรือไม่?\n(หากไม่แน่ใจ แนะนำให้กด “ซ่อน” แทน)`))return;
 const prev=D.products;
 D.products=D.products.filter(x=>x.id!==id);
 if(!await persist('ลบสินค้าเรียบร้อยแล้ว')){D.products=prev;return}
 menuId=null;if(aview==='edit'){draft=null;dirty=false;aview='list'}
 render();
}

/* ---------- เพิ่ม/แก้ไขสินค้า (บังคับแค่ชื่อสินค้า) ---------- */
// รหัสสินค้าใหม่นับต่อจากเลขสูงสุดที่มี: p50, p51, ...
function nextPid(){const n=D.products.reduce((m,p)=>{const x=/^p(\d+)$/.exec(String(p.id));return x?Math.max(m,+x[1]):m},0);return 'p'+(n+1)}
function newP(){
 draft={isNew:1,id:nextPid(),name:'',description:'',note:PRICE_NOTE,image:'',status:true,sortOrder:0,variants:defVariants()};
 aview='edit';dirty=false;render();
 const e=$('#pn');e&&e.focus();
}
function editP(id){
 const p=D.products.find(x=>x.id===id);if(!p)return;
 draft=JSON.parse(JSON.stringify(p));draft.variants=draft.variants||[];if(draft.note===undefined)draft.note=PRICE_NOTE;
 aview='edit';dirty=false;render();scrollTo(0,0);
}
function vrow(v,i){
 return `<div class="vrow${v.status?'':' off'}"><div class="vgrid">
 <div><label class="lbl" for="vs${i}">ขนาด</label><input id="vs${i}" class="inp" inputmode="decimal" autocomplete="off" placeholder="เช่น 500" value="${esc(v.size)}" oninput="draft.variants[${i}].size=this.value"></div>
 <div><label class="lbl" for="vu${i}">หน่วย</label><input id="vu${i}" class="inp" list="units" autocomplete="off" placeholder="เช่น กรัม" value="${esc(v.sizeUnit)}" oninput="draft.variants[${i}].sizeUnit=this.value"></div>
 <div><label class="lbl" for="vp${i}">บรรจุภัณฑ์</label><input id="vp${i}" class="inp" list="packs" autocomplete="off" placeholder="เช่น ถุง" value="${esc(v.packaging)}" oninput="draft.variants[${i}].packaging=this.value"></div>
 <div><label class="lbl" for="vr${i}">ราคา บาท (ลูกค้าเห็น)</label><input id="vr${i}" class="inp" type="number" inputmode="decimal" min="0" step="any" placeholder="ว่าง = แสดง $$$ บาท" value="${esc(v.price)}" oninput="draft.variants[${i}].price=this.value"></div></div>
 <div class="vfoot"><label class="sw inline"><input type="checkbox" ${v.status?'checked':''} onchange="draft.variants[${i}].status=this.checked;render()"><span class="trk"></span><span class="swl">${v.status?'แสดงให้ลูกค้า':'ปิดอยู่ (ลูกค้าไม่เห็น)'}</span></label>
 <div class="vact"><button class="btn sm" onclick="dupV(${i})">${ic('copy',16)} คัดลอก</button><button class="btn sm dng" onclick="delV(${i})">${ic('trash',16)} ลบ</button></div></div></div>`;
}
function editView(){
 const d=draft,on=d.variants.filter(v=>v.status).length;
 return `<div class="edit"><button class="back" onclick="nav('list')">${ic('back')} กลับไปรายการสินค้า</button><h2 class="h2">${d.isNew?'เพิ่มสินค้า':'แก้ไขสินค้า'}</h2>
 <section class="sec"><h3>1. ข้อมูลสินค้า</h3>
 <div class="fld"><label class="lbl" for="pn">ชื่อสินค้า <span class="req" aria-hidden="true">*</span></label><input id="pn" class="inp" autocomplete="off" value="${esc(d.name)}" oninput="draft.name=this.value;this.classList.remove('bad');$('#pne').textContent=''"><div class="err" id="pne" role="alert"></div></div>
 <div class="fld"><label class="lbl" for="pd">รายละเอียด <span class="opt-t">(ไม่บังคับ)</span></label><textarea id="pd" class="inp" rows="3" oninput="draft.description=this.value">${esc(d.description)}</textarea></div>
 <div class="fld"><label class="lbl" for="pnote">หมายเหตุสินค้า <span class="opt-t">(ลูกค้าเห็น ไม่บังคับ)</span></label><textarea id="pnote" class="inp" rows="2" oninput="draft.note=this.value">${esc(d.note)}</textarea><p class="hint">แสดงในหน้ารายละเอียดสินค้า เช่น แจ้งว่าราคาอาจมีการปรับเปลี่ยน ลบข้อความออกถ้าไม่ต้องการแสดง</p></div>
 <div class="fld"><span class="lbl">รูปสินค้า <span class="opt-t">(ไม่บังคับ)</span></span><div class="upl"><div class="prev"><img referrerpolicy="no-referrer" src="${imgOf(d)}" alt="ตัวอย่างรูปสินค้า" onerror="this.onerror=null;this.src=defImg('')"></div>
 <div class="ubtns">${d.image?'':`<span class="hint" style="margin:0">รูปตัวอย่างตามหมวด — อัปโหลดรูปจริงเพื่อแทนที่</span>`}<label class="btn sm">${ic('image',16)} ${d.image?'เปลี่ยนรูป':'อัปโหลดรูปจริง'}<input class="sr" type="file" accept="image/*" onchange="pickImg(this)"></label>${d.image?`<button class="btn sm dng" onclick="draft.image='';dirty=true;render()">ลบรูป</button>`:''}</div></div></div></section>
 <section class="sec"><h3>2. ขนาด / บรรจุภัณฑ์</h3><p class="sub">ไม่บังคับ · ลูกค้าเลือกตัวเลือกเหล่านี้ตอนสั่งซื้อ (แสดงสูงสุด ${MAXV} ตัวเลือก) · ถ้าไม่ใส่ ลูกค้าจะสั่งได้เลยโดยไม่ต้องเลือกขนาด · ราคาแสดงให้ลูกค้าเห็นทุกตัวเลือก ถ้ายังไม่กรอกจะแสดงเป็น “$$$ บาท” (ราคาโดยประมาณ)</p>
 ${on>MAXV?`<div class="err" role="alert">⚠️ เปิดไว้ ${on} ตัวเลือก แต่ลูกค้าเห็นสูงสุด ${MAXV} ตัวเลือก (ตัวบนสุดที่เปิดอยู่) กรุณาปิดตัวเลือกที่ไม่ต้องการ</div>`:''}
 ${d.variants.map(vrow).join('')}
 <button class="btn w" style="margin-top:12px" onclick="addV()">+ เพิ่มขนาด / บรรจุภัณฑ์</button></section>
 <section class="sec"><h3>3. การแสดงผล</h3><label class="sw inline" style="margin-top:6px"><input type="checkbox" ${d.status?'checked':''} onchange="draft.status=this.checked;render()"><span class="trk"></span><span class="swl">${d.status?'แสดงสินค้านี้ในหน้าร้าน':'ซ่อนสินค้านี้ (ลูกค้าไม่เห็น)'}</span></label><p class="hint">ลำดับสินค้าปรับได้ที่หน้ารายการสินค้า (ปุ่ม ⋯ ของแต่ละสินค้า)</p></section>
 ${d.isNew?'':`<button class="btn dng w" onclick="del('${d.id}')">${ic('trash')} ลบสินค้านี้</button>`}</div>
 <div class="savebar"><div class="in"><button class="btn pri lg" onclick="saveP()">${ic('check')} ${d.isNew?'บันทึกสินค้า':'บันทึกการเปลี่ยนแปลง'}</button>${d.isNew?`<button class="btn lg" onclick="saveP(true)">บันทึก + เพิ่มอีก</button>`:''}</div></div>`;
}
function addV(){draft.variants.push(mkV('','','','',draft.variants.length));dirty=true;render();const e=$('#vs'+(draft.variants.length-1));e&&e.focus()}
function dupV(i){const c=JSON.parse(JSON.stringify(draft.variants[i]));c.id=uid();draft.variants.splice(i+1,0,c);dirty=true;render()}
function delV(i){draft.variants.splice(i,1);dirty=true;render()}
function pickImg(inp){
 const f=inp.files[0];if(!f)return;
 const r=new FileReader();
 r.onerror=()=>toast('เปิดรูปไม่ได้ ลองเลือกรูปอื่น');
 r.onload=()=>{const im=new Image();
  im.onerror=()=>toast('ไฟล์นี้ไม่ใช่รูปภาพ');
  im.onload=()=>{const s=Math.min(1,480/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);draft.image=c.toDataURL('image/jpeg',.72);dirty=true;render()};
  im.src=r.result};
 r.readAsDataURL(f);
}
async function saveP(again){
 document.activeElement&&document.activeElement.blur();
 const d=draft,name=T(d.name);
 if(!name){const e=$('#pn');$('#pne').textContent='กรุณากรอกชื่อสินค้า';e.classList.add('bad');e.focus();return}
 const vs=[];
 d.variants.forEach(v=>{
  const size=T(v.size),pk=T(v.packaging),pr=T(v.price);
  if(!size&&!pk&&pr==='')return; // แถวว่าง ข้ามไป
  const n=Number(pr);
  vs.push({id:v.id,size,sizeUnit:size?T(v.sizeUnit):'',packaging:pk,price:pr===''||isNaN(n)?'':n,status:v.status,sortOrder:vs.length});
 });
 vs.forEach(v=>{[['sizeUnit','units'],['packaging','packs']].forEach(([k,l])=>{if(v[k]&&!D[l].includes(v[k]))D[l].push(v[k])})});
 // ตัวเลือกใหม่ได้รหัสนับต่อ เช่น p50v1, p50v2 (ตัวเดิมคงรหัสเดิม เพราะคำสั่งซื้อเก่าอ้างอิงอยู่)
 {const o0=D.products.find(p=>p.id===d.id),keep=new Set(((o0&&o0.variants)||[]).map(x=>x.id)),pre=d.id+'v';
  let vn=0;vs.forEach(v=>{if(keep.has(v.id)&&v.id.startsWith(pre)){const k=parseInt(v.id.slice(pre.length),10);if(k>vn)vn=k}});
  vs.forEach(v=>{if(!keep.has(v.id)){let id;do{id=pre+(++vn)}while(vs.some(x=>x.id===id));v.id=id}})}
 const out={id:d.id,name,description:T(d.description),note:T(d.note),image:d.image||'',status:d.status,sortOrder:d.sortOrder,variants:vs};
 const idx=D.products.findIndex(p=>p.id===d.id),old=idx<0?null:D.products[idx];
 if(idx<0){out.sortOrder=D.products.reduce((m,p)=>Math.max(m,p.sortOrder??0),-1)+1;D.products.push(out)}else D.products[idx]=out;
 if(!await persist(d.isNew?'เพิ่มสินค้าเรียบร้อยแล้ว':'บันทึกข้อมูลเรียบร้อยแล้ว')){
  if(idx<0)D.products.pop();else D.products[idx]=old;
  return;
 }
 dirty=false;
 if(again){newP();scrollTo(0,0)}else{draft=null;aview='list';render();scrollTo(0,0)}
}

/* ---------- คำสั่งซื้อ (อ่านอย่างเดียว ดูละเอียด/แก้สถานะได้ที่แท็บ Orders ในชีต) ---------- */
async function loadOrders(){
 oerr='';ords=null;render();
 try{ords=await Service.listOrders()}catch(e){if(e.message==='unauthorized'){logout();return}oerr=e.message||'โหลดคำสั่งซื้อไม่ได้'}
 if(aview==='ord')render();
}
const oaddr=o=>[o.addr,(o.prov==='กรุงเทพมหานคร'?'แขวง':'ตำบล')+(o.tam||''),(o.prov==='กรุงเทพมหานคร'?'เขต':'อำเภอ')+(o.amp||''),(o.prov==='กรุงเทพมหานคร'?'':'จ.')+(o.prov||''),o.zip].filter(Boolean).join(' ');
function ordView(){
 if(oerr)return `<div class="empty">${ic('info',44)}<p>${esc(oerr)}</p><button class="btn pri" onclick="loadOrders()">ลองใหม่</button></div>`;
 if(!ords)return `<div class="sk" style="aspect-ratio:auto;height:160px;margin-top:14px"></div>`;
 const l=fOrds();
 const cn=k=>ords.filter(o=>k==='all'||stText(o.status)===k).length;
 return `<div class="lhead"><h2 class="h2">คำสั่งซื้อล่าสุด</h2><button class="btn sm" onclick="loadOrders()">รีเฟรช</button></div>
 <div class="search">${ic('search')}<input class="inp" type="search" autocomplete="off" aria-label="ค้นหาคำสั่งซื้อ" placeholder="ค้นหาชื่อ / เบอร์ / เลขที่" value="${esc(oq)}" oninput="oq=this.value;$('#olist').innerHTML=ordRows()"></div>
 <div class="cats" role="group" aria-label="กรองสถานะ">${[['all','ทั้งหมด'],[ST_WAIT,ST_WAIT],[ST_SHIP,ST_SHIP]].map(c=>`<button class="cat" aria-pressed="${ofl===c[0]}" onclick="ofl='${c[0]}';render()">${esc(c[1])} (${cn(c[0])})</button>`).join('')}</div>
 <div class="gmeta">แสดง ${Math.min(l.length,200)} จาก ${ords.length} รายการ</div><div id="olist" class="alist">${ordRows()}</div>`;
}
function fOrds(){const k=oq.trim().toLowerCase();return(ords||[]).filter(o=>(ofl==='all'||stText(o.status)===ofl)&&(!k||[o.name,o.phone,o.orderId].some(x=>String(x||'').toLowerCase().includes(k))))}
function ordRows(){
 const l=fOrds();
 if(!l.length)return `<div class="empty">${ic('box',44)}<p>${ords&&ords.length?'ไม่พบรายการที่ค้นหา':'ยังไม่มีคำสั่งซื้อ'}</p></div>`;
 return l.map(o=>{const op=oopen===o.orderId,n=(o.items||[]).length;
  return `<div class="aitem"><button class="rmain" style="width:100%;padding:12px" onclick="oopen=oopen==='${esc(o.orderId)}'?null:'${esc(o.orderId)}';$('#olist').innerHTML=ordRows()" aria-expanded="${op}"><span style="min-width:0"><span class="rname">${esc(o.name)} · ${esc(o.phone)}</span><span class="rmeta">${esc(o.orderId)} · ${esc(String(o.createdAt||'').slice(0,16))} · ${n} รายการ · ${stBadge(stText(o.status))}</span></span></button>
  ${op?`<div class="racts" style="display:block;padding:0 14px 14px"><p class="mu">${esc(oaddr(o))}</p>${o.note?`<p class="mu" style="white-space:pre-line">หมายเหตุ: ${esc(o.note)}</p>`:''}${(o.items||[]).map(i=>`<div class="sumrow"><div><b>${esc(i.name)}</b>${i.label?`<div class="mu">${esc(i.label)}</div>`:''}</div><b>× ${esc(i.qty)}${i.unit?' '+esc(i.unit):''}</b></div>`).join('')}<div class="stack" style="margin-top:12px">${stText(o.status)===ST_SHIP?`<p class="hint" style="margin:0">จัดส่งเมื่อ ${esc(String(o.shippedAt||'').slice(0,16))}</p><button class="btn" onclick="setWait('${esc(o.orderId)}')">ยกเลิกสถานะจัดส่ง (กลับเป็นรอจัดเตรียมและจัดส่ง)</button>`:`<button class="btn pri" onclick="startShip('${esc(o.orderId)}')">จัดส่งแล้ว (ตกลงราคา / ยืนยันราคา)</button>`}
  <button class="btn" onclick="startDoc('${esc(o.orderId)}')">ออกเอกสาร</button>
  <button class="btn" onclick="startDoc('${esc(o.orderId)}','taxabb')">ใบกำกับภาษีอย่างย่อ</button></div></div>`:''}</div>`}).join('');
}

/* ---------- ตั้งค่า ---------- */
const chipSet=(k,t)=>`<div class="fld"><span class="lbl">${t}</span><div class="chipset">${D[k].map((u,i)=>`<span class="cs">${esc(u)}<button aria-label="ลบ ${esc(u)}" onclick="rmChip('${k}',${i})">${ic('x',14)}</button></span>`).join('')||'<span class="hint">ยังไม่มี</span>'}</div>
 <div class="addrow"><input class="inp" id="add_${k}" autocomplete="off" aria-label="เพิ่ม${t}" placeholder="เพิ่มใหม่" onkeydown="if(event.key==='Enter')addChip('${k}')"><button class="btn" onclick="addChip('${k}')">เพิ่ม</button></div></div>`;
async function addChip(k){const e=$('#add_'+k),v=T(e.value);if(!v||D[k].includes(v))return;D[k].push(v);if(await persist('บันทึกข้อมูลเรียบร้อยแล้ว'))render();else D[k].pop()}
async function rmChip(k,i){const x=D[k].splice(i,1);if(await persist('ลบเรียบร้อยแล้ว'))render();else D[k].splice(i,0,x[0])}
async function saveFb(){const v=T($('#fb').value);if(v&&!/^https?:\/\//i.test(v)){toast('ลิงก์ต้องขึ้นต้นด้วย https://');return}D.fbUrl=v||FB_DEFAULT;await persist('บันทึกข้อมูลเรียบร้อยแล้ว')}
let dg=null,dgBusy=false;
async function runDiag(){
 dgBusy=true;dg=null;render();
 try{dg=await Service.diag()}catch(e){dg={err:friendly(e.message)}}
 dgBusy=false;render();
}
function diagHtml(){
 if(!REMOTE)return `<section class="sec" style="border-color:#f3b8b2"><h3>สถานะการเชื่อมต่อ: ยังไม่ได้เชื่อม</h3><p class="sub">โหมดทดลอง — ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ไม่เข้า Google Sheets<br>แก้โดยใส่ URL เว็บแอป (ลงท้าย /exec) ในไฟล์ <b>config.js</b> บรรทัด <code>const API_URL='…'</code> แล้วอัปโหลดไฟล์ขึ้นเว็บอีกครั้ง</p></section>`;
 const r=dg;
 return `<section class="sec"><h3>สถานะการเชื่อมต่อ Google Sheets</h3><p class="sub">URL: …${esc(String(API_URL).slice(-22))}</p>
 ${r&&r.err?`<div class="err" role="alert" style="margin-top:10px">❌ ${esc(r.err)}</div>`:''}
 ${r&&r.ok?`<div class="note" style="margin-top:10px">${ic('check',18)}<span>เชื่อมต่อได้ — Code.gs เวอร์ชัน <b>${esc(r.version||'?')}</b><br>สินค้า ${r.products} · ตัวเลือก ${r.variants} · คำสั่งซื้อ ${r.orders} · ลูกค้า ${r.customers}${r.missing&&r.missing.length?`<br>⚠ ไม่พบแท็บ: ${esc(r.missing.join(', '))} (เรียกใช้ฟังก์ชัน setup ใน Apps Script)`:''}</span></div>`:''}
 <button class="btn pri" style="margin-top:12px" onclick="runDiag()"${dgBusy?' disabled':''}>${dgBusy?'กำลังทดสอบ…':'ทดสอบการเชื่อมต่อ'}</button></section>`;
}
function setView(){
 const used=JSON.stringify(D).length,pct=Math.min(100,Math.round(used/5000000*100));
 const bk=REMOTE
  ?`<section class="sec"><h3>การเชื่อมต่อข้อมูล</h3><p class="sub">เชื่อมต่อ Google Sheets แล้ว — สินค้าที่เพิ่ม/แก้ไขที่นี่จะบันทึกลงชีตและลูกค้าทุกเครื่องเห็นตรงกัน (ลูกค้าอาจเห็นการเปลี่ยนแปลงช้าได้ไม่เกิน 2 นาที)</p><div class="stack" style="grid-template-columns:1fr 1fr"><button class="btn" onclick="backup()">ดาวน์โหลดไฟล์สำรอง</button><label class="btn">กู้คืนจากไฟล์สำรอง<input class="sr" type="file" accept=".json,application/json" onchange="restore(this)"></label></div></section>`
  :`<section class="sec"><h3>สำรองข้อมูลสินค้า</h3><p class="sub">ข้อมูลสินค้าเก็บอยู่ในเครื่อง/เบราว์เซอร์นี้ ควรดาวน์โหลดไฟล์สำรองไว้เป็นระยะ และใช้ย้ายข้อมูลไปเครื่องอื่นได้</p>
 <div class="hint">พื้นที่ที่ใช้ไป ${(used/1e6).toFixed(1)} MB จากประมาณ 5 MB</div><div class="meter" role="img" aria-label="ใช้พื้นที่ ${pct}%"><i style="width:${pct}%"></i></div>
 <div class="stack" style="grid-template-columns:1fr 1fr"><button class="btn" onclick="backup()">ดาวน์โหลดไฟล์สำรอง</button><label class="btn">กู้คืนจากไฟล์สำรอง<input class="sr" type="file" accept=".json,application/json" onchange="restore(this)"></label></div></section>`;
 return `<div class="edit"><h2 class="h2">ตั้งค่า</h2>${diagHtml()}
 <section class="sec"><h3>ลิงก์ Facebook Page ของบริษัท</h3><label class="sr" for="fb">ลิงก์ Facebook Page</label><input id="fb" class="inp" type="url" style="margin-top:10px" value="${esc(D.fbUrl)}" placeholder="https://www.facebook.com/ชื่อเพจ"><p class="hint">ลูกค้าจะถูกพาไปที่ลิงก์นี้หลังคัดลอกข้อความสั่งซื้อ</p><button class="btn pri" style="margin-top:12px" onclick="saveFb()">${ic('check')} บันทึก</button></section>
 <section class="sec"><h3>หน่วยและบรรจุภัณฑ์ที่ใช้บ่อย</h3><p class="sub">ช่วยให้กรอกสินค้าเร็วขึ้น (เลือกจากรายการได้เลยตอนเพิ่มสินค้า)</p>${chipSet('units','หน่วยขนาด')}${chipSet('packs','บรรจุภัณฑ์')}</section>
 ${bk}
 <section class="sec"><h3>กลับไปใช้รายการสินค้าเริ่มต้น</h3><p class="sub">โหลดรายการสินค้าชุดเริ่มต้น (${NAMES.length} รายการ พร้อมขนาด 500 กรัม / 1 กิโลกรัม / ยกลัง) ทับรายการปัจจุบัน</p><button class="btn dng" style="margin-top:12px" onclick="resetSeed()">โหลดรายการสินค้าเริ่มต้น</button></section>
 ${REMOTE?'':'<p class="hint">หมายเหตุ: โหมดทดลอง — ลูกค้าบนเครื่องอื่นยังไม่เห็นสินค้าที่แก้ไขในเครื่องนี้ ต้องเชื่อม Google Sheets ตามคู่มือ (ใส่ API_URL ใน config.js)</p>'}</div>`;
}
async function resetSeed(){
 if(!confirm(`โหลดรายการสินค้าเริ่มต้น ${NAMES.length} รายการ? รายการสินค้าปัจจุบันทั้งหมดจะถูกแทนที่`))return;
 const prev=D.products;D.products=seed().products;
 if(await persist('โหลดรายการสินค้าเริ่มต้นแล้ว'))render();else D.products=prev;
}
function backup(){
 const b=new Blob([JSON.stringify(D)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download='สำรองสินค้า-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 toast('ดาวน์โหลดไฟล์สำรองแล้ว');
}
function restore(inp){
 const f=inp.files[0];if(!f)return;
 const r=new FileReader();
 r.onload=async()=>{
  try{
   const d=JSON.parse(r.result);if(!d||!Array.isArray(d.products))throw 0;
   if(!confirm(`กู้คืนสินค้า ${d.products.length} รายการ? ข้อมูลสินค้าปัจจุบันทั้งหมดจะถูกแทนที่`))return;
   const prev=D;D=Object.assign(seed(),d);
   if(await persist('กู้คืนข้อมูลเรียบร้อยแล้ว'))render();else D=prev;
  }catch(e){toast('ไฟล์สำรองไม่ถูกต้อง')}
 };
 r.readAsText(f);
}

async function init(){if(authed)await loadAdmin();else render()}
init();

/* ---------- ยืนยันราคา + จัดส่ง / ออกเอกสารเป็นขั้นตอน ---------- */
const stBadge=st=>`<span class="stb ${st===ST_SHIP?'ok':'wait'}">${esc(st)}</span>`;
const okN=x=>x!==''&&x!=null&&!isNaN(Number(x));
function findV(i){
 const p=(D.products||[]).find(x=>x.id===i.pid)||(D.products||[]).find(x=>x.name===i.name);if(!p)return null;
 return (p.variants||[]).find(v=>v.id===i.vid)||(p.variants||[]).find(v=>vlabel(v)===i.label)||null;
}
// ราคาตั้งต้นของแต่ละรายการ: ราคาที่บันทึกไว้ในออเดอร์ ถ้าไม่มีใช้ราคาในรายการสินค้าตอนนี้
function linesOf(o){return(o.items||[]).map(i=>{const v=findV(i);return{name:i.name,label:i.label||'',qty:i.qty,unit:i.unit||'',price:okN(i.price)?String(i.price):(v&&hasP(v)?String(v.price):'')}})}
const ordOf=id=>(ords||[]).find(x=>x.orderId===id);
let sd=null,sBusy=false;
function startShip(id){const o=ordOf(id);if(!o)return;sd={oid:id,name:o.name,lines:linesOf(o)};aview='ship';pushAdm();render();scrollTo(0,0)}
function shipView(){
 if(!sd)return'';
 return `<div class="lhead"><h2 class="h2">ตกลงราคา และจัดส่ง</h2><button class="btn sm" onclick="backOrd()">← กลับ</button></div>
 <p class="mu" style="margin:6px 0 12px">คำสั่งซื้อ ${esc(sd.oid)} · ${esc(sd.name)}<br>กรอกราคาต่อหน่วยที่ตกลงกับลูกค้าแล้ว (ราคารวมภาษี) ระบบจะบันทึกไว้ใช้ออกใบกำกับภาษีอย่างย่อให้ลูกค้าอัตโนมัติ</p>
 <section class="sec"><div class="dlines">${sd.lines.map((l,i)=>`<div class="dline"><span><b>${esc(l.name)}</b><small class="mu" style="display:block">${esc(l.label)}</small></span><span class="mu">${esc(l.qty)} ${esc(l.unit)}</span><input class="inp" inputmode="decimal" aria-label="ราคาต่อหน่วย ${esc(l.name)}" placeholder="ราคา/หน่วย" value="${esc(l.price)}" oninput="sd.lines[${i}].price=this.value"></div>`).join('')}</div></section>
 <div class="stack"><button class="btn pri lg" onclick="confirmShip()"${sBusy?' disabled':''}>${sBusy?'กำลังบันทึก…':'ยืนยัน: ตกลงราคาและจัดส่งแล้ว'}</button></div>`;
}
async function confirmShip(){
 if(!sd||sBusy)return;
 const miss=sd.lines.filter(l=>!okN(T(l.price))).length;
 if(miss&&!confirm(`ยังมี ${miss} รายการที่ไม่มีราคา จะออกใบกำกับภาษีอย่างย่อให้ลูกค้าไม่ได้ จนกว่าจะกรอกราคาครบ ดำเนินการต่อหรือไม่?`))return;
 sBusy=true;render();
 try{
  const r=await Service.setStatus(sd.oid,'ship',sd.lines.map(l=>okN(T(l.price))?Number(T(l.price)):''));
  const o=ordOf(sd.oid);if(o){o.status=r.status;o.shippedAt=r.shippedAt;o.items=r.items||o.items}
  toast('บันทึกสถานะ "จัดส่งแล้ว" เรียบร้อย');aview='ord';
 }catch(e){if(e.message==='unauthorized'){toast('หมดเวลาเข้าสู่ระบบ กรุณาเข้าใหม่');setTimeout(logout,300)}else toast('บันทึกไม่สำเร็จ: '+friendly(e.message),6000)}
 sBusy=false;render();
}
async function setWait(id){
 if(!confirm('เปลี่ยนกลับเป็น "รอจัดเตรียมและจัดส่ง" หรือไม่?'))return;
 try{const r=await Service.setStatus(id,'wait');const o=ordOf(id);if(o){o.status=r.status;o.shippedAt=''}toast('เปลี่ยนสถานะแล้ว')}
 catch(e){toast('บันทึกไม่สำเร็จ: '+friendly(e.message),6000)}
 render();
}
// ----- ออกเอกสาร: ขั้น 1 เลือกประเภท > ขั้น 2 กรอก/ตรวจข้อมูล > ขั้น 3 ตัวอย่าง พิมพ์ / PDF -----
let dd=null;
// ย้อนกลับจากหน้าย่อย (ตกลงราคา/ออกเอกสาร) ไปรายการคำสั่งซื้อ — ใช้ร่วมกับปุ่มย้อนกลับของมือถือ/เบราว์เซอร์
function pushAdm(){try{history.pushState({mdAdm:1},'')}catch(e){}}
function backOrd(){if(history.state&&history.state.mdAdm){history.back();return}aview='ord';render();scrollTo(0,0)}
window.addEventListener('popstate',()=>{
 if(history.state&&history.state.mdAdm)return; // ยังอยู่ในหน้าย่อย (เช่น เพิ่งปิดตัวอย่างเอกสาร)
 if(aview==='doc'||aview==='ship'){aview='ord';render();scrollTo(0,0)}
});
function startDoc(id,type){
 const o=ordOf(id);if(!o)return;
 const m=/\[ขอใบกำกับภาษี\] ชื่อ: (.*?) \| เลขประจำตัวผู้เสียภาษี: (\d+) \| ที่อยู่: (.*)/.exec(o.note||'');
 const plain=String(o.note||'').replace(/\n?\[ขอใบกำกับภาษี\\].*/,'').replace(/\n?\[ขอใบกำกับภาษี\].*/,'').trim();
 dd={oid:id,step:1,type:'',req:!!m,no:'',date:dmy(new Date()),shipDate:o.shippedAt?dmy(new Date(String(o.shippedAt).replace(' ','T'))):'',seller:'',showPrice:false,
  name:m?m[1]:o.name,addr:m?m[3]:oaddr(o),taxId:m?m[2]:'',tel:o.phone,note:plain?'หมายเหตุลูกค้า: '+plain:'',lines:linesOf(o),issued:[],busy:false};
 aview='doc';pushAdm();
 loadIssued(id);
 if(type)pickDoc(type);else{render();scrollTo(0,0)}
}
// เอกสารที่ออกแล้วของออเดอร์นี้ (มาจากทะเบียนเลขที่บนเซิร์ฟเวอร์)
async function loadIssued(id){
 try{const l=await Service.listDocs(id);if(dd&&dd.oid===id){dd.issued=l;if(aview==='doc'&&dd.step===1)render()}}catch(e){}
}
const docTName=k=>(DOC_TYPES[k]||{}).t||k;
const actDoc=(d,k)=>(d.issued||[]).find(x=>x.type===k&&x.status!=='ยกเลิก');
// เปิดใบที่ออกแล้ว: ใช้เนื้อหาที่เก็บไว้ตอนออกจริง (ไม่เปลี่ยน)
function viewIssued(k){
 const d=dd,x=d&&actDoc(d,k);if(!x)return;
 if(x.snapshot){openDoc(docHtml(x.snapshot));return}
 toast('ใบนี้ออกไว้ก่อนมีระบบเก็บเนื้อหา ตรวจข้อมูลแล้วกดออกเอกสาร ระบบจะเก็บเป็นฉบับจริงโดยใช้เลขเดิม',5000);pickDoc(k);
}
// ยกเลิกเลขเดิม แล้วเปิดฟอร์มพร้อมข้อมูลเดิมให้แก้ ก่อนออกเลขใหม่
async function reissueDoc(k){
 const d=dd,x=d&&actDoc(d,k);if(!x)return;
 const why=prompt('ยกเลิกเลขที่ '+x.no+' แล้วออกใหม่\nเลขเดิมจะยังอยู่ในทะเบียนเป็น "ยกเลิก" ไม่ถูกลบ ใส่เหตุผล (ไม่บังคับ):');
 if(why===null)return;
 try{await Service.voidDoc(x.no,why)}catch(e){toast('ยกเลิกไม่สำเร็จ: '+friendly(e.message),6000);return}
 const sn=x.snapshot;
 if(sn){const b=sn.buyer||{};Object.assign(d,{date:sn.date||d.date,seller:sn.seller||'',name:b.name||d.name,addr:b.addr||d.addr,taxId:b.taxId||d.taxId,tel:b.tel||d.tel,note:sn.note||'',showPrice:!!sn.showPrice,lines:(sn.lines||d.lines).map(l=>({...l,price:l.price==null?'':String(l.price)}))})}
 await loadIssued(d.oid);
 d.type=k;d.step=2;d.quick=false;toast('ยกเลิกเลขที่ '+x.no+' แล้ว แก้ข้อมูลแล้วกดออกเอกสารใหม่');render();scrollTo(0,0);
}
function pickDoc(k){
 const d=dd;if(!d)return;const T0=DOC_TYPES[k];
 d.type=k;d.step=2;d.quick=false;
 if(k==='taxabb'){d.date=d.shipDate||d.date;if(d.lines.every(l=>okN(T(l.price)))){d.quick=true;previewDoc();return}}
 render();scrollTo(0,0);
}
function docView(){
 if(!dd)return '';
 const d=dd,T0=DOC_TYPES[d.type]||{};
 if(d.step===1){
  const hist=(d.issued||[]).filter(x=>x.status==='ยกเลิก');
  return `<div class="lhead"><h2 class="h2">ออกเอกสาร</h2><button class="btn sm" onclick="backOrd()">← กลับ</button></div>
 <p class="mu" style="margin:6px 0 12px">คำสั่งซื้อ ${esc(d.oid)} · ${esc(d.name)}</p>
 <div class="dtype">${DOC_ORDER.map(k=>{const t=DOC_TYPES[k],x=actDoc(d,k),rec=(d.req&&k==='taxfull')||(!d.req&&k==='receipt');
  return `<div class="dcard ${x?'done':rec?'rec':''}"><b>${esc(t.t)}${!x&&rec?`<span class="rt">${d.req?'ลูกค้าขอใบกำกับภาษี':'แนะนำ'}</span>`:''}</b><span class="mu">${esc(t.d)}</span>
  ${x?`<div class="dno">ออกแล้ว เลขที่ <b>${esc(x.no)}</b><small>${esc(x.issuedAt)}</small></div><div class="drow"><button class="btn pri" onclick="viewIssued('${k}')">ดู / พิมพ์ / PDF</button><button class="btn" onclick="reissueDoc('${k}')">ยกเลิกแล้วออกใหม่</button></div>`
  :`<div class="drow"><button class="btn pri" onclick="pickDoc('${k}')">ออกเอกสาร</button></div>`}</div>`}).join('')}</div>
 <p class="hint">ใบที่ออกแล้วจะเปิดดูได้เหมือนเดิมทุกครั้ง แก้ไม่ได้ ถ้าต้องแก้ ให้กด "ยกเลิกแล้วออกใหม่" ระบบจะเก็บเลขเดิมไว้เป็น "ยกเลิก" แล้วออกเลขถัดไปให้</p>
 ${hist.length?`<section class="sec"><h3>เลขที่ที่ยกเลิกแล้ว</h3>${hist.map(x=>`<div class="sumrow"><div><b style="text-decoration:line-through;opacity:.6">${esc(x.no)}</b><div class="mu">${esc(docTName(x.type))} · ยกเลิก${x.reason?' ('+esc(x.reason)+')':''}</div></div></div>`).join('')}</section>`:''}`;
 }
 const f=(k,l,o={})=>`<div class="${o.full?'full':''}"><label for="d_${k}">${l}</label>${o.area?`<textarea id="d_${k}" class="inp" rows="2" oninput="dd.${k}=this.value">${esc(d[k])}</textarea>`:`<input id="d_${k}" class="inp" value="${esc(d[k])}" oninput="dd.${k}=this.value">`}</div>`;
 const showP=T0.price||d.showPrice;
 return `<div class="lhead"><h2 class="h2">${esc(T0.t)}</h2><button class="btn sm" onclick="dd.step=1;render()">← กลับ</button></div>
 <p class="mu" style="margin:6px 0 12px">ตรวจและแก้ข้อมูล แล้วกดปุ่มด้านล่างเพื่อออกเอกสาร${T0.price?' — ราคาต่อหน่วยเป็นราคารวมภาษีแล้ว ระบบแยก VAT 7% และเขียนจำนวนเงินเป็นตัวอักษรให้':''}</p>
 <section class="sec"><div class="dform">
 <div><label for="d_no">เลขที่เอกสาร</label><input id="d_no" class="inp" readonly value="${esc(actDoc(d,d.type)?actDoc(d,d.type).no:'ระบบออกเลขให้อัตโนมัติ')}"></div>${f('date','วันที่')}${f('seller','ชื่อผู้ขาย (ลายเซ็นตัวแทน ไม่บังคับ)',{full:1})}
 ${f('name',T0.buyerTax?'ชื่อลูกค้า / บริษัท':'ชื่อลูกค้า',{full:1})}${f('addr','ที่อยู่ลูกค้า',{full:1,area:1})}${T0.buyerTax?f('taxId','เลขประจำตัวผู้เสียภาษี (13 หลัก)'):''}${f('tel','โทรศัพท์')}
 </div></section>
 ${T0.k==='quote'?`<section class="sec"><label class="chk"><input type="checkbox" ${d.showPrice?'checked':''} onchange="dd.showPrice=this.checked;render()"> <span><b>แสดงราคาในใบประมาณการ</b></span></label></section>`:''}
 <section class="sec"><h3>รายการสินค้า</h3><div class="dlines">${d.lines.map((l,i)=>`<div class="dline"><span><b>${esc(l.name)}</b><small class="mu" style="display:block">${esc(l.label)}</small></span><span class="mu">${esc(l.qty)} ${esc(l.unit)}</span>${showP?`<input class="inp" inputmode="decimal" aria-label="ราคาต่อหน่วย ${esc(l.name)}" placeholder="ราคา/หน่วย" value="${esc(l.price)}" oninput="dd.lines[${i}].price=this.value">`:'<span></span>'}</div>`).join('')}</div></section>
 <section class="sec">${f('note','หมายเหตุ',{full:1,area:1})}</section>
 <div class="stack"><button class="btn pri lg" onclick="previewDoc()"${d.busy?' disabled':''}>${d.busy?'กำลังออกเลขที่เอกสาร…':'ออกเอกสาร (ดู / พิมพ์ / PDF)'}</button></div>`;
}
async function previewDoc(){
 const d=dd;if(!d||d.busy)return;const T0=DOC_TYPES[d.type];
 if(T0.price&&!d.lines.every(l=>okN(T(l.price)))){toast('กรุณากรอกราคาให้ครบทุกรายการ');return}
 if(T0.buyerTax&&(!T(d.name)||!T(d.addr)||T(d.taxId).replace(/\D/g,'').length!==13)){toast('ใบกำกับภาษีเต็มรูปแบบต้องมีชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษี 13 หลักของลูกค้า');return}
 const snap={type:d.type,date:T(d.date),seller:T(d.seller),showPrice:d.showPrice,stamp:true,
  buyer:{name:T(d.name),addr:T(d.addr),taxId:T0.buyerTax?T(d.taxId).replace(/\D/g,''):'',tel:T(d.tel)},
  lines:d.lines.map(l=>({...l,price:T(l.price)})),note:T(d.note),unknownMark:'-'};
 d.busy=true;if(!d.quick)render();toast('กำลังออกเลขที่เอกสาร…',40000);
 let r;
 try{r=await Service.issueDoc(d.type,d.oid,snap)}
 catch(e){d.busy=false;toast('ออกเลขที่เอกสารไม่สำเร็จ: '+friendly(e.message),7000);if(aview==='doc')render();return}
 d.busy=false;d.no=r.no;
 toast(r.existed?'เลขที่ '+r.no+' ออกไว้แล้ว เปิดฉบับเดิม (ถ้าต้องการแก้ ให้ยกเลิกแล้วออกใหม่)':'ออกเลขที่ '+r.no+' แล้ว',r.existed?4500:1800);
 const fin=r.snapshot||Object.assign({},snap,{no:r.no});
 if(aview==='doc'&&!d.quick)render();loadIssued(d.oid);
 openDoc(docHtml(fin),d.quick?backOrd:null);
}
