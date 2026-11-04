/* บัญชีร้าน: ลูกหนี้ (ขายเชื่อ) · รายจ่าย · ปิดยอดสิ้นวัน · บาร์โค้ดลัง/แพ็ก */
const custName=id=>(custs.find(c=>c.id===id)||{}).name||'';
const BTNS=(a,b)=>`<div class="acts2"><button class="btn pri lg" id="okb" onclick="${a}">${b}</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`;
async function refreshCusts(){try{const j=await api({action:'posInit'});custs=j.custs||[];packs=j.packs||[]}catch(e){}}

/* ----- ขายเชื่อ ----- */
let credSel='',credQ='';
function payCredit(){
 if(!cart.length)return;cid=newCid();credSel='';credQ='';
 dlg(`<h3>ติดไว้ (ขายเชื่อ)</h3><div class="big">${fm(total())}</div><p class="sub" style="text-align:center">เลือกลูกค้าที่ติดเงิน ระบบจะจดยอดค้างไว้ในเมนู บัญชี → ลูกหนี้</p>
 <input id="cq" class="inp" placeholder="ค้นหาชื่อ / เบอร์" oninput="credQ=this.value;credList()">
 <div id="clist" class="lbrows"></div>
 <details class="newc"><summary>+ ลูกค้าใหม่</summary><div class="row2"><label class="fld"><span class="lbl">ชื่อ</span><input id="nc_n" class="inp"></label><label class="fld"><span class="lbl">เบอร์โทร (ไม่บังคับ)</span><input id="nc_p" class="inp" inputmode="tel"></label></div><button class="btn" onclick="credNew()">เพิ่มและเลือก</button></details>
 <div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button id="okb" class="btn pri lg" onclick="credGo()" disabled>เลือกลูกค้าก่อน</button><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`);
 credList();
}
function credList(){
 const t=credQ.trim().toLowerCase(),l=custs.filter(c=>!t||c.name.toLowerCase().includes(t)||(c.phone||'').includes(t));
 $('#clist').innerHTML=l.length?l.map(c=>`<label class="lbr"><input type="radio" name="cc" ${credSel===c.id?'checked':''} onchange="credPick('${c.id}')"> <span>${esc(c.name)} <small>${c.phone?esc(c.phone)+' · ':''}${c.bal>0.004?'ค้างอยู่ '+fm(c.bal)+' บาท':'ไม่มียอดค้าง'}</small></span></label>`).join(''):'<div class="empty2">ยังไม่มีลูกค้า — กด “+ ลูกค้าใหม่”</div>';
}
function credPick(id){credSel=id;const b=$('#okb');b.disabled=false;b.textContent='บันทึกติดไว้ — '+custName(id)}
async function credNew(){
 const n=$('#nc_n').value.trim();if(!n){$('#perr').textContent='กรุณากรอกชื่อลูกค้า';return}
 try{const j=await api({action:'posCustSave',cust:{name:n,phone:$('#nc_p').value.trim()}});custs=j.custs;credPick(j.id);credList();$('#perr').textContent=''}catch(e){$('#perr').textContent=e.message}
}
function credGo(){if(credSel)submitSale('credit',undefined,credSel)}

/* ----- โครงหน้า บัญชี ----- */
let accTab='debt',expD=null,expRng='month',clsD=null,clsDay='';
function accView(){
 const chip=(k,t)=>`<button class="cat" aria-pressed="${accTab===k}" onclick="accTab='${k}';accLoad()">${t}</button>`;
 return `<div class="lhead"><h2 class="h2">บัญชีร้าน</h2></div><div class="chips">${chip('debt','ลูกหนี้')}${chip('exp','รายจ่าย')}${chip('close','ปิดยอดสิ้นวัน')}</div><div id="accv">${accBody()}</div>`;
}
const accBody=()=>accTab==='debt'?debtView():accTab==='exp'?expView():closeView();
async function accLoad(){
 render();
 try{
  if(accTab==='debt')await refreshCusts();
  else if(accTab==='exp'){const t=today();expD=await api({action:'posExpList',from:expRng==='today'?t:t.slice(0,7)+'-01',to:t})}
  else clsD=await api({action:'posCloseGet',day:clsDay||today()});
  if(view==='acc')repaintAcc()
 }catch(e){toast(e.message)}
}
function repaintAcc(){const e=$('#accv');if(e){e.innerHTML=accBody();if(accTab==='close'&&clsD&&$('#k_f'))clsCalc()}}

