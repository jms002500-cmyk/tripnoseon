// 가계부·정산. 지출 한 줄 읽기("라멘 1200엔"), 기본 날짜, 합계, 누가 누구에게 얼마.
// 순수 함수(테스트 대상). 지출(spend)·나누는 사람(party)·정산 환율(lrate)은 함께 짜기 여행이면 참여자 모두와 공유.
//
// 지출 하나(spend[id])
//   d      'YYYY-MM-DD' | 'before'(여행 전) | 'after'(여행 후)
//   amt    금액(그 통화 기준 정수) / cur: 'JPY' | 'KRW'
//   what   내용 / cat: CATS 키 / pay: '' | 'cash' | 'card' | 'ic'
//   by     낸 사람(party id) / split: 나눌 사람 id 목록 (null이면 모두)
//   at     적은 때(ms, 같은 날 안에서 순서)
import { convert } from './prices.js';

// 분류. 한 줄에서 분류를 고를 때 위에서부터 먼저 맞는 것 (예: '디즈니 팝콘'은 입장권보다 식비가 먼저)
export const CATS = [
  { key:'flight', label:'항공', icon:'✈️', words:['항공', '비행기', '대한항공', '아시아나', '진에어', '제주항공', '티웨이', '피치항공', '에어서울', '에어부산'] },
  { key:'stay', label:'숙소', icon:'🏨', words:['호텔', '숙소', '숙박', '료칸', '에어비앤비', '게스트하우스', '민박'] },
  { key:'move', label:'교통', icon:'🚃', words:['지하철', '전철', '메트로', 'jr', '버스', '택시', '스이카', 'suica', '파스모', 'pasmo', '교통', '기차', '신칸센', '모노레일', '리무진', '스카이라이너', '나리타익스프레스', '유리카모메', '공항철도', '주차', '기름'] },
  { key:'food', label:'식비', icon:'🍜', words:['라멘', '라면', '스시', '초밥', '우동', '소바', '돈카츠', '돈까스', '돈가스', '규동', '덮밥', '야키니쿠', '고기', '오코노미', '몬자', '타코야키', '이자카야', '밥', '식사', '아침', '점심', '저녁', '간식', '카페', '커피', '스타벅스', '음료', '맥주', '하이볼', '사케', '편의점', '세븐일레븐', '로손', '패밀리마트', '빵', '디저트', '아이스크림', '크레페', '팝콘', '도시락', '에키벤', '식당', '슈퍼', '햄버거', '맥도날드', '과자', '생수'] },
  { key:'ticket', label:'입장권', icon:'🎟️', words:['입장', '티켓', '디즈니', '유니버설', '전망대', '박물관', '미술관', '수족관', '동물원', '팀랩', '스카이트리', '타워', '체험', '투어', '공연', '지브리', '키자니아', '레고랜드', '해리포터', '조이폴리스'] },
  { key:'shop', label:'쇼핑', icon:'🛍️', words:['쇼핑', '기념품', '선물', '옷', '신발', '장난감', '굿즈', '돈키호테', '돈키', '드럭', '약국', '화장품', '유니클로', '다이소', '면세', '포켓몬센터', '피규어'] },
  { key:'etc', label:'기타', icon:'🧾', words:['유심', '이심', 'esim', '와이파이', '보험', '환전', '수수료', '코인락커', '락커'] }
];
export const PAYS = [{ key:'', label:'안 정함' }, { key:'cash', label:'현금' }, { key:'card', label:'카드' }, { key:'ic', label:'교통카드' }];
export const catOf = k => CATS.find(c => c.key === k) || CATS[CATS.length - 1];

export function categorize(text){
  const t = String(text || '').toLowerCase();
  const hit = CATS.find(c => c.words.some(w => t.includes(w)));
  return hit ? hit.key : 'etc';
}

/* ---------- 날짜 ---------- */
const pad = n => String(n).padStart(2, '0');
export const ymdOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const toDate = str => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (str, n) => { const d = toDate(str); d.setDate(d.getDate() + n); return ymdOf(d); };
const hasTrip = s => !!(s.start && s.end && s.start <= s.end);

