// 비 오는 날 실내 대안. 예보(출발 16일 안)에 비가 있으면 그날 실외 장소마다 가까운 실내 장소를 제안하고,
// 하루 종일 장소(디즈니)는 비 안 오는 날로 옮기기를 제안. 예보가 없을 때도 '비 오면?'으로 미리 볼 수 있음.
// 순수 함수(테스트 대상). 장소의 실내 표시는 data.js PLACES의 indoor (true | 'part' | false).
import { allPlaces, pickedPlaces, dist, fitScore } from './logic.js';

const RAIN_WORDS = ['비', '이슬비', '소나기', '뇌우', '눈', '눈 소나기'];

// 예보 하나가 비 오는 날인지: 비 올 확률 50% 이상이거나 날씨 글자가 비·눈
export function isRainy(f){ return !!f && ((f.rain != null && f.rain >= 50) || RAIN_WORDS.includes(f.text)); }

// 그날 예보 → { rainy, prob, text } | null(예보 없음)
export function dayRain(wx, date){
  const f = wx && (wx.forecast || []).find(x => x.date === date);
  return f ? { rainy:isRainy(f), prob:f.rain, text:f.text } : null;
}

// 그날 비를 맞는 곳: 실외 + 반쯤 실외 (직접 담은 곳은 실내인지 몰라서 뺌)
export function outdoorStops(day){ return (day.items || []).filter(p => p.indoor === false || p.indoor === 'part'); }

// 실외 장소 하나의 실내 대안 (가까운 순, 최대 limit개)
//   후보: 실내 + 하루 종일 아님 + 그날 휴무 아님 + 아직 다른 날 일정에 없는 곳(일정에 있으면 그날 일정이 흔들려서)
//   아이 동반이면 어른 취향 골목은 빼고, 동행·취향에 안 맞으면 뒤로
export function indoorAlternatives(s, P, dayIndex, place, limit){
  const d = P.days[dayIndex]; if(!d) return [];
  const onPlan = new Set(P.days.flatMap(x => x.items.map(p => p.id).concat(x.full ? [x.full.id] : [])));
  const kids = s.who === 'family' && (s.kids || []).length;
  return allPlaces(s)
    .filter(p => p.indoor === true && !p.full && p.id !== place.id && !onPlan.has(p.id))
    .filter(p => !(p.closed && p.closed.includes(d.wd)))
    .filter(p => !(kids && p.kid === 'adult'))
    .map(p => {
      const km = dist(place, p); const fit = fitScore(p, s);
      // 전망대는 실내여도 비 오면 경치가 안 보여서 뒤로
      return { p, km, why:fit.why, cost:km + (fit.score < 0 ? 3 : 0) - Math.min(fit.score, 4) * 0.3 + Math.abs(p.hours - place.hours) * 0.3 + (p.kind === '전망대' ? 3 : 0) };
    })
    .sort((a, b) => a.cost - b.cost)
    .slice(0, limit || 3);
}

// 하루 종일 장소가 비 오는 날에 걸렸으면, 예보상 비가 안 오는 다른 날(온종일 쓸 수 있는 날) 중 가장 맑은 날
export function betterFullDay(P, wx, dayIndex){
  const cur = P.days[dayIndex]; if(!cur || !cur.full) return null;
  const date = d => { const x = d.date; return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const opts = P.days.filter(d => d.i !== dayIndex && !d.full && !d.locked && (d.kind === 'full' || d.kind === 'single'))
    .map(d => ({ d, r:dayRain(wx, date(d)) })).filter(x => x.r && !x.r.rainy)
    .sort((a, b) => (a.r.prob ?? 100) - (b.r.prob ?? 100) || (a.d.wd >= 1 && a.d.wd <= 5 ? 0 : 1) - (b.d.wd >= 1 && b.d.wd <= 5 ? 0 : 1));
  return opts.length ? { i:opts[0].d.i, prob:opts[0].r.prob, label:opts[0].d.label } : null;
}

// 바꾸기: 실외 장소는 '빼두기'로, 실내 장소를 그날에 넣음. 되돌리기용으로 바꾸기 전 값을 돌려줌
export function swapPlan(s, outId, inId, dayIndex){
  const undo = { outId, inId, aOut:s.assign[outId], pIn:!!s.picked[inId], aIn:s.assign[inId] };
  s.assign[outId] = -1; s.picked[inId] = true; s.assign[inId] = dayIndex;
  return undo;
}
export function undoSwap(s, u){
  if(u.aOut === undefined) delete s.assign[u.outId]; else s.assign[u.outId] = u.aOut;
  if(u.aIn === undefined) delete s.assign[u.inId]; else s.assign[u.inId] = u.aIn;
  if(!u.pIn) delete s.picked[u.inId];
}

// 담은 곳 중 실내 비율 (일정 단계 위 안내용)
export function indoorShare(s){
  const ps = pickedPlaces(s).filter(p => p.indoor !== undefined && !p.full);
  return { indoor:ps.filter(p => p.indoor === true).length, total:ps.length };
}
