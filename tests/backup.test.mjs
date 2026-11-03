// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { stateForBackup, makeBackup, backupName, parseBackup, summarizeBackup, restoreState, blobToB64, b64ToBlob } from '../js/backup.js';

const s0 = () => Object.assign(clone(DEFAULT), { step:6, who:'family', adults:2, kids:[9], start:'2027-03-07', end:'2027-03-11',
  picked:{ tdl:true, sensoji:true }, hotels:[{ id:'h1', name:'A' }], vault:[{ id:'v1', title:'항공권', files:[{ fid:'f1' }] }],
  rkOn:true, rk:{ items:[1] }, wx:{ a:1 }, fx:{ rate:8 }, hotelBusy:true, vedit:'v1', sh:{ user:{ uid:'x' } } });

test('백업에서 화면 전용·다시 받을 수 있는 칸은 빼고 일정·보관함은 넣음', () => {
  const o = stateForBackup(s0());
  ['sh', 'rk', 'wx', 'fx', 'rkOn', 'hotelBusy', 'vedit'].forEach(k => assert.ok(!(k in o), k));
  assert.deepEqual(o.picked, { tdl:true, sensoji:true }); assert.equal(o.vault.length, 1); assert.equal(o.step, 6);
});

test('라쿠텐 키는 고를 때만 넣음', () => {
  const at = new Date(2027, 2, 1, 9, 5);
  assert.ok(!('rakuten' in makeBackup(s0(), [], null, at)));
  assert.deepEqual(makeBackup(s0(), [], { appId:'a', key:'pk_b' }, at).rakuten, { appId:'a', key:'pk_b' });
  assert.equal(backupName(at), 'tripnoseon-backup-20270301-0905.json');
});

test('백업 파일 읽기: 다른 파일·깨진 파일·더 새 버전은 거절', () => {
  assert.equal(parseBackup('{').ok, false);
  assert.equal(parseBackup(JSON.stringify({ app:'other', v:1, state:{} })).ok, false);
  assert.equal(parseBackup(JSON.stringify({ app:'tripnoseon', v:99, state:{} })).ok, false);
  const r = parseBackup(JSON.stringify(makeBackup(s0(), [{ fid:'f1', size:1000 }], null)));
  assert.equal(r.ok, true);
  const sum = summarizeBackup(r.data);
  assert.equal(sum.dates, '2027-03-07 ~ 2027-03-11'); assert.equal(sum.places, 2); assert.equal(sum.hotels, 1);
  assert.equal(sum.vault, 1); assert.equal(sum.files, 1); assert.equal(sum.bytes, 1000); assert.equal(sum.keys, false);
});

test('되돌리기: 백업 내용 + 없는 칸은 기본값, 화면 전용 칸은 비움', () => {
  const r = parseBackup(JSON.stringify(makeBackup(s0(), [], null)));
  const st = restoreState(r.data);
  assert.deepEqual(st.picked, { tdl:true, sensoji:true }); assert.equal(st.vault[0].title, '항공권');
  assert.equal(st.rk, null); assert.equal(st.rkOn, false); assert.equal(st.hotelBusy, false);
  assert.deepEqual(st.imports, []);   // 백업에 없던 칸도 기본값으로 채워짐
});

test('첨부를 글자로 바꿨다가 되돌려도 내용이 같음', async () => {
  const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
  const b64 = await blobToB64(new Blob([bytes], { type:'image/png' }));
  const back = new Uint8Array(await b64ToBlob(b64, 'image/png').arrayBuffer());
  assert.equal(back.length, bytes.length);
  assert.ok(back.every((v, i) => v === bytes[i]));
});

test('다른 지역 일정으로 되돌릴 때는 그 지역 데이터를 먼저 불러옴 (안 그러면 숙소 동네 화면이 멈춤)', async () => {
  // 합친 뒤 점검(2026-11-03): 도쿄를 보던 기기에서 홍콩·선전 백업으로 되돌리거나(또는 그 반대), 다른 지역 공유 여행에 참여했다가
  //   '참여 전 일정으로'를 누르면 일정은 바뀌는데 지역 데이터(AREAS·PLACES)는 옛 지역 그대로라 숙소 동네 화면이 멈췄음
  const D = await import('../js/data.js'); const { loadRegion } = D;
  const { vStay } = await import('../js/views.js');
  await loadRegion('hksz'); const hkArea = Object.keys(D.AREAS)[0];
  const st = Object.assign(clone(DEFAULT), { step:4, city:'hksz', country:'hk', start:'2026-12-06', end:'2026-12-10', hotelArea:hkArea, hotelCur:'HKD' });
  await loadRegion('tokyo');
  const next = restoreState({ state:st }); next.sh = {};
  assert.equal(next.city, 'hksz'); assert.equal(D.REGION.key, 'tokyo');
  assert.throws(() => vStay(next));                  // 옛 지역 그대로 그리면 멈춤 (고치기 전 모습)
  await loadRegion(next.city); assert.doesNotThrow(() => vStay(next));
  await loadRegion('tokyo');
  // app.js: 일정을 통째로 바꾸는 세 곳(백업으로 바꾸기·되돌리기·참여 전 일정으로) 모두 새 일정의 지역을 먼저 불러온 뒤 바꿈
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const swaps = [...app.matchAll(/const next = (restoreState\([^;]*\)|Object\.assign\(clone\(DEFAULT\), bk[^;]*\)); await useRegionOf\(next\.city, \w+\);\s*state = next;/g)];
  assert.equal(swaps.length, 3);
  assert.equal((app.match(/state = restoreState\(|state = Object\.assign\(clone\(DEFAULT\), bk/g) || []).length, 0);
  // 함께 짜기로 받은 일정이 다른 지역이면 불러온 뒤에 그림 (불러오기 전 옛 지역으로 한 번 그리지 않게)
  assert.match(app, /if\(REGION\.key !== s\.city\)\{ regionWait = true; loadRegion\(s\.city\)\.then\(\(\) => renderRemote\(\)\); \}/);
  assert.match(app, /if\(!regionWait\) renderRemote\(\);/);
});
