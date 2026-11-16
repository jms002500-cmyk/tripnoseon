// 가족 식당 담기 (v0.92.0, 2026-11-16): 담은 식당은 장소처럼 일정에, 점심·저녁 자리에 하루 두 곳까지. 홍콩 자료 + 지어낸 날짜
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, allPlaces, capacity, eatPlace, mealStop, mealLabels, orderDay, MAX_MEALS, buildDays } from '../js/logic.js';
import { pullToDay } from '../js/daymain.js';
import { mealSlots } from '../js/food.js';
import { pinList } from '../js/gplace.js';

// 4박 5일(가운데 3일이 온전한 날), 침사추이에 묵는 가족
const trip = () => Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', adults:2, kids:[10], start:'2027-03-08', end:'2027-03-12', hotelArea:'tst', pace:'normal' });
const dayOf = (P, id) => { const d = P.days.find(x => (x.full && x.full.id === id) || x.items.some(p => p.id === id) || (x.meals || []).some(p => p.id === id)); return d ? d.i : null; };
const eat = id => D.EATS.find(e => e.id === id);

test('담은 식당만 장소로: 모양·끼니 여부·같은 객체', async () => {
  await D.loadRegion('hksz');
  const s = trip();
  assert.ok(!allPlaces(s).some(p => p.eat));                 // 안 담으면 장소 목록에 없음
  s.picked.eat_hk_dtf = true; s.picked.eat_hk_mammy = true;
  const E = allPlaces(s).filter(p => p.eat);
  assert.deepEqual(E.map(p => p.id).sort(), ['eat_hk_dtf', 'eat_hk_mammy']);
  const p = E.find(x => x.id === 'eat_hk_dtf');
  assert.equal(p.kind, '먹거리'); assert.equal(p.area, 'tst'); assert.equal(p.ja, eat('eat_hk_dtf').local);
  assert.equal(p.hours, 1); assert.ok(p.tags.includes('맛집'));
  assert.equal(p.book, undefined);                            // fitScore의 '예약 필요'로 읽히지 않게
  assert.ok(mealStop(p));
  assert.ok(!mealStop(E.find(x => x.id === 'eat_hk_mammy')));   // 디저트는 그냥 들르는 곳 (30분)
  assert.equal(E.find(x => x.id === 'eat_hk_mammy').hours, 0.5);
  assert.equal(eatPlace(eat('eat_hk_dtf')), eatPlace(eat('eat_hk_dtf')));
  assert.ok(mealStop({ custom:true, kind:'먹거리', hours:1 }));   // 구글 지도에서 담은 식당도 끼니
  assert.ok(!mealStop({ kind:'먹거리', hours:1.5 }));              // 앱 추천 장소(야시장 등)는 그대로 장소
});

test('식당은 다닐 시간·장소 수에 안 셈 (원래 비워 둔 식사 시간에 먹음)', async () => {
  await D.loadRegion('hksz');
  const s = trip(); ['hk_avenue', 'hk_space', 'hk_harbourcity'].forEach(id => { s.picked[id] = true; });
  const before = capacity(s).used; const P0 = plan(s);
  s.picked.eat_hk_dtf = true; s.picked.eat_hk_jade = true;
  assert.equal(capacity(s).used, before);
  const P = plan(s);
  ['hk_avenue', 'hk_space', 'hk_harbourcity'].forEach(id => assert.equal(dayOf(P, id), dayOf(P0, id)));   // 식당을 담아도 다른 곳이 밀리지 않음
  assert.equal(P.unassigned.length, 0);
});

test('하루 식당은 점심·저녁 두 곳까지 자동으로, 넘치면 다른 날로', async () => {
  await D.loadRegion('hksz');
  const s = trip(); s.picked.hk_avenue = true;
  ['eat_hk_dtf', 'eat_hk_jade', 'eat_hk_peking', 'eat_hk_adc'].forEach(id => { s.picked[id] = true; });   // 모두 침사추이
  const P = plan(s);
  P.days.forEach(d => assert.ok(d.items.filter(mealStop).length <= MAX_MEALS));
  ['eat_hk_dtf', 'eat_hk_jade', 'eat_hk_peking', 'eat_hk_adc'].forEach(id => assert.notEqual(dayOf(P, id), null));
  assert.ok(new Set(['eat_hk_dtf', 'eat_hk_jade', 'eat_hk_peking', 'eat_hk_adc'].map(id => dayOf(P, id))).size >= 2);
  // 날짜를 직접 고르면 두 곳이 넘어도 넣음
  const di = dayOf(P, 'eat_hk_dtf'); ['eat_hk_dtf', 'eat_hk_jade', 'eat_hk_peking'].forEach(id => { s.assign[id] = di; });
  const Q = plan(s); assert.ok(Q.days[di].items.filter(mealStop).length >= 3);
});

