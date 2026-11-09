// 보관함 예약 → 일정: 항공권(날짜·비행기 시간), 숙소(후보·밤별 숙소), 장소 연결 예약(그날 일정), 날짜 카드 줄
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { flightDir, applyFlight, applyHotel, applyPlace, applyBooking, applyAll, bookingRows, addDay, bookingSpend, bookingSpendOf, applyMove } from '../js/bookings.js';
import { docsOf, docLabel } from '../js/docs.js';

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
  assert.equal(a.patch.start, '2027-03-06'); assert.deepEqual(a.patch.flight, { ap:'HND', arr:'11:20', dep:'', ap2:'', way:'' });
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
  const noId = L => L.map(({ id, ...r }) => r);
  assert.deepEqual(noId(bookingRows(items, '2027-03-07')), [{ time:900, icon:'🏨', text:'체크인 · H' }]);
  assert.deepEqual(bookingRows(items, '2027-03-08').map(x => x.text), ['디즈니']);
  assert.equal(bookingRows(items, '2027-03-08')[0].id, 't');   // 줄에서 그 예약 서류를 바로 열게
  assert.ok(!bookingRows(items, '2027-03-07', new Set(['in'])).some(x => x.id === 'm'));   // 연결한 이동이 있으면 이동 줄로
  assert.ok(bookingRows(items, '2027-03-07', new Set()).some(x => x.id === 'm'));   // 이동을 지웠으면 예약 줄로 다시
  assert.deepEqual(noId(bookingRows(items, '2027-03-09')), [{ time:660, icon:'🏨', text:'체크아웃 · H' }]);
});

test('이미 반영된 숙소는 다시 반영해도 바꿀 것 없음', () => {
  const s = trip({ hotels:[], nights:{}, hotelPick:null });
  const it = v('hotel', { title:'우에노 호텔', date:'2027-03-07', date2:'2027-03-09' });
  Object.assign(s, applyHotel(s, it, { newId:'hA' }).patch);
  const again = applyHotel(s, it, { newId:'hZ' });
  assert.deepEqual(again.patch, {}); assert.deepEqual(again.msgs, []);
});

test('예약을 지울 때: 그 예약 금액으로 만든 가계부 줄을 찾고, 손으로 고친 줄인지 알려 줌', () => {
  const it = { id:'v1', kind:'hotel', title:'지어낸 호텔', amt:3200.5, cur:'HKD' };
  const s = { spend:{ x1:{ amt:100, cur:'HKD', what:'점심' } } };
  assert.equal(bookingSpendOf(s, it), null);                       // 아직 가계부 줄 없음 → 묻지 않고 바로 지움
  const r = bookingSpend(s, it, { by:'p1', now:1, today:'2027-03-08' }); s.spend[r.id] = r.e;
  const a = bookingSpendOf(s, it);
  assert.equal(a.id, 'bkv1'); assert.equal(a.e.amt, 3200.5); assert.equal(a.edited, false);
  // 날짜만 바뀌어도(예약 다시 저장은 날짜·낸 사람을 그대로 둠) 예약 줄 그대로
  s.spend.bkv1 = Object.assign({}, s.spend.bkv1, { d:'2027-03-09' }); assert.equal(bookingSpendOf(s, it).edited, false);
  // 가계부 '자세히 적기'로 고치면 vid 없이 새로 씀(app.js saveDetail) → 고친 줄
  const { vid, ...hand } = s.spend.bkv1; s.spend.bkv1 = Object.assign(hand, { by:'p2' });
  assert.equal(bookingSpendOf(s, it).edited, true);
  // 금액·통화가 예약과 달라도 고친 줄
  s.spend.bkv1 = Object.assign({}, r.e, { amt:3000 }); assert.equal(bookingSpendOf(s, it).edited, true);
  s.spend.bkv1 = Object.assign({}, r.e, { cur:'KRW' }); assert.equal(bookingSpendOf(s, it).edited, true);
  // 다른 예약·없는 예약·가계부 없음
  assert.equal(bookingSpendOf(s, { id:'v2', amt:10 }), null);
  assert.equal(bookingSpendOf(s, null), null);
  assert.equal(bookingSpendOf({}, it), null);
});

