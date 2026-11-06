// 실행: npm test  — 홍콩·선전 가족 식당 자료(js/regions/hksz-eats.js)가 화면·계산에서 깨지지 않는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { EATS } from '../js/regions/hksz-eats.js';
import * as M from '../js/regions/hksz-data.js';
import { AREAS, PLACES } from '../js/regions/hksz-data.js';
import { REGIONS } from '../js/data.js';
import { EAT_KINDS } from '../js/eats.js';
import { dist } from '../js/logic.js';

const BOX = { hk:{ minLat:22.15, maxLat:22.57, minLng:113.82, maxLng:114.45 }, sz:{ minLat:22.44, maxLat:22.80, minLng:113.75, maxLng:114.65 } };
const inBox = (b, lat, lng) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
const MAP = REGIONS.hksz.bounds;   // 약도 범위

test('지역 파일이 식당 목록을 같이 내보냄 (loadRegion이 EATS로 받음)', () => {
  assert.equal(M.EATS, EATS);
  assert.ok(EATS.length >= 20, `식당 ${EATS.length}곳`);
});

test('id: 모양이 맞고 겹치지 않으며 장소 id와도 안 겹침', () => {
  const ids = EATS.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const pids = new Set(PLACES.map(p => p.id));
  EATS.forEach(e => {
    assert.ok(/^eat_(hk|sz)_[a-z0-9]+$/.test(e.id), `${e.id} id 모양`);
    assert.ok(!pids.has(e.id), `${e.id} 장소 id와 겹침`);
  });
});

