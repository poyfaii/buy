/* บาร์โค้ดของร้านเอง: สร้างรหัส (EAN-13 ขึ้นต้น 20) + พิมพ์ป้าย EAN-13 / QR  — ใช้ qrlib.js (MIT) สำหรับ QR */
const EL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],
 ER=EL.map(s=>s.replace(/[01]/g,c=>c==='0'?'1':'0')),EG=ER.map(s=>s.split('').reverse().join('')),
 EP=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function eanOk(c){c=String(c);if(!/^\d{13}$/.test(c))return false;let s=0;for(let i=0;i<12;i++)s+=(+c[i])*(i%2?3:1);return (10-s%10)%10===+c[12]}
function eanBits(c){const p=EP[+c[0]];let b='101';for(let i=0;i<6;i++){const d=+c[i+1];b+=p[i]==='L'?EL[d]:EG[d]}b+='01010';for(let i=7;i<13;i++)b+=ER[+c[i]];return b+'101'}
// SVG ของ EAN-13 (กว้างตามสัดส่วน ปรับขนาดด้วย CSS ได้)
function eanSvg(c,h){h=h||60;const bits=eanBits(c),q=9,W=bits.length+q*2;let r='',i=0;
 while(i<bits.length){if(bits[i]==='1'){let j=i;while(bits[j]==='1')j++;r+=`<rect x="${i+q}" y="0" width="${j-i}" height="${h}"/>`;i=j}else i++}
 return `<svg class="bcsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h+11}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="${W}" height="${h+11}" fill="#fff"/><g fill="#000">${r}</g><g font-family="monospace" font-size="9" fill="#000" text-anchor="middle"><text x="${q-4}" y="${h+9}">${c[0]}</text><text x="${q+3+21}" y="${h+9}">${c.slice(1,7)}</text><text x="${q+3+46+21}" y="${h+9}">${c.slice(7)}</text></g></svg>`;
}
/* Code 128 (B / C อัตโนมัติ) — บาร์โค้ดสากลรองรับตัวเลข/ตัวอักษร/รหัสยาว */
const C128="212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112".split(' ');
function c128Vals(t){
 t=String(t).replace(/[^\x20-\x7e]/g,'?');const v=[];
 if(/^\d+$/.test(t)&&t.length>=4&&t.length%2===0){v.push(105);for(let i=0;i<t.length;i+=2)v.push(+t.slice(i,i+2))}
 else{v.push(104);for(const ch of t)v.push(ch.charCodeAt(0)-32)}
 let s=v[0];for(let i=1;i<v.length;i++)s+=v[i]*i;v.push(s%103,106);return v;
}
function c128Svg(text,h){
 h=h||60;const t=String(text).replace(/[^\x20-\x7e]/g,'?'),v=c128Vals(t),q=10;let x=q,r='';
 for(const k of v){const p=C128[k];for(let i=0;i<p.length;i++){const w=+p[i];if(i%2===0)r+=`<rect x="${x}" y="0" width="${w}" height="${h}"/>`;x+=w}}
 const W=x+q,fs=t.length>18?7:9;
 return `<svg class="bcsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h+12}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="${W}" height="${h+12}" fill="#fff"/><g fill="#000">${r}</g><text x="${W/2}" y="${h+10}" font-family="monospace" font-size="${fs}" fill="#000" text-anchor="middle">${t.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></svg>`;
}
function qrSvg(text){const q=qrcode(0,'M');q.addData(String(text));q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true}).replace('<svg','<svg class="bcsvg qr"')}
function codeSvg(c,fmt){return fmt==='c128'||!eanOk(c)?c128Svg(c):eanSvg(c)}

/* ----- สร้างรหัสให้สินค้าในฟอร์ม ----- */
async function genOwnCode(){
 const e=$('#f_bc');if(!e||e.readOnly)return;
 try{const j=await api({action:'posNewCode',n:1});e.value=j.codes[0];toast('สร้างบาร์โค้ดร้านแล้ว — บันทึกสินค้าแล้วไปพิมพ์ป้ายได้')}catch(x){toast(x.message)}
}

