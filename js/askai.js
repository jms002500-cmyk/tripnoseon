// AI 도우미: 사진(메뉴판·표지판·영수증·약·음식)에 상황에 맞는 부탁 문장을 붙여 사용자의 AI 앱(제미나이·ChatGPT·Claude 등)으로 넘김.
// 앱이 AI를 직접 부르지 않음(비용 0, 키 없음). 보내는 것은 사용자가 고른 사진과 아래 문장뿐 — 보관함·영수증 첨부·위치는 넣지 않음.
// 순수 함수(테스트 대상).
import { talkWords, talkOf, reqOf } from './asktalk.js';
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
      '사진 전체를 끝까지 훑어서 적힌 메뉴를 빠뜨리지 말고 분류별로 한국어로 알려 줘. 글자 그대로 옮기지 말고 실제로 어떤 음식인지 짧게 설명해 줘.',
      `가격은 그 메뉴와 같은 줄에 적힌 값만 읽고, 현지 돈과 원화 대략을 같이 적어 줘. 면/밥처럼 가격이 둘이면 둘 다 적어 줘. ${won}`,
      `맵기, ${kidOk}돼지고기·소고기·양고기·해산물·견과류가 들어가는지 표시해 줘.`,
      '메뉴판에 적힌 가게 규칙(할랄, 음주 금지, 고수 빼는 법 등)이 있으면 맨 위에 알려 줘.',
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
// 앱 안에서 바로 답 받기(선택): 사용자가 만든 제미나이 무료 키로 이 폰에서 구글에 직접 물음. 서버·비용 없음.
// 키는 이 폰 localStorage에만 두고 일정·공유·백업에 넣지 않음. 무료 등급은 보낸 내용이 구글 제품 개선에 쓰일 수 있어서 화면에 알림.
// 모델은 Flash-Lite(무료 등급·안정판): 같은 메뉴판 시험(2026-11-07)에서 3.5 Flash-Lite 6초, 3.6 Flash 33초, 3.8 Flash는 2분 넘게 걸려 식당에서 쓸 수 있는 것으로 고름
export const ASK_KEY = 'tripnoseon-askkey', ASK_VKEY = 'tripnoseon-askkey-vertex', ASK_USE = 'tripnoseon-askuse';
export const ASK_KEY_PAGE = 'https://aistudio.google.com/apikey';
export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
// 키 칸이 둘이고 칸이 곧 경로: 구글 칸은 구글 일반 주소로만, 버텍스 칸은 버텍스로만 물음. 앞글자로 추측하지 않음(새 AI 스튜디오 키도 AQ.로 시작).
// 버텍스 칸은 서비스 계정 JSON이나 버텍스 키. 값은 그 폰 localStorage에만 두고 코드·저장소·공유·백업에 넣지 않음. 위치는 global이어야 새 Flash 모델이 열림(2026-11-07 직접 확인).
//   별칭 gemini-flash-latest는 버텍스에 없어서(404) 차례로 시도
export const VERTEX_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash'];
const VERTEX_HOST = 'https://aiplatform.googleapis.com';
export function askKeyInfo(raw, vertex){
  const t = String(raw || '').trim(); if(!t) return null;
  if(vertex && t[0] === '{'){
    try{ const j = JSON.parse(t); return j && j.private_key && j.client_email && j.project_id ? { kind:'sa', sa:j } : null; }catch(e){ return null; }
  }
  return t[0] === '{' || /\s/.test(t) ? null : { kind:vertex ? 'express' : 'gemini', key:t };
}
// 저장된 두 키와 지금 쓸 쪽. 예전 판은 칸이 하나여서 서비스 계정 JSON이 구글 칸에 있을 수 있어 버텍스 칸으로 옮김. 둘 다 있으면 기본은 구글(버텍스는 요금이 날 수 있어서)
export function askKeys(store){
  const get = k => { try{ return store.getItem(k) || ''; }catch(e){ return ''; } };
  let g = get(ASK_KEY), v = get(ASK_VKEY);
  if(g.trim()[0] === '{'){
    try{ if(!v) store.setItem(ASK_VKEY, g); store.removeItem(ASK_KEY); }catch(e){}
    v = v || g; g = '';
  }
  return { g, v, use:g && v ? (get(ASK_USE) === 'v' ? 'v' : 'g') : v ? 'v' : g ? 'g' : '' };
}
export const askKeyNow = ks => ks.use === 'v' ? askKeyInfo(ks.v, true) : ks.use === 'g' ? askKeyInfo(ks.g) : null;
const vertexUrl = (info, model) => info.kind === 'sa'
  ? `${VERTEX_HOST}/v1/projects/${encodeURIComponent(info.sa.project_id)}/locations/global/publishers/google/models/${model}:generateContent`
  : `${VERTEX_HOST}/v1/publishers/google/models/${model}:generateContent`;
