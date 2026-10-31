// 오프라인 지원: 네트워크 우선, 실패하면 저장해 둔 사본으로.
// 파일 목록을 바꾸면 CACHE 이름의 숫자를 올려 주세요.
// GitHub Pages는 파일을 10분 동안 브라우저 캐시에 두라고 해서, 앱 파일은 늘 서버에 새것인지 물어봄(no-cache).
// 안 그러면 새 버전을 올려도 10분 동안 옛 파일과 새 파일이 섞여 열릴 수 있음(2026-10-29 실제 폰에서 확인)
const CACHE = 'tripnoseon-v45';
const SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/app.js', './js/data.js', './js/logic.js', './js/map.js', './js/ui.js', './js/views.js',
  './js/gimport.js', './js/geocode.js', './js/rakuten.js', './js/weather.js', './js/prices.js', './js/share.js', './js/sharecore.js', './js/firebase-config.js', './js/vault.js', './js/vaultdb.js', './js/backup.js', './js/ledger.js', './js/ledgerimport.js', './js/today.js', './js/packing.js', './js/rain.js', './js/safety.js', './js/food.js', './js/gplace.js', './js/gmap.js', './js/maps-config.js', './js/janame.js', './js/regions/hksz-data.js', './js/regions/hksz-guide.js', './js/net.js', './js/loc.js', './js/transit.js', './js/budget.js', './js/ledgerexport.js', './js/askai.js', './js/flight.js', './js/ics.js', './js/catchup.js', './js/record.js', './js/install.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache:'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const same = new URL(e.request.url).origin === location.origin;
  e.respondWith(
    fetch(same ? e.request.url : e.request, same ? { cache:'no-cache' } : undefined)   // 페이지 이동 요청은 Request로 다시 만들 수 없어서 주소로
      .then(res => {
        if(res.ok && same){
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
