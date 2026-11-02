// AI 도우미: 사진(메뉴판·표지판·영수증·약·음식)에 상황에 맞는 부탁 문장을 붙여 사용자의 AI 앱(제미나이·ChatGPT·Claude 등)으로 넘김.
// 앱이 AI를 직접 부르지 않음(비용 0, 키 없음). 보내는 것은 사용자가 고른 사진과 아래 문장뿐 — 보관함·영수증 첨부·위치는 넣지 않음.
// 순수 함수(테스트 대상).
import { tripCities, onlyCity, pickedPlaces } from './logic.js';
import { PACE } from './data.js';
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
// 간판·표지판처럼 한 단어만 빨리 볼 때: 카메라를 비추면 바로 바뀌는 번역 앱(무료). 언어는 자동 감지 → 한국어 (주소 확인 2026-11-01)
//   폰에 앱이 깔려 있으면 앱으로 열리고, 없으면 웹 사진 번역. 우리 앱은 주소만 열고 아무것도 보내지 않음
export const QUICK_TRANSLATE = [
  { key:'google', label:'구글 번역 카메라', url:'https://translate.google.com/?sl=auto&tl=ko&op=images', tip:'구글 번역 앱이 있으면 앱의 카메라 버튼을 누르세요.' },
  { key:'papago', label:'파파고', url:'https://papago.naver.com/?sk=auto&tk=ko', tip:'파파고 앱이 있으면 앱의 이미지(카메라) 버튼을 누르세요.' }
];

export const AI_SITES = [
  { key:'gemini', label:'제미나이', url:'https://gemini.google.com/app' },
  { key:'chatgpt', label:'ChatGPT', url:'https://chatgpt.com/' },
  { key:'claude', label:'Claude', url:'https://claude.ai/new' }
];

/* ---------- 장소 담기: AI에게 추천 받아 담기 ----------
   여행 정보로 추천 부탁 문장을 만들어 사용자의 AI 앱으로 넘기고(앱은 AI를 부르지 않음),
   붙여 넣은 답의 '담기 목록'에서 장소 이름을 읽어 우리 목록과 맞춰 봄.
   보내는 것: 여행지·날짜·동행(아이 나이)·좋아하는 것·담은 장소 이름·사용자가 적은 말. 이름·연락처·예약 정보는 넣지 않음 */
export const PLAN_MARK = '담기 목록';
const md = k => `${+k.slice(5, 7)}월 ${+k.slice(8, 10)}일`;
const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '');

export function planPrompt(s, want){
  const w = where(s); const kids = s.who === 'family' ? (s.kids || []) : [];
  let when = '';
  if(isKey(s.start) && isKey(s.end) && s.end >= s.start){
    const n = Math.round((Date.parse(s.end) - Date.parse(s.start)) / 864e5);
    when = ` 날짜는 ${md(s.start)}~${md(s.end)}(${n ? `${n}박 ${n + 1}일` : '당일'}).`;
  }
  const picked = pickedPlaces(s); const must = picked.filter(p => s.must[p.id]); const others = picked.filter(p => !s.must[p.id]);
  const names = ps => ps.slice(0, 30).map(p => p.name).join(', ');
  const pace = PACE[s.pace] ? `${PACE[s.pace].label}(${PACE[s.pace].desc})` : '';
  const extra = String(want || '').trim().slice(0, 200);
  return [`${w.place} 여행을 계획 중이야. 일행은 한국인 ${partyLine(s)}.${when}`,
    ...((s.styles || []).length ? [`좋아하는 것: ${s.styles.join(', ')}`] : []),
    ...(pace ? [`하루 일정: ${pace}`] : []),
    ...(must.length ? [`꼭 갈 곳: ${names(must)}`] : []),
    ...(others.length ? [`이미 담은 곳: ${names(others)}`] : []),
    ...(extra ? [`원하는 것: ${extra}`] : []),
    '',
    `1. 우리에게 맞는 가볼 곳을 8곳 추천해 줘.${picked.length ? ` ${must.length ? '꼭 갈 곳' : ''}${must.length && others.length ? '과 ' : ''}${others.length ? '이미 담은 곳' : ''}은 빼 줘.` : ''}`,
    `2. 곳마다 왜 우리에게 맞는지 한 줄${kids.length ? `(${Math.min(...kids)}살 아이가 좋아할지 포함)` : ''}, 있는 동네, 머무는 시간 어림을 적어 줘.`,
    '3. 실제로 있는 곳만 적고, 문을 닫았거나 공사 중인 곳은 빼 줘. 확실하지 않은 정보는 확실하지 않다고 적어 줘.',
    `4. 답 맨 끝에 "[${PLAN_MARK}]"이라고 한 줄 쓰고, 그 아래에 추천한 곳을 한 줄에 하나씩 "- 한국어 이름 / 현지 이름(영어나 원래 글자)" 모양으로 적어 줘.`,
    '답은 한국어로, 짧고 보기 쉽게 써 줘.'].join('\n');
}

