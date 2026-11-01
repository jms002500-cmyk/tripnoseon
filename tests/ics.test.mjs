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

test('오가는 길에서 만든 교통 예약은 그 이동과 겹쳐 넣지 않음 (집 → 공항은 한국 시각)', async () => {
  await D.loadRegion('hksz');
  try{
    const mv = (k, o) => Object.assign({ id:k, k, date:'', time:'', how:'', min:null, from:'', to:'', booked:true, note:'' }, o);
    const s = trip({ city:'hksz', picked:{ hk_space:true }, flight:{ ap:'HKG', arr:'11:00', dep:'18:00' },
      moves:[mv('go', { how:'car', time:'06:00' }), mv('in', { how:'pick', time:'12:30', min:50 })] });
    // 보관함 '예약 넣기'로 만든 교통 예약(vaultDraft): 날짜·시각을 이동에서 그대로 가져옴
    const v = [{ id:'vg', kind:'transport', moveId:'go', title:'자가용 · 집 → 공항', date:'2027-03-07', time:'06:00' },
      { id:'vi', kind:'transport', moveId:'in', title:'픽업 차량 · 공항 → 숙소', date:'2027-03-07', time:'12:30' }];
    const t = buildIcs(s, plan(s), v, NOW);
    assert.equal((t.match(/SUMMARY:[^\r]*집 → 공항/g) || []).length, 1, '집 → 공항은 한 번만');
    assert.equal((t.match(/SUMMARY:[^\r]*공항 → 숙소/g) || []).length, 1, '공항 → 숙소는 한 번만');
    assert.match(t, /DTSTART:20270306T210000Z/);       // 06:00 한국 시각 = UTC 전날 21:00
    assert.doesNotMatch(t, /DTSTART:20270306T220000Z/); // 홍콩 시각으로 잘못 읽은 07:00(한국) 이벤트가 없어야
    // 이동을 지운 뒤 남은 교통 예약, 이동에 시각이 없을 때는 예약 쪽 시각으로 넣음
    const s2 = trip({ city:'hksz', picked:{ hk_space:true }, moves:[mv('in', { how:'pick' })] });
    const t2 = buildIcs(s2, plan(s2), [Object.assign({}, v[1], { moveId:'in' }), { id:'vx', kind:'transport', moveId:'gone', title:'지운 이동 예약', date:'2027-03-08', time:'10:00' }], NOW);
    assert.match(t2, /SUMMARY:🚆 픽업 차량 · 공항 → 숙소/); assert.match(t2, /SUMMARY:🚆 지운 이동 예약/);
  } finally { D.useRegion('tokyo'); }
});

test('밤 비행기: 집 → 공항은 전날, 자정 넘어 한국에 내리면 공항 → 집은 다음 날 (한국 시각)', async () => {
  await D.loadRegion('hksz');
  try{
    const mv = (k, o) => Object.assign({ id:k, k, date:'', time:'', how:'', min:null, from:'', to:'', booked:false, note:'' }, o);
    // 3/6 23:55 인천 출발 → 3/7 02:40 홍콩 도착(가는 날 3/7), 3/9 22:30 홍콩 출발 → 3/10 03:00 인천 도착
    const s = trip({ city:'hksz', picked:{ hk_space:true }, flight:{ ap:'HKG', arr:'02:40', dep:'22:30' },
      moves:[mv('go', { how:'car', time:'20:30' }), mv('back', { how:'taxi', time:'03:20' })] });
    const t = buildIcs(s, plan(s), [], NOW);
    assert.match(t, /DTSTART:20270306T113000Z/);   // 3/6 20:30 한국 = UTC 11:30 (3/7로 넣으면 하루 늦게 알림)
    assert.match(t, /DTSTART:20270309T182000Z/);   // 3/10 03:20 한국 = UTC 3/9 18:20 (3/9 03:20으로 넣으면 하루 이르게)
    // 낮 비행기는 그대로
    const s2 = trip({ city:'hksz', picked:{ hk_space:true }, flight:{ ap:'HKG', arr:'11:00', dep:'18:00' },
      moves:[mv('go', { how:'car', time:'06:00' }), mv('back', { how:'taxi', time:'23:00' })] });
    const t2 = buildIcs(s2, plan(s2), [], NOW);
    assert.match(t2, /DTSTART:20270306T210000Z/); assert.match(t2, /DTSTART:20270309T140000Z/);
  } finally { D.useRegion('tokyo'); }
});
