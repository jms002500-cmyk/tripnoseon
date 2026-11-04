// 테마로 골라 보기: 테마 묶기 · 개수 · 모르는 키 · 홍콩·선전/도쿄 데이터에서 테마마다 장소가 있음
import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, themeOf, inTheme, themeCounts } from '../js/themes.js';
import { PLACES as HK } from '../js/regions/hksz-data.js';
import { PLACES as TOKYO } from '../js/data.js';

test('테마: 키가 겹치지 않고 아이콘·이름이 있음', () => {
  const keys = THEMES.map(t => t.key); assert.equal(new Set(keys).size, keys.length);
  THEMES.forEach(t => { assert.ok(t.icon && t.label && typeof t.test === 'function', t.key); });
});

test('취향·종류·실내로 묶음, 한 곳이 여러 테마에 들 수 있음', () => {
  const night = { name:'야시장', kind:'거리·시장', tags:['맛집', '쇼핑'], indoor:false, note:'저녁에 열려요' };
  assert.ok(inTheme(night, 'shop') && inTheme(night, 'food') && inTheme(night, 'night'));
  assert.ok(!inTheme(night, 'rain'));
  const museum = { name:'박물관', kind:'박물관·미술관', tags:[], indoor:true };
  assert.ok(inTheme(museum, 'culture') && inTheme(museum, 'rain') && !inTheme(museum, 'shop'));
  assert.ok(inTheme({ name:'놀이터', kid:'kids' }, 'kids'));
  assert.ok(!inTheme({ name:'반쯤 실내', indoor:'part' }, 'rain'));
});

test('모르는 키·all이면 다 듦, themeOf는 없으면 null', () => {
  assert.ok(inTheme({ name:'x' }, 'all')); assert.ok(inTheme({ name:'x' }, 'nope'));
  assert.equal(themeOf('all'), null); assert.equal(themeOf('shop').label, '쇼핑·시장');
});

test('홍콩·선전·도쿄 데이터: 테마마다 장소가 있고 개수가 맞음', () => {
  const hk = themeCounts(HK);
  THEMES.forEach(t => assert.ok(hk[t.key] >= 3, `홍콩·선전 ${t.key} ${hk[t.key]}`));
  assert.equal(hk.shop, HK.filter(p => inTheme(p, 'shop')).length);
  // 짝퉁·흥정 시장으로 묻는 곳이 쇼핑·시장에
  ['hk_ladies', 'hk_temple', 'sz_luohucc'].forEach(id => assert.ok(inTheme(HK.find(p => p.id === id), 'shop'), id));
  const tk = themeCounts(TOKYO); assert.ok(Object.values(tk).filter(n => n > 0).length >= 5);
});
