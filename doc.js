// doc.js — ข้อมูลบริษัท และตัวสร้างเอกสาร (ใบสั่งซื้อ / ใบแจ้งหนี้ / ใบกำกับภาษี) ใช้ร่วมกันทั้งหน้าร้านและหน้าแอดมิน
// แก้ข้อมูลบริษัทได้ที่ COMPANY ด้านล่างที่เดียว
const COMPANY={
 name:'บริษัท แม่ดอนรุ่งเรือง ฟู้ดส์ จำกัด',
 branch:'สำนักงานใหญ่',
 addr:'306 หมู่ที่ 7 ต.หนองตูม อ.กงไกรลาศ จ.สุโขทัย 64170',
 taxId:'0645569000024',
 tel:'0913830459'
};
const VAT_RATE=0.07; // ภาษีมูลค่าเพิ่ม 7% — ราคาสินค้าทุกรายการ "รวมภาษีแล้ว" ระบบถอด VAT ออกจากยอดรวมให้
const DOC_TYPES={
 quote:{k:'quote',t:'ใบประมาณการราคา',s:'เอกสารประกอบการสั่งซื้อ (มิใช่ใบกำกับภาษี)',pre:'QT',price:false,vat:false,sg:['ผู้สั่งซื้อ','ผู้เสนอราคา'],d:'ให้ลูกค้าดูรายการก่อนตกลงราคา (ไม่แสดงราคา เว้นแต่ติ๊กให้แสดง)'},
 delivery:{k:'delivery',t:'ใบส่งสินค้า',s:'ต้นฉบับ (เอกสารออกเป็นชุด)',pre:'DN',price:false,vat:false,sg:['ผู้รับสินค้า','ผู้ส่งสินค้า'],d:'แนบไปกับสินค้า ใช้ตรวจรับของ (ไม่แสดงราคา)'},
 receipt:{k:'receipt',t:'ใบเสร็จรับเงิน',s:'ต้นฉบับ (เอกสารออกเป็นชุด)',pre:'RC',price:true,vat:true,sg:['ผู้ชำระเงิน','ผู้รับเงิน'],d:'ลูกค้าไม่ต้องการใบกำกับภาษีเต็มรูปแบบ'},
 taxfull:{k:'taxfull',t:'ใบเสร็จรับเงิน / ใบกำกับภาษี',s:'ต้นฉบับ (เอกสารออกเป็นชุด)',pre:'INV',price:true,vat:true,buyerTax:true,sg:['ผู้รับสินค้า / บริการ','ผู้รับเงิน'],d:'ลูกค้าขอใบกำกับภาษีเต็มรูปแบบ (ต้องมีชื่อ ที่อยู่ เลขผู้เสียภาษีของลูกค้า)'},
 taxabb:{k:'taxabb',t:'ใบกำกับภาษีอย่างย่อ',s:'ต้นฉบับ',pre:'ABB',price:true,vat:true,sg:['ผู้รับสินค้า','ผู้รับเงิน'],d:'ออกอัตโนมัติให้ทุกออเดอร์ เมื่อตกลงราคาและจัดส่งแล้ว'}
};
const DOC_ORDER=['quote','delivery','receipt','taxfull','taxabb'];
// เลขที่เอกสารที่ผูกกับเลขคำสั่งซื้อ (ซ้ำกันไม่ได้) เช่น ABB261010J5T3
const docNoFor=(pre,oid)=>pre+String(oid||'').replace(/^MD-?/i,'').replace(/[^A-Za-z0-9]/g,'');
// จำนวนเงินเป็นตัวอักษรไทย
function thaiBaht(n){
 n=Math.round(Number(n)*100)/100;if(!isFinite(n)||n<0)return'';
 const d=['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'],u=['','สิบ','ร้อย','พัน','หมื่น','แสน'];
 const grp=s=>{let r='';const L=s.length;for(let i=0;i<L;i++){const c=+s[i],p=L-i-1;if(!c)continue;
  if(p===0&&c===1&&L>1)r+='เอ็ด';else if(p===1&&c===2)r+='ยี่';else if(p===1&&c===1){}else r+=d[c];r+=u[p]}return r};
 const words=i=>{if(i===0)return d[0];let s=String(i),parts=[];while(s.length){parts.unshift(s.slice(-6));s=s.slice(0,-6)}
  return parts.map((p,k)=>{const t=p.replace(/^0+/,'');return t?grp(p.length>t.length&&k>0?p:t)+(k<parts.length-1?'ล้าน':''):(k<parts.length-1?'ล้าน':'')}).join('')};
 const b=Math.floor(n),st=Math.round((n-b)*100);
 return words(b)+'บาท'+(st?words(st)+'สตางค์':'ถ้วน');
}
const fmt2=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const dmy=(t)=>{const x=t instanceof Date?t:new Date();const p=n=>String(n).padStart(2,'0');return `${p(x.getDate())}/${p(x.getMonth()+1)}/${x.getFullYear()}`};
const dcEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* สร้าง HTML เอกสาร
 o={type,no,date,due,seller,buyer:{name,addr,taxId,tel},lines:[{name,label,qty,unit,price}],note,showPrice,stamp,unknownMark}
 เอกสารที่ไม่แสดงราคา (ใบประมาณการ/ใบส่งสินค้า) ตัดคอลัมน์ราคาและยอดรวมออก
 ราคา (price) ว่าง/ไม่ใช่ตัวเลข = ยังไม่กำหนด: แสดง unknownMark และไม่คิดยอดรวม ราคาทุกรายการถือเป็นราคารวมภาษีแล้ว */
