const C="verace-v1";
const A=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()).catch(()=>{}));});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim());});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{try{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));}catch(x){}return res;}).catch(()=>caches.match("./index.html"))));});
