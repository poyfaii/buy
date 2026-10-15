// prodio.js — นำเข้า/ส่งออกสินค้าเป็นไฟล์ CSV (เปิดด้วย Excel / Google Sheets ได้)
// หนึ่งแถว = หนึ่งตัวเลือกสินค้า (ขนาด/บรรจุภัณฑ์/ราคา) สินค้าเดียวกันมีหลายแถวได้
const PIO_COLS=['รหัสสินค้า','ชื่อสินค้า','คำอธิบาย','หมายเหตุ','แสดงในร้าน','ลำดับ','รหัสตัวเลือก','ขนาด','หน่วยขนาด','บรรจุภัณฑ์','ราคา','แสดงตัวเลือก','รูป'];
const PIO_ALIAS={id:'รหัสสินค้า',name:'ชื่อสินค้า',description:'คำอธิบาย',note:'หมายเหตุ',status:'แสดงในร้าน',sort:'ลำดับ',vid:'รหัสตัวเลือก',size:'ขนาด',unit:'หน่วยขนาด',pack:'บรรจุภัณฑ์',price:'ราคา',vstatus:'แสดงตัวเลือก',image:'รูป'};

function pioCsv(rows){
 const q=v=>{v=String(v??'');return /[",\r\n]/.test(v)||/^\s|\s$/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 return '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
}
function pioExportRows(products){
 const rows=[PIO_COLS.slice()],yn=b=>b===false?'ซ่อน':'แสดง';
 products.slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).forEach(p=>{
  const base=[p.id,p.name,p.description||'',p.note||'',yn(p.status),p.sortOrder??'' ];
  const img=String(p.image||'').startsWith('data:')?'':(p.image||'');
  const vs=(p.variants||[]).slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  if(!vs.length)rows.push(base.concat(['','','','','','',img]));
  vs.forEach(v=>rows.push(base.concat([v.id,v.size||'',v.sizeUnit||'',v.packaging||'',v.price===''||v.price==null?'':v.price,yn(v.status),img])));
 });
 return rows;
}
// อ่าน CSV (รองรับเครื่องหมายคำพูด, ขึ้นบรรทัดใหม่ในช่อง, BOM, คั่นด้วย , หรือ ; หรือแท็บ)
function pioParse(text){
 text=String(text||'').replace(/^﻿/,'');
 const first=text.split(/\r?\n/)[0]||'';
 const sep=first.includes('\t')&&!first.includes(',')?'\t':(first.includes(';')&&!first.includes(',')?';':',');
 const rows=[];let row=[],cur='',inq=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(inq){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else inq=false}else cur+=c}
  else if(c==='"')inq=true;
  else if(c===sep){row.push(cur);cur=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';rows.push(row);row=[]}
  else cur+=c;
 }
 if(cur!==''||row.length){row.push(cur);rows.push(row)}
 return rows.filter(r=>r.some(x=>String(x).trim()!==''));
}
const pioYes=v=>{v=String(v??'').trim().toLowerCase();if(v==='')return null;return!['ซ่อน','ไม่แสดง','ไม่','no','n','false','0','off','x'].includes(v)};
const pioNum=v=>{v=String(v??'').trim().replace(/,/g,'');return v===''?'':(isFinite(Number(v))&&Number(v)>=0?Number(v):NaN)};