function docHtml(o){
 const T0=DOC_TYPES[o.type]||DOC_TYPES.quote,mk=o.unknownMark||'-',P=!!(T0.price||o.showPrice);
 const ok=x=>x!==''&&x!=null&&!isNaN(Number(x));
 const L=o.lines||[],all=P&&L.length&&L.every(i=>ok(i.price));
 const sub=L.reduce((t,i)=>t+(ok(i.price)?Number(i.price)*Number(i.qty):0),0);
 const grand=Math.round(sub*100)/100,vat=T0.vat?Math.round(grand*VAT_RATE/(1+VAT_RATE)*100)/100:0,before=Math.round((grand-vat)*100)/100;
 const b=o.buyer||{},bn=b.name||(o.type==='taxabb'?'ลูกค้าทั่วไป':'');
 const rows=L.map((i,n)=>`<tr><td class="c">${n+1}</td><td>${dcEsc(i.name)}${i.label?`<small>${dcEsc(i.label)}</small>`:''}</td><td class="n">${dcEsc(i.qty)} ${dcEsc(i.unit||'')}</td>${P?`<td class="n">${ok(i.price)?fmt2(i.price):mk}</td><td class="n">${ok(i.price)?fmt2(Number(i.price)*Number(i.qty)):mk}</td>`:''}</tr>`).join('');
 const meta=[['เลขที่',o.no],['วันที่',o.date],o.due?['ครบกำหนด',o.due]:null,o.seller?['ผู้ขาย',o.seller]:null].filter(Boolean).map(x=>`<dt>${x[0]}</dt><dd>${dcEsc(x[1])}</dd>`).join('');
 const note=[o.note,P&&T0.vat?'ราคาสินค้าทุกรายการรวมภาษีมูลค่าเพิ่มแล้ว':''].filter(Boolean).join('\n');
 const stampSg=o.stamp?`<img class="dc-stamp" src="stamp.png" alt="" width="104" height="104">${o.seller?`<em class="dc-signame">${dcEsc(o.seller)}</em>`:''}`:'';
 return `<div class="dc-sheet dc-t-${T0.k}"><div class="dc-top"><img src="logo.png" alt="" width="84" height="84"><div class="dc-title"><h2>${dcEsc(T0.t)}</h2><p>${dcEsc(T0.s)}</p></div></div>
 <div class="dc-grid"><div class="dc-seller"><b>${dcEsc(COMPANY.name)} (${dcEsc(COMPANY.branch)})</b>${dcEsc(COMPANY.addr)}<br>เลขประจำตัวผู้เสียภาษี ${dcEsc(COMPANY.taxId)}<br>โทร. ${dcEsc(COMPANY.tel)}</div><dl class="dc-meta">${meta}</dl></div>
 <div class="dc-cust"><span class="dc-lab">ลูกค้า</span><b>${dcEsc(bn)}</b>${b.addr?dcEsc(b.addr)+'<br>':''}${b.taxId?`เลขประจำตัวผู้เสียภาษี ${dcEsc(b.taxId)}<br>`:''}${b.tel?`โทร. ${dcEsc(b.tel)}`:''}</div>
 <div class="dc-tw"><table class="dc-tab${P?'':' np'}"><thead><tr><th class="c">ลำดับ</th><th>รายละเอียด</th><th class="n">จำนวน</th>${P?'<th class="n">ราคา/หน่วย (รวมภาษี)</th><th class="n">ยอดรวม</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>
 <div class="dc-end">${P?`<div class="dc-sum"><div><span>${T0.vat?'มูลค่าก่อนภาษี':'รวมเป็นเงิน'}</span><b>${all?fmt2(before)+' บาท':mk}</b></div>${T0.vat?`<div><span>ภาษีมูลค่าเพิ่ม ${Math.round(VAT_RATE*100)}%</span><b>${all?fmt2(vat)+' บาท':mk}</b></div>`:''}<div class="g"><span>จำนวนเงินรวมทั้งสิ้น<small>(รวมภาษีแล้ว)</small></span><b>${all?fmt2(grand)+' บาท':mk}</b></div></div>
 ${all?`<p class="dc-words">(${thaiBaht(grand)})</p>`:''}`:''}
 ${note?`<div class="dc-note"><span class="dc-lab">หมายเหตุ</span>${dcEsc(note).replace(/\n/g,'<br>')}</div>`:''}
 <div class="dc-sign"><div><p>${b.name?'ในนาม '+dcEsc(b.name):'&nbsp;'}</p><i></i><span>${dcEsc(T0.sg[0])}</span><span class="d">วันที่</span></div><div><p>ในนาม ${dcEsc(COMPANY.name)}</p><i class="sg">${stampSg}</i><span>${o.seller?dcEsc(T0.sg[1])+' ('+dcEsc(o.seller)+')':dcEsc(T0.sg[1])}</span><span class="d">วันที่ ${dcEsc(o.date||'')}</span></div></div></div></div>`;
}
let _docTitle='';
let _docOnClose=null;
function openDoc(html,onClose){
 const had=!!document.getElementById('docroot');closeDoc();
 const r=document.createElement('div');r.id='docroot';
 r.innerHTML=`<div class="dc-bar"><button class="btn" onclick="backDoc()">← กลับ</button><button class="btn pri" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></div><div class="dc-scroll">${html}</div>`;
 document.body.appendChild(r);document.body.classList.add('docopen');
 const m=/dc-meta"><dt>เลขที่<\/dt><dd>([^<]*)/.exec(html);_docTitle=document.title;if(m)document.title=m[1];
 r.querySelector('.dc-scroll').scrollTop=0;
 _docOnClose=onClose||null;
 // ให้ปุ่มย้อนกลับของมือถือ/เบราว์เซอร์ปิดเอกสารได้ (ไม่หลุดออกจากหน้า)
 try{had?history.replaceState({mdDoc:1},''):history.pushState({mdDoc:1},'')}catch(e){}
}
function closeDoc(){const r=document.getElementById('docroot');if(r)r.remove();document.body.classList.remove('docopen');if(_docTitle){document.title=_docTitle;_docTitle=''}}
function backDoc(){
 if(history.state&&history.state.mdDoc){history.back();return}
 closeDoc();const f=_docOnClose;_docOnClose=null;if(f)f();
}
window.addEventListener('popstate',()=>{
 if(!document.getElementById('docroot'))return;
 closeDoc();const f=_docOnClose;_docOnClose=null;if(f)f();
});
