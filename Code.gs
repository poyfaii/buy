/**
 * ระบบหลังบ้านของเว็บสั่งซื้อ "แม่ดอนรุ่งเรืองฟู้ดส์" (Google Apps Script)
 * ผูกกับไฟล์ Google Sheets นี้ — ใช้เก็บสินค้า ตัวเลือกขนาด และการตั้งค่า
 *
 * วิธีใช้: ดูไฟล์ "คู่มือติดตั้ง.md"
 *   1) เปิดชีต > ส่วนขยาย > Apps Script > วางโค้ดนี้ > บันทึก
 *   2) เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" (ครั้งแรกจะขอสิทธิ์ ให้กดอนุญาต)
 *   3) ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *        เรียกใช้ในฐานะ: ฉัน | ผู้มีสิทธิ์เข้าถึง: ทุกคน
 *   4) คัดลอก URL (ลงท้าย /exec) ไปใส่ในไฟล์ config.js ของเว็บ
 */

// ===== รหัสเข้าหน้าแอดมิน (เปลี่ยนได้ที่นี่ แล้วทำให้ใช้งานได้ใหม่) =====
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';

// ===== ชื่อแท็บและหัวตาราง (อย่าเปลี่ยนชื่อหัวคอลัมน์) =====
const SHEET_PRODUCTS = 'Products';
const SHEET_VARIANTS = 'Variants';
const SHEET_SETTINGS = 'Settings';
const PRODUCT_HEADERS = ['id', 'sortOrder', 'name', 'description', 'note', 'status', 'image'];
const VARIANT_HEADERS = ['id', 'productId', 'sortOrder', 'size', 'sizeUnit', 'packaging', 'price', 'status'];
const SETTING_HEADERS = ['key', 'value'];
const SHEET_ORDERS = 'Orders';
const SHEET_CUSTOMERS = 'Customers';
const ORDER_HEADERS = ['orderId', 'createdAt', 'name', 'phone', 'province', 'amphoe', 'tambon', 'zip', 'address', 'note', 'items', 'itemsJson', 'status'];
const CUSTOMER_HEADERS = ['phone', 'name', 'province', 'amphoe', 'tambon', 'zip', 'address', 'lastOrderId', 'lastOrderAt', 'lastItemsJson', 'orderCount'];
const MAX_ITEMS = 80;
const IMAGE_FOLDER = 'MaedonShop-Images';
const CACHE_SECONDS = 120; // ลูกค้าเห็นการแก้ไขในชีตภายในไม่เกินเวลานี้

/* ---------------- จุดรับคำขอจากเว็บ ---------------- */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') return json_(readAll_(false));
    if (action === 'ping') return json_({ ok: true });
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    // ลูกค้าส่งคำสั่งซื้อ / ดึงข้อมูลเดิม (ไม่ต้องล็อกอิน)
    if (b.action === 'order') return json_(saveOrder_(b.order));
    if (b.action === 'lookup') return json_(lookup_(b));
    checkAuth_(b);
    if (b.action === 'login') return json_({ ok: true });
    if (b.action === 'listAll') return json_(readAll_(true));
    if (b.action === 'save') return json_(saveAll_(b.data));
    if (b.action === 'listOrders') return json_(listOrders_());
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function checkAuth_(b) {
  if (!b || b.user !== ADMIN_USER || b.pass !== ADMIN_PASS) throw new Error('unauthorized');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- ตั้งค่าครั้งแรก (กดเรียกใช้ 1 ครั้ง) ---------------- */
function setup() {
  format_(sheet_(SHEET_PRODUCTS, PRODUCT_HEADERS), PRODUCT_HEADERS, ['id', 'name', 'description', 'note', 'image'], 'status');
  format_(sheet_(SHEET_VARIANTS, VARIANT_HEADERS), VARIANT_HEADERS, ['id', 'productId', 'size', 'sizeUnit', 'packaging'], 'status');
  format_(sheet_(SHEET_SETTINGS, SETTING_HEADERS), SETTING_HEADERS, ['key', 'value'], null);
  format_(sheet_(SHEET_ORDERS, ORDER_HEADERS), ORDER_HEADERS, ORDER_HEADERS, null);
  format_(sheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS), CUSTOMER_HEADERS, CUSTOMER_HEADERS, null);
  folder_(); // ขอสิทธิ์ Google Drive สำหรับเก็บรูปสินค้า
  CacheService.getScriptCache().remove('pub');
  Logger.log('พร้อมใช้งานแล้ว — ไปขั้นตอนทำให้ใช้งานได้ (Deploy) ต่อได้เลย');
}

