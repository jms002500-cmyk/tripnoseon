// 실행: npm test  (네트워크 없음)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { mealSlots, rankFood, walkMin, moreFoodUrl, foodKey } from '../js/food.js';

const hotel = { name:'숙소', lat:35.69, lng:139.70 };
const P = (id, hours) => ({ id, name:id, lat:35.7, lng:139.77, hours });
const OPEN = (d, oh, ch) => ({ open:{ day:d, hour:oh, minute:0 }, close:{ day:d, hour:ch, minute:0 } });

test('끼니 자리: 점심은 12:30쯤 있을 곳, 저녁은 마지막 장소', () => {
  const day = { kind:'full', items:[P('a', 1.5), P('b', 2), P('c', 1)] };
  assert.deepEqual(mealSlots(day, hotel).map(x => [x.meal, x.at.id]), [['lunch', 'b'], ['dinner', 'c']]);   // 10:00 a(1.5h)+이동 → 12:00 b
  assert.deepEqual(mealSlots({ kind:'full', items:[P('a', 4)] }, hotel).map(x => x.at.id), ['a', 'a']);
  assert.deepEqual(mealSlots({ kind:'arrive', items:[P('a', 1)] }, hotel).map(x => x.meal), ['dinner']);   // 도착하는 날은 저녁만
  assert.deepEqual(mealSlots({ kind:'depart', items:[] }, hotel).map(x => [x.meal, x.at.name]), [['lunch', '숙소']]);
  const disney = mealSlots({ kind:'full', full:{ name:'도쿄 디즈니랜드' }, items:[] }, hotel);
  assert.deepEqual(disney.map(x => [x.meal, x.at.name]), [['dinner', '숙소']]);
  assert.match(disney[0].why, /디즈니/);
});

test('실제 일정으로 끼니 자리 만들기', () => {
  const s = Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11', picked:{ uenozoo:true, kahaku:true, sensoji:true, skytree:true } });
  const Pl = plan(s);
  Pl.days.forEach(d => mealSlots(d, Pl.hotel).forEach(m => assert.ok(m.at && m.at.lat != null && /^(lunch|dinner)$/.test(m.meal))));
});

test('보여 줄 순서: 그 시간 영업 > 모름 > 안 엶, 그다음 믿을 만한 평점, 가까운 순', () => {
  const list = [
    { name:'쉬는 곳', km:0.05, rating:4.9, ratingN:900, periods:[OPEN(1, 11, 21)] },          // 월요일만 엶
    { name:'모름', km:0.1, rating:4.0, ratingN:50, periods:null },
    { name:'영업·평점 4.2', km:0.3, rating:4.2, ratingN:800, periods:[OPEN(0, 11, 21)] },
    { name:'영업·평점 4.8 리뷰 3개', km:0.2, rating:4.8, ratingN:3, periods:[OPEN(0, 11, 21)] }
  ];
  assert.deepEqual(rankFood(list, 0, '12:30').map(r => r.name), ['영업·평점 4.2', '영업·평점 4.8 리뷰 3개', '모름', '쉬는 곳']);   // 일요일
  assert.equal(rankFood(list, 0, '12:30')[0].open, true);
  assert.equal(rankFood(list, 0, '12:30', 1).length, 1);
});

test('걸어서 몇 분, 구글 지도 더 보기, 자리 키', () => {
  assert.equal(walkMin(0.45), 6); assert.equal(walkMin(0.01), 1);
  assert.match(moreFoodUrl({ lat:35.7, lng:139.8 }, 'lunch'), /maps\/search\/%E3%83%A9%E3%83%B3%E3%83%81\/@35\.70000,139\.80000,17z/);
  assert.equal(foodKey({ lat:35.71484, lng:139.79671 }), '35.715,139.797');
});
