// 기능 찾기: 도움 화면 목적지 · 지역 거르기 · 출발 전 할 일에 때맞춰 꺼내는 기능
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { GUIDE, DEST, guideFor } from '../js/guide.js';
import { prepTasks } from '../js/prep.js';

test('바로 가기 목적지가 모두 있고, 단계 이름이 맞음', () => {
  GUIDE.forEach(g => g.items.forEach(x => { if(x.to) assert.ok(DEST[x.to], `${x.t} → ${x.to}`); }));
  Object.entries(DEST).forEach(([k, d]) => {
    assert.ok(d.step || d.mode || d.act, k);
    if(d.step) assert.ok(D.STEPS.includes(d.step), `${k}: ${d.step}`);
  });
  // 출발 전 할 일의 go도 갈 곳이 있음 (옛 목적지는 app.js goTo가 따로 처리)
  const s = Object.assign(clone(D.DEFAULT), { city:'hksz', start:'2026-12-06', end:'2026-12-10', moves:[{ id:'g', k:'go', how:'car' }] });
  const OLD = ['idbox', 'vault', 'movebox', 'icsbox', 'pack', 'where'];
  prepTasks(s).filter(x => x.go).forEach(x => assert.ok(OLD.includes(x.go) || DEST[x.go], `${x.key} → ${x.go}`));
});

test('지역에 없는 기능은 안 보임 (홍콩·선전: MTR·식당·행사·국경, 도쿄: 교통패스)', () => {
  const hk = guideFor({ city:'hksz' }).flatMap(g => g.items.map(x => x.t));
  const tk = guideFor({ city:'tokyo' }).flatMap(g => g.items.map(x => x.t));
  assert.ok(hk.includes('지하철이 언제 오는지 볼 때') && hk.includes('아이와 갈 만한 식당이 궁금할 때') && !hk.includes('교통패스가 이득인지 궁금할 때'));
  assert.ok(!tk.includes('지하철이 언제 오는지 볼 때') && tk.includes('교통패스가 이득인지 궁금할 때'));
  assert.deepEqual(guideFor({ city:'hksz' }).map(g => g.key), ['before', 'airport', 'during', 'trouble']);
});

test('출발 전 할 일: 쓸 때가 된 날에 기능을 꺼내 줌, 해 두면 저절로 체크', () => {
  const base = Object.assign(clone(D.DEFAULT), { city:'hksz', start:'2026-12-06', end:'2026-12-10', who:'family', kids:[12] });
  const T = prepTasks(base); const k = x => T.find(y => y.key === x);
  assert.equal(k('places').dday, 20); assert.equal(k('places').go, 'aiplan'); assert.match(k('places').why, /가족 식당/);
  assert.equal(k('backup').go, 'backupbox'); assert.equal(k('offline').dday, 2); assert.equal(k('helpread').go, 'help');
  assert.match(k('helpread').why, /MTR/);
  assert.match(k('moves').why, /주차장/);
  assert.ok(!k('parknow') && !k('busnow'));   // 공항 가는 길을 안 정했으면 없음
  // 자가용 → 주차장, 공항버스 → 버스 시간
  assert.ok(prepTasks(Object.assign({}, base, { moves:[{ id:'g', k:'go', how:'car' }] })).some(x => x.key === 'parknow'));
  assert.ok(prepTasks(Object.assign({}, base, { moves:[{ id:'g', k:'go', how:'abus' }] })).some(x => x.key === 'busnow'));
  // 장소 3곳 이상 담았거나 백업했으면 저절로 체크
  const T2 = prepTasks(Object.assign({}, base, { picked:{ a:true, b:true, c:true }, lastBackup:'2026-11-03' }));
  assert.ok(T2.find(x => x.key === 'places').auto && T2.find(x => x.key === 'backup').auto);
  // 도쿄는 식당 말이 없고, 도움 안내 말이 다름
  const tk = prepTasks(Object.assign(clone(D.DEFAULT), { city:'tokyo', start:'2027-03-07', end:'2027-03-10' }));
  assert.doesNotMatch(tk.find(x => x.key === 'places').why, /가족 식당/);
  assert.doesNotMatch(tk.find(x => x.key === 'helpread').why, /MTR/);
});
