/* xl.js — Excel: ใบซื้อของ (พิมพ์ได้) · นำเข้า/ส่งออกสินค้า · เตือนสำรอง · กู้คืนจากไฟล์สำรอง
   ตัวอ่าน/เขียน Excel (exceljs) โหลดเมื่อกดใช้งานเท่านั้น จึงไม่ทำให้หน้าขายช้าลง */
let xlP=null;
function xlLoad(){
 return xlP||(xlP=new Promise((ok,no)=>{
  if(window.ExcelJS)return ok(window.ExcelJS);
  const s=document.createElement('script');s.src='vendor/exceljs.min.js?v=68';
  s.onload=()=>window.ExcelJS?ok(window.ExcelJS):(xlP=null,no(new Error('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ')));
  s.onerror=()=>{xlP=null;no(new Error('โหลดตัวอ่านไฟล์ Excel ไม่ได้ (ต้องต่ออินเทอร์เน็ตครั้งแรก)'))};document.head.appendChild(s);
 }));
}
async function xlSave(wb,name){
 const buf=await wb.xlsx.writeBuffer(),blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);
}
const XL_HEAD={font:{bold:true,color:{argb:'FFFFFFFF'},name:'Tahoma',size:11},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF1F3A6B'}},alignment:{vertical:'middle',horizontal:'center',wrapText:true}};
const XL_IN={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF3C4'}};
const XL_BD={top:{style:'thin',color:{argb:'FFB0B7C3'}},left:{style:'thin',color:{argb:'FFB0B7C3'}},bottom:{style:'thin',color:{argb:'FFB0B7C3'}},right:{style:'thin',color:{argb:'FFB0B7C3'}}};

/* ---------- 1) ใบซื้อของ (จากใบสั่งซื้อ) ---------- */
async function poXlsx(){
 try{
  toast('กำลังสร้างไฟล์ Excel…');
  const E=await xlLoad(),by=window.__po||{},ks=window.__pok||[],rows=[];
  ks.forEach(k=>by[k].forEach(x=>rows.push({sup:k==='ไม่ระบุผู้ขาย'?'':k,...x})));
  rows.sort((a,b)=>(a.sup||'￿').localeCompare(b.sup||'￿','th')||(a.cat||'').localeCompare(b.cat||'','th')||a.n.localeCompare(b.n,'th'));
  const wb=new E.Workbook(),ws=wb.addWorksheet('ใบซื้อของ',{views:[{state:'frozen',ySplit:5}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'5:5',margins:{left:.4,right:.4,top:.5,bottom:.6,header:.3,footer:.3}},headerFooter:{oddFooter:'&L&D&Cหน้า &P / &N&R'+(cfg.shop||'')}});
  ws.columns=[{key:'c',width:5},{key:'sup',width:16},{key:'n',width:34},{key:'bc',width:16},{key:'cat',width:14},{key:'u',width:8},{key:'st',width:9},{key:'q',width:10},{key:'cost',width:10},{key:'est',width:13},{key:'buy',width:10},{key:'nc',width:10},{key:'exp',width:15},{key:'id',width:12,hidden:true}];
  ws.mergeCells('A1:M1');ws.getCell('A1').value=`ใบซื้อของ — ${cfg.shop||'ร้านชำ'}`;ws.getCell('A1').font={bold:true,size:16,name:'Tahoma'};
  ws.mergeCells('A2:M2');ws.getCell('A2').value=`วันที่ ${dthai(today())} · ทั้งหมด ${rows.length} รายการ`;ws.getCell('A2').font={size:11,name:'Tahoma'};
  ws.mergeCells('A3:M3');ws.getCell('A3').value='ซื้อเสร็จแล้ว: กรอกช่องสีเหลือง (ซื้อจริง · ทุนใหม่ถ้าราคาเปลี่ยน · วันหมดอายุถ้ามี) แล้วบันทึกไฟล์ → ในระบบไปที่ สินค้า › นำเข้า/ส่งออก Excel เลือกไฟล์นี้ สต๊อกจะบวกเพิ่มให้ตามจำนวนที่ซื้อจริง (ห้ามแก้หัวตารางหรือเปลี่ยนชื่อสินค้า)';
  ws.getCell('A3').font={size:10,color:{argb:'FF5C6B8A'},name:'Tahoma'};ws.getCell('A3').alignment={wrapText:true,vertical:'top'};ws.getRow(3).height=30;
  const hd=['✓','ผู้ขาย','ชื่อสินค้า','บาร์โค้ด','หมวด','หน่วย','คงเหลือ','แนะนำซื้อ','ทุนล่าสุด','ประมาณการ (บาท)','ซื้อจริง','ทุนใหม่','หมดอายุ (ปปปป-ดด-วว)','รหัสระบบ'];
  const h=ws.getRow(5);hd.forEach((t,i)=>{const c=h.getCell(i+1);c.value=t;Object.assign(c,{style:{...XL_HEAD,border:XL_BD}})});h.height=32;
  rows.forEach((x,i)=>{
   const r=ws.getRow(6+i),n=6+i;
   [ '',x.sup,x.n,x.bc,x.cat,x.u,x.st,x.q,x.cost,{formula:`H${n}*I${n}`,result:x.q*x.cost},'','','',x.id].forEach((v,j)=>{const c=r.getCell(j+1);c.value=v;c.border=XL_BD;c.font={name:'Tahoma',size:11};c.alignment={vertical:'middle',wrapText:j===2,horizontal:[0,5].includes(j)?'center':(j>=6&&j<=11?'right':'left')}});
   [11,12,13].forEach(j=>{r.getCell(j).fill=XL_IN});
   r.getCell(4).numFmt='@';r.getCell(7).numFmt='#,##0.##';r.getCell(8).numFmt='#,##0.##';r.getCell(9).numFmt='#,##0.00';r.getCell(10).numFmt='#,##0.00';r.getCell(11).numFmt='#,##0.##';r.getCell(12).numFmt='#,##0.00';r.getCell(13).numFmt='@';
   r.getCell(8).font={name:'Tahoma',size:11,bold:true};r.height=22;
  });
  const t=ws.getRow(6+rows.length);t.getCell(9).value='รวมประมาณการ';t.getCell(9).font={bold:true,name:'Tahoma'};t.getCell(10).value={formula:`SUM(J6:J${5+rows.length})`,result:rows.reduce((a,x)=>a+x.q*x.cost,0)};t.getCell(10).numFmt='#,##0.00';t.getCell(10).font={bold:true,name:'Tahoma'};
  ws.autoFilter={from:'A5',to:`M${5+rows.length}`};
  await xlSave(wb,`ใบซื้อของ-${today()}.xlsx`);toast('ดาวน์โหลดแล้ว — เปิดใน Excel แล้วสั่งพิมพ์ได้เลย (A4 แนวนอน)');
 }catch(e){toast(e.message)}
}

/* ---------- 2) ส่งออกสินค้าทั้งหมด / แบบฟอร์มเปล่า ---------- */
async function itemsXlsx(blank){
 try{
  toast('กำลังสร้างไฟล์ Excel…');
  const E=await xlLoad(),wb=new E.Workbook(),ws=wb.addWorksheet('สินค้า',{views:[{state:'frozen',ySplit:3}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'3:3'}});
  ws.columns=[{width:16},{width:36},{width:15},{width:8},{width:11},{width:11},{width:11},{width:12},{width:16},{width:12,hidden:true}];
  ws.mergeCells('A1:I1');ws.getCell('A1').value=blank?'แบบฟอร์มนำเข้าสินค้า':`รายการสินค้าทั้งหมด — ${cfg.shop||'ร้านชำ'} (${dthai(today())})`;ws.getCell('A1').font={bold:true,size:15,name:'Tahoma'};
  ws.mergeCells('A2:I2');ws.getCell('A2').value='แก้ไข/เพิ่มแถวได้ แล้วนำเข้าที่ สินค้า › นำเข้า/ส่งออก Excel · ถ้าชื่อหรือบาร์โค้ดตรงกับสินค้าเดิมจะอัปเดตให้ ถ้าไม่ตรงจะเพิ่มเป็นสินค้าใหม่ · ไม่ต้องใส่ราคาขาย ระบบคิดจากต้นทุน + กำไรที่ตั้งไว้';ws.getCell('A2').font={size:10,color:{argb:'FF5C6B8A'},name:'Tahoma'};
  const hd=['บาร์โค้ด','ชื่อสินค้า','หมวด','หน่วย','ต้นทุน','ราคาขาย','คงเหลือ','จุดสั่งซื้อ','ผู้ขาย','รหัสระบบ'],h=ws.getRow(3);
  hd.forEach((t,i)=>{const c=h.getCell(i+1);c.value=t;c.style={...XL_HEAD,border:XL_BD}});h.height=26;
  const src=blank?[{barcode:'8851234567890',name:'ตัวอย่าง น้ำดื่ม 600 มล.',cat:'เครื่องดื่ม',unit:'ขวด',cost:5,price:8,stock:24,minStock:12,sup:'ร้านส่ง A',id:''}]:items.slice().sort((a,b)=>a.name.localeCompare(b.name,'th'));
  src.forEach((x,i)=>{const r=ws.getRow(4+i);[x.barcode||'',x.name,x.cat||'',x.unit||'',x.cost,x.price,x.stock,x.minStock||0,x.sup||'',x.id||''].forEach((v,j)=>{const c=r.getCell(j+1);c.value=v;c.border=XL_BD;c.font={name:'Tahoma',size:11};if(j===0)c.numFmt='@';if(j>=4&&j<=7)c.alignment={horizontal:'right'}})});
  ws.autoFilter={from:'A3',to:`I${3+src.length}`};
  await xlSave(wb,blank?'แบบฟอร์มนำเข้าสินค้า.xlsx':`รายการสินค้า-${today()}.xlsx`);toast('ดาวน์โหลดแล้ว');
 }catch(e){toast(e.message)}
}

/* ---------- 3) อ่านไฟล์ (xlsx / csv) ---------- */
function csvParse(t){
 const out=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;else if(c===','){row.push(f);f=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);out.push(row);row=[];f=''}
  else f+=c}
 if(f!==''||row.length){row.push(f);out.push(row)}
 return out.map((c,i)=>({line:i+1,cells:c}));
}
function xlVal(v){
 if(v==null)return '';
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if(typeof v==='object'){if('result' in v)return xlVal(v.result);if(v.richText)return v.richText.map(x=>x.text).join('');if('text' in v)return xlVal(v.text);if(v.error)return '';return String(v)}
 return v;
}
async function xlRead(file){
 const n=file.name.toLowerCase();
 if(n.endsWith('.csv')||n.endsWith('.txt'))return csvParse((await file.text()).replace(/^﻿/,''));
 if(!n.endsWith('.xlsx'))throw new Error('รองรับไฟล์ .xlsx หรือ .csv เท่านั้น (ถ้าเป็น .xls ให้เปิดแล้วบันทึกเป็น .xlsx)');
 const E=await xlLoad(),wb=new E.Workbook();await wb.xlsx.load(await file.arrayBuffer());
 const ws=wb.worksheets[0];if(!ws)throw new Error('ไม่พบข้อมูลในไฟล์');
 const rows=[];ws.eachRow({includeEmpty:false},(row,i)=>{const a=[];row.eachCell({includeEmpty:true},(c,ci)=>{a[ci-1]=xlVal(c.value)});rows.push({line:i,cells:a})});
 return rows;
}
const XL_ALIAS={id:['รหัสระบบ','id'],bc:['บาร์โค้ด','barcode','รหัสบาร์โค้ด'],name:['ชื่อสินค้า','ชื่อ','สินค้า','รายการ','name'],cat:['หมวด','หมวดหมู่'],unit:['หน่วย'],st:['คงเหลือ','สต๊อก','สต็อก','จำนวนคงเหลือ'],cost:['ต้นทุน','ทุน','ราคาทุน','ทุนล่าสุด'],price:['ราคาขาย','ราคา'],min:['จุดสั่งซื้อ','สต๊อกขั้นต่ำ','สต็อกขั้นต่ำ','ขั้นต่ำ','จุดเตือน'],sup:['ผู้ขาย','ซัพพลายเออร์'],buy:['ซื้อจริง','จำนวนซื้อ','รับจริง','รับเข้า'],nc:['ทุนใหม่'],exp:['หมดอายุ']};
const xlNorm=s=>String(s==null?'':s).split(/[(（]/)[0].replace(/\s+/g,'').toLowerCase();
function xlMap(rows){
 for(let i=0;i<Math.min(rows.length,20);i++){
  const m={};rows[i].cells.forEach((h,ci)=>{const k=xlNorm(h);if(!k)return;for(const f in XL_ALIAS)if(m[f]===undefined&&XL_ALIAS[f].some(a=>xlNorm(a)===k))m[f]=ci});
  if(m.name!==undefined)return{m,at:i};
 }
 throw new Error('ไม่พบหัวตาราง "ชื่อสินค้า" ในไฟล์ — ใช้ไฟล์ที่ดาวน์โหลดจากระบบ หรือแบบฟอร์มเปล่า');
}
const xlNum=v=>{if(v===''||v==null)return null;const n=Number(String(v).replace(/[,฿\s]/g,''));return isFinite(n)?n:NaN};
function xlDate(v){
 v=String(v==null?'':v).trim();if(!v)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
 const m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(v);
 if(m){let y=+m[3];if(y>2400)y-=543;return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
 return 'bad';
}
function xlFind(r){
 let it=r.id&&find(String(r.id));if(it)return it;
 if(r.bc){it=items.find(i=>i.barcode&&i.barcode===String(r.bc).trim());if(it)return it}
 const nm=String(r.name||'').trim().toLowerCase();return nm?items.find(i=>i.name.trim().toLowerCase()===nm):null;
}

/* ---------- 4) หน้านำเข้า ---------- */
let xlJob=null;
function importDlg(){
 xlJob=null;
 dlg(`<h3>นำเข้า / ส่งออก Excel</h3>
 <p class="sub">เลือกไฟล์ .xlsx หรือ .csv ระบบจะดูให้เองว่าเป็นแบบไหน</p>
 <label class="fld"><span class="lbl">เลือกไฟล์</span><input id="xl_f" class="inp" type="file" accept=".xlsx,.csv,.txt" onchange="xlPick(this.files[0])"></label>
 <div id="xl_body"><div class="note2"><b>ซื้อของเสร็จ</b> — ไฟล์ "ใบซื้อของ" ที่กรอกช่อง <b>ซื้อจริง</b> แล้ว: ระบบ<b>บวก</b>สต๊อกตามจำนวนที่ซื้อ (ไม่เขียนทับ จึงไม่พลาดถ้ามีขายระหว่างไปซื้อของ) และอัปเดตต้นทุน/วันหมดอายุให้<br><b>รายการสินค้า</b> — ไฟล์ที่มีคอลัมน์ ชื่อสินค้า/บาร์โค้ด/ต้นทุน/ราคา: เพิ่มสินค้าใหม่หรืออัปเดตของเดิม</div></div>
 <div class="acts2"><button class="btn" onclick="itemsXlsx(false)">ส่งออกสินค้าทั้งหมด (Excel)</button><button class="btn" onclick="itemsXlsx(true)">ดาวน์โหลดแบบฟอร์มเปล่า</button><button class="btn" onclick="closeDlg()">ปิด</button></div>`);
}
async function xlPick(file){
 const b=$('#xl_body');if(!file||!b)return;b.innerHTML='<div class="empty2">กำลังอ่านไฟล์…</div>';
 try{
  const rows=await xlRead(file),{m,at}=xlMap(rows),g=(r,k)=>m[k]===undefined?'':xlVal(r.cells[m[k]]),data=[];
  for(const r of rows.slice(at+1)){
   const o={line:r.line,id:g(r,'id'),bc:String(g(r,'bc')).trim(),name:String(g(r,'name')).trim(),cat:g(r,'cat'),unit:g(r,'unit'),st:g(r,'st'),cost:g(r,'cost'),price:g(r,'price'),min:g(r,'min'),sup:String(g(r,'sup')).trim(),buy:g(r,'buy'),nc:g(r,'nc'),exp:g(r,'exp')};
   if(!o.name&&!o.bc&&!o.id)continue;if(/^รวม/.test(o.name))continue;data.push(o);
  }
  if(!data.length)throw new Error('ไม่พบรายการในไฟล์');
  if(m.buy!==undefined)xlRecvPrev(data);else xlListPrev(data,m);
 }catch(e){b.innerHTML=`<div class="err">${esc(e.message)}</div>`}
}
function xlRecvPrev(data){
 const ok=[],skip=[];
 for(const r of data){
  const q=xlNum(r.buy);if(q===null||q===0)continue;
  const it=xlFind(r),nc=xlNum(r.nc),ex=xlDate(r.exp);
  if(Number.isNaN(q)||q<0){skip.push({r,why:'จำนวนซื้อไม่ถูกต้อง'});continue}
  if(!it){skip.push({r,why:'ไม่พบสินค้านี้ในระบบ (แก้ชื่อหรือเพิ่มสินค้าก่อน)'});continue}
  if(Number.isNaN(nc)){skip.push({r,why:'ทุนใหม่ไม่ถูกต้อง'});continue}
  if(ex==='bad'){skip.push({r,why:'วันหมดอายุต้องเป็นรูปแบบ ปปปป-ดด-วว'});continue}
  ok.push({it,q,cost:nc===null?undefined:nc,exp:ex,sup:r.sup});
 }
 xlJob={type:'recv',ok};
 $('#xl_body').innerHTML=ok.length?`<p class="sub">จะรับเข้า <b>${fm(ok.length)}</b> รายการ${skip.length?` · ข้าม ${fm(skip.length)} รายการ`:''}</p>
 <div class="camb2"><table class="t"><tr><th>สินค้า</th><th class="r">มีอยู่</th><th class="r">+ซื้อ</th><th class="r">เป็น</th></tr>${ok.map(x=>`<tr><td>${esc(x.it.name)}${x.cost!==undefined&&x.cost!==x.it.cost?`<br><small>ทุน ${fm(r2(x.it.cost))} → ${fm(x.cost)}</small>`:''}</td><td class="r">${fm(x.it.stock)}</td><td class="r"><b>+${fm(x.q)}</b></td><td class="r">${fm(r2(x.it.stock+x.q))}</td></tr>`).join('')}</table></div>
 <label class="fld"><span class="lbl">เลขที่บิล / หมายเหตุ (ไม่ต้องใส่ก็ได้)</span><input id="xl_inv" class="inp" maxlength="40"></label>${xlSkipHtml(skip)}<div id="perr" class="err" role="alert"></div>
 <button id="xl_go" class="btn pri w" onclick="xlRecvGo()">ยืนยันรับเข้า ${fm(ok.length)} รายการ</button>`
 :`<div class="note2">ยังไม่มีรายการที่กรอก "ซื้อจริง" ในไฟล์นี้</div>${xlSkipHtml(skip)}`;
}
function xlSkipHtml(skip){return skip.length?`<details class="newc"><summary>รายการที่ข้าม (${fm(skip.length)})</summary><div class="camb2">${skip.slice(0,100).map(s=>`<div class="bill"><span>แถว ${s.r?s.r.line:s.line} · ${esc((s.r?s.r.name:s.name)||'—')}</span><small>${esc(s.why)}</small></div>`).join('')}</div></details>`:''}
async function xlRecvGo(){
 if(busy||!xlJob)return;busy=true;$('#xl_go').disabled=true;$('#perr').textContent='';
 const inv=($('#xl_inv').value||'').trim()||('จากไฟล์ Excel '+today()),by={};
 xlJob.ok.forEach(x=>(by[x.sup||'']=by[x.sup||'']||[]).push(x));
 let n=0,tot=0;
 try{
  for(const sup of Object.keys(by)){
   const l=by[sup];
   for(let i=0;i<l.length;i+=150){
    const part=l.slice(i,i+150),j=await api({action:'posReceiveBatch',sup,invoice:inv,lines:part.map(x=>({id:x.it.id,qty:x.q,cost:x.cost,expiry:x.exp||undefined}))});
    j.items.forEach(u=>{const k=items.findIndex(y=>y.id===u.id);if(k>=0)items[k]=u});n+=part.length;tot+=j.total||0;
   }
  }
  busy=false;closeDlg(true);xlJob=null;render();toast(`รับเข้าแล้ว ${n} รายการ (มูลค่า ${fm(r2(tot))} บาท)`);
 }catch(e){busy=false;const g=$('#xl_go');if(g)g.disabled=false;const p=$('#perr');if(p)p.textContent=(n?`รับเข้าไปแล้ว ${n} รายการ แล้วหยุดที่ข้อผิดพลาด: `:'')+e.message;if(n)render()}
}
function xlListPrev(data,m){
 const rows=[],skip=[];let nNew=0,nUp=0;
 for(const r of data){
  if(!r.name&&!r.bc){skip.push({r,why:'ไม่มีชื่อสินค้า'});continue}
  const it=xlFind(r);
  if(!it&&!r.name){skip.push({r,why:'ไม่มีชื่อสินค้า'});continue}
  rows.push({line:r.line,name:r.name||(it&&it.name)||'',barcode:r.bc,cat:r.cat,unit:r.unit,cost:xlNum(r.cost),price:xlNum(r.price),stock:xlNum(r.st),minStock:xlNum(r.min),sup:r.sup,_new:!it});
  it?nUp++:nNew++;
 }
 rows.forEach(r=>['cost','price','stock','minStock'].forEach(k=>{if(r[k]===null)delete r[k]}));
 xlJob={type:'list',rows,skip};
 $('#xl_body').innerHTML=`<p class="sub">ในไฟล์ <b>${fm(rows.length)}</b> รายการ · เพิ่มใหม่ <b>${fm(nNew)}</b> · อัปเดตของเดิม <b>${fm(nUp)}</b>${skip.length?` · ข้าม ${fm(skip.length)}`:''}</p>
 <div class="camb2"><table class="t">${rows.slice(0,60).map(r=>`<tr><td>${esc(r.name)}</td><td class="r"><small>${r._new?'ใหม่':'อัปเดต'}</small></td><td class="r">${r.price!==undefined?fm(r.price):''}</td></tr>`).join('')}${rows.length>60?`<tr><td colspan="3"><small>…และอีก ${fm(rows.length-60)} รายการ</small></td></tr>`:''}</table></div>
 ${m.st!==undefined?`<label class="rcost" style="margin:8px 0"><input type="checkbox" id="xl_set"> ตั้งสต๊อกของสินค้าเดิมตามคอลัมน์ "คงเหลือ" ในไฟล์ (สินค้าใหม่ใช้ค่านี้เป็นสต๊อกเริ่มต้นเสมอ)</label>`:''}
 ${xlSkipHtml(skip)}<div id="perr" class="err" role="alert"></div><button id="xl_go" class="btn pri w" onclick="xlListGo()">ยืนยันนำเข้า ${fm(rows.length)} รายการ</button>`;
}
async function xlListGo(){
 if(busy||!xlJob)return;busy=true;$('#xl_go').disabled=true;$('#perr').textContent='';
 const setStock=!!($('#xl_set')&&$('#xl_set').checked),rows=xlJob.rows;let c=0,u=0,sk=[];
 try{
  for(let i=0;i<rows.length;i+=500){
   const j=await api({action:'posImport',setStock,rows:rows.slice(i,i+500).map(({_new,...r})=>r)});
   c+=j.created;u+=j.updated;sk=sk.concat(j.skipped||[]);items=j.items;
  }
  busy=false;xlJob=null;render();
  dlg(`<h3>นำเข้าเสร็จแล้ว</h3><p class="sub">เพิ่มใหม่ <b>${fm(c)}</b> · อัปเดต <b>${fm(u)}</b>${sk.length?` · ข้าม <b>${fm(sk.length)}</b>`:''}</p>${xlSkipHtml(sk.map(s=>({line:s.line,name:s.name,why:s.why})))}<div class="acts2"><button class="btn pri" onclick="closeDlg()">ปิด</button></div>`);
 }catch(e){busy=false;const g=$('#xl_go');if(g)g.disabled=false;const p=$('#perr');if(p)p.textContent=e.message;if(c||u)render()}
}

/* ---------- 5) เตือนสำรองข้อมูล + กู้คืน ---------- */
function bkDays(){
 if(!lastBk)return null;const t=Date.parse(String(lastBk).replace(' ','T')+'+07:00');if(isNaN(t))return null;
 return Math.floor((Date.now()-t)/864e5);
}
function bkWarn(){
 if(!items.length)return '';const d=bkDays();
 if(d===null)return 'ยังไม่เคยสำรองข้อมูล — ไปที่ ตั้งค่า กดสำรอง';
 return d>=7?`ไม่ได้สำรองข้อมูลมา ${d} วันแล้ว`:'';
}
function bkInfo(){
 const d=bkDays();return d===null?'ยังไม่เคยสำรองข้อมูล แนะนำให้สำรองอย่างน้อยสัปดาห์ละครั้ง เก็บไฟล์ไว้ใน Google Drive หรืออีเมลตัวเอง':`สำรองล่าสุด ${d===0?'วันนี้':d+' วันก่อน'} (${esc(lastBk)}) · แนะนำสัปดาห์ละครั้ง`;
}
function restoreDlg(){
 dlg(`<h3>กู้คืนจากไฟล์สำรอง</h3>
 <div class="note2"><b>ระวัง:</b> ข้อมูลปัจจุบันทั้งหมด (สินค้า บิล ลูกหนี้ รายจ่าย) จะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์ ใช้เมื่อข้อมูลเสียหรือลบพลาดเท่านั้น</div>
 <label class="fld"><span class="lbl">ไฟล์สำรอง (.json ที่ดาวน์โหลดจากระบบนี้)</span><input id="rs_f" class="inp" type="file" accept=".json,application/json" onchange="restorePick(this.files[0])"></label>
 <div id="rs_body"></div><div class="acts2"><button class="btn" onclick="closeDlg()">ยกเลิก</button></div>`);
}
let rsData=null;
async function restorePick(file){
 const b=$('#rs_body');rsData=null;if(!file||!b)return;
 try{
  const d=JSON.parse(await file.text());
  if(!d||d.app!=='pos'||!Array.isArray(d.items))throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของระบบขายหน้าร้าน');
  rsData=d;const n=k=>fm((d[k]||[]).length);
  b.innerHTML=`<p class="sub">ไฟล์สำรองเมื่อ <b>${esc(d.at||'ไม่ทราบ')}</b><br>สินค้า ${n('items')} · บิล ${n('sales')} · ลูกค้า ${n('custs')} · รายจ่าย ${n('expenses')} · ใบซื้อ ${n('buys')}</p>
  <label class="rcost" style="margin:8px 0"><input type="checkbox" id="rs_bk" checked> ดาวน์โหลดสำรองข้อมูลปัจจุบันเก็บไว้ก่อน (แนะนำ)</label>
  <label class="fld"><span class="lbl">พิมพ์คำว่า <b>กู้คืน</b> เพื่อยืนยัน</span><input id="rs_ok" class="inp" autocomplete="off" oninput="$('#rs_go').disabled=this.value.trim()!=='กู้คืน'"></label>
  <div id="perr" class="err" role="alert"></div><button id="rs_go" class="btn pri w" disabled onclick="restoreGo()">กู้คืนข้อมูล</button>`;
 }catch(e){b.innerHTML=`<div class="err">${esc(e instanceof SyntaxError?'อ่านไฟล์ไม่ได้ (ไม่ใช่ไฟล์ JSON)':e.message)}</div>`}
}
async function restoreGo(){
 if(busy||!rsData)return;busy=true;$('#rs_go').disabled=true;$('#perr').textContent='';
 try{
  if($('#rs_bk')&&$('#rs_bk').checked&&!(await backupDl()))throw new Error('สำรองข้อมูลปัจจุบันไม่สำเร็จ จึงหยุดไว้ก่อน (ลองใหม่ หรือเอาติ๊กสำรองออกถ้าต้องการข้าม)');
  await api({action:'posRestore',data:rsData,confirm:'กู้คืน'});
  rsData=null;await boot();busy=false;closeDlg(true);view='sell';render();toast('กู้คืนข้อมูลเรียบร้อย');
 }catch(e){busy=false;const g=$('#rs_go');if(g)g.disabled=false;const p=$('#perr');if(p)p.textContent=e.message}
}
