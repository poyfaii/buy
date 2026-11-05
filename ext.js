/* ส่วนขยาย POS: ส่วนลด · พักบิล · สินค้าทั่วไป · ปุ่มลัด · หมวดหมู่ · คืนสินค้า · ตรวจนับ · ใบสั่งซื้อ · หมดอายุ · สำรองข้อมูล */
const catHue=s=>{let h=0;for(const c of String(s||'x'))h=(h*31+c.codePointAt(0))%360;return h};
const catColor=c=>`hsl(${catHue(c)} 68% 52%)`;
const chIcon=n=>{n=String(n||'?').trim();try{const g=[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(n)].map(x=>x.segment),e=/\p{Extended_Pictographic}/u.test(g[0]||'');return e?g[0]:g.slice(0,2).join('').toUpperCase()}catch(x){return Array.from(n).slice(0,2).join('').toUpperCase()}};
const allCats=()=>[...new Set(items.map(i=>i.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
const allSups=()=>[...new Set(items.map(i=>i.sup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
const catOk=i=>!icat||(i.cat||'ไม่ระบุหมวด')===icat;
const lowItems=()=>items.filter(i=>i.stock<=0||(i.minStock>0&&i.stock<=i.minStock));
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};

/* ----- ส่วนลดท้ายบิล ----- */
let bdisc=load('mdr_pos_disc',{t:'baht',v:0});
function discBaht(){const sub=subtotal();if(!(bdisc.v>0)||!cart.length)return 0;const d=bdisc.t==='pct'?Math.floor(sub*bdisc.v/100):bdisc.v;return r2(Math.min(sub,Math.max(0,d)))}
function discReset(){bdisc={t:'baht',v:0};store('mdr_pos_disc',bdisc)}
function discLine(){const d=discBaht();return d>0?`<div class="dl"><span>รวมสินค้า</span><b>${fm(subtotal())}</b></div><div class="dl neg"><span>ส่วนลด${bdisc.t==='pct'?' '+fm(bdisc.v)+'%':''} <button class="pbtn" onclick="discDlg()">แก้</button></span><b>−${fm(d)}</b></div>`:''}
function discDlg(){
 if(!cart.length)return;const sub=subtotal();
 dlg(`<h3>ส่วนลดท้ายบิล</h3><p class="sub">รวมสินค้า <b>${fm(sub)}</b> บาท</p>
 <div class="seg"><button id="dt_b" class="cat" aria-pressed="${bdisc.t!=='pct'}" onclick="discType('baht')">ลดเป็นบาท</button><button id="dt_p" class="cat" aria-pressed="${bdisc.t==='pct'}" onclick="discType('pct')">ลดเป็น %</button></div>
 <label class="fld"><span class="lbl" id="dl_l">จำนวน</span><input id="dv" class="inp" inputmode="decimal" value="${bdisc.v||''}" style="font-size:24px;font-weight:700;text-align:center" oninput="discPrev()" onkeydown="if(event.key==='Enter')discOk()"></label>
 <div class="quick" id="dq"></div><div id="dp2" class="chg"><small>ยอดสุทธิ</small><b>${fm(sub)}</b></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="discOk()">ใช้ส่วนลด</button>${bdisc.v>0?'<button class="btn dng" onclick="discClear()">ลบส่วนลด</button>':''}<button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'dv');
 window.__dt=bdisc.t==='pct'?'pct':'baht';discType(window.__dt,true);
}
function discType(t,keep){window.__dt=t;$('#dt_b').setAttribute('aria-pressed',t==='baht');$('#dt_p').setAttribute('aria-pressed',t==='pct');if(!keep)$('#dv').value='';
 $('#dq').innerHTML=(t==='pct'?[5,10,15,20]:[5,10,20,50]).map(v=>`<button onclick="$('#dv').value=${v};discPrev()">${v}${t==='pct'?'%':' บาท'}</button>`).join('');discPrev()}
function discCalc(){const v=Number($('#dv').value),sub=subtotal();if(!(v>0))return 0;return r2(Math.min(sub,window.__dt==='pct'?Math.floor(sub*v/100):v))}
function discPrev(){const d=discCalc(),e=$('#dp2');if(e)e.innerHTML=`<small>${d>0?'ลด '+fm(d)+' บาท · ยอดสุทธิ':'ยอดสุทธิ'}</small><b>${fm(subtotal()-d)}</b>`}
function discOk(){const v=Number($('#dv').value);if(v<0||!isFinite(v)){$('#perr').textContent='จำนวนไม่ถูกต้อง';return}if(window.__dt==='pct'&&v>100){$('#perr').textContent='ลดได้ไม่เกิน 100%';return}if(window.__dt!=='pct'&&v>subtotal()){$('#perr').textContent='ส่วนลดมากกว่ายอดสินค้า';return}
 bdisc={t:window.__dt,v:v>0?v:0};store('mdr_pos_disc',bdisc);closeDlg(true);repaintSell(false)}
function discClear(){discReset();closeDlg(true);repaintSell(false)}

/* ----- พักบิล / เรียกบิล ----- */
let held=load('mdr_pos_held',[]);
const hhm=ts=>{const d=new Date(ts+7*3600e3);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')};
function pushHeld(){const n=cart.reduce((a,l)=>a+l.qty,0);held.push({id:newCid(),at:Date.now(),n:r2(n),total:total(),cart:cart.slice(),disc:bdisc.v>0?{...bdisc}:null});store('mdr_pos_held',held)}
function holdBill(){if(!cart.length)return;pushHeld();cart=[];saveCart();discReset();toast('พักบิลไว้แล้ว — กด “เรียกบิล” เพื่อกลับมาขายต่อ');repaintSell(false)}
function heldDlg(){
 dlg(`<h3>บิลที่พักไว้</h3>${held.length?held.map(h=>`<div class="hrow"><div><b>พักเมื่อ ${hhm(h.at)} น.</b><small>${fm(h.n)} ชิ้น · ${fm(h.total)} บาท · ${esc(h.cart.slice(0,3).map(l=>l.name).join(', '))}${h.cart.length>3?'…':''}</small></div><div class="hb"><button class="btn pri" onclick="resumeHeld('${h.id}')">เรียก</button><button class="btn dng" onclick="dropHeld('${h.id}')">ลบ</button></div></div>`).join(''):'<div class="empty2">ไม่มีบิลที่พักไว้</div>'}<div class="acts2"><button class="btn" onclick="closeDlg()">ปิด</button></div>`);
}
function resumeHeld(id){const k=held.findIndex(h=>h.id===id);if(k<0)return;const h=held[k];held.splice(k,1);if(cart.length)pushHeld();cart=h.cart;bdisc=h.disc||{t:'baht',v:0};store('mdr_pos_held',held);store('mdr_pos_disc',bdisc);saveCart();closeDlg(true);repaintSell(false);toast('เรียกบิลกลับมาแล้ว')}
function dropHeld(id){if(!confirm('ลบบิลที่พักไว้นี้?'))return;held=held.filter(h=>h.id!==id);store('mdr_pos_held',held);heldDlg()}

/* ----- สินค้าทั่วไป (ใส่ชื่อ+ราคาเอง) ----- */
function openItemDlg(){
 dlg(`<h3>สินค้าทั่วไป</h3><p class="sub">ของที่ไม่มีในระบบ เช่น ผักมัด ของฝาก ใส่ชื่อกับราคาแล้วขายได้เลย (ไม่ตัดสต๊อก)</p>
 <label class="fld"><span class="lbl">ชื่อรายการ <span class="req">*</span></span><input id="o_n" class="inp" value="สินค้าทั่วไป" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#o_p').focus()}"></label>
 <div class="row2"><label class="fld"><span class="lbl">ราคาขาย <span class="req">*</span></span><input id="o_p" class="inp" inputmode="decimal" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#o_q').focus()}"></label><label class="fld"><span class="lbl">จำนวน</span><input id="o_q" class="inp" inputmode="decimal" value="1" onfocus="this.select()" onkeydown="if(event.key==='Enter')openItemOk()"></label></div>
 <label class="fld"><span class="lbl">ต้นทุนต่อหน่วย (ไม่บังคับ ใช้คิดกำไร)</span><input id="o_c" class="inp" inputmode="decimal" placeholder="เว้นว่าง = นับเป็นกำไรเต็ม"></label><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="openItemOk()">เพิ่มลงบิล</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`,'o_n');
}
function openItemOk(){const n=$('#o_n').value.trim(),p=Number($('#o_p').value),q=Number($('#o_q').value)||1,c=Number($('#o_c').value)||0;
 if(!n){$('#perr').textContent='กรุณาใส่ชื่อรายการ';return}if(!(p>0)){$('#perr').textContent='กรุณาใส่ราคาขาย';return}if(!(q>0)){$('#perr').textContent='จำนวนไม่ถูกต้อง';return}
 cart.push({id:'',name:n,unit:'',price:p,qty:q,cost:c,open:true});saveCart();closeDlg(true);beep(true);repaintSell(false)}

/* ----- แถบสรุป / ปุ่มทางลัด / ปุ่มลัดสินค้า (หน้าขาย) ----- */
function sellExtras(){
 const st=stats||{},nl=lowItems().length;
 const ban=`<div class="today"><div class="t1"><small>ยอดขายวันนี้</small><b>${fm(st.total||0)}</b></div><div class="t2"><small>บิล</small><b>${fm(st.bills||0)}</b></div><div class="t3"><small>กำไร</small><b>${fm(st.profit||0)}</b></div></div>`;
 const al=(nl?`<button class="alc w1" onclick="icat='';flt='low';nav('items')"><i></i>สต๊อกต่ำ/หมด ${fm(nl)} รายการ</button>`:'')+(expL.length?`<button class="alc w2" onclick="expDlg()"><i></i>ใกล้หมดอายุ ${fm(expL.length)} รายการ</button>`:'');
 const acts=`<div class="qacts"><button class="qa c-hold" onclick="holdBill()"${cart.length?'':' disabled'}><i></i><span>พักบิล</span></button><button class="qa c-recall" onclick="heldDlg()"><i></i><span>เรียกบิล${held.length?` (${held.length})`:''}</span></button><button class="qa c-disc" onclick="discDlg()"${cart.length?'':' disabled'}><i></i><span>ส่วนลด</span></button><button class="qa c-open" onclick="openItemDlg()"><i></i><span>สินค้าทั่วไป</span></button></div>`;
 const fv=items.filter(i=>i.fav),grid=fv.length?`<div class="qgrid">${fv.map(i=>`<button class="qk" style="--h:${catHue(i.cat||i.name)}" onclick="addById('${i.id}',1)"><span class="qi">${esc(chIcon(i.name))}</span><b>${esc(i.name)}</b><small>${fm(i.price)}</small></button>`).join('')}</div>`:'';
 return ban+(al?`<div class="alcs">${al}</div>`:'')+acts+grid;
}

/* ----- หมวดหมู่ / ผู้ขาย / ปุ่มลัด ในฟอร์มสินค้า ----- */
function catFields(x){
 return `<div class="row2"><label class="fld"><span class="lbl">หมวดหมู่</span><input id="f_cat" class="inp" list="dl_cat" value="${esc(x.cat||'')}" placeholder="เช่น ขนม เครื่องดื่ม"><datalist id="dl_cat">${allCats().map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
 <label class="fld"><span class="lbl">ผู้ขาย / ร้านที่สั่ง</span><input id="f_sup" class="inp" list="dl_sup" value="${esc(x.sup||'')}" placeholder="ไม่บังคับ"><datalist id="dl_sup">${allSups().map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label></div>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="f_fav" ${x.fav?'checked':''}> <span>★ ปักเป็นปุ่มลัดบนหน้าขาย (ของที่ขายบ่อย หรือไม่มีบาร์โค้ด)</span></label>`;
}
function itemsTools(){
 const cs=allCats(),has=items.some(i=>!i.cat),chip=(k,t)=>`<button class="cat" aria-pressed="${icat===k}" onclick="setCat(decodeURIComponent('${encodeURIComponent(k)}'))">${esc(t)}</button>`;
 return `${cs.length?`<div class="chips" aria-label="หมวดหมู่">${chip('','ทุกหมวด')}${cs.map(c=>`<button class="cat" style="--tc:${catColor(c)}" aria-pressed="${icat===c}" onclick="setCat(decodeURIComponent('${encodeURIComponent(c)}'))"><i class="dot"></i>${esc(c)}</button>`).join('')}${has?chip('ไม่ระบุหมวด','ไม่ระบุหมวด'):''}</div>`:''}
 <div class="chips"><button class="cat tl t-cnt" onclick="countDlg()"><i></i>ตรวจนับสต๊อก</button><button class="cat tl t-po" onclick="poDlg()"><i></i>ใบสั่งซื้อ</button><button class="cat tl t-exp" onclick="expDlg()"><i></i>ใกล้หมดอายุ (${expL.length})</button></div>`;
}
function setCat(c){icat=c;render()}

/* ----- ตรวจนับสต๊อก ----- */
let cnt={},cntCat='';
function countDlg(){cnt={};cntCat=icat;cntRender()}
function cntList(){return items.filter(i=>!cntCat||(i.cat||'ไม่ระบุหมวด')===cntCat)}
function cntRender(){
 const cs=allCats(),has=items.some(i=>!i.cat);
 dlg(`<h3>ตรวจนับสต๊อก</h3><p class="sub">นับของจริงแล้วกรอกเฉพาะรายการที่นับ ช่องว่าง = ไม่ปรับ ระบบบันทึกเฉพาะรายการที่ไม่ตรงกับในระบบ</p>
 <label class="fld"><span class="lbl">หมวดที่จะนับ</span><select id="cn_c" class="inp" onchange="cntCat=this.value;cntRows()"><option value="">ทุกหมวด</option>${cs.map(c=>`<option ${cntCat===c?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('')}${has?`<option ${cntCat==='ไม่ระบุหมวด'?'selected':''}>ไม่ระบุหมวด</option>`:''}</select></label>
 <div id="cn_r" class="lbrows" style="max-height:44vh"></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" id="cn_go" onclick="cntSave()">บันทึกผลตรวจนับ <span id="cn_n"></span></button><button class="btn" onclick="closeDlg()">ปิด</button></div>`);
 cntRows();
}
function cntRows(){
 const l=cntList().slice(0,400);
 $('#cn_r').innerHTML=l.length?l.map(i=>{const v=cnt[i.id];return `<div class="cnr"><span class="cn">${esc(i.name)}<small>ในระบบ ${fm(i.stock)} ${esc(i.unit||'')}</small></span><input class="inp cnin" inputmode="decimal" value="${v===undefined?'':v}" placeholder="นับได้" oninput="cntSet('${i.id}',this.value)"><b id="cd_${i.id}" class="cd">${cntDiff(i,v)}</b></div>`}).join(''):'<div class="empty2">ไม่มีสินค้าในหมวดนี้</div>';cntCount();
}
function cntDiff(i,v){if(v===undefined||v==='')return '';const d=r2(Number(v)-i.stock);return d===0?'<span style="color:#1a7a3a">ตรง</span>':`<span style="color:#c0261a">${d>0?'+':''}${fm(d)}</span>`}
function cntSet(id,v){const i=find(id);if(v.trim()===''||!isFinite(Number(v)))delete cnt[id];else cnt[id]=Number(v);const e=document.getElementById('cd_'+id);if(e)e.innerHTML=cntDiff(i,cnt[id]);cntCount()}
function cntCount(){const n=Object.keys(cnt).length,e=$('#cn_n');if(e)e.textContent=n?'('+n+' รายการ)':''}
async function cntSave(){
 const rows=Object.entries(cnt).map(([id,stock])=>({id,stock})).filter(r=>find(r.id));if(!rows.length){$('#perr').textContent='ยังไม่ได้กรอกยอดที่นับ';return}
 if(busy)return;busy=true;$('#cn_go').disabled=true;
 try{const j=await api({action:'posAdjustBatch',rows,note:'ตรวจนับสต๊อก'});j.items.forEach(u=>{const k=items.findIndex(x=>x.id===u.id);if(k>=0)items[k]=u});busy=false;closeDlg(true);cnt={};render();toast(j.changed?'ปรับสต๊อก '+j.changed+' รายการ (ที่เหลือตรงกับระบบ)':'ทุกรายการตรงกับระบบ ไม่ต้องปรับ')}
 catch(e){busy=false;$('#cn_go').disabled=false;$('#perr').textContent=e.message}
}

/* ----- ใบสั่งซื้อ (จัดกลุ่มตามผู้ขาย) ----- */
const daysAgo=n=>new Date(Date.parse(today()+'T00:00:00Z')-n*864e5).toISOString().slice(0,10);
async function poDlg(){
 dlg(`<h3>ใบสั่งซื้อ</h3><div class="empty2">กำลังคำนวณจากยอดขาย 30 วันล่าสุด…</div>`);
 try{
  const r=await api({action:'posReport',from:daysAgo(30),to:today()}),by={},seen={};
  const put=(it,need,why)=>{if(seen[it.id]||!(need>0))return;seen[it.id]=1;const k=it.sup||'ไม่ระบุผู้ขาย';(by[k]=by[k]||[]).push({n:it.name,u:it.unit||'ชิ้น',q:Math.ceil(need),why})};
  (r.reorder||[]).forEach(x=>{const it=find(x.id);if(it)put(it,x.need,'ขายดี เหลือไม่พอ 7 วัน')});
  items.filter(i=>i.stock<=0||(i.minStock>0&&i.stock<=i.minStock)).forEach(i=>put(i,Math.max(1,(i.minStock||0)*2-i.stock),i.stock<=0?'หมดแล้ว':'ถึงเกณฑ์เตือน'));
  window.__po=by;const ks=Object.keys(by).sort((a,b)=>a.localeCompare(b,'th'));
  dlg(`<h3>ใบสั่งซื้อ</h3><p class="sub">คำนวณจากยอดขาย 30 วันล่าสุด + สินค้าที่หมด/ถึงเกณฑ์เตือน จัดกลุ่มตามผู้ขาย กดคัดลอกแล้ววางส่ง LINE ได้เลย</p>${ks.length?ks.map((k,i)=>`<section class="sec po"><h3>${esc(k)} <small>${by[k].length} รายการ</small></h3><table class="t">${by[k].map(x=>`<tr><td>${esc(x.n)}<br><small>${esc(x.why)}</small></td><td class="r"><b>${fm(x.q)}</b> ${esc(x.u)}</td></tr>`).join('')}</table><button class="btn" onclick="poCopy(${i})">คัดลอกข้อความสั่งของ</button></section>`).join(''):'<div class="empty2">ตอนนี้ยังไม่มีสินค้าที่ต้องสั่งเพิ่ม 🎉</div>'}<div class="acts2">${ks.length?'<button class="btn" onclick="poCsv()">ส่งออก CSV</button>':''}<button class="btn" onclick="closeDlg()">ปิด</button></div>`);
  window.__pok=ks;
 }catch(e){dlg(`<h3>ใบสั่งซื้อ</h3><div class="err">${esc(e.message)}</div><div class="acts2"><button class="btn" onclick="closeDlg()">ปิด</button></div>`)}
}
function poText(k){const l=window.__po[k];return `สั่งของ ${cfg.shop||'ร้านชำ'} (${dthai(today())})\nถึง: ${k}\n`+l.map(x=>`• ${x.n} × ${x.q} ${x.u}`).join('\n')}
async function poCopy(i){const t=poText(window.__pok[i]);try{await navigator.clipboard.writeText(t);toast('คัดลอกแล้ว')}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('คัดลอกแล้ว')}catch(x){toast('คัดลอกไม่ได้')}a.remove()}}
function poCsv(){const rows=[['ผู้ขาย','สินค้า','จำนวนที่ควรสั่ง','หน่วย','เหตุผล']];window.__pok.forEach(k=>window.__po[k].forEach(x=>rows.push([k,x.n,x.q,x.u,x.why])));csvDl(`ใบสั่งซื้อ-${today()}.csv`,rows)}

/* ----- สินค้าใกล้หมดอายุ ----- */
async function expDlg(){
 try{const j=await api({action:'posExpiry',days:cfg.expDays==null?14:cfg.expDays});expL=j.list}catch(e){}
 dlg(`<h3>สินค้าใกล้หมดอายุ</h3><p class="sub">เตือนล่วงหน้า ${fm(cfg.expDays==null?14:cfg.expDays)} วัน (ตั้งได้ที่ ตั้งค่า) คิดจากล็อตที่รับเข้าล่าสุดของสต๊อกที่เหลือ</p>${expL.length?`<table class="t">${expL.map((x,i)=>`<tr><td>${esc(x.name)}<br><small>${dthai(x.expiry)} · ${fm(x.qty)} ${esc(x.unit||'ชิ้น')}</small></td><td class="r"><span class="eb ${x.left<0?'e0':x.left<=3?'e1':'e2'}">${x.left<0?'หมดแล้ว '+(-x.left)+' วัน':x.left===0?'วันนี้':'อีก '+x.left+' วัน'}</span></td><td><button class="btn dng sm" onclick="expWrite(${i})">ตัดทิ้ง</button></td></tr>`).join('')}</table><p class="sub" style="margin-top:8px">“ตัดทิ้ง” = ลดสต๊อกตามจำนวนของล็อตนั้น บันทึกเป็นตัดจำหน่ายหมดอายุ</p>`:'<div class="empty2">ไม่มีสินค้าใกล้หมดอายุ 🎉</div>'}<div class="acts2"><button class="btn" onclick="closeDlg(true);render()">ปิด</button></div>`);
}
async function expWrite(i){const x=expL[i],it=find(x.itemId);if(!it||!confirm(`ตัดทิ้ง ${x.name} ${fm(x.qty)} ${x.unit||'ชิ้น'} ?`))return;
 try{const j=await api({action:'posAdjust',id:it.id,stock:r2(it.stock-x.qty),note:'ตัดจำหน่ายหมดอายุ'});const k=items.findIndex(y=>y.id===it.id);if(k>=0)items[k]=j.item;expL.splice(i,1);toast('ตัดจำหน่ายแล้ว');expDlg()}catch(e){toast(e.message)}}

/* ----- คืนสินค้า (จากบิลในรายงาน) ----- */
function returnDlg(i){
 const s=report.sales[i],prev={};report.sales.filter(x=>x.refNo===s.saleNo&&x.status==='ปกติ').forEach(x=>x.items.forEach(l=>{prev[l.ri]=(prev[l.ri]||0)-l.qty}));
 const factor=s.subtotal>0?s.total/s.subtotal:1;window.__rt={i,s,factor,prev};
 dlg(`<h3>คืนสินค้า — ${esc(s.saleNo)}</h3><p class="sub">ใส่จำนวนที่ลูกค้าคืนในแต่ละรายการ ระบบคืนสต๊อกและคำนวณเงินคืน${s.disc>0?' (หักส่วนลดตามสัดส่วน)':''}</p>
 ${s.items.map((l,k)=>{const left=r2(l.qty-(prev[k]||0));return `<div class="rtr"><span class="cn">${esc(l.name)}<small>ซื้อ ${fm(l.qty)} × ${fm(l.price)}${prev[k]?` · คืนไปแล้ว ${fm(prev[k])}`:''}</small></span>${left>0?`<span class="stp"><button onclick="rtQ(${k},-1,${left})" aria-label="ลด">−</button><input id="rt_${k}" inputmode="decimal" value="0" onchange="rtQ(${k},0,${left})" onfocus="this.select()"><button onclick="rtQ(${k},1,${left})" aria-label="เพิ่ม">+</button></span>`:'<small>คืนครบแล้ว</small>'}</div>`}).join('')}
 ${s.method==='credit'?'<p class="sub">บิลนี้ติดเงินไว้ → ระบบหักยอดค้างของลูกค้าให้</p>':`<label class="fld"><span class="lbl">คืนเงินเป็น</span><select id="rt_m" class="inp"><option value="cash">เงินสด</option><option value="transfer">โอนคืน</option></select></label>`}
 <div id="rt_t" class="chg"><small>เงินที่ต้องคืน</small><b>0</b></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" id="rt_go" onclick="rtGo()">บันทึกการคืนสินค้า</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`);
}
function rtQ(k,d,left){const e=$('#rt_'+k);let v=Number(e.value)||0;v=d?v+d:v;v=Math.max(0,Math.min(left,r2(v)));e.value=v;rtTot()}
function rtTot(){const r=window.__rt;let t=0;r.s.items.forEach((l,k)=>{const e=$('#rt_'+k);if(e)t+=l.price*(Number(e.value)||0)*r.factor});$('#rt_t').innerHTML=`<small>เงินที่ต้องคืน</small><b>${fm(r2(t))}</b>`}
async function rtGo(){
 const r=window.__rt,lines=[];r.s.items.forEach((l,k)=>{const e=$('#rt_'+k),q=e?Number(e.value)||0:0;if(q>0)lines.push({i:k,qty:q})});
 if(!lines.length){$('#perr').textContent='ยังไม่ได้เลือกสินค้าที่จะคืน';return}if(busy)return;busy=true;$('#rt_go').disabled=true;
 try{const j=await api({action:'posReturn',saleNo:r.s.saleNo,lines,method:$('#rt_m')?$('#rt_m').value:'cash'});(j.items||[]).forEach(u=>{const k=items.findIndex(x=>x.id===u.id);if(k>=0)items[k]=u});busy=false;if(j.sale.method==='credit')refreshCusts();showReceipt(j.sale,true);loadReport()}
 catch(e){busy=false;$('#rt_go').disabled=false;$('#perr').textContent=e.message}
}

/* ----- ส่วนเสริมในรายงาน ----- */
function repExtra(r){
 if(!r)return '';
 const tiles=(r.returns||r.disc||r.buys)?`<div class="sc">${r.returns?`<div><small>คืนสินค้า</small><b>${fm(r.returns)}</b></div>`:''}${r.disc?`<div><small>ส่วนลดที่ให้</small><b>${fm(r.disc)}</b></div>`:''}${r.buys?`<div><small>ซื้อของเข้า</small><b>${fm(r.buys)}</b></div>`:''}</div>`:'';
 const mx=Math.max(1,...(r.byCat||[]).map(c=>Math.abs(c.amt))),bc=r.byCat&&r.byCat.length>1||(r.byCat&&r.byCat.length===1)?`<section class="sec"><h3>ยอดขายตามหมวดหมู่</h3>${r.byCat.map(c=>`<div class="cbar"><div class="bt"><span>${esc(c.cat)}</span><b>${fm(c.amt)}</b></div><div class="bk"><i style="width:${Math.max(3,Math.round(Math.abs(c.amt)/mx*100))}%;--tc:${catColor(c.cat)}"></i></div><small>กำไร ${fm(c.profit)} · ${fm(c.qty)} ชิ้น</small></div>`).join('')}</section>`:'';
 const by=r.buyRows&&r.buyRows.length?`<section class="sec"><h3>ใบซื้อของเข้า (${r.buyRows.length})</h3><table class="t"><tr><th>วันที่</th><th>ผู้ขาย / เลขที่</th><th class="r">บาท</th></tr>${r.buyRows.map(b=>`<tr><td>${dthai(b.day)}</td><td>${esc(b.sup||'-')}${b.invoice?' · '+esc(b.invoice):''}</td><td class="r">${fm(b.total)}</td></tr>`).join('')}</table></section>`:'';
 return tiles+bc+by;
}

/* ----- สำรองข้อมูลทั้งหมด ----- */
async function backupDl(){
 try{toast('กำลังเตรียมไฟล์สำรอง…');const j=await api({action:'posBackup'}),blob=new Blob([JSON.stringify(j,null,1)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`สำรองข้อมูลร้านชำ-${today()}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);toast('ดาวน์โหลดไฟล์สำรองแล้ว ('+j.sales.length+' บิล, '+j.items.length+' สินค้า)')}
 catch(e){toast(e.message)}
}
