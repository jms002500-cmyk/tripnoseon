// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKED, CALLS, CONSULATES, PHRASES, LOST, WEATHER, ENTRY, TRANSPORT, MONEY, PACKING,
  callsFor, consulateFor, phrasesFor, forCity, packingFor, guideFor } from '../js/regions/hksz-guide.js';
import { PACK_CATS } from '../js/packing.js';
import { telHref } from '../js/safety.js';

const CITIES = ['hk', 'sz'];
const filled = (o, keys, name) => keys.forEach(k => assert.ok(typeof o[k] === 'string' && o[k].trim(), `${name}: ${k} 비어 있음`));
const okCity = (x, name, allowBoth) => assert.ok(x.city === undefined || CITIES.includes(x.city) || (allowBoth && x.city === 'both'), `${name}: city ${x.city}`);
const uniq = (list, name) => assert.equal(new Set(list.map(x => x.key)).size, list.length, `${name}: key 겹침`);

test('확인 날짜는 YYYY-MM-DD 진짜 날짜', () => {
  assert.match(CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(CHECKED + 'T00:00:00Z').toISOString().slice(0, 10), CHECKED);
});

test('긴급 번호: 빈 칸 없음, 공식 출처 값 그대로, 전화 링크 모양', () => {
  uniq(CALLS, 'CALLS');
  CALLS.forEach(c => { filled(c, ['key', 'label', 'num', 'tel', 'when'], c.key); okCity(c, c.key); });
  const by = k => CALLS.find(c => c.key === k);
  assert.equal(by('hk999').num, '999'); assert.equal(by('cn110').num, '110'); assert.equal(by('cn120').num, '120'); assert.equal(by('cn119').num, '119');
  assert.equal(by('consul').tel, '+82-2-3210-0404');
  assert.equal(by('hkEmg').tel, '+852-9731-0092'); assert.equal(by('hkMain').tel, '+852-2529-4141');
  assert.equal(by('gzEmg').tel, '+86-139-2247-3457'); assert.equal(by('gzMain').tel, '+86-20-2919-2999');
  // 긴급번호는 짧은 번호 그대로, 나머지는 국가번호(+852·+86·+82)를 붙임
  CALLS.forEach(c => {
    assert.match(c.tel, /^(\d{3}|\+(852|86|82)(-\d+)+)$/, c.key);
    assert.match(telHref(c.tel), /^tel:(\d{3}|\+\d{8,15})$/, c.key);
  });
  assert.equal(telHref('+852-2508-1234'), 'tel:+85225081234');
});

test('도시 전용 번호는 그 도시에서만, 영사콜센터는 두 곳 다', () => {
  const keys = city => callsFor(city).map(c => c.key);
  assert.ok(keys('hk').includes('hk999') && !keys('hk').includes('cn110'));
  assert.ok(keys('sz').includes('cn110') && !keys('sz').includes('hk999'));
  assert.ok(keys('hk').includes('consul') && keys('sz').includes('consul'));
  CITIES.forEach(city => assert.ok(callsFor(city).some(c => c.big), city));
});

test('공관: 도시마다 하나, 빈 칸 없음', () => {
  CONSULATES.forEach(c => filled(c, ['city', 'name', 'local', 'addr', 'hours'], c.city));
  CITIES.forEach(city => assert.equal(consulateFor(city).city, city));
  assert.equal(consulateFor('tokyo'), null);
});

test('문장: 도시마다 9개 이상, 빈 칸 없음, 홍콩은 번체·선전은 간체', () => {
  CITIES.forEach(city => {
    assert.ok(PHRASES[city].length >= 9, city);
    PHRASES[city].forEach((p, i) => filled(p, ['local', 'ko', 'read'], `${city}#${i}`));
    assert.equal(phrasesFor(city), PHRASES[city]);
  });
  assert.deepEqual(phrasesFor('tokyo'), []);
  const hk = PHRASES.hk.map(p => p.local).join(''), sz = PHRASES.sz.map(p => p.local).join('');
  assert.ok(hk.includes('請') && !hk.includes('请'));
  assert.ok(sz.includes('请') && !sz.includes('請'));
});

test('분실·날씨 안내가 비어 있지 않음', () => {
  assert.ok(LOST.length >= 4); LOST.forEach((x, i) => { filled(x, ['t', 'd'], `LOST#${i}`); okCity(x, `LOST#${i}`); });
  CITIES.forEach(city => assert.ok(forCity(LOST, city).some(x => x.t.includes('여권')), city));
  assert.ok(WEATHER.length >= 4 && WEATHER.every(w => typeof w === 'string' && w.trim()));
});

test('입국·교통: 빈 칸 없음, 도시 값이 맞음, 두 도시 다 안내가 있음', () => {
  [['ENTRY', ENTRY], ['TRANSPORT', TRANSPORT]].forEach(([name, list]) => {
    uniq(list, name);
    list.forEach(x => { filled(x, ['key', 'title', 'text', 'city'], `${name}.${x.key}`); okCity(x, `${name}.${x.key}`, true); });
    CITIES.forEach(city => assert.ok(forCity(list, city).some(x => x.city === city), `${name} ${city}`));
  });
  // 12월 여행에 중요한 무비자 기한이 문구에 들어 있음
  assert.match(ENTRY.find(x => x.key === 'cnVisa').text, /2026년 12월 31일/);
});

test('돈: 도시마다 통화와 팁', () => {
  assert.equal(MONEY.hk.cur, 'HKD'); assert.equal(MONEY.sz.cur, 'CNY');
  CITIES.forEach(city => assert.ok(MONEY[city].tips.length >= 3 && MONEY[city].tips.every(t => t.trim()), city));
});

test('준비물: cat은 PACK_CATS 안, suggestPacking 모양으로 바꿔 줌', () => {
  const cats = new Set(PACK_CATS.map(c => c.key));
  uniq(PACKING, 'PACKING');
  PACKING.forEach(p => { filled(p, ['key', 'text', 'cat', 'why'], p.key); assert.ok(cats.has(p.cat), `${p.key}: ${p.cat}`); okCity(p, p.key); });
  const hk = packingFor('hk');
  assert.ok(hk.some(x => x.key === 'hkPlug') && !hk.some(x => x.key === 'cnPlug'));
  assert.ok(hk.some(x => x.key === 'passValid'));
  assert.deepEqual(Object.keys(hk[0]).sort(), ['c', 'key', 't', 'why']);
});

test('guideFor: 한 도시 묶음', () => {
  const g = guideFor('sz');
  assert.ok(g.calls.length && g.phrases.length && g.entry.length && g.transport.length && g.packing.length);
  assert.equal(g.money.cur, 'CNY'); assert.equal(g.consulate.city, 'sz'); assert.deepEqual(g.weather, []);
  assert.ok(guideFor('hk').weather.length);
});