/* ---------------- อ่านข้อมูล ---------------- */
function readAll_(admin) {
  const cache = CacheService.getScriptCache();
  if (!admin) {
    const c = cache.get('pub');
    if (c) return JSON.parse(c);
  }
  const sp = sheet_(SHEET_PRODUCTS, PRODUCT_HEADERS);
  const sv = sheet_(SHEET_VARIANTS, VARIANT_HEADERS);
  const ss = sheet_(SHEET_SETTINGS, SETTING_HEADERS);

  const byProduct = {};
  rows_(sv).forEach(function (r) {
    const pid = str_(r.productId), id = str_(r.id);
    if (!pid || !id) return;
    (byProduct[pid] = byProduct[pid] || []).push({
      id: id,
      size: str_(r.size),
      sizeUnit: str_(r.sizeUnit),
      packaging: str_(r.packaging),
      price: r.price === '' || r.price == null || isNaN(Number(r.price)) ? '' : Number(r.price),
      status: bool_(r.status),
      sortOrder: num_(r.sortOrder)
    });
  });

  let products = rows_(sp)
    .filter(function (r) { return str_(r.id) && str_(r.name).trim() !== ''; })
    .map(function (r) {
      return {
        id: str_(r.id),
        name: str_(r.name).trim(),
        description: str_(r.description),
        note: str_(r.note),
        image: str_(r.image),
        status: bool_(r.status),
        sortOrder: num_(r.sortOrder),
        variants: (byProduct[str_(r.id)] || []).sort(bySort_)
      };
    })
    .sort(bySort_);

  if (!admin) {
    // ลูกค้าเห็นเฉพาะสินค้าที่เปิดแสดง และเฉพาะตัวเลือกที่เปิดอยู่ (ไม่ส่งราคาให้หน้าร้าน)
    products = products.filter(function (p) { return p.status; }).map(function (p) {
      const active = p.variants.filter(function (v) { return v.status; }).map(function (v) {
        return { id: v.id, size: v.size, sizeUnit: v.sizeUnit, packaging: v.packaging, status: true, sortOrder: v.sortOrder };
      });
      if (p.variants.length && !active.length) return null; // มีตัวเลือกแต่ปิดหมด = ไม่ขาย
      return { id: p.id, name: p.name, description: p.description, note: p.note, image: p.image, status: true, sortOrder: p.sortOrder, variants: active };
    }).filter(Boolean);
  }

  const st = {};
  rows_(ss).forEach(function (r) { st[str_(r.key)] = str_(r.value); });
  const out = {
    ok: true,
    fbUrl: st.fbUrl || '',
    units: list_(st.units),
    packs: list_(st.packs),
    products: products
  };
  if (!admin) {
    try { cache.put('pub', JSON.stringify(out), CACHE_SECONDS); } catch (e) { /* ข้อมูลใหญ่เกินแคช ก็ข้ามไป */ }
  }
  return out;
}

