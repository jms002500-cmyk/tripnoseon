// 보관함 예약 → 일정: 항공권(날짜·비행기 시간), 숙소(후보·밤별 숙소), 장소 연결 예약(그날 일정), 날짜 카드 줄
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { flightDir, applyFlight, applyHotel, applyPlace, applyBooking, applyAll, bookingRows, addDay } from '../js/bookings.js';

const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-10', who:'family', adults:2, kids:[12],
  picked:{ sensoji:true, ameyoko:true } }, extra);
const v = (kind, o) => Object.assign({ id:'v1', kind, title:'예약', date:'', time:'', code:'SECRET', link:'', memo:'', placeId:null, files:[] }, o);

test('가는 편·오는 편 짐작', () => {
  const s = trip();
  assert.equal(flightDir(s, v('flight', { date:'2027-03-07' })), 'out');
  assert.equal(flightDir(s, v('flight', { date:'2027-03-10' })), 'back');
  assert.equal(flightDir(s, v('flight', { date:'2027-03-09' })), 'back');
  assert.equal(flightDir(s, v('flight', { date:'2027-03-10', dir:'out' })), 'out');
  assert.equal(flightDir(trip({ start:'' }), v('flight', { date:'2027-05-01' })), 'out');
  assert.equal(addDay('2027-02-28', 1), '2027-03-01');
});

test('항공권: 가는 편은 도착 날짜·시각, 오는 편은 출발 날짜·시각', () => {
  const s = trip();
  const a = applyFlight(s, v('flight', { date:'2027-03-06', time:'09:00', time2:'11:20', ap:'HND', dir:'out' }));
  assert.equal(a.patch.start, '2027-03-06'); assert.deepEqual(a.patch.flight, { ap:'HND', arr:'11:20', dep:'' });
  const night = applyFlight(s, v('flight', { date:'2027-03-05', time:'23:30', time2:'02:10', dir:'out' }));
  assert.equal(night.patch.start, '2027-03-06');                            // 밤 비행기는 다음 날 도착
  const b = applyFlight(s, v('flight', { date:'2027-03-11', time:'18:30', dir:'back' }));
  assert.equal(b.patch.end, '2027-03-11'); assert.equal(b.patch.flight.dep, '18:30');
  const same = applyFlight(trip({ flight:{ ap:'', arr:'11:20', dep:'' } }), v('flight', { date:'2027-03-07', time2:'11:20' }));
  assert.deepEqual(same.patch, {}); assert.deepEqual(same.msgs, []);    // 이미 같으면 바꿀 것 없음
  assert.equal(applyFlight(s, v('flight', { date:'2027-03-07', ap:'XXX', time2:'10:00' })).patch.flight.ap, '');   // 다른 지역 공항은 무시
});

test('숙소: 후보로 넣고 체크인~체크아웃 전날 밤을 그 숙소로', () => {
  const s = trip({ hotels:[], nights:{}, hotelPick:null });
  const r = applyHotel(s, v('hotel', { title:'우에노 호텔', date:'2027-03-07', date2:'2027-03-09' }), { newId:'hA' });
  assert.equal(r.patch.hotels.length, 1); assert.equal(r.patch.hotels[0].vid, 'v1'); assert.ok(r.locate);
  assert.ok(!('code' in r.patch.hotels[0]));                                  // 예약번호는 숙소 후보(공유)에 안 감
  assert.deepEqual(r.patch.nights, { '2027-03-07':'hA', '2027-03-08':'hA' }); assert.equal(r.patch.hotelPick, 'hA');   // 정한 숙소가 없었으면 이 숙소
  // 남은 밤은 다른 숙소, 모든 밤이면 정한 숙소로
  const s2 = Object.assign(s, r.patch);
  const r2 = applyHotel(s2, v('hotel', { id:'v2', title:'신주쿠 호텔', date:'2027-03-09' }), { newId:'hB', pt:{ lat:35.69, lng:139.70, area:'shinjuku' } });
  assert.deepEqual(r2.patch.nights, { '2027-03-07':'hA', '2027-03-08':'hA', '2027-03-09':'hB' }); assert.equal(r2.patch.hotelPick, undefined); assert.ok(!r2.locate);
  const all = applyHotel(trip({ hotels:[{ id:'h0', name:'우에노 호텔 ', lat:null }], hotelPick:'hX' }), v('hotel', { title:'우에노호텔', date:'2027-03-07' }), { newId:'hN' });
  assert.equal(all.patch.hotels.length, 1); assert.equal(all.patch.hotelPick, 'h0');   // 이름 같은 후보를 고치고, 모든 밤이면 정한 숙소로
  const nod = applyHotel(trip({ start:'', end:'' }), v('hotel', { title:'H', date:'2027-04-01', date2:'2027-04-03' }), { newId:'h1' });
  assert.equal(nod.patch.start, '2027-04-01'); assert.equal(nod.patch.end, '2027-04-03');   // 여행 날짜가 없으면 숙소 날짜로
});

