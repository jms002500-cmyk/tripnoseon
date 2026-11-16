// 이날의 메인 (v0.91.0, 2026-11-16). 도쿄 기본 자료 + 지어낸 날짜·장소
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone, plan, buildDays, NEAR_MAIN_KM, isFood, mainIdx } from '../js/logic.js';
import { setMain, nearMain, mainChoices, pullToDay } from '../js/daymain.js';
import { cleanShared, SHARED_KEYS, MAP_KEYS } from '../js/sharecore.js';

// 4박 5일(가운데 3일이 온전한 날), 숙소 동네 신주쿠
const base = () => {
  const s = clone(DEFAULT);
  Object.assign(s, { city:'tokyo', start:'2027-03-08', end:'2027-03-12', hotelArea:'shinjuku', pace:'normal' });
  return s;
};
const dayOf = (P, id) => { const d = P.days.find(x => (x.full && x.full.id === id) || x.items.some(p => p.id === id) || (x.meals || []).some(p => p.id === id)); return d ? d.i : null; };
// 디즈니(마이하마) 근처 식당 (지어낸 곳)
const FOOD = { id:'gfood1', name:'테스트 마이하마 식당', kind:'먹거리', area:'odaiba', lat:35.6305, lng:139.8830, hours:1, indoor:true, custom:true, src:'link' };

test('메인 정하기: 하루 종일이 아닌 메인(센소지) 날로 근처(2.5km) 담은 곳이 모이고, 먼 곳은 그대로', () => {
  const s = base();
  ['sensoji', 'skytree', 'kappabashi', 'scramble', 'meiji', 'takeshita'].forEach(id => { s.picked[id] = true; });
  const days = buildDays(s); const key = days[2].key;
  assert.ok(setMain(s, key, 'sensoji'));
  assert.equal(s.dmain[key], 'sensoji');
  const P = plan(s); const d = P.days[2];
  assert.equal(d.main.id, 'sensoji');
  assert.equal(dayOf(P, 'sensoji'), 2);
  assert.equal(dayOf(P, 'skytree'), 2);       // 약 1.3km
  assert.equal(dayOf(P, 'kappabashi'), 2);    // 약 0.8km
  assert.ok(['scramble', 'meiji', 'takeshita'].every(id => dayOf(P, id) !== 2));   // 시부야·하라주쿠는 다른 날
  assert.deepEqual(mainIdx(s, days), { sensoji:2 });
});

test('메인 풀기·다른 날로 바꾸기: 한 곳은 하루의 메인만', () => {
  const s = base(); s.picked.sensoji = true; s.picked.skytree = true;
  const days = buildDays(s);
  setMain(s, days[1].key, 'sensoji'); setMain(s, days[3].key, 'sensoji');
  assert.deepEqual(s.dmain, { [days[3].key]:'sensoji' });
  setMain(s, days[3].key, '');
  assert.deepEqual(s.dmain, {});
  assert.equal(setMain(s, '2099-01-01', 'sensoji'), false);   // 여행 날짜가 아니면 안 바꿈
  assert.equal(setMain(s, days[1].key, 'nope'), false);       // 없는 장소
});

test('하루 종일 메인(디즈니랜드): 그날로, 근처 담은 식당은 그날 먹을 곳(시간에 안 넣음)', () => {
  const s = base(); s.custom = [FOOD];
  ['tdl', 'sensoji', 'gfood1'].forEach(id => { s.picked[id] = true; });
  const days = buildDays(s);
  setMain(s, days[3].key, 'tdl');
  const P = plan(s); const d = P.days[3];
  assert.equal(d.full.id, 'tdl'); assert.equal(d.main.id, 'tdl');
  assert.deepEqual(d.meals.map(p => p.id), ['gfood1']);
  assert.ok(!P.days.some(x => x.items.some(p => p.id === 'gfood1')));   // 다른 날 일정 시간에도 안 들어감
  assert.ok(!P.unassigned.some(u => u.p.id === 'gfood1'));
  assert.ok(isFood(FOOD)); assert.ok(!isFood({ kind:'공원·정원' })); assert.ok(isFood({ kind:'쇼핑', tags:['맛집'] }));
});

