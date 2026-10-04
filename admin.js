// admin.js — หน้าผู้ดูแลร้าน (รองรับสินค้าหลายสิบรายการ)
let draft=null,aview='list',aq='',af='all',as='order',menuId=null,dirty=false;
const sorted=()=>[...D.products].sort(bySort);
const persist=async m=>{const ok=await Service.save(D);if(ok){lists();if(m)toast(m)}return ok};
function lists(){
 $('#units').innerHTML=D.units.map(u=>`<option value="${esc(u)}">`).join('');
 $('#packs').innerHTML=D.packs.map(u=>`<option value="${esc(u)}">`).join('');
}
document.addEventListener('input',()=>{if(aview==='edit')dirty=true});
document.addEventListener('change',()=>{if(aview==='edit')dirty=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuId)closeMenu()});

function render(){
 if(!D){$('#app').innerHTML=`<div class="awrap" style="padding-top:20px"><div class="sk" style="aspect-ratio:auto;height:220px"></div></div>`;return}
 $('#app').innerHTML=`<header class="top"><div class="bar"><div class="logo">${ic('box',22)}</div><h1 class="brand"><b>จัดการสินค้า</b><span>บริษัท แม่ดอนรุ่งเรืองฟู้ดส์ จำกัด</span></h1><a class="btn sm" href="index.html">ดูหน้าร้าน ${ic('ext',16)}</a></div></header>
 <main class="awrap">${tabs()}${aview==='edit'?editView():aview==='set'?setView():listView()}</main>`;
 if(aview==='list')drawList();
 drawMenu();
}
function tabs(){
 const list=aview==='list'||(aview==='edit'&&draft&&!draft.isNew),nw=aview==='edit'&&draft&&draft.isNew;
 return `<nav class="tabs" aria-label="เมนูผู้ดูแล"><a href="#" class="${list?'on':''}" onclick="return nav('list')">สินค้า</a><a href="#" class="${nw?'on':''}" onclick="return nav('new')">เพิ่มสินค้า</a><a href="#" class="${aview==='set'?'on':''}" onclick="return nav('set')">ตั้งค่า</a></nav>`;
}
function nav(t){
 if(aview==='edit'&&dirty&&!confirm('ยังไม่ได้บันทึกการเปลี่ยนแปลง ออกจากหน้านี้หรือไม่?'))return false;
 dirty=false;
 if(t==='new')newP();else{draft=null;aview=t;render()}
 scrollTo(0,0);return false;
}

/* ---------- รายการสินค้า ---------- */
function listView(){
 return `<div class="lhead"><h2 class="h2">สินค้าทั้งหมด</h2><button class="btn pri" onclick="nav('new')">+ เพิ่มสินค้า</button></div>
 <div class="tools"><div class="search">${ic('search')}<input id="aq" class="inp" type="search" autocomplete="off" aria-label="ค้นหาสินค้า" placeholder="ค้นหาชื่อสินค้า..." value="${esc(aq)}" oninput="aq=this.value;drawList()"></div>
 <div class="trow"><div id="achips" class="chips" role="group" aria-label="กรองสินค้า"></div>
 <label><span class="sr">เรียงตาม</span><select class="inp" onchange="as=this.value;drawList()"><option value="order"${as==='order'?' selected':''}>เรียงตามลำดับในร้าน</option><option value="name"${as==='name'?' selected':''}>เรียงตามชื่อ ก-ฮ</option></select></label></div></div>
 <div id="ameta" class="gmeta"></div><div id="alist" class="alist"></div>`;
}
function rowHtml(p,pos){
 const n=(p.variants||[]).length;
 return `<div class="arow${p.status?'':' off'}"><button class="rmain" onclick="editP('${p.id}')" aria-label="แก้ไข ${esc(p.name)}"><span class="athumb">${p.image?`<img src="${p.image}" alt="" loading="lazy">`:`<span class="ph">${ic('box',22)}</span>`}</span>
 <span style="min-width:0"><span class="rname">${esc(p.name)}</span><span class="rmeta">${n?n+' ตัวเลือก':'ไม่มีตัวเลือกขนาด'} · ลำดับ ${pos}</span></span></button>
 <label class="sw"><input type="checkbox" ${p.status?'checked':''} onchange="tgl('${p.id}')" aria-label="แสดง ${esc(p.name)} ในหน้าร้าน"><span class="trk"></span><span class="swl">${p.status?'แสดง':'ซ่อน'}</span></label>
 <button class="iconbtn" onclick="menu('${p.id}')" aria-label="เมนูจัดการ ${esc(p.name)}">${ic('dots')}</button></div>`;
}
function drawList(){
 const all=sorted(),on=all.filter(p=>p.status).length,k=aq.trim().toLowerCase();
 const pos=new Map(all.map((p,i)=>[p.id,i+1]));
 $('#achips').innerHTML=[['all','ทั้งหมด',all.length],['on','แสดงอยู่',on],['off','ซ่อนอยู่',all.length-on]]
  .map(([id,t,n])=>`<button class="chipb" aria-pressed="${af===id}" onclick="af='${id}';drawList()">${t} <b>${n}</b></button>`).join('');
 let l=all.filter(p=>(af==='all'||(af==='on')===!!p.status)&&(!k||String(p.name).toLowerCase().includes(k)));
 if(as==='name')l.sort((a,b)=>String(a.name).localeCompare(String(b.name),'th'));
 $('#ameta').textContent=all.length?`แสดง ${l.length} จาก ${all.length} รายการ`:'';
 $('#alist').innerHTML=!all.length
  ?`<div class="empty">${ic('box',44)}<p>ยังไม่มีสินค้า</p><button class="btn pri lg" onclick="nav('new')">+ เพิ่มสินค้า</button></div>`
  :!l.length
  ?`<div class="empty">${ic('search',44)}<p>ไม่พบสินค้าที่ตรงกับที่ค้นหา</p><button class="btn" onclick="aq='';af='all';render()">ล้างการค้นหา</button></div>`
  :l.map(p=>rowHtml(p,pos.get(p.id))).join('');
}
async function tgl(id){
 const p=D.products.find(x=>x.id===id);if(!p)return;
 p.status=!p.status;
 if(await persist(p.status?'แสดงสินค้าเรียบร้อยแล้ว':'ซ่อนสินค้าเรียบร้อยแล้ว')){drawList();drawMenu()}
 else{p.status=!p.status;drawList()}
}

