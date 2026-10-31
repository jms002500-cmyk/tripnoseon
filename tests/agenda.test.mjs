// 시간 정해진 일·다음에 할 일, 일정표 글, 출발 전 할 일, 편명 바로가기, 예약 금액 → 가계부, 시내 체크인
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, buildDays } from '../js/logic.js';
import { dayAgenda, nextUp, planText } from '../js/agenda.js';
import { prepTasks, prepNow, daysTo } from '../js/prep.js';
import { flightLinks, normFno } from '../js/flight.js';
import { bookingSpend } from '../js/bookings.js';
import { SHARED_KEYS, MAP_KEYS } from '../js/sharecore.js';
import { buildIcs } from '../js/ics.js';

const mv = (k, o) => Object.assign({ id:k, k, date:'', time:'', how:'', min:null, from:'', to:'', booked:false, note:'' }, o);
const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-09', who:'family', adults:2, kids:[12], picked:{ sensoji:true } }, extra);
const ctx = { ap:'하네다 공항', inHotel:'우에노 숙소', outHotel:'우에노 숙소' };

test('시간 정해진 일: 집→공항(한국 시각), 도착, 공항→숙소, 체크인 순', () => {
  const s = trip({ flight:{ ap:'HND', arr:'11:00', dep:'18:00' }, moves:[mv('go', { how:'abus', time:'06:00' }), mv('in', { how:'rail', time:'12:30', min:40 })],
    vault:[{ id:'h', kind:'hotel', title:'우에노 호텔', date:'2027-03-07', time:'15:00', files:[] }] });
  const d = plan(s).days[0]; const L = dayAgenda(s, d, ctx);
  assert.deepEqual(L.map(x => x.kind), ['move', 'flight', 'move', 'book']);
  assert.equal(L[0].home, true); assert.equal(L[0].kst, 360); assert.equal(L[0].min, 360);   // 도쿄는 한국과 같은 시각
  assert.equal(L[3].text, '체크인 · 우에노 호텔');
  const last = dayAgenda(s, plan(s).days[2], ctx);
  assert.ok(last.some(x => x.text.startsWith('숙소에서 공항으로 출발')) && last.some(x => x.kind === 'flight' && x.dir === 'back'));
});

test('홍콩은 한국보다 1시간 늦게: 집→공항 06:00(한국) = 현지 05:00로 줄 세움', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ city:'hksz', picked:{ hk_space:true }, moves:[mv('go', { how:'car', time:'06:00' })] });
    const L = dayAgenda(s, plan(s).days[0], ctx); assert.equal(L[0].min, 300); assert.equal(L[0].kst, 360);
  } finally { D.useRegion('tokyo'); }
});

test('다음에 할 일: 지금 이후 첫 일, 10분 지난 건 아직 지금', () => {
  const L = [{ min:600 }, { min:720 }, { min:900 }, { min:null }];
  assert.equal(nextUp(L, 715).next.min, 720); assert.equal(nextUp(L, 715).past.length, 1);
  assert.equal(nextUp(L, 725).next.min, 720);
  assert.equal(nextUp(L, 1000).next.min, null);   // 시각 없는 것만 남음
  assert.equal(nextUp(L, null).next.min, 600);
  assert.equal(nextUp([{ min:600 }], 700).next, null);
});

test('일정표 글: 날짜별 이동·장소·숙소, 예약번호 없음, 어림 줄 빼기', () => {
  const s = trip({ flight:{ ap:'HND', arr:'11:00', dep:'' }, moves:[mv('go', { how:'abus', time:'06:00', to:'인천공항' })],
    vault:[{ id:'t', kind:'ticket', title:'입장권', date:'2027-03-08', time:'10:00', code:'SECRET9', files:[] }] });
  const P = plan(s); const t = planText(s, P, ctx, '도쿄 여행 · 3/7~3/9 · 가족 3명');
  assert.match(t, /^🧳 도쿄 여행/); assert.match(t, /06:00\(한국\) 🚌 공항버스 · 집 → 인천공항/); assert.match(t, /1일차 3\/7/);
  assert.match(t, /10:00 🎟️ 입장권/); assert.doesNotMatch(t, /SECRET9/); assert.doesNotMatch(t, /어림$/m);
  assert.match(t, /📍 /);
});

