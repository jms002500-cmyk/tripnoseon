// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone, compareHotels, hotelOf, nights, partySize, plan } from '../js/logic.js';
import { safeHttpsUrl } from '../js/gimport.js';

// 지어낸 예시: 가족 3명, 2027-03-07 ~ 03-11 (4박), 디즈니랜드 + 아사쿠사·우에노 쪽 장소
const base = () => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids:[9],
  start:'2027-03-07', end:'2027-03-11', picked:{ tdl:true, sensoji:true, skytree:true, uenozoo:true }, must:{ tdl:true } });
const H = (id, lat, lng, price, extra) => Object.assign({ id, name:id, lat, lng, price, area:'' }, extra);

test('박 수와 인원', () => {
  const s = base();
  assert.equal(nights(s), 4); assert.equal(partySize(s), 3);
  assert.equal(nights(clone(DEFAULT)), 0); assert.equal(partySize(clone(DEFAULT)), 0);
});

test('위치 점수: 담은 곳(아사쿠사·우에노)에 가까운 후보가 앞', () => {
  const s = base();
  s.hotels = [H('shinjukuH', 35.6909, 139.7003, 20000), H('asakusaH', 35.7110, 139.7990, 18000)];
  const r = compareHotels(s, 'place').rows;
  assert.deepEqual(r.map(x => x.h.id), ['asakusaH', 'shinjukuH']);
  assert.equal(r[0].area, 'asakusa');
  assert.ok(r[0].near >= 2);
});

test('가격순 정렬, 가격 없는 곳은 뒤로, 총액·1인당', () => {
  const s = base();
  s.hotels = [H('a', 35.7110, 139.7990, 30000), H('b', 35.6909, 139.7003, 0), H('c', 35.6765, 139.7655, 12000)];
  const r = compareHotels(s, 'price').rows;
  assert.deepEqual(r.map(x => x.h.id), ['c', 'a', 'b']);
  assert.equal(r[0].total, 48000); assert.equal(r[0].per, 16000);
  assert.equal(r[2].total, null);
});

test('위치를 모르는 후보는 따로 모음', () => {
  const s = base(); s.hotels = [H('x', null, null, 10000)];
  const c = compareHotels(s, 'place');
  assert.equal(c.rows.length, 0); assert.equal(c.noLoc.length, 1);
});

test('숙소 후보를 정하면 일정의 출발점이 그 호텔 위치', () => {
  const s = base(); s.hotels = [H('asakusaH', 35.7110, 139.7990, 18000)]; s.hotelPick = 'asakusaH';
  const h = hotelOf(s);
  assert.equal(h.name, 'asakusaH'); assert.equal(h.lat, 35.7110); assert.equal(h.key, 'asakusa');
  assert.equal(plan(s).hotel.name, 'asakusaH');
  s.hotelPick = 'missing';
  assert.notEqual(hotelOf(s).name, 'asakusaH');
});

test('예약 링크는 https만', () => {
  assert.ok(safeHttpsUrl('https://www.booking.com/hotel/jp/x.html'));
  assert.equal(safeHttpsUrl('http://x.com'), '');
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('https://x.com/"onclick=1'), '');
});
