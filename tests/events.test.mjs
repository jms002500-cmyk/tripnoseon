// 실행: npm test — 날짜만 쉬는 날(closedDates)과 여행 기간 행사(EVENTS)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, buildDays, fullAssign, closedOn, closedText, eventOn, tripEvents, dayEvents } from '../js/logic.js';
import { indoorAlternatives } from '../js/rain.js';
import { moveTarget } from '../js/catchup.js';
import { EVENTS, PLACES as HK_PLACES } from '../js/regions/hksz-data.js';

// 지어낸 여행: 2027-03-07(일) ~ 11(목), 어른 2 + 12살 (도쿄)
const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-11', who:'family', adults:2, kids:[12] }, extra);
const where = (P, id) => P.days.findIndex(d => d.items.some(p => p.id === id) || (d.full && d.full.id === id));
// 장소 데이터에 잠깐 날짜 휴관을 붙였다가 되돌림
function withClosed(id, dates, fn){
  const p = D.PLACES.find(x => x.id === id); const had = p.closedDates;
  p.closedDates = dates;
  try{ return fn(p); } finally { if(had) p.closedDates = had; else delete p.closedDates; }
}

test('closedOn: 휴무 요일 또는 그 날짜', () => {
  const p = { closed:[2], closedDates:['2027-03-09'] };
  assert.equal(closedOn(p, { wd:2, key:'2027-03-16' }), true);    // 화요일
  assert.equal(closedOn(p, { wd:2, key:'2027-03-09' }), true);
  assert.equal(closedOn(p, { wd:3, key:'2027-03-10' }), false);
  assert.equal(closedOn({ closedDates:['2027-03-09'] }, { wd:2, key:'2027-03-09' }), true);
  assert.equal(closedOn({}, { wd:0, key:'2027-03-07' }), false);
  assert.equal(closedOn(null, { wd:0 }), false);
});

test('closedText: 날짜 휴관은 뒤에 붙임', () => {
  assert.equal(closedText({ closed:[2] }), '화요일 휴무');
  assert.equal(closedText({ closedDates:['2027-03-09'] }), '3/9 휴관');
  assert.equal(closedText({ closed:[1], closedDates:['2027-03-09', '2027-03-10'] }), '월요일 휴무 · 3/9·3/10 휴관');
  assert.equal(closedText({ closed:[0, 1, 2, 3, 4] }), '금·토요일만 해요');
  assert.equal(closedText({}), '');
});

test('일정 짜기: 날짜 휴관인 날을 피하고, 남은 날이 모두 쉬면 못 넣은 곳으로', () => {
  const s = trip({ picked:{ meiji:true } });
  const base = where(plan(s), 'meiji'); assert.ok(base >= 0);
  const key = buildDays(s)[base].key;
  withClosed('meiji', [key], () => {
    const i = where(plan(s), 'meiji');
    assert.ok(i >= 0 && i !== base, `휴관일(${key})이 아닌 날로 옮겨야 함: ${i}`);
  });
  withClosed('meiji', buildDays(s).map(d => d.key), () => {
    const P = plan(s); const u = P.unassigned.find(x => x.p.id === 'meiji');
    assert.ok(u); assert.equal(u.why, '남은 날짜가 휴무일이에요');
  });
});

test('하루 종일 곳도 날짜 휴관인 날을 피함', () => {
  const s = trip({ picked:{ tdl:true } });
  const days = buildDays(s); const first = fullAssign(s, days).tdl;
  assert.ok(first != null);
  withClosed('tdl', [days[first].key], () => {
    const again = fullAssign(s, days).tdl;
    assert.ok(again != null && again !== first, `${again}`);
  });
});

test('비 오는 날 대안·늦었을 때 옮기기도 날짜 휴관을 뺌', () => {
  const s = trip({ picked:{ uenozoo:true } });
  const P = plan(s); const di = where(P, 'uenozoo'); const d = P.days[di];
  const alts = indoorAlternatives(s, P, di, d.items.find(p => p.id === 'uenozoo'), 3);
  const top = alts[0].p.id;
  withClosed(top, [d.key], () => {
    const again = indoorAlternatives(s, P, di, d.items.find(p => p.id === 'uenozoo'), 3);
    assert.ok(!again.some(a => a.p.id === top));
  });
  // 다음 날이 날짜 휴관이면 그다음 날로
  const zoo = D.PLACES.find(p => p.id === 'uenozoo');
  const next = moveTarget(s, P, 0, zoo, {});
  if(next != null) withClosed('uenozoo', [P.days[next].key], () => {
    const t = moveTarget(s, P, 0, zoo, {});
    assert.notEqual(t, next);
  });
});

