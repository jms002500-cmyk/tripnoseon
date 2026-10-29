// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { parseLine, defaultDay, dayLabel, ledgerSummary, settle, categorize, money, partyOf, personUsed, previewText, tripDates, newPersonId, newSpendId, atPlace } from '../js/ledger.js';
import { SHARED_KEYS, MAP_KEYS, diffShared, sharedOf, describeChange } from '../js/sharecore.js';

// 지어낸 여행: 2027-03-07 ~ 03-11, 엄마·아빠·민지
const trip = (extra) => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11',
  party:[{ id:'p1', name:'엄마' }, { id:'p2', name:'아빠' }, { id:'p3', name:'민지' }] }, extra);
const ON = { today:'2027-03-09', cur:'JPY', by:'p1' };    // 여행 3일차에 적는 경우
const BEFORE = { today:'2026-11-20', cur:'JPY', by:'p1' }; // 여행 전에 적는 경우
const P = (text, s, ctx) => parseLine(text, s || trip(), ctx || ON);

test('한 줄: 금액·통화·내용·분류', () => {
  const r = P('라멘 1200엔');
  assert.ok(r.ok);
  assert.deepEqual(r.e, { d:'2027-03-09', amt:1200, cur:'JPY', what:'라멘', cat:'food', pay:'', by:'p1', split:null });
  assert.equal(P('라멘 1,200').e.amt, 1200);
  assert.equal(P('¥980 편의점').e.cur, 'JPY');
  assert.equal(P('편의점 980').e.cur, 'JPY');                 // 통화를 안 쓰면 여행지 통화(엔)
  assert.equal(P('유심 25000원').e.cur, 'KRW');
  assert.equal(P('유심 2만5천원').e.amt, 25000);
  const f = P('항공권 45만');                                  // '만'으로 쓴 금액은 원화
  assert.equal(f.e.amt, 450000); assert.equal(f.e.cur, 'KRW'); assert.equal(f.e.cat, 'flight');
  assert.equal(P('기념품 3천엔').e.amt, 3000);
  assert.equal(P('기념품 1.5만엔').e.amt, 15000);
});

test('한 줄: 날짜 (어제, n일차, 3/8, 여행 전)', () => {
  assert.equal(P('어제 택시 2800엔').e.d, '2027-03-08');
  assert.equal(P('2일차 우동 900').e.d, '2027-03-08');
  assert.equal(P('2일차 우동 900').e.amt, 900);                // '2일차'의 2는 금액이 아님
  assert.equal(P('3/10 디즈니 팝콘 600엔').e.d, '2027-03-10');
  assert.equal(P('3월 11일 공항 리무진 3600').e.d, '2027-03-11');
  assert.equal(P('여행 전 유심 25000원').e.d, 'before');
  assert.equal(P('12:30 점심 1500엔').e.amt, 1500);             // 시각은 금액이 아님
  assert.equal(P('12:30 점심 1500엔').e.what, '점심');
});

test('기본 날짜: 여행 중이면 오늘, 여행 전이면 1일차(항공·숙소·입장권은 여행 전), 여행 뒤면 마지막 날', () => {
  const s = trip();
  assert.equal(defaultDay(s, '2027-03-09', 'food'), '2027-03-09');
  assert.equal(defaultDay(s, '2026-11-20', 'food'), '2027-03-07');
  assert.equal(defaultDay(s, '2026-11-20', 'ticket'), 'before');
  assert.equal(defaultDay(s, '2027-04-01', 'food'), '2027-03-11');
  assert.equal(P('라멘 1200엔', s, BEFORE).e.d, '2027-03-07');
  assert.equal(P('디즈니 입장권 4장 39600엔', s, BEFORE).e.d, 'before');
  assert.equal(defaultDay(Object.assign(clone(DEFAULT)), '2026-11-20', 'food'), '2026-11-20');   // 날짜를 아직 안 정한 여행
  assert.equal(dayLabel(s, '2027-03-07'), '3/7 (일) · 1일차');
  assert.equal(dayLabel(s, 'before'), '여행 전');
  assert.equal(tripDates(s).length, 5);
});

