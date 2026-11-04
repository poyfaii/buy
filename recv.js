/* โหมด "รับของเข้า": ยิงสินค้าเป็นชิ้นหรือเป็นลังก็ได้ รวมเป็นรายการ แล้วบันทึกรับเข้าสต๊อกทีเดียว (แยกจากหน้าขาย) */
let rl=(()=>{try{return JSON.parse(localStorage.getItem('posRcv')||'[]')}catch(e){return []}})(),rq='',camMode='';
const rlSave=()=>{try{localStorage.setItem('posRcv',JSON.stringify(rl))}catch(e){}};
function rcvView(){
 const n=rl.reduce((a,l)=>a+l.qty,0);
 return `<div class="lhead"><h2 class="h2">รับของเข้า</h2></div>
 <div class="scan"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg>
 <input id="rscan" class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ยิงบาร์โค้ดชิ้นหรือลัง หรือพิมพ์ชื่อสินค้า" value="${esc(rq)}" oninput="rq=this.value;rRes()" onkeydown="rKey(event)"><button type="button" class="camb" onclick="rcvCam()" aria-label="สแกนด้วยกล้องมือถือ">กล้อง</button></div>
 <p class="hint">ยิงลัง/แพ็กที่ผูกไว้ ระบบเพิ่มเป็นกี่ชิ้นให้เอง · พิมพ์ <b>3*บาร์โค้ด</b> = 3 ลัง/3 ชิ้น · ยิงรหัสที่ยังไม่มี ระบบถามว่าเป็นสินค้าใหม่หรือเป็นบาร์โค้ดลังของสินค้าเดิม</p>
 <div id="rres" class="sres">${rResHtml()}</div>
 <section class="sec cartbox" aria-label="รายการรับเข้า">${rl.length?rl.map(rlHtml).join(''):'<div class="empty2">ยังไม่มีรายการรับเข้า<br><small>ยิงบาร์โค้ดสินค้าที่รับมาได้เลย</small></div>'}</section>
 ${rl.length?`<section class="sec"><div class="tot"><span>รวม ${fm(rl.length)} รายการ</span><b>${fm(r2(n))} ชิ้น</b></div><div id="rerr" class="err" role="alert"></div><div class="acts2"><button class="btn pri lg" id="rsv" onclick="rcvSave()">บันทึกรับเข้าสต๊อก</button><button class="btn dng" onclick="rcvClear()">ล้างรายการ</button></div></section>`:''}`;
}
function rlHtml(l,i){
 const it=find(l.id);if(!it)return '';
 return `<div class="cl"><b>${esc(it.name)}</b><span class="amt">${l.src?esc(l.src):''}</span>
 <div class="sub2"><span class="stp"><button onclick="rQty(${i},-1)" aria-label="ลด">−</button><input inputmode="decimal" value="${l.qty}" aria-label="จำนวนชิ้น" onchange="rSet(${i},this.value)" onfocus="this.select()"><button onclick="rQty(${i},1)" aria-label="เพิ่ม">+</button></span>
 <span>${esc(it.unit||'ชิ้น')} · คงเหลือ ${fm(it.stock)} → <b>${fm(r2(it.stock+l.qty))}</b></span></div>
 <div class="sub2"><label class="rcost">ทุนต่อ${esc(it.unit||'ชิ้น')} ใหม่ <input inputmode="decimal" placeholder="${it.cost?fm(r2(it.cost)):'—'}" value="${l.cost===''||l.cost==null?'':l.cost}" onchange="rCost(${i},this.value)"></label><small>เว้นว่าง = ทุนเดิม</small></div>
 <button class="xbtn rm" onclick="rDel(${i})" aria-label="ลบรายการ">ลบ</button></div>`;
}
const rcvPaint=()=>{const pv=$('#pv');if(pv&&view==='rcv'){pv.innerHTML=rcvView();rcvFocus()}};
function rcvFocus(){const s=$('#rscan');if(s&&!document.querySelector('#mroot .scrim2'))s.focus({preventScroll:true})}
function rRes(){const e=$('#rres');if(e)e.innerHTML=rResHtml()}
function rResHtml(){
 const t=rq.trim().toLowerCase();if(!t||/^\d+[*xX]/.test(t)||/^\d{6,}$/.test(t))return '';
 return items.filter(i=>i.name.toLowerCase().includes(t)||(i.barcode&&i.barcode.includes(t))).slice(0,8).map(i=>`<button onclick="rAdd('${i.id}',1,'ชิ้น')"><span>${esc(i.name)}<br><small>${i.barcode?esc(i.barcode)+' · ':''}เหลือ ${fm(i.stock)}</small></span><b>+</b></button>`).join('');
}
function rAdd(id,n,src){
 const it=find(id);if(!it)return;n=n>0?n:1;const l=rl.find(x=>x.id===id);
 if(l){l.qty=r2(l.qty+n);if(src!=='ชิ้น'&&!/^× /.test(src))l.src=src}else rl.push({id,qty:n,src,cost:''});
 rlSave();rq='';beep(true);rcvPaint();
}
function rKey(e){
 if(e.key!=='Enter')return;e.preventDefault();const v=e.target.value.trim();if(!v)return;
 let n=1,c=v;const m=/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(.+)$/.exec(v);if(m){n=Number(m[1]);c=m[2].trim()}
 rcvScan(c,n);
}
// คืน 'add' | 'ask' | 'multi'
function rcvScan(v,n){
 n=n>0?n:1;
 const it=items.find(i=>i.barcode&&i.barcode===v);if(it){rAdd(it.id,n,n>1?'× '+fm(n)+' ชิ้น':'ชิ้น');return 'add'}
 const pk=packs.find(p=>p.barcode===v);if(pk&&find(pk.itemId)){rAdd(pk.itemId,r2(n*pk.qty),(pk.label||'ลัง')+' × '+fm(n)+' = '+fm(r2(n*pk.qty))+' ชิ้น');return 'add'}
 if(/^[0-9A-Za-z\-._]{6,}$/.test(v)&&/\d/.test(v)){beep(false);rcvUnknown(v,n);return 'ask'}
 const ms=items.filter(i=>i.name.toLowerCase().includes(v.toLowerCase()));
 if(ms.length===1){rAdd(ms[0].id,n,'ชิ้น');return 'add'}
 toast(ms.length?'มีหลายรายการ เลือกจากรายการด้านล่าง':'ไม่พบสินค้านี้');return 'multi';
}
function rQty(i,d){const l=rl[i];if(!l)return;l.qty=r2(l.qty+d);if(l.qty<=0)rl.splice(i,1);rlSave();rcvPaint();rcamList()}
function rSet(i,v){const l=rl[i],n=Number(v);if(!l)return;if(n>0)l.qty=n;else rl.splice(i,1);rlSave();rcvPaint()}
function rCost(i,v){const l=rl[i];if(!l)return;l.cost=v.trim()===''?'':Number(v);if(l.cost!==''&&!(l.cost>=0))l.cost='';rlSave()}
function rDel(i){rl.splice(i,1);rlSave();rcvPaint()}
function rcvClear(){if(!confirm('ล้างรายการรับเข้าทั้งหมด?'))return;rl=[];rlSave();rcvPaint()}