/* ---------- เมนูจัดการสินค้า (ย้าย/ซ่อน/ลบ) ---------- */
function menu(id){menuId=id;drawMenu()}
function closeMenu(){menuId=null;drawMenu()}
function drawMenu(){
 const r=$('#mroot');
 if(!menuId){r.innerHTML='';document.body.classList.remove('lock');return}
 const all=sorted(),i=all.findIndex(p=>p.id===menuId);
 if(i<0){menuId=null;return drawMenu()}
 const p=all[i],can=af==='all'&&!aq.trim()&&as==='order',id=p.id;
 r.innerHTML=`<div class="scrim" onclick="if(event.target===this)closeMenu()"><div class="sheet" role="dialog" aria-modal="true" aria-label="จัดการ ${esc(p.name)}" tabindex="-1">
 <div class="shead"><div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2><div class="rmeta">ลำดับที่ ${i+1} จาก ${all.length}</div></div><button class="iconbtn" onclick="closeMenu()" aria-label="ปิด">${ic('x')}</button></div>
 <div class="menu"><button class="btn" onclick="closeMenu();editP('${id}')">${ic('edit')} แก้ไขสินค้า</button>
 <button class="btn" onclick="tgl('${id}')">${ic('check')} ${p.status?'ซ่อนสินค้านี้':'แสดงสินค้านี้'}</button>
 ${can?`<button class="btn" ${i?'':'disabled'} onclick="mv('${id}',-1)">${ic('up')} ย้ายขึ้น</button><button class="btn" ${i<all.length-1?'':'disabled'} onclick="mv('${id}',1)">${ic('down')} ย้ายลง</button><button class="btn" ${i?'':'disabled'} onclick="mvTop('${id}')">${ic('top')} ย้ายไปบนสุด</button>`
  :`<p class="hint" style="padding:4px 16px 8px">จัดลำดับได้เมื่อไม่มีการค้นหา/ตัวกรอง และเรียงตามลำดับในร้าน</p>`}
 <button class="btn dng" onclick="del('${id}')">${ic('trash')} ลบสินค้า</button></div></div></div>`;
 document.body.classList.add('lock');
 const s=r.querySelector('.sheet');s&&s.focus();
}
async function reorder(L,msg){
 const prev=D.products.map(p=>p.sortOrder);
 L.forEach((p,n)=>p.sortOrder=n);
 if(await persist(msg)){drawList();drawMenu()}else D.products.forEach((p,n)=>p.sortOrder=prev[n]);
}
function mv(id,d){const L=sorted(),i=L.findIndex(p=>p.id===id),j=i+d;if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];reorder(L,'จัดลำดับเรียบร้อยแล้ว')}
function mvTop(id){const L=sorted(),i=L.findIndex(p=>p.id===id);if(i<=0)return;L.unshift(L.splice(i,1)[0]);reorder(L,'ย้ายไปบนสุดเรียบร้อยแล้ว')}
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
function newP(){
 draft={isNew:1,id:uid(),name:'',description:'',image:'',status:true,sortOrder:0,variants:[]};
 aview='edit';dirty=false;render();
 const e=$('#pn');e&&e.focus();
}
function editP(id){
 const p=D.products.find(x=>x.id===id);if(!p)return;
 draft=JSON.parse(JSON.stringify(p));draft.variants=draft.variants||[];
 aview='edit';dirty=false;render();scrollTo(0,0);
}
function vrow(v,i){
 return `<div class="vrow${v.status?'':' off'}"><div class="vgrid">
 <div><label class="lbl" for="vs${i}">ขนาด</label><input id="vs${i}" class="inp" inputmode="decimal" autocomplete="off" placeholder="เช่น 500" value="${esc(v.size)}" oninput="draft.variants[${i}].size=this.value"></div>
 <div><label class="lbl" for="vu${i}">หน่วย</label><input id="vu${i}" class="inp" list="units" autocomplete="off" placeholder="เช่น กรัม" value="${esc(v.sizeUnit)}" oninput="draft.variants[${i}].sizeUnit=this.value"></div>
 <div><label class="lbl" for="vp${i}">บรรจุภัณฑ์</label><input id="vp${i}" class="inp" list="packs" autocomplete="off" placeholder="เช่น ถุง" value="${esc(v.packaging)}" oninput="draft.variants[${i}].packaging=this.value"></div>
 <div><label class="lbl" for="vr${i}">ราคา (ลูกค้าไม่เห็น)</label><input id="vr${i}" class="inp" type="number" inputmode="decimal" min="0" step="any" placeholder="ไม่บังคับ" value="${esc(v.price)}" oninput="draft.variants[${i}].price=this.value"></div></div>
 <div class="vfoot"><label class="sw inline"><input type="checkbox" ${v.status?'checked':''} onchange="draft.variants[${i}].status=this.checked;render()"><span class="trk"></span><span class="swl">${v.status?'แสดงให้ลูกค้า':'ปิดอยู่ (ลูกค้าไม่เห็น)'}</span></label>
 <div class="vact"><button class="btn sm" onclick="dupV(${i})">${ic('copy',16)} คัดลอก</button><button class="btn sm dng" onclick="delV(${i})">${ic('trash',16)} ลบ</button></div></div></div>`;
}
function editView(){
 const d=draft,on=d.variants.filter(v=>v.status).length;
 return `<div class="edit"><button class="back" onclick="nav('list')">${ic('back')} กลับไปรายการสินค้า</button><h2 class="h2">${d.isNew?'เพิ่มสินค้า':'แก้ไขสินค้า'}</h2>
 <section class="sec"><h3>1. ข้อมูลสินค้า</h3>
 <div class="fld"><label class="lbl" for="pn">ชื่อสินค้า <span class="req" aria-hidden="true">*</span></label><input id="pn" class="inp" autocomplete="off" value="${esc(d.name)}" oninput="draft.name=this.value;this.classList.remove('bad');$('#pne').textContent=''"><div class="err" id="pne" role="alert"></div></div>
 <div class="fld"><label class="lbl" for="pd">รายละเอียด <span class="opt-t">(ไม่บังคับ)</span></label><textarea id="pd" class="inp" rows="3" oninput="draft.description=this.value">${esc(d.description)}</textarea></div>
 <div class="fld"><span class="lbl">รูปสินค้า <span class="opt-t">(ไม่บังคับ)</span></span><div class="upl"><div class="prev">${d.image?`<img src="${d.image}" alt="ตัวอย่างรูปสินค้า">`:ic('image',34)}</div>
 <div class="ubtns"><label class="btn sm">${ic('image',16)} ${d.image?'เปลี่ยนรูป':'เพิ่มรูปสินค้า'}<input class="sr" type="file" accept="image/*" onchange="pickImg(this)"></label>${d.image?`<button class="btn sm dng" onclick="draft.image='';dirty=true;render()">ลบรูป</button>`:''}</div></div></div></section>
 <section class="sec"><h3>2. ขนาด / บรรจุภัณฑ์</h3><p class="sub">ไม่บังคับ · ลูกค้าเลือกตัวเลือกเหล่านี้ตอนสั่งซื้อ (แสดงสูงสุด ${MAXV} ตัวเลือก) · ถ้าไม่ใส่ ลูกค้าจะสั่งได้เลยโดยไม่ต้องเลือกขนาด · ราคาเก็บไว้ดูเองเท่านั้น ไม่แสดงให้ลูกค้า</p>
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
 const out={id:d.id,name,description:T(d.description),image:d.image||'',status:d.status,sortOrder:d.sortOrder,variants:vs};
 const idx=D.products.findIndex(p=>p.id===d.id),old=idx<0?null:D.products[idx];
 if(idx<0){out.sortOrder=D.products.reduce((m,p)=>Math.max(m,p.sortOrder??0),-1)+1;D.products.push(out)}else D.products[idx]=out;
 if(!await persist(d.isNew?'เพิ่มสินค้าเรียบร้อยแล้ว':'บันทึกข้อมูลเรียบร้อยแล้ว')){
  if(idx<0)D.products.pop();else D.products[idx]=old;
  return;
 }
 dirty=false;
 if(again){newP();scrollTo(0,0)}else{draft=null;aview='list';render();scrollTo(0,0)}
}

/* ---------- ตั้งค่า ---------- */
const chipSet=(k,t)=>`<div class="fld"><span class="lbl">${t}</span><div class="chipset">${D[k].map((u,i)=>`<span class="cs">${esc(u)}<button aria-label="ลบ ${esc(u)}" onclick="rmChip('${k}',${i})">${ic('x',14)}</button></span>`).join('')||'<span class="hint">ยังไม่มี</span>'}</div>
 <div class="addrow"><input class="inp" id="add_${k}" autocomplete="off" aria-label="เพิ่ม${t}" placeholder="เพิ่มใหม่" onkeydown="if(event.key==='Enter')addChip('${k}')"><button class="btn" onclick="addChip('${k}')">เพิ่ม</button></div></div>`;
async function addChip(k){const e=$('#add_'+k),v=T(e.value);if(!v||D[k].includes(v))return;D[k].push(v);if(await persist('บันทึกข้อมูลเรียบร้อยแล้ว'))render();else D[k].pop()}
async function rmChip(k,i){const x=D[k].splice(i,1);if(await persist('ลบเรียบร้อยแล้ว'))render();else D[k].splice(i,0,x[0])}
async function saveFb(){const v=T($('#fb').value);if(v&&!/^https?:\/\//i.test(v)){toast('ลิงก์ต้องขึ้นต้นด้วย https://');return}D.fbUrl=v||'https://www.facebook.com/';await persist('บันทึกข้อมูลเรียบร้อยแล้ว')}
function setView(){
 const used=JSON.stringify(D).length,pct=Math.min(100,Math.round(used/5000000*100));
 return `<div class="edit"><h2 class="h2">ตั้งค่า</h2>
 <section class="sec"><h3>ลิงก์ Facebook Page ของบริษัท</h3><label class="sr" for="fb">ลิงก์ Facebook Page</label><input id="fb" class="inp" type="url" style="margin-top:10px" value="${esc(D.fbUrl)}" placeholder="https://www.facebook.com/ชื่อเพจ"><p class="hint">ลูกค้าจะถูกพาไปที่ลิงก์นี้หลังคัดลอกข้อความสั่งซื้อ</p><button class="btn pri" style="margin-top:12px" onclick="saveFb()">${ic('check')} บันทึก</button></section>
 <section class="sec"><h3>หน่วยและบรรจุภัณฑ์ที่ใช้บ่อย</h3><p class="sub">ช่วยให้กรอกสินค้าเร็วขึ้น (เลือกจากรายการได้เลยตอนเพิ่มสินค้า)</p>${chipSet('units','หน่วยขนาด')}${chipSet('packs','บรรจุภัณฑ์')}</section>
 <section class="sec"><h3>สำรองข้อมูลสินค้า</h3><p class="sub">ข้อมูลสินค้าเก็บอยู่ในเครื่อง/เบราว์เซอร์นี้ ควรดาวน์โหลดไฟล์สำรองไว้เป็นระยะ และใช้ย้ายข้อมูลไปเครื่องอื่นได้</p>
 <div class="hint">พื้นที่ที่ใช้ไป ${(used/1e6).toFixed(1)} MB จากประมาณ 5 MB</div><div class="meter" role="img" aria-label="ใช้พื้นที่ ${pct}%"><i style="width:${pct}%"></i></div>
 <div class="stack" style="grid-template-columns:1fr 1fr"><button class="btn" onclick="backup()">ดาวน์โหลดไฟล์สำรอง</button><label class="btn">กู้คืนจากไฟล์สำรอง<input class="sr" type="file" accept=".json,application/json" onchange="restore(this)"></label></div></section>
 <p class="hint">หมายเหตุ: เวอร์ชันนี้ลูกค้าบนเครื่องอื่นยังไม่เห็นสินค้าที่แก้ไขในเครื่องนี้ ต้องเปลี่ยน Data Service เป็น Google Sheets / Firebase</p></div>`;
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

async function init(){render();D=await Service.load();lists();render()}
init();
