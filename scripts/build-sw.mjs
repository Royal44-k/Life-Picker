import { readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const buildDir=process.argv[2]||'dist';
const assets=(await readdir(buildDir+'/assets')).filter(n=>!n.endsWith('.map')).map(n=>'/assets/'+n);
const files=['/','/index.html','/guide.html','/guide-v1.1.html','/guide-v1.2.html','/guide-v1.3.html','/guide-v1.4.html','/guide-v1.5.html','/guide-v1.6.html','/manifest.webmanifest','/icon-192.png','/icon-512.png',...assets];
const version=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,12);
await writeFile(buildDir+'/sw.js',`const CACHE='shiye-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shiye-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(['/guide.html','/guide-v1.1.html','/guide-v1.2.html','/guide-v1.3.html','/guide-v1.4.html','/guide-v1.5.html','/guide-v1.6.html'].includes(u.pathname)?u.pathname:'/index.html')));return;}
e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});`);
console.log(`Offline shell generated (${files.length} assets).`);