test('장소를 연결한 예약: 담고 그날로, 하루 종일 곳은 그날 하루', () => {
  const s = trip({ picked:{} });
  const r = applyPlace(s, v('ticket', { placeId:'sensoji', date:'2027-03-09' }));
  assert.ok(r.patch.picked.sensoji); assert.equal(r.patch.assign.sensoji, 2);
  const full = applyPlace(s, v('ticket', { placeId:'tdl', date:'2027-03-08' }));
  assert.equal(full.patch.fullDay.tdl, 1);
  assert.deepEqual(applyPlace(s, v('ticket', { placeId:'sensoji', date:'2027-04-01' })).patch, {});   // 여행 날짜 밖
  assert.deepEqual(applyBooking(s, v('entry', { placeId:'sensoji', date:'2027-03-08' })).patch, {});  // 입국 QR은 장소 아님
  const after = Object.assign(s, r.patch); assert.ok(plan(after).days[2].items.some(p => p.id === 'sensoji'));
});

test('전부 다시 반영: 항공권 날짜가 먼저, 그다음 숙소·장소', () => {
  const s = trip({ start:'', end:'', hotels:[], hotelPick:null, picked:{} });
  const items = [v('ticket', { id:'t', placeId:'sensoji', date:'2027-05-03' }), v('hotel', { id:'h', title:'H', date:'2027-05-02', date2:'2027-05-05' }),
    v('flight', { id:'f1', date:'2027-05-02', time:'08:00', time2:'10:30', dir:'out' }), v('flight', { id:'f2', date:'2027-05-05', time:'19:00', dir:'back' })];
  const r = applyAll(s, items, { newId:i => 'h' + i });
  assert.equal(r.patch.start, '2027-05-02'); assert.equal(r.patch.end, '2027-05-05');
  assert.equal(Object.keys(r.patch.nights).length, 3); assert.equal(r.patch.assign.sensoji, 1); assert.ok(r.locate);
});

test('날짜 카드 예약 줄: 체크인·체크아웃·입장권, 항공권·오가는 길 예약은 뺌', () => {
  const items = [v('hotel', { title:'H', date:'2027-03-07', time:'15:00', date2:'2027-03-09', time2:'11:00' }), v('ticket', { id:'t', title:'디즈니', date:'2027-03-08', time:'09:00' }),
    v('flight', { id:'f', date:'2027-03-07' }), v('transport', { id:'m', moveId:'in', date:'2027-03-07' }), v('entry', { id:'e', date:'2027-03-07' })];
  assert.deepEqual(bookingRows(items, '2027-03-07'), [{ time:900, icon:'🏨', text:'체크인 · H' }]);
  assert.deepEqual(bookingRows(items, '2027-03-08').map(x => x.text), ['디즈니']);
  assert.deepEqual(bookingRows(items, '2027-03-09'), [{ time:660, icon:'🏨', text:'체크아웃 · H' }]);
});

test('이미 반영된 숙소는 다시 반영해도 바꿀 것 없음', () => {
  const s = trip({ hotels:[], nights:{}, hotelPick:null });
  const it = v('hotel', { title:'우에노 호텔', date:'2027-03-07', date2:'2027-03-09' });
  Object.assign(s, applyHotel(s, it, { newId:'hA' }).patch);
  const again = applyHotel(s, it, { newId:'hZ' });
  assert.deepEqual(again.patch, {}); assert.deepEqual(again.msgs, []);
});
