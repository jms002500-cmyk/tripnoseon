// 인원별 티켓 (js/pax.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { travellers, paxOf, cleanPax, PAX_KINDS } from '../js/pax.js';

test('같이 가는 사람: 어른 수 + 아이(나이), 가계부 참여자 이름이 인원과 같으면 그 이름', () => {
  assert.deepEqual(travellers({ adults:2, kids:[10] }), [{ key:'a1', name:'어른 1' }, { key:'a2', name:'어른 2' }, { key:'k1', name:'아이 (10살)' }]);
  assert.deepEqual(travellers({ adults:1, kids:[] }).map(x => x.name), ['어른']);
  assert.deepEqual(travellers({ adults:2, kids:[7, 10] }).map(x => x.name), ['어른 1', '어른 2', '아이 1 (7살)', '아이 2 (10살)']);
  const party = [{ id:'p1', name:'아빠' }, { id:'p2', name:'엄마' }, { id:'p3', name:'민준' }];
  assert.deepEqual(travellers({ adults:2, kids:[10], party }).map(x => [x.key, x.name]), [['p:p1', '아빠'], ['p:p2', '엄마'], ['p:p3', '민준']]);
  assert.equal(travellers({ adults:2, kids:[10], party:party.slice(0, 2) })[2].name, '아이 (10살)');   // 가계부에 아이가 없으면 인원 기준
  assert.equal(travellers({}).length, 2);
});

test('항목을 사람별로: 번호·사진, 안 넣은 사람, 사람 안 정한 첨부', () => {
  const s = { adults:2, kids:[10] };
  const it = { kind:'ticket', pcode:{ a1:'T-001', k1:'T-003' }, files:[{ fid:'f1', who:'a1' }, { fid:'f2' }, { fid:'f3', who:'옛사람' }] };
  const P = paxOf(s, it);
  assert.equal(P.used, true);
  assert.deepEqual(P.list.map(x => [x.name, x.code, x.files.map(f => f.fid)]), [['어른 1', 'T-001', ['f1']], ['어른 2', '', []], ['아이 (10살)', 'T-003', []]]);
  assert.deepEqual(P.common.map(f => f.fid), ['f2', 'f3']);   // 인원이 바뀌어 모르는 사람 것도 안 사라지게
  assert.deepEqual(P.missing, ['어른 2']);
  assert.deepEqual(paxOf(s, { kind:'ticket', files:[{ fid:'x' }] }).missing, []);   // 인원별로 안 넣었으면 경고 없음
  assert.ok(!PAX_KINDS.includes('hotel'));
});

test('백업에서 온 모양 바로잡기', () => {
  const it = { pcode:{ a1:' 1 ', a2:5, __proto__x:'y', ['x'.repeat(50)]:'z' }, files:[{ who:7 }, { who:'a1' }] };
  cleanPax(it);
  assert.deepEqual(it.pcode, { a1:'1', __proto__x:'y' });
  assert.equal(it.files[0].who, undefined); assert.equal(it.files[1].who, 'a1');
  const bad = { pcode:[1, 2] }; cleanPax(bad); assert.equal('pcode' in bad, false);
});
