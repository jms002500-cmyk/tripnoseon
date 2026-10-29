// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { budgetOf, parseWon, manwon, budgetView, budgetLines, catLine, setBudget } from '../js/budget.js';
import { SHARED_KEYS, MAP_KEYS, diffShared, sharedOf, describeChange, applyRemote } from '../js/sharecore.js';
import { stateForBackup } from '../js/backup.js';

// 지어낸 여행: 2027-03-07 ~ 03-11 (5일), 환율 1엔 = 9원
const trip = (extra) => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11', lrate:9,
  party:[{ id:'p1', name:'엄마' }, { id:'p2', name:'아빠' }] }, extra);
const sp = (d, amt, cur, cat) => ({ d, amt, cur, what:'테스트', cat, pay:'', by:'p1', split:null, at:1 });

test('예산 칸 읽기: 쉼표·만·천', () => {
  assert.equal(parseWon('2,000,000'), 2000000);
  assert.equal(parseWon('200만'), 2000000);
  assert.equal(parseWon('200만원'), 2000000);
  assert.equal(parseWon('150만 원'), 1500000);
  assert.equal(parseWon('1만5천'), 15000);
  assert.equal(parseWon('1.5만'), 15000);
  assert.equal(parseWon('300000원'), 300000);
  assert.equal(parseWon(''), 0);
  assert.equal(parseWon('많이'), 0);
  assert.equal(parseWon('-5000'), 0);
  assert.equal(parseWon(null), 0);
});

test('짧은 원화 표시', () => {
  assert.equal(manwon(2000000), '200만원');
  assert.equal(manwon(125000), '12.5만원');
  assert.equal(manwon(8500), '8,500원');
  assert.equal(manwon(0), '0원');
  assert.equal(catLine({ spent:125000, budget:300000 }), '12.5만 / 30만원');
});

test('옛 데이터(예산 없음)도 그대로 열림', () => {
  const s = trip(); delete s.budget;
  assert.deepEqual(budgetOf(s), { total:0, cats:{} });
  assert.deepEqual(budgetView(s, '2027-03-09'), { on:false });
  assert.deepEqual(budgetLines(budgetView(s, '2027-03-09')), { head:'', day:'' });
  assert.deepEqual(budgetOf({ budget:{ total:'abc', cats:{ food:-3, nope:5000, shop:'20000' } } }), { total:0, cats:{ shop:20000 } });
  assert.deepEqual(DEFAULT.budget, { total:0, cats:{} });
});

test('쓴 돈·남은 돈: 엔은 정산 환율로 원화로', () => {
  const s = trip({ budget:{ total:1000000, cats:{} }, spend:{
    a:sp('before', 300000, 'KRW', 'flight'),   // 항공 30만원
    b:sp('2027-03-07', 10000, 'JPY', 'food')   // 1만엔 = 9만원
  } });
  const v = budgetView(s, '2026-12-01');
  assert.equal(v.on, true);
  assert.equal(v.spent, 390000);
  assert.equal(v.left, 610000);
  assert.equal(v.pct, 39);
  assert.equal(v.level, 'ok');
  assert.equal(v.phase, 'before');
  assert.equal(v.daysLeft, 5);
  assert.equal(v.perDay, 122000);
  assert.equal(v.todayLeft, null);
  assert.equal(budgetLines(v).head, '61만원 남았어요.');
  assert.equal(budgetLines(v).day, '여행 5일 동안 하루에 12.2만원씩 쓸 수 있어요.');
});

test('정산 환율이 없으면 받아 온 환율, 둘 다 없으면 엔화 지출은 빠짐', () => {
  const base = { budget:{ total:100000, cats:{} }, spend:{ a:sp('2027-03-07', 1000, 'JPY', 'food'), b:sp('2027-03-07', 5000, 'KRW', 'food') } };
  assert.equal(budgetView(trip(Object.assign({ lrate:0, fx:{ rate:9.5 } }, base)), '2027-03-07').spent, 14500);
  const none = budgetView(trip(Object.assign({ lrate:0, fx:null }, base)), '2027-03-07');
  assert.equal(none.spent, 5000);
  assert.equal(none.missing, 1);
});

test('여행 중: 하루에 쓸 수 있는 돈은 오늘 쓴 돈과 상관없이 같고, 오늘 남은 돈이 줄어듦', () => {
  const s = trip({ budget:{ total:500000, cats:{} }, spend:{
    a:sp('2027-03-07', 10000, 'JPY', 'food'),     // 지난날 9만원
    b:sp('2027-03-11', 10000, 'JPY', 'ticket')    // 미리 산 마지막 날 입장권 9만원도 쓴 돈
  } });
  const v1 = budgetView(s, '2027-03-09');      // 3일차: 오늘 포함 3일 남음
  assert.equal(v1.phase, 'during');
  assert.equal(v1.daysLeft, 3);
  assert.equal(v1.perDay, Math.floor(320000 / 3));
  assert.equal(v1.todayLeft, v1.perDay);
  s.spend.c = sp('2027-03-09', 5000, 'JPY', 'food');  // 오늘 4.5만원
  const v2 = budgetView(s, '2027-03-09');
  assert.equal(v2.perDay, v1.perDay);
  assert.equal(v2.todaySpent, 45000);
  assert.equal(v2.todayLeft, v1.perDay - 45000);
  assert.match(budgetLines(v2).day, /^오늘 포함 3일 남았어요\. 하루에 .+씩 쓸 수 있고, 오늘은 .+ 남았어요\.$/);
  s.spend.d = sp('2027-03-09', 10000, 'JPY', 'shop');  // 오늘 9만원 더 → 하루 몫을 넘음
  assert.match(budgetLines(budgetView(s, '2027-03-09')).day, /오늘은 하루 몫보다 .+ 더 썼어요\.$/);
});

