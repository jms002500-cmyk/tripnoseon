// 오늘 하루 화면 계산. 여행 중 앱을 열면 오늘 날짜의 일정·다음 장소·그날 예약·쓴 돈을 바로 보여 줌.
// 순수 함수(테스트 대상). 화면은 views.js의 vToday, 이벤트는 app.js.
//   다녀옴 표시(s.tdone)는 기기마다 따로 둠(함께 짜기로 공유하지 않음): { 'YYYY-MM-DD|장소id': true }
import { sortVault } from './vault.js';

const toDate = str => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m-1, d); };
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);

// 여행 날짜 기준 지금이 어디쯤인지
//   phase: 'none'(날짜 없음) | 'before'(출발 전) | 'during'(여행 중) | 'after'(다녀온 뒤)
//   index: 여행 중이면 오늘이 몇 번째 날(0부터), dday: 출발까지 남은 날
export function phaseOf(s, today){
  if(!s.start || !s.end || s.start > s.end) return { phase:'none', index:-1, dday:null, n:0 };
  const n = daysBetween(s.start, s.end) + 1;
  if(today < s.start) return { phase:'before', index:-1, dday:daysBetween(today, s.start), n };
  if(today > s.end) return { phase:'after', index:-1, dday:null, n };
  return { phase:'during', index:daysBetween(s.start, today), dday:0, n };
}

// 보여 줄 날: 고른 날 > 여행 중이면 오늘 > 출발 전이면 첫날 > 다녀온 뒤면 마지막 날
export function dayToShow(s, today, pick, count){
  const n = count || 0; if(!n) return -1;
  if(pick != null && pick >= 0 && pick < n) return pick;
  const ph = phaseOf(s, today);
  if(ph.phase === 'during') return Math.min(ph.index, n - 1);
  if(ph.phase === 'after') return n - 1;
  return 0;
}

// 오늘 화면에서 보고 있는 날짜 'YYYY-MM-DD' (일정 초안과 같이 최대 10일)
export function shownDate(s, today){
  const ph = phaseOf(s, today); const i = dayToShow(s, today, s.tday, Math.min(ph.n, 10)); if(i < 0) return '';
  const d = toDate(s.start); d.setDate(d.getDate() + i);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 처음 열었을 때 오늘 화면을 자동으로 띄울지: 여행 중이고 오늘 아직 자동으로 안 열었으면
export function shouldAutoOpen(s, today){ return phaseOf(s, today).phase === 'during' && s.todayOpened !== today; }

export const doneKey = (date, id) => `${date}|${id}`;

// 다음에 갈 곳: 다녀옴 표시가 없는 첫 장소의 순서(없으면 -1)
export function nextStopIndex(stops, date, done){
  const d = done || {};
  return stops.findIndex(p => !d[doneKey(date, p.id)]);
}

// 다음 장소로 가는 길의 출발점: 바로 앞 장소를 다녀왔으면 그곳, 아니면 숙소
export function fromFor(stops, i, hotel){ return i > 0 ? stops[i - 1] : hotel; }

// 그날 꺼내 볼 예약: 그날 날짜인 것 + 그날 가는 장소에 연결된 것(날짜를 안 적은 입장권 등). 시간순
export function dayVault(vault, date, placeIds){
  const ids = new Set(placeIds || []);
  return sortVault((vault || []).filter(it => it.date === date || (!it.date && it.placeId && ids.has(it.placeId))));
}

// 그날 날씨: 예보가 있으면 예보, 없으면 이맘때 평균
export function dayWeather(wx, date){
  if(!wx) return null;
  const f = (wx.forecast || []).find(x => x.date === date);
  if(f) return { kind:'forecast', text:f.text, hi:f.hi, lo:f.lo, rain:f.rain };
  if(wx.climate) return { kind:'climate', hi:wx.climate.hi, lo:wx.climate.lo, rainPct:wx.climate.rainPct, mean:wx.climate.mean };
  return null;
}

// 머리 문구: '출발 D-40 · 첫날 미리 보기' / '여행 2일째 · 5일 중' / '다녀온 여행'
export function phaseText(ph, shownIndex){
  if(ph.phase === 'before') return `출발 D-${ph.dday} · ${shownIndex + 1}일차 미리 보기`;
  if(ph.phase === 'during') return shownIndex === ph.index ? `여행 ${ph.index + 1}일째 · ${ph.n}일 중` : `오늘은 ${ph.index + 1}일차 · ${shownIndex + 1}일차를 보고 있어요`;
  if(ph.phase === 'after') return '다녀온 여행이에요. 가계부·정산을 마무리해 보세요.';
  return '';
}
