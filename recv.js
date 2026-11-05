/* โหมด "รับของเข้า": ยิงสินค้าเป็นชิ้นหรือเป็นลังก็ได้ รวมเป็นรายการ แล้วบันทึกรับเข้าสต๊อกทีเดียว (แยกจากหน้าขาย) */
let rl=(()=>{try{return JSON.parse(localStorage.getItem('posRcv')||'[]')}catch(e){return []}})(),rq='',camMode='';
const rlSave=()=>{try{localStorage.setItem('posRcv',JSON.stringify(rl))}catch(e){}};
function rcvView(){
 const n=rl.reduce((a,l)=>a+l.qty,0);
 return `<div class="lhead"><h2 class="h2">รับของเข้า</h2></div>
 <div class="row2 rsup"><label class="fld"><span class="lbl">ผู้ขาย (ไม่บังคับ)</span><input id="r_sup" class="inp" list="dl_sup2" value="${esc(rsup)}" oninput="rsup=this.value;try{localStorage.setItem('posRcvSup',rsup)}catch(e){}" placeholder="ซื้อจากร้านไหน"><datalist id="dl_sup2">${allSups().map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
 <label class="fld"><span class="lbl">เลขที่ใบซื้อ (ไม่บังคับ)</span><input id="r_inv" class="inp" value="${esc(rinv)}" oninput="rinv=this.value" placeholder="เช่น INV-123"></label></div>
 <div class="scan"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg>
 <input id="rscan" class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ยิงบาร์โค้ดชิ้นหรือลัง หรือพิมพ์ชื่อสินค้า" value="${esc(rq)}" oninput="rq=this.value;rRes()" onkeydown="rKey(event)"><button type="button" class="camb" onclick="rcvCam()" aria-label="สแกนด้วยกล้องมือถือ">กล้อง</button></div>
 <div class="chips"><button class="btn" onclick="rcvPick()">+ เลือกสินค้าที่มีอยู่</button><label class="chk" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ${rask?'checked':''} onchange="setAsk(this.checked)"> <span>ยิงแล้วถามจำนวนลัง/แพ็กก่อน</span></label></div>
 <p class="hint">ยิงสินค้าที่มีอยู่ แล้วใส่ว่ารับมากี่ลัง/แพ็ก ลังละกี่ชิ้น ระบบคูณและบวกสต๊อกให้ · ปิดช่องถามจำนวนถ้าจะยิงทีละชิ้นรัวๆ (หรือพิมพ์ <b>3*บาร์โค้ด</b> = 3 ชิ้น) · ยิงรหัสที่ยังไม่มี = สินค้าใหม่</p>
 <div id="rres" class="sres">${rResHtml()}</div>
 <section class="sec cartbox" aria-label="รายการรับเข้า">${rl.length?rl.map(rlHtml).join(''):'<div class="empty2">ยังไม่มีรายการรับเข้า<br><small>ยิงบาร์โค้ดสินค้าที่รับมาได้เลย</small></div>'}</section>
 ${rl.length?`<section class="sec"><div class="tot"><span>รวม ${fm(rl.length)} รายการ</span><b>${fm(r2(n))} ชิ้น</b></div><div id="rerr" class="err" role="alert"></div><div class="acts2"><button class="btn pri lg" id="rsv" onclick="rcvSave()">บันทึกรับเข้าสต๊อก</button><button class="btn dng" onclick="rcvClear()">ล้างรายการ</button></div></section>`:''}`;
}
function rlHtml(l,i){
 const it=find(l.id);if(!it)return '';
 return `<div class="cl"><b>${esc(it.name)}</b><span class="amt">${l.src?esc(l.src):''}</span>
 <div class="sub2"><span class="stp"><button onclick="rQty(${i},-1)" aria-label="ลด">−</button><input inputmode="decimal" value="${l.qty}" aria-label="จำนวนชิ้น" onchange="rSet(${i},this.value)" onfocus="this.select()"><button onclick="rQty(${i},1)" aria-label="เพิ่ม">+</button></span>
 <span>${esc(it.unit||'ชิ้น')} · คงเหลือ ${fm(it.stock)} → <b>${fm(r2(it.stock+l.qty))}</b></span><button class="pbtn" onclick="rcvQty('${l.id}',1)">ใส่เป็นลัง/แพ็ก</button></div>
 <div class="sub2"><label class="rcost">หมดอายุ <input type="date" class="dtin" value="${l.exp||''}" onchange="rExp(${i},this.value)"></label></div>
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
// ยิง/พิมพ์สินค้า: ถ้าเปิด "ถามจำนวน" จะเปิดช่องใส่ลัง/แพ็กก่อน ไม่งั้นเพิ่มทีละ 1 (หรือตามเลขหน้า *)
function rcvScan(v,n,cam){
 n=n>0?n:1;
 const add=it=>{if(rask&&!cam&&n===1)rcvQty(it.id);else rAdd(it.id,n,n>1?'× '+fm(n)+' ชิ้น':'ชิ้น');return 'add'};
 const it=items.find(i=>i.barcode&&i.barcode===v);if(it)return add(it);
 if(/^[0-9A-Za-z\-._]{6,}$/.test(v)&&/\d/.test(v)){beep(false);rcvNew(v);return 'new'}
 const ms=items.filter(i=>i.name.toLowerCase().includes(v.toLowerCase()));
 if(ms.length===1)return add(ms[0]);
 toast(ms.length?'มีหลายรายการ เลือกจากรายการด้านล่าง':'ไม่พบสินค้านี้');return 'multi';
}
// รหัสที่ยังไม่มีในระบบ = สินค้าใหม่ (ฟอร์มมีช่องรับเข้าครั้งแรกอยู่แล้ว)
function rcvNew(v){
 newItemDlg(v,'');
 const b=$('#svb');if(b){b.textContent='บันทึกสินค้าใหม่';b.setAttribute('onclick','rcvSaveNew()')}
 document.querySelectorAll('#mroot .acts2 .btn').forEach(x=>{if(x.textContent==='บันทึกอย่างเดียว')x.remove()});
 window.__rnv=v;
}
async function rcvSaveNew(){await saveItemDlg(false);if(items.some(i=>i.barcode===window.__rnv)){toast('เพิ่มสินค้าใหม่แล้ว');rcvPaint()}}
function rQty(i,d){const l=rl[i];if(!l)return;l.qty=r2(l.qty+d);if(l.qty<=0)rl.splice(i,1);rlSave();rcvPaint();rcamList()}
function rSet(i,v){const l=rl[i],n=Number(v);if(!l)return;if(n>0)l.qty=n;else rl.splice(i,1);rlSave();rcvPaint()}
function rCost(i,v){const l=rl[i];if(!l)return;l.cost=v.trim()===''?'':Number(v);if(l.cost!==''&&!(l.cost>=0))l.cost='';rlSave()}
function rExp(i,v){const l=rl[i];if(!l)return;l.exp=v||'';rlSave()}
function rDel(i){rl.splice(i,1);rlSave();rcvPaint()}
function rcvClear(){if(!confirm('ล้างรายการรับเข้าทั้งหมด?'))return;rl=[];rlSave();rcvPaint()}

/* ----- เลือกสินค้าเอง / ใส่เป็นลัง-แพ็ก ----- */
let rsup=(()=>{try{return localStorage.getItem('posRcvSup')||''}catch(e){return ''}})(),rinv='',rask=(()=>{try{return localStorage.getItem('posRcvAsk')!=='0'}catch(e){return true}})(),rpq='';
function setAsk(on){rask=!!on;try{localStorage.setItem('posRcvAsk',on?'1':'0')}catch(e){}}
function rcvPick(){
 rpq='';dlg(`<h3>เลือกสินค้าที่รับเข้า</h3><input id="rp_q" class="inp" placeholder="ค้นหาชื่อสินค้า หรือยิงบาร์โค้ด" oninput="rpq=this.value;rpList()" onkeydown="if(event.key==='Enter'){event.preventDefault();rpEnter(this.value)}"><div id="rp_l" class="lbrows" style="max-height:320px"></div>
 <div class="acts2"><button class="btn" onclick="closeDlg()">ปิด</button></div>`,'rp_q');rpList();
}
function rpList(){
 const t=rpq.trim().toLowerCase(),l=items.filter(i=>!t||i.name.toLowerCase().includes(t)||(i.barcode||'').includes(t)).slice(0,60);
 $('#rp_l').innerHTML=l.length?l.map(i=>`<button class="lbr" style="width:100%;border:0;background:none;text-align:left;font:inherit;color:inherit" onclick="rcvQty('${i.id}')"><span>${esc(i.name)} <small>เหลือ ${fm(i.stock)}${i.unit?' '+esc(i.unit):''}</small></span></button>`).join(''):'<div class="empty2">ไม่พบสินค้า — ถ้าเป็นสินค้าใหม่ ให้ไปที่แท็บ สินค้า → เพิ่มสินค้า</div>';
}
function rpEnter(v){v=v.trim();const it=items.find(i=>i.barcode===v)||(items.filter(i=>i.name.toLowerCase().includes(v.toLowerCase())).length===1?items.find(i=>i.name.toLowerCase().includes(v.toLowerCase())):null);if(it)rcvQty(it.id)}
function rcvQty(id,fromLine){
 const it=find(id);if(!it)return;const pn=getPk(id),u=esc(it.unit||'ชิ้น');
 dlg(`<h3>${esc(it.name)}</h3><p class="sub">คงเหลือ ${fm(it.stock)} ${u}</p>
 <div class="row2"><label class="fld"><span class="lbl">รับมากี่ลัง / แพ็ก</span><input id="q_k" class="inp" inputmode="decimal" value="1" oninput="rqCalc('${id}')" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#q_n').focus()}"></label>
 <label class="fld"><span class="lbl">ลัง/แพ็กละกี่${u}</span><input id="q_n" class="inp" inputmode="numeric" value="${pn}" oninput="rqCalc('${id}')" onfocus="this.select()" onkeydown="if(event.key==='Enter')rqGo('${id}',${fromLine?1:0})"></label></div>
 <p class="sub" style="margin:-4px 0 6px">รับเป็น${u}เดี่ยวๆ ให้ใส่ 1 ในช่องที่สอง</p>
 <div id="q_r" class="chg"><small>รับเข้า</small><b>0</b></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="rqGo('${id}',${fromLine?1:0})">เพิ่มในรายการ</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'q_k');
 rqCalc(id);
}
function rqVals(){const k=Number($('#q_k').value),nv=Number($('#q_n').value),n=nv>0?nv:1;return{k,n,qty:k>0?r2(k*n):0}}
function rqCalc(id){const v=rqVals(),it=find(id),e=$('#q_r');if(!e)return;e.innerHTML=v.qty>0?`<small>${fm(v.k)} × ${fm(v.n)} = รวมรับเข้า → คงเหลือ ${fm(r2(it.stock+v.qty))}</small><b>${fm(v.qty)} ${esc(it.unit||'ชิ้น')}</b>`:'<small>รับเข้า</small><b>0</b>'}
function rqGo(id,replace){
 const v=rqVals();if(!(v.qty>0)){$('#perr').textContent='กรุณาใส่จำนวน';return}
 if(v.n>1)setPk(id,v.n);
 const src=v.n>1?fm(v.k)+' × '+fm(v.n)+' = '+fm(v.qty):'';
 closeDlg(true);
 if(replace){const l=rl.find(x=>x.id===id);if(l){l.qty=v.qty;l.src=src;rlSave();rcvPaint();return}}
 rAdd(id,v.qty,src||'ชิ้น');
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
 const it=items.find(i=>i.barcode===v);
 if(it){rcvScan(v,1,true);const m=$('#camm');if(m)m.innerHTML='เพิ่มแล้ว: <b>'+esc(it.name)+'</b>';rcamList();return}
 camStop(false).then(()=>rcvScan(v,1,true));
}
async function rcvSave(){
 if(busy||!rl.length)return;busy=true;const b=$('#rsv');if(b){b.disabled=true;b.textContent='กำลังบันทึก…'}
 const lines=rl.filter(l=>find(l.id)).map(l=>({id:l.id,qty:l.qty,cost:l.cost===''?undefined:l.cost,expiry:l.exp||''})),old={};rl.forEach(l=>{const it=find(l.id);if(it)old[l.id]=it.cost});
 try{
  const j=await api({action:'posReceiveBatch',lines,sup:rsup,invoice:rinv}),done=[],changed=[];
  j.items.forEach(u=>{const k=items.findIndex(x=>x.id===u.id);if(k>=0)items[k]=u;const l=rl.find(x=>x.id===u.id);done.push({n:u.name,q:l?l.qty:0,s:u.stock});if(l&&l.cost!==''&&l.cost!=null&&Math.abs(u.cost-old[u.id])>1e-6)changed.push({n:u.name,p:u.price,np:calcPackPrice(u.cost,1,u.mk)})});
  rl=[];rlSave();rinv='';busy=false;rcvPaint();
  api({action:'posExpiry',days:cfg.expDays==null?14:cfg.expDays}).then(x=>{expL=x.list}).catch(()=>{});
  dlg(`<h3>รับเข้าสต๊อกแล้ว ${done.length} รายการ</h3><p class="sub">มูลค่าซื้อรวม <b>${fm(j.total)}</b> บาท${rsup?' · '+esc(rsup):''} (บันทึกเป็นใบซื้อแล้ว)</p><table class="t">${done.map(d=>`<tr><td>${esc(d.n)}</td><td class="r">+${fm(d.q)}</td><td class="r">เหลือ ${fm(d.s)}</td></tr>`).join('')}</table>${changed.length?`<p class="sub" style="margin-top:10px">ทุนเปลี่ยน — ราคาขายแนะนำใหม่ (แก้ได้ที่หน้าสินค้า):<br>${changed.map(c=>esc(c.n)+' '+fm(c.p)+' → <b>'+fm(c.np)+'</b>').join('<br>')}</p>`:''}<div class="acts2"><button class="btn pri lg" onclick="closeDlg()">ปิด</button></div>`);
 }catch(e){busy=false;rcvPaint();const er=$('#rerr');if(er)er.textContent=e.message+' (รายการยังอยู่ กดบันทึกใหม่ได้)'}
}
