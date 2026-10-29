// 가계부 예산. 여행 전체 예산(원)과 분류별 예산, 쓴 돈·남은 돈·하루에 쓸 수 있는 돈.
// 순수 함수(테스트 대상). 예산(budget)은 가계부처럼 함께 짜기 여행이면 참여자 모두와 공유.
//
// s.budget = { total: 원(0이면 안 정함), cats: { food: 원, ... } }   (옛 데이터엔 없음 → 안 정함)
// 엔으로 적은 지출은 가계부 합계와 같은 환율(rateOf: 정산 환율 > 받아 온 환율)로 원화로 바꿔 셈
import { CATS, entries, ratesOf, tripDates } from './ledger.js';
import { convert } from './prices.js';

const MAX = 1e10;
const won = v => Math.max(0, Math.round(+v || 0));

// 저장된 예산 → 늘 같은 모양 (없는 칸·이상한 값은 0, 모르는 분류는 버림)
export function budgetOf(s){
  const b = (s && s.budget) || {}; const cats = {};
  CATS.forEach(c => { const v = won(b.cats && b.cats[c.key]); if(v > 0 && v < MAX) cats[c.key] = v; });
  const total = won(b.total);
  return { total:total < MAX ? total : 0, cats };
}

// 예산 칸에 적은 글 → 원: '2,000,000', '200만', '200만원', '1만5천', '150만 원'. 못 읽으면 0
export function parseWon(text){
  let t = String(text == null ? '' : text).replace(/[\s,원₩]/g, '');
  if(!t) return 0;
  t = t.replace(/(\d+(?:\.\d+)?)만(\d+(?:\.\d+)?)천/, (m, a, b) => String(a * 10000 + b * 1000))
       .replace(/(\d+(?:\.\d+)?)만(\d{1,4})$/, (m, a, b) => String(a * 10000 + +b))
       .replace(/(\d+(?:\.\d+)?)만$/, (m, a) => String(a * 10000))
       .replace(/(\d+(?:\.\d+)?)천$/, (m, a) => String(a * 1000));
  if(!/^\d+(?:\.\d+)?$/.test(t)) return 0;
  const v = Math.round(+t);
  return v > 0 && v < MAX ? v : 0;
}

// 짧게: 2000000 → '200만원', 125000 → '12.5만원', 8500 → '8,500원'
export function manwon(v){
  const n = Math.round(v); const a = Math.abs(n);
  if(a < 10000) return `${n.toLocaleString('ko-KR')}원`;
  const m = Math.round(n / 1000) / 10;
  return `${m.toLocaleString('ko-KR')}만원`;
}

// 많이 썼는지: 'ok' | 'near'(90% 이상) | 'over'(넘음)
const levelOf = (spent, budget) => spent > budget ? 'over' : spent >= budget * 0.9 ? 'near' : 'ok';

// 예산 계산. today: 'YYYY-MM-DD' (하루에 쓸 수 있는 돈을 셀 기준)
//   → { on:false } (예산 없음) | { on, total, spent, left, pct, level, missing, phase, daysLeft, perDay, todaySpent, todayLeft, cats, catOver }
//   phase: 'none'(여행 날짜 없음) | 'before' | 'during' | 'after'
//   perDay: 남은 날 하루에 쓸 수 있는 돈. 여행 중에는 오늘 쓴 돈을 빼기 전 값이라 하루 동안 안 바뀜(todayLeft = perDay - 오늘 쓴 돈)
export function budgetView(s, today){
  const b = budgetOf(s); const catSum = Object.values(b.cats).reduce((n, v) => n + v, 0);
  const total = b.total || catSum;
  if(!total) return { on:false };
  const rate = ratesOf(s); const days = tripDates(s);
  let spent = 0, missing = 0, todaySpent = 0; const byCat = {};
  entries(s).forEach(e => {
    const v = convert(e.amt, e.cur, 'KRW', rate); if(v == null){ missing++; return; }
    spent += v; byCat[e.cat] = (byCat[e.cat] || 0) + v;
    if(today && e.d === today) todaySpent += v;
  });
  spent = Math.round(spent); todaySpent = Math.round(todaySpent);
  const left = total - spent;
  const phase = !days.length ? 'none' : today < days[0] ? 'before' : today > days[days.length - 1] ? 'after' : 'during';
  let daysLeft = 0, perDay = null, todayLeft = null;
  if(phase === 'before'){ daysLeft = days.length; perDay = Math.max(0, Math.floor(left / daysLeft)); }
  else if(phase === 'during'){
    daysLeft = days.filter(d => d >= today).length;
    perDay = Math.max(0, Math.floor((left + todaySpent) / daysLeft));
    todayLeft = perDay - todaySpent;
  }
  const cats = CATS.filter(c => b.cats[c.key]).map(c => {
    const sp = Math.round(byCat[c.key] || 0); const bu = b.cats[c.key];
    return { key:c.key, label:c.label, icon:c.icon, budget:bu, spent:sp, left:bu - sp, pct:Math.round(sp / bu * 100), level:levelOf(sp, bu) };
  });
  return { on:true, total, fromCats:!b.total, spent, left, pct:Math.round(spent / total * 100), level:levelOf(spent, total), missing,
    phase, daysLeft, perDay, todaySpent, todayLeft, cats, catOver:b.total && catSum > b.total ? catSum - b.total : 0 };
}

// 화면에 보여 줄 문장. 넘어도 빨간 경고 대신 부드럽게
export function budgetLines(v){
  if(!v || !v.on) return { head:'', day:'' };
  const head = v.level === 'over'
    ? `예산보다 ${manwon(-v.left)} 더 썼어요.${v.phase === 'before' || v.phase === 'during' ? ' 남은 날은 조금 가볍게 써 볼까요?' : ''}`
    : v.level === 'near' ? `예산의 ${v.pct}%를 썼어요. ${manwon(v.left)} 남았어요.`
    : `${manwon(v.left)} 남았어요.`;
  let day = '';   // 이미 넘었으면 하루 몫은 말하지 않음
  if(v.level === 'over') return { head, day };
  if(v.phase === 'before' && v.perDay > 0) day = `여행 ${v.daysLeft}일 동안 하루에 ${manwon(v.perDay)}씩 쓸 수 있어요.`;
  else if(v.phase === 'during' && v.perDay > 0) day = `오늘 포함 ${v.daysLeft}일 남았어요. 하루에 ${manwon(v.perDay)}씩 쓸 수 있고, `
    + (v.todayLeft >= 0 ? `오늘은 ${manwon(v.todayLeft)} 남았어요.` : `오늘은 하루 몫보다 ${manwon(-v.todayLeft)} 더 썼어요.`);
  return { head, day };
}

// 분류 한 줄: '12.5만 / 30만원'
export function catLine(c){ return `${manwon(c.spent).replace(/원$/, '')} / ${manwon(c.budget)}`; }

// 예산 칸 고치기: which 'total' 또는 분류 키, 값은 원(0이면 지움). 새 예산 객체를 돌려줌
export function setBudget(s, which, value){
  const b = budgetOf(s); const v = won(value) < MAX ? won(value) : 0;
  if(which === 'total') b.total = v;
  else if(CATS.some(c => c.key === which)){ if(v > 0) b.cats[which] = v; else delete b.cats[which]; }
  return b;
}
