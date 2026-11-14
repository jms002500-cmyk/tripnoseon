// 늦었을 때 남은 일정 다시 맞추기 (오늘 화면). 지금 시각부터 남은 곳을 다 돌면 언제 끝나는지 보고,
// 그날 끝(보통 날 끝 시각, 마지막 날은 공항 가러 나서기 30분 전)을 넘기면 꼭 갈 곳이 아닌 곳부터 뒤에서 빼서 뒷날로 옮기길 권함.
// 순수 함수(테스트 대상). 화면은 views.js vToday, 옮기기는 app.js(오늘 남기는 곳은 오늘에 고정 → 다른 날이 다시 섞여도 오늘은 그대로).
import { legMinutes } from './transit.js';
import { dayEnd } from './flight.js';
import { PACE, cityOfArea } from './data.js';
import { placeCity, closedOn, lateOf, LATE_AT, NIGHT_END } from './logic.js';
import { doneKey } from './today.js';

export const dayEndMin = (s, d) => d.depart && d.depart.leave >= 0 ? d.depart.leave - 30 : dayEnd(PACE[s.pace].hours);
export const EVE_END = 21 * 60;   // 늦었다고 보는 기준: 밤 9시 (저녁 곳이 있는 날은 9시 반). 한 곳을 옮긴 뒤 기준이 줄어 또 경고하지 않게 보통 하루 끝보다 이르게 잡지 않음

// 옮길 날: 뒷날 중 첫 번째로 들어갈 수 있는 날 (확정·하루 종일·휴무·다른 도시에서 자는 날은 빼고). extra: 이미 옮기기로 한 시간 { 날 번호: 시간 }
export function moveTarget(s, P, di, p, extra){
  const add = extra || {};
  for(let j = di + 1; j < P.days.length; j++){
    const x = P.days[j]; if(x.full || x.locked) continue;
    if(x.used + (add[j] || 0) + p.hours > x.cap + 0.01) continue;
    if(closedOn(p, x)) continue;
    const c = placeCity(p); const cs = new Set([x.from, x.to].map(h => h && h.key ? cityOfArea(h.key) : '').filter(Boolean));
    if(c && cs.size && !cs.has(c)) continue;
    return j;
  }
  return null;
}

// now: 지금 현지 시각(분). → { left, keep, drop:[{ p, to }], finish, allFinish, end } | null(남은 곳 없음·하루 종일 날)
export function catchUp(s, P, di, date, now){
  const d = P.days[di]; if(!d || d.full) return null;
  const done = s.tdone || {}; const isDone = p => !!done[doneKey(date, p.id)];
  const left = d.items.filter(p => !isDone(p)); if(!left.length) return null;
  const last = d.items.filter(isDone).pop(); const from = last || d.from;   // 마지막으로 다녀온 곳(없으면 숙소)에서 출발
  // 저녁 곳(야시장·야경)은 그 시각 전에 닿으면 기다렸다가 (그 사이 저녁 먹기)
  const need = list => { let t = 0, prev = from; list.forEach(p => { t += prev ? legMinutes(prev, p) : 0; if(lateOf(p) === 2 && now + t < LATE_AT[2]) t = LATE_AT[2] - now; t += Math.round(p.hours * 60); prev = p; }); return t; };
  const fly = d.depart && d.depart.leave >= 0;
  const end = fly ? dayEndMin(s, d) : Math.max(dayEndMin(s, d), left.some(p => lateOf(p) === 2) ? NIGHT_END : EVE_END); const keep = left.slice(); const out = [];
  // 뺄 순서: 낮에는 꼭 갈 곳이 아닌 곳부터 뒤에서. 저녁(17시 뒤)에는 낮에만 갈 수 있는 곳부터 빼고, 해 질 녘·저녁 곳은 가장 늦게 가는 곳을 남김
  const evening = now >= 17 * 60;
  const tier = p => (evening && lateOf(p) >= 1 ? 2 : 0) + (s.must[p.id] ? 1 : 0);
  while(keep.length && now + need(keep) > end){
    let k = -1, bt = Infinity;
    for(let j = keep.length - 1; j >= 0; j--){ const x = tier(keep[j]); if(x < bt || (evening && x === bt)){ bt = x; k = j; } }
    out.push(keep.splice(k, 1)[0]);
  }
  out.sort((a, b) => left.indexOf(a) - left.indexOf(b));
  const extra = {};
  const drop = out.map(p => { const to = moveTarget(s, P, di, p, extra); if(to != null) extra[to] = (extra[to] || 0) + p.hours; return { p, to }; });
  return { left, keep, drop, finish:now + need(keep), allFinish:now + need(left), end };
}

// 옮기기 적용: 오늘 남기는 곳·다녀온 곳은 오늘에 고정하고 오늘을 확정(비운 시간에 다른 곳이 자동으로 끼어들지 않게).
//   moves { 장소 id: 날 번호 | -1(빼기) } → { assign, dlock }
export function applyCatchUp(s, P, di, moves){
  const assign = Object.assign({}, s.assign);
  P.days[di].items.forEach(p => { if(!(p.id in moves)) assign[p.id] = di; });
  Object.entries(moves).forEach(([id, j]) => { assign[id] = j; });
  return { assign, dlock:Object.assign({}, s.dlock, { [P.days[di].key]:true }) };
}
