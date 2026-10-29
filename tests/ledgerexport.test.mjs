// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { CSV_HEAD, csvLine, ledgerRows, ledgerCsv, ledgerCsvName } from '../js/ledgerexport.js';
import { parseCsv } from '../js/ledgerimport.js';

// 지어낸 여행: 2027-03-07 ~ 03-09, 엄마·아빠·민지
const trip = (extra) => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-09', lrate:9.5,
  party:[{ id:'p1', name:'엄마' }, { id:'p2', name:'아빠' }, { id:'p3', name:'민지' }] }, extra);
const spend = {
  b:{ d:'2027-03-08', amt:1200, cur:'JPY', what:'라멘', cat:'food', pay:'card', by:'p2', split:null, at:3 },
  a:{ d:'before', amt:450000, cur:'KRW', what:'항공권', cat:'flight', pay:'', by:'p1', split:null, at:1 },
  c:{ d:'2027-03-07', amt:2800, cur:'JPY', what:'택시, 공항에서', cat:'move', pay:'cash', by:'p1', split:['p1', 'p3'], at:2 },
  d:{ d:'2027-03-08', amt:500, cur:'JPY', what:'기념품', cat:'shop', pay:'', by:'p3', split:['p3'], at:4 },
  e:{ d:'after', amt:30000, cur:'KRW', what:'=사진 인화', cat:'etc', pay:'', by:'p2', split:null, at:5 }
};

test('머리줄·지출 줄·마지막 합계 줄, 화면과 같은 순서', () => {
  const rows = ledgerRows(trip({ spend }));
  assert.deepEqual(rows[0], CSV_HEAD);
  assert.deepEqual(rows[0], ['날짜', '일차', '분류', '내용', '금액', '통화', '원화 환산', '낸 사람', '누구 몫', '결제']);
  assert.deepEqual(rows.slice(1, -1).map(r => r[3]), ['항공권', '택시, 공항에서', '라멘', '기념품', '=사진 인화']);
  assert.deepEqual(rows[1], ['여행 전', '', '항공', '항공권', 450000, '원', 450000, '엄마', '모두', '']);
  assert.deepEqual(rows[2], ['2027-03-07', '1일차', '교통', '택시, 공항에서', 2800, '엔', 26600, '엄마', '엄마·민지', '현금']);
  assert.deepEqual(rows[3], ['2027-03-08', '2일차', '식비', '라멘', 1200, '엔', 11400, '아빠', '모두', '카드']);
  assert.deepEqual(rows[4].slice(7), ['민지', '혼자 부담', '']);
  assert.equal(rows[5][0], '여행 후');
  const sum = rows[rows.length - 1];
  assert.equal(sum[0], '합계');
  assert.equal(sum[3], '5건 · 환율 1엔 = 9.50원');
  assert.equal(sum[4], '');                     // 엔·원이 섞이면 금액 칸 합계는 비움
  assert.equal(sum[6], 450000 + 26600 + 11400 + 4750 + 30000);
});

test('통화가 하나뿐이면 금액 칸에도 합계, 환율이 없으면 엔화는 원화 칸이 빔', () => {
  const only = { b:spend.b, c:spend.c };
  const rows = ledgerRows(trip({ spend:only, lrate:0, fx:null }));
  assert.deepEqual(rows[1].slice(4, 7), [2800, '엔', '']);
  const sum = rows[rows.length - 1];
  assert.deepEqual(sum.slice(4, 7), [4000, '엔', '']);
  assert.equal(sum[3], '2건 · 환율이 없어 외국 돈 2건은 원화 합계에서 빠짐');
});

test('한 사람이면 누구 몫 칸은 비움, 지출이 없어도 머리줄과 합계', () => {
  const s = trip({ party:[], spend:{ x:{ d:'2027-03-07', amt:980, cur:'JPY', what:'', cat:'food', pay:'', by:'me', split:null, at:1 } } });
  const rows = ledgerRows(s);
  assert.deepEqual(rows[1], ['2027-03-07', '1일차', '식비', '식비', 980, '엔', 9310, '나', '', '']);
  const empty = ledgerRows(trip());
  assert.equal(empty.length, 2);
  assert.deepEqual(empty[1], ['합계', '', '', '0건', '', '', 0, '', '', '']);
});

test('CSV: UTF-8 BOM, CRLF, 쉼표·따옴표 감싸기, 수식 막기', () => {
  assert.equal(csvLine(['a,b', 'say "hi"', 12, '줄\n바꿈']), '"a,b","say ""hi""",12,"줄\n바꿈"');
  assert.equal(csvLine(['=1+1', '+82', '-', '@x', '2027-03-07']), "'=1+1,'+82,'-,'@x,2027-03-07");
  const csv = ledgerCsv(trip({ spend }));
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.endsWith('\r\n'));
  assert.equal(csv.split('\r\n')[0], '﻿날짜,일차,분류,내용,금액,통화,원화 환산,낸 사람,누구 몫,결제');
  assert.ok(csv.includes("'=사진 인화"));
  // 다시 읽으면 같은 표 (가져오기용 CSV 읽기로 확인)
  const back = parseCsv(csv);
  assert.equal(back[0][0], '날짜');
  assert.equal(back[2][3], '택시, 공항에서');
  assert.equal(back.filter(r => r.some(Boolean)).length, 7);
});

test('예산 없는 옛 데이터·지출 칸이 없는 상태도 내보내짐', () => {
  const s = trip({ spend }); delete s.budget;
  assert.equal(ledgerRows(s).length, 7);
  const t = trip(); delete t.spend;
  assert.equal(ledgerRows(t).length, 2);
});

test('파일 이름', () => {
  assert.equal(ledgerCsvName(new Date(2027, 2, 11, 9, 5)), 'tripnoseon-ledger-20270311.csv');
});
