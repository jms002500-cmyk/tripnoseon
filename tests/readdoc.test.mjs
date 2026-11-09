// 확인서 읽어서 보관함 칸 채우기 (js/readdoc.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readParse, readDrafts, readPrompt, readAppPrompt, READ_SCHEMA } from '../js/readdoc.js';

const S = { city:'hksz', adults:2, kids:[10] };
const ETICKET = { kind:'flight', items:[
  { title:'캐세이퍼시픽', date:'2026-12-20', time:'09:05', time2:'11:55', fno:'cx 411', from:'ICN', to:'HKG', code:'ABC123', amount:1650000, currency:'KRW',
    passengers:[{ name:'HONG/GILDONG MR', ticket:'160-1111111111', seat:'32A' }, { name:'KIM/SOYEON MS', ticket:'160-2222222222' }, { name:'HONG/MINJUN MSTR', ticket:'160-3333333333' }] },
  { title:'캐세이퍼시픽', date:'2026-12-26', time:'1:40', time2:'06:20', fno:'CX438', from:'HKG', to:'ICN', code:'ABC123' }], unclear:'' };

test('항공권 e-티켓: 가는 편·오는 편 두 칸, 공항·편명·시각·예약번호·탑승객 → 인원별 번호', () => {
  const [a, b] = readDrafts(S, ETICKET);
  assert.deepEqual([a.kind, a.dir, a.ap, a.date, a.time, a.time2, a.fno, a.code], ['flight', 'out', 'HKG', '2026-12-20', '09:05', '11:55', 'CX411', 'ABC123']);
  assert.equal(a.title, '가는 편 ICN → HKG · 캐세이퍼시픽');
  assert.deepEqual([a.amt, a.cur], [1650000, 'KRW']);
  assert.deepEqual(a.pcode, { a1:'160-1111111111', a2:'160-2222222222', k1:'160-3333333333' });   // 확인서 순서대로
  assert.match(a.memo, /탑승객: HONG\/GILDONG MR 좌석 32A, KIM\/SOYEON MS, HONG\/MINJUN MSTR/);
  assert.deepEqual([b.dir, b.ap, b.time, b.title], ['back', 'HKG', '01:40', '오는 편 HKG → ICN · 캐세이퍼시픽']);   // 시각은 두 자리로
});

test('숙소·입장권, 이상한 값·모르는 통화', () => {
  const [h] = readDrafts(S, { kind:'hotel', items:[{ title:'하버 그랜드 구룡', date:'2026-12-20', date2:'2026-12-23', time:'15:00', time2:'12:00', addr:'香港紅磡德豐街20號', tel:'+852 2621 3188', amount:5400, currency:'HKD' }] });
  assert.deepEqual([h.kind, h.title, h.date, h.date2, h.time, h.time2, h.addr, h.tel, h.amt, h.cur], ['hotel', '하버 그랜드 구룡', '2026-12-20', '2026-12-23', '15:00', '12:00', '香港紅磡德豐街20號', '+852 2621 3188', 5400, 'HKD']);
  const [t] = readDrafts(S, { kind:'ticket', items:[{ title:'디즈니 1일권', date:'12/21', time:'25:00', amount:300, currency:'USD', from:'<b>' }], unclear:'입장 날짜가 흐려요' });
  assert.deepEqual([t.date, t.time, t.amt], ['', '', undefined]);
  assert.equal(t.memo, '결제 300 USD · 확인 필요: 입장 날짜가 흐려요');
  assert.equal(readDrafts(S, { kind:'모름', items:[{}] })[0].kind, 'etc');
  assert.equal(readDrafts(S, { kind:'flight', items:[{ from:'NRT', to:'ICN' }] })[0].dir, '');   // 이 여행지 공항이 아니면 방향은 사용자에게
  assert.deepEqual(readDrafts(S, null), []);
});

test('답 읽기: 코드 블록·앞뒤 설명이 붙어도', () => {
  const t = '네, 정리했어요.\n```json\n' + JSON.stringify(ETICKET) + '\n```\n확인해 보세요.';
  assert.equal(readParse(t).items.length, 2);
  assert.equal(readParse('답이 없어요'), null);
  assert.equal(readParse('{"kind":"flight","items":[]}'), null);
  assert.equal(readParse('{깨진'), null);
});

test('부탁 문장·답 모양', () => {
  assert.match(readPrompt(S), /IATA/); assert.match(readAppPrompt(S), /JSON 한 덩어리/);
  assert.deepEqual(READ_SCHEMA.required, ['kind', 'items']);
});