// 차례로 물을 주소. 버텍스는 없는 모델이면(404) 다음 모델로
export const askTargets = info => info.kind === 'gemini' ? [GEMINI_URL] : VERTEX_MODELS.map(m => vertexUrl(info, m));
// 서비스 계정 토큰용 서명 재료 (서명은 app.js가 브라우저 암호 기능으로)
export const b64url = v => { const b = typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v); let t = ''; b.forEach(x => { t += String.fromCharCode(x); }); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const pemToDer = pem => Uint8Array.from(atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0));
export const jwtClaims = (sa, now) => ({ iss:sa.client_email, scope:'https://www.googleapis.com/auth/cloud-platform', aud:'https://oauth2.googleapis.com/token', iat:now, exp:now + 3600 });
export const geminiBody = (prompt, mime, data, schema) => ({ contents:[{ role:'user', parts:[{ text:prompt }, { inline_data:{ mime_type:mime, data } }] }],
  ...(schema ? { generationConfig:{ responseMimeType:'application/json', responseSchema:schema } } : {}) });

// 앱 안 답은 정해진 칸으로 받아서 앱이 화면을 꾸밈 (ASK_VIEW는 views.js askCard). 금액은 숫자로 받아 앱이 환율로 원화를 붙임
const STR = { type:'STRING' }, LIST = { type:'ARRAY', items:STR };
const obj = (properties, required) => ({ type:'OBJECT', properties, required });
const CUR = { type:'STRING', enum:['HKD', 'CNY', 'JPY'] };
const LINE = obj({ ko:STR, local:STR }, ['ko', 'local']);
const ASK_SCHEMA = {
  menu:obj({ currency:CUR, rules:LIST, recommend:{ type:'ARRAY', items:obj({ name:STR, local:STR, why:STR }, ['name', 'local', 'why']) },
    items:{ type:'ARRAY', items:obj({ group:STR, ko:STR, local:STR, desc:STR, prices:{ type:'ARRAY', items:obj({ label:STR, local:STR, price:{ type:'NUMBER', nullable:true } }, ['label', 'price']) }, spicy:{ type:'INTEGER' }, kid:{ type:'STRING', enum:['좋음', '주의', '비추천'] }, contains:LIST, alert:STR }, ['group', 'ko', 'local', 'desc', 'prices', 'spicy', 'kid', 'contains']) },
    order:LINE, request:LINE, more:STR, unclear:STR }, ['currency', 'rules', 'recommend', 'items', 'order']),
  sign:obj({ meaning:STR, todo:LIST, facts:LIST, unclear:STR }, ['meaning', 'todo', 'facts']),
  receipt:obj({ store:STR, date:STR, currency:CUR, items:{ type:'ARRAY', items:obj({ ko:STR, local:STR, price:{ type:'NUMBER', nullable:true } }, ['ko', 'local']) },
    service:{ type:'NUMBER', nullable:true }, tax:{ type:'NUMBER', nullable:true }, total:{ type:'NUMBER', nullable:true }, pay:STR, what:STR, unclear:STR }, ['store', 'currency', 'items', 'total', 'what']),
  medicine:obj({ name:STR, use:STR, warn:LIST, dose:STR, kid:STR, similar:STR, pharmacist:LINE, unclear:STR }, ['name', 'use', 'warn', 'dose', 'pharmacist']),
  food:obj({ name:STR, local:STR, how:STR, spicy:{ type:'INTEGER' }, kid:STR, warn:LIST, unclear:STR }, ['name', 'local', 'how', 'spicy', 'warn'])
};
const ASK_RULES = {
  menu:w => ['이 사진은 식당 메뉴판이야. 사진 전체를 왼쪽 위부터 칸(분류)마다 끝까지 훑어서, 적힌 메뉴를 하나도 빠뜨리지 말고 모두 items에 넣어 줘. 사진에서 실제로 읽은 글자만 옮기고, 글자를 조합하거나 없는 메뉴를 지어내면 안 돼. 안 읽히는 글자가 있으면 그 메뉴는 빼고 unclear에 적어 줘.',
    '밥·빵·고기 추가 같은 곁들임과 추가 요금, 손글씨나 덧붙인 쪽지의 메뉴도 넣어 줘. 200개가 넘을 때만 줄이고 줄였다고 more에 적어 줘.',
    'group은 메뉴판의 분류 이름을 한국어로 옮긴 거야. 같은 분류는 붙여서 적고, 분류가 없으면 빈 글자로 둬.',
    'ko는 뜻이 통하는 한국어 음식 이름이야. 拉面은 수타면, 刀削面은 도삭면처럼 한국 음식과 헷갈리지 않게 써 줘. local은 메뉴판에 적힌 글자 그대로, desc는 어떤 음식인지 15자 안쪽 설명이야.',
    '메뉴판의 한 줄이 메뉴 하나야. 줄을 합치지 말고 大碗이 붙은 줄도 따로 넣어 줘. prices는 그 메뉴와 같은 줄에 적힌 가격만 읽어 줘. 윗줄이나 아랫줄 가격을 가져오면 안 돼. 그 줄에 숫자가 하나면 메뉴 이름에 /가 있어도 prices는 하나이고 label은 빈 글자야. 20元/18元처럼 한 줄에 숫자가 둘일 때만 적힌 차례대로 둘 다 넣고, 면/밥이나 소/대 같은 구분을 label에 한국어로, 그 가격을 주문할 때 쓸 메뉴판 글자 이름을 local에 적어 줘(예: 番茄炒蛋盖浇饭). 숫자가 셋 이상이어도 같아. 안 보이면 price를 null로 둬. 메뉴판에 맞는 통화를 currency에 적어 줘.',
    'spicy는 0(안 매움)~3(아주 매움)이야. kid는 함께 온 아이가 먹기에 어떤지야.',
    'contains는 돼지고기·소고기·양고기·닭고기·해산물·견과류·달걀·유제품·밀 중 들어갔을 만한 것이야. 쌀밥만으로 만든 요리에는 밀을 넣지 마.',
    'alert는 참고에 적은 내용(알레르기 등)에 걸리거나 향이 아주 강할 때 그 이유를 짧게, 아니면 빈 글자로 둬.',
    'rules는 메뉴판에 적힌 가게 규칙과 주문 안내를 자연스러운 한국어로 옮긴 거야. 규칙 하나를 한 줄로 나눠 적어 줘. (예: 할랄 식당이에요, 음주 금지, 외부 음식 반입 금지, 고수를 빼려면 미리 말하기, 현금만 받음) 없으면 빈 목록이야.',
    'recommend는 우리 일행에게 맞는 3개, why는 고른 이유 한 줄이야. 메뉴 전체에서 고르고, name은 items의 ko와, local은 items의 local과 똑같이 적어 줘. 아이가 있으면 아이가 먹기 좋은 메뉴를 먼저 골라 줘.',
    `order.local은 추천 1번 메뉴 하나만 local 글자를 그대로 넣어 직원에게 보여 줄 ${w.lang} 한 문장이고, order.ko는 그 뜻이야. 면/밥이나 크기를 골라야 하는 메뉴면 어느 쪽인지 넣어 줘. 요청은 참고에 적힌 것만 넣고, 참고에 없는 요청(고수 빼기 등)은 넣지 마.`,
    `request는 참고에 적힌 요청만 직원에게 보여 줄 ${w.lang} 한 문장(local)과 그 뜻(ko)으로 쓴 거야. 참고가 없으면 두 칸 모두 빈 글자로 둬.`],
  sign:() => ['이 사진은 표지판이나 안내문이야.', 'meaning은 무슨 뜻인지 한국어로 짧게, todo는 우리가 지금 해야 할 일이나 조심할 점이야.', 'facts는 시간·요금·날짜·출구 번호 같은 숫자 정보를 한 줄씩 적어 줘.'],
  receipt:() => ['이 사진은 영수증이야.', 'store는 가게 이름, date는 날짜, items는 항목마다 한국어 이름(ko), 적힌 그대로(local), 금액(price)이야.',
    'service는 봉사료, tax는 세금, total은 실제 낸 합계, pay는 결제 수단이야. 없으면 null이나 빈 글자로 둬.', 'what은 가계부에 적을 짧은 이름이야. (예: 점심, 간식, 약)'],
  medicine:w => ['이 사진은 약이나 편의점 상품 포장이야.', 'name은 제품 이름, use는 어디에 쓰는지, warn은 주의할 성분(졸음·카페인·알레르기 등)이야.', 'dose는 나이별 먹는 양과 방법, kid는 함께 온 아이가 먹어도 되는지, similar는 비슷한 한국 제품이야.',
    `pharmacist.local은 약사에게 보여 줄 ${w.lang} 한 문장, pharmacist.ko는 그 뜻이야. 건강 문제는 약사·의사 확인이 먼저라는 점을 warn 끝에 넣어 줘.`],
  food:() => ['이 사진은 음식이야.', 'name은 한국어 이름, local은 현지에서 부르는 이름, how는 어떻게 먹는지(소스·먹는 순서)야.', 'spicy는 0~3, kid는 함께 온 아이가 먹기에 어떤지, warn은 들어갔을 만한 재료 중 주의할 것이야.', '확실하지 않으면 how 앞에 추측이라고 적어 줘.']
};
export const askSchema = kind => ASK_SCHEMA[askKindOf(kind).key];
// 추천과 메뉴 줄을 맞춤: 메뉴판 글자가 같은 줄을 먼저, 없으면 한국어 이름이 같은 줄
export const askRecItem = (d, x) => { const a = (d && d.items) || []; return a.find(i => x.local && i.local === x.local) || a.find(i => i.ko === x.name) || null; };
// 고른 메뉴 → 주문 문장. 메뉴 이름은 메뉴판 글자라 번역하지 않고 앞머리만 지역에 맞춤. cart는 { '메뉴 번호:가격 번호': 수량 }
const ORDER_HEAD = { CNY:'你好，我要这些：', HKD:'唔該，我要呢啲：', JPY:'すみません、これをお願いします。' };
// 직원에게 보여 줄 문장이라 한글은 넣지 않음: 크기는 현지 글자로 바꾸고, 그 밖의 한글 구분 이름(일반·보통 등)은 뺌
// 직원에게 보여 줄 문장이라 한글은 넣지 않음. 옵션은 ① 메뉴판의 A/B 글자 ② AI가 준 메뉴판 글자 이름(가격이나 한글이 섞이면 안 씀) ③ 크기 ④ 가격 차례로 구분해서, 어떤 옵션이든 직원이 알아볼 수 있게 함
const SIZE_OF = { 대:['大碗', '大盛り'], 중:['中碗', '中盛り'], 소:['小碗', '小盛り'] };
const sizeKey = t => (t.match(/^(대|큰|중|소|작은)(자|형| ?사이즈| ?그릇)?$/) || [])[1];
function orderName(x, p, cur){
  const local = String(x.local || x.ko || ''), all = x.prices || [], q = all[p]; if(!q || all.length < 2) return local;
  const m = all.length === 2 && local.match(/(.)\/(.)/);   // 盖浇面/饭처럼 메뉴판에 둘이 함께 적혀 있으면 적힌 차례로 고른 쪽만 남김
  if(m) return local.replace(m[0], p ? m[2] : m[1]);
  const own = String(q.local || '').trim(); if(own && !/[가-힣0-9/]/.test(own)) return own;
  const label = String(q.label || '').trim(), key = { 큰:'대', 작은:'소' }[sizeKey(label)] || sizeKey(label);
  if(key) return `${local}（${SIZE_OF[key][cur === 'JPY' ? 1 : 0]}）`;
  if(label && !hasHangul(label)) return `${local}（${label}）`;
  return q.price > 0 ? `${local}（${talkWords(cur).unit(q.price)}）` : `${local}（${p + 1}）`;
}
// 요청 글자: 쓰는 말에 맞게 한 줄로
const reqLocal = (keys, cur) => (keys || []).map(k => talkOf(reqOf(k), cur)).filter(Boolean).join(talkWords(cur).dot);
const reqKo = keys => (keys || []).map(k => (reqOf(k) || {}).ko).filter(Boolean).join(', ');
export function askOrder(d, cart, more){
  const cur = d && d.currency, reqs = (more && more.reqs) || {}, free = (more && more.free) || [];
  const lines = Object.entries(cart || {}).map(([k, n]) => {
    const [i, p] = k.split(':').map(Number), x = ((d && d.items) || [])[i]; if(!x || !(n > 0)) return null;
    const q = (x.prices || [])[p];
    return { k, ko:`${x.ko}${q && q.label && x.prices.length > 1 ? ` (${q.label})` : ''}`, local:orderName(x, p, cur), n, price:q && q.price > 0 ? q.price : 0, req:reqs[k] || [] };
  }).filter(Boolean);
  const req = (d && d.request) || {}, all = reqs['*'] || [], w = talkWords(cur);
  lines.forEach(l => { const t = reqLocal(l.req, cur); l.say = `${l.local} × ${l.n}${t ? `（${t}）` : ''}`; });
  return { count:lines.reduce((a, l) => a + l.n, 0), total:lines.reduce((a, l) => a + l.n * l.price, 0), unknown:lines.some(l => !l.price), lines,
    local:[ORDER_HEAD[cur] || ORDER_HEAD.CNY, ...lines.map(l => l.say), all.length ? `${w.all}${reqLocal(all, cur)}` : '', req.local, ...free.map(f => f.local)].filter(Boolean).join('\n'),
    ko:[lines.map(l => `${l.ko} ${l.n}개${l.req.length ? `(${reqKo(l.req)})` : ''}`).join(', '), all.length ? `전체: ${reqKo(all)}` : '', req.ko, ...free.map(f => f.ko)].filter(Boolean).join('\n') };
}
// 메뉴를 메뉴판의 분류별로 묶음 (나온 차례 유지). 분류 이름이 없으면 그 밖의 메뉴
export const askTalkCurs = s => where(s).curs;
export function askGroups(items){
  const out = [];
  (Array.isArray(items) ? items : []).forEach(x => {
    const name = String((x && x.group) || '').trim() || '그 밖의 메뉴';
    let g = out.find(y => y.name === name); if(!g) out.push(g = { name, items:[] });
    g.items.push(x);
  });
  return out;
}
export function askJsonPrompt(s, kind, note){
  const w = where(s); const extra = String(note || '').trim().slice(0, 200);
  return [`${w.place} 여행 중이야. 일행은 한국인 ${partyLine(s)}.`, ...ASK_RULES[askKindOf(kind).key](w),
    ...(extra ? [`참고: ${extra}`] : []),
    '글자가 잘 안 보이거나 확실하지 않은 것은 지어내지 말고 빼거나 unclear에 적어 줘.', '값은 모두 한국어로 쓰되, 이름이 local인 칸만 사진·현지 글자 그대로 써 줘.'].join('\n');
}
// 받은 글 → 칸 자료. 모양이 어긋나면 null(그때는 글 그대로 보여 줌)
export function askParse(kind, t){
  try{
    const j = JSON.parse(String(t || '').trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    return j && typeof j === 'object' && !Array.isArray(j) && (ASK_SCHEMA[askKindOf(kind).key].required || []).every(k => k in j) ? j : null;
  }catch(e){ return null; }
}
// 영수증 → 가계부 한 줄: '점심 267.3홍콩달러' (js/ledger.js parseLine이 읽는 모양)
const CUR_WORD = { HKD:'홍콩달러', CNY:'위안', JPY:'엔' };
export const receiptLine = d => d && d.total > 0 && CUR_WORD[d.currency] ? `${String(d.what || d.store || '지출').trim().slice(0, 30)} ${d.total}${CUR_WORD[d.currency]}` : '';
// 답 글만 꺼내고, 화면에 그대로 보이는 마크다운 기호를 지움
export function geminiRaw(j){
  const parts = (((j && j.candidates) || [])[0] || {}).content;
  return ((parts && parts.parts) || []).map(p => p.text || '').join('').trim();
}
export function geminiText(j){
  return geminiRaw(j).replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').replace(/^\s*\*\s+/gm, '• ');
}
// 안 될 때 원인을 알 수 있게 화면에 함께 보이는 구글 응답 코드 (대문자 코드만 쓰고 구글 문장은 그대로 옮기지 않음)
export function askErrTag(status, j){
  const e = (j && j.error) || {}, code = x => /^[A-Z0-9_]{2,60}$/.test(String(x || '')) ? String(x) : '';
  const why = ((Array.isArray(e.details) ? e.details : []).map(d => code(d && d.reason)).find(Boolean)) || code(e.status);
  return why ? `${status} ${why}` : String(status);
}
export function geminiError(status, j){
  const m = String((j && j.error && j.error.message) || '');
  if(status === 429) return '무료 사용량을 다 썼어요. 잠시 뒤 다시 하거나 아래 AI 앱으로 보내기를 써 주세요.';
  if(status === 400 && /api key|api_key/i.test(m) || status === 401 || status === 403) return '키가 맞지 않아요. 키를 다시 넣어 주세요.';
  if(status === 400) return '이 사진을 읽지 못했어요. 다시 찍어 주세요.';
  if(status >= 500) return '구글 쪽이 잠시 바빠요. 조금 뒤 다시 해 주세요.';
  return '답을 받지 못했어요. 아래 AI 앱으로 보내기를 써 주세요.';
}

// 사진 위에 얹을 부탁 문장 (AI 앱이 공유 글을 빠뜨려도 그림 속 글자를 읽고 답하게)
export const composedPrompt = (s, kind, note) => `[이 글 아래 사진을 보고 다음 부탁대로 답해 줘]\n${askPrompt(s, kind, note)}`;
// 글자를 그림 폭에 맞춰 줄바꿈. width(글) → 픽셀 폭. 한글은 띄어쓰기가 없어도 글자 단위로 끊음
export function wrapText(text, maxW, width){
  const out = [];
  String(text).split('\n').forEach(par => {
    let line = '';
    for(const ch of par){
      if(line && width(line + ch) > maxW){ out.push(line); line = ch.trim() ? ch : ''; }
      else line += ch;
    }
    out.push(line);
  });
  return out;
}

const appIntent = (pkg, path) => `intent://${path}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${encodeURIComponent(`https://play.google.com/store/apps/details?id=${pkg}`)};end`;
export const QUICK_TRANSLATE = [
  { key:'google', label:'구글 번역 앱', url:'https://translate.google.com/?sl=auto&tl=ko&op=images', android:appIntent('com.google.android.apps.translate', 'translate.google.com/'), tip:'구글 번역은 앱의 카메라 버튼을 누르세요.' },
  { key:'papago', label:'파파고 앱', url:'https://papago.naver.com/?sk=auto&tk=ko', android:appIntent('com.naver.labs.translator', 'papago.naver.com/'), tip:'파파고는 앱의 이미지(카메라) 버튼을 누르세요.' }
];

// 웹 번역 화면에는 카메라가 없어 안드로이드에서는 앱을 부름. 카메라를 바로 여는 공개 주소는 없어서 앱 첫 화면까지만 감
export const quickHref = (x, ua) => /Android/i.test(ua || '') ? x.android : x.url;
export const quickNote = ua => /Android/i.test(ua || '') ? '앱 대신 플레이 스토어가 열리면 거기서 받거나 열기를 누르세요.' : '웹 화면에는 카메라가 없어요. 폰에 있는 앱을 직접 여세요.';

// 직접 쓴 글 번역: 한국어면 현지어로, 그 밖의 말이면 한국어로 (사진 없이 묻는 글)
export const askTransPrompt = (text, cur) => `식당이나 가게에서 나누는 말이야. 아래 글이 한국어면 ${talkWords(cur).lang}로, 그 밖의 말이면 자연스러운 한국어로 옮겨 줘. 옮긴 문장만 답해 줘.\n\n글: ${String(text).slice(0, 300)}`;
export const hasHangul = t => /[가-힣]/.test(String(t || ''));

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

// '모두 담기'로 담을 id: 지금 보이는 우리 목록(places)에 있고 아직 안 담은 곳만.
//   찾은 뒤 홍콩만·선전만으로 바꾸거나 지역을 바꾸면 남은 id가 숨은 곳·다른 지역 곳이어서, 화면 숫자와 달리 그곳까지 담았음
export function aiToPick(found, places, picked){
  const ids = new Set((places || []).map(p => p.id)); const pk = picked || {};
  return [...new Set((found || []).map(x => x.id).filter(id => id && ids.has(id) && !pk[id]))];
}
