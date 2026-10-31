// 오가는 길: 날짜·순서, 첫날·마지막 날 계산에 반영, 폰 캘린더(한국 시각), 함께 짜기 공유
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, buildDays } from '../js/logic.js';
import { moveDate, movesOn, legOverride, isEmptyMove, moveEnds, moveText, etcMinutes, vaultDraft } from '../js/moves.js';
import { arriveInfo, departInfo, AFTER_LANDING, HOTEL_DROP } from '../js/flight.js';
import { buildIcs } from '../js/ics.js';
import { SHARED_KEYS, MAP_KEYS } from '../js/sharecore.js';

const mv = (k, o) => Object.assign({ id:k, k, date:'', time:'', how:'', min:null, from:'', to:'', booked:false, note:'' }, o);
const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-09', who:'family', adults:2, kids:[12],
  picked:{ sensoji:true, ameyoko:true } }, extra);
const NOW = new Date('2026-11-01T00:00:00Z');

test('날짜: 공항 오가는 길은 가는 날·오는 날, 여행 중은 넣은 날', () => {
  const s = trip();
  assert.equal(moveDate(s, mv('go')), '2027-03-07'); assert.equal(moveDate(s, mv('in')), '2027-03-07');
  assert.equal(moveDate(s, mv('out')), '2027-03-09'); assert.equal(moveDate(s, mv('back')), '2027-03-09');
  assert.equal(moveDate(s, mv('etc', { date:'2027-03-08' })), '2027-03-08');
});

test('하루 안 순서: 집→공항, 공항→숙소, 여행 중(시각순), 숙소→공항, 공항→집', () => {
  const s = trip({ start:'2027-03-07', end:'2027-03-07', moves:[mv('back'), mv('x2', { k:'etc', date:'2027-03-07', time:'15:00' }), mv('out'), mv('in'),
    mv('x1', { k:'etc', date:'2027-03-07', time:'09:00' }), mv('go')] });
  assert.deepEqual(movesOn(s, '2027-03-07').map(m => m.id), ['go', 'in', 'x1', 'x2', 'out', 'back']);
  assert.deepEqual(movesOn(s, ''), []);
});

test('빈 이동·기본 이름·한 줄 요약', () => {
  assert.ok(isEmptyMove(mv('in'))); assert.ok(!isEmptyMove(mv('in', { time:'00:00' }))); assert.ok(!isEmptyMove(mv('in', { booked:true })));
  const ctx = { ap:'홍콩 국제공항', inHotel:'침사추이 숙소', outHotel:'선전 숙소' };
  assert.deepEqual(moveEnds(mv('in'), ctx), { from:'홍콩 국제공항', to:'침사추이 숙소' });
  assert.deepEqual(moveEnds(mv('out', { from:'로비' }), ctx), { from:'로비', to:'홍콩 국제공항' });
  assert.deepEqual(moveEnds(mv('go'), ctx), { from:'집', to:'공항' });
  assert.equal(moveText(mv('in', { how:'pick', min:50 }), ctx), '🚐 픽업 차량 · 홍콩 국제공항 → 침사추이 숙소 · 약 50분');
  assert.equal(moveText(mv('back'), ctx), '🏠 수단 미정 · 공항 → 집');
});

test('공항 → 숙소: 예약한 차 시각·걸리는 시간이 첫날 다닐 시간을 바꿈', () => {
  const f = { ap:'HKG', arr:'10:30' };
  const base = arriveInfo(f, 'hksz', 'hk', 7);
  const late = arriveInfo(f, 'hksz', 'hk', 7, { time:13 * 60, min:40 });
  assert.equal(late.ready, 13 * 60 + 40 + HOTEL_DROP); assert.equal(late.pick, 780); assert.ok(!late.early);
  assert.ok(late.cap < base.cap);
  const early = arriveInfo(f, 'hksz', 'hk', 7, { time:10 * 60 + 45, min:null });
  assert.ok(early.early); assert.equal(early.ready, 630 + AFTER_LANDING + base.transfer + HOTEL_DROP);   // 입국 전 시각이면 입국 뒤로 봄
  assert.equal(arriveInfo(f, 'hksz', 'hk', 7, { time:6 * 60, min:null }).pick, undefined);           // 도착보다 이르면 무시
});