test('필수 칸: 이름·현지 이름·동네·종류·실내·메뉴·아이·줄·시간·출처·확인 날짜', () => {
  EATS.forEach(e => {
    for(const f of ['name', 'local', 'menu', 'kid', 'queue', 'hours', 'pos']) assert.ok(typeof e[f] === 'string' && e[f].trim(), `${e.id} ${f}`);
    const a = AREAS[e.area];
    assert.ok(a, `${e.id} 동네 ${e.area}`);
    assert.equal(e.id.slice(4, 6), a.city, `${e.id} 도시와 동네가 맞음`);
    assert.ok(e.kind in EAT_KINDS, `${e.id} 종류 ${e.kind}`);
    assert.ok([true, false, 'part'].includes(e.indoor), `${e.id} indoor`);
    assert.ok([0, 1].includes(e.spicy), `${e.id} spicy`);
    assert.ok(/^2026-11-\d\d$/.test(e.checked), `${e.id} 확인 날짜`);
    assert.ok(Array.isArray(e.src) && e.src.length >= 2, `${e.id} 출처 두 곳 이상`);
    e.src.forEach(u => assert.ok(/^https:\/\/[^\s/]+\.[^\s/]+\//.test(u), `${e.id} 출처 주소 ${u}`));
    assert.equal(new Set(e.src).size, e.src.length, `${e.id} 같은 출처 두 번`);
    if(e.closed) e.closed.forEach(w => assert.ok(Number.isInteger(w) && w >= 0 && w <= 6, `${e.id} 쉬는 요일`));
    if(e.note != null) assert.equal(typeof e.note, 'string', `${e.id} note`);
  });
});

test('가격: 1인 어림, 홍콩은 홍콩달러·선전은 위안 (못 찾은 곳만 null)', () => {
  EATS.forEach(e => {
    if(e.price === null) return;
    const cur = AREAS[e.area].city === 'hk' ? 'HKD' : 'CNY';
    assert.equal(e.price.cur, cur, `${e.id} 통화`);
    assert.ok(e.price.lo > 0 && e.price.hi >= e.price.lo && e.price.hi < 2000, `${e.id} 가격 ${e.price.lo}~${e.price.hi}`);
  });
  assert.ok(EATS.filter(e => e.price === null).length <= 5, '가격 없는 곳이 너무 많음');
});

test('좌표: 자기 도시 범위·약도 범위 안이고 동네에서 너무 멀지 않음', () => {
  EATS.forEach(e => {
    const a = AREAS[e.area];
    assert.ok(Number.isFinite(e.lat) && Number.isFinite(e.lng), `${e.id} 좌표 숫자`);
    assert.ok(inBox(BOX[a.city], e.lat, e.lng), `${e.id} (${e.lat}, ${e.lng}) 도시 범위`);
    assert.ok(e.lng >= MAP.minLng && e.lng <= MAP.maxLng && e.lat >= MAP.minLat && e.lat <= MAP.maxLat, `${e.id} 약도 범위`);
    assert.ok(dist(e, a) < 6, `${e.id} 동네 ${e.area}까지 ${dist(e, a).toFixed(1)}km`);
  });
});

test('같은 건물 좌표를 쓴 식당은 앱에 이미 있는 장소와 0.3km 안 (OCT 하버·만상천지)', () => {
  const near = (eid, pid) => { const e = EATS.find(x => x.id === eid), p = PLACES.find(x => x.id === pid); assert.ok(e && p, `${eid}·${pid}`); return dist(e, p); };
  assert.ok(near('eat_sz_huayuan', 'sz_octharbour') <= 0.3);
  assert.ok(near('eat_sz_caielan', 'sz_huawei') <= 0.3);
  assert.ok(near('eat_hk_polin', 'hk_bigbuddha') <= 0.6);   // 사원은 대불 계단 아래
  assert.ok(near('eat_hk_lockcha', 'hk_hkpark') <= 0.3);
  assert.ok(near('eat_hk_verandah', 'hk_repulse') <= 0.3);
  assert.ok(near('eat_hk_jenny', 'hk_westernmarket') <= 0.35);
});

test('두 안내서 후보에서 더한 14곳 (2026-11-06)', () => {
  const add = EATS.filter(e => e.checked === '2026-11-06').map(e => e.id).sort();
  assert.deepEqual(add, ['eat_hk_bakehouse', 'eat_hk_jenny', 'eat_hk_joyhing', 'eat_hk_kamfung', 'eat_hk_kaukee', 'eat_hk_lockcha', 'eat_hk_peaklookout', 'eat_hk_peking', 'eat_hk_singheung', 'eat_hk_taicheong', 'eat_hk_tasty', 'eat_hk_thwcentral', 'eat_hk_thwssp', 'eat_hk_verandah']);
  ['eat_hk_kaukee', 'eat_hk_singheung', 'eat_hk_joyhing'].forEach(id => assert.deepEqual(EATS.find(e => e.id === id).closed, [0]));
  assert.deepEqual(EATS.find(e => e.id === 'eat_hk_verandah').closed, [1, 2]);
});

test('고르게: 두 도시 모두, 종류 다섯 가지 이상, 한 동네 열두 곳 이하', () => {
  const by = c => EATS.filter(e => AREAS[e.area].city === c).length;
  assert.ok(by('hk') >= 10 && by('sz') >= 4);
  assert.ok(new Set(EATS.map(e => e.kind)).size >= 5);
  const per = {}; EATS.forEach(e => { per[e.area] = (per[e.area] || 0) + 1; });
  Object.entries(per).forEach(([k, n]) => assert.ok(n <= 12, `${k} ${n}곳`));
  // 아이와 가는 가족 기준이라 매운 곳은 넣지 않음
  assert.ok(EATS.every(e => e.spicy === 0 || /매운/.test(e.kid)));
});

test('loadRegion으로 지역을 바꾸면 data.js의 EATS도 바뀜 (도쿄는 빈 목록)', async () => {
  const D = await import('../js/data.js');
  try {
    assert.ok(await D.loadRegion('hksz'));
    assert.equal(D.EATS.length, EATS.length);
  } finally { D.useRegion('tokyo'); }
  assert.deepEqual(D.EATS, []);
});