/* ----- รหัสที่ยังไม่มีในระบบ ----- */
let ruV='',ruN=1,ruSel='',ruQ='';
function rcvUnknown(v,n){
 ruV=v;ruN=n;ruSel='';ruQ='';
 dlg(`<h3>ยังไม่รู้จักรหัสนี้</h3><p class="sub"><b>${esc(v)}</b> ไม่อยู่ในระบบ เป็นอะไร?</p>
 <div class="acts2"><button class="btn pri lg" onclick="rcvAsNew()">เป็นสินค้าใหม่ (ชิ้น)</button><button class="btn lg" onclick="rcvAsPack()">เป็นบาร์โค้ดลัง/แพ็ก ของสินค้าที่มีอยู่แล้ว</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`);
}
function rcvAsNew(){
 newItemDlg(ruV,'');
 const b=$('#svb');if(b){b.textContent='บันทึกสินค้าใหม่';b.setAttribute('onclick','rcvSaveNew()')}
 document.querySelectorAll('#mroot .acts2 .btn').forEach(x=>{if(x.textContent==='บันทึกอย่างเดียว')x.remove()});
}
async function rcvSaveNew(){await saveItemDlg(false);const it=items.find(i=>i.barcode===ruV);if(it){toast('เพิ่มสินค้าใหม่แล้ว · ยิงอีกครั้งเพื่อรับเข้าเพิ่ม');rcvPaint()}}
function rcvAsPack(){
 dlg(`<h3>ผูกบาร์โค้ดลัง/แพ็ก</h3><p class="sub">รหัส <b>${esc(ruV)}</b> เป็นของสินค้าไหน และในลัง/แพ็กมีกี่ชิ้น (กรอกครั้งเดียว ครั้งหน้ายิงได้เลย)</p>
 <input id="ru_q" class="inp" placeholder="ค้นหาสินค้า" oninput="ruQ=this.value;ruList()"><div id="ru_l" class="lbrows"></div>
 <div class="row2"><label class="fld"><span class="lbl">ในลัง/แพ็กมีกี่ชิ้น</span><input id="ru_n" class="inp" inputmode="decimal" placeholder="เช่น 12"></label><label class="fld"><span class="lbl">ชื่อเรียก</span><input id="ru_t" class="inp" placeholder="ลัง / แพ็ก"></label></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button id="ru_go" class="btn pri lg" onclick="rcvPackGo()" disabled>เลือกสินค้าก่อน</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'ru_q');
 ruList();
}
function ruList(){
 const t=ruQ.trim().toLowerCase(),l=items.filter(i=>!t||i.name.toLowerCase().includes(t)||(i.barcode||'').includes(t)).slice(0,40);
 $('#ru_l').innerHTML=l.length?l.map(i=>`<label class="lbr"><input type="radio" name="ru" ${ruSel===i.id?'checked':''} onchange="ruPick('${i.id}')"> <span>${esc(i.name)} <small>เหลือ ${fm(i.stock)}</small></span></label>`).join(''):'<div class="empty2">ไม่พบสินค้า</div>';
}
function ruPick(id){ruSel=id;const b=$('#ru_go');b.disabled=false;b.textContent='ผูกและรับเข้า — '+find(id).name}
async function rcvPackGo(){
 const q=Number($('#ru_n').value);if(!(q>0)){$('#perr').textContent='กรุณาใส่จำนวนชิ้นในลัง';return}
 try{const j=await api({action:'posPackSave',barcode:ruV,itemId:ruSel,qty:q,label:$('#ru_t').value});packs=j.packs;closeDlg(true);rcvScan(ruV,ruN)}catch(e){$('#perr').textContent=e.message}
}

/* ----- กล้อง ----- */
function rcvCam(){
 camMode='rcv';
 dlg(`<h3>สแกนรับของด้วยกล้อง</h3><div id="camv" class="camv"></div><div id="camm" class="camm">เล็งบาร์โค้ดชิ้นหรือลัง</div><div id="camb" class="camb2"></div>
 <div class="acts2"><button class="btn pri lg" onclick="camStop(true)">เสร็จ (รายการยังอยู่)</button></div>`,null,()=>camStop(false));
 rcamList();camStart();
}
function rcamList(){
 const e=$('#camb');if(!e||camMode!=='rcv')return;
 e.innerHTML=rl.map((l,i)=>{const it=find(l.id);return it?`<div class="cbl"><b>${esc(it.name)}</b><span class="stp"><button onclick="rQty(${i},-1)" aria-label="ลด">−</button><span class="q">${fm(l.qty)}</span><button onclick="rQty(${i},1)" aria-label="เพิ่ม">+</button></span></div>`:''}).join('');
}
function rcvHit(text){
 const v=String(text||'').trim(),now=Date.now();if(!v)return;
 if(v===camLast&&!(camNo>camAt+700))return;camLast=v;camAt=now;
 const known=items.some(i=>i.barcode===v)||packs.some(p=>p.barcode===v);
 if(known){const r=rcvScan(v,1),m=$('#camm');if(m){const l=rl[rl.length-1];m.innerHTML='เพิ่มแล้ว'}rcamList();return r}
 camStop(false).then(()=>rcvScan(v,1));
}
async function rcvSave(){
 if(busy||!rl.length)return;busy=true;const b=$('#rsv');if(b){b.disabled=true;b.textContent='กำลังบันทึก…'}
 const done=[],changed=[];
 try{
  for(const l of rl.slice()){
   const it=find(l.id);if(!it){continue}
   const body={action:'posReceive',id:l.id,qty:l.qty,note:'รับเข้า (โหมดรับของ)'};if(l.cost!==''&&l.cost!=null)body.cost=l.cost;
   const old=it.cost,j=await api(body),k=items.findIndex(x=>x.id===l.id);if(k>=0)items[k]=j.item;
   done.push({n:j.item.name,q:l.qty,s:j.item.stock});if(l.cost!==''&&Math.abs(j.item.cost-old)>1e-6)changed.push({n:j.item.name,p:j.item.price,np:calcPackPrice(j.item.cost,1,j.item.mk)});
   rl=rl.filter(x=>x!==l);rlSave();
  }
  busy=false;rcvPaint();
  dlg(`<h3>รับเข้าสต๊อกแล้ว ${done.length} รายการ</h3><table class="t">${done.map(d=>`<tr><td>${esc(d.n)}</td><td class="r">+${fm(d.q)}</td><td class="r">เหลือ ${fm(d.s)}</td></tr>`).join('')}</table>${changed.length?`<p class="sub" style="margin-top:10px">ทุนเปลี่ยน — ราคาขายแนะนำใหม่ (แก้ได้ที่หน้าสินค้า):<br>${changed.map(c=>esc(c.n)+' '+fm(c.p)+' → <b>'+fm(c.np)+'</b>').join('<br>')}</p>`:''}<div class="acts2"><button class="btn pri lg" onclick="closeDlg()">ปิด</button></div>`);
 }catch(e){busy=false;rcvPaint();const er=$('#rerr');if(er)er.textContent=e.message+' (รายการที่เหลือยังอยู่ กดบันทึกใหม่ได้)'}
}