test('한 줄: 낸 사람·결제·나누기·개수', () => {
  const a = P('아빠가 디즈니 입장권 4장 39600엔 카드');
  assert.equal(a.e.by, 'p2'); assert.equal(a.e.pay, 'card'); assert.equal(a.e.amt, 39600); assert.equal(a.e.cat, 'ticket');
  assert.equal(a.e.what, '디즈니 입장권 4장');
  assert.equal(P('민지 크레페 따로 600엔').e.split.join(), 'p3');
  assert.equal(P('스이카 충전 3000엔').e.pay, 'ic');
  assert.equal(P('스이카 충전 3000엔').e.cat, 'move');
  assert.equal(P('택시 2800 현금').e.pay, 'cash');
  assert.equal(P('라멘 3그릇 980엔씩').e.amt, 2940);
  assert.equal(P('라멘 980엔 x3').e.amt, 2940);
  assert.equal(P('1200 시부야 커피').e.amt, 1200);              // '시부야'의 '시'는 개수가 아님
  // '나'라는 이름이 '나카미세'에 걸리지 않음
  const s = trip({ party:[{ id:'me', name:'나' }, { id:'p2', name:'아빠' }] });
  assert.equal(P('나카미세 간식 500엔', s, { today:'2027-03-09', by:'p2' }).e.by, 'p2');
  assert.equal(P('나 커피 450엔', s, { today:'2027-03-09', by:'p2' }).e.by, 'me');
});

test('한 줄: 금액이 없으면 알려 줌', () => {
  assert.equal(P('라멘').ok, false);
  assert.match(P('라멘').error, /금액/);
  assert.equal(P('   ').ok, false);
  assert.equal(P('라멘 2개').ok, false);                        // 개수만 있음
});

test('분류', () => {
  assert.equal(categorize('디즈니 팝콘'), 'food');
  assert.equal(categorize('디즈니 입장권'), 'ticket');
  assert.equal(categorize('국립과학박물관'), 'ticket');
  assert.equal(categorize('돈키호테'), 'shop');
  assert.equal(categorize('뭔가'), 'etc');
});

test('합계: 원화로 바꿔 합치고, 날짜별·분류별', () => {
  const s = trip({ fx:{ rate:9 }, spend:{
    a:{ d:'before', amt:450000, cur:'KRW', what:'항공권', cat:'flight', by:'p1', split:null, at:1 },
    b:{ d:'2027-03-07', amt:3000, cur:'JPY', what:'라멘', cat:'food', by:'p2', split:null, at:2 },
    c:{ d:'2027-03-08', amt:600, cur:'JPY', what:'크레페', cat:'food', by:'p3', split:['p3'], at:3 }
  } });
  const L = ledgerSummary(s);
  assert.equal(L.base, 'KRW'); assert.equal(L.count, 3);
  assert.equal(L.total, 450000 + 27000 + 5400);
  assert.deepEqual(L.groups.map(g => g.d), ['before', '2027-03-07', '2027-03-08']);
  assert.equal(L.byCat[0].key, 'flight');
  assert.deepEqual(L.byCur, { JPY:3600, KRW:450000 });
  // 정산 환율을 직접 넣으면 그 값으로
  assert.equal(ledgerSummary(Object.assign(s, { lrate:10 })).total, 450000 + 30000 + 6000);
});

test('합계: 환율이 없으면 엔화만일 때 엔화로, 섞이면 못 바꾼 것을 셈', () => {
  const only = trip({ fx:null, spend:{ b:{ d:'2027-03-07', amt:3000, cur:'JPY', cat:'food', by:'p1' } } });
  assert.equal(ledgerSummary(only).base, 'JPY'); assert.equal(ledgerSummary(only).total, 3000);
  const mixed = trip({ fx:null, spend:{ a:{ d:'before', amt:450000, cur:'KRW', cat:'flight', by:'p1' }, b:{ d:'2027-03-07', amt:3000, cur:'JPY', cat:'food', by:'p1' } } });
  const L = ledgerSummary(mixed);
  assert.equal(L.base, 'KRW'); assert.equal(L.total, 450000); assert.equal(L.missing, 1);
});

