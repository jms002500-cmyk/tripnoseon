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