test('행사: 날짜·요일 안에서만 열림', () => {
  const e = { from:'2026-12-05', to:'2026-12-06' };
  assert.equal(eventOn(e, { key:'2026-12-06', wd:0 }), true);
  assert.equal(eventOn(e, { key:'2026-12-07', wd:1 }), false);
  assert.equal(eventOn({ from:'2026-12-01', to:'2026-12-31', wd:[5, 6] }, { key:'2026-12-08', wd:2 }), false);
  assert.equal(eventOn({ from:'2026-12-01', to:'2026-12-31', wd:[5, 6] }, { key:'2026-12-11', wd:5 }), true);
});

test('행사 데이터: 모양·날짜·연결 장소가 맞음', () => {
  const ids = new Set(); const places = new Set(HK_PLACES.map(p => p.id));
  const isDate = k => /^\d{4}-\d{2}-\d{2}$/.test(k) && !isNaN(new Date(k + 'T00:00:00'));
  EVENTS.forEach(e => {
    assert.ok(/^ev_[a-z0-9]+$/.test(e.id), `${e.id} id 모양`); assert.ok(!ids.has(e.id), `${e.id} 중복`); ids.add(e.id);
    assert.ok(['hk', 'sz'].includes(e.city), `${e.id} city`);
    assert.ok(isDate(e.from) && isDate(e.to) && e.from <= e.to, `${e.id} 날짜`);
    assert.ok(typeof e.name === 'string' && e.name && typeof e.note === 'string' && e.note, `${e.id} 이름·설명`);
    if(e.place) assert.ok(places.has(e.place), `${e.id} 장소 ${e.place}`);
    if(e.wd) assert.ok(e.wd.every(w => w >= 0 && w <= 6));
    for(const f of ['time', 'where', 'fee']) if(e[f] != null) assert.ok(typeof e[f] === 'string' && e[f], `${e.id} ${f}`);
  });
});

// 실제 여행과 같은 날짜의 가상 여행 (12/6 일 ~ 12/10 목), 홍콩 디즈니·피크·해피밸리 경마장을 담음
function hkTrip(extra){
  const s = clone(D.DEFAULT);
  Object.assign(s, { city:'hksz', country:'hk', who:'family', adults:2, kids:[12], start:'2026-12-06', end:'2026-12-10' }, extra);
  return s;
}

test('여행 기간 행사: 겹치는 것만, 여행 내내인지, 날짜 카드 한 줄', async () => {
  await D.loadRegion('hksz');
  try{
    const s = hkTrip({ picked:{ hk_disney:true, hk_peak:true, hk_racecourse:true }, cityOnly:'hk' });
    const L = tripEvents(s); const by = id => L.find(x => x.e.id === id);
    assert.ok(by('ev_hkdlxmas').whole);                         // 11/20 ~ 1/3
    assert.deepEqual(by('ev_hkdlconcert').days, [0]);           // 12/6만
    assert.deepEqual(by('ev_ijc').days, [3]);                   // 12/9
    assert.deepEqual(by('ev_clockenflap').days, [0]);
    // 선전만 가면 홍콩 행사는 안 보임
    assert.equal(tripEvents(hkTrip({ cityOnly:'sz' })).filter(x => x.e.city === 'hk').length, 0);
    // 날짜가 안 겹치면 없음
    assert.equal(tripEvents(hkTrip({ start:'2027-08-01', end:'2027-08-03' })).length, 0);
    // 날짜 카드: 여행 내내 하는 행사는 그 장소가 그날 일정에 있을 때만
    const P = plan(s);
    const dd = P.days.find(d => d.full && d.full.id === 'hk_disney');
    assert.ok(dayEvents(s, dd, L).some(e => e.id === 'ev_hkdlxmas'));
    const other = P.days.find(d => !(d.full && d.full.id === 'hk_disney') && !d.items.some(p => p.id === 'hk_peak') && d.i !== 0);
    if(other) assert.ok(!dayEvents(s, other, L).some(e => e.id === 'ev_hkdlxmas' || e.id === 'ev_peaklight'));
    assert.ok(dayEvents(s, P.days[3], L).some(e => e.id === 'ev_ijc'));
  } finally { D.useRegion('tokyo'); }
});

test('도쿄는 행사 목록이 비어 있음', () => {
  assert.deepEqual(tripEvents(trip({})), []);
});