/* ----- ลูกหนี้ ----- */
function debtView(){
 const owed=custs.filter(c=>c.bal>0.004),sum=r2(owed.reduce((t,c)=>t+c.bal,0));
 return `<div class="sc"><div><small>ลูกหนี้ค้างรวม</small><b style="color:${sum?'#c0261a':'inherit'}">${fm(sum)}</b></div><div><small>ลูกค้าที่ค้าง</small><b>${fm(owed.length)} ราย</b></div></div>
 <div class="chips"><button class="btn pri" onclick="custDlg('')">+ เพิ่มลูกค้า</button></div>
 ${custs.length?custs.slice().sort((a,b)=>b.bal-a.bal||a.name.localeCompare(b.name,'th')).map(c=>`<div class="it"><b>${esc(c.name)}</b><div class="stk${c.bal>0.004?' low':''}">${fm(c.bal)}<small>บาท</small></div><div class="meta">${c.phone?esc(c.phone)+' · ':''}${c.last?'ล่าสุด '+dthai(c.last):'ยังไม่มีรายการ'}${c.note?' · '+esc(c.note):''}</div><div class="acts">${c.bal>0.004?`<button class="btn pri" onclick="payDebtDlg('${c.id}')">รับชำระ</button>`:''}<button class="btn" onclick="debtLog('${c.id}')">ประวัติ</button><button class="btn" onclick="custDlg('${c.id}')">แก้ไข</button></div></div>`).join(''):'<div class="empty2">ยังไม่มีลูกค้าติดเงิน — เวลาขายกดปุ่ม “ติดไว้” ได้เลย</div>'}`;
}
function custDlg(id){
 const c=id?custs.find(x=>x.id===id):{name:'',phone:'',note:''};
 dlg(`<h3>${id?'แก้ไขลูกค้า':'เพิ่มลูกค้า'}</h3><label class="fld"><span class="lbl">ชื่อ <span class="req">*</span></span><input id="c_n" class="inp" value="${esc(c.name)}"></label>
 <label class="fld"><span class="lbl">เบอร์โทร</span><input id="c_p" class="inp" inputmode="tel" value="${esc(c.phone||'')}"></label><label class="fld"><span class="lbl">หมายเหตุ</span><input id="c_o" class="inp" value="${esc(c.note||'')}"></label><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="custSave('${id}')">บันทึก</button>${id?`<button class="btn dng" onclick="custDel('${id}')">ลบลูกค้า</button>`:''}<button class="btn" onclick="closeDlg()">ปิด</button></div>`,'c_n');
}
async function custSave(id){try{const j=await api({action:'posCustSave',cust:{id:id||undefined,name:$('#c_n').value,phone:$('#c_p').value,note:$('#c_o').value}});custs=j.custs;closeDlg(true);repaintAcc();toast('บันทึกลูกค้าแล้ว')}catch(e){$('#perr').textContent=e.message}}
async function custDel(id){if(!confirm('ลบลูกค้านี้?'))return;try{const j=await api({action:'posCustDelete',id});custs=j.custs;closeDlg(true);repaintAcc();toast('ลบแล้ว')}catch(e){$('#perr').textContent=e.message}}
function payDebtDlg(id){
 const c=custs.find(x=>x.id===id);
 dlg(`<h3>รับชำระหนี้</h3><p class="sub">${esc(c.name)} · ค้างอยู่ <b>${fm(c.bal)}</b> บาท</p>
 <label class="fld"><span class="lbl">จำนวนเงินที่รับ</span><input id="d_a" class="inp" inputmode="decimal" value="${c.bal}" style="font-size:24px;font-weight:700;text-align:center" onkeydown="if(event.key==='Enter')debtPay('${id}')"></label>
 <div class="quick"><button onclick="$('#d_a').value=${c.bal}">ทั้งหมด</button>${[100,500,1000].filter(v=>v<c.bal).map(v=>`<button onclick="$('#d_a').value=${v}">${fm(v)}</button>`).join('')}</div>
 <label class="fld"><span class="lbl">รับเป็น</span><select id="d_m" class="inp"><option value="cash">เงินสด</option><option value="transfer">โอน</option></select></label><div id="perr" class="err" role="alert"></div>${BTNS(`debtPay('${id}')`,'บันทึกรับชำระ')}`,'d_a');
}
async function debtPay(id){if(busy)return;busy=true;try{const j=await api({action:'posDebtPay',custId:id,amount:Number($('#d_a').value),method:$('#d_m').value});custs=j.custs;busy=false;closeDlg(true);repaintAcc();toast('บันทึกรับชำระแล้ว')}catch(e){busy=false;$('#perr').textContent=e.message}}
async function debtLog(id){
 try{const j=await api({action:'posDebtLog',id}),k={charge:'ติดไว้',pay:'ชำระ'};
  dlg(`<h3>${esc(j.cust.name)}</h3><p class="sub">ยอดค้างตอนนี้ <b>${fm(j.cust.bal)}</b> บาท</p><div class="lbrows" style="max-height:340px"><table class="t"><tr><th>วันที่</th><th>รายการ</th><th class="r">บาท</th></tr>${j.rows.map(r=>`<tr><td>${esc(tthai(r.at))}</td><td>${r.kind==='pay'?'ชำระ'+(r.method==='transfer'?' (โอน)':' (เงินสด)'):(r.amount<0?'ยกเลิกบิล ':'ติดไว้ ')+esc(r.saleNo||'')}${r.note&&r.kind==='pay'?' · '+esc(r.note):''}</td><td class="r" style="color:${r.kind==='pay'||r.amount<0?'#1a7a3a':'#c0261a'}">${r.kind==='pay'?'−':'+'}${fm(Math.abs(r.amount))}</td></tr>`).join('')}</table></div><div class="acts2"><button class="btn" onclick="closeDlg()">ปิด</button></div>`)
 }catch(e){toast(e.message)}
}

