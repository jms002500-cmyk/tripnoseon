// AI 도우미: 사진(메뉴판·표지판·영수증·약·음식)에 상황에 맞는 부탁 문장을 붙여 사용자의 AI 앱(제미나이·ChatGPT·Claude 등)으로 넘김.
// 앱이 AI를 직접 부르지 않음(비용 0, 키 없음). 보내는 것은 사용자가 고른 사진과 아래 문장뿐 — 보관함·영수증 첨부·위치는 넣지 않음.
// 순수 함수(테스트 대상).
import { tripCities, onlyCity } from './logic.js';
import { ratesOf } from './ledger.js';

export const ASK_KINDS = [
  { key:'menu', icon:'🍜', label:'메뉴판' },
  { key:'sign', icon:'🪧', label:'표지판·안내문' },
  { key:'receipt', icon:'🧾', label:'영수증' },
  { key:'medicine', icon:'💊', label:'약·상품' },
  { key:'food', icon:'🍽️', label:'음식 사진' }
];
export const askKindOf = k => ASK_KINDS.find(x => x.key === k) || ASK_KINDS[0];

const CITY = { hk:'홍콩', sz:'선전' };
const LANG = { hk:'광둥어(번체 한자)', sz:'중국어(간체 한자)' };
const CUR_OF = { hk:'HKD', sz:'CNY' };
const UNIT = { JPY:'엔', HKD:'홍콩달러', CNY:'위안' };

// 어디 여행인지 · 주문할 때 쓸 말 · 현지 통화들
function where(s){
  if(s.city === 'tokyo' || !tripCities(s).length) return { place:'일본 도쿄', lang:'일본어', curs:['JPY'] };
  const c = onlyCity(s);
  if(c) return { place:CITY[c], lang:LANG[c], curs:[CUR_OF[c]] };
  return { place:'홍콩·선전', lang:'홍콩이면 광둥어(번체 한자), 선전이면 중국어(간체 한자)', curs:['HKD', 'CNY'] };
}

// '가족 3명(어른 2명, 아이 12살)'
export function partyLine(s){
  const kids = s.kids || [];
  if(s.who === 'family') return `가족 ${s.adults + kids.length}명(어른 ${s.adults}명${kids.length ? `, 아이 ${kids.map(a => a + '살').join('·')}` : ''})`;
  if(s.who === 'solo') return '혼자 온 여행자';
  if(s.who === 'couple') return '연인·부부 2명';
  if(s.who === 'friends') return `친구 ${s.adults}명`;
  if(s.who === 'parents') return `부모님과 함께 온 ${s.adults}명`;
  return '여행자';
}

// '1홍콩달러 ≈ 178원, 1위안 ≈ 190원' (모르면 '')
export function rateLine(s){
  const r = ratesOf(s);
  return where(s).curs.filter(c => r[c] > 0).map(c => `1${UNIT[c]} ≈ ${Math.round(r[c] * 10) / 10}원`).join(', ');
}

// 상황별 부탁 문장. note: 사용자가 덧붙인 말(알레르기 등)
export function askPrompt(s, kind, note){
  const w = where(s); const kid = (s.who === 'family' && (s.kids || []).length) ? Math.min(...s.kids) : 0;
  const rl = rateLine(s); const won = rl ? `(${rl})` : '(환율은 최근 값으로 어림)';
  const kidOk = kid ? `${kid}살 아이가 먹기 괜찮은지, ` : '';
  const unsure = '글자가 잘 안 보이거나 확실하지 않은 부분은 추측하지 말고 "잘 안 보임"이라고 해 줘.';
  const lines = {
    menu:['이 사진은 식당 메뉴판이야.',
      '메뉴를 하나씩 한국어로 알려 줘. 글자 그대로 옮기지 말고 실제로 어떤 음식인지 짧게 설명해 줘.',
      `가격은 현지 돈과 원화 대략을 같이 적어 줘. ${won}`,
      `맵기, ${kidOk}돼지고기·소고기·해산물·견과류가 들어가는지 표시해 줘.`,
      `우리에게 맞는 추천 3개와, 주문할 때 직원에게 보여 줄 ${w.lang} 한 줄을 알려 줘.`,
      unsure],
    sign:['이 사진은 표지판이나 안내문이야.',
      '무슨 뜻인지 한국어로 알려 줘.',
      '우리가 지금 해야 할 일이나 조심할 점을 알려 줘.',
      '시간·요금·날짜·출구 번호 같은 숫자가 있으면 따로 정리해 줘.',
      unsure],
    receipt:['이 사진은 영수증이야.',
      '가게 이름과 날짜를 알려 줘.',
      '항목마다 한국어 이름과 금액을 적어 줘.',
      '합계, 봉사료·세금, 결제 수단을 알려 줘.',
      `합계를 원화 대략으로도 적어 줘. ${won}`,
      `마지막 줄에 가계부에 적기 좋게 "무엇 금액통화" 한 줄로 정리해 줘. (예: 점심 186${UNIT[w.curs[0]]})`,
      '잘 안 보이는 숫자는 추측하지 말고 "잘 안 보임"이라고 해 줘.'],
    medicine:['이 사진은 약이나 편의점 상품 포장이야.',
      '무슨 제품이고 어디에 쓰는지 알려 줘.',
      '주의할 성분(졸음, 카페인, 알레르기 성분 등)을 알려 줘.',
      `${kid ? `${kid}살 아이가 먹어도 되는지, ` : ''}나이별 먹는 양과 방법을 알려 줘.`,
      '비슷한 한국 제품이 있으면 알려 줘.',
      `확실하지 않으면 약사에게 물어보라고 하고, 약사에게 보여 줄 ${w.lang} 한 줄을 써 줘. 건강 문제는 약사·의사 확인이 먼저라는 점도 짧게 알려 줘.`,
      unsure],
    food:['이 사진은 음식이야.',
      '무슨 음식인지, 현지에서 부르는 이름과 함께 알려 줘.',
      '어떻게 먹는지(소스, 먹는 순서) 알려 줘.',
      `맵기, ${kidOk}들어갔을 만한 재료 중 주의할 것을 알려 줘.`,
      '확실하지 않으면 추측이라고 밝혀 줘.']
  }[askKindOf(kind).key];
  const [intro, ...steps] = lines;
  const extra = String(note || '').trim().slice(0, 200);
  return [`${w.place} 여행 중이야. 일행은 한국인 ${partyLine(s)}.`, intro,
    ...steps.map((t, i) => `${i + 1}. ${t}`),
    ...(extra ? [`참고: ${extra}`] : []),
    '답은 한국어로, 짧고 보기 쉽게 써 줘.'].join('\n');
}

// 사진 없이 AI 웹에서 열 곳 (공유가 안 되는 브라우저용)
export const AI_SITES = [
  { key:'gemini', label:'제미나이', url:'https://gemini.google.com/app' },
  { key:'chatgpt', label:'ChatGPT', url:'https://chatgpt.com/' },
  { key:'claude', label:'Claude', url:'https://claude.ai/new' }
];
