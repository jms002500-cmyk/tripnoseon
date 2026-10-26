// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { gdir, gdirPoint, esc } from '../js/ui.js';

test('구글 지도 대중교통 길찾기 링크: 기본 장소는 일본어 이름, 직접 담은 곳·숙소는 좌표', () => {
  const sensoji = { ja:'浅草寺', lat:35.7148, lng:139.7967 };
  const mine = { ja:'', custom:true, lat:35.66, lng:139.70 };
  const hotel = { name:'ホテルA', lat:35.712, lng:139.777 };
  assert.equal(gdirPoint(sensoji), '浅草寺');
  assert.equal(gdirPoint(mine), '35.660000,139.700000');
  const u = new URL(gdir(hotel, sensoji));
  assert.equal(u.origin + u.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(u.searchParams.get('api'), '1');
  assert.equal(u.searchParams.get('origin'), '35.712000,139.777000');
  assert.equal(u.searchParams.get('destination'), '浅草寺');
  assert.equal(u.searchParams.get('travelmode'), 'transit');
});

test('esc: HTML 특수문자', () => {
  assert.equal(esc('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
});