test('교통 예약 → 오가는 길 이동 (공항 픽업·샌딩): 예약함·시각·픽업 차량, 없으면 새로', () => {
  const s = trip({ moves:[{ id:'out', k:'out', date:'', time:'', how:'taxi', min:null, from:'', to:'', booked:false, note:'' }] });
  const pick = v('transport', { id:'p1', title:'공항 픽업 (클룩)', date:'2027-03-07', time:'14:30' });
  const r = applyMove(s, pick, 'k:in');
  assert.equal(r.moveId, 'in');
  assert.deepEqual(r.patch.moves.find(m => m.k === 'in'), { id:'in', k:'in', date:'', time:'14:30', how:'pick', min:null, from:'', to:'', booked:true, note:'' });
  assert.match(r.msgs[0], /공항 → 숙소 14:30 예약함/);
  const r2 = applyMove(s, v('transport', { title:'샌딩', time:'09:00' }), 'k:out');   // 이미 고른 수단(택시)은 그대로
  assert.deepEqual([r2.patch.moves[0].how, r2.patch.moves[0].time, r2.patch.moves[0].booked], ['taxi', '09:00', true]);
  assert.equal(r2.patch.moves.length, 1);
  const s3 = trip({ moves:[{ id:'mx', k:'etc', date:'', time:'', how:'', min:null, from:'선전', to:'홍콩', booked:false, note:'' }] });
  const r3 = applyMove(s3, v('transport', { title:'고속철 표', date:'2027-03-08', time:'10:15' }), 'id:mx');
  assert.deepEqual([r3.patch.moves[0].date, r3.patch.moves[0].how, r3.moveId], ['2027-03-08', '', 'mx']);
  assert.deepEqual(applyMove(s3, pick, 'id:없음'), { patch:{}, msgs:[], moveId:null });
  assert.deepEqual(applyMove(s3, pick, ''), { patch:{}, msgs:[], moveId:null });
  assert.deepEqual(applyMove(s3, pick, 'k:etc'), { patch:{}, msgs:[], moveId:null });
  const again = applyMove(Object.assign({}, s, r.patch), pick, 'k:in');   // 이미 반영됐으면 바꿀 것 없음
  assert.deepEqual([again.patch, again.msgs, again.moveId], [{}, [], 'in']);
});

test('일정 줄마다 서류: 장소·이동·비행기 편·예약 id로 찾고, 영수증·사진·여권 사본은 안 나옴', () => {
  const s = trip({ vault:[
    v('ticket', { id:'t', placeId:'disney', title:'디즈니 입장권' }), v('transport', { id:'p', moveId:'in', title:'픽업' }),
    v('flight', { id:'fo', date:'2027-03-07', dir:'out' }), v('flight', { id:'fb', date:'2027-03-10', dir:'back' }),
    { id:'r', kind:'receipt', placeId:'disney', files:[] }, { id:'i', kind:'idcopy', files:[] }] });
  assert.deepEqual(docsOf(s, { place:'disney' }).map(x => x.id), ['t']);
  assert.deepEqual(docsOf(s, { move:'in' }).map(x => x.id), ['p']);
  assert.deepEqual(docsOf(s, { flight:'out' }).map(x => x.id), ['fo']);
  assert.deepEqual(docsOf(s, { flight:'back' }).map(x => x.id), ['fb']);
  assert.deepEqual(docsOf(s, { id:'r' }), []);
  assert.deepEqual(docsOf(s, null), []);
  assert.equal(docLabel({ kind:'flight' }), '탑승권'); assert.equal(docLabel({ kind:'모름' }), '서류');
});

test('편도: 가는 편만이면 마지막 날 출발 시각을, 오는 편만이면 첫날 도착 시각을 안 씀 · 오는 편 공항 따로', async () => {
  const F = await import('../js/flight.js');
  assert.deepEqual(F.effFlight({ ap:'HKG', arr:'12:00', dep:'18:00', way:'out' }), { ap:'HKG', arr:'12:00', dep:'', ap2:'', way:'out' });
  assert.equal(F.effFlight({ ap:'HKG', arr:'12:00', dep:'18:00', way:'back' }).arr, '');
  assert.equal(F.effFlight(null).way, '');
  assert.equal(F.depAp({ ap:'HKG', ap2:'SZX' }), 'SZX'); assert.equal(F.depAp({ ap:'HKG', ap2:'' }), 'HKG');
  assert.equal(F.departInfo({ ap:'HKG', dep:'18:00', way:'out' }, 'hksz', 'hk', 'standard'), null);
  assert.equal(F.arriveInfo({ ap:'HKG', arr:'12:00', way:'back' }, 'hksz', 'hk', 'standard'), null);
  assert.equal(F.departInfo({ ap:'HKG', ap2:'SZX', dep:'18:00' }, 'hksz', 'sz', 'standard').ap.code, 'SZX');   // 홍콩 도착·선전 출발
  assert.equal(F.arriveInfo({ ap:'HKG', ap2:'SZX', arr:'12:00' }, 'hksz', 'hk', 'standard').ap.code, 'HKG');
  // 편도로 해 둔 반대쪽 항공권을 넣으면 왕복으로, 오는 편 공항은 ap2로
  const s = trip({ flight:{ ap:'NRT', arr:'', dep:'', ap2:'', way:'out' } });
  const r = applyFlight(s, v('flight', { date:'2027-03-10', time:'18:30', dir:'back', ap:'HND' }));
  assert.deepEqual([r.patch.flight.way, r.patch.flight.ap, r.patch.flight.ap2, r.patch.flight.dep], ['', 'NRT', 'HND', '18:30']);
  assert.ok(r.msgs.includes('왕복으로'));
  // 함께 짜기로 온 이상한 값은 바로잡음
  const { cleanShared } = await import('../js/sharecore.js');
  const o = { flight:{ ap:'HKG', arr:'', dep:'', way:'편도', ap2:5 } }; cleanShared(o);
  assert.deepEqual([o.flight.way, o.flight.ap2], ['', '5']);
});