// สร้างผลลัพธ์นำเข้า (ยังไม่แตะข้อมูลจริง): {products,summary,errors,warnings}
function pioBuild(text,cur,opt={}){
 const rows=pioParse(text),errors=[],warnings=[];
 if(rows.length<2)return{fatal:'ไม่พบข้อมูลในไฟล์ (ต้องมีแถวหัวตารางและอย่างน้อย 1 แถวสินค้า)'};
 const head=rows[0].map(x=>String(x).trim()),col={};
 const nameOf=h=>{const k=Object.keys(PIO_ALIAS).find(a=>PIO_ALIAS[a]===h||a===h.toLowerCase());return k};
 head.forEach((h,i)=>{const k=nameOf(h);if(k&&!(k in col))col[k]=i});
 if(!('name' in col))return{fatal:'ไม่พบคอลัมน์ "ชื่อสินค้า" ในแถวแรก ใช้ไฟล์ที่ดาวน์โหลดจากระบบเป็นต้นแบบ'};
 const get=(r,k)=>k in col?String(r[col[k]]??'').trim():null;
 const curById=new Map(cur.map(p=>[p.id,p]));
 const groups=new Map(),order=[];
 rows.slice(1).forEach((r,i)=>{
  const ln=i+2,id=get(r,'id')||'',nm=get(r,'name')||'';
  const ex=id&&curById.get(id);
  const name=nm||(ex?ex.name:'');
  if(!name){errors.push(`แถว ${ln}: ไม่มีชื่อสินค้า`);return}
  const price=pioNum(get(r,'price'));
  if(Number.isNaN(price)){errors.push(`แถว ${ln} (${name}): ราคา "${get(r,'price')}" ไม่ใช่ตัวเลข`);return}
  const key=id?'id:'+id:'n:'+name.toLowerCase();
  if(!groups.has(key)){groups.set(key,{id,name,rows:[]});order.push(key)}
  const g=groups.get(key);
  if(nm&&g.name!==nm&&!id)g.name=nm;
  g.rows.push({ln,r,price});
 });
 // ตั้งรหัสสินค้าใหม่ต่อจากเลข p ที่มีอยู่
 let pn=cur.reduce((m,p)=>{const x=/^p(\d+)$/.exec(String(p.id));return x?Math.max(m,+x[1]):m},0);
 const usedIds=new Set(cur.map(p=>p.id)),outP=[];
 order.forEach(key=>{
  const g=groups.get(key),ex=g.id?curById.get(g.id):null;
  let id=g.id;
  if(!id){// ไม่ระบุรหัส: ถ้าชื่อตรงกับสินค้าเดิม ถือว่าเป็นตัวเดิม
   const same=cur.find(p=>String(p.name).trim().toLowerCase()===g.name.toLowerCase()&&!outP.some(o=>o.id===p.id));
   if(same){id=same.id}else{do{id='p'+(++pn)}while(usedIds.has(id)||outP.some(o=>o.id===id))}
  }
  const old=curById.get(id)||null,first=g.rows[0].r;
  const f=(k,dflt)=>{const v=get(first,k);return v===null?dflt:v};
  const st=pioYes(get(first,'status'));
  const sortRaw=get(first,'sort'),sortN=sortRaw===null||sortRaw===''?NaN:Number(sortRaw);
  const p={id,name:g.name,description:f('description',old?old.description||'':''),note:f('note',old?old.note:PRICE_NOTE),
   image:(()=>{const v=get(first,'image');return v===null||v===''?(old?old.image||'':''):v})(),
   status:st===null?(old?old.status!==false:true):st,sortOrder:Number.isFinite(sortN)?sortN:(old?old.sortOrder:null),variants:[]};
  if(p.note===''&&!old)p.note=PRICE_NOTE;
  const oldV=new Map(((old&&old.variants)||[]).map(v=>[v.id,v])),seen=new Set();
  let vn=((old&&old.variants)||[]).reduce((m,v)=>{const x=new RegExp('^'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'v(\\d+)$').exec(v.id);return x?Math.max(m,+x[1]):m},0);
  g.rows.forEach(({ln,r,price})=>{
   const size=get(r,'size')||'',unit=get(r,'unit')||'',pack=get(r,'pack')||'',vid=get(r,'vid')||'';
   if(!size&&!pack&&price===''&&!vid)return; // แถวที่ไม่มีตัวเลือก (สินค้าไม่มีตัวเลือก)
   if(vid&&seen.has(vid)){errors.push(`แถว ${ln} (${g.name}): รหัสตัวเลือก ${vid} ซ้ำในไฟล์`);return}
   const ov=vid&&oldV.get(vid);
   let nid=vid&&ov?vid:'';
   if(!nid){do{nid=id+'v'+(++vn)}while(seen.has(nid)||oldV.has(nid))}
   seen.add(nid);
   const vs=pioYes(get(r,'vstatus'));
   if(size&&!unit&&!ov)warnings.push(`แถว ${ln} (${g.name}): ระบุขนาด "${size}" แต่ไม่มีหน่วยขนาด`);
   p.variants.push({id:nid,size,sizeUnit:size?unit:'',packaging:pack,price,status:vs===null?(ov?ov.status!==false:true):vs,sortOrder:p.variants.length});
  });
  if(p.variants.filter(v=>v.status).length>MAXV)warnings.push(`${g.name}: มีตัวเลือกที่แสดงเกิน ${MAXV} รายการ ร้านจะแสดงเฉพาะ ${MAXV} ตัวแรก`);
  outP.push(p);
 });
 // เทียบกับของเดิม
 const norm=p=>JSON.stringify([p.name,p.description||'',p.note||'',p.status!==false,p.sortOrder??null,p.image||'',(p.variants||[]).slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).map(v=>[v.id,v.size||'',v.sizeUnit||'',v.packaging||'',v.price===''||v.price==null?'':Number(v.price),v.status!==false])]);
 const sum={added:[],changed:[],same:0,vAdd:0,vDel:0,prices:[],removed:[]};
 outP.forEach(p=>{
  const old=curById.get(p.id);
  if(!old){sum.added.push(p.name);sum.vAdd+=p.variants.length;return}
  const nO=norm(Object.assign({},old,{sortOrder:p.sortOrder==null?old.sortOrder:old.sortOrder})),nN=norm(Object.assign({},p,{sortOrder:p.sortOrder==null?old.sortOrder:p.sortOrder}));
  if(nO===nN){sum.same++;return}
  sum.changed.push(p.name);
  const ov=new Map((old.variants||[]).map(v=>[v.id,v]));
  p.variants.forEach(v=>{const o=ov.get(v.id);if(!o)sum.vAdd++;else{const a=o.price===''||o.price==null?'':Number(o.price);if(a!==v.price)sum.prices.push(`${p.name}${v.size||v.packaging?' ('+[v.size&&v.size+(v.sizeUnit?' '+v.sizeUnit:''),v.packaging].filter(Boolean).join(' / ')+')':''}: ${a===''?'ยังไม่กำหนด':a} → ${v.price===''?'ยังไม่กำหนด':v.price}`)}});
  (old.variants||[]).forEach(o=>{if(!p.variants.some(v=>v.id===o.id))sum.vDel++});
 });
 if(opt.replace)cur.forEach(p=>{if(!outP.some(o=>o.id===p.id))sum.removed.push(p.name)});
 return{products:outP,sum,errors,warnings,rowsRead:rows.length-1};
}
// รวมผลเข้ากับสินค้าเดิม (คืนรายการสินค้าใหม่ทั้งชุด)
function pioApply(cur,res,opt={}){
 const out=cur.map(p=>res.products.find(x=>x.id===p.id)||p);
 let mx=cur.reduce((m,p)=>Math.max(m,p.sortOrder??0),-1);
 res.products.forEach(p=>{if(!cur.some(c=>c.id===p.id))out.push(p)});
 out.forEach(p=>{if(p.sortOrder==null||p.sortOrder==='')p.sortOrder=++mx});
 return opt.replace?out.filter(p=>res.products.some(x=>x.id===p.id)):out;
}

