// 오프라인(sw.js): 앱이 불러오는 파일이 SHELL에 다 있어야 인터넷 없이 열림 (빠지면 여행 중 오프라인에서 그 기능만 안 열림)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const sw = read('sw.js');
const shell = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);

// js/ 아래 모든 .js (하위 폴더까지: regions/ 등 새 폴더가 생겨도 잡게)
function jsFiles(dir){
  return readdirSync(new URL(dir, root)).flatMap(f => statSync(new URL(dir + f, root)).isDirectory() ? jsFiles(dir + f + '/') : f.endsWith('.js') ? [dir + f] : []);
}

test('SHELL에 js 파일이 모두 있고, 없는 파일은 없음', () => {
  jsFiles('js/').forEach(f => assert.ok(shell.includes(f), `sw.js SHELL에 ${f}가 없어요`));
  shell.filter(Boolean).forEach(f => assert.ok(existsSync(new URL(f, root)), `SHELL의 ${f} 파일이 없어요`));
});

test('정적·동적 import로 부르는 같은 사이트 파일이 모두 SHELL에 있음', () => {
  const seen = new Set();
  const walk = f => {
    if(seen.has(f)) return; seen.add(f);
    const src = read(f);
    const specs = [...src.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g), ...src.matchAll(/\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g), ...src.matchAll(/^\s*import\s*['"](\.[^'"]+)['"]/gm)].map(m => m[1]);
    specs.forEach(sp => {
      const to = new URL(sp, new URL(f, root)).href.slice(root.href.length);
      assert.ok(shell.includes(to), `${f}가 부르는 ${to}가 sw.js SHELL에 없어요`);
      walk(to);
    });
  };
  walk('js/app.js');
  assert.ok(seen.has('js/regions/hksz-data.js'), '동적 import(지역 데이터)도 따라감');
  assert.ok(seen.has('js/regions/hksz-eats.js') && seen.has('js/regions/hksz-guide.js'));
});

test('index.html·manifest가 부르는 같은 사이트 파일(스타일·아이콘·manifest)이 SHELL에 있음', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^[a-z]+:/i.test(u));
  assert.ok(refs.includes('css/styles.css') && refs.includes('js/app.js'));
  refs.forEach(u => assert.ok(shell.includes(u), `index.html의 ${u}가 sw.js SHELL에 없어요`));
  JSON.parse(read('manifest.webmanifest')).icons.forEach(i => assert.ok(shell.includes(i.src), `manifest 아이콘 ${i.src}가 SHELL에 없어요`));
  assert.ok(shell.includes('') && shell.includes('index.html'), "'./'와 index.html 둘 다");
  // 글꼴 스타일시트는 crossorigin으로 받아야 sw.js가 사본을 둘 수 있음(opaque 응답은 저장하지 않음)
  assert.match(html, /fonts\.googleapis\.com\/css2[^>]*crossorigin/);
});

/* ---------- 끊김·느린 연결에서 fetch 처리 (sw.js를 가짜 브라우저 안에서 돌림) ---------- */
const ORIGIN = 'https://example.test';
function fakeSW(){
  let now = 1e12; const timers = [];
  const store = new Map();   // 주소 → Response
  const listeners = {};
  const net = { mode:'ok', calls:[] };   // ok | off | hang | 503
  const pending = [];
  const ctx = {
    self:{ addEventListener:(t, f) => { listeners[t] = f; }, skipWaiting(){}, clients:{ claim(){} } },
    location:{ origin:ORIGIN }, URL, Response, Request, Headers, Promise, console,
    Date:{ now:() => now },
    setTimeout:(f, ms) => { const t = { at:now + ms, f }; timers.push(t); return t; },
    clearTimeout:t => { const i = timers.indexOf(t); if(i >= 0) timers.splice(i, 1); },
    caches:{
      open:async () => ({ put:async (req, res) => { store.set(typeof req === 'string' ? req : req.url, res); }, addAll:async () => {} }),
      match:async (req, o) => {
        const u = new URL(typeof req === 'string' ? req : req.url, ORIGIN + '/app/');
        if(o && o.ignoreSearch) u.search = '';
        const r = store.get(u.href); return r ? r.clone() : undefined;
      },
      keys:async () => [], delete:async () => true
    },
    fetch:(req) => {
      const url = typeof req === 'string' ? req : req.url; net.calls.push(url);
      if(net.mode === 'off') return Promise.reject(new TypeError('Failed to fetch'));
      if(net.mode === 'hang') return new Promise(r => pending.push(() => r(new Response('late:' + url, { status:200 }))));
      if(net.mode === '503') return Promise.resolve(new Response('down', { status:503 }));
      return Promise.resolve(new Response('net:' + url, { status:200 }));
    }
  };
  vm.createContext(ctx); vm.runInContext(sw, ctx);
  const flush = () => new Promise(r => setImmediate(r));
  return {
    store, net, pending,
    seed:(path, body) => store.set(new URL(path, ORIGIN + '/app/').href, new Response(body, { status:200 })),
    async tick(ms){ now += ms; for(const t of timers.filter(t => t.at <= now)){ ctx.clearTimeout(t); t.f(); } await flush(); await flush(); },
    // 요청 하나 보내고 응답 promise를 돌려줌
    req(path, o = {}){
      let p = null;
      listeners.fetch({ request:{ url:new URL(path, ORIGIN + '/app/').href, method:'GET', mode:o.mode || 'cors' }, respondWith:x => { p = Promise.resolve(x); } });
      return p;
    }
  };
}
const text = async p => { const r = await p; return r ? await r.text() : r; };

