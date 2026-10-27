// 오프라인 지원: 네트워크 우선, 실패하면 저장해 둔 사본으로.
// 파일 목록을 바꾸면 CACHE 이름의 숫자를 올려 주세요.
const CACHE = 'tripnoseon-v12';
const SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/app.js', './js/data.js', './js/logic.js', './js/map.js', './js/ui.js', './js/views.js',
  './js/gimport.js', './js/geocode.js', './js/rakuten.js', './js/weather.js', './js/livemap.js', './js/prices.js', './js/share.js', './js/sharecore.js', './js/firebase-config.js', './js/vault.js', './js/vaultdb.js', './js/backup.js', './js/ledger.js', './js/vendor/leaflet/leaflet.js', './js/vendor/leaflet/leaflet.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if(res.ok && new URL(e.request.url).origin === location.origin){
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
