// 폰 전체 점검(11/10)에서 고친 것: 저녁 장소 순서·시각, 오는 날 안내, 공항별 카운터, 편명 꼴, 다른 기기 항공권, 점심 가격, 시간 표기, 숙소 할 일
//   (편명·날짜·사람은 모두 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, lateOf, orderDay, LATE_AT, NIGHT_END } from '../js/logic.js';
import { dayTimes } from '../js/ics.js';
import { catchUp } from '../js/catchup.js';
import { nearbyOf } from '../js/nearby.js';
import { counterFor, airlineOf } from '../js/airlines.js';
import { fnoKey, fsegId, fsegsNorm, fsegsFill, applyFlight } from '../js/bookings.js';
import { missingBookings } from '../js/vault.js';
import { mealSlots } from '../js/food.js';
import { pricey, eatsNear } from '../js/eats.js';
import { hrText } from '../js/flight.js';
import { dayAgenda } from '../js/agenda.js';
import { prepTasks } from '../js/prep.js';

const P = (id, lat, lng, extra) => Object.assign({ id, name:id, lat, lng, hours:1, area:'x' }, extra);

test('저녁 곳(야시장·야경)은 그날 맨 뒤, 해 질 녘 곳은 그 앞', () => {
  const night = P('nm', 22.307, 114.170, { name:'어느 야시장' }), view = P('vw', 22.29, 114.17, { kind:'야경·일루미네이션' }), dusk = P('pk', 22.27, 114.15, { eve:1 });
  const a = P('a', 22.307, 114.171), b = P('b', 22.31, 114.17);
  assert.deepEqual([night, view, dusk, a].map(lateOf), [2, 2, 1, 0]);
  assert.equal(lateOf(P('c', 0, 0, { kind:'야경·일루미네이션', eve:0 })), 0);   // 자료에 적은 값이 먼저
  const o = orderDay([night, a, dusk, view, b], { lat:22.28, lng:114.16 });
  assert.deepEqual(o.map(p => lateOf(p)), [0, 0, 1, 2, 2]);
});

test('일정 초안: 템플 스트리트 야시장은 몽콕 날 맨 뒤, 캘린더 시각은 저녁 6시부터', async () => {
  await D.loadRegion('hksz');
  try{
    const s = Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', adults:2, kids:[10], start:'2027-03-08', end:'2027-03-11',
      picked:{ hk_temple:true, hk_ladies:true, hk_shanghaist:true, hk_sneaker:true } });
    const ids = Object.keys(s.picked).filter(id => D.PLACES.some(p => p.id === id));
    assert.ok(ids.includes('hk_temple'));
    const d = plan(s).days.find(x => x.items.some(p => p.id === 'hk_temple'));
    assert.ok(d, '야시장이 들어간 날');
    assert.equal(d.items[d.items.length - 1].id, 'hk_temple');
    const T = dayTimes(s, d); const t = T.find(x => x.p.id === 'hk_temple');
    assert.ok(t.start >= LATE_AT[2], `야시장 시작 ${t.start}`);
    // 낮 11시에 야시장 바로 옆: 야시장이 맨 위가 아님, 저녁 7시엔 맨 위
    const here = { lat:22.3070, lng:114.1701 };
    const am = nearbyOf({ places:D.PLACES, eats:D.EATS, s, pt:here, wd:2, hour:11 }), pm = nearbyOf({ places:D.PLACES, eats:[], s, pt:here, wd:2, hour:19 });
    assert.notEqual(am.items[0].p.id, 'hk_temple');
    assert.equal(pm.items[0].p.id, 'hk_temple');
    assert.ok(am.items.find(x => x.p.id === 'hk_temple' && x.night) || !am.items.some(x => x.p.id === 'hk_temple'));
    // 점심때 근처 가족 식당: 1인 5만 원 넘는 곳은 뒤로
    const cheap = eatsNear(D.EATS, { lat:22.2805, lng:114.1555 }, { km:1.5, meal:true, cheap:true, limit:20 });
    const meals = cheap.filter(e => e.kind !== '디저트' && e.kind !== '카페'); const firstPricey = meals.findIndex(pricey);   // 간식 가게는 원래 끼니 뒤
    assert.ok(meals.some(pricey) && firstPricey > 0 && meals.slice(firstPricey).every(pricey));
  } finally { D.useRegion('tokyo'); }
});

test('늦었을 때: 저녁 곳이 남은 날은 밤 9시 반까지 보고, 저녁까지 기다리는 시간을 셈', () => {
  const s = Object.assign(clone(D.DEFAULT), { pace:'normal', must:{}, tdone:{} });
  const a = P('a', 35.68, 139.76), n = P('n', 35.681, 139.761, { kind:'야경·일루미네이션', hours:1 });
  const day = { i:0, key:'2027-03-08', kind:'full', items:[a, n], from:{ lat:35.679, lng:139.759 } };
  const c = catchUp(s, { days:[day] }, 0, day.key, 15 * 60);
  assert.equal(c.end, NIGHT_END);
  assert.equal(c.drop.length, 0);
  assert.ok(c.finish >= LATE_AT[2] + 60);   // 6시에 시작해 1시간
});