test('하루 종일이 아닌 메인이 있는 날에는 다른 하루 종일 곳이 자동으로 안 들어감', () => {
  const s = base(); ['tdl', 'sensoji'].forEach(id => { s.picked[id] = true; });
  const days = buildDays(s);
  const auto = plan(s); const tdlDay = auto.days.find(x => x.full && x.full.id === 'tdl').i;
  setMain(s, days[tdlDay].key, 'sensoji');
  const P = plan(s);
  assert.equal(P.days[tdlDay].main.id, 'sensoji');
  assert.notEqual(dayOf(P, 'tdl'), tdlDay);
});

test('메인 근처: 다른 날 담은 곳·안 담은 추천(가까운 순 6곳), 하루 종일 메인이면 먹을 곳만', () => {
  const s = base(); ['sensoji', 'meiji'].forEach(id => { s.picked[id] = true; });
  s.assign.hanayashiki = 0; s.picked.hanayashiki = true;   // 손으로 1일차에 둔 근처 곳
  const days = buildDays(s); setMain(s, days[2].key, 'sensoji');
  const P = plan(s); const N = nearMain(s, P, P.days[2]);
  assert.deepEqual(N.other.map(o => [o.p.id, o.day]), [['hanayashiki', 0]]);
  assert.ok(N.recs.length > 0 && N.recs.length <= 6);
  assert.ok(N.recs.every(o => o.km <= NEAR_MAIN_KM && !s.picked[o.p.id]));
  assert.ok(N.recs.every((o, i, a) => !i || a[i - 1].km <= o.km));
  assert.equal(nearMain(s, P, P.days[1]), null);   // 메인 없는 날
  // 하루 종일 메인: 먹을 곳만
  const t = base(); t.custom = [FOOD, Object.assign({}, FOOD, { id:'gpark', name:'테스트 공원', kind:'공원·정원' })];
  ['tdl'].forEach(id => { t.picked[id] = true; });
  setMain(t, buildDays(t)[3].key, 'tdl');
  const Q = plan(t); const M = nearMain(t, Q, Q.days[3]);
  assert.deepEqual(M.recs.map(o => o.p.id), ['gfood1']);
});

test('이날로 옮기기·담기: 다른 곳은 그대로, 하루 종일 메인 날이면 날짜를 풀어 먹을 곳으로', () => {
  const s = base(); ['sensoji', 'meiji', 'scramble'].forEach(id => { s.picked[id] = true; });
  const P0 = plan(s); const before = {}; P0.days.forEach(d => d.items.forEach(p => { before[p.id] = d.i; }));
  pullToDay(s, 'skytree', 3, false);
  assert.equal(s.picked.skytree, true); assert.equal(s.assign.skytree, 3);
  const P = plan(s); ['sensoji', 'meiji', 'scramble'].forEach(id => assert.equal(dayOf(P, id), before[id]));
  pullToDay(s, 'skytree', 3, true);
  assert.equal(s.assign.skytree, undefined);
});

test('메인 고르기 목록: 꼭 갈 곳 → 그날 곳 → 이름순, 담은 곳만', () => {
  const s = base(); ['sensoji', 'skytree', 'meiji'].forEach(id => { s.picked[id] = true; }); s.must.meiji = true;
  const P = plan(s); const d = P.days.find(x => x.items.some(p => p.id === 'skytree'));
  const ids = mainChoices(s, d).map(p => p.id);
  assert.equal(ids[0], 'meiji');
  assert.ok(ids.indexOf('skytree') < ids.length);
  assert.ok(!ids.includes('scramble'));
});

test('함께 짜기: 메인은 공유하고, 이상한 값은 버림', () => {
  assert.ok(SHARED_KEYS.includes('dmain')); assert.ok(MAP_KEYS.includes('dmain'));
  const c = cleanShared({ dmain:{ '2027-03-10':'sensoji', 'not-a-date':'x', '2027-03-11':{ a:1 }, '2027-03-12':'y'.repeat(90) } });
  assert.deepEqual(c.dmain, { '2027-03-10':'sensoji' });
  assert.deepEqual(cleanShared({}).dmain, {});
});