test('출발 전 할 일: D-day 날짜, 지역별, 앱에서 해 둔 건 저절로', () => {
  const s = trip({ start:'2026-12-06', end:'2026-12-10', city:'hksz', cityOnly:'' });
  const T = prepTasks(s); const k = x => T.find(y => y.key === x);
  assert.equal(k('passexp').date, '2026-11-06'); assert.equal(k('leave').date, '2026-12-06');
  assert.ok(k('cnarrive')); assert.ok(!k('vjw'));
  assert.ok(!prepTasks(Object.assign({}, s, { cityOnly:'hk' })).some(x => x.key === 'cnarrive'));   // 홍콩만이면 중국 입국카드 없음
  assert.ok(prepTasks(trip()).some(x => x.key === 'vjw'));
  assert.ok(!k('idcopy').done);
  const s2 = Object.assign({}, s, { vault:[{ id:'p', kind:'idcopy', title:'아빠', files:[{ fid:'f' }] }], prep:{ insure:true } });
  const T2 = prepTasks(s2); assert.ok(T2.find(x => x.key === 'idcopy').auto); assert.ok(T2.find(x => x.key === 'insure').done);
  const n = prepNow(s, '2026-11-30'); assert.equal(n.left, 6);
  assert.ok(n.late.some(x => x.key === 'passexp')); assert.ok(n.soon.some(x => x.key === 'moves')); assert.ok(!n.soon.some(x => x.key === 'checkin'));   // 3일 안 할 일만
  assert.deepEqual(prepNow(s, '2026-12-07').late, []); assert.equal(daysTo('2026-11-30', '2026-12-06'), 6);
  assert.ok(SHARED_KEYS.includes('prep') && MAP_KEYS.includes('prep'));
  const ics = buildIcs(s, plan(s), [], new Date('2026-11-20T00:00:00Z')).replace(/\r\n /g, '');
  assert.ok(ics.includes('D-2 항공사 온라인 체크인')); assert.ok(!ics.includes('여권 만료일 확인'));   // 지난 할 일은 캘린더에 안 넣음
});

test('편명 → 운항 상태 바로가기', () => {
  assert.equal(normFno('cx 411'), 'CX411'); assert.equal(normFno('KE-603'), 'KE603'); assert.equal(normFno('7C1101'), '7C1101'); assert.equal(normFno('1234'), ''); assert.equal(normFno('hello'), '');
  const o = flightLinks('CX411', 'HKG', 'out');
  assert.ok(o[0].google && o[0].url.includes('CX411')); assert.equal(o[1].label, '인천공항 운항정보'); assert.match(o[2].url, /arrivals/);
  const b = flightLinks('CX410', 'HKG', 'back'); assert.match(b[1].url, /departures/); assert.equal(b[2].label, '인천공항 운항정보');
  assert.equal(flightLinks('', 'NRT', 'out').length, 2);   // 편명 없으면 공항 페이지만
});

test('예약 금액 → 가계부 한 줄, 금액 지우면 지움, 고친 날짜는 그대로', () => {
  const s = trip({ spend:{} });
  const r = bookingSpend(s, { id:'v1', kind:'flight', title:'가는 편', amt:450000, cur:'KRW' }, { by:'p1', now:1, day:cat => cat === 'flight' ? 'before' : '' });
  assert.equal(r.id, 'bkv1'); assert.deepEqual([r.e.d, r.e.cat, r.e.amt, r.e.cur, r.e.by, r.e.what], ['before', 'flight', 450000, 'KRW', 'p1', '가는 편']);
  s.spend[r.id] = Object.assign(r.e, { d:'2027-03-07' });
  const r2 = bookingSpend(s, { id:'v1', kind:'flight', title:'가는 편', amt:470000, cur:'KRW' }, { day:() => 'before' });
  assert.equal(r2.e.d, '2027-03-07'); assert.equal(r2.e.amt, 470000);
  assert.deepEqual(bookingSpend(s, { id:'v1', kind:'flight', amt:0 }), { id:'bkv1', del:true });
  assert.equal(bookingSpend(s, { id:'v9', kind:'hotel', amt:0 }), null);
  assert.equal(bookingSpend(s, { id:'v2', kind:'hotel', title:'H', amt:3000, cur:'HKD' }, {}).e.cat, 'stay');
});