test('카운터 안내: 홍콩공항 것은 인천에서 떠날 때 안 보여 줌', () => {
  const hx = airlineOf('HX700'), ke = airlineOf('KE900');
  assert.match(counterFor(hx, 'HKG'), /^홍콩공항/);
  assert.doesNotMatch(counterFor(hx, 'ICN'), /홍콩공항/);
  assert.match(counterFor(hx, 'ICN'), /이 공항 안내/);
  assert.equal(counterFor(ke, 'HKG'), ke.counter);
  assert.equal(counterFor(null, 'ICN'), '');
});

test('편명 꼴 맞추기: 앞의 0을 빼고, 예전에 0이 붙은 칸은 합침', () => {
  assert.deepEqual(['HX 0700', 'hx0700', 'CX400', '7C1101', 'MM0001', 'KAL900'].map(fnoKey), ['HX700', 'HX700', 'CX400', '7C1101', 'MM1', 'KAL900']);
  assert.equal(fsegId('2027-03-08', 'HX0700'), fsegId('2027-03-08', 'HX700'));
  const old = { f20270308HX0700:{ dir:'out', fno:'HX0700', date:'2027-03-08', from:'ICN', to:'HKG', dep:'08:00', arr:'', who:['a1'], ck:['a1'] },
    f20270308HX700:{ dir:'out', fno:'HX700', date:'2027-03-08', from:'', to:'HKG', dep:'', arr:'10:40', who:['a2'] } };
  const n = fsegsNorm(old); const k = fsegId('2027-03-08', 'HX700');
  assert.deepEqual(Object.keys(n), [k]);
  assert.deepEqual([n[k].fno, n[k].from, n[k].dep, n[k].arr, n[k].who, n[k].ck], ['HX700', 'ICN', '08:00', '10:40', ['a1', 'a2'], ['a1']]);
  assert.equal(fsegsNorm(n), null);
  const S = { city:'hksz', adults:2, kids:[], start:'2027-03-08', end:'2027-03-11', flight:{ ap:'HKG', arr:'', dep:'', ap2:'', way:'' }, vault:[] };
  assert.ok(fsegsFill(Object.assign({}, S, { fsegs:{ f20270308HX0700:old.f20270308HX0700 } }))[k]);   // 앱 열 때 고침
  const r = applyFlight(Object.assign({}, S, { fsegs:n }), { kind:'flight', fno:'HX 0700', date:'2027-03-08', dir:'out', time:'08:00', time2:'10:40', from:'ICN', to:'HKG' });
  assert.deepEqual(Object.keys(r.patch.fsegs || n), [k]);   // 다시 읽어도 칸이 하나
});

test('다른 기기에서 넣은 항공권: 보관함에 없다고만 하지 않고 "다른 기기에서 넣었어요"', () => {
  const s = { city:'hksz', flight:{ way:'' }, hotels:[], picked:{}, fsegs:{ f1:{ dir:'out', fno:'CX400', date:'2027-03-08' } }, vault:[] };
  const m = missingBookings(s, []).filter(x => x.kind === 'flight');
  assert.deepEqual(m.map(x => [x.dir, !!x.other]), [['out', true], ['back', false]]);
  assert.match(m[0].title, /다른 기기/);
});

test('오는 날 오후 1시 반 전에 공항으로 나서면 점심 자리 없음', () => {
  const hotel = { name:'숙소', lat:1, lng:1 };
  assert.deepEqual(mealSlots({ kind:'depart', items:[], depart:{ leave:560 } }, hotel), []);
  assert.deepEqual(mealSlots({ kind:'depart', items:[], depart:{ leave:900 } }, hotel).map(x => x.meal), ['lunch']);
});

test('시간 표기: 소수 대신 시간·분', () => {
  assert.deepEqual([0.25, 0.5, 1, 1.5, 4.75, 29.25].map(hrText), ['15분', '30분', '1시간', '1시간 30분', '4시간 45분', '29시간 15분']);
});

