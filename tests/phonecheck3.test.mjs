// 실제 폰 확인(11/14)에서 고친 것: 짐을 먼저 옮기는 날의 일정·출발점, 늦었을 때 야시장 남기기, 실내 장소 수 문구용 값
//   (날짜·장소 조합은 모두 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, rebag, placeCity, lateOf } from '../js/logic.js';
import { bagFirst, bagRows } from '../js/bags.js';
import { dayTrips, crossesBorder } from '../js/transit.js';
import { catchUp } from '../js/catchup.js';
import { dayTimes } from '../js/ics.js';
import { mealSlots } from '../js/food.js';
import { DAY_START } from '../js/flight.js';
import { indoorShare } from '../js/rain.js';

const NIGHTS = { '2027-03-06':'area:central', '2027-03-07':'area:central', '2027-03-08':'area:central', '2027-03-09':'area:central', '2027-03-10':'area:oct', '2027-03-11':'area:oct', '2027-03-12':'area:oct' };
const trip = extra => Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', adults:2, kids:[10], pace:'normal', start:'2027-03-06', end:'2027-03-13', nights:NIGHTS }, extra);
const pick = ids => Object.fromEntries(ids.map(id => [id, true]));
const MOVE = '2027-03-10';   // 센트럴 → 화교성으로 숙소를 옮기는 날 (국경을 넘음)
const PICKS = ['hk_walledcity', 'hk_wongtaisin', 'hk_shanghaist', 'hk_ladies', 'hk_temple', 'hk_pottinger', 'hk_escalator', 'hk_pmq', 'hk_catstreet', 'hk_peak', 'hk_avenue',
  'hk_k11', 'hk_history', 'sz_dongmen', 'sz_window', 'sz_dji', 'sz_mixc'];

test('짐을 먼저 옮기는 날: 새 숙소에서 출발하고, 떠나온 도시의 장소는 자동으로 안 넣음', async () => {
  await D.loadRegion('hksz');
  try{
    const ids = PICKS.filter(id => D.PLACES.some(p => p.id === id));
    const s0 = trip({ picked:pick(ids) }); const P0 = plan(s0); const d0 = P0.days.find(d => d.key === MOVE);
    assert.ok(d0.cross && !d0.start, '고르기 전에는 떠나는 숙소에서 출발');
    assert.equal(bagFirst(s0, d0), false);
    const s1 = trip({ picked:pick(ids), bags:{ [MOVE]:'first' } }); const P1 = plan(s1); const d1 = P1.days.find(d => d.key === MOVE);
    assert.equal(bagFirst(s1, d1), true);
    assert.equal(d1.start.name, d1.to.name); assert.equal(d1.lead, 120);
    assert.ok(d1.items.every(p => placeCity(p) === 'sz'), '이날은 선전 장소만: ' + d1.items.map(p => p.id).join(','));
    // 그날 이동에는 국경 구간이 없음 (새 숙소 → 장소 → 새 숙소)
    const T = dayTrips(d1, P1.hotel); assert.ok(T.legs.every(l => !crossesBorder(l.segs)));
    // 떠나온 도시 장소 가운데 이날에 있던 것은 다른 날로 가거나 못 넣은 곳에
    d0.items.filter(p => placeCity(p) === 'hk').forEach(p => assert.ok(!d1.items.some(q => q.id === p.id)));
    // 첫 장소 시각은 국경 넘은 뒤 (10시 + 2시간 뒤)
    const tm = dayTimes(s1, d1); if(tm.length) assert.ok(tm[0].start >= DAY_START + 120);
    // 아침 8시 반에 '지금 출발하면 언제 끝나나'도 새 숙소에 닿은 뒤부터 셈
    const cu = catchUp(s1, P1, d1.i, d1.key, 8 * 60 + 30); if(cu) assert.ok(cu.finish >= DAY_START + 120 + Math.round(d1.items[0].hours * 60), '끝 시각 ' + cu.finish);
    // 점심은 첫 장소(새 숙소 근처)에서
    const lunch = mealSlots(d1, d1.start, d1.to).find(x => x.meal === 'lunch'); if(lunch && d1.items.length) assert.equal(lunch.at.id || lunch.at.name, d1.items[0].id);
    // 시간 정해진 일: 체크아웃 → 새 숙소에 먼저 짐 맡기기
    assert.match(bagRows(s1, d1, null)[0].text, /먼저 짐 맡기기/);
    // 다른 방법(맡겼다 찾기)은 그대로 떠나는 숙소에서 출발
    const s2 = trip({ picked:pick(ids), bags:{ [MOVE]:'keep' } }); const d2 = plan(s2).days.find(d => d.key === MOVE);
    assert.ok(!d2.start);
  } finally { D.useRegion('tokyo'); }
});

