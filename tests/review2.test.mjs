// 2차 검토(11/13)에서 고친 것: 한 곳만 옮기기, 오후·저녁 순서, 옮기는 날 저녁 곳, 하루 장소 수, 늦었을 때, 첫날 저녁, 체크인 알림, 준비물·할 일 나누기, 더한 것
//   (편명·날짜·이름은 모두 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, pinPlan, lateOf, orderDay, lateText, MAX_STOPS } from '../js/logic.js';
import { catchUp, EVE_END } from '../js/catchup.js';
import { mealSlots } from '../js/food.js';
import { dayAgenda, nextUp } from '../js/agenda.js';
import { suggestPacking, PACK_TASKS } from '../js/packing.js';
import { prepTasks, PREP_APP } from '../js/prep.js';
import { tomorrowOf } from '../js/tomorrow.js';
import { counterFor, counterKnown, COUNTER_ANY, airlineOf } from '../js/airlines.js';

const trip = extra => Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', adults:2, kids:[10], pace:'normal', start:'2027-03-06', end:'2027-03-13',
  nights:{ '2027-03-06':'area:central', '2027-03-07':'area:central', '2027-03-08':'area:central', '2027-03-09':'area:central', '2027-03-10':'area:oct', '2027-03-11':'area:oct', '2027-03-12':'area:oct' } }, extra);
const pick = ids => Object.fromEntries(ids.map(id => [id, true]));
const where = (P, id) => { const d = P.days.find(x => x.items.some(p => p.id === id)); return d ? d.i : -1; };

test('한 곳만 옮기면 나머지는 그 날짜에 그대로 (pinPlan)', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ picked:pick(['hk_shanghaist', 'hk_ladies', 'hk_walledcity', 'hk_wongtaisin', 'hk_temple', 'hk_pottinger', 'hk_escalator', 'hk_pmq', 'hk_catstreet', 'hk_peak', 'hk_k11', 'hk_history', 'hk_avenue']) });
    const P0 = plan(s); const before = Object.fromEntries(P0.days.flatMap(d => d.items.map(p => [p.id, d.i])));
    assert.ok(before.hk_avenue != null);
    const to = P0.days.find(d => d.i !== before.hk_avenue && d.kind === 'full' && !d.cross).i;
    s.assign = pinPlan(s, P0); s.assign.hk_avenue = to;
    const P1 = plan(s);
    assert.equal(where(P1, 'hk_avenue'), to);
    Object.keys(before).filter(id => id !== 'hk_avenue').forEach(id => assert.equal(where(P1, id), before[id], id));   // 다른 곳은 안 움직임
  } finally { D.useRegion('tokyo'); }
});

test('순서: 사원·공원 → 오후부터 여는 시장 → 해 질 녘 → 저녁, 저녁 곳은 숙소 옮기는 날을 피함', async () => {
  await D.loadRegion('hksz');
  try{
    const by = id => D.PLACES.find(p => p.id === id);
    assert.deepEqual(['hk_wongtaisin', 'hk_shanghaist', 'hk_ladies', 'hk_temple'].map(id => lateOf(by(id))), [0, 0.5, 1, 2]);
    assert.equal(lateText(by('hk_shanghaist')), '오후에 가요');
    const o = orderDay(['hk_temple', 'hk_ladies', 'hk_shanghaist', 'hk_wongtaisin', 'hk_walledcity'].map(by), { lat:22.2819, lng:114.158 });
    assert.deepEqual(o.map(lateOf), [0, 0, 0.5, 1, 2]);
    const s = trip({ picked:pick(['hk_k11', 'hk_history', 'hk_avenue', 'hk_temple', 'hk_ladies', 'hk_wongtaisin', 'sz_window', 'sz_dji']) });
    const P = plan(s); const mv = P.days.find(d => d.from.name !== d.to.name);
    assert.ok(mv && mv.cross);
    assert.ok(!mv.items.some(p => lateOf(p) === 2), '숙소 옮기는 날에 저녁 곳 없음: ' + mv.items.map(p => p.id));
    assert.ok(where(P, 'hk_avenue') >= 0 && where(P, 'hk_temple') >= 0);
  } finally { D.useRegion('tokyo'); }
});