test('sw: 연결돼 있으면 네트워크 것을 쓰고 사본도 새로', async () => {
  const w = fakeSW(); w.seed('js/a.js', 'old');
  assert.equal(await text(w.req('js/a.js')), `net:${ORIGIN}/app/js/a.js`);
  await w.tick(0);
  assert.equal(await w.store.get(`${ORIGIN}/app/js/a.js`).clone().text(), `net:${ORIGIN}/app/js/a.js`);
});

test('sw: 끊겼으면 바로 사본, 사본도 없으면 실패', async () => {
  const w = fakeSW(); w.seed('js/a.js', 'old'); w.net.mode = 'off';
  assert.equal(await text(w.req('js/a.js')), 'old');
  await assert.rejects(w.req('js/none.js'));
});

test('sw: 느리기만 하면 3초 뒤 사본으로, 그 뒤 30초는 기다리지 않고 사본부터', async () => {
  const w = fakeSW(); w.seed('', 'page'); w.seed('js/a.js', 'A'); w.seed('js/b.js', 'B'); w.net.mode = 'hang';
  let got = null; w.req('', { mode:'navigate' }).then(r => r.text()).then(t => { got = t; });
  await w.tick(2000); assert.equal(got, null, '3초 전에는 기다림');
  await w.tick(1000); assert.equal(got, 'page', '3초가 지나면 사본');
  const calls = w.net.calls.length;
  assert.equal(await text(w.req('js/a.js')), 'A', '이어서 부르는 파일은 바로 사본');
  assert.equal(w.net.calls.length, calls, '사본이 있으면 느린 네트워크에 또 묻지 않음');
  // 늦게라도 온 새 파일은 사본에 넣어 둠
  w.pending.forEach(f => f()); await w.tick(0);
  assert.equal(await w.store.get(`${ORIGIN}/app/`).clone().text(), `late:${ORIGIN}/app/`);
  // 30초가 지나면 다시 네트워크 먼저
  w.net.mode = 'ok'; await w.tick(30000);
  assert.equal(await text(w.req('js/b.js')), `net:${ORIGIN}/app/js/b.js`);
});

test('sw: 사본이 없는 파일은 느려도 끝까지 네트워크를 기다림', async () => {
  const w = fakeSW(); w.net.mode = 'hang';
  let got = null; w.req('js/new.js').then(r => r.text()).then(t => { got = t; });
  await w.tick(5000); assert.equal(got, null);
  w.pending.forEach(f => f()); await w.tick(0);
  assert.equal(got, `late:${ORIGIN}/app/js/new.js`);
});

test('sw: 화면 주소에 ?…가 붙어도 끊기면 같은 화면 사본', async () => {
  const w = fakeSW(); w.seed('', 'page'); w.net.mode = 'off';
  assert.equal(await text(w.req('?from=home', { mode:'navigate' })), 'page');
  const w2 = fakeSW(); w2.seed('index.html', 'idx'); w2.net.mode = 'off';
  assert.equal(await text(w2.req('', { mode:'navigate' })), 'idx');
});

test('sw: 서버 쪽 문제(5xx)면 사본이 있을 때 사본', async () => {
  const w = fakeSW(); w.seed('js/a.js', 'A'); w.net.mode = '503';
  assert.equal(await text(w.req('js/a.js')), 'A');
  assert.equal((await w.req('js/none.js')).status, 503);
});

test('sw: 글꼴 스타일시트가 늦으면 사본, 없으면 빈 스타일로 화면을 막지 않음', async () => {
  const css = 'https://fonts.googleapis.com/css2?family=X';
  const w = fakeSW(); w.net.mode = 'hang';
  let got = null; w.req(css).then(r => r.text()).then(t => { got = t; });
  await w.tick(3000); assert.equal(got, '', '빈 스타일 → 기본 글꼴로 바로 그림');
  w.pending.forEach(f => f()); await w.tick(0);
  assert.ok(w.store.has(css), '늦게 온 글꼴 스타일은 다음을 위해 저장');
  w.net.mode = 'off';
  assert.equal(await text(w.req(css)), `late:${css}`);
});

test('sw: 날씨·지도·Firebase 같은 다른 사이트 요청은 건드리지 않음', () => {
  const w = fakeSW();
  assert.equal(w.req('https://api.open-meteo.com/v1/forecast?x=1'), null);
  assert.equal(w.req('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'), null);
});

test('sw: 화면을 사본으로 연 뒤에는 글꼴 스타일도 기다리지 않음', async () => {
  const css = 'https://fonts.googleapis.com/css2?family=X';
  const w = fakeSW(); w.seed('', 'page'); w.net.mode = 'hang';
  const page = w.req('', { mode:'navigate' }); await w.tick(3000); assert.equal(await text(page), 'page');
  assert.equal(await text(w.req(css)), '', '바로 빈 스타일');
  w.pending.forEach(f => f()); await w.tick(0);
  assert.ok(w.store.has(css), '뒤에서 받은 건 저장');
});
