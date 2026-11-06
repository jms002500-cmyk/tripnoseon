// 장소 담기: AI에게 추천 받기 (질문 문장 · 답에서 장소 읽기 · 우리 목록과 맞추기)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { planPrompt, parseAiPlaces, matchPlace, aiToPick, PLAN_MARK } from '../js/askai.js';

const trip = () => Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', adults:2, kids:[12], start:'2026-12-06', end:'2026-12-10', styles:['체험'] });

test('질문: 여행지·날짜·동행·담은 곳·원하는 것·담기 목록 모양', async () => {
  await D.loadRegion('hksz');
  try{
    const s = trip(); s.picked = { hk_disney:true, hk_peak:true }; s.must = { hk_disney:true };
    const q = planPrompt(s, '  비 와도 갈 곳  ');
    assert.match(q, /홍콩·선전 여행/);
    assert.match(q, /가족 3명\(어른 2명, 아이 12살\)/);
    assert.match(q, /12월 6일~12월 10일\(4박 5일\)/);
    assert.match(q, /좋아하는 것: 체험/);
    assert.match(q, /꼭 갈 곳: 홍콩 디즈니랜드/);
    assert.match(q, /이미 담은 곳: 빅토리아 피크/);
    assert.doesNotMatch(q, /이미 담은 곳: .*디즈니/);              // 꼭 갈 곳은 한 번만
    assert.match(q, /꼭 갈 곳과 이미 담은 곳은 빼 줘/);
    assert.match(q, /원하는 것: 비 와도 갈 곳\n/);
    assert.match(q, /12살 아이가 좋아할지/);
    assert.ok(q.includes(`"[${PLAN_MARK}]"`));
    // 날짜·담은 곳이 없으면 그 줄을 빼고, 원하는 것은 200자까지
    const e = planPrompt(Object.assign(trip(), { start:'', styles:[] }), 'x'.repeat(300));
    assert.doesNotMatch(e, /날짜는|좋아하는 것|담은 곳|꼭 갈 곳/);
    assert.match(e, /8곳 추천해 줘\.\n/);
    assert.ok(e.includes('원하는 것: ' + 'x'.repeat(200) + '\n'));
  } finally { D.useRegion('tokyo'); }
});

const MARKED = `가족 여행에 맞춰 골라 봤어요!

1. **홍콩 과학관** — 12살이 직접 해 보는 전시가 많아요. 침사추이, 2~3시간
   - 이유: 비 와도 괜찮아요
2. **청킹맨션 근처 시계탑** — 바닷가 산책

[담기 목록]
- 홍콩 과학관 / Hong Kong Science Museum
- 피크 트램 / Peak Tram
- **웡타이신** / 黃大仙祠
- 침사추이 시계탑 / Former Kowloon-Canton Railway Clock Tower
- 홍콩 과학관 / 香港科學館
즐거운 여행 되세요!`;

test('답 읽기: [담기 목록] 아래만, 같은 이름은 한 번', () => {
  assert.deepEqual(parseAiPlaces(MARKED), [
    { name:'홍콩 과학관', local:'Hong Kong Science Museum' },
    { name:'피크 트램', local:'Peak Tram' },
    { name:'웡타이신', local:'黃大仙祠' },
    { name:'침사추이 시계탑', local:'Former Kowloon-Canton Railway Clock Tower' }
  ]);
  assert.deepEqual(parseAiPlaces(''), []);
  assert.deepEqual(parseAiPlaces('잘 모르겠어요. 다시 물어봐 주세요.'), []);
});

test('답 읽기: 목록 표시가 없으면 번호·굵은 글씨 줄 (설명 줄은 빼고)', () => {
  const t = `추천:
1. 오션파크 (Ocean Park) — 놀이기구와 수족관
   - 이유: 아이가 좋아해요
   - 시간: 하루
2) **스타페리**: 5분 배 타기
- **M+ 박물관** – 현대 미술
* 일반 설명 줄은 무시`;
  assert.deepEqual(parseAiPlaces(t), [
    { name:'오션파크', local:'Ocean Park' },
    { name:'스타페리', local:'' },
    { name:'M+ 박물관', local:'' }
  ]);
});

test('우리 목록과 맞추기: 같은 이름 · 현지 이름 · 한쪽이 품는 이름(4글자 이상)', async () => {
  await D.loadRegion('hksz');
  try{
    const P = D.PLACES; const m = (name, local = '') => matchPlace({ name, local }, P);
    assert.equal(m('홍콩 과학관', 'Hong Kong Science Museum'), 'hk_science');
    assert.equal(m('피크 트램', 'Peak Tram'), 'hk_peak');            // '빅토리아 피크 (피크 트램)'이 품음
    assert.equal(m('빅토리아 피크'), 'hk_peak');                        // 괄호 뺀 이름과 같음
    assert.equal(m('웡타이신', '黃大仙祠'), 'hk_wongtaisin');
    assert.equal(m('Wong Tai Sin Temple', '黄大仙祠'), '');            // 간체는 다른 글자라 못 맞춤 → 가져오기로
    assert.equal(m('오션파크 홍콩'), 'hk_oceanpark');
    assert.equal(m('침사추이 시계탑', 'Clock Tower'), '');
    assert.equal(m('홍콩 공원'), 'hk_hkpark');                          // 같은 이름인 곳으로, '홍콩 동식물공원'과 헷갈리지 않음
    assert.equal(m('피크'), '');                                       // 너무 짧으면 품는 이름으로 안 봄
  } finally { D.useRegion('tokyo'); }
});

test('모두 담기: 지금 보이는 목록에 있고 안 담은 곳만 (홍콩만으로 바꾼 뒤 선전 곳·다른 지역 id는 안 담음)', () => {
  const found = [{ name:'a', id:'hk_peak' }, { name:'b', id:'sz_x' }, { name:'c', id:'' }, { name:'d', id:'hk_disney' }, { name:'e', id:'hk_peak' }, { name:'f', id:'tokyo_old' }];
  const places = [{ id:'hk_peak' }, { id:'hk_disney' }];
  assert.deepEqual(aiToPick(found, places, { hk_disney:true }), ['hk_peak']);
  assert.deepEqual(aiToPick(found, places, {}), ['hk_peak', 'hk_disney']);
  assert.deepEqual(aiToPick(undefined, places, {}), []);
});