test('홍콩 시내 체크인: 짐 찾으러 숙소에 안 들러서 마지막 날 다닐 시간이 늘어남', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ city:'hksz', picked:{ hk_space:true }, flight:{ ap:'HKG', arr:'', dep:'18:00' } });
    const a = buildDays(s).pop().cap; s.flight.itc = true; const b = buildDays(s).pop().cap;
    assert.ok(b > a, `${b} > ${a}`);
    s.vault = []; assert.ok(dayAgenda(s, plan(s).days[2], ctx).some(x => x.kind === 'itc'));
  } finally { D.useRegion('tokyo'); }
});

test('검토에서 고친 것: 여행지 시계, 가는 편/오는 편 짐작, 시각 없는 공항→숙소 순서, 다른 밤 숙소 카드, 기록 문장', async () => {
  const { tripClock } = await import('../js/today.js');
  const at = new Date('2026-12-06T15:30:00Z');   // 한국 00:30(12/7), 홍콩 23:30(12/6)
  assert.deepEqual(tripClock(at, 'Asia/Hong_Kong'), { date:'2026-12-06', min:23 * 60 + 30 });
  assert.deepEqual(tripClock(at, 'Asia/Seoul'), { date:'2026-12-07', min:30 });
  const { flightDir } = await import('../js/bookings.js');
  assert.equal(flightDir(trip({ end:'' }), { id:'b', kind:'flight', date:'2027-03-11' }), 'back');   // 오는 날이 비어도 가는 날 뒤면 오는 편
  const noDates = trip({ start:'', end:'', vault:[{ id:'a', kind:'flight', date:'2027-03-07' }] });
  assert.equal(flightDir(noDates, { id:'b', kind:'flight', date:'2027-03-11' }), 'back');
  assert.equal(flightDir(noDates, { id:'a', kind:'flight', date:'2027-03-07' }), 'out');
  const s = trip({ flight:{ ap:'HND', arr:'11:00', dep:'' }, moves:[mv('in', { how:'taxi' })],
    vault:[{ id:'h', kind:'hotel', title:'H', date:'2027-03-07', time:'15:00', files:[] }] });
  const L = dayAgenda(s, plan(s).days[0], ctx); assert.deepEqual(L.map(x => x.kind), ['flight', 'move', 'book']); assert.equal(L[1].min, 720);
  const { hotelCard } = await import('../js/safety.js');
  const hs = trip({ hotelPick:'a', safety:{ addr:'A 주소' }, hotels:[{ id:'a', name:'A' }, { id:'b', name:'B' }], nights:{ '2027-03-08':'b' } });
  assert.equal(hotelCard(hs, '2027-03-07').addr, 'A 주소'); assert.deepEqual([hotelCard(hs, '2027-03-08').name, hotelCard(hs, '2027-03-08').addr], ['B', '']);
  const { describeChange } = await import('../js/sharecore.js');
  assert.match(describeChange(trip(), trip({ moves:[mv('go', { how:'car' })], prep:{ insure:true } })), /오가는 길 고침.*출발 전 할 일 1개 함/);
});

test('캘린더: 보관함 가는 편은 한국 시각', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ city:'hksz', picked:{ hk_space:true } });
    const t = buildIcs(s, plan(s), [{ id:'f', kind:'flight', title:'가는 편', date:'2027-03-07', time:'09:00', dir:'out', files:[] }], new Date('2027-01-01')).replace(/\r\n /g, '');
    assert.match(t, /DTSTART:20270307T000000Z/); assert.ok(t.includes('SUMMARY:✈️ 가는 편'));   // 09:00 한국 = 00:00 UTC
  } finally { D.useRegion('tokyo'); }
});
