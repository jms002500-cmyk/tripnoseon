// 추천 지도·구글 평점 (v0.89.0, 2026-11-16). 값은 모두 지어낸 것
import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupOf, nearEnough, freshOf, rateText, cleanRate, pruneCache, byRating, GR_DAYS, grPut, grOf } from '../js/grating.js';
import { pinList } from '../js/gplace.js';
import { readFile } from 'node:fs/promises';

const DAY = 86400000, NOW = 1000 * DAY;

test('구글에서 찾을 말: 장소 ID → 지도 검색어 → 주소 → 현지 이름 → 이름', () => {
  assert.deepEqual(lookupOf({ gid:'ChIJfake', mapq:'검색어', addr:'주소', name:'이름' }), { gid:'ChIJfake', q:'검색어' });
  assert.deepEqual(lookupOf({ addr:' 1 Fake Rd ', local:'假店', name:'가짜 식당' }), { gid:'', q:'1 Fake Rd' });
  assert.deepEqual(lookupOf({ local:'假店', name:'가짜 식당' }), { gid:'', q:'假店' });
  assert.deepEqual(lookupOf({ name:'가짜 식당' }), { gid:'', q:'가짜 식당' });
  assert.equal(lookupOf({ addr:'가'.repeat(150) }).q.length, 100);
  assert.equal(lookupOf(null), null);
});

test('찾은 곳이 우리 좌표 근처인지 (기본 600m)', () => {
  const ours = { lat:22.2975, lng:114.1722 };
  assert.ok(nearEnough(ours, { lat:22.2990, lng:114.1730 }));          // 약 180m
  assert.ok(!nearEnough(ours, { lat:22.3191, lng:114.1694 }));         // 약 2.4km (엉뚱한 지점)
  assert.ok(nearEnough({}, { lat:22.3, lng:114.1 }));                  // 우리 좌표가 없으면 구글 좌표만 있으면
  assert.ok(!nearEnough(ours, null));                                   // 구글 좌표가 없으면 안 됨
});

test('저장한 평점: 25일 안만, 못 찾은 곳은 하루만', () => {
  const c = { a:{ gid:'g', r:4.4, n:10, at:NOW - (GR_DAYS - 1) * DAY }, b:{ gid:'g', r:4, n:1, at:NOW - (GR_DAYS + 1) * DAY },
    c:{ none:true, at:NOW - 2 * 3600000 }, d:{ none:true, at:NOW - 2 * DAY }, e:{ r:4, at:NOW + DAY } };
  assert.ok(freshOf(c, 'a', NOW));
  assert.equal(freshOf(c, 'b', NOW), null);
  assert.ok(freshOf(c, 'c', NOW).none);
  assert.equal(freshOf(c, 'd', NOW), null);
  assert.equal(freshOf(c, 'e', NOW), null);              // 앞날 시각은 믿지 않음
  assert.equal(freshOf(c, 'zz', NOW), null);
  assert.equal(freshOf(c, 'toString', NOW), null);       // 객체 기본 이름에 걸리지 않음
});

test('평점 글: 별점·매긴 사람 수', () => {
  assert.equal(rateText({ r:4.36, n:5178 }), '구글 ★4.4 (5,178명)');
  assert.equal(rateText({ r:5, n:1 }), '구글 ★5.0 (1명)');
  assert.equal(rateText({ r:0, n:0 }), '구글 평점 없음');
  assert.equal(rateText({ none:true }), '');
  assert.equal(rateText(null), '');
});

test('받은 값·저장 값 바로잡기', () => {
  assert.deepEqual(cleanRate({ gid:'g1', r:'4.56', n:'12', u:'https://maps.google.com/?cid=1', at:5 }, 9), { gid:'g1', r:4.6, n:12, u:'https://maps.google.com/?cid=1', at:5 });
  assert.deepEqual(cleanRate({ gid:'g1', r:9, n:-3, u:'javascript:alert(1)' }, 9), { gid:'g1', r:0, n:0, u:'', at:9 });
  assert.deepEqual(cleanRate({ none:true, at:3 }, 9), { none:true, at:3 });
  assert.equal(cleanRate('x', 9), null);
  const p = pruneCache({ hk_peak:{ gid:'g', r:4.5, n:100, at:NOW - DAY }, old:{ gid:'g', r:4, n:1, at:NOW - 40 * DAY },
    'bad key!':{ r:4, at:NOW }, __proto__:{ r:5, at:NOW }, eat_hk_x:'문자열' }, NOW);
  assert.deepEqual(Object.keys(p), ['hk_peak']);
  assert.deepEqual(pruneCache(null, NOW), {}); assert.deepEqual(pruneCache([1], NOW), {});
});

