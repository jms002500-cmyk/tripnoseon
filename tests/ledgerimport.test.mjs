// 실행: npm test
// 트리플 가계부 CSV는 2026-10-27 실제로 내보낸 파일과 같은 모양. 이름·금액은 지어낸 값
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { parseCsv, readTripleCsv, planTripleImport, applyTripleImport } from '../js/ledgerimport.js';
import { ledgerSummary } from '../js/ledger.js';

const HEAD = '﻿일차,항목명,카테고리,금액,통화,통화 당 원화,원화 환산,장소,나만보기 비용,결제한 사람,결제한 사람 수,나눠 낼 사람,나눠 낼 사람 수';
const CSV = [HEAD,
  '"여행준비","항공권","항공","450,000","KRW","1","450,000","","X","여행하는곰","1","여행하는곰, 엄마","2"',
  '"1 일차","라멘","식비","1,200","JPY","8.4225","10,107","이치란 신주쿠","X","여행하는곰","1","여행하는곰, 엄마","2"',
  '"2 일차","디즈니 입장권","관광","19,800","JPY","8.4225","166,766","","X","여행하는곰, 엄마","2","여행하는곰, 엄마","2"',
  '"2 일차","기념품 ""토토로""","쇼핑","3,000","JPY","8.4225","25,268","","O","엄마","1","엄마","1"',
  '"3 일차","공항 리무진","교통","12","USD","1,400","16,800","","X","엄마","1","여행하는곰, 엄마","2"',
  '"9 일차","택시","교통","2,000","JPY","8.4225","16,845","","X","엄마","1","여행하는곰, 엄마","2"',
  '', '', '▼ 통화별 금액', '"JPY","26,000"', '"KRW","450,000"', '"USD","12"', '', '▼ 총금액', '"KRW","685,786"'
].join('\n');
const trip = extra => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11' }, extra);
let n = 0; const ids = p => `${p}${++n}`;

test('CSV 읽기: 큰따옴표 안 쉼표, "" 이스케이프, BOM, CRLF', () => {
  assert.deepEqual(parseCsv('﻿a,"b,c","d""e"\r\n1,2,3'), [['a', 'b,c', 'd"e'], ['1', '2', '3']]);
  assert.deepEqual(parseCsv('x\n"멀티\n줄",y'), [['x'], ['멀티\n줄', 'y']]);
});

test('트리플 CSV: 지출 줄만 읽고 아래 요약은 건너뜀', () => {
  const r = readTripleCsv(CSV);
  assert.ok(r.ok); assert.equal(r.rows.length, 6);
  const ramen = r.rows[1];
  assert.equal(ramen.day, 1); assert.equal(ramen.amt, 1200); assert.equal(ramen.cur, 'JPY'); assert.equal(ramen.cat, 'food');
  assert.deepEqual(ramen.sharers, ['여행하는곰', '엄마']);
  assert.equal(r.rows[0].day, 'before');
  assert.equal(r.rows[3].what, '기념품 "토토로"'); assert.equal(r.rows[3].private, true);
  assert.equal(readTripleCsv('이름,금액\n라멘,1200').ok, false);
  assert.equal(readTripleCsv(HEAD + '\n\n▼ 총금액').ok, false);
});

test('계획: 일차 → 여행 날짜, 여행보다 긴 일차는 여행 후, 다른 통화는 원화 환산', () => {
  const p = planTripleImport(CSV, trip());
  assert.ok(p.ok);
  assert.deepEqual(p.items.map(e => e.d), ['before', '2027-03-07', '2027-03-08', '2027-03-08', '2027-03-09', 'after']);
  assert.equal(p.late, 1); assert.equal(p.other, 1);
  const usd = p.items[4]; assert.equal(usd.cur, 'KRW'); assert.equal(usd.amt, 16800); assert.match(usd.what, /USD 12/);
  assert.deepEqual(p.people, ['여행하는곰', '엄마']);
  assert.deepEqual(p.sum, { JPY:26000, KRW:466800 });
  // 날짜를 안 정한 여행은 가져오지 않고 알려 줌
  const none = planTripleImport(CSV, clone(DEFAULT));
  assert.equal(none.ok, false); assert.match(none.error, /여행 날짜/);
});

test('넣기: 사람 만들기, 결제한 사람이 둘이면 반씩, 나만보기는 혼자 부담', () => {
  n = 0;
  const s = trip();
  const p = planTripleImport(CSV, s);
  const out = applyTripleImport(s, p, ids, 1000);
  assert.deepEqual(out.party.map(x => x.name), ['여행하는곰', '엄마']);   // 기본 '나'는 쓰인 데가 없어 빠짐
  const list = Object.values(out.spend);
  assert.equal(list.length, 7);                                          // 디즈니가 두 사람 몫으로 나뉨
  const disney = list.filter(e => e.what === '디즈니 입장권');
  assert.deepEqual(disney.map(e => e.amt), [9900, 9900]);
  assert.notEqual(disney[0].by, disney[1].by);
  const gift = list.find(e => /토토로/.test(e.what));
  assert.deepEqual(gift.split, [gift.by]);
  assert.equal(list.find(e => e.what === '라멘').split, null);           // 둘 다 나눔 = 모두
  assert.ok(list.every(e => e.src === 'triple' && e.ik));
  // 합계가 파일과 같음 (엔 26,000 + 원 466,800)
  const L = ledgerSummary(Object.assign(s, { party:out.party, spend:out.spend, fx:{ rate:10 } }));
  assert.equal(L.total, 26000 * 10 + 466800);
});

test('같은 파일을 다시 가져오면 겹치는 건 건너뜀, 기존 사람 이름은 그대로 맞춤', () => {
  n = 100;
  const s = trip({ party:[{ id:'pA', name:'엄마' }, { id:'pB', name:'민지' }] });
  const first = applyTripleImport(s, planTripleImport(CSV, s), ids, 1);
  assert.deepEqual(first.party.map(x => x.name), ['엄마', '민지', '여행하는곰']);
  assert.equal(Object.values(first.spend).find(e => e.what === '라멘').split.length, 2);   // 민지는 빠진 둘만
  Object.assign(s, { party:first.party, spend:first.spend });
  const again = planTripleImport(CSV, s);
  assert.equal(again.items.length, 0); assert.equal(again.dup, 6);
});