// 여행 날짜 목록 (최대 30일)
export function tripDates(s){
  if(!hasTrip(s)) return [];
  const out = [];
  for(let d = s.start; d <= s.end && out.length < 30; d = addDays(d, 1)) out.push(d);
  return out;
}

// 날짜 → 여행 안이면 그대로, 앞이면 'before', 뒤면 'after'
function fitTrip(s, d){
  if(!hasTrip(s) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return d < s.start ? 'before' : d > s.end ? 'after' : d;
}

// 날짜를 안 적었을 때: 여행 중이면 오늘, 여행 전이면 1일차(항공·숙소·입장권은 '여행 전'), 여행 뒤면 마지막 날
export function defaultDay(s, today, cat){
  if(!hasTrip(s)) return today;
  if(today >= s.start && today <= s.end) return today;
  if(today < s.start) return ['flight', 'stay', 'ticket'].includes(cat) ? 'before' : s.start;
  return s.end;
}

export function dayLabel(s, d){
  if(d === 'before') return '여행 전';
  if(d === 'after') return '여행 후';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return '날짜 없음';
  const dt = toDate(d); const i = tripDates(s).indexOf(d);
  return `${dt.getMonth()+1}/${dt.getDate()} (${'일월화수목금토'[dt.getDay()]})${i >= 0 ? ` · ${i+1}일차` : ''}`;
}

/* ---------- 나누는 사람 ---------- */
export function partyOf(s){ return s.party && s.party.length ? s.party : [{ id:'me', name:'나' }]; }
export function defaultPayer(s){ const p = partyOf(s); return p.some(x => x.id === s.lby) ? s.lby : p[0].id; }

/* ---------- 한 줄 읽기 ---------- */
// 숫자 바로 뒤에 붙은 개수 단위 ('4장', '2명'). '1200 시부야'의 '시'는 개수가 아님
// (정규식 뒤돌아보기(?<=)는 iOS 16.3 이하 사파리에서 앱 전체가 안 열리게 해서 쓰지 않음)
const COUNT = /^(개|장|명|인분|인|그릇|잔|박|시간|시|분|번|층|살|세트|병|팩|봉지|일)(?![가-힣])/;
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "라멘 1200엔", "어제 택시 2800 카드", "아빠가 디즈니 입장권 4장 39600엔", "항공권 45만원 여행 전"
//   ctx: { today:'YYYY-MM-DD', cur:'JPY'(통화 안 적었을 때), by:기본 낸 사람 id }  + 상태 s(여행 날짜·사람)
//   → { ok:true, e:{d, amt, cur, what, cat, pay, by, split} } | { ok:false, error }
export function parseLine(text, s, ctx){
  const c = Object.assign({ today:'', cur:'JPY', by:null }, ctx);
  const raw = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if(!raw) return { ok:false, error:'' };
  let t = ` ${raw} `;
  const cut = re => { let hit = null; t = t.replace(re, (...m) => { hit = m; return ' '; }); return hit; };

  // 나누기: '따로/각자/개인' → 낸 사람 혼자 부담
  const personal = !!cut(/(따로|각자|개인\s*지출|개인)/);
  // 결제: 교통카드는 내용에 남김(분류에 씀), 카드·현금은 뺌
  let pay = '';
  if(/(스이카|파스모|suica|pasmo|교통카드|ic\s*카드)/i.test(t)) pay = 'ic';
  else if(cut(/(신용카드로|체크카드로|신용카드|체크카드|카드로|카드)/)) pay = 'card';
  else if(cut(/(현금으로|현금|캐시)/)) pay = 'cash';

  // 날짜
  let d = null;
  const rel = cut(/(그저께|그제|어제|오늘|내일)/);
  if(rel && c.today) d = addDays(c.today, { 그저께:-2, 그제:-2, 어제:-1, 오늘:0, 내일:1 }[rel[1]]);
  const nth = cut(/(\d{1,2})\s*일\s*차/);
  if(nth){ const ds = tripDates(s); const i = +nth[1] - 1; if(ds[i]) d = ds[i]; }
  const md = cut(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/) || (h => h && [h[0], h[2], h[3]])(cut(/(^|[^\d./])(\d{1,2})\/(\d{1,2})(?![\d/])/));
  if(md){
    const m = +md[1], dd = +md[2];
    if(m >= 1 && m <= 12 && dd >= 1 && dd <= 31){
      const years = hasTrip(s) ? [...new Set([s.start.slice(0, 4), s.end.slice(0, 4)])] : [(c.today || '2000').slice(0, 4)];
      const cand = years.map(y => `${y}-${pad(m)}-${pad(dd)}`);
      d = cand.find(x => hasTrip(s) && x >= s.start && x <= s.end) || cand[0];
    }
  }
  if(cut(/(여행\s*전|출발\s*전|사전\s*결제|미리)/)) d = 'before';
  else if(cut(/(여행\s*후|귀국\s*후|다녀와서)/)) d = 'after';
  t = t.replace(/\d{1,2}:\d{2}/g, ' ');   // 시각은 금액으로 읽지 않음

  // 낸 사람: 나누는 사람 이름 (긴 이름부터, 단어 단위로. '나'가 '나카미세'에 걸리지 않게)
  let by = null;
  partyOf(s).slice().sort((a, b) => b.name.length - a.name.length).some(p => {
    if(!p.name) return false;
    const re = new RegExp(`\\s${esc(p.name)}(?:이가|께서|가|이|는|은)?(?=\\s)`);
    if(re.test(t)){ by = p.id; t = t.replace(re, ' '); return true; }
    return false;
  });
  t = t.replace(/\s(냄|냈음|냈어|계산|결제|지불)(?=\s)/g, ' ');

  // 곱하기: 'x3', '×3'
  const mul = cut(/[x×*]\s*(\d{1,2})(?!\d)/i);

  // 만·천 단위를 숫자로 ('1만2천' → 12000). 만을 쓴 금액은 원화로 봄('항공권 45만')
  t = t.replace(/(\d+(?:\.\d+)?)\s*만\s*(\d+(?:\.\d+)?)\s*천/g, (m, a, b) => `${Math.round(a * 10000 + b * 1000)}§`)
       .replace(/(\d+(?:\.\d+)?)\s*만\s*(\d{1,4})(?![\d.])/g, (m, a, b) => `${Math.round(a * 10000 + +b)}§`)
       .replace(/(\d+(?:\.\d+)?)\s*만/g, (m, a) => `${Math.round(a * 10000)}§`)
       .replace(/(\d+(?:\.\d+)?)\s*천(?!원)/g, (m, a) => `${Math.round(a * 1000)}`)
       .replace(/(\d+(?:\.\d+)?)\s*천원/g, (m, a) => `${Math.round(a * 1000)}원`);

  // 금액 후보: 통화를 붙인 것 > 만 단위 > 가장 큰 수. '4장', '2명' 같은 개수는 빼고 기억
  const AMT = /([¥₩]|jpy|krw)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(§)?\s*(엔|円|원|yen|jpy|krw|won)?(\s*씩)?/gi;
  const cands = []; let count = 0; let m;
  while((m = AMT.exec(t))){
    const v = parseFloat(m[2].replace(/,/g, '')); const sym = (m[1] || m[4] || '').toLowerCase();
    if(!sym && !m[3] && COUNT.test(t.slice(m.index + m[0].length))){ if(!count) count = v; continue; }
    if(!(v > 0)) continue;
    const cur = /[¥엔円]|yen|jpy/.test(sym) ? 'JPY' : /[₩원]|krw|won/.test(sym) ? 'KRW' : m[3] ? 'KRW' : '';
    cands.push({ v, cur, rank:sym ? 2 : m[3] ? 1 : 0, each:!!m[5], at:m.index, len:m[0].length });
  }
  if(!cands.length) return { ok:false, error:'금액을 못 찾았어요. "라멘 1200엔"처럼 숫자를 넣어 주세요.' };
  const a = cands.reduce((x, y) => (y.rank > x.rank || (y.rank === x.rank && y.v > x.v)) ? y : x);
  t = t.slice(0, a.at) + ' ' + t.slice(a.at + a.len);
  let amt = a.v * (mul ? +mul[1] : a.each && count ? count : 1);
  const cur = a.cur || c.cur;
  amt = Math.round(amt);
  if(!(amt > 0) || amt >= 1e9) return { ok:false, error:'금액이 너무 크거나 작아요. 숫자를 확인해 주세요.' };

  const cat = categorize(raw);
  const what = t.replace(/[,·~§]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(에|로|으로|를|을)\s|\s(에|로|으로|를|을)$/g, '').trim().slice(0, 40) || catOf(cat).label;
  by = by || c.by || partyOf(s)[0].id;
  return { ok:true, e:{ d:fitTrip(s, d || defaultDay(s, c.today, cat)), amt, cur, what, cat, pay, by, split:personal ? [by] : null } };
}

// 장소에서 바로 적은 지출: 장소 id(pl)를 달고, 내용이 비었으면(분류 이름뿐이면) 장소 이름으로,
// 분류를 못 정했으면 장소 종류로 (테마파크·전망대 → 입장권, 먹거리 → 식비, 쇼핑·거리 → 쇼핑)
const KIND_CAT = { '테마파크':'ticket', '전망대':'ticket', '박물관·미술관':'ticket', '수족관·동물원':'ticket', '체험·캐릭터':'ticket',
  '먹거리':'food', '쇼핑':'shop', '거리·시장':'shop' };
export function atPlace(e, p){
  if(!e || !p) return e;
  const out = Object.assign({}, e, { pl:p.id });
  if(out.cat === 'etc' && KIND_CAT[p.kind]) out.cat = KIND_CAT[p.kind];
  if(!e.what || e.what === catOf(e.cat).label) out.what = String(p.name || '').slice(0, 40) || catOf(out.cat).label;
  return out;
}

/* ---------- 금액 보여 주기 ---------- */
export function money(v, cur){
  const n = Math.round(v).toLocaleString('ko-KR');
  return cur === 'JPY' ? `¥${n}` : `${n}원`;
}
export const rateOf = s => (s.lrate > 0 ? s.lrate : s.fx && s.fx.rate > 0 ? s.fx.rate : 0);

// 한 줄 미리보기: '식비 · 라멘 · ¥1,200 · 3/7 (일) · 1일차 · 나 · 카드'
export function previewText(s, e){
  const p = partyOf(s).find(x => x.id === e.by); const pay = e.pay ? (PAYS.find(x => x.key === e.pay) || {}).label : '';
  return [catOf(e.cat).label, e.what, money(e.amt, e.cur), dayLabel(s, e.d), p ? `${p.name} 냄` : '', pay, e.split ? '혼자 부담' : '']
    .filter(Boolean).join(' · ');
}

// 한 줄 칸 아래 안내: 아무것도 안 쓰면 어떻게 적히는지
export function ledgerHint(s, ctx){
  const p = partyOf(s); const who = p.length > 1 ? (p.find(x => x.id === (ctx.by || defaultPayer(s))) || p[0]).name : '';
  return `날짜를 안 쓰면 ${dayLabel(s, defaultDay(s, ctx.today, 'food'))}, 통화를 안 쓰면 ${ctx.cur === 'JPY' ? '엔화' : '원화'}${who ? `, 낸 사람을 안 쓰면 ${who}` : ''}로 적어요.`;
}

/* ---------- 합계·정산 ---------- */
export function entries(s){
  return Object.entries(s.spend || {}).filter(([, e]) => e && e.amt > 0)
    .map(([id, e]) => Object.assign({ id }, e))
    .sort((a, b) => (a.at || 0) - (b.at || 0));
}

// 합계 통화: 환율이 있으면 원화, 없으면 지출이 모두 엔화일 때만 엔화(원화와 섞이면 바꿀 수 없는 것은 따로 셈)
export function ledgerSummary(s){
  const list = entries(s); const rate = rateOf(s);
  const base = rate > 0 || !list.length || list.some(e => e.cur === 'KRW') ? 'KRW' : 'JPY';
  const val = e => convert(e.amt, e.cur, base, rate);
  const party = partyOf(s); const ids = party.map(p => p.id);
  const byCur = { JPY:0, KRW:0 }; const byCat = {}; const byPay = {}; const paid = {}; const owe = {};
  ids.forEach(id => { paid[id] = 0; owe[id] = 0; });
  let total = 0, missing = 0;
  list.forEach(e => {
    byCur[e.cur] = (byCur[e.cur] || 0) + e.amt;
    const v = val(e); if(v == null){ missing++; return; }
    total += v;
    byCat[e.cat] = (byCat[e.cat] || 0) + v;
    byPay[e.pay || ''] = (byPay[e.pay || ''] || 0) + v;
    const payer = ids.includes(e.by) ? e.by : ids[0];
    paid[payer] += v;
    const sp = (e.split || []).filter(id => ids.includes(id)); const who = sp.length ? sp : ids;
    who.forEach(id => { owe[id] += v / who.length; });
  });
  // 날짜별 묶음: 여행 전 → 여행 날짜 → (여행 밖 날짜) → 여행 후
  const order = ['before'].concat(tripDates(s), [...new Set(list.map(e => e.d).filter(d => /^\d{4}/.test(d) && !tripDates(s).includes(d)))].sort(), ['after']);
  const groups = order.map(d => { const items = list.filter(e => e.d === d); return { d, items, total:items.reduce((n, e) => n + (val(e) || 0), 0) }; })
    .filter(g => g.items.length);
  const odd = list.filter(e => !order.includes(e.d)); if(odd.length) groups.push({ d:'', items:odd, total:odd.reduce((n, e) => n + (val(e) || 0), 0) });
  const people = party.map(p => ({ id:p.id, name:p.name, paid:paid[p.id], owe:owe[p.id], bal:paid[p.id] - owe[p.id] }));
  return { base, rate, total, count:list.length, missing, byCur,
    byCat:CATS.filter(c => byCat[c.key]).map(c => ({ key:c.key, label:c.label, icon:c.icon, value:byCat[c.key] })).sort((a, b) => b.value - a.value),
    byPay, groups, people, transfers:settle(people.map(p => ({ id:p.id, v:p.bal }))), val };
}

// 받을 돈(+)·줄 돈(-) → 보내기 목록 (큰 것끼리 먼저 맞춰 횟수를 줄임).
// 먼저 정수로 반올림하고 남는 1~2원은 차이가 가장 큰 사람에게 몰아서, 보내는 돈과 받는 돈의 합이 딱 맞게
export function settle(bal){
  const r = bal.map(b => ({ id:b.id, v:Math.round(b.v) }));
  const off = r.reduce((n, b) => n + b.v, 0);
  if(off && r.length) r.reduce((m, b) => Math.abs(b.v) > Math.abs(m.v) ? b : m).v -= off;
  const cr = r.filter(b => b.v > 0).sort((a, b) => b.v - a.v);
  const db = r.filter(b => b.v < 0).map(b => ({ id:b.id, v:-b.v })).sort((a, b) => b.v - a.v);
  const out = []; let i = 0, j = 0;
  while(i < db.length && j < cr.length){
    const x = Math.min(db[i].v, cr[j].v);
    out.push({ from:db[i].id, to:cr[j].id, amt:x });
    db[i].v -= x; cr[j].v -= x;
    if(!db[i].v) i++;
    if(!cr[j].v) j++;
  }
  return out;
}

// 이 사람이 쓰인 지출이 있는지 (있으면 빼지 못함)
export function personUsed(s, id){ return entries(s).some(e => e.by === id || (e.split || []).includes(id)); }

// 같은 순간에 두 번 눌러도 겹치지 않게 뒤에 무작위 글자
export const newSpendId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const newPersonId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
