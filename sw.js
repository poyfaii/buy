/* เก็บหน้าเว็บไว้ในเครื่อง เพื่อเปิดแอปได้ตอนไม่มีเน็ต (network-first: มีเน็ตใช้ของใหม่เสมอ) */
const CACHE='mdr-v71';
self.addEventListener('install',e=>{
 e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  let list=['./','index.html'];
  try{const t=await (await fetch('index.html',{cache:'no-store'})).text();const re=/(?:src|href)="([^"#]+)"/g;let m;while((m=re.exec(t)))if(!/^https?:|^data:/.test(m[1]))list.push(m[1])}catch(x){}
  for(let k=0;k<3;k++){let miss=0;for(const u of list){if(await c.match(u))continue;try{await c.add(u)}catch(x){miss++}}if(!miss)break}
  self.skipWaiting();
 })());
});
self.addEventListener('activate',e=>{
 e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})());
});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api'))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  try{
   const res=await Promise.race([fetch(r),new Promise((_,j)=>setTimeout(()=>j(new Error('t')),6000))]);
   if(res&&res.ok)c.put(r,res.clone());
   return res;
  }catch(x){
   const h=await c.match(r,{ignoreSearch:false})||(r.mode==='navigate'?await c.match('index.html')||await c.match('./'):null)||await c.match(r,{ignoreSearch:true});
   if(h)return h;
   return new Response('offline',{status:503});
  }
 })());
});
