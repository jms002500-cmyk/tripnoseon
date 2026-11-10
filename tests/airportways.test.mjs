// 공항 오가는 길 추천 방법 (js/airportways.js): 구간·공항·숙소 도시에 맞는 카드
import test from 'node:test';
import assert from 'node:assert/strict';
import { airportWays } from '../js/airportways.js';
import { MOVE_HOW } from '../js/moves.js';

test('구간·공항·숙소 도시마다 맞는 방법', () => {
  const t = (k, w) => airportWays(k, w).map(x => x.title);
  assert.deepEqual(t('go', {}).slice(0, 3), ['공항철도 (AREX)', '공항버스 (리무진)', '자가용']);
  assert.ok(t('in', { region:'hksz', ap:'HKG', city:'hk' }).includes('공항버스 A21·A11'));
  assert.equal(t('in', { region:'hksz', ap:'HKG', city:'sz' })[0], '국경 넘는 공항 버스·리무진');
  assert.equal(t('out', { region:'hksz', ap:'SZX', city:'sz' })[0], '지하철 11호선');
  assert.ok(t('in', { region:'tokyo', ap:'NRT' }).length >= 3);
  assert.deepEqual(airportWays('etc', { region:'hksz' }), []);
  // 수단은 오가는 길에 있는 것만, 글은 비지 않게 (홍콩 안내 글을 가져옴)
  const hows = MOVE_HOW.map(h => h.k);
  ['go', 'in', 'out'].forEach(k => ['hk', 'sz'].forEach(c => airportWays(k, { region:'hksz', ap:k === 'go' ? 'ICN' : 'HKG', city:c }).forEach(x => { assert.ok(hows.includes(x.how), x.title); assert.ok(x.text.length > 10, x.title); })));
  assert.match(airportWays('in', { region:'hksz', ap:'HKG', city:'hk' })[0].text, /24분/);
});
