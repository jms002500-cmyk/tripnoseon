// AI 영수증 답에서 가계부 한 줄 찾기
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { lineFromAi } from '../js/ledger.js';

const ANSWER = `**가게**: 翠華餐廳 (취화 레스토랑) · 2026-12-07
1. 菠蘿油 (버터 넣은 파인애플번) — HK$22
2. 凍檸茶 (아이스 레몬티) — HK$28
3. 星洲炒米 (싱가포르식 볶음쌀국수) — HK$68
- 봉사료 10%: HK$12
- 합계: HK$130 (약 23,140원)
- 결제: 현금

점심 130홍콩달러`;

test('마지막 줄의 "무엇 금액통화"를 찾음', async () => {
  await D.loadRegion('hksz');
  try{
    const s = Object.assign(clone(D.DEFAULT), { city:'hksz', start:'2026-12-06', end:'2026-12-10' }); const ctx = { today:'2026-12-07', cur:'HKD' };
    assert.equal(lineFromAi(ANSWER, s, ctx), '점심 130홍콩달러');
    assert.equal(lineFromAi(ANSWER + '\n\n가계부 한 줄: 취화 점심 130홍콩달러\n더 궁금한 게 있으면 말해 주세요.', s, ctx), '취화 점심 130홍콩달러');
    // 마지막 줄이 원화 어림이면 현지 돈 줄을 고름
    assert.equal(lineFromAi('- 합계: HK$130\n원화로 약 23,140원', s, ctx), '합계: HK$130');
    assert.equal(lineFromAi('잘 안 보여요. 다시 찍어 주세요.', s, ctx), '');
    assert.equal(lineFromAi('', s, ctx), '');
  } finally { D.useRegion('tokyo'); }
});