test('비행기 타는 날 체크인 안 한 사람 알림: 숙소·집을 나서기 전', () => {
  const s = { city:'hksz', adults:2, kids:[], flight:{ ap:'HKG', arr:'10:40', dep:'12:40', ap2:'', way:'', odep:'08:00' }, moves:[], vault:[],
    fsegs:{ b:{ dir:'back', fno:'CX401', date:'2027-03-11', from:'HKG', to:'ICN', dep:'12:40', who:['a1', 'a2'] }, o:{ dir:'out', fno:'HX700', date:'2027-03-08', from:'ICN', to:'HKG', dep:'08:00', who:['a1'] } } };
  const z = dayAgenda(s, { i:3, key:'2027-03-11', depart:{ at:760, leave:560, ap:{ name:'홍콩 국제공항', code:'HKG' }, transfer:50 } }, {});
  const w = z.find(x => /체크인 안 한/.test(x.text)), go = z.find(x => /공항으로 출발/.test(x.text));
  assert.ok(w && go && w.min < go.min, `${w && w.min} < ${go && go.min}`);
  const a = dayAgenda(s, { i:0, key:'2027-03-08', arrive:{ at:640, ap:{ name:'홍콩 국제공항' }, transfer:50 } }, {});
  const w1 = a.find(x => /체크인 안 한/.test(x.text)), at = a.find(x => /공항 도착 · 체크인/.test(x.text));
  assert.ok(w1.home && w1.kst < at.kst);
  assert.doesNotMatch(at.sub + w1.sub, /홍콩공항:/);   // 인천에서 떠나는데 홍콩공항 카운터 안내는 안 붙임
});

test('출발 전 할 일: 숙소를 아직 안 넣었으면 3주 전에 "예약한 숙소를 앱에 넣기", 넣으면 저절로 체크', () => {
  const base = Object.assign(clone(D.DEFAULT), { start:'2027-03-08', end:'2027-03-11' });
  const t = prepTasks(base).find(x => x.key === 'hoteladd');
  assert.ok(t && t.dday === 21 && !t.done);
  assert.ok(prepTasks(Object.assign({}, base, { vault:[{ kind:'hotel' }] })).find(x => x.key === 'hoteladd').done);
  assert.equal(prepTasks(base).find(x => x.key === 'hotelcard').dday, 14);
});

test('숙소 옮기는 날 짐: 고르면 시간 정해진 일에 줄, 맡겼다 찾기는 1시간 빼고, 함께 짜기로 공유(정한 값만)', async () => {
  const { moveDay, bagChoices, bagRows, bagCapCut } = await import('../js/bags.js');
  const { cleanShared, SHARED_KEYS, MAP_KEYS } = await import('../js/sharecore.js');
  const d = { i:2, key:'2027-03-10', kind:'full', cross:true, from:{ name:'A 호텔' }, to:{ name:'B 호텔' }, items:[] };
  assert.ok(moveDay(d)); assert.ok(!moveDay(Object.assign({}, d, { to:{ name:'A 호텔' } }))); assert.ok(!moveDay(Object.assign({}, d, { kind:'depart' })));
  assert.deepEqual(bagChoices(d).map(c => c.k), ['keep', 'first', 'car', 'carry']);
  assert.deepEqual(bagChoices(Object.assign({}, d, { cross:false })).map(c => c.k), ['keep', 'first', 'carry']);   // 국경 안 넘으면 차 없음
  assert.match(bagRows({}, d, null)[0].text, /짐을 어떻게 할지/);
  const r = bagRows({ bags:{ '2027-03-10':'keep' } }, d, 16 * 60);
  assert.deepEqual(r.map(x => [x.min, x.text]), [[560, '체크아웃 · A 호텔에 짐 맡기기'], [960, 'A 호텔에서 짐 찾아 B 호텔로']]);
  assert.equal(bagCapCut({ bags:{ '2027-03-10':'keep' } }, d), 1);
  assert.equal(bagCapCut({ bags:{ '2027-03-10':'first' } }, d), 0);
  assert.ok(SHARED_KEYS.includes('bags') && MAP_KEYS.includes('bags'));
  const c = cleanShared(Object.assign(clone(D.DEFAULT), { bags:{ '2027-03-10':'car', '2027-03-11':'bad', 'x':'keep' } }));
  assert.deepEqual(c.bags, { '2027-03-10':'car' });
});

test('체크인 안 한 사람 알림은 나서기 전까지 "다음에 할 일" 맨 앞에 남음, 해 질 녘 곳은 순서만 뒤로', async () => {
  const { nextUp } = await import('../js/agenda.js');
  const L = [{ min:440, until:490, text:'⚠️' }, { min:490, text:'출발' }, { min:760, text:'비행기' }];
  assert.deepEqual([nextUp(L, 480).next.text, nextUp(L, 480).later.map(x => x.text)], ['⚠️', ['출발', '비행기']]);
  assert.equal(nextUp(L, 510).next.text, '비행기');   // 나선 뒤(10분 넘게)엔 알림도 지난 일
  assert.equal(hrText(0), '0시간');
  const s = Object.assign(clone(D.DEFAULT), { pace:'normal' });
  const T = dayTimes(s, { kind:'full', items:[P('pk', 35.68, 139.76, { eve:1 })], from:{ lat:35.679, lng:139.759 } });
  assert.ok(T[0].start < LATE_AT[1]);   // 해 질 녘 곳 하나뿐이면 아침부터 기다리지 않음
});