/* ---------------- บันทึกข้อมูล (จากหน้าแอดมิน) ---------------- */
function saveAll_(data) {
  if (!data || !Array.isArray(data.products)) throw new Error('ข้อมูลไม่ถูกต้อง');
  if (!data.products.length && !data.allowEmpty) throw new Error('ไม่บันทึกรายการสินค้าว่าง');
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sp = sheet_(SHEET_PRODUCTS, PRODUCT_HEADERS);
    const sv = sheet_(SHEET_VARIANTS, VARIANT_HEADERS);
    const ss = sheet_(SHEET_SETTINGS, SETTING_HEADERS);
    const images = {}, prows = [], vrows = [];

    data.products.slice().sort(bySort_).forEach(function (p, i) {
      const id = str_(p.id) || Utilities.getUuid().slice(0, 8);
      let img = str_(p.image);
      if (img.indexOf('data:') === 0) { img = uploadImage_(img, id); images[id] = img; }
      prows.push([id, i, str_(p.name).trim(), str_(p.description), str_(p.note), p.status !== false, img]);
      (p.variants || []).slice().sort(bySort_).forEach(function (v, j) {
        const price = v.price === '' || v.price == null || isNaN(Number(v.price)) ? '' : Number(v.price);
        vrows.push([str_(v.id) || (id + 'v' + (j + 1)), id, j, str_(v.size), str_(v.sizeUnit), str_(v.packaging), price, v.status !== false]);
      });
    });

    writeTable_(sp, PRODUCT_HEADERS, prows);
    writeTable_(sv, VARIANT_HEADERS, vrows);
    writeTable_(ss, SETTING_HEADERS, [
      ['fbUrl', str_(data.fbUrl)],
      ['units', (data.units || []).join(',')],
      ['packs', (data.packs || []).join(',')]
    ]);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('pub');
    return { ok: true, images: images };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- คำสั่งซื้อและข้อมูลลูกค้า ---------------- */
function clean_(v, max) {
  let s = str_(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return s.length > max ? s.slice(0, max) : s;
}
function phone_(v) {
  let d = str_(v).replace(/\D/g, '');
  if (d.length === 11 && d.indexOf('66') === 0) d = '0' + d.slice(2);
  return d;
}
function norm_(v) { return str_(v).replace(/\s+/g, '').toLowerCase().replace(/^(คุณ|นางสาว|น\.ส\.|นาย|นาง)/, ''); } // ตัดคำนำหน้าเพื่อเทียบชื่อ
function now_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'); }
function appendRow_(sh, n, arr) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, n).setNumberFormat('@').setValues([arr.map(str_)]);
}
function limit_(key, max, secs) {
  const c = CacheService.getScriptCache(), n = Number(c.get(key) || 0);
  if (n >= max) return false;
  c.put(key, String(n + 1), secs);
  return true;
}

function saveOrder_(o) {
  o = o || {};
  const phone = phone_(o.phone), name = clean_(o.name, 100);
  if (!name || !/^\d{9,10}$/.test(phone)) throw new Error('ข้อมูลผู้สั่งไม่ครบ');
  const items = Array.isArray(o.items) ? o.items.slice(0, MAX_ITEMS) : [];
  if (!items.length) throw new Error('ไม่มีรายการสินค้า');
  if (!limit_('rl' + phone, 10, 3600)) throw new Error('ส่งคำสั่งซื้อบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
  const js = [], lines = [];
  items.forEach(function (i, n) {
    const q = Math.max(1, Math.min(999, parseInt(i.qty, 10) || 1));
    const it = { pid: clean_(i.pid, 40), vid: clean_(i.vid, 40), name: clean_(i.name, 150), label: clean_(i.label, 80), qty: q, unit: clean_(i.unit, 10) };
    js.push(it);
    lines.push((n + 1) + '. ' + it.name + (it.label ? ' (' + it.label + ')' : '') + ' x ' + q + (it.unit ? ' ' + it.unit : ''));
  });
  const id = clean_(o.orderId, 40) || Utilities.getUuid().slice(0, 8);
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const so = sheet_(SHEET_ORDERS, ORDER_HEADERS), sc = sheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS);
    if (rows_(so).some(function (r) { return str_(r.orderId) === id; })) return { ok: true, orderId: id, duplicate: true };
    const at = now_();
    const f = { province: clean_(o.prov, 60), amphoe: clean_(o.amp, 80), tambon: clean_(o.tam, 80), zip: clean_(o.zip, 5), address: clean_(o.addr, 300) };
    appendRow_(so, ORDER_HEADERS.length, [id, at, name, phone, f.province, f.amphoe, f.tambon, f.zip, f.address, clean_(o.note, 500), lines.join('\n'), JSON.stringify(js), 'ใหม่']);
    // อัปเดต/เพิ่มข้อมูลลูกค้า (อิงเบอร์โทร)
    const vals = sc.getDataRange().getValues();
    let row = -1, count = 0;
    for (let k = 1; k < vals.length; k++) {
      if (phone_(vals[k][0]) === phone) { row = k + 1; count = Number(vals[k][10]) || 0; break; }
    }
    const rec = [phone, name, f.province, f.amphoe, f.tambon, f.zip, f.address, id, at, JSON.stringify(js), String(count + 1)];
    if (row > 0) sc.getRange(row, 1, 1, rec.length).setNumberFormat('@').setValues([rec]);
    else appendRow_(sc, rec.length, rec);
    SpreadsheetApp.flush();
    return { ok: true, orderId: id };
  } finally {
    lock.releaseLock();
  }
}