/* ---------- ส่วนแสดงผลในหน้าตั้งค่าแอดมิน ---------- */
let pio=null;
function pioHtml(){
 const r=pio&&pio.res;
 const box=!pio?'':pio.fatal?`<div class="err" role="alert" style="margin-top:12px">${esc(pio.fatal)}</div>`:(()=>{
  const s=r.sum,list=(a,n=8)=>a.slice(0,n).map(x=>`<li>${esc(x)}</li>`).join('')+(a.length>n?`<li>…และอีก ${a.length-n}</li>`:'');
  const nothing=!s.added.length&&!s.changed.length&&!s.vDel&&!s.removed.length;
  return `<div class="piobox"><b>ตรวจไฟล์ "${esc(pio.file)}" แล้ว (${r.rowsRead} แถว)</b>
  <ul class="pioc"><li>เพิ่มสินค้าใหม่ <b>${s.added.length}</b></li><li>แก้ไขสินค้าเดิม <b>${s.changed.length}</b></li><li>ไม่เปลี่ยนแปลง <b>${s.same}</b></li>${s.vAdd?`<li>เพิ่มตัวเลือก <b>${s.vAdd}</b></li>`:''}${s.vDel?`<li class="w">ลบตัวเลือก <b>${s.vDel}</b></li>`:''}${s.removed.length?`<li class="w">ลบสินค้าที่ไม่อยู่ในไฟล์ <b>${s.removed.length}</b></li>`:''}</ul>
  ${s.added.length?`<details><summary>สินค้าใหม่</summary><ul>${list(s.added)}</ul></details>`:''}
  ${s.changed.length?`<details><summary>สินค้าที่แก้ไข</summary><ul>${list(s.changed)}</ul></details>`:''}
  ${s.prices.length?`<details open><summary>ราคาที่เปลี่ยน (${s.prices.length})</summary><ul>${list(s.prices,15)}</ul></details>`:''}
  ${s.removed.length?`<details open><summary>สินค้าที่จะถูกลบ</summary><ul>${list(s.removed)}</ul></details>`:''}
  ${r.errors.length?`<div class="err" role="alert"><b>ข้าม ${r.errors.length} แถวที่ผิด</b><ul>${list(r.errors,10)}</ul></div>`:''}
  ${r.warnings.length?`<details><summary>คำเตือน (${r.warnings.length})</summary><ul>${list(r.warnings,10)}</ul></details>`:''}
  <div class="stack" style="grid-template-columns:1fr 1fr;margin-top:12px"><button class="btn pri" onclick="pioConfirm()"${pio.busy||nothing?' disabled':''}>${pio.busy?'กำลังบันทึก…':nothing?'ไม่มีอะไรต้องเปลี่ยน':'ยืนยันนำเข้า'}</button><button class="btn" onclick="pio=null;render()">ยกเลิก</button></div></div>`})();
 return `<section class="sec"><h3>นำเข้า / ส่งออกสินค้า (ไฟล์ CSV)</h3><p class="sub">ดาวน์โหลดไฟล์ → แก้ใน Excel หรือ Google Sheets → บันทึกเป็น CSV (UTF-8) → อัปโหลด ระบบสรุปสิ่งที่เปลี่ยนให้ดูก่อนยืนยัน</p>
 <div class="stack" style="grid-template-columns:1fr 1fr"><button class="btn" onclick="pioExport()">ดาวน์โหลดไฟล์สินค้า</button><label class="btn">เลือกไฟล์เพื่อนำเข้า<input class="sr" type="file" accept=".csv,text/csv,text/plain" onchange="pioPick(this)"></label></div>
 <label class="chk" style="margin-top:12px"><input type="checkbox" ${pio&&pio.replace?'checked':''} onchange="pioReplace(this.checked)"> <span>ลบสินค้าที่ไม่อยู่ในไฟล์ <small class="mu" style="display:block">ปกติปิดไว้: ระบบเพิ่ม/แก้ไขเท่านั้น ไม่ลบสินค้าที่ไม่อยู่ในไฟล์</small></span></label>
 <details style="margin-top:10px"><summary>วิธีกรอกไฟล์</summary><ul class="pioh"><li>หนึ่งแถว = หนึ่งตัวเลือก สินค้าที่มีหลายขนาดให้ใส่หลายแถว รหัสสินค้าเดียวกัน</li><li>สินค้าใหม่: เว้นรหัสสินค้าไว้ ระบบตั้งให้เอง (สินค้าชื่อเดียวกับที่มีอยู่จะถือเป็นตัวเดิม)</li><li>ราคาเว้นว่าง = ยังไม่กำหนด ($$$) ใส่เฉพาะตัวเลข</li><li>แสดงในร้าน / แสดงตัวเลือก: พิมพ์ "แสดง" หรือ "ซ่อน"</li><li>รูป: เว้นว่างเพื่อใช้รูปเดิม รูปใหม่ให้อัปโหลดที่หน้าแก้ไขสินค้า</li><li>ตัวเลือกของสินค้าที่อยู่ในไฟล์ ถ้าลบแถวออก ตัวเลือกนั้นจะถูกลบ (ออเดอร์เก่าไม่กระทบ)</li></ul></details>${box}</section>`;
}
function pioExport(){
 const csv=pioCsv(pioExportRows(D.products)),d=new Date(),p=n=>String(n).padStart(2,'0');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 a.download=`สินค้า-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
 toast('ดาวน์โหลดไฟล์สินค้าแล้ว');
}
async function pioPick(inp){
 const f=inp.files&&inp.files[0];if(!f)return;
 if(f.size>5e6){pio={fatal:'ไฟล์ใหญ่เกิน 5 MB',file:f.name};inp.value='';render();return}
 let text;try{text=await f.text()}catch(e){pio={fatal:'อ่านไฟล์ไม่ได้',file:f.name};inp.value='';render();return}
 inp.value='';
 if(/\.xlsx?$/i.test(f.name)||text.startsWith('PK')){pio={fatal:'ไฟล์ Excel (.xlsx) ใช้ไม่ได้โดยตรง ให้เปิดแล้วเลือก บันทึกเป็น → CSV UTF-8 ก่อนอัปโหลด',file:f.name};render();return}
 const keep=pio&&pio.replace;
 pio={file:f.name,text,replace:!!keep};pioRebuild();
}
function pioRebuild(){
 const res=pioBuild(pio.text,D.products,{replace:pio.replace});
 if(res.fatal){pio={fatal:res.fatal,file:pio.file};}else pio.res=res;
 render();
}
function pioReplace(v){if(!pio||!pio.text){pio=Object.assign(pio||{},{replace:v});render();return}pio.replace=v;pioRebuild()}
async function pioConfirm(){
 if(!pio||!pio.res||pio.busy)return;
 if(pio.replace&&pio.res.sum.removed.length&&!confirm('จะลบสินค้า '+pio.res.sum.removed.length+' รายการที่ไม่อยู่ในไฟล์ ยืนยันหรือไม่?'))return;
 pio.busy=true;render();
 const prev=D.products,prevU=D.units.slice(),prevP=D.packs.slice();
 D.products=pioApply(D.products,pio.res,{replace:pio.replace});
 D.products.forEach(p=>(p.variants||[]).forEach(v=>{[['sizeUnit','units'],['packaging','packs']].forEach(([k,l])=>{if(v[k]&&!D[l].includes(v[k]))D[l].push(v[k])})}));
 const ok=await persist('นำเข้าสินค้าเรียบร้อยแล้ว');
 if(!ok){D.products=prev;D.units=prevU;D.packs=prevP;pio.busy=false;render();return}
 pio=null;render();
}