test('하루 장소 수 한도: 속도 "적당히"는 5곳까지, 손으로 넣은 건 그대로', () => {
  assert.deepEqual(MAX_STOPS, { relaxed:4, normal:5, packed:7 });
  const s = Object.assign(clone(D.DEFAULT), { pace:'normal', who:'family', adults:2, kids:[10], start:'2027-03-06', end:'2027-03-10',
    custom:Array.from({ length:9 }, (_, i) => ({ id:'c' + i, name:'곳' + i, area:'asakusa', lat:35.7148 + i * 0.001, lng:139.7967, hours:0.75, tags:[], kid:'all' })) });
  s.picked = pick(s.custom.map(p => p.id));
  const P = plan(s);
  P.days.forEach(d => assert.ok(d.items.length <= 5, `${d.i + 1}일차 ${d.items.length}곳`));
  s.assign = Object.fromEntries(s.custom.slice(0, 7).map(p => [p.id, 1]));   // 손으로 7곳을 한 날에
  assert.ok(plan(s).days[1].items.length >= 7);
});

test('늦었을 때: 기준은 밤 9시(줄지 않음), 저녁엔 낮 곳부터 빼고 가장 늦게 가는 저녁 곳을 남김', () => {
  const s = Object.assign(clone(D.DEFAULT), { pace:'normal', must:{ t:true }, tdone:{} });
  const P = (id, lat, extra) => Object.assign({ id, name:id, lat, lng:139.76, hours:1, area:'x' }, extra);
  const temple = P('t', 35.680), park = P('p', 35.681), market = P('m', 35.682, { eve:1 }), night = P('n', 35.683, { eve:2, hours:1.5 });
  const day = { i:0, key:'2027-03-08', kind:'full', items:[temple, park, market, night], from:{ lat:35.679, lng:139.759 } };
  const c = catchUp(s, { days:[day] }, 0, day.key, 19 * 60 + 10);
  assert.deepEqual(c.keep.map(p => p.id), ['n']);   // 야시장을 남기고 사원(꼭 갈 곳이어도 밤엔 못 감)·공원·시장을 뺌
  const day2 = Object.assign({}, day, { items:[temple, park] });   // 저녁 곳을 옮긴 뒤에도 기준이 19시로 줄지 않음
  const c2 = catchUp(s, { days:[day2] }, 0, day.key, 15 * 60 + 40);
  assert.equal(c2.end, EVE_END); assert.equal(c2.drop.length, 0);
  const c3 = catchUp(Object.assign({}, s, { must:{} }), { days:[day] }, 0, day.key, 11 * 60);   // 낮에 다 돌 수 있으면 그대로
  assert.equal(c3.drop.length, 0);
});

test('첫날 저녁은 숙소 도착 뒤, 하루 종일 곳은 돌아와서 20시', () => {
  const hotel = { name:'숙소', lat:1, lng:1 };
  const a = mealSlots({ kind:'arrive', items:[], arrive:{ ready:20 * 60 + 5 } }, hotel);
  assert.deepEqual(a.map(x => [x.meal, x.time, x.at.name]), [['dinner', '20:05', '숙소']]);
  assert.equal(mealSlots({ kind:'arrive', items:[], arrive:{ ready:15 * 60 } }, hotel)[0].time, '18:30');
  assert.equal(mealSlots({ kind:'full', full:{ name:'놀이공원' }, items:[] }, hotel)[0].time, '20:00');
});