test('평점 높은 순: 같으면 매긴 사람 많은 순, 없는 곳은 뒤(원래 순서)', () => {
  const c = { a:{ r:4.2, n:50, at:NOW }, b:{ r:4.6, n:10, at:NOW }, c:{ r:4.6, n:900, at:NOW }, d:{ none:true, at:NOW } };
  const items = ['a', 'x', 'b', 'd', 'c', 'y'].map(id => ({ id }));
  assert.deepEqual(byRating(items, c, NOW).map(x => x.id), ['c', 'b', 'a', 'x', 'd', 'y']);
});

test('이 기기 저장: 노드처럼 저장소가 없어도 메모리로', () => {
  grPut('hk_fake1', { gid:'g', r:4.1, n:3 });
  assert.equal(grOf('hk_fake1').r, 4.1);
  grPut('', { r:4 }); grPut('hk_fake2', null);
  assert.equal(grOf('hk_fake2'), null);
});

test('지도 핀: 테마로 추천 거르기·가족 식당 핀·예전처럼 true/false', () => {
  const s = { picked:{ a2:true }, must:{}, custom:[
    { id:'a1', name:'시장', kind:'거리·시장', lat:35.690, lng:139.700 },
    { id:'a2', name:'박물관', kind:'박물관·미술관', indoor:true, lat:35.691, lng:139.701 },
    { id:'a3', name:'공원', kind:'공원·정원', lat:35.692, lng:139.702 } ], hotels:[{ id:'h1', name:'숙소', lat:35.69, lng:139.70 }] };   // 도쿄(기본 지역) 범위 안
  const eats = [{ id:'eat_x', name:'식당', lat:35.693, lng:139.703 }, { id:'eat_y', name:'좌표 없음' }];
  const ids = l => l.filter(x => x.place).map(x => x.place.id).filter(id => ['a1', 'a2', 'a3'].includes(id)).sort();
  s.custom.forEach(p => { p.custom = true; });
  assert.deepEqual(ids(pinList(s, true)), ['a1', 'a2', 'a3']);
  assert.deepEqual(ids(pinList(s, false)), ['a2']);                                          // 담은 곳은 늘
  assert.deepEqual(ids(pinList(s, { theme:'shop' })), ['a1', 'a2']);                          // 추천은 쇼핑만, 담은 박물관은 그대로
  assert.deepEqual(ids(pinList(s, { theme:'all' })), ['a1', 'a2', 'a3']);                      // 'all' = 거르지 않음
  assert.deepEqual(ids(pinList(s, { rec:false, theme:'shop' })), ['a2']);
  const withEats = pinList(s, { eats });
  assert.deepEqual(withEats.filter(x => x.kind === 'eat').map(x => x.eat.id), ['eat_x']);    // 좌표 없는 식당은 뺌
  assert.equal(pinList(s, {}).filter(x => x.kind === 'eat').length, 0);
  assert.equal(pinList(s, true).filter(x => x.kind === 'hotel').length, 1);
});

test('구글 평점은 이 기기에만 (함께 짜기·백업 밖), 평점은 자동 완성으로만 찾음', async () => {
  const gm = (await readFile(new URL('../js/gmap.js', import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '');
  assert.ok(!/searchByText|SearchByText|textSearch/.test(gm));
  const sc = await readFile(new URL('../js/sharecore.js', import.meta.url), 'utf8');
  assert.ok(!/grating|grate/.test(sc));
  const bk = await readFile(new URL('../js/backup.js', import.meta.url), 'utf8');
  assert.ok(!/tripnoseon-grating/.test(bk));
});
