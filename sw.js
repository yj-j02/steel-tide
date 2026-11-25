/* THE GENERAL 오프라인 지원 (L).
   코드·화면(HTML/JS/CSS)은 '네트워크 우선' — 온라인이면 항상 최신, 끊기면 마지막 사본.
   이미지·소리는 '캐시 우선' — 한 번 받은 파일은 다시 받지 않는다.
   다른 도메인(랭킹 서버 등) 요청은 건드리지 않는다. 버전을 올리면 옛 캐시를 지운다. */
const V = "tg-v1";
const SHELL = ["./", "./index.html", "./client.js", "./css/dossier.css", "./manifest.webmanifest", "./img/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const media = /\.(png|jpe?g|webp|gif|svg|mp3|ogg|wav|glb|gltf|woff2?)$/i.test(url.pathname);
  if (media) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); } return res; })));
    return;
  }
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))));
});
