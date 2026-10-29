// 실행: npm test  — 홍콩·선전 동네·장소·노선·국경 데이터가 화면·계산에서 깨지지 않는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, PLACES, LINES, BORDER } from '../js/regions/hksz-data.js';
import { KINDS, STYLES } from '../js/data.js';
import { dist } from '../js/logic.js';

// 도시별 대략 범위 (홍콩: 란타우 서쪽 끝~사이쿵, 선전: 바오안~룽강)
const BOX = { hk:{ minLat:22.15, maxLat:22.57, minLng:113.82, maxLng:114.45 }, sz:{ minLat:22.44, maxLat:22.80, minLng:113.75, maxLng:114.65 } };
const ALL = { minLat:22.15, maxLat:22.80, minLng:113.75, maxLng:114.65 };
const inBox = (b, lat, lng) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;

test('동네: 도쿄 AREAS와 같은 모양', () => {
  const keys = Object.keys(AREAS);
  assert.ok(keys.filter(k => AREAS[k].city === 'hk').length >= 5);
  assert.ok(keys.filter(k => AREAS[k].city === 'sz').length >= 4);
  keys.forEach(k => {
    const a = AREAS[k];
    assert.ok(['hk', 'sz'].includes(a.city), `${k} city`);
    for(const f of ['name', 'station', 'q']) assert.ok(typeof a[f] === 'string' && a[f], `${k} ${f}`);
    assert.ok(inBox(BOX[a.city], a.lat, a.lng), `${k} 좌표`);
    assert.equal(typeof a.hotel, 'boolean', `${k} hotel`);
    assert.ok(Number.isFinite(a.lx) && Number.isFinite(a.ly), `${k} 약도 글자 위치`);
    assert.ok(['start', 'middle', 'end'].includes(a.anchor), `${k} anchor`);
    assert.equal(typeof a.note, 'string', `${k} note`);
    if(a.hotel){
      assert.ok(Number.isFinite(a.disneyMin) && a.disneyMin >= 0, `${k} disneyMin`);
      assert.ok(a.disneyText && a.price && a.note, `${k} 숙소 동네 안내`);
    }
  });
  assert.equal(AREAS.disney.disneyMin, 0);
});

test('장소: id 중복 없음, 동네·종류·취향 값이 목록 안에 있음', () => {
  const ids = PLACES.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  PLACES.forEach(p => {
    assert.ok(/^(hk|sz)_[a-z0-9]+$/.test(p.id), `${p.id} id 모양`);
    const a = AREAS[p.area];
    assert.ok(a, `${p.id} 동네`);
    assert.equal(p.id.slice(0, 2), a.city, `${p.id} 도시와 동네가 맞음`);
    assert.ok(KINDS.includes(p.kind), `${p.id} 종류`);
    assert.ok(Array.isArray(p.tags) && p.tags.length, `${p.id} 취향`);
    p.tags.forEach(t => assert.ok(STYLES.includes(t), `${p.id} 취향 ${t}`));
    assert.ok(['all', 'kids', 'teen', 'adult'].includes(p.kid), `${p.id} kid`);
    assert.ok([true, false, 'part'].includes(p.indoor), `${p.id} indoor`);
    assert.ok(p.name && p.ja, `${p.id} 이름·현지 이름`);
    if(p.closed) p.closed.forEach(w => assert.ok(Number.isInteger(w) && w >= 0 && w <= 6, `${p.id} 휴무 요일`));
  });
});

test('장소: 하루 종일이면 머무는 시간 0, 아니면 0보다 큼', () => {
  PLACES.forEach(p => {
    if(p.full) assert.equal(p.hours, 0, `${p.id} full이면 hours 0`);
    else assert.ok(p.hours > 0, `${p.id} 머무는 시간`);
  });
  assert.ok(PLACES.find(p => p.id === 'hk_disney').full);
  assert.ok(PLACES.find(p => p.id === 'hk_oceanpark').full);
});

test('장소: 좌표가 자기 도시 범위 안이고 동네에서 너무 멀지 않음', () => {
  PLACES.forEach(p => {
    const a = AREAS[p.area];
    assert.ok(inBox(BOX[a.city], p.lat, p.lng), `${p.id} (${p.lat}, ${p.lng})`);
    assert.ok(dist(p, a) < 12, `${p.id} 동네 ${p.area}까지 ${dist(p, a).toFixed(1)}km`);
  });
});

test('장소: 홍콩·선전 수와 꼭 갈 곳 후보', () => {
  assert.ok(PLACES.filter(p => p.id.startsWith('hk_')).length >= 30);
  assert.ok(PLACES.filter(p => p.id.startsWith('sz_')).length >= 20);
  const anchors = PLACES.filter(p => p.anchor);
  assert.ok(anchors.length >= 15);
  assert.ok(new Set(anchors.map(p => p.kind)).size >= 6);
  // 선전의 새로운 기술·도시 모습이 보이는 곳
  for(const id of ['sz_huaqiangbei', 'sz_dji', 'sz_pingan', 'sz_window', 'sz_octharbour', 'sz_baypark', 'sz_dafen', 'sz_seaworld'])
    assert.ok(PLACES.find(p => p.id === id), id);
});

test('노선: 이름·색·꼭짓점 모양', () => {
  assert.ok(LINES.length >= 3);
  LINES.forEach(l => {
    assert.ok(l.name, '노선 이름');
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(l.color), `${l.name} 색`);
    assert.ok(Array.isArray(l.pts) && l.pts.length >= 2, `${l.name} 꼭짓점`);
    l.pts.forEach(([lat, lng]) => assert.ok(inBox(ALL, lat, lng), `${l.name} (${lat}, ${lng})`));
  });
});

test('국경: 키 중복 없음, 설명·시간·좌표', () => {
  const keys = BORDER.map(b => b.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(BORDER.length >= 4);
  BORDER.forEach(b => {
    assert.ok(b.name && b.local && b.how, `${b.key} 이름·현지 이름·설명`);
    assert.ok(Number.isFinite(b.minutes) && b.minutes > 0 && b.minutes < 240, `${b.key} 시간`);
    assert.ok(inBox(ALL, b.lat, b.lng), `${b.key} 좌표`);
  });
});