/* ----- รายจ่าย ----- */
function expView(){
 const d=expD,chip=(k,t)=>`<button class="cat" aria-pressed="${expRng===k}" onclick="expRng='${k}';accLoad()">${t}</button>`,cats=(d&&d.cats)||['ค่าไฟ','ค่าน้ำ','ค่าเช่า','ค่าขนส่ง','ค่าแรง','ค่าบรรจุภัณฑ์','อื่นๆ'];
 return `<section class="sec"><h3>บันทึกรายจ่าย</h3><p class="sub">ค่าไฟ ค่าเช่า ค่าขนส่ง ฯลฯ — ไม่นับค่าซื้อสินค้า (ต้นทุนสินค้าคิดอยู่แล้ว) ระบบจะหักออกเป็นกำไรสุทธิในรายงาน</p>
 <div class="row2"><label class="fld"><span class="lbl">หมวด</span><select id="e_c" class="inp">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label class="fld"><span class="lbl">จำนวนเงิน</span><input id="e_a" class="inp" inputmode="decimal" onkeydown="if(event.key==='Enter')expAdd()"></label></div>
 <div class="row2"><label class="fld"><span class="lbl">จ่ายด้วย</span><select id="e_m" class="inp"><option value="cash">เงินสดจากลิ้นชัก</option><option value="transfer">โอน / เงินส่วนตัว</option></select></label><label class="fld"><span class="lbl">วันที่</span><input id="e_d" type="date" class="inp" value="${today()}"></label></div>
 <label class="fld"><span class="lbl">หมายเหตุ</span><input id="e_n" class="inp" placeholder="ไม่บังคับ" onkeydown="if(event.key==='Enter')expAdd()"></label><div id="perr" class="err" role="alert"></div><button class="btn pri" onclick="expAdd()">+ บันทึกรายจ่าย</button></section>
 <div class="chips">${chip('today','วันนี้')}${chip('month','เดือนนี้')}</div>
 ${!d?'<div class="empty2">กำลังโหลด…</div>':`<div class="sc"><div><small>รายจ่ายรวม</small><b>${fm(d.total)}</b></div>${Object.entries(d.by).map(([k,v])=>`<div><small>${esc(k)}</small><b>${fm(v)}</b></div>`).join('')}</div>
 ${d.rows.length?`<table class="t"><tr><th>วันที่</th><th>รายการ</th><th class="r">บาท</th><th></th></tr>${d.rows.map(r=>`<tr><td>${dthai(r.day)}</td><td>${esc(r.cat)}${r.note?' · '+esc(r.note):''} <small>${r.method==='cash'?'เงินสด':'โอน'}</small></td><td class="r">${fm(r.amount)}</td><td><button class="iconbtn" aria-label="ลบ" onclick="expDel(${r.id})">✕</button></td></tr>`).join('')}</table>`:'<div class="empty2">ยังไม่มีรายจ่ายในช่วงนี้</div>'}`}`;
}
async function expAdd(){
 const a=Number($('#e_a').value);if(!(a>0)){$('#perr').textContent='กรุณาใส่จำนวนเงิน';return}
 const t=today();try{expD=await api({action:'posExpAdd',cat:$('#e_c').value,amount:a,method:$('#e_m').value,day:$('#e_d').value,note:$('#e_n').value,from:expRng==='today'?t:t.slice(0,7)+'-01',to:t});report=null;repaintAcc();toast('บันทึกรายจ่ายแล้ว')}catch(e){$('#perr').textContent=e.message}
}
async function expDel(id){if(!confirm('ลบรายจ่ายนี้?'))return;const t=today();try{expD=await api({action:'posExpDel',id,from:expRng==='today'?t:t.slice(0,7)+'-01',to:t});report=null;repaintAcc();toast('ลบแล้ว')}catch(e){toast(e.message)}}

