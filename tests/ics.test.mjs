// 폰 캘린더 파일(.ics): 어림 시각·알림·UTC 변환·줄 접기, 예약번호는 넣지 않음
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { buildIcs, dayTimes } from '../js/ics.js';

const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-09', who:'family', adults:2, kids:[12],
  picked:{ sensoji:true, ameyoko:true, uenozoo:true } }, extra);
const NOW = new Date('2026-11-01T00:00:00Z');

test('어림 시각: 9:30부터 이동·머무는 시간을 차례로', () => {
  const s = trip(); const P = plan(s); const d = P.days.find(x => x.items.length);
  const T = dayTimes(s, d);
  assert.ok(T[0].start > 570, '첫 장소는 숙소에서 이동한 뒤');
  T.forEach((x, i) => { assert.equal(x.end - x.start, Math.round(x.p.hours * 60)); if(i) assert.ok(x.start >= T[i - 1].end); });
});

test('도쿄(+9) 시각을 UTC로, 알림·줄바꿈 규칙', () => {
  const s = trip({ flight:{ ap:'HND', arr:'10:30', dep:'18:00' } });
  const t = buildIcs(s, plan(s), [], NOW);
  assert.match(t, /^BEGIN:VCALENDAR\r\n/); assert.match(t, /END:VCALENDAR\r\n$/);
  assert.match(t, /DTSTART:20270307T013000Z/);                 // 첫날 10:30 도착 = UTC 01:30
  assert.match(t, /SUMMARY:🧳 숙소에서 공항으로 출발/); assert.match(t, /TRIGGER:-PT60M/);
  assert.equal((t.match(/BEGIN:VEVENT/g) || []).length, (t.match(/END:VEVENT/g) || []).length);
  const enc = new TextEncoder(); t.split('\r\n').forEach(l => assert.ok(enc.encode(l).length <= 75, l));
});

test('홍콩(+8), 보관함 예약: 시간 있으면 알림, 없으면 하루 종일, 예약번호는 안 넣음', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip({ city:'hksz', picked:{ hk_space:true } });
    const v = [{ id:'v1', kind:'ticket', title:'디즈니, 입장권', date:'2027-03-08', time:'09:00', code:'SECRET123' }, { id:'v2', kind:'hotel', title:'숙소', date:'2027-03-07', time:'' }];
    const t = buildIcs(s, plan(s), v, NOW);
    assert.match(t, /DTSTART:20270308T010000Z/); assert.ok(t.includes('SUMMARY:🎟️ 디즈니\\, 입장권'));   // 쉼표는 \, 로
    assert.match(t, /DTSTART;VALUE=DATE:20270307/); assert.doesNotMatch(t, /SECRET123/);
  } finally { D.useRegion('tokyo'); }
});
