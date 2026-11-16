// 구글 지도에서 고른 숙소 → 숙소 후보 (v0.88.0, 2026-11-16). 값은 모두 지어낸 것
import test from 'node:test';
import assert from 'node:assert/strict';
import { isLodging, toHotel, sameHotel, refreshHotel, staleGoogle, REFRESH_DAYS, gmapsPlaceUrl } from '../js/gplace.js';
import { cleanShared } from '../js/sharecore.js';
import * as D from '../js/data.js';

const G = { id:'ChIJfakeHotel1', name:'테스트 호텔 신주쿠', lat:35.6938, lng:139.7034, types:['hotel', 'lodging'], addr:'東京都新宿区 1-2-3', mapsUrl:'https://maps.google.com/?cid=1234567890' };

test('숙박 종류 알아보기', () => {
  assert.ok(isLodging(['lodging', 'point_of_interest']));
  assert.ok(isLodging(['hostel']));
  assert.ok(isLodging(['japanese_inn']));
  assert.ok(!isLodging(['restaurant', 'food']));
  assert.ok(!isLodging([]));
  assert.ok(!isLodging(undefined));
});

test('구글 장소 → 숙소 후보: 위치·동네·장소 ID·받은 날, 가격은 비워 둠', () => {
  const h = toHotel(G, 'hx1', 1000, 'JPY');
  assert.deepEqual([h.id, h.name, h.area, h.st, h.src, h.gid, h.gAt, h.price, h.pcur, h.approx], ['hx1', '테스트 호텔 신주쿠', 'shinjuku', 'ok', 'google', 'ChIJfakeHotel1', 1000, 0, 'JPY', false]);
  assert.equal(h.lat, 35.6938); assert.equal(h.lng, 139.7034);
  assert.equal(h.mapUrl, 'https://maps.google.com/?cid=1234567890');
  assert.equal(h.addr, '東京都新宿区 1-2-3');
  assert.equal(h.bookUrl, ''); assert.equal(h.memo, '');
});

test('숙소 후보 지도 주소: 구글 주소가 아니면 장소 ID 주소로 바꿈, 이름·주소 길이 제한', () => {
  const bad = toHotel(Object.assign({}, G, { mapsUrl:'javascript:alert(1)' }), 'hx2', 1);
  assert.equal(bad.mapUrl, gmapsPlaceUrl('테스트 호텔 신주쿠', 'ChIJfakeHotel1'));
  const other = toHotel(Object.assign({}, G, { mapsUrl:'https://evil.example/maps' }), 'hx3', 1);
  assert.equal(other.mapUrl, gmapsPlaceUrl('테스트 호텔 신주쿠', 'ChIJfakeHotel1'));
  const long = toHotel(Object.assign({}, G, { name:'가'.repeat(80), addr:'나'.repeat(200) }), 'hx4', 1);
  assert.equal(long.name.length, 60); assert.equal(long.addr.length, 120);
  assert.equal(toHotel(Object.assign({}, G, { name:'' }), 'hx5', 1).name, '구글 지도에서 고른 숙소');
});

test('이미 담은 숙소인지: 같은 장소 ID, 또는 이름이 겹치고 300m 안', () => {
  const hotels = [
    { id:'h1', name:'테스트 호텔 신주쿠', lat:35.6940, lng:139.7030, gid:'' },
    { id:'h2', name:'다른 숙소', lat:35.70, lng:139.70, gid:'ChIJfakeHotel9' }
  ];
  assert.equal(sameHotel(hotels, { id:'ChIJfakeHotel9', name:'이름이 달라도', lat:35.0, lng:139.0 }).id, 'h2');   // 장소 ID가 같으면
  assert.equal(sameHotel(hotels, G).id, 'h1');                                                                  // 이름 겹침 + 가까움
  assert.equal(sameHotel(hotels, Object.assign({}, G, { id:'', name:'테스트호텔신주쿠' })).id, 'h1');            // 띄어쓰기만 다름
  assert.equal(sameHotel(hotels, Object.assign({}, G, { id:'', lat:35.73, lng:139.71 })), null);                // 이름은 같아도 4km 넘게 떨어짐
  assert.equal(sameHotel(hotels, Object.assign({}, G, { id:'', name:'근처 다른 호텔' })), null);                 // 가까워도 이름이 다름
  assert.equal(sameHotel([{ id:'h3', name:'테스트 호텔 신주쿠', lat:null, lng:null }], G).id, 'h3');            // 위치를 아직 모르는 후보는 이름으로
  assert.equal(sameHotel([], G), null);
  assert.equal(sameHotel(undefined, G), null);
});

test('구글에서 고른 숙소도 25일 지나면 새로 받고, 좌표·동네·주소만 고침', () => {
  const day = 86400000, now = 100 * day;
  const h = Object.assign(toHotel(G, 'hx1', now - (REFRESH_DAYS + 1) * day, 'JPY'), { price:12000, memo:'메모', vid:'v1', booked:true, name:'내가 고친 이름' });
  const typed = { id:'h9', name:'직접 적은 숙소', lat:35.69, lng:139.70, src:'link' };
  assert.deepEqual(staleGoogle([h, typed], now).map(x => x.id), ['hx1']);
  const r = refreshHotel(h, { id:G.id, lat:35.6900, lng:139.7000, addr:'새 주소' }, now);
  assert.deepEqual([r.lat, r.lng, r.area, r.addr, r.gAt], [35.69, 139.70, 'shinjuku', '새 주소', now]);
  assert.deepEqual([r.name, r.price, r.memo, r.vid, r.booked, r.id], ['내가 고친 이름', 12000, '메모', 'v1', true, 'hx1']);
  assert.equal(refreshHotel(h, { id:G.id, lat:'x', lng:null }, now), h);   // 이상한 값이면 그대로
});

test('함께 짜기: 구글 숙소 후보 모양 그대로 받으면 바뀌지 않고, 이상한 gid·gAt은 바로잡음', () => {
  const h = toHotel(G, 'hx1', 5000, 'JPY');
  const s = cleanShared({ hotels:[JSON.parse(JSON.stringify(h))] });
  assert.deepEqual(s.hotels[0], h);
  const bad = cleanShared({ hotels:[Object.assign({}, h, { gid:{ x:1 }, gAt:'abc' })] }).hotels[0];
  assert.equal(bad.gid, ''); assert.equal(bad.gAt, 0);
});

test('홍콩·선전 여행이면 홍콩 동네로', async () => {
  await D.loadRegion('hksz');
  const h = toHotel({ id:'ChIJfakeHK', name:'테스트 하버 호텔', lat:22.2980, lng:114.1725, addr:'Tsim Sha Tsui' }, 'hk1', 1, 'HKD');
  assert.equal(h.area, 'tst'); assert.equal(h.pcur, 'HKD');
  await D.loadRegion('tokyo');
});
