// 오프라인 지원: 네트워크 우선, 실패하거나 3초 넘게 늦으면 저장해 둔 사본으로.
// 파일 목록을 바꾸면 CACHE 이름의 숫자를 올려 주세요.
// GitHub Pages는 파일을 10분 동안 브라우저 캐시에 두라고 해서, 앱 파일은 늘 서버에 새것인지 물어봄(no-cache).
// 안 그러면 새 버전을 올려도 10분 동안 옛 파일과 새 파일이 섞여 열릴 수 있음(2026-10-29 실제 폰에서 확인)
const CACHE = 'tripnoseon-v65';
const SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/app.js', './js/data.js', './js/logic.js', './js/map.js', './js/ui.js', './js/views.js',
  './js/gimport.js', './js/geocode.js', './js/rakuten.js', './js/weather.js', './js/prices.js', './js/share.js', './js/sharecore.js', './js/firebase-config.js', './js/vault.js', './js/vaultdb.js', './js/backup.js', './js/ledger.js', './js/ledgerimport.js', './js/today.js', './js/packing.js', './js/rain.js', './js/safety.js', './js/food.js', './js/gplace.js', './js/gmap.js', './js/maps-config.js', './js/janame.js', './js/regions/hksz-data.js', './js/regions/hksz-guide.js', './js/regions/hksz-eats.js', './js/eats.js', './js/net.js', './js/loc.js', './js/transit.js', './js/budget.js', './js/ledgerexport.js', './js/askai.js', './js/flight.js', './js/ics.js', './js/catchup.js', './js/record.js', './js/install.js', './js/moves.js', './js/bookings.js', './js/agenda.js', './js/prep.js', './js/clock.js', './js/parking.js', './js/airbus.js', './js/hktransit.js', './js/hko.js', './js/border.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache:'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 느린 연결(해외 로밍·중국 본토에서 github.io가 느릴 때): 네트워크를 WAIT만큼만 기다리고 저장한 사본으로.
//   한 번 사본으로 넘어가면 SLOW 동안은 앱 파일을 사본에서 바로 꺼냄(파일마다 또 기다리지 않게, 한 번 열 때 옛·새 파일이 덜 섞이게).
//   사본이 없는 파일은 끝까지 네트워크를 기다림. 늦게 온 새 파일은 사본에 넣어 다음에 씀
const WAIT = 3000, SLOW = 30000;
let slowUntil = 0;
// 글꼴(Google Fonts): 스타일시트가 늦으면 화면 전체가 하얗게 멈춤(구글이 막힌 중국 본토). 받아 둔 사본, 없으면 빈 스타일로 → 기본 글꼴
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

function put(req, res){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }

// 네트워크와 사본 중 먼저 쓸 수 있는 것. fallback(): 사본(없으면 undefined), late: 사본도 없이 늦을 때 줄 응답(없으면 계속 기다림)
function race(net, fallback, late){
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = r => { if(!done){ done = true; resolve(r); } };
    const backup = () => fallback().then(hit => { if(hit){ slowUntil = Date.now() + SLOW; finish(hit); } return hit; }, () => undefined);
    const timer = setTimeout(() => backup().then(hit => { if(!hit && late) finish(late()); }), WAIT);
    net.then(res => {
      clearTimeout(timer);
      if(res.status >= 500) backup().then(hit => finish(res));   // 서버 쪽 문제: 사본이 있으면 사본
      else finish(res);
    }, err => {
      clearTimeout(timer);
      backup().then(hit => { if(!hit && !done){ if(late) finish(late()); else { done = true; reject(err); } } });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin){
    if(!FONT_HOSTS.includes(url.hostname)) return;   // 날씨·환율·지도·Firebase 등은 브라우저가 바로 (저장하지 않음)
    const css = url.hostname === 'fonts.googleapis.com';
    const net = fetch(req).then(res => { if(res.ok) put(req, res); return res; });   // 스타일시트는 crossorigin으로 받아 opaque가 아님(opaque는 저장 공간을 크게 차지)
    net.catch(() => {});   // 사본을 줬을 때 늦게 실패해도 조용히
    const empty = css ? () => new Response('', { headers:{ 'Content-Type':'text/css' } }) : null;
    // 이미 느린 걸 알면(화면을 사본으로 열었으면) 글꼴도 또 기다리지 않음. 받는 건 뒤에서 계속 → 다음에 씀
    if(Date.now() < slowUntil) e.respondWith(caches.match(req).then(hit => hit || (empty ? empty() : net)));
    else e.respondWith(race(net, () => caches.match(req), empty));
    return;
  }
  const nav = req.mode === 'navigate';
  // 화면(페이지 이동)은 주소 뒤 ?…가 달라도 같은 화면 사본으로
  const cached = () => caches.match(req, nav ? { ignoreSearch:true } : undefined).then(hit => hit || (nav ? caches.match('./index.html') : undefined));
  const fromNet = () => fetch(req.url, { cache:'no-cache' })   // 페이지 이동 요청은 Request로 다시 만들 수 없어서 주소로
    .then(res => { if(res.ok) put(req, res); return res; });
  if(Date.now() < slowUntil){
    e.respondWith(cached().then(hit => hit || fromNet()));
    return;
  }
  e.respondWith(race(fromNet(), cached));
});
