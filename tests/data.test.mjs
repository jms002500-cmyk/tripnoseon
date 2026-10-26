// 실행: npm test  — 장소 데이터가 화면·계산에서 깨지지 않는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, AREAS, KINDS, STYLES } from '../js/data.js';
import { MW, MH, px } from '../js/map.js';

test('장소 데이터: id 중복 없음, 동네·종류·취향 값이 목록 안에 있음', () => {
  const ids = PLACES.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  PLACES.forEach(p => {
    assert.ok(AREAS[p.area], `${p.id} 동네`);
    assert.ok(KINDS.includes(p.kind), `${p.id} 종류`);
    (p.tags || []).forEach(t => assert.ok(STYLES.includes(t), `${p.id} 취향 ${t}`));
    assert.ok(p.full || p.hours > 0, `${p.id} 머무는 시간`);
  });
});

test('모든 장소가 도쿄 약도 안에 그려짐', () => {
  PLACES.forEach(p => { const [x, y] = px(p); assert.ok(x >= 0 && x <= MW && y >= 0 && y <= MH, `${p.id} (${x}, ${y})`); });
});

test('꼭 갈 곳 후보가 여러 종류에 걸쳐 있음', () => {
  const kinds = new Set(PLACES.filter(p => p.anchor).map(p => p.kind));
  assert.ok(PLACES.filter(p => p.anchor).length >= 20);
  assert.ok(kinds.size >= 6);
});