/* ----- ปิดยอดสิ้นวัน ----- */
function closeView(){
 const d=clsD;if(!d)return '<div class="empty2">กำลังโหลด…</div>';
 const c=d.calc,rec=d.rec,prev=(d.history||[]).find(h=>h.day<d.day),fl=rec?rec.float:(prev?prev.counted:0);
 return `<section class="sec"><h3>ปิดยอด ${dthai(d.day)}</h3><label class="fld"><span class="lbl">วันที่</span><input type="date" class="inp" value="${d.day}" onchange="clsDay=this.value;accLoad()"></label>
 <table class="t"><tr><td>เงินทอนตั้งต้นในลิ้นชัก</td><td class="r"><input id="k_f" class="inp" style="width:110px;text-align:right" inputmode="decimal" value="${fl}" oninput="clsCalc()"></td></tr>
 <tr><td>+ ขายเงินสด</td><td class="r">${fm(c.cashSales)}</td></tr><tr><td>+ รับชำระหนี้เป็นเงินสด</td><td class="r">${fm(c.debtCash)}</td></tr><tr><td>− รายจ่ายเงินสด</td><td class="r">${fm(c.expCash)}</td></tr>
 <tr><td><b>ควรมีเงินในลิ้นชัก</b></td><td class="r"><b id="k_e">0</b></td></tr></table>
 <label class="fld"><span class="lbl">นับเงินในลิ้นชักได้จริง</span><input id="k_c" class="inp" inputmode="decimal" style="font-size:24px;font-weight:700;text-align:center" value="${rec?rec.counted:''}" oninput="clsCalc()"></label>
 <div id="k_d" class="chg"><small>ส่วนต่าง</small><b>—</b></div>
 <label class="fld"><span class="lbl">หมายเหตุ</span><input id="k_n" class="inp" value="${esc(rec?rec.note:'')}" placeholder="เช่น ทอนผิด / ลืมคีย์บิล"></label><div id="perr" class="err" role="alert"></div>
 <button class="btn pri lg" onclick="clsSave()">${rec?'บันทึกทับยอดปิด':'บันทึกปิดยอด'}</button><p class="sub" style="margin-top:8px">ยอดโอนและขายเชื่อไม่รวมในลิ้นชัก</p></section>
 ${d.history&&d.history.length?`<section class="sec"><h3>ประวัติปิดยอด</h3><table class="t"><tr><th>วันที่</th><th class="r">ควรมี</th><th class="r">นับได้</th><th class="r">ส่วนต่าง</th></tr>${d.history.map(h=>`<tr><td>${dthai(h.day)}</td><td class="r">${fm(h.expected)}</td><td class="r">${fm(h.counted)}</td><td class="r" style="color:${Math.abs(h.diff)<.005?'#1a7a3a':'#c0261a'};font-weight:700">${h.diff>0?'+':''}${fm(h.diff)}</td></tr>`).join('')}</table></section>`:''}`;
}
function clsCalc(){
 const c=clsD.calc,f=Number($('#k_f').value)||0,e=r2(f+c.cashSales+c.debtCash-c.expCash);$('#k_e').textContent=fm(e);
 const cv=$('#k_c').value.trim(),o=$('#k_d');if(cv===''){o.innerHTML='<small>ส่วนต่าง</small><b>—</b>';return}
 const df=r2(Number(cv)-e);o.innerHTML=`<small>${Math.abs(df)<.005?'ตรงพอดี':df>0?'เงินเกิน':'เงินขาด'}</small><b style="color:${Math.abs(df)<.005?'#1a7a3a':'#c0261a'}">${df>0?'+':''}${fm(df)}</b>`;
}
async function clsSave(){
 const cv=$('#k_c').value.trim();if(cv===''||!isFinite(Number(cv))){$('#perr').textContent='กรุณาใส่ยอดเงินที่นับได้';return}
 try{clsD=await api({action:'posCloseSave',day:clsD.day,float:Number($('#k_f').value)||0,counted:Number(cv),note:$('#k_n').value});repaintAcc();clsCalc();toast('บันทึกปิดยอดแล้ว')}catch(e){$('#perr').textContent=e.message}
}
/* ----- บาร์โค้ดลัง/แพ็ก ----- */
function packDlg(id){
 const it=find(id),l=packs.filter(p=>p.itemId===id);
 dlg(`<h3>บาร์โค้ดลัง / แพ็ก</h3><p class="sub">${esc(it.name)} — ผูกบาร์โค้ดของลังหรือแพ็กเข้ากับสินค้านี้ ตอนขายยิงแล้วเพิ่มตามจำนวนชิ้นในลัง ตอนรับของ (เมนู สินค้า/สต๊อก ช่องค้นหา) ยิงแล้วเปิดหน้ารับเข้าพร้อมจำนวนให้เลย</p>
 ${l.length?`<table class="t">${l.map(p=>`<tr><td>${esc(p.barcode)}${p.label?' · '+esc(p.label):''}</td><td class="r">${fm(p.qty)} ชิ้น</td><td><button class="iconbtn" aria-label="ลบ" onclick="packDel('${esc(p.barcode)}','${id}')">✕</button></td></tr>`).join('')}</table>`:''}
 <label class="fld"><span class="lbl">บาร์โค้ดลัง/แพ็ก (ยิงใส่ช่องนี้ได้เลย)</span><input id="p_b" class="inp" inputmode="numeric" onkeydown="if(event.key==='Enter'){event.preventDefault();$('#p_q').focus()}"></label>
 <div class="row2"><label class="fld"><span class="lbl">ในลังมีกี่ชิ้น</span><input id="p_q" class="inp" inputmode="decimal" placeholder="เช่น 12" onkeydown="if(event.key==='Enter')packSave('${id}')"></label><label class="fld"><span class="lbl">ชื่อเรียก</span><input id="p_l" class="inp" placeholder="ลัง / แพ็ก"></label></div><div id="perr" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" onclick="packSave('${id}')">เพิ่มบาร์โค้ดลัง</button><button class="btn" onclick="editItemDlg('${id}')">กลับ</button></div>`,'p_b');
}
async function packSave(id){try{const j=await api({action:'posPackSave',barcode:$('#p_b').value,itemId:id,qty:Number($('#p_q').value),label:$('#p_l').value});packs=j.packs;packDlg(id);toast('ผูกบาร์โค้ดลังแล้ว')}catch(e){$('#perr').textContent=e.message}}
async function packDel(bc,id){try{const j=await api({action:'posPackDelete',barcode:bc});packs=j.packs;packDlg(id)}catch(e){toast(e.message)}}
