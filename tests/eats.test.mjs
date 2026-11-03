// 실행: npm test  — 앱이 고른 식당 보여 주기(js/eats.js): 끼니 자리 근처 고르기·동네별 묶기·가격 글·지도 링크
import test from 'node:test';
import assert from 'node:assert/strict';
import { eatsNear, eatsByArea, priceText, isClosedOn, eatMapUrl, eatAmapUrl, srcName, NEAR_KM } from '../js/eats.js';

// 지어낸 식당 (실제 가게 아님)
const LIST = [
  { id:'eat_hk_a', area:'x', lat:22.3000, lng:114.1700, local:'甲記', closed:[0] },
  { id:'eat_hk_b', area:'x', lat:22.3030, lng:114.1700, local:'乙記' },
  { id:'eat_hk_c', area:'y', lat:22.3100, lng:114.1700, local:'丙記' },
  { id:'eat_sz_d', area:'z', lat:22.5400, lng:114.0500, local:'丁记' }
];
const AREAS = { x:{ name:'가', city:'hk' }, y:{ name:'나', city:'hk' }, w:{ name:'빈 동네', city:'hk' }, z:{ name:'다', city:'sz' } };

test('eatsNear: 가까운 순, 범위 밖은 빼고, 그날 쉬는 곳은 맨 뒤', () => {
  const pt = { lat:22.3000, lng:114.1700 };
  const r = eatsNear(LIST, pt, { wd:1 });
  assert.deepEqual(r.map(e => e.id), ['eat_hk_a', 'eat_hk_b', 'eat_hk_c']);
  assert.ok(r[0].km < 0.01 && r[0].walk === 1 && r[0].off === false);
  assert.ok(Math.abs(r[1].km - 0.33) < 0.02);
  const sun = eatsNear(LIST, pt, { wd:0 });   // 일요일엔 甲記가 쉼
  assert.deepEqual(sun.map(e => e.id), ['eat_hk_b', 'eat_hk_c', 'eat_hk_a']);
  assert.equal(sun[2].off, true);
  assert.deepEqual(eatsNear(LIST, pt, { km:0.5 }).map(e => e.id), ['eat_hk_a', 'eat_hk_b']);
  assert.equal(eatsNear(LIST, pt, { limit:1 }).length, 1);
  assert.ok(NEAR_KM >= 1 && NEAR_KM <= 2);
  assert.deepEqual(eatsNear(LIST, null), []);
  assert.deepEqual(eatsNear([], pt), []);
  assert.equal(LIST[0].km, undefined, '원래 자료는 안 바뀜');
});

test('eatsByArea: AREAS 순서로 묶고 빈 동네는 빼며, 도시·동네로 거름', () => {
  assert.deepEqual(eatsByArea(LIST, AREAS).map(g => [g.key, g.items.length]), [['x', 2], ['y', 1], ['z', 1]]);
  assert.deepEqual(eatsByArea(LIST, AREAS, { cities:['sz'] }).map(g => g.key), ['z']);
  assert.deepEqual(eatsByArea(LIST, AREAS, { cities:[] }).map(g => g.key), ['x', 'y', 'z']);   // 도쿄처럼 도시 구분이 없으면 전부
  assert.deepEqual(eatsByArea(LIST, AREAS, { area:'y' }).map(g => g.key), ['y']);
  assert.deepEqual(eatsByArea(LIST, AREAS, { area:'all' }).length, 3);
  assert.deepEqual(eatsByArea(LIST, AREAS, { area:'w' }), []);
  assert.deepEqual(eatsByArea([], AREAS), []);
});

test('priceText: 통화마다 읽기 쉬운 글, 없으면 빈 글', () => {
  assert.equal(priceText({ cur:'HKD', lo:50, hi:80 }), 'HK$50~80');
  assert.equal(priceText({ cur:'CNY', lo:60, hi:80 }), '60~80위안');
  assert.equal(priceText({ cur:'CNY', lo:85, hi:85 }), '85위안');
  assert.equal(priceText({ cur:'JPY', lo:1000, hi:1500 }), '1000~1500엔');
  assert.equal(priceText(null), '');
  assert.equal(priceText({ cur:'HKD', lo:0, hi:0 }), '');
});

test('isClosedOn: 쉬는 요일만 true', () => {
  assert.equal(isClosedOn(LIST[0], 0), true);
  assert.equal(isClosedOn(LIST[0], 3), false);
  assert.equal(isClosedOn(LIST[1], 0), false);
  assert.equal(isClosedOn(LIST[0], undefined), false);
});

test('지도 링크: 현지 이름을 인코딩해서 그 좌표 근처로, 가오더는 선전 도시 코드', () => {
  const g = eatMapUrl(LIST[0]);
  assert.ok(g.startsWith('https://www.google.com/maps/search/'));
  assert.ok(g.includes(encodeURIComponent('甲記')) && g.endsWith('/@22.30000,114.17000,17z'));
  const a = eatAmapUrl(LIST[3]);
  assert.ok(a.startsWith('https://uri.amap.com/search?keyword=' + encodeURIComponent('丁记')));
  assert.ok(a.includes('city=440300'));
});

test('srcName: 출처 주소 → 짧은 도메인', () => {
  assert.equal(srcName('https://guide.michelin.com/hk/en/x'), 'michelin.com');
  assert.equal(srcName('https://en.wikipedia.org/wiki/X'), 'wikipedia.org');
  assert.equal(srcName('https://www.timeout.com/hong-kong/x'), 'timeout.com');
  assert.equal(srcName('https://global.hk01.com/旅游/1'), 'hk01.com');
  assert.equal(srcName('ftp://x'), '');
});

test('eatsNear meal: 끼니 자리에서는 디저트 가게를 식사할 곳 뒤로', () => {
  const L = [{ id:'s', kind:'디저트', lat:22.3000, lng:114.1700 }, { id:'m', kind:'딤섬', lat:22.3050, lng:114.1700 }];
  const pt = { lat:22.3000, lng:114.1700 };
  assert.deepEqual(eatsNear(L, pt).map(e => e.id), ['s', 'm']);
  assert.deepEqual(eatsNear(L, pt, { meal:true }).map(e => e.id), ['m', 's']);
});
