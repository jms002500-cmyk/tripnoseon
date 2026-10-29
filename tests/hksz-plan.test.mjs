// 홍콩·선전 일정: 자는 도시에 맞춰 장소를 배치하고, 두 도시에 담으면 나눠 자기를 추천
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan, suggestSplit, splitNights, autoNight, nightHotel, placeCity, buildDays } from '../js/logic.js';

// 실제 폰 시험(2026-10-29)과 같은 가상 여행: 가족 3명, 12/6~12/10, 홍콩 5곳 + 선전 6곳 + 홍콩 디즈니
const PICKS = ['hk_disney', 'sz_pingan', 'sz_dji', 'sz_huaqiangbei', 'hk_starferry', 'hk_space', 'hk_science', 'hk_goldfish', 'hk_ngong360', 'sz_seg', 'sz_window', 'sz_happyvalley'];
function trip(){
  const s = clone(D.DEFAULT);
  Object.assign(s, { city:'hksz', country:'hk', who:'family', adults:2, kids:[12], start:'2026-12-06', end:'2026-12-10' });
  s.picked = Object.fromEntries(PICKS.map(id => [id, true])); s.must = { hk_disney:true, sz_pingan:true };
  return s;
}
const cityOfDay = d => new Set([d.from, d.to].map(x => D.cityOfArea(x.key)));

test('두 도시에 담으면 홍콩 → 선전 순서로 밤을 나눠 추천 (도시마다 최소 1박, 합은 전체 박 수)', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); const sp = suggestSplit(s);
    assert.ok(sp, '추천이 있어야 함');
    assert.deepEqual(sp.map(o => o.city), ['hk', 'sz']);
    assert.equal(sp.reduce((x, o) => x + o.nights, 0), 4);
    sp.forEach(o => { assert.ok(o.nights >= 1); assert.equal(D.AREAS[o.key].city, o.city); });
    const n = splitNights(s, sp); assert.equal(Object.keys(n).length, 4);
    assert.equal(n['2026-12-06'], 'area:' + sp[0].key); assert.equal(n['2026-12-09'], 'area:' + sp[1].key);
  } finally { D.useRegion('tokyo'); }
});

test('밤을 안 정해도 추천대로 자고, 그날 자는 도시가 아닌 장소는 넣지 않음 (국경 왕복 없음)', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); const P = plan(s);
    assert.ok(autoNight(s, '2026-12-06'));
    P.days.forEach(d => {
      const cs = cityOfDay(d);
      d.items.forEach(p => assert.ok(cs.has(placeCity(p)), `${d.label} ${p.name}: 자는 도시 ${[...cs]}`));
      if(d.full) assert.ok(cs.has(placeCity(d.full)), `${d.label} ${d.full.name}`);
    });
    // 디즈니는 홍콩에서 자는 온종일 날
    const dd = P.days.find(d => d.full && d.full.id === 'hk_disney'); assert.ok(dd); assert.ok(cityOfDay(dd).has('hk'));
  } finally { D.useRegion('tokyo'); }
});

test('시간이 모자라면 꼭 갈 곳이 아닌 곳이 빠짐 (꼭 갈 곳은 모두 일정에)', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); s.must = { hk_disney:true, sz_pingan:true, sz_dji:true, sz_huaqiangbei:true };
    s.nights = { '2026-12-06':'area:tst', '2026-12-07':'area:tst', '2026-12-08':'area:futian', '2026-12-09':'area:futian' };
    const P = plan(s); const out = new Set(P.unassigned.map(u => u.p.id));
    Object.keys(s.must).forEach(id => assert.ok(!out.has(id), `${id} 빠짐`));
    assert.ok(P.unassigned.length > 0, '이 여행은 시간이 모자라서 몇 곳은 빠져야 함');
    // 짐 들고 국경 넘는 날은 2시간 빼고
    const cross = P.days.find(d => d.cross); assert.ok(cross); assert.equal(cross.cap, 5);
  } finally { D.useRegion('tokyo'); }
});

test('밤마다 직접 정한 동네가 추천보다 먼저, 한 동네를 정하면 추천은 꺼짐', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); s.nights = { '2026-12-06':'area:central' };
    assert.equal(nightHotel(s, '2026-12-06').key, 'central');
    const s2 = trip(); s2.hotelArea = 'tst';
    assert.equal(autoNight(s2, '2026-12-06'), null);
    assert.equal(nightHotel(s2, '2026-12-09').key, 'tst');
  } finally { D.useRegion('tokyo'); }
});

test('한 도시에만 담았거나 도쿄면 나눠 자기 추천 없음', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); s.picked = { hk_disney:true, hk_space:true, hk_starferry:true };
    assert.equal(suggestSplit(s), null);
  } finally { D.useRegion('tokyo'); }
  const t = clone(D.DEFAULT); Object.assign(t, { start:'2026-12-06', end:'2026-12-10', picked:{ disney:true, sensoji:true } });
  assert.equal(suggestSplit(t), null);
  assert.equal(buildDays(t).length, 5);
});
