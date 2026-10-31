// 비행기 시간으로 첫날·마지막 날 쓸 수 있는 시간
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, buildDays, plan } from '../js/logic.js';
import { toMin, koTime, arriveInfo, departInfo, capBetween, DAY_START } from '../js/flight.js';

const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2026-12-06', end:'2026-12-10', who:'family', adults:2, kids:[12] }, extra);

test('시각 읽기·말하기', () => {
  assert.equal(toMin('10:30'), 630); assert.equal(toMin('24:00'), null); assert.equal(toMin(''), null);
  assert.equal(koTime(780), '오후 1시'); assert.equal(koTime(570), '오전 9:30'); assert.equal(koTime(0), '오전 12시');
});

test('비행기 시간이 없으면 예전처럼 첫날·마지막 날 반나절', () => {
  const d = buildDays(trip());
  assert.equal(d[0].cap, 4); assert.equal(d[4].cap, 4); assert.equal(d[0].arrive, undefined);
});

test('도쿄 하네다 10:30 도착 → 13:10쯤부터, 늦은 저녁 도착이면 0시간', () => {
  const a = arriveInfo({ ap:'HND', arr:'10:30' }, 'tokyo', '', 7);
  assert.equal(a.ready, 630 + 60 + 40 + 30); assert.ok(a.cap > 3 && a.cap <= 7, String(a.cap));
  const late = arriveInfo({ ap:'NRT', arr:'20:00' }, 'tokyo', '', 7); assert.equal(late.cap, 0);
  const d = buildDays(trip({ flight:{ ap:'HND', arr:'10:30', dep:'' } }));
  assert.equal(d[0].cap, a.cap); assert.equal(d[0].arrive.ready, a.ready); assert.equal(d[4].cap, 4);
});

test('홍콩 18:00 출발, 선전에서 묵으면 국경 포함해 더 일찍 나섬', async () => {
  await D.loadRegion('hksz');
  try{
    const hk = departInfo({ ap:'HKG', dep:'18:00' }, 'hksz', 'hk', 7), sz = departInfo({ ap:'HKG', dep:'18:00' }, 'hksz', 'sz', 7);
    assert.equal(hk.leave, 1080 - 150 - 50); assert.equal(sz.leave, 1080 - 150 - 120); assert.ok(sz.cap < hk.cap);
    // 홍콩·선전 둘 다 가면 마지막 도시(선전) 기준
    const d = buildDays(trip({ city:'hksz', flight:{ ap:'HKG', arr:'', dep:'18:00' } }));
    assert.equal(d[4].depart.leave, sz.leave);
    const h = buildDays(trip({ city:'hksz', cityOnly:'hk', flight:{ ap:'HKG', arr:'', dep:'18:00' } }));
    assert.equal(h[4].depart.leave, hk.leave);
  } finally { D.useRegion('tokyo'); }
});

test('다닐 시간은 하루 기본을 넘지 않고, 일정은 그 시간 안에서만', () => {
  assert.equal(capBetween(DAY_START, DAY_START + 20 * 60, 7), 7);
  const s = trip({ picked:{ sensoji:true, ameyoko:true, uenozoo:true, kahaku:true, tnm:true, ginza:true }, flight:{ ap:'NRT', arr:'16:00', dep:'11:00' } });
  const P = plan(s);
  assert.equal(P.days[0].cap, 0); assert.equal(P.days[0].items.length, 0);
  assert.equal(P.days[4].cap, 0); assert.equal(P.days[4].items.length, 0);
});