test('숙소 → 공항: 넣은 시각에 나서고, 너무 늦으면 알림', () => {
  const f = { ap:'HKG', dep:'18:00' };
  const z = departInfo(f, 'hksz', 'hk', 7, { time:14 * 60, min:60 });
  assert.equal(z.leave, 840); assert.equal(z.transfer, 60); assert.ok(z.set); assert.ok(!z.late);
  assert.ok(departInfo(f, 'hksz', 'hk', 7, { time:16 * 60, min:60 }).late);
  assert.equal(departInfo(f, 'hksz', 'hk', 7, { time:19 * 60, min:null }).set, undefined);   // 비행기보다 늦은 시각은 무시
});

test('buildDays가 오가는 길 값을 씀', () => {
  const s = trip({ flight:{ ap:'HND', arr:'10:30', dep:'18:00' } });
  const before = buildDays(s);
  s.moves = [mv('in', { how:'pick', time:'14:00', min:40 }), mv('out', { how:'taxi', time:'12:00' })];
  assert.deepEqual(legOverride(s, 'in'), { time:840, min:40 }); assert.equal(legOverride(s, 'back'), null);
  const after = buildDays(s);
  assert.equal(after[0].arrive.ready, 840 + 40 + HOTEL_DROP); assert.ok(after[0].cap < before[0].cap);
  assert.equal(after[2].depart.leave, 720); assert.ok(after[2].cap < before[2].cap);
});

test('여행 중 이동 시간 합치기', () => {
  const s = trip({ moves:[mv('a', { k:'etc', date:'2027-03-08', min:90 }), mv('b', { k:'etc', date:'2027-03-08', min:30 }), mv('in', { min:50 })] });
  assert.equal(etcMinutes(s, '2027-03-08'), 120); assert.equal(etcMinutes(s, '2027-03-07'), 0);
});

test('보관함 초안: 교통 예약, 날짜·시각', () => {
  const s = trip();
  const d = vaultDraft(s, mv('in', { how:'pick', time:'11:30' }), { ap:'하네다 공항', inHotel:'우에노 숙소' });
  assert.equal(d.kind, 'transport'); assert.equal(d.title, '픽업 차량 · 하네다 공항 → 우에노 숙소'); assert.equal(d.date, '2027-03-07'); assert.equal(d.time, '11:30');
});

test('폰 캘린더: 집→공항은 한국 시각, 현지 이동은 현지 시각, 숙소→공항은 출발 일정에 합침', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ city:'hksz', picked:{ hk_space:true }, flight:{ ap:'HKG', arr:'10:30', dep:'18:00' }, moves:[
      mv('go', { how:'abus', time:'05:30', min:70, to:'인천공항' }), mv('in', { how:'pick', time:'12:00', min:50, booked:true }),
      mv('x', { k:'etc', date:'2027-03-08', how:'bus', from:'홍콩', to:'선전' }), mv('out', { how:'taxi', time:'14:00' })] });
    const t = buildIcs(s, plan(s), [], NOW, { ap:'홍콩 국제공항', inHotel:'숙소', outHotel:'숙소' }).replace(/\r\n /g, '');   // 접은 줄 펴기
    assert.match(t, /DTSTART:20270306T203000Z/);                       // 05:30 한국(+9) = 전날 20:30 UTC
    assert.match(t, /DTSTART:20270307T040000Z/);                       // 12:00 홍콩(+8) = 04:00 UTC
    assert.ok(t.includes('SUMMARY:🚐 픽업 차량 · 홍콩 국제공항 → 숙소 (예약)'));
    assert.match(t, /DTSTART;VALUE=DATE:20270308/);                    // 시각 없는 여행 중 이동은 하루 일정
    assert.ok(t.includes('SUMMARY:🧳 숙소에서 공항으로 출발 · 택시 · 홍콩 국제공항')); assert.match(t, /DTSTART:20270309T060000Z/);
    assert.equal((t.match(/택시/g) || []).length, 1);
  } finally { D.useRegion('tokyo'); }
});

test('함께 짜기로 공유 (통째로)', () => {
  assert.ok(SHARED_KEYS.includes('moves')); assert.ok(!MAP_KEYS.includes('moves'));
});