test('넘으면 부드럽게: 90% 이상은 near, 넘으면 over (빨간 경고 문구 없음)', () => {
  const s = trip({ budget:{ total:100000, cats:{} }, spend:{ a:sp('2027-03-07', 92000, 'KRW', 'food') } });
  const near = budgetView(s, '2027-03-08');
  assert.equal(near.level, 'near');
  assert.equal(budgetLines(near).head, '예산의 92%를 썼어요. 8,000원 남았어요.');
  s.spend.b = sp('2027-03-08', 30000, 'KRW', 'shop');
  const over = budgetView(s, '2027-03-08');
  assert.equal(over.level, 'over');
  assert.equal(over.left, -22000);
  assert.equal(budgetLines(over).head, '예산보다 2.2만원 더 썼어요. 남은 날은 조금 가볍게 써 볼까요?');
  assert.equal(budgetLines(over).day, '');
  assert.doesNotMatch(budgetLines(over).head, /경고|초과|위험/);
  assert.equal(budgetLines(budgetView(s, '2027-03-20')).head, '예산보다 2.2만원 더 썼어요.');   // 여행 뒤엔 아끼자는 말 없이
});

test('분류별 예산: 분류마다 쓴 돈, 합이 전체보다 크면 알려 줌, 전체가 없으면 분류 합이 전체', () => {
  const s = trip({ budget:{ total:300000, cats:{ food:200000, shop:150000 } }, spend:{
    a:sp('2027-03-07', 25000, 'JPY', 'food'),   // 22.5만원 → 식비 넘음
    b:sp('2027-03-08', 10000, 'KRW', 'shop')
  } });
  const v = budgetView(s, '2027-03-08');
  assert.deepEqual(v.cats.map(c => [c.key, c.spent, c.level]), [['food', 225000, 'over'], ['shop', 10000, 'ok']]);
  assert.equal(v.catOver, 50000);
  s.budget.total = 0;
  const w = budgetView(s, '2027-03-08');
  assert.equal(w.total, 350000);
  assert.equal(w.fromCats, true);
  assert.equal(w.catOver, 0);
});

test('여행 날짜가 없으면 하루 몫은 안 셈', () => {
  const s = trip({ start:'', end:'', budget:{ total:100000, cats:{} }, spend:{ a:sp('2027-03-07', 1000, 'KRW', 'food') } });
  const v = budgetView(s, '2027-03-07');
  assert.equal(v.phase, 'none');
  assert.equal(v.perDay, null);
  assert.equal(budgetLines(v).day, '');
});

test('예산 고치기: 전체·분류, 0이면 지움, 모르는 분류는 무시', () => {
  const s = trip();
  s.budget = setBudget(s, 'total', 2000000);
  s.budget = setBudget(s, 'food', 500000);
  s.budget = setBudget(s, 'nope', 1);
  assert.deepEqual(s.budget, { total:2000000, cats:{ food:500000 } });
  s.budget = setBudget(s, 'food', 0);
  assert.deepEqual(s.budget, { total:2000000, cats:{} });
});

test('예산은 가계부처럼 함께 짜기로 공유되고, 백업에도 들어감', () => {
  assert.ok(SHARED_KEYS.includes('budget'));
  assert.ok(!MAP_KEYS.includes('budget'));
  const a = trip(); const b = trip({ budget:{ total:1500000, cats:{ food:300000 } } });
  assert.deepEqual(diffShared(sharedOf(a), sharedOf(b)), [['p.budget', { total:1500000, cats:{ food:300000 } }]]);
  assert.equal(describeChange(sharedOf(a), sharedOf(b)), '예산 바꿈');
  // 예산 칸이 없는 서버 일정(옛 버전이 만든 공유 여행)은 기본값
  const s = applyRemote(trip({ budget:{ total:5, cats:{} } }), Object.assign({}, sharedOf(a), { budget:undefined }));
  assert.deepEqual(s.budget, { total:0, cats:{} });
  assert.equal(describeChange(sharedOf(a), sharedOf(trip({ budget:{ total:0, cats:{} } }))), '');
  assert.deepEqual(stateForBackup(b).budget, { total:1500000, cats:{ food:300000 } });
});