test('체크인 열림 알림은 그날 내내 맨 앞, 가는 날 집 → 공항 시간이 없으면 먼저 물어봄, 카운터 일반 문구는 한 번만', () => {
  const s = { city:'hksz', adults:2, kids:[], start:'2027-03-08', end:'2027-03-11', flight:{ ap:'HKG', arr:'10:40', dep:'18:30', ap2:'', way:'', odep:'08:00' }, moves:[], vault:[],
    fsegs:{ b:{ dir:'back', fno:'CX401', date:'2027-03-11', from:'HKG', to:'ICN', dep:'18:30', who:['a1'] }, o:{ dir:'out', fno:'HX700', date:'2027-03-08', from:'ICN', to:'HKG', dep:'08:00', who:['a1'] } } };
  const d9 = dayAgenda(s, { i:1, key:'2027-03-09', items:[] }, {});
  const open = d9.find(x => /온라인 체크인 열림/.test(x.text)); assert.ok(open && open.until === 1440);
  assert.equal(nextUp(d9, 15 * 60).next, open);
  const day1 = { i:0, key:'2027-03-08', arrive:{ at:640, ap:{ name:'홍콩 국제공항' }, transfer:50 } };
  const d1 = dayAgenda(s, day1, {});
  assert.deepEqual([d1[0].kind, d1[0].act, d1[0].v], ['ask', 'mvjump', 'go']);
  const go = dayAgenda(Object.assign({}, s, { moves:[{ id:'go', k:'go', how:'taxi', min:75, time:'', date:'', from:'', to:'', booked:false, note:'' }] }), day1, {});
  assert.ok(!go.some(x => x.kind === 'ask'));
  const hx = airlineOf('HX700');
  assert.equal(counterFor(hx, 'ICN'), COUNTER_ANY); assert.equal(counterKnown(hx, 'ICN'), ''); assert.match(counterKnown(hx, 'HKG'), /^홍콩공항/);
  const warn = d1.find(x => /체크인 안 한/.test(x.text)); assert.doesNotMatch(warn.sub, /공항 안내 확인/);   // 일반 문구는 공항 도착 줄에만
});

test('준비물은 물건만, 해야 하는 일은 출발 전 할 일에만 · 앱 소개 할 일은 따로', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({});
    const k = suggestPacking(s, null).map(x => x.key);
    PACK_TASKS.forEach(x => assert.ok(!k.includes(x), x));
    assert.ok(!k.includes('card') && k.includes('tapCard') && k.includes('data') && k.includes('passport'));
    const T = prepTasks(s); const keys = T.map(x => x.key);
    ['insure', 'payapp', 'cnarrive', 'data', 'mapapp', 'passexp'].forEach(x => assert.ok(keys.includes(x), x));
    assert.deepEqual(T.filter(x => x.app).map(x => x.key).sort(), PREP_APP.slice().sort());
    assert.ok(!prepTasks(Object.assign({}, s, { cityOnly:'hk' })).some(x => x.key === 'mapapp'));
  } finally { D.useRegion('tokyo'); }
});

test('내일 미리 보기: 예약이 필요한 곳인데 보관함에 표가 없으면 맨 앞에 알림', () => {
  const base = { city:'hksz', who:'family', adults:2, kids:[10], pace:'normal', moves:[], vault:[], fsegs:{}, flight:{ ap:'HKG', arr:'', dep:'', ap2:'', way:'' } };
  const park = { id:'park', name:'어느 놀이공원', full:true, book:true, lat:22.3, lng:114.0, hours:0 };
  const h = { name:'A 호텔', lat:22.28, lng:114.16 };
  const P = { days:[{ i:0, key:'2027-03-07', kind:'full', items:[], from:h, to:h }, { i:1, key:'2027-03-08', kind:'full', full:park, items:[], from:h, to:h }] };
  const T = tomorrowOf(base, P, 0, '2027-03-07', {});
  assert.match(T.tips[0].t, /어느 놀이공원 입장권·예약이 보관함에 없어요/); assert.equal(T.tips[0].go, 'vault');
  const T2 = tomorrowOf(Object.assign({}, base, { vault:[{ id:'v1', kind:'ticket', title:'입장권', placeId:'park', date:'2027-03-08' }] }), P, 0, '2027-03-07', {});
  assert.ok(!T2.tips.some(x => /보관함에 없어요/.test(x.t)));
});
