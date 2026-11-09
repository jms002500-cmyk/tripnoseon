// 확인서 여러 장 합치기(js/readdoc.js mergeReads) · 누가 어느 비행기 편(js/bookings.js applyFlight → s.fsegs, 함께 짜기로 공유)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReads, readDrafts } from '../js/readdoc.js';
import { applyFlight, fsegId, flightWho } from '../js/bookings.js';
import { cleanShared, SHARED_KEYS, MAP_KEYS } from '../js/sharecore.js';

const S = { city:'hksz', adults:2, kids:[10], start:'2026-12-20', end:'2026-12-26', flight:{ ap:'HKG', arr:'', dep:'', ap2:'', way:'' }, fsegs:{} };
const seg = (fno, date, from, to, t1, t2, name, ticket) => ({ fno, date, from, to, time:t1, time2:t2, code:'ABC' + fno.slice(-3), passengers:[{ name, ticket }], amount:550000, currency:'KRW' });
const one = (who, ticket) => ({ kind:'flight', items:[seg('CX411', '2026-12-20', 'ICN', 'HKG', '09:05', '11:55', who, ticket), seg('CX438', '2026-12-26', 'HKG', 'ICN', '18:40', '23:10', who, ticket)] });

test('사람마다 따로 받은 e-티켓 3장 → 편마다 한 예약, 사람별 번호·파일 주인, 금액은 더함', () => {
  const m = mergeReads([{ j:one('HONG/GILDONG MR', '160-1'), k:0 }, { j:one('KIM/YOUNGHEE MS', '160-2'), k:1 }, { j:one('HONG/MINJUN MSTR', '160-3'), k:2 }]);
  assert.equal(m.items.length, 2);
  const d = readDrafts(S, m);
  assert.deepEqual(d.map(x => [x.fno, x.dir, x.from, x.to]), [['CX411', 'out', 'ICN', 'HKG'], ['CX438', 'back', 'HKG', 'ICN']]);
  assert.deepEqual(d[0].pcode, { a1:'160-1', a2:'160-2', k1:'160-3' });
  assert.deepEqual(d[0].rwho, { 0:'a1', 1:'a2', 2:'k1' });
  assert.deepEqual(d[0].rf, [0, 1, 2]);
  assert.equal(d[0].amt, 1650000);
  assert.equal(d[0].paxShort, undefined);
  assert.doesNotMatch(d[0].memo, /다른 예약번호/);   // 같은 예약번호면 메모에 안 붙임
  // 친구가 따로 예약해 예약번호가 다르면 첫 번호는 칸에, 나머지는 메모에
  const b = one('KIM/YOUNGHEE MS', '160-2'); b.items.forEach(x => { x.code = 'ZZZ999'; });
  const d2 = readDrafts(S, mergeReads([{ j:one('HONG/GILDONG MR', '160-1'), k:0 }, { j:b, k:1 }]));
  assert.equal(d2[0].code, 'ABC411');
  assert.match(d2[0].memo, /다른 예약번호: ZZZ999/);
});

test('한 사람 표만 넣으면 일행 중 빠진 사람 수를 알려 줌, 같은 표를 두 번 넣어도 한 번만', () => {
  const m = mergeReads([{ j:one('KIM/YOUNGHEE MS', '160-2'), k:0 }, { j:one('KIM/YOUNGHEE MS', '160-2'), k:1 }]);
  const d = readDrafts(S, m);
  assert.equal(Object.keys(d[0].pcode).length, 1);
  assert.equal(d[0].paxShort, 2);
});

test('누가 어느 편: 가족 표는 모두, 따로 예약한 친구는 그 사람만 더함, 시간은 다수 편 기준', () => {
  const fam = { kind:'flight', date:'2026-12-20', time:'09:05', time2:'11:55', fno:'CX411', dir:'out', ap:'HKG', from:'ICN', to:'HKG', pcode:{ a1:'1', a2:'2' } };
  const r = applyFlight(S, fam);
  const id = fsegId('2026-12-20', 'CX411');
  assert.deepEqual(r.patch.fsegs[id], { dir:'out', fno:'CX411', date:'2026-12-20', from:'ICN', to:'HKG', dep:'09:05', arr:'11:55', who:['a1', 'a2'] });
  assert.equal(r.patch.flight.arr, '11:55');
  const s2 = Object.assign({}, S, r.patch);
  // 아이는 다른 편(혼자 늦게) → 편은 따로 생기지만 첫날 시간은 2명이 타는 CX411 그대로
  const kid = { kind:'flight', date:'2026-12-20', time:'13:00', time2:'15:50', fno:'KE603', dir:'out', ap:'HKG', pcode:{ k1:'3' } };
  const r2 = applyFlight(s2, kid);
  assert.deepEqual(r2.patch.fsegs[fsegId('2026-12-20', 'KE603')].who, ['k1']);
  assert.equal(r2.patch.flight, undefined);
  assert.match(r2.msgs.join(' '), /CX411 기준 그대로/);
  // 같은 편을 다른 사람이 자기 폰에서 넣음 → 사람만 더함
  const r3 = applyFlight(s2, { kind:'flight', date:'2026-12-20', time:'09:05', time2:'11:55', fno:'CX 411', dir:'out', ap:'HKG', pcode:{ k1:'3' } });
  assert.deepEqual(r3.patch.fsegs[id].who, ['a1', 'a2', 'k1']);
  // 인원별 번호가 없는 항공권 = 일행 모두
  assert.deepEqual(flightWho(S, { kind:'flight' }), ['a1', 'a2', 'k1']);
});

test('편 정보는 함께 짜기로 칸마다 공유, 이상한 값은 바로잡음(예약번호 같은 건 없음)', () => {
  assert.ok(SHARED_KEYS.includes('fsegs') && MAP_KEYS.includes('fsegs'));
  const s = { fsegs:{ f1:{ dir:'x', fno:'CX411', date:'bad', who:['a1', 3], code:'SECRET' }, 'bad id!':{ fno:'X' }, f2:'no' } };
  cleanShared(s);
  assert.deepEqual(s.fsegs, { f1:{ dir:'out', fno:'CX411', date:'', from:'', to:'', dep:'', arr:'', who:['a1'] } });
});
