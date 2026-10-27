// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { suggestPacking, missingSuggestions, seedItems, customItems, packView, packCategory, PACK_CATS } from '../js/packing.js';
import { SHARED_KEYS, MAP_KEYS, diffShared, sharedOf, describeChange } from '../js/sharecore.js';

// 지어낸 여행: 12월 도쿄, 어른 2 + 12살, 디즈니랜드
const dec = extra => Object.assign(clone(DEFAULT), { start:'2027-12-06', end:'2027-12-10', who:'family', adults:2, kids:[12], picked:{ tdl:true, sensoji:true } }, extra);
const WX = { climate:{ hi:12.2, lo:4.4, mean:8.3, rainPct:22 } };
const keys = list => list.map(x => x.key);

test('12월 도쿄 + 12살 + 디즈니: 겨울옷·핫팩·돼지코·아이·디즈니 준비물', () => {
  const k = keys(suggestPacking(dec(), WX));
  ['passport', 'vjw', 'yen', 'plug', 'padding', 'gloves', 'hotpack', 'lipbalm', 'kidpass', 'kidcard', 'kidphone', 'dapp', 'dsheet', 'dwarm'].forEach(x => assert.ok(k.includes(x), x));
  ['diaper', 'stroller', 'teamlab'].forEach(x => assert.ok(!k.includes(x), x));
  const pad = suggestPacking(dec(), WX).find(x => x.key === 'padding');
  assert.equal(pad.why, '12월 도쿄 아침 4° 안팎이에요.');
  assert.match(suggestPacking(dec(), WX).find(x => x.key === 'umbrella').why, /22%/);
  assert.ok(k.every(x => /^[a-z]+$/.test(x)));                    // 함께 짜기 칸 이름으로 쓸 수 있는 글자만
  assert.equal(new Set(k).size, k.length);
});

test('여름·어른끼리·디즈니 없음이면 겨울·아이·디즈니 준비물이 빠짐', () => {
  const k = keys(suggestPacking(Object.assign(clone(DEFAULT), { start:'2027-07-20', end:'2027-07-24', who:'couple', picked:{ teamlab:true } }), null));
  ['padding', 'hotpack', 'kidpass', 'dapp'].forEach(x => assert.ok(!k.includes(x), x));
  assert.ok(k.includes('teamlab')); assert.ok(k.includes('plug'));
});

test('어린아이(3살)는 기저귀·유모차', () => {
  const k = keys(suggestPacking(dec({ kids:[3] }), WX));
  assert.ok(k.includes('diaper') && k.includes('stroller')); assert.ok(!k.includes('kidphone'));
});

test('추천 담기: 같은 추천은 번호가 같아 한 번만, 숨긴 것은 다시 추천 안 함', () => {
  const sugg = suggestPacking(dec(), WX);
  const pack = seedItems(sugg, 1);
  assert.equal(Object.keys(pack).length, sugg.length);
  assert.ok(pack.sg_passport && pack.sg_passport.src === 'passport' && pack.sg_passport.done === false);
  assert.equal(missingSuggestions(pack, sugg).length, 0);
  delete pack.sg_yen;
  assert.deepEqual(keys(missingSuggestions(pack, sugg)), ['yen']);
  pack.sg_yen = Object.assign({}, seedItems([sugg.find(x => x.key === 'yen')], 1).sg_yen, { hide:true });
  assert.equal(missingSuggestions(pack, sugg).length, 0);
});

test('직접 추가: 쉼표로 여러 개, 분류 자동', () => {
  let n = 0; const o = customItems('수영복, 감기약,  아이패드 충전기\n 머리끈', () => `k${++n}`, 5);
  assert.deepEqual(Object.values(o).map(x => [x.t, x.c]), [['수영복', 'wear'], ['감기약', 'care'], ['아이패드 충전기', 'tech'], ['머리끈', 'etc']]);
  assert.equal(packCategory('예약 확인서'), 'etc');                 // '약'이 '예약'에 걸리지 않음
  assert.equal(Object.keys(customItems(' , ', () => 'x')).length, 0);
});

test('목록 보기: 분류별 묶음, 안 챙긴 것 먼저, 거르기, 개수', () => {
  const pack = {
    a:{ t:'여권', c:'doc', who:'', done:true, at:1 }, b:{ t:'엔화', c:'doc', who:'p1', done:false, at:2 },
    c:{ t:'패딩', c:'wear', who:'p2', done:false, at:3 }, d:{ t:'숨김', c:'etc', hide:true, at:4 }
  };
  const v = packView(pack, 'all');
  assert.equal(v.total, 3); assert.equal(v.done, 1);
  assert.deepEqual(v.groups.map(g => g.cat.key), ['doc', 'wear']);
  assert.deepEqual(v.groups[0].items.map(x => x.t), ['엔화', '여권']);
  assert.equal(packView(pack, 'left').shown, 2);
  assert.equal(packView(pack, 'common').shown, 1);
  assert.equal(packView(pack, 'p2').shown, 1);
  assert.equal(PACK_CATS.length, 7);
});

test('함께 짜기: 준비물은 공유, 한 개씩 따로 보냄, 기록 문장', () => {
  assert.ok(SHARED_KEYS.includes('pack')); assert.ok(MAP_KEYS.includes('pack'));
  const a = dec({ pack:seedItems(suggestPacking(dec(), WX).slice(0, 3), 1) });
  const b = clone(a); b.pack.sg_passport.done = true; b.pack.sg_passport.doneBy = '엄마';
  assert.deepEqual(diffShared(sharedOf(a), sharedOf(b)).map(x => x[0]), ['p.pack.sg_passport']);
  assert.equal(describeChange(sharedOf(a), sharedOf(b)), '준비물 1개 챙김');
  const c = clone(b); c.pack.k1 = { t:'수영복', c:'wear', who:'', done:false, at:9 };
  assert.equal(describeChange(sharedOf(b), sharedOf(c)), '준비물 추가: 수영복');
});