// 한 줄 → { name, local }. '- 빅토리아 피크 / Victoria Peak', '1. **빅토리아 피크** (Victoria Peak) — 설명'
const BULLET = /^\s*(?:[-*•·▪]|\d{1,2}[.)]|[①-⑳])\s*/;
const NOT_PLACE = /^(?:이유|추천 ?이유|동네|위치|시간|머무는 ?시간|팁|주의|참고|가격|요금|교통|가는 ?법|영업 ?시간|일차|\d+일차)$/;
function lineItem(l){
  const t = l.replace(BULLET, '').replace(/[*_`#]/g, '').trim();
  let name = t, local = '';
  const sl = t.split(/\s+\/\s+|\s*／\s*/);
  if(sl.length > 1){ name = sl[0]; local = sl[1]; }
  else {
    name = t.split(/\s+[—–-]\s+|:\s|：/)[0];
    const pm = name.match(/^(.+?)\s*[(（]([^)）]+)[)）]\s*$/);
    if(pm && /[A-Za-z\u3040-\u30ff\u3400-\u9fff]/.test(pm[2])){ name = pm[1]; local = pm[2]; }
  }
  local = local.split(/\s+[—–-]\s+|:\s|：|,\s/)[0];
  const clean = x => x.replace(/^[\s"'“‘\[]+|[\s"'”’\].,。!?]+$/g, '').trim();
  name = clean(name); local = clean(local);
  if(name.length < 2 || name.length > 40) return null;
  return { name, local:local.length <= 60 ? local : '' };
}

// AI 답 → 장소 이름 목록(최대 20곳). '[담기 목록]'이 있으면 그 아래만, 없으면 글머리표·번호 줄
export function parseAiPlaces(text){
  const lines = String(text || '').split(/\r?\n/);
  let at = -1; lines.forEach((l, i) => { if(l.includes(PLAN_MARK)) at = i; });
  // 목록 표시가 없으면 맨 앞 번호 줄이나 굵은 글씨 줄만 (들여 쓴 '- 이유: …' 같은 설명 줄은 빼고)
  const cand = at >= 0 ? lines.slice(at + 1).filter(l => BULLET.test(l) || /\S\s*[/／]\s*\S/.test(l))
    : lines.filter(l => /^\s?(?:\d{1,2}[.)]|[①-⑳])/.test(l) || /^\s?(?:[-*•]\s*)?\*\*/.test(l));
  const seen = new Set(); const out = [];
  for(const l of cand){
    const x = lineItem(l); if(!x || NOT_PLACE.test(x.name)) continue;
    const k = normName(x.name); if(!k || seen.has(k)) continue;
    seen.add(k); out.push(x); if(out.length >= 20) break;
  }
  return out;
}

// 이름 비교용: 소문자·전각→반각, 띄어쓰기·문장부호 없앰
export const normName = x => String(x || '').normalize('NFKC').toLowerCase().replace(/[\s·.,'’"“”()[\]\-–—_/:!?&]+/g, '');
const keysOf = (...xs) => xs.flatMap(x => [x, String(x || '').replace(/\s*[(（][^)）]*[)）]/g, '')]).map(normName).filter(k => k.length >= 2);

// 우리 목록(places)에서 같은 곳 찾기 → id | ''. 같은 이름이 먼저, 아니면 한쪽이 다른 쪽을 품을 때(4글자 이상)
export function matchPlace(x, places){
  const mine = keysOf(x.name, x.local); let best = '', bestLen = 0;
  for(const p of places){
    const theirs = keysOf(p.name, p.ja, p.en);
    if(mine.some(a => theirs.includes(a))) return p.id;
    for(const a of mine) for(const b of theirs){
      const short = Math.min(a.length, b.length);
      if(short >= 4 && short > bestLen && (a.includes(b) || b.includes(a))){ best = p.id; bestLen = short; }
    }
  }
  return best;
}
