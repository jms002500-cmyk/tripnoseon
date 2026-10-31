// AI 도우미 부탁 문장: 여행지·동행·환율에 맞춰 만들고, 모르는 건 추측하지 말라고 함
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { ASK_KINDS, askPrompt, partyLine, rateLine } from '../js/askai.js';

const fam = extra => Object.assign(clone(D.DEFAULT), { who:'family', adults:2, kids:[12] }, extra);

test('동행 한 줄', () => {
  assert.equal(partyLine(fam()), '가족 3명(어른 2명, 아이 12살)');
  assert.equal(partyLine(Object.assign(clone(D.DEFAULT), { who:'friends', adults:3 })), '친구 3명');
  assert.equal(partyLine(clone(D.DEFAULT)), '여행자');
});

test('도쿄 메뉴판: 일본어로 주문, 엔 환율, 아이 나이, 추측 금지', () => {
  const p = askPrompt(fam({ fx:{ rates:{ JPY:9.2 } } }), 'menu');
  assert.match(p, /^일본 도쿄 여행 중이야\. 일행은 한국인 가족 3명/);
  assert.match(p, /메뉴판/); assert.match(p, /일본어 한 줄/); assert.match(p, /1엔 ≈ 9\.2원/);
  assert.match(p, /12살 아이가 먹기 괜찮은지/); assert.match(p, /잘 안 보임/);
  assert.match(p, /\n1\. 메뉴를 하나씩/);
});

test('홍콩·선전: 둘 다면 두 말·두 통화, 홍콩만이면 광둥어·홍콩달러만', async () => {
  await D.loadRegion('hksz');
  try{
    const both = fam({ city:'hksz', fx:{ rates:{ HKD:178, CNY:190 } } });
    const p = askPrompt(both, 'menu');
    assert.match(p, /^홍콩·선전 여행 중이야/); assert.match(p, /광둥어/); assert.match(p, /중국어/);
    assert.equal(rateLine(both), '1홍콩달러 ≈ 178원, 1위안 ≈ 190원');
    const hk = fam({ city:'hksz', cityOnly:'hk', fx:{ rates:{ HKD:178, CNY:190 } } });
    const q = askPrompt(hk, 'receipt');
    assert.match(q, /^홍콩 여행 중이야/); assert.doesNotMatch(q, /위안|선전/); assert.match(q, /186홍콩달러/);
  } finally { D.useRegion('tokyo'); }
});

test('환율을 모르면 어림하라고만', () => {
  const p = askPrompt(fam(), 'menu');
  assert.match(p, /환율은 최근 값으로 어림/);
});

test('아이가 없으면 아이 질문 없음, 덧붙인 말은 참고로', () => {
  const s = Object.assign(clone(D.DEFAULT), { who:'couple', adults:2 });
  const p = askPrompt(s, 'medicine', '  땅콩 알레르기 있어요 ');
  assert.doesNotMatch(p, /살 아이/); assert.match(p, /참고: 땅콩 알레르기 있어요\n/); assert.match(p, /약사/);
});

test('상황마다 문장이 있고, 모르는 상황은 메뉴판으로', () => {
  const s = fam();
  ASK_KINDS.forEach(k => assert.ok(askPrompt(s, k.key).length > 80, k.key));
  assert.equal(askPrompt(s, 'nope'), askPrompt(s, 'menu'));
});
