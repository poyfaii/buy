// report.js — หน้า "เอกสาร" (ทะเบียนเอกสารที่ออกแล้ว) และ "รายงาน" (ยอดขาย) ของแอดมิน
const rpMonth=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const rpNow=()=>rpMonth(new Date());
const rpPrev=()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return rpMonth(d)};
const rpThaiMon=m=>{if(!m)return'ทุกช่วงเวลา';const[y,n]=m.split('-');return['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][+n]+' '+(+y+543)};
const rpR2=n=>Math.round(n*100)/100;
const rpMoney=n=>Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const rpVat=g=>{const v=rpR2(g*VAT_RATE/(1+VAT_RATE));return{vat:v,before:rpR2(g-v)}};
// ดาวน์โหลดไฟล์ CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน) — กันเซลล์ที่ขึ้นต้นด้วย = + - @ ถูกตีความเป็นสูตร
function rpCsv(name,rows){
 const cell=c=>{let s=String(c==null?'':c);if(/^[=+\-@]/.test(s)&&isNaN(Number(s)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const blob=new Blob(['﻿'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
const rpChips=(cur,list,fn)=>`<div class="cats" role="group">${list.map(c=>`<button class="cat" aria-pressed="${cur===c[0]}" onclick="${fn}('${c[0]}')">${esc(c[1])}</button>`).join('')}</div>`;

/* ================= รายงานยอดขาย ================= */
let rp={mon:rpNow()};
function rpData(){
 const ship=(ords||[]).filter(o=>stText(o.status)===ST_SHIP&&(!rp.mon||String(o.shippedAt||'').slice(0,7)===rp.mon));
 let grand=0,incomplete=0,paid=0;const prod={},day={},lines=[];
 ship.forEach(o=>{
  let miss=false,og=0;const pdn=payText(o.payStatus)===ST_PAID;
  (o.items||[]).forEach(i=>{
   const ok=okN(i.price),amt=ok?rpR2(Number(i.price)*Number(i.qty)):0;
   if(!ok)miss=true;else{og+=amt;grand+=amt}
   const k=i.name,p=prod[k]||(prod[k]={name:i.name,amt:0,q:{},n:0});p.n++;if(ok)p.amt+=amt;const u=i.unit||'ชิ้น';p.q[u]=(p.q[u]||0)+(Number(i.qty)||0);
   lines.push([String(o.shippedAt||'').slice(0,10),o.orderId,o.name,i.name,i.label||'',i.qty,i.unit||'',ok?Number(i.price):'',ok?amt:'',pdn?'ชำระแล้ว':'รอชำระเงิน',pdn?(o.payMethod||''):'',pdn?(o.paidAt||''):'']);
  });
  if(miss)incomplete++;
  if(pdn)paid+=og;
  const dk=String(o.shippedAt||'').slice(rp.mon?0:0,rp.mon?10:7),d=day[dk]||(day[dk]={k:dk,n:0,amt:0});d.n++;d.amt+=og;
 });
 grand=rpR2(grand);paid=rpR2(paid);
 const unpaid=(ords||[]).filter(o=>stText(o.status)===ST_SHIP&&payText(o.payStatus)!==ST_PAID).map(o=>{const t=ordTotal(o);return{o,t}});
 return{ship,grand,paid,unpaid,incomplete,prod:Object.values(prod).sort((a,b)=>b.amt-a.amt),day:Object.values(day).sort((a,b)=>a.k<b.k?1:-1),lines,wait:(ords||[]).filter(o=>stText(o.status)===ST_WAIT).length};
}
function repView(){
 if(oerr)return `<div class="empty">${ic('info',44)}<p>${esc(oerr)}</p><button class="btn pri" onclick="loadOrders()">ลองใหม่</button></div>`;
 if(!ords)return `<div class="sk" style="aspect-ratio:auto;height:160px;margin-top:14px"></div>`;
 const r=rpData(),v=rpVat(r.grand);
 const kpi=(l,t,s)=>`<div class="kpi"><span>${l}</span><b>${t}</b>${s?`<small>${s}</small>`:''}</div>`;
 return `<div class="lhead"><h2 class="h2">รายงานยอดขาย</h2><button class="btn sm" onclick="loadOrders()">รีเฟรช</button></div>
 <section class="sec"><h3>ช่วงเวลา (นับตามวันที่จัดส่ง)</h3>
  ${rpChips(rp.mon===rpNow()?'now':rp.mon===rpPrev()?'prev':rp.mon===''?'all':'x',[['now','เดือนนี้'],['prev','เดือนก่อน'],['all','ทั้งหมด']],'rpSet')}
  <div class="fld" style="margin-top:10px"><label class="lbl" for="rp_m">เลือกเดือน</label><input id="rp_m" class="inp" type="month" value="${esc(rp.mon)}" onchange="rpSet(this.value||'all')"></div>
 </section>
 <div class="mu" style="margin:2px 2px 8px;font-weight:600">${esc(rpThaiMon(rp.mon))}</div>
 <div class="kpis">${kpi('ออเดอร์ที่จัดส่งแล้ว',r.ship.length+' ออเดอร์')}${kpi('ยอดขายรวม (รวมภาษี)',rpMoney(r.grand)+' บาท')}${kpi('มูลค่าก่อนภาษี',rpMoney(v.before)+' บาท')}${kpi('ภาษีมูลค่าเพิ่ม 7%',rpMoney(v.vat)+' บาท')}${kpi('รับชำระแล้ว',rpMoney(r.paid)+' บาท')}${kpi('ค้างชำระ (ช่วงนี้)',rpMoney(rpR2(r.grand-r.paid))+' บาท')}</div>
 ${r.incomplete?`<div class="note">${ic('info',18)}<span>มี ${r.incomplete} ออเดอร์ที่ราคาไม่ครบ ยอดไม่รวมรายการที่ไม่มีราคา (ใส่ราคาได้ที่ปุ่ม "จัดส่งแล้ว (ตกลงราคา)")</span></div>`:''}
 ${r.wait?`<p class="hint">ยังมี ${r.wait} ออเดอร์ที่รอจัดส่ง (ยังไม่นับเป็นยอดขาย)</p>`:''}
 <section class="sec"><h3>ออเดอร์ที่จัดส่งแล้วแต่ค้างชำระ (ทุกช่วงเวลา) <span class="mu">(${r.unpaid.length})</span></h3>${r.unpaid.length?r.unpaid.map(x=>`<div class="sumrow"><div><b>${esc(x.o.name)}</b><div class="mu">${esc(x.o.orderId)} · ส่ง ${esc(String(x.o.shippedAt||'').slice(0,10))} · ${esc(x.o.phone)}</div></div><b>${x.t==null?'-':rpMoney(x.t)+' บาท'}</b></div>`).join(''):'<p class="mu">ไม่มีออเดอร์ค้างชำระ</p>'}</section>
 <section class="sec"><h3>ยอดขายแยกตามสินค้า</h3>${r.prod.length?`<table class="ctab"><thead><tr><th>สินค้า</th><th class="n">จำนวน</th><th class="n">ยอด (บาท)</th></tr></thead><tbody>${r.prod.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td class="n">${Object.keys(p.q).map(u=>p.q[u]+' '+esc(u)).join('<br>')}</td><td class="n">${rpMoney(p.amt)}</td></tr>`).join('')}</tbody></table>`:'<p class="mu">ยังไม่มีออเดอร์ที่จัดส่งในช่วงนี้</p>'}</section>
 <section class="sec"><h3>${rp.mon?'ยอดขายรายวัน':'ยอดขายรายเดือน'}</h3>${r.day.length?`<table class="ctab"><thead><tr><th>${rp.mon?'วันที่':'เดือน'}</th><th class="n">ออเดอร์</th><th class="n">ยอด (บาท)</th></tr></thead><tbody>${r.day.map(d=>`<tr><td>${esc(d.k||'-')}</td><td class="n">${d.n}</td><td class="n">${rpMoney(d.amt)}</td></tr>`).join('')}</tbody></table>`:'<p class="mu">-</p>'}</section>
 ${ords.length>=200?'<p class="hint">รายงานนี้ใช้คำสั่งซื้อล่าสุด 200 รายการ ถ้าต้องการย้อนหลังนานกว่านี้ให้ดูในแท็บ Orders ของชีต</p>':''}
 <div class="stack"><button class="btn pri lg" onclick="rpExport()"${r.lines.length?'':' disabled'}>ส่งออกรายการขาย (CSV / Excel)</button></div>
 <p class="hint">ยอดภาษีคำนวณจากยอดรวมทั้งช่วง (ราคาในระบบรวมภาษีแล้ว) อาจต่างจากผลรวมใบกำกับภาษีรายใบไม่เกินเศษสตางค์ ควรให้นักบัญชีตรวจก่อนยื่นภาษี</p>`;
}
function rpSet(k){rp.mon=k==='now'?rpNow():k==='prev'?rpPrev():k==='all'?'':k;render()}
function rpExport(){
 const r=rpData();
 rpCsv(`ยอดขาย-${rp.mon||'ทั้งหมด'}.csv`,[['วันที่จัดส่ง','เลขที่คำสั่งซื้อ','ลูกค้า','สินค้า','ขนาด','จำนวน','หน่วย','ราคา/หน่วย (รวมภาษี)','รวมเงิน (รวมภาษี)','การชำระเงิน','วิธีชำระ','วันที่รับเงิน']].concat(r.lines));
}

/* ================= ทะเบียนเอกสาร ================= */
let dv={type:'all',st:'active',q:'',mon:'',list:null,err:''};
const DV_ORDER=['taxfull','taxabb','receipt','quote','delivery']; // ใบกำกับภาษีขึ้นก่อน
const dvShort={taxfull:'ใบกำกับภาษีเต็มรูป',taxabb:'ใบกำกับภาษีอย่างย่อ',receipt:'ใบเสร็จรับเงิน',quote:'ใบประมาณการ',delivery:'ใบส่งสินค้า'};
async function loadDocList(){
 dv.err='';dv.list=null;render();
 try{
  const [l]=await Promise.all([Service.listDocs(''),ords?null:Service.listOrders().then(x=>{ords=x}).catch(()=>{})]);
  dv.list=l;
 }catch(e){if(e.message==='unauthorized'){logout();return}dv.err=friendly(e.message)||'โหลดทะเบียนเอกสารไม่ได้'}
 if(aview==='dreg')render();
}
// ข้อมูลที่ใช้แสดง/ส่งออกของแต่ละใบ
function dvInfo(x){
 const s=x.snapshot||{},b=s.buyer||{},o=(ords||[]).find(q=>q.orderId===x.orderId);
 const T0=DOC_TYPES[x.type]||{},L=s.lines||[],pr=(T0.price||s.showPrice)&&L.length&&L.every(l=>okN(l.price)); // ใบประมาณการ/ใบส่งสินค้าที่ไม่แสดงราคา ไม่มียอด
 const g=pr?rpR2(L.reduce((t,l)=>t+Number(l.price)*Number(l.qty),0)):null;
 const vt=DOC_TYPES[x.type]&&DOC_TYPES[x.type].vat;
 const v=g==null?null:vt?rpVat(g):{vat:0,before:g};
 return{who:b.name||(o&&o.name)||'',taxId:b.taxId||'',date:s.date||String(x.issuedAt||'').slice(0,10),grand:g,v};
}
function dvFiltered(){
 const q=T(dv.q).toLowerCase();
 return(dv.list||[]).filter(x=>{
  if(dv.type!=='all'&&x.type!==dv.type)return false;
  if(dv.st==='active'&&x.status==='ยกเลิก')return false;
  if(dv.st==='void'&&x.status!=='ยกเลิก')return false;
  if(dv.mon&&String(x.issuedAt||'').slice(0,7)!==dv.mon)return false;
  if(q){const i=dvInfo(x);if(!(x.no+' '+x.orderId+' '+i.who).toLowerCase().includes(q))return false}
  return true;
 });
}
function dregView(){
 if(dv.err)return `<div class="empty">${ic('info',44)}<p>${esc(dv.err)}</p><button class="btn pri" onclick="loadDocList()">ลองใหม่</button></div>`;
 if(!dv.list)return `<div class="sk" style="aspect-ratio:auto;height:160px;margin-top:14px"></div>`;
 const l=dvFiltered(),act=l.filter(x=>x.status!=='ยกเลิก').length;
 const sections=DV_ORDER.filter(k=>dv.type==='all'||dv.type===k).map(k=>{
  const rows=l.filter(x=>x.type===k);if(!rows.length)return'';
  return `<section class="sec dsec"><h3>${esc(dvShort[k])} <span class="mu">(${rows.length})</span></h3>${rows.map(x=>{
   const i=dvInfo(x),vd=x.status==='ยกเลิก';
   return `<div class="drow2${vd?' void':''}"><div class="dmain"><b>${esc(x.no)}</b>${vd?'<span class="stb wait">ยกเลิก</span>':''}<div class="mu">${esc(i.who||'-')} · ${esc(i.date)} · ${esc(x.orderId)}</div>${vd&&x.reason?`<div class="mu">เหตุผล: ${esc(x.reason)}</div>`:''}</div>
   <div class="damt">${i.grand!=null?rpMoney(i.grand)+' บาท':'<span class="mu">-</span>'}</div>
   <div class="dact"><button class="btn sm" onclick="dvOpen('${esc(x.no)}')">เปิดดู</button>${vd?'':`<button class="btn sm" onclick="dvVoid('${esc(x.no)}')">ยกเลิกเลขนี้</button>`}</div></div>`}).join('')}</section>`;
 }).join('');
 return `<div class="lhead"><h2 class="h2">ทะเบียนเอกสาร</h2><button class="btn sm" onclick="loadDocList()">รีเฟรช</button></div>
 <p class="mu" style="margin:2px 0 10px">เอกสารทุกใบที่ออกผ่านระบบ แยกตามประเภท เลขที่ที่ยกเลิกยังอยู่ในทะเบียน</p>
 <div class="search">${ic('search')}<input class="inp" type="search" autocomplete="off" aria-label="ค้นหาเอกสาร" placeholder="ค้นหาเลขที่ / ชื่อลูกค้า / เลขคำสั่งซื้อ" value="${esc(dv.q)}" oninput="dv.q=this.value;dvRows()"></div>
 <div class="mu fl">ประเภท</div>${rpChips(dv.type,[['all','ทั้งหมด']].concat(DV_ORDER.map(k=>[k,dvShort[k]])),'dvSet.bind(null,\'type\')')}
 <div class="mu fl">สถานะ</div>${rpChips(dv.st,[['active','ใช้งาน'],['void','ยกเลิก'],['all','ทั้งหมด']],'dvSet.bind(null,\'st\')')}
 <div class="fld" style="margin-top:8px"><label class="lbl" for="dv_m">เดือนที่ออก (เว้นว่าง = ทั้งหมด)</label><input id="dv_m" class="inp" type="month" value="${esc(dv.mon)}" onchange="dv.mon=this.value;render()"></div>
 <div class="gmeta">พบ ${l.length} ใบ · ใช้งาน ${act} · ยกเลิก ${l.length-act}${(dv.list||[]).length>=300?' · แสดงล่าสุด 300 ใบ':''}</div>
 <div id="dvrows">${sections||'<div class="empty"><p>ไม่พบเอกสารตามตัวกรอง</p></div>'}</div>
 <div class="stack"><button class="btn pri lg" onclick="dvExport()"${l.length?'':' disabled'}>ส่งออกทะเบียน (CSV / Excel)</button></div>`;
}
const dvSet=(k,v)=>{dv[k]=v;render()};
function dvRows(){ // พิมพ์ค้นหาแล้วอัปเดตเฉพาะรายการ ไม่ให้ช่องค้นหาเสียโฟกัส
 const y=scrollY;const f=document.activeElement&&document.activeElement.type==='search';
 const tmp=document.createElement('div');tmp.innerHTML=dregView();
 const n=tmp.querySelector('#dvrows'),m=tmp.querySelector('.gmeta'),oN=$('#dvrows'),oM=document.querySelector('.gmeta');
 if(n&&oN)oN.innerHTML=n.innerHTML;if(m&&oM)oM.innerHTML=m.innerHTML;scrollTo(0,y);
}
async function dvOpen(no){
 const x=(dv.list||[]).find(q=>q.no===no);if(!x)return;
 toast('กำลังเปิดเอกสาร…',20000);
 try{
  const l=await Service.listDocs(x.orderId),y=l.find(q=>q.no===no);
  if(y&&y.snapshot){toast('พร้อมแล้ว',500);openDoc(docHtml(y.snapshot));return}
  toast('ใบนี้ออกไว้ก่อนมีระบบเก็บเนื้อหา เปิดจากหน้าคำสั่งซื้อ > ออกเอกสาร แล้วระบบจะเก็บให้',6000);
 }catch(e){toast('เปิดไม่สำเร็จ: '+friendly(e.message),6000)}
}
async function dvVoid(no){
 const why=prompt('ยกเลิกเลขที่ '+no+'\nเลขจะยังอยู่ในทะเบียนเป็น "ยกเลิก" ไม่ถูกลบและไม่ถูกนำกลับมาใช้ ใส่เหตุผล (ไม่บังคับ):');
 if(why===null)return;
 try{await Service.voidDoc(no,why);toast('ยกเลิกเลขที่ '+no+' แล้ว');await loadDocList()}
 catch(e){toast('ยกเลิกไม่สำเร็จ: '+friendly(e.message),6000)}
}
function dvExport(){
 const rows=dvFiltered().slice().sort((a,b)=>a.no<b.no?-1:1).map(x=>{const i=dvInfo(x),vd=x.status==='ยกเลิก';
  return[x.no,dvShort[x.type]||x.type,i.date,x.orderId,i.who,i.taxId,vd?0:i.v?i.v.before:'',vd?0:i.v?i.v.vat:'',vd?0:i.grand==null?'':i.grand,x.status,x.reason||'']});
 rpCsv(`ทะเบียนเอกสาร${dv.mon?'-'+dv.mon:''}.csv`,[['เลขที่เอกสาร','ประเภท','วันที่เอกสาร','เลขที่คำสั่งซื้อ','ลูกค้า','เลขประจำตัวผู้เสียภาษีลูกค้า','มูลค่าก่อนภาษี','ภาษีมูลค่าเพิ่ม','รวมทั้งสิ้น','สถานะ','เหตุผลยกเลิก']].concat(rows));
}
