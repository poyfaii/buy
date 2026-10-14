// worker/index.js — หลังบ้านเว็บสั่งซื้อ "แม่ดอนรุ่งเรืองฟู้ดส์" บน Cloudflare Workers + D1
// - ก่อนกดย้ายข้อมูล: ส่งต่อทุกคำขอ /api ไปที่ Apps Script (Google Sheets) เหมือนเดิม
// - หลังกดย้ายข้อมูล: ใช้ฐานข้อมูล D1 (ตาราง SQLite) แทน — กดกลับไป Sheets ได้ในหน้าแอดมิน > ตั้งค่า
const VERSION = 'd1-v21-2026-10-13';
const ST_WAIT = 'รอจัดเตรียมและจัดส่ง', ST_SHIP = 'จัดส่งแล้ว', ST_CANCEL = 'ยกเลิก';
const ST_UNPAID = 'รอชำระเงิน', ST_PAID = 'ชำระแล้ว';
const TRACK_DAYS = 3, MAX_ITEMS = 80, SALES_TTL = 60000;
const DOC_PRE = { quote: 'QT', delivery: 'DN', receipt: 'RC', taxfull: 'INV', taxabb: 'ABB' };

/* ---------- โครงตาราง (สร้างให้อัตโนมัติเมื่อมีคำขอแรก) ---------- */
const DDL = [
 `CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, sortOrder INTEGER, name TEXT, description TEXT, note TEXT, status INTEGER, image TEXT)`,
 `CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY, productId TEXT, productName TEXT, sortOrder INTEGER, size TEXT, sizeUnit TEXT, packaging TEXT, price REAL, status INTEGER)`,
 `CREATE INDEX IF NOT EXISTS ix_var_p ON variants(productId)`,
 `CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT)`,
 `CREATE TABLE IF NOT EXISTS orders(orderId TEXT PRIMARY KEY, createdAt TEXT, name TEXT, phone TEXT, province TEXT, amphoe TEXT, tambon TEXT, zip TEXT, address TEXT, note TEXT, items TEXT, itemsJson TEXT, status TEXT, shippedAt TEXT, payStatus TEXT, paidAt TEXT, payMethod TEXT, payAmount TEXT, payNote TEXT)`,
 `CREATE INDEX IF NOT EXISTS ix_ord_phone ON orders(phone)`,
 `CREATE TABLE IF NOT EXISTS customers(phone TEXT PRIMARY KEY, name TEXT, province TEXT, amphoe TEXT, tambon TEXT, zip TEXT, address TEXT, lastOrderId TEXT, lastOrderAt TEXT, lastItemsJson TEXT, orderCount INTEGER)`,
 `CREATE TABLE IF NOT EXISTS docs(docNo TEXT PRIMARY KEY, type TEXT, orderId TEXT, issuedAt TEXT, issuedBy TEXT, status TEXT, voidedAt TEXT, voidReason TEXT, docJson TEXT)`,
 `CREATE INDEX IF NOT EXISTS ix_doc_order ON docs(orderId)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS ux_doc_active ON docs(orderId,type) WHERE status<>'ยกเลิก'`,
 `CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY, last INTEGER)`,
 `CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY, mime TEXT, data TEXT, createdAt TEXT)`,
 `CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)`,
 `CREATE TABLE IF NOT EXISTS rl(key TEXT PRIMARY KEY, n INTEGER, exp INTEGER)`
];
const COLS = {
 products: ['id', 'sortOrder', 'name', 'description', 'note', 'status', 'image'],
 variants: ['id', 'productId', 'productName', 'sortOrder', 'size', 'sizeUnit', 'packaging', 'price', 'status'],
 settings: ['key', 'value'],
 customers: ['phone', 'name', 'province', 'amphoe', 'tambon', 'zip', 'address', 'lastOrderId', 'lastOrderAt', 'lastItemsJson', 'orderCount'],
 orders: ['orderId', 'createdAt', 'name', 'phone', 'province', 'amphoe', 'tambon', 'zip', 'address', 'note', 'items', 'itemsJson', 'status', 'shippedAt', 'payStatus', 'paidAt', 'payMethod', 'payAmount', 'payNote'],
 docs: ['docNo', 'type', 'orderId', 'issuedAt', 'issuedBy', 'status', 'voidedAt', 'voidReason', 'docJson'],
 counters: ['key', 'last']
};
// ตารางที่ย้าย: ขนาดช่วงที่ดึงต่อครั้ง (docs มีเนื้อหาเอกสารเต็ม จึงดึงน้อยกว่า)
const PLAN = [['products', 200], ['variants', 200], ['settings', 100], ['customers', 200], ['orders', 120], ['docs', 25], ['counters', 100]];