test('짐을 먼저 옮기는 날에 손으로 넣은 떠나온 도시 장소는 그대로 둠 (화면에서 경고)', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ picked:pick(['hk_k11', 'sz_window']), bags:{ [MOVE]:'first' } });
    const di = plan(s).days.find(d => d.key === MOVE).i; s.assign = { hk_k11:di };
    const d = plan(s).days[di];
    assert.ok(d.items.some(p => p.id === 'hk_k11'));
    assert.ok(dayTrips(d, null).legs.some(l => crossesBorder(l.segs)), '국경을 다시 넘는 구간이 보여야 함');
  } finally { D.useRegion('tokyo'); }
});

test('짐 방법을 바꿔도 다른 날 일정은 그대로 (rebag)', async () => {
  await D.loadRegion('hksz');
  try{
    const ids = PICKS.filter(id => D.PLACES.some(p => p.id === id));
    const s = trip({ picked:pick(ids) }); const P0 = plan(s); const d0 = P0.days.find(d => d.key === MOVE);
    const at0 = Object.fromEntries(P0.days.flatMap(d => d.items.map(p => [p.id, d.i])));
    // 들고 다니기: 일정이 안 바뀌니 고정도 안 함
    const c = rebag(s, MOVE, { [MOVE]:'carry' }); assert.equal(c.assign, s.assign); assert.equal(c.out.length, 0);
    // 먼저 옮기기: 그날 곳만 다시 놓이고 다른 날 곳은 제자리
    const r = rebag(s, MOVE, { [MOVE]:'first' }); const s1 = Object.assign({}, s, { bags:{ [MOVE]:'first' }, assign:r.assign }); const P1 = plan(s1);
    Object.keys(at0).filter(id => at0[id] !== d0.i).forEach(id => { const d = P1.days.find(x => x.items.some(p => p.id === id)); assert.equal(d && d.i, at0[id], id + ' 는 제자리'); });
    const d1 = P1.days[d0.i]; assert.ok(d1.items.every(p => placeCity(p) === 'sz'));
    const gone = d0.items.filter(p => placeCity(p) === 'hk' && !P1.days.some(d => d.items.some(q => q.id === p.id)));
    assert.deepEqual(r.out.map(p => p.id).sort(), gone.map(p => p.id).sort());   // 빠진 곳을 알려 줌
    // 다시 풀면 그날 곳이 돌아오고, 다른 날은 여전히 제자리
    const b = rebag(s1, MOVE, {}); const P2 = plan(Object.assign({}, s1, { bags:{}, assign:b.assign }));
    Object.keys(at0).forEach(id => { const d = P2.days.find(x => x.items.some(p => p.id === id)); assert.equal(d && d.i, at0[id], id + ' 는 처음 자리'); });
  } finally { D.useRegion('tokyo'); }
});

test('늦었을 때: 낮에도 야시장·해 질 녘 곳은 맨 나중에 뺌', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ picked:pick(['hk_walledcity', 'hk_wongtaisin', 'hk_shanghaist', 'hk_ladies', 'hk_temple']), must:{ hk_wongtaisin:true } });
    const P = plan(s); const d = P.days.find(x => x.items.length === 5); assert.ok(d, '다섯 곳이 한 날에');
    const c = catchUp(s, P, d.i, d.key, 15 * 60 + 40);   // 15:40, 하나도 표시 안 함
    assert.ok(c && c.drop.length >= 1);
    assert.ok(!c.drop.some(x => x.p.id === 'hk_temple'), '야시장을 먼저 빼지 않음: ' + c.drop.map(x => x.p.id).join(','));
    assert.ok(c.drop.every(x => lateOf(x.p) < 1), '낮 곳부터 뺌');
    assert.ok(c.keep.some(p => p.id === 'hk_temple'));
    // 아주 늦어 다 못 가면 저녁 곳도 빠질 수 있음 (끝없이 돌지 않음)
    const late = catchUp(s, P, d.i, d.key, 21 * 60 + 10); assert.ok(late && late.drop.length >= 4);
  } finally { D.useRegion('tokyo'); }
});

test('실내 장소 수: 하루 종일 가는 곳은 빼고 세고, 뺀 수를 알려 줌', async () => {
  await D.loadRegion('hksz');
  try{
    const r = indoorShare(trip({ picked:pick(['hk_disney', 'hk_k11', 'hk_peak']) }));
    assert.equal(r.total, 2); assert.equal(r.skip, 1);
  } finally { D.useRegion('tokyo'); }
});