test('하루 순서: 첫 식당은 12시쯤 점심 자리, 다음 식당은 저녁 곳 앞 · 도착하는 날은 저녁만', () => {
  const A = { id:'a', lat:22.30, lng:114.17, hours:1.5 }, B = { id:'b', lat:22.301, lng:114.171, hours:1 };
  const N = { id:'n', lat:22.305, lng:114.17, hours:1, eve:2 };
  const M1 = { id:'m1', custom:true, kind:'먹거리', lat:22.3002, lng:114.1702, hours:1 }, M2 = { id:'m2', custom:true, kind:'먹거리', lat:22.3049, lng:114.1701, hours:1 };
  const start = { lat:22.299, lng:114.169 };
  assert.deepEqual(orderDay([M2, N, B, M1, A], start, 10).map(p => p.id), ['a', 'm1', 'b', 'm2', 'n']);
  assert.deepEqual(orderDay([M2, N, B, M1, A], start, 14).map(p => p.id), ['a', 'b', 'm1', 'm2', 'n']);   // 점심 자리 없음
  assert.deepEqual(orderDay([A, B], start, 10).map(p => p.id), ['a', 'b']);                               // 식당 없으면 그대로
  assert.deepEqual(mealLabels({ kind:'full', items:[A, M1, B, M2] }), { m1:'점심', m2:'저녁' });
  assert.deepEqual(mealLabels({ kind:'arrive', items:[A, M1] }), { m1:'저녁' });
});

test('끼니 자리: 일정에 넣은 식당이 있으면 그 식당으로 (오늘 하루·이날 식당)', () => {
  const A = { id:'a', name:'가', lat:22.30, lng:114.17, hours:1.5 }, B = { id:'b', name:'나', lat:22.301, lng:114.171, hours:1 };
  const M1 = { id:'m1', name:'점심집', custom:true, kind:'먹거리', lat:22.3002, lng:114.1702, hours:1 };
  const hotel = { name:'숙소', lat:22.299, lng:114.169 };
  const S = mealSlots({ kind:'full', items:[A, M1, B] }, hotel, hotel);
  assert.equal(S[0].meal, 'lunch'); assert.equal(S[0].planned, M1); assert.equal(S[0].at, M1);
  assert.equal(S[1].meal, 'dinner'); assert.equal(S[1].planned, undefined); assert.equal(S[1].at, B);
});

test('하루 종일 날(디즈니)로 정한 식당은 그날 먹을 곳 · 이날 담기', async () => {
  await D.loadRegion('hksz');
  const s = trip(); s.picked.hk_disney = true;
  const P0 = plan(s); const di = dayOf(P0, 'hk_disney'); assert.ok(P0.days[di].full);
  pullToDay(s, 'eat_hk_dtf', di, true);
  assert.equal(s.picked.eat_hk_dtf, true); assert.equal(s.assign.eat_hk_dtf, di);
  const P = plan(s);
  assert.deepEqual(P.days[di].meals.map(p => p.id), ['eat_hk_dtf']);
  assert.ok(!P.days.some(d => d.items.some(p => p.id === 'eat_hk_dtf')));
  // 하루 종일이 아닌 날: 그날 일정으로
  const other = P.days.find(d => !d.full && d.cap > 0).i;
  pullToDay(s, 'eat_hk_adc', other, false);
  assert.equal(dayOf(plan(s), 'eat_hk_adc'), other);
});

test('이날 담기로 식당이 두 곳을 넘으면 새 식당에서 먼 식당을 다른 날로 (폰 시뮬레이션에서 찾음)', async () => {
  await D.loadRegion('hksz');
  const s = trip(); ['hk_space', 'hk_mplus', 'hk_avenue'].forEach(id => { s.picked[id] = true; });
  const P0 = plan(s); const di = dayOf(P0, 'hk_mplus');
  ['eat_hk_dtf', 'eat_hk_adc'].forEach(id => { s.picked[id] = true; s.assign[id] = di; });   // 그날 점심·저녁이 이미 찼음 (메인을 고르면 이렇게 고정됨)
  const r = pullToDay(s, 'eat_hk_tinlungheen', di, false);
  assert.deepEqual(r.moved.map(p => p.id), ['eat_hk_adc']);   // 틴룽힌(서구룡)에서 더 먼 조던 쪽
  const P = plan(s);
  assert.equal(P.days[di].items.filter(mealStop).length, MAX_MEALS);
  assert.notEqual(dayOf(P, 'eat_hk_adc'), di); assert.notEqual(dayOf(P, 'eat_hk_adc'), null);
  // 식당이 아닌 곳은 그대로
  assert.deepEqual(pullToDay(s, 'hk_history', di, false).moved, []);
});

test('지도: 가족 식당 층을 켜면 담은 식당은 식당 핀 하나로만', async () => {
  await D.loadRegion('hksz');
  const s = trip(); s.picked.eat_hk_dtf = true;
  const on = pinList(s, { rec:false, eats:D.EATS });
  assert.equal(on.filter(x => (x.place || x.eat || {}).id === 'eat_hk_dtf').length, 1);
  assert.equal(on.find(x => (x.place || x.eat || {}).id === 'eat_hk_dtf').kind, 'eat');
  const off = pinList(s, { rec:false });
  assert.equal(off.find(x => x.place && x.place.id === 'eat_hk_dtf').kind, 'on');   // 층을 끄면 담은 곳 핀
});

test('행사 장소도 담을 수 있게: 윈터페스트 → 황후상 광장, 클락켄플랩 → 관람차 옆', async () => {
  await D.loadRegion('hksz');
  const ids = new Set(D.PLACES.map(p => p.id));
  D.EVENTS.forEach(e => assert.ok(e.place && ids.has(e.place), e.id));
  const sq = D.PLACES.find(p => p.id === 'hk_statuesq');
  assert.equal(sq.area, 'central'); assert.equal(sq.indoor, false); assert.ok(sq.kind);
  assert.ok(Math.abs(sq.lat - 22.2812) < 0.002 && Math.abs(sq.lng - 114.1599) < 0.002);
  assert.ok(buildDays(trip()).length === 5);
  await D.loadRegion('tokyo');
});