/* ---------- ตัวช่วย ---------- */
const str = v => v == null ? '' : String(v);
const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
const boolv = v => { if (v === '' || v == null) return true; if (v === true || v === 1) return true; const s = String(v).trim().toUpperCase(); return s === 'TRUE' || s === '1' || s === 'YES'; };
const clean = (v, max) => { const s = str(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim(); return s.length > max ? s.slice(0, max) : s; };
const phoneOf = v => { let d = str(v).replace(/\D/g, ''); if (d.length === 11 && d.indexOf('66') === 0) d = '0' + d.slice(2); return d; };
const normName = v => str(v).replace(/\s+/g, '').toLowerCase().replace(/^(คุณ|นางสาว|น\.ส\.|นาย|นาง)/, '');
const bkk = () => new Date(Date.now() + 7 * 3600e3);
const nowStr = () => bkk().toISOString().slice(0, 19).replace('T', ' ');
const priceOf = v => { if (v === '' || v == null) return ''; const n = Number(v); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : ''; };
const stKey = s => { s = str(s).trim(); return s === ST_SHIP ? 'ship' : s === ST_CANCEL ? 'cancel' : 'wait'; };
const stText = s => { const k = stKey(s); return k === 'ship' ? ST_SHIP : k === 'cancel' ? ST_CANCEL : ST_WAIT; };
const payText = v => str(v).trim() === ST_PAID ? ST_PAID : ST_UNPAID;
const tsOf = v => { const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(str(v)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +m[6]) : 0; };
const parseItems = t => { try { const a = JSON.parse(str(t) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const parseSnap = t => { try { const o = JSON.parse(str(t)); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
const bySort = (a, b) => num(a.sortOrder) - num(b.sortOrder);
const listOf = s => str(s).split(',').map(x => x.trim()).filter(Boolean);
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const json = (o, cache) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': cache || 'no-store' } });
const fail = m => { const e = new Error(m); return e; };

const stmt = (env, sql, ...p) => env.DB.prepare(sql).bind(...p.map(x => x === undefined ? null : x));
const all = async (env, sql, ...p) => (await stmt(env, sql, ...p).all()).results || [];
const one = async (env, sql, ...p) => (await all(env, sql, ...p))[0] || null;

let schemaOk = false, modeMemo = null;
async function ensureSchema(env) {
 if (schemaOk) return;
 await env.DB.batch(DDL.map(s => env.DB.prepare(s)));
 schemaOk = true;
}
async function metaGet(env, k) { const r = await one(env, 'SELECT value FROM meta WHERE key=?', k); return r ? r.value : null; }
async function getMode(env) {
 if (!env.DB) return 'sheets';
 if (modeMemo && Date.now() - modeMemo.at < 5000) return modeMemo.v;
 await ensureSchema(env);
 const v = (await metaGet(env, 'migrated')) === '1' ? 'd1' : 'sheets';
 modeMemo = { v, at: Date.now() };
 return v;
}
const setModeMemo = v => { modeMemo = { v, at: Date.now() }; };

// จำกัดจำนวนครั้ง (กันยิงซ้ำ/เดารหัส) — ใช้ตาราง rl
async function hit(env, key, secs) {
 const t = Math.floor(Date.now() / 1000);
 if (Math.random() < 0.02) await stmt(env, 'DELETE FROM rl WHERE exp<?', t).run();
 const r = await one(env, `INSERT INTO rl(key,n,exp) VALUES(?1,1,?2) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN rl.exp<?3 THEN 1 ELSE rl.n+1 END, exp=CASE WHEN rl.exp<?3 THEN ?2 ELSE rl.exp END RETURNING n`, key, t + secs, t);
 return r.n;
}
async function limit(env, key, max, secs) { return (await hit(env, key, secs)) <= max; }

/* ---------- รหัสแอดมิน ---------- */
async function sha(text) {
 const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
 return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function credOk(env, b) {
 if (!b || typeof b.user !== 'string' || typeof b.pass !== 'string') return false;
 if (env.ADMIN_USER && env.ADMIN_PASS) return b.user === env.ADMIN_USER && b.pass === env.ADMIN_PASS;
 const [u, salt, h] = await Promise.all([metaGet(env, 'admin_user'), metaGet(env, 'admin_salt'), metaGet(env, 'admin_hash')]);
 if (!u || !salt || !h) return false;
 return b.user === u && (await sha(salt + ':' + b.user + ':' + b.pass)) === h;
}
async function checkAuth(env, b) {
 const t = Math.floor(Date.now() / 1000);
 const r = await one(env, "SELECT n FROM rl WHERE key='authfail' AND exp>=?", t);
 const n = r ? r.n : 0;
 if (n >= 8) throw fail('ลองรหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
 if (!(await credOk(env, b))) { await hit(env, 'authfail', 900); throw fail('unauthorized'); }
 if (n > 0) await stmt(env, "DELETE FROM rl WHERE key='authfail'").run();
}

/* ---------- เขียนหลายแถวด้วย json_each (จำกัดตัวแปรต่อคำสั่ง D1 ที่ 100 ตัว) ---------- */
function insJson(env, table, rows, verb) {
 const cols = COLS[table], out = [];
 let cur = [], size = 0;
 const flush = () => {
  if (!cur.length) return;
  out.push(stmt(env, `${verb || 'INSERT OR REPLACE'} INTO ${table}(${cols.join(',')}) SELECT ${cols.map(c => `json_extract(value,'$.${c}')`).join(',')} FROM json_each(?1)`, JSON.stringify(cur)));
  cur = []; size = 0;
 };
 for (const r of rows) {
  const s = JSON.stringify(r).length * 3;
  if (size + s > 60000) flush();
  cur.push(r); size += s;
 }
 flush();
 return out;
}

/* ---------- ยอดขาย/สินค้าขายดี (แคชในตาราง meta 60 วินาที ล้างทันทีเมื่อมีออเดอร์ใหม่) ---------- */
const dropSales = env => stmt(env, "DELETE FROM meta WHERE key='sales'");
async function getSales(env) {
 const c = await metaGet(env, 'sales');
 if (c) { try { const o = JSON.parse(c); if (Date.now() - o.at < SALES_TTL) return o; } catch (e) { /* คำนวณใหม่ */ } }
 const from = `FROM orders o, json_each(CASE WHEN json_valid(o.itemsJson) THEN o.itemsJson ELSE '[]' END) j WHERE trim(o.status)<>'ยกเลิก' AND json_extract(j.value,'$.pid') IS NOT NULL AND json_extract(j.value,'$.pid')<>''`;
 const [a, b] = await env.DB.batch([
  env.DB.prepare(`SELECT json_extract(j.value,'$.pid') pid, COUNT(DISTINCT o.orderId) n, SUM(COALESCE(json_extract(j.value,'$.qty'),0)) q ${from} GROUP BY pid ORDER BY MIN(o.rowid), MIN(j.id)`),
  env.DB.prepare(`SELECT json_extract(j.value,'$.pid') pid, COALESCE(NULLIF(trim(json_extract(j.value,'$.unit')),''),'ชิ้น') unit, SUM(COALESCE(json_extract(j.value,'$.qty'),0)) q ${from} GROUP BY pid, unit`)
 ]);
 const m = {}, order = [];
 (a.results || []).forEach(r => { const id = String(r.pid); m[id] = { n: r.n, q: num(r.q), u: {} }; order.push(id); });
 (b.results || []).forEach(r => { const x = m[String(r.pid)]; if (x) x.u[r.unit] = num(r.q); });
 const sales = {};
 order.forEach(id => { sales[id] = { n: m[id].n, u: m[id].u }; });
 const top = order.slice().sort((x, y) => m[y].n - m[x].n || m[y].q - m[x].q).slice(0, 6);
 const o = { top, sales, at: Date.now() };
 await stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('sales',?)", JSON.stringify(o)).run();
 return o;
}

/* ---------- อ่านสินค้า ---------- */
async function readAll(env, admin) {
 const [rp, rv, rs] = await env.DB.batch([
  env.DB.prepare('SELECT * FROM products ORDER BY sortOrder, rowid'),
  env.DB.prepare('SELECT * FROM variants ORDER BY sortOrder, rowid'),
  env.DB.prepare('SELECT key,value FROM settings')
 ]);
 const byP = {};
 (rv.results || []).forEach(r => {
  if (!r.productId || !r.id) return;
  (byP[r.productId] = byP[r.productId] || []).push({ id: r.id, size: str(r.size), sizeUnit: str(r.sizeUnit), packaging: str(r.packaging), price: r.price == null ? '' : Number(r.price), status: !!r.status, sortOrder: num(r.sortOrder) });
 });
 let products = (rp.results || []).filter(r => r.id && str(r.name).trim()).map(r => ({
  id: r.id, name: str(r.name).trim(), description: str(r.description), note: str(r.note), image: str(r.image), status: !!r.status, sortOrder: num(r.sortOrder),
  variants: (byP[r.id] || []).sort(bySort)
 })).sort(bySort);
 if (!admin) {
  products = products.filter(p => p.status).map(p => {
   const active = p.variants.filter(v => v.status).map(v => ({ id: v.id, size: v.size, sizeUnit: v.sizeUnit, packaging: v.packaging, status: true, sortOrder: v.sortOrder, price: v.price }));
   if (p.variants.length && !active.length) return null;
   return { id: p.id, name: p.name, description: p.description, note: p.note, image: p.image, status: true, sortOrder: p.sortOrder, variants: active };
  }).filter(Boolean);
 }
 const st = {};
 (rs.results || []).forEach(r => { st[r.key] = str(r.value); });
 const s = await getSales(env);
 return { ok: true, fbUrl: st.fbUrl || '', showPrice: true, units: listOf(st.units), packs: listOf(st.packs), products, top: admin ? [] : s.top, sales: s.sales };
}

/* ---------- บันทึกสินค้า (แอดมิน) ---------- */
async function saveAll(env, data) {
 if (!data || !Array.isArray(data.products)) throw fail('ข้อมูลไม่ถูกต้อง');
 if (!data.products.length && !data.allowEmpty) throw fail('ไม่บันทึกรายการสินค้าว่าง');
 const images = {}, prows = [], vrows = [], imgStmts = [];
 let k = 0;
 data.products.slice().sort(bySort).forEach((p, i) => {
  const id = str(p.id) || uid();
  let img = str(p.image);
  if (img.indexOf('data:') === 0) {
   const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(img);
   if (!m) throw fail('รูปภาพไม่ถูกต้อง');
   if (m[2].length > 2000000) throw fail('รูปใหญ่เกินไป (ย่อรูปก่อนอัปโหลด)');
   const iid = id + '-' + Date.now().toString(36) + (k++);
   imgStmts.push(stmt(env, 'INSERT OR REPLACE INTO images(id,mime,data,createdAt) VALUES(?,?,?,?)', iid, m[1], m[2], nowStr()));
   img = '/api/img/' + iid; images[id] = img;
  }
  prows.push({ id, sortOrder: i, name: str(p.name).trim(), description: str(p.description), note: str(p.note), status: p.status !== false ? 1 : 0, image: img });
  (p.variants || []).slice().sort(bySort).forEach((v, j) => {
   const price = v.price === '' || v.price == null || isNaN(Number(v.price)) ? null : Number(v.price);
   vrows.push({ id: str(v.id) || (id + 'v' + (j + 1)), productId: id, productName: str(p.name).trim(), sortOrder: j, size: str(v.size), sizeUnit: str(v.sizeUnit), packaging: str(v.packaging), price, status: v.status !== false ? 1 : 0 });
  });
 });
 const setRows = [{ key: 'fbUrl', value: str(data.fbUrl) }, { key: 'units', value: (data.units || []).join(',') }, { key: 'packs', value: (data.packs || []).join(',') }];
 await env.DB.batch([
  stmt(env, 'DELETE FROM variants'), stmt(env, 'DELETE FROM products'), stmt(env, 'DELETE FROM settings'),
  ...insJson(env, 'products', prows), ...insJson(env, 'variants', vrows), ...insJson(env, 'settings', setRows),
  ...imgStmts,
  stmt(env, "DELETE FROM images WHERE '/api/img/'||id NOT IN (SELECT image FROM products WHERE image IS NOT NULL)")
 ]);
 return { ok: true, images };
}

/* ---------- คำสั่งซื้อ ---------- */
async function saveOrder(env, o) {
 o = o || {};
 const phone = phoneOf(o.phone), name = clean(o.name, 100);
 if (!name || !/^\d{9,10}$/.test(phone)) throw fail('ข้อมูลผู้สั่งไม่ครบ');
 const items = Array.isArray(o.items) ? o.items.slice(0, MAX_ITEMS) : [];
 if (!items.length) throw fail('ไม่มีรายการสินค้า');
 if (!(await limit(env, 'rl' + phone, 10, 3600))) throw fail('ส่งคำสั่งซื้อบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
 const js = [], lines = [];
 items.forEach((i, n) => {
  const q = Math.max(1, Math.min(999, parseInt(i.qty, 10) || 1));
  const it = { pid: clean(i.pid, 40), vid: clean(i.vid, 40), name: clean(i.name, 150), label: clean(i.label, 80), qty: q, unit: clean(i.unit, 10), price: priceOf(i.price) };
  js.push(it);
  lines.push((n + 1) + '. ' + it.name + (it.label ? ' (' + it.label + ')' : '') + ' x ' + q + (it.unit ? ' ' + it.unit : ''));
 });
 const id = clean(o.orderId, 40) || uid();
 if (await one(env, 'SELECT 1 x FROM orders WHERE orderId=?', id)) return { ok: true, orderId: id, duplicate: true };
 const at = nowStr();
 const f = { province: clean(o.prov, 60), amphoe: clean(o.amp, 80), tambon: clean(o.tam, 80), zip: clean(o.zip, 5), address: clean(o.addr, 300) };
 const itemsJson = JSON.stringify(js);
 try {
  await env.DB.batch([
   stmt(env, `INSERT INTO orders(orderId,createdAt,name,phone,province,amphoe,tambon,zip,address,note,items,itemsJson,status,shippedAt,payStatus,paidAt,payMethod,payAmount,payNote) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,'','','','')`,
    id, at, name, phone, f.province, f.amphoe, f.tambon, f.zip, f.address, clean(o.note, 500), lines.join('\n'), itemsJson, ST_WAIT, ST_UNPAID),
   stmt(env, `INSERT INTO customers(phone,name,province,amphoe,tambon,zip,address,lastOrderId,lastOrderAt,lastItemsJson,orderCount) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,1)
    ON CONFLICT(phone) DO UPDATE SET name=?2,province=?3,amphoe=?4,tambon=?5,zip=?6,address=?7,lastOrderId=?8,lastOrderAt=?9,lastItemsJson=?10,orderCount=COALESCE(customers.orderCount,0)+1`,
    phone, name, f.province, f.amphoe, f.tambon, f.zip, f.address, id, at, itemsJson),
   dropSales(env)
  ]);
 } catch (e) {
  if (/UNIQUE|constraint/i.test(String(e && e.message))) return { ok: true, orderId: id, duplicate: true };
  throw e;
 }
 return { ok: true, orderId: id };
}
async function lookup(env, b) {
 const phone = phoneOf(b.phone), name = normName(b.name);
 if (!/^\d{9,10}$/.test(phone) || !name) return { ok: true, found: false };
 if (!(await limit(env, 'lk' + phone, 5, 600))) throw fail('ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่');
 const hitc = await one(env, 'SELECT * FROM customers WHERE phone=?', phone);
 if (!hitc || normName(hitc.name) !== name) return { ok: true, found: false };
 const items = parseItems(hitc.lastItemsJson);
 const rows = await all(env, "SELECT orderId,createdAt,itemsJson FROM orders WHERE phone=? AND trim(status)<>'ยกเลิก' ORDER BY rowid DESC LIMIT 3", phone);
 const history = rows.map(r => ({ orderId: r.orderId, createdAt: r.createdAt, items: parseItems(r.itemsJson) })).filter(h => h.items.length);
 if (!history.length && items.length) history.push({ orderId: str(hitc.lastOrderId), createdAt: str(hitc.lastOrderAt), items });
 return { ok: true, found: true, customer: { name: str(hitc.name), prov: str(hitc.province), amp: str(hitc.amphoe), tam: str(hitc.tambon), zip: str(hitc.zip), addr: str(hitc.address) }, items: history.length ? history[0].items : items, history };
}
async function track(env, b) {
 const phone = phoneOf(b.phone), name = normName(b.name);
 if (!/^\d{9,10}$/.test(phone) || !name) return { ok: true, found: false, orders: [] };
 if (!(await limit(env, 'tk' + phone, 20, 600))) throw fail('ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่');
 const since = Date.now() - TRACK_DAYS * 86400000;
 const rows = await all(env, 'SELECT * FROM orders WHERE phone=? ORDER BY rowid DESC LIMIT 60', phone);
 const orders = rows.filter(r => normName(r.name) === name && stKey(r.status) !== 'cancel' && tsOf(r.createdAt) >= since).slice(0, 10)
  .map(r => ({ orderId: r.orderId, createdAt: r.createdAt, name: str(r.name), phone, status: stText(r.status), shippedAt: str(r.shippedAt), payStatus: payText(r.payStatus), items: parseItems(r.itemsJson) }));
 return { ok: true, found: orders.length > 0, orders, days: TRACK_DAYS };
}
async function setStatus(env, b) {
 const id = clean(b.orderId, 40), ship = b.status === 'ship';
 if (!id) throw fail('ไม่พบเลขที่คำสั่งซื้อ');
 const r = await one(env, 'SELECT status,shippedAt,itemsJson FROM orders WHERE orderId=?', id);
 if (!r) throw fail('ไม่พบคำสั่งซื้อนี้');
 const was = stKey(r.status);
 let shippedAt = str(r.shippedAt);
 if (ship && (was !== 'ship' || !shippedAt)) shippedAt = nowStr();
 if (!ship) shippedAt = '';
 let items = parseItems(r.itemsJson);
 if (Array.isArray(b.prices)) items.forEach((it, n) => { it.price = priceOf(b.prices[n]); });
 await env.DB.batch([
  stmt(env, 'UPDATE orders SET status=?,shippedAt=?,itemsJson=? WHERE orderId=?', ship ? ST_SHIP : ST_WAIT, shippedAt, Array.isArray(b.prices) ? JSON.stringify(items) : str(r.itemsJson), id),
  dropSales(env)
 ]);
 return { ok: true, orderId: id, status: ship ? ST_SHIP : ST_WAIT, shippedAt, items };
}
async function setPay(env, b) {
 const id = clean(b.orderId, 40), paid = b.pay === 'paid';
 if (!id) throw fail('ไม่พบเลขที่คำสั่งซื้อ');
 if (!(await one(env, 'SELECT 1 x FROM orders WHERE orderId=?', id))) throw fail('ไม่พบคำสั่งซื้อนี้');
 const d = /^\d{4}-\d{2}-\d{2}$/.test(str(b.paidAt)) ? str(b.paidAt) : nowStr().slice(0, 10);
 const amt = str(priceOf(b.amount)), method = paid ? clean(b.method, 40) : '', note = paid ? clean(b.note, 200) : '';
 await stmt(env, 'UPDATE orders SET payStatus=?,paidAt=?,payMethod=?,payAmount=?,payNote=? WHERE orderId=?', paid ? ST_PAID : ST_UNPAID, paid ? d : '', method, paid ? amt : '', note, id).run();
 return { ok: true, orderId: id, payStatus: paid ? ST_PAID : ST_UNPAID, paidAt: paid ? d : '', payMethod: method, payAmount: paid ? amt : '', payNote: note };
}
async function listOrders(env) {
 const rows = await all(env, 'SELECT * FROM orders ORDER BY rowid DESC LIMIT 200');
 return { ok: true, orders: rows.map(r => ({ orderId: r.orderId, createdAt: str(r.createdAt), name: str(r.name), phone: str(r.phone), prov: str(r.province), amp: str(r.amphoe), tam: str(r.tambon), zip: str(r.zip), addr: str(r.address), note: str(r.note), status: stText(r.status), shippedAt: str(r.shippedAt), payStatus: payText(r.payStatus), paidAt: str(r.paidAt), payMethod: str(r.payMethod), payAmount: str(r.payAmount), payNote: str(r.payNote), items: parseItems(r.itemsJson) })) };
}

/* ---------- เลขที่เอกสาร: แจกเลขในธุรกรรมเดียว (เลขกับทะเบียนสำเร็จพร้อมกัน ไม่มีเลขข้าม/ซ้ำ) ---------- */
async function issueDoc(env, type, orderId, by, snap) {
 const pre = DOC_PRE[str(type)], id = clean(orderId, 40);
 if (!pre) throw fail('ประเภทเอกสารไม่ถูกต้อง');
 if (!id) throw fail('ไม่พบเลขที่คำสั่งซื้อ');
 for (let attempt = 0; attempt < 4; attempt++) {
  const ex = await one(env, "SELECT * FROM docs WHERE orderId=? AND type=? AND status<>'ยกเลิก'", id, type);
  if (ex) {
   let sn = parseSnap(ex.docJson);
   if (!sn && snap && typeof snap === 'object') {
    const js = JSON.stringify(Object.assign({}, snap, { no: ex.docNo }));
    if (js.length < 100000) { await stmt(env, 'UPDATE docs SET docJson=? WHERE docNo=?', js, ex.docNo).run(); sn = JSON.parse(js); }
   }
   return { ok: true, no: ex.docNo, existed: true, issuedAt: str(ex.issuedAt), snapshot: sn };
  }
  const d = bkk(), yy = String(d.getUTCFullYear() + 543).slice(-2), mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const key = pre + yy + mm;
  const mx = await one(env, 'SELECT MAX(CAST(substr(docNo,?) AS INTEGER)) m FROM docs WHERE docNo LIKE ?', key.length + 2, key + '-%');
  const base = (mx && mx.m) || 0;
  let js = '';
  if (snap && typeof snap === 'object') { js = JSON.stringify(Object.assign({}, snap, { no: '' })); if (js.length >= 100000) js = ''; }
  const at = nowStr();
  try {
   const r = await env.DB.batch([
    stmt(env, 'INSERT INTO counters(key,last) VALUES(?1,?2+1) ON CONFLICT(key) DO UPDATE SET last=MAX(last,?2)+1', key, base),
    stmt(env, `INSERT INTO docs(docNo,type,orderId,issuedAt,issuedBy,status,voidedAt,voidReason,docJson)
     SELECT ?1||'-'||printf('%04d',last), ?2, ?3, ?4, ?5, 'ใช้งาน', '', '', CASE WHEN ?6='' THEN '' ELSE json_set(?6,'$.no',?1||'-'||printf('%04d',last)) END FROM counters WHERE key=?1`,
     key, type, id, at, by || '', js),
    stmt(env, "SELECT docNo,docJson FROM docs WHERE orderId=? AND type=? AND status<>'ยกเลิก'", id, type)
   ]);
   const row = (r[2].results || [])[0];
   return { ok: true, no: row.docNo, existed: false, issuedAt: at, snapshot: parseSnap(row.docJson) };
  } catch (e) {
   if (/UNIQUE|constraint/i.test(String(e && e.message))) continue; // มีคนออกใบเดียวกันพร้อมกัน → ย้อนไปใช้เลขที่เพิ่งออก
   throw e;
  }
 }
 throw fail('ระบบกำลังยุ่ง กรุณาลองใหม่อีกครั้ง');
}
async function publicDocNo(env, b) {
 const type = str(b.type), id = clean(b.orderId, 40), phone = phoneOf(b.phone), name = normName(b.name);
 if (type !== 'quote' && type !== 'taxabb') throw fail('ประเภทเอกสารไม่ถูกต้อง');
 if (!id || !/^\d{9,10}$/.test(phone) || !name) throw fail('ไม่พบคำสั่งซื้อนี้');
 if (!(await limit(env, 'dn' + phone, 30, 600))) throw fail('ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่');
 const o = await one(env, 'SELECT * FROM orders WHERE orderId=?', id);
 if (!o || phoneOf(o.phone) !== phone || normName(o.name) !== name || stKey(o.status) === 'cancel') throw fail('ไม่พบคำสั่งซื้อนี้');
 if (type === 'taxabb' && stKey(o.status) !== 'ship') throw fail('ใบกำกับภาษีอย่างย่อออกได้เมื่อสถานะเป็นจัดส่งแล้ว');
 let snap = null;
 if (type === 'taxabb') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(o.shippedAt));
  snap = { type: 'taxabb', no: '', date: m ? m[3] + '/' + m[2] + '/' + m[1] : '', stamp: true, buyer: { name: str(o.name), tel: phone }, lines: parseItems(o.itemsJson).map(i => ({ name: str(i.name), label: str(i.label), qty: i.qty, unit: str(i.unit), price: i.price })) };
 }
 return issueDoc(env, type, id, 'customer', snap);
}
async function voidDoc(env, b) {
 const no = clean(b.docNo, 40), why = clean(b.reason, 200);
 if (!no) throw fail('ไม่พบเลขที่เอกสาร');
 const r = await stmt(env, "UPDATE docs SET status='ยกเลิก',voidedAt=?,voidReason=? WHERE docNo=?", nowStr(), why, no).run();
 if (!r.meta || !r.meta.changes) throw fail('ไม่พบเลขที่เอกสารนี้');
 return { ok: true, docNo: no };
}
const slimSnap = s => { if (!s) return null; const b = s.buyer || {}; return { date: s.date || '', buyer: { name: b.name || '', taxId: b.taxId || '' }, lines: (s.lines || []).map(l => ({ qty: l.qty, price: l.price })) }; };
async function listDocs(env, b) {
 const id = clean(b && b.orderId, 40);
 const rows = id ? await all(env, 'SELECT * FROM docs WHERE orderId=? ORDER BY rowid DESC LIMIT 300', id) : await all(env, 'SELECT * FROM docs ORDER BY rowid DESC LIMIT 300');
 return { ok: true, docs: rows.map(r => ({ no: r.docNo, type: str(r.type), orderId: str(r.orderId), issuedAt: str(r.issuedAt), issuedBy: str(r.issuedBy), status: str(r.status) || 'ใช้งาน', voidedAt: str(r.voidedAt), reason: str(r.voidReason), snapshot: id ? parseSnap(r.docJson) : slimSnap(parseSnap(r.docJson)) })) };
}

/* ---------- สถานะระบบ / สำรอง ---------- */
async function diag(env) {
 const c = async t => (await one(env, `SELECT COUNT(*) n FROM ${t}`)).n;
 return { ok: true, version: VERSION, mode: 'D1', products: await c('products'), variants: await c('variants'), orders: await c('orders'), customers: await c('customers'), missing: [] };
}
async function backupAll(env) {
 const out = { ok: true, version: VERSION, at: nowStr() };
 for (const [t] of PLAN) out[t] = await all(env, `SELECT * FROM ${t}`);
 out.images = await all(env, 'SELECT * FROM images');
 return out;
}
async function dbinfo(env) {
 const info = { ok: true, version: VERSION, hasDB: !!env.DB, hasApps: !!env.APPS_URL, mode: 'sheets', migratedAt: '' };
 if (env.DB) { info.mode = await getMode(env); info.migratedAt = (await metaGet(env, 'migratedAt')) || ''; }
 return info;
}

/* ---------- ย้ายข้อมูลจาก Google Sheets (ทำทีละช่วง เพื่อไม่ให้หนักเกินโควตา Workers) ---------- */
async function appsCall(env, body) {
 if (!env.APPS_URL) throw fail('ยังไม่ได้ตั้งค่า APPS_URL ในไฟล์ wrangler.jsonc');
 const r = await fetch(env.APPS_URL, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
 let j;
 try { j = await r.json(); } catch (e) { throw fail('Apps Script ตอบกลับผิดปกติ — ตรวจ URL (APPS_URL) และการ Deploy'); }
 if (!j || !j.ok) {
  const m = (j && j.error) || '';
  throw fail(m === 'unknown action' ? 'Apps Script ยังเป็น Code.gs เวอร์ชันเก่า — วาง Code.gs v21 แล้ว Deploy เป็นเวอร์ชันใหม่ก่อน' : m === 'unauthorized' ? 'unauthorized' : (m || 'Apps Script ผิดพลาด'));
 }
 return j;
}
const normRow = {
 products: r => ({ id: str(r.id).trim(), sortOrder: num(r.sortOrder), name: str(r.name).trim(), description: str(r.description), note: str(r.note), status: boolv(r.status) ? 1 : 0, image: str(r.image) }),
 variants: r => ({ id: str(r.id).trim(), productId: str(r.productId).trim(), productName: str(r.productName), sortOrder: num(r.sortOrder), size: str(r.size), sizeUnit: str(r.sizeUnit), packaging: str(r.packaging), price: r.price === '' || r.price == null || isNaN(Number(r.price)) ? null : Number(r.price), status: boolv(r.status) ? 1 : 0 }),
 settings: r => ({ key: str(r.key), value: str(r.value) }),
 customers: r => ({ phone: phoneOf(r.phone), name: str(r.name), province: str(r.province), amphoe: str(r.amphoe), tambon: str(r.tambon), zip: str(r.zip), address: str(r.address), lastOrderId: str(r.lastOrderId), lastOrderAt: str(r.lastOrderAt), lastItemsJson: str(r.lastItemsJson), orderCount: num(r.orderCount) }),
 orders: r => ({ orderId: str(r.orderId).trim(), createdAt: str(r.createdAt), name: str(r.name), phone: phoneOf(r.phone), province: str(r.province), amphoe: str(r.amphoe), tambon: str(r.tambon), zip: str(r.zip), address: str(r.address), note: str(r.note), items: str(r.items), itemsJson: str(r.itemsJson) || '[]', status: stText(r.status), shippedAt: str(r.shippedAt), payStatus: payText(r.payStatus), paidAt: str(r.paidAt), payMethod: str(r.payMethod), payAmount: str(r.payAmount), payNote: str(r.payNote) }),
 docs: r => ({ docNo: str(r.docNo).trim(), type: str(r.type), orderId: str(r.orderId), issuedAt: str(r.issuedAt), issuedBy: str(r.issuedBy), status: str(r.status).trim() === 'ยกเลิก' ? 'ยกเลิก' : 'ใช้งาน', voidedAt: str(r.voidedAt), voidReason: str(r.voidReason), docJson: str(r.docJson) }),
 counters: r => ({ key: str(r.key).trim(), last: num(r.last) })
};
const keyOf = { products: 'id', variants: 'id', settings: 'key', customers: 'phone', orders: 'orderId', docs: 'docNo', counters: 'key' };
async function migrate(env, b, mode) {
 if (!env.DB) throw fail('ยังไม่ได้ผูกฐานข้อมูล D1 กับเว็บ (ดูคู่มือขั้นตอนที่ 2–3)');
 if (mode === 'd1') throw fail('ย้ายข้อมูลแล้ว — ถ้าจะย้ายใหม่ ให้กด "กลับไปใช้ Google Sheets" ก่อน');
 const cred = { user: b.user, pass: b.pass };
 const phase = b.phase;
 if (phase === 'begin') {
  const info = await appsCall(env, Object.assign({ action: 'exportAll', part: 'info' }, cred)); // ตรวจรหัสผ่านกับ Apps Script
  await env.DB.batch(['products', 'variants', 'settings', 'customers', 'orders', 'docs', 'counters'].map(t => stmt(env, `DELETE FROM ${t}`)).concat([dropSales(env)]));
  return { ok: true, counts: info.counts, plan: PLAN.map(([table, chunk]) => ({ table, chunk, total: info.counts[table] || 0 })) };
 }
 if (phase === 'part') {
  const t = str(b.table), p = PLAN.find(x => x[0] === t);
  if (!p) throw fail('ไม่รู้จักตาราง');
  const j = await appsCall(env, Object.assign({ action: 'exportAll', table: t, from: num(b.from), count: p[1] }, cred));
  let rows = (j.rows || []).map(normRow[t]).filter(r => r[keyOf[t]]);
  if (t === 'variants') rows = rows.filter(r => r.productId);
  if (t === 'products') rows = rows.filter(r => r.name);
  const st = rows.length ? insJson(env, t, rows, t === 'docs' ? 'INSERT OR IGNORE' : 'INSERT OR REPLACE') : [];
  if (st.length) await env.DB.batch(st);
  return { ok: true, table: t, from: num(b.from), got: (j.rows || []).length, saved: rows.length, total: j.total };
 }
 if (phase === 'finish') {
  const info = await appsCall(env, Object.assign({ action: 'exportAll', part: 'info' }, cred)); // ยืนยันรหัสผ่านอีกครั้งก่อนสลับระบบ
  const cnt = {};
  for (const [t] of PLAN) cnt[t] = (await one(env, `SELECT COUNT(*) n FROM ${t}`)).n;
  for (const t of ['orders', 'docs', 'customers']) if (info.counts[t] > 0 && cnt[t] === 0) throw fail('ย้ายไม่สำเร็จ: ตาราง ' + t + ' ว่าง — ลองกดย้ายใหม่อีกครั้ง');
  const salt = uid() + uid(), h = await sha(salt + ':' + str(b.user) + ':' + str(b.pass));
  const at = nowStr();
  await env.DB.batch([
   stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('admin_user',?)", str(b.user)),
   stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('admin_salt',?)", salt),
   stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('admin_hash',?)", h),
   stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('migratedAt',?)", at),
   stmt(env, "DELETE FROM rl WHERE key='authfail'"),
   dropSales(env),
   stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('migrated','1')")
  ]);
  setModeMemo('d1');
  const warn = [];
  for (const [t] of PLAN) if ((info.counts[t] || 0) !== cnt[t]) warn.push(t + ': ชีต ' + (info.counts[t] || 0) + ' → D1 ' + cnt[t]);
  return { ok: true, counts: cnt, warn, migratedAt: at };
 }
 throw fail('unknown action');
}
async function rollback(env) {
 await stmt(env, "INSERT OR REPLACE INTO meta(key,value) VALUES('migrated','0')").run();
 setModeMemo('sheets');
 return { ok: true };
}

/* ---------- ส่งต่อไป Apps Script (ก่อนย้ายข้อมูล) ---------- */
async function proxy(env, request, url, text) {
 if (!env.APPS_URL) return json({ ok: false, error: 'ยังไม่ได้ตั้งค่า APPS_URL ในไฟล์ wrangler.jsonc' });
 let r;
 if (request.method === 'POST') r = await fetch(env.APPS_URL, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: text, redirect: 'follow' });
 else r = await fetch(env.APPS_URL + (env.APPS_URL.includes('?') ? '&' : '?') + url.searchParams.toString(), { redirect: 'follow' });
 return new Response(await r.text(), { headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' } });
}

/* ---------- ทางเข้า ---------- */
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  try {
   if (url.pathname.startsWith('/api/img/')) {
    if (!env.DB) return new Response('Not found', { status: 404 });
    await ensureSchema(env);
    const r = await one(env, 'SELECT mime,data FROM images WHERE id=?', decodeURIComponent(url.pathname.slice(9)));
    if (!r) return new Response('Not found', { status: 404 });
    const bin = atob(r.data), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Response(buf, { headers: { 'content-type': r.mime, 'cache-control': 'public, max-age=31536000, immutable' } });
   }
   let b = null, text = '', action;
   if (request.method === 'POST') { text = await request.text(); b = JSON.parse(text); action = b && b.action; }
   else action = url.searchParams.get('action') || 'list';
   if (action === 'dbinfo') return json(await dbinfo(env));
   const mode = await getMode(env);
   if (action === 'migrate') return json(await migrate(env, b, mode));
   if (mode === 'sheets') return proxy(env, request, url, text);
   // ---- โหมด D1 ----
   if (request.method !== 'POST') {
    if (action === 'list') return json(await readAll(env, false), 'public, max-age=10');
    if (action === 'sales') { const s = await getSales(env); return json({ ok: true, top: s.top, sales: s.sales }, 'public, max-age=10'); }
    if (action === 'ping') return json({ ok: true, version: VERSION, db: 'd1', features: ['sales', 'history3', 'price-always', 'variant-names', 'track', 'status', 'docno', 'docsnap', 'pay', 'export', 'd1'] });
    return json({ ok: false, error: 'unknown action' });
   }
   if (action === 'order') return json(await saveOrder(env, b.order));
   if (action === 'lookup') return json(await lookup(env, b));
   if (action === 'track') return json(await track(env, b));
   if (action === 'docNo') return json(await publicDocNo(env, b));
   await checkAuth(env, b);
   switch (action) {
    case 'login': return json({ ok: true });
    case 'listAll': return json(await readAll(env, true));
    case 'save': return json(await saveAll(env, b.data));
    case 'listOrders': return json(await listOrders(env));
    case 'setStatus': return json(await setStatus(env, b));
    case 'setPay': return json(await setPay(env, b));
    case 'issueDoc': return json(await issueDoc(env, b.type, b.orderId, 'admin', b.snapshot));
    case 'voidDoc': return json(await voidDoc(env, b));
    case 'listDocs': return json(await listDocs(env, b));
    case 'diag': return json(await diag(env));
    case 'backup': return json(await backupAll(env));
    case 'rollback': return json(await rollback(env));
   }
   return json({ ok: false, error: 'unknown action' });
  } catch (err) {
   return json({ ok: false, error: String((err && err.message) || err) });
  }
 }
};