test('정산: 낸 돈 - 쓸 몫 → 누가 누구에게', () => {
  // 엄마 90,000(셋이 나눔) · 아빠 30,000(셋이 나눔) · 민지 6,000(혼자) → 몫 40,000씩 + 민지 6,000
  const s = trip({ fx:{ rate:10 }, spend:{
    a:{ d:'2027-03-07', amt:9000, cur:'JPY', cat:'food', by:'p1', split:null },
    b:{ d:'2027-03-07', amt:3000, cur:'JPY', cat:'food', by:'p2', split:null },
    c:{ d:'2027-03-08', amt:600, cur:'JPY', cat:'shop', by:'p3', split:['p3'] }
  } });
  const L = ledgerSummary(s);
  assert.deepEqual(L.people.map(p => Math.round(p.bal)), [50000, -10000, -40000]);
  assert.deepEqual(L.transfers, [{ from:'p3', to:'p1', amt:40000 }, { from:'p2', to:'p1', amt:10000 }]);
  assert.deepEqual(settle([{ id:'a', v:0.3 }, { id:'b', v:-0.3 }]), []);
  // 셋이 나누면 소수점이 생겨도 보내는 돈의 합 = 받는 돈
  const t = settle([{ id:'a', v:226232 }, { id:'b', v:-120565.33 }, { id:'c', v:-105666.67 }]);
  assert.equal(t.reduce((n, x) => n + x.amt, 0), 226232);
  assert.ok(personUsed(s, 'p3')); assert.ok(!personUsed(trip(), 'p3'));
});

test('새 번호는 같은 순간에 만들어도 겹치지 않음', () => {
  const ids = new Set(Array.from({ length:50 }, () => newPersonId()).concat(Array.from({ length:50 }, () => newSpendId())));
  assert.equal(ids.size, 100);
});

test('나누는 사람이 없으면 "나" 한 명', () => {
  assert.deepEqual(partyOf(clone(DEFAULT)), [{ id:'me', name:'나' }]);
  assert.equal(P('라멘 1200엔', clone(DEFAULT), { today:'2027-03-09' }).e.by, 'me');
});

test('보여 주기', () => {
  assert.equal(money(1200, 'JPY'), '¥1,200');
  assert.equal(money(10075.4, 'KRW'), '10,075원');
  assert.equal(previewText(trip(), P('아빠가 라멘 1200엔 카드').e), '식비 · 라멘 · ¥1,200 · 3/9 (화) · 3일차 · 아빠 냄 · 카드');
});

test('함께 짜기: 가계부는 공유하고, 지출은 한 건씩 따로 보냄', () => {
  assert.ok(['spend', 'party', 'lrate'].every(k => SHARED_KEYS.includes(k)));
  assert.ok(MAP_KEYS.includes('spend'));
  assert.ok(!SHARED_KEYS.includes('lby'));                    // 마지막 낸 사람은 기기마다
  const a = trip({ spend:{ x1:{ d:'2027-03-07', amt:1200, cur:'JPY', what:'라멘', cat:'food', by:'p1' } } });
  const b = clone(a); b.spend.x2 = { d:'2027-03-07', amt:600, cur:'JPY', what:'크레페', cat:'food', by:'p3' };
  const d = diffShared(sharedOf(a), sharedOf(b));
  assert.deepEqual(d.map(x => x[0]), ['p.spend.x2']);
  assert.equal(describeChange(sharedOf(a), sharedOf(b)), '지출 적음: 크레페 ¥600');
  const c = clone(b); delete c.spend.x1; delete c.spend.x2;
  assert.equal(describeChange(sharedOf(b), sharedOf(c)), '지출 2건 지움');
});

test('장소에서 바로 적은 지출', () => {
  const s = trip();
  const p = { id:'sensoji', name:'센소지', kind:'신사·절' };
  const a = atPlace(parseLine('1200엔', s, { today:'2027-03-08' }).e, p);
  assert.equal(a.pl, 'sensoji'); assert.equal(a.what, '센소지'); assert.equal(a.cat, 'etc');
  const b = atPlace(parseLine('오마모리 800엔', s, { today:'2027-03-08' }).e, p);
  assert.equal(b.what, '오마모리'); assert.equal(b.pl, 'sensoji');
  const c = atPlace(parseLine('3000엔', s, { today:'2027-03-08' }).e, { id:'tl', name:'팀랩 플래닛', kind:'체험·캐릭터' });
  assert.equal(c.cat, 'ticket'); assert.equal(c.what, '팀랩 플래닛');
  const d = atPlace(parseLine('라멘 1200엔', s, { today:'2027-03-08' }).e, { id:'x', name:'시부야', kind:'거리·시장' });
  assert.equal(d.cat, 'food'); assert.equal(d.what, '라멘');
  assert.equal(atPlace(null, p), null);
});
