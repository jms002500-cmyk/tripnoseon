// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { sortVault, groupVault, missingBookings, fitSize, sizeText, kindOf } from '../js/vault.js';
import { SHARED_KEYS } from '../js/sharecore.js';

test('보관함은 함께 짜기로 공유하지 않음 (기기에만)', () => {
  assert.ok(!SHARED_KEYS.includes('vault'));
  assert.deepEqual(clone(DEFAULT).vault, []);
});

test('날짜·시간순, 날짜 없는 것은 뒤로, 날짜별 묶기', () => {
  const items = [
    { id:'a', kind:'etc', title:'보험', date:'' },
    { id:'b', kind:'ticket', title:'디즈니', date:'2027-03-08', time:'09:00' },
    { id:'c', kind:'flight', title:'가는 편', date:'2027-03-07', time:'08:30' },
    { id:'d', kind:'hotel', title:'호텔', date:'2027-03-07', time:'' }
  ];
  assert.deepEqual(sortVault(items).map(x => x.id), ['c', 'd', 'b', 'a']);
  const g = groupVault(items);
  assert.deepEqual(g.map(x => x.date), ['2027-03-07', '2027-03-08', '']);
  assert.equal(g[0].items.length, 2);
});

test('아직 없는 예약 제안: 항공권·숙소·예약 필요한 곳·입국 QR', () => {
  const s = Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11', picked:{ tdl:true, ghibli:true, sensoji:true },
    hotels:[{ id:'h1', name:'ホテルA' }], hotelPick:'h1' });
  const m = missingBookings(s, []);
  assert.deepEqual(m.map(x => x.kind), ['flight', 'hotel', 'ticket', 'ticket', 'entry']);
  assert.equal(m[1].title, 'ホテルA'); assert.equal(m[1].date, '2027-03-07');
  assert.ok(m.some(x => x.placeId === 'tdl' && /입장권/.test(x.title)));
  assert.ok(!m.some(x => x.placeId === 'sensoji'));   // 예약 필요 없는 곳은 빼고
  // 이미 넣은 것은 다시 제안하지 않음
  const m2 = missingBookings(s, [{ kind:'flight' }, { kind:'hotel' }, { kind:'ticket', placeId:'tdl' }, { kind:'entry' }]);
  assert.deepEqual(m2.map(x => x.placeId), ['ghibli']);
});

test('사진 줄이기 크기와 용량 표시', () => {
  assert.deepEqual(fitSize(4000, 3000, 2000), { w:2000, h:1500 });
  assert.deepEqual(fitSize(800, 600, 2000), { w:800, h:600 });
  assert.equal(sizeText(512), '1KB'); assert.equal(sizeText(2.5 * 1048576), '2.5MB');
  assert.equal(kindOf('nope').key, 'etc');
});

test('영수증 사진은 보관함 항목이지만 보관함 목록에는 안 보임', async () => {
  const { isReceipt, bookings, receiptOf, newReceipt } = await import('../js/vault.js');
  const r = newReceipt('s1', { what:'라멘', d:'2027-03-08', pl:'sensoji' }, 'v1');
  assert.deepEqual([r.kind, r.spendId, r.title, r.date, r.placeId], ['receipt', 's1', '영수증 · 라멘', '2027-03-08', 'sensoji']);
  assert.equal(newReceipt('s2', { what:'유심', d:'before' }, 'v2').date, '');
  const vault = [{ id:'a', kind:'ticket', files:[] }, r];
  assert.ok(isReceipt(r)); assert.ok(!isReceipt(vault[0]));
  assert.deepEqual(bookings(vault).map(x => x.id), ['a']);
  assert.equal(receiptOf(vault, 's1'), r); assert.equal(receiptOf(vault, 'zz'), null);
});