/* ----- หน้าพิมพ์ป้าย ----- */
let lbSel={},lbSize='s',lbFmt='ean',lbCopies=1,lbFlt='none',lbQ='';
function lbList(){const t=lbQ.trim().toLowerCase();return items.filter(i=>(!t||i.name.toLowerCase().includes(t)||(i.barcode||'').includes(t))&&(lbFlt==='all'||(lbFlt==='none'?!i.barcode:(lbFlt==='own'?/^20\d{11}$/.test(i.barcode||''):true))))}
function lbDlg(ids){
 lbSel={};(ids||[]).forEach(i=>lbSel[i]=1);if(ids&&ids.length)lbFlt='all';else lbFlt='none';lbQ='';
 dlg(`<h3>พิมพ์ป้ายบาร์โค้ด</h3><p class="sub">ใช้กับสินค้าที่ไม่มีบาร์โค้ด เช่น น้ำแข็ง 5 บาท / 10 บาท ขายผักผลไม้ ตั้งชื่อสินค้าตามราคาแต่ละแบบ แล้วพิมพ์ป้ายไปแปะหรือใส่ซอง ยิงได้เหมือนบาร์โค้ดปกติ (ถ้าสินค้ามีบาร์โค้ดอื่นที่ไม่ใช่ EAN-13 ระบบจะพิมพ์เป็น Code 128 ให้)</p>
 <div class="chips" id="lb_f"></div><input id="lb_q" class="inp" placeholder="ค้นหาสินค้า" oninput="lbQ=this.value;lbRows()">
 <div id="lb_rows" class="lbrows"></div>
 <div class="row2"><label class="fld"><span class="lbl">รูปแบบ</span><select id="lb_fmt" class="inp" onchange="lbFmt=this.value"><option value="ean"${lbFmt!=='c128'?' selected':''}>EAN-13 — มาตรฐานสากลของสินค้าขายปลีก (แนะนำ)</option><option value="c128"${lbFmt==='c128'?' selected':''}>Code 128 — รหัสยาว/มีตัวอักษร</option></select></label>
 <label class="fld"><span class="lbl">ขนาดป้าย</span><select id="lb_sz" class="inp" onchange="lbSize=this.value"><option value="s"${lbSize==='s'?' selected':''}>เล็ก — สติกเกอร์ติดสินค้า (3 ช่องต่อแถว)</option><option value="l"${lbSize==='l'?' selected':''}>ใหญ่ — ป้ายตั้งหน้าเคาน์เตอร์ (2 ช่องต่อแถว)</option></select></label>
 <label class="fld"><span class="lbl">จำนวนดวงต่อสินค้า</span><input id="lb_n" class="inp" inputmode="numeric" value="${lbCopies}" oninput="lbCopies=Math.max(1,Math.min(100,Math.floor(Number(this.value))||1))"></label></div>
 <div id="lb_err" class="err" role="alert"></div>
 <div class="acts2"><button class="btn pri lg" id="lb_go" onclick="lbPrint()">พิมพ์ป้าย <span id="lb_cnt"></span></button><button class="btn" onclick="closeDlg()">ปิด</button></div>`);
 lbRows();
}
function lbRows(){
 const chip=(k,t)=>`<button class="cat" aria-pressed="${lbFlt===k}" onclick="lbFlt='${k}';lbRows()">${t}</button>`;
 $('#lb_f').innerHTML=chip('none','ยังไม่มีบาร์โค้ด ('+items.filter(i=>!i.barcode).length+')')+chip('own','บาร์โค้ดร้านเอง')+chip('all','ทั้งหมด');
 const l=lbList();
 $('#lb_rows').innerHTML=l.length?`<label class="lbr all"><input type="checkbox" onchange="lbAll(this.checked)"> <b>เลือกทั้งหมดที่เห็น (${l.length})</b></label>`+l.slice(0,300).map(i=>`<label class="lbr"><input type="checkbox" ${lbSel[i.id]?'checked':''} onchange="lbTog('${i.id}',this.checked)"> <span>${esc(i.name)} <small>฿${fm(i.price)}${i.barcode?' · '+esc(i.barcode):' · ยังไม่มีรหัส'}</small></span></label>`).join(''):'<div class="empty2">ไม่มีสินค้าในหมวดนี้</div>';
 lbCount();
}
function lbTog(id,on){if(on)lbSel[id]=1;else delete lbSel[id];lbCount()}
function lbAll(on){lbList().forEach(i=>{if(on)lbSel[i.id]=1;else delete lbSel[i.id]});lbRows()}
function lbCount(){const n=Object.keys(lbSel).length,e=$('#lb_cnt');if(e)e.textContent=n?'('+n+' รายการ)':''}
async function lbPrint(){
 const ids=Object.keys(lbSel).filter(i=>find(i));if(!ids.length){$('#lb_err').textContent='เลือกสินค้าที่จะพิมพ์ก่อน';return}
 if(busy)return;busy=true;$('#lb_go').disabled=true;$('#lb_err').textContent='';
 try{
  const need=ids.map(find).filter(i=>!i.barcode);
  if(need.length){const j=await api({action:'posNewCode',n:need.length});
   for(let k=0;k<need.length;k++){const it=need[k],r=await api({action:'posSaveItem',item:Object.assign({},it,{barcode:j.codes[k]})});const x=items.findIndex(y=>y.id===it.id);if(x>=0)items[x]=r.item}}
  const fmt=lbFmt,n=lbCopies,cells=[];
  ids.map(find).forEach(it=>{for(let k=0;k<n;k++)cells.push(`<div class="lbl1"><b>${esc(it.name)}</b><div class="pr">฿${fm(it.price)}</div>${codeSvg(it.barcode,fmt)}</div>`)});
  let e=document.getElementById('lblsheet');if(!e){e=document.createElement('div');e.id='lblsheet';document.body.appendChild(e)}
  e.className=lbSize==='l'?'big':'';e.innerHTML=cells.join('');document.body.classList.add('lblprint');
  let st=document.getElementById('lbstyle');if(!st){st=document.createElement('style');st.id='lbstyle';document.head.appendChild(st)}
  st.textContent='@page{size:A4;margin:8mm}';
  busy=false;lbRows();
  setTimeout(()=>{window.print();setTimeout(()=>{document.body.classList.remove('lblprint');e.innerHTML=''},600)},60);
 }catch(x){busy=false;$('#lb_go').disabled=false;$('#lb_err').textContent=x.message}
}