// ลูกค้าเก่าดึงที่อยู่/รายการล่าสุด: ต้องตรงทั้งเบอร์โทรและชื่อ (จำกัดความพยายาม)
function lookup_(b) {
  const phone = phone_(b.phone), name = norm_(b.name);
  if (!/^\d{9,10}$/.test(phone) || !name) return { ok: true, found: false };
  if (!limit_('lk' + phone, 5, 600)) throw new Error('ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่');
  const hit = rows_(sheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS)).filter(function (r) {
    return phone_(r.phone) === phone && norm_(r.name) === name;
  })[0];
  if (!hit) return { ok: true, found: false };
  let items = [];
  try { items = JSON.parse(str_(hit.lastItemsJson) || '[]'); } catch (e) { items = []; }
  return {
    ok: true, found: true,
    customer: { name: str_(hit.name), prov: str_(hit.province), amp: str_(hit.amphoe), tam: str_(hit.tambon), zip: str_(hit.zip), addr: str_(hit.address) },
    items: items
  };
}

function listOrders_() {
  const rows = rows_(sheet_(SHEET_ORDERS, ORDER_HEADERS)).slice(-200).reverse();
  return {
    ok: true,
    orders: rows.map(function (r) {
      let items = [];
      try { items = JSON.parse(str_(r.itemsJson) || '[]'); } catch (e) { items = []; }
      return { orderId: str_(r.orderId), createdAt: str_(r.createdAt), name: str_(r.name), phone: str_(r.phone), prov: str_(r.province), amp: str_(r.amphoe), tam: str_(r.tambon), zip: str_(r.zip), addr: str_(r.address), note: str_(r.note), status: str_(r.status), items: items };
    })
  };
}

/* ---------------- รูปสินค้า -> เก็บใน Google Drive ---------------- */
function uploadImage_(dataUrl, id) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('รูปภาพไม่ถูกต้อง');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 3 * 1024 * 1024) throw new Error('รูปใหญ่เกินไป');
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const blob = Utilities.newBlob(bytes, m[1], id + '-' + Date.now() + '.' + ext);
  const f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w600';
}
function folder_() {
  const it = DriveApp.getFoldersByName(IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMAGE_FOLDER);
}

/* ---------------- ตัวช่วยเกี่ยวกับชีต ---------------- */
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}
function format_(sh, headers, textCols, checkCol) {
  const maxR = sh.getMaxRows();
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0e9');
  sh.setFrozenRows(1);
  textCols.forEach(function (h) {
    const c = headers.indexOf(h) + 1;
    if (c > 0) sh.getRange(2, c, maxR - 1, 1).setNumberFormat('@');
  });
  if (checkCol) {
    const c = headers.indexOf(checkCol) + 1;
    if (c > 0) sh.getRange(2, c, maxR - 1, 1).insertCheckboxes();
  }
}
function rows_(sh) {
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(function (x) { return String(x).trim(); });
  return v.slice(1).map(function (r) {
    const o = {};
    h.forEach(function (k, i) { o[k] = r[i]; });
    return o;
  }).filter(function (o) {
    return Object.keys(o).some(function (k) { return o[k] !== '' && o[k] != null; });
  });
}
function writeTable_(sh, headers, rows) {
  const need = rows.length + 1;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  const maxR = sh.getMaxRows();
  sh.getRange(2, 1, maxR - 1, headers.length).clearContent();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/* ---------------- ตัวช่วยแปลงค่า ---------------- */
function str_(v) { return v == null ? '' : String(v); }
function num_(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function bool_(v) {
  if (v === '' || v == null) return true; // ปล่อยว่าง = แสดง
  if (v === true || v === 1) return true;
  const s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}
function list_(s) { return str_(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
function bySort_(a, b) { return num_(a.sortOrder) - num_(b.sortOrder); }
