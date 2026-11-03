// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { sinceText, netBanner } from '../js/net.js';

const at = (d, h, m) => new Date(2027, 2, d, h, m).getTime();

test('마지막 연결 시각 짧게', () => {
  const now = at(8, 15, 40);
  assert.equal(sinceText(null, now), '');
  assert.equal(sinceText('엉터리', now), '');
  assert.equal(sinceText(now - 30000, now), '방금');
  assert.equal(sinceText(at(8, 15, 12), now), '오후 3:12');
  assert.equal(sinceText(at(8, 0, 5), now), '오전 12:05');
  assert.equal(sinceText(at(8, 12, 0), now), '오후 12:00');
  assert.equal(sinceText(at(7, 21, 3), now), '어제 오후 9:03');
  assert.equal(sinceText(at(5, 9, 30), now), '3/5 오전 9:30');
});

test('연결돼 있으면 띠 없음, 막 다시 연결되면 잠깐 알림', () => {
  assert.equal(netBanner({ online:true, now:0 }), null);
  assert.deepEqual(netBanner({ online:true, back:true, shared:false }), { kind:'back', title:'다시 연결됐어요', text:'', more:'' });
  assert.match(netBanner({ online:true, back:true, shared:true }).text, /함께 짜기/);
});

test('끊기면 저장된 내용이라고 짧게, 공유 여행이면 나중에 올라간다고', () => {
  const now = at(8, 15, 40);
  const solo = netBanner({ online:false, at:at(8, 15, 12), now, shared:false });
  assert.equal(solo.kind, 'off');
  assert.equal(solo.text, '저장된 내용이에요 · 마지막 연결 오후 3:12');
  assert.doesNotMatch(solo.more, /가족/);
  assert.match(solo.more, /지도·식당 찾기·빈방/);
  const shared = netBanner({ online:false, at:null, now, shared:true });
  assert.equal(shared.text, '저장된 내용이에요');
  assert.match(shared.more, /고친 내용은 다시 연결되면 가족에게 올라가요/);
});

// 느린 연결에서 '불러오는 중'에 멈추지 않게 (fetchTimed, withTimeout)
import { fetchTimed, withTimeout } from '../js/net.js';

test('fetchTimed: 제때 오면 본문까지 받아 같은 모양으로', async () => {
  const real = globalThis.fetch; let got;
  globalThis.fetch = async (url, opts) => { got = { url, opts }; return new Response('{"a":1}', { status:200 }); };
  try{
    const r = await fetchTimed('https://example.test/x', { headers:{ Accept:'application/json' } }, 1000);
    assert.equal(r.ok, true); assert.deepEqual(await r.json(), { a:1 });
    assert.equal(got.opts.headers.Accept, 'application/json'); assert.ok(got.opts.signal, '끊을 수 있게 signal을 넘김');
    globalThis.fetch = async () => new Response(null, { status:204 });
    assert.equal((await fetchTimed('https://example.test/y', {}, 1000)).status, 204);
    globalThis.fetch = async () => new Response('x', { status:429 });
    const r2 = await fetchTimed('https://example.test/z', {}, 1000); assert.equal(r2.ok, false); assert.equal(r2.status, 429);
  }finally{ globalThis.fetch = real; }
});

test('fetchTimed: 응답이 안 오거나 본문이 끝없이 늦으면 시간 제한으로 실패하고 요청을 끊음', async () => {
  const real = globalThis.fetch; let aborted = false;
  globalThis.fetch = (url, opts) => new Promise(() => { opts.signal.addEventListener('abort', () => { aborted = true; }); });
  try{
    await assert.rejects(fetchTimed('https://example.test/slow', {}, 30), /timeout/);
    assert.equal(aborted, true);
    globalThis.fetch = async () => ({ status:200, statusText:'', headers:new Headers(), text:() => new Promise(() => {}) });
    await assert.rejects(fetchTimed('https://example.test/slowbody', {}, 30), /timeout/);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(fetchTimed('https://example.test/off', {}, 1000), TypeError);   // 끊김은 바로 실패
  }finally{ globalThis.fetch = real; }
});

test('withTimeout: 늦으면 timeout, 제때면 그 값', async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 1000), 7);
  await assert.rejects(withTimeout(new Promise(() => {}), 20), /timeout/);
  await assert.rejects(withTimeout(Promise.reject(new Error('load')), 1000), /load/);
});
