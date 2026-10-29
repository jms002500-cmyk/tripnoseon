// 동선 위 식당 찾기. 그날 동선에서 점심·저녁 때 있을 곳을 정하고, 그 근처 식당을 구글 장소 검색(gmap.js nearbyFood)으로
// 받아 그 시간 영업 여부·평점·걸어서 몇 분과 함께 보여 줌. 순수 함수(테스트 대상). 네트워크는 gmap.js.
// (2026-10-27 OpenStreetMap Overpass로 먼저 해 봤지만 공개 서버가 자주 응답하지 않아 구글로 바꿈)
import { openAtPeriods } from './gplace.js';

export const RADIUS = 500;         // 미터. 아이와 걸어서 7분 안팎
const WALK_M_PER_MIN = 75;
export const walkMin = km => Math.max(1, Math.round(km * 1000 / WALK_M_PER_MIN));

// 하루 일정 → 끼니 자리. 시작 10시(도착하는 날은 14시), 장소 사이 이동 30분으로 셈
//   점심: 12:30에 있을(또는 막 나온) 장소 근처 / 저녁: 마지막 장소 근처(없으면 숙소)
//   하루 종일 장소(디즈니)는 그 안에서 먹으니 점심은 빼고 저녁만 숙소 근처
export function mealSlots(day, hotel, home){
  home = home || hotel;   // 저녁 뒤 돌아갈 숙소 (나눠 자는 날은 다를 수 있음)
  const out = [];
  if(day.full){ out.push({ meal:'dinner', time:'18:30', at:home, why:`${day.full.name} 다녀온 뒤 숙소 근처` }); return out; }
  const items = day.items || [];
  const start = day.kind === 'arrive' ? 14 : 10;
  if(day.kind !== 'arrive' && items.length){
    let t = start, at = items[0];
    for(const p of items){ if(t >= 12.5) break; at = p; t += p.hours + 0.5; }
    out.push({ meal:'lunch', time:'12:30', at, why:`${at.name} 근처` });
  } else if(day.kind !== 'arrive') out.push({ meal:'lunch', time:'12:30', at:hotel, why:'숙소 근처' });
  if(day.kind !== 'depart'){
    const last = items.length ? items[items.length - 1] : home;
    out.push({ meal:'dinner', time:'18:30', at:last, why:items.length ? `${last.name} 근처` : '숙소 근처' });
  }
  return out;
}

// 보여 줄 순서: 그 시간 영업 확실 > 모름 > 안 엶(맨 뒤). 같은 무리 안에서는 평점(리뷰가 적으면 덜 믿음) > 가까운 순
//   식당 하나: { id, name, lat, lng, km, cuisine, rating, ratingN, periods, mapsUrl }
export function rankFood(list, wd, time, limit){
  const grp = o => o === true ? 0 : o === null ? 1 : 2;
  const score = r => (r.rating || 0) * Math.min(1, Math.log10((r.ratingN || 0) + 1) / 2);   // 리뷰 100개 이상이면 평점 그대로
  return list.map(r => Object.assign({ open:openAtPeriods(r.periods, wd, time) }, r))
    .sort((a, b) => grp(a.open) - grp(b.open) || score(b) - score(a) || a.km - b.km).slice(0, limit || 8);
}

// 구글 지도에서 그 자리 근처 식당 더 보기 (검색어는 일본어가 결과가 많음)
export function moreFoodUrl(pt, meal){
  return `https://www.google.com/maps/search/${encodeURIComponent(meal === 'lunch' ? 'ランチ' : 'ディナー')}/@${(+pt.lat).toFixed(5)},${(+pt.lng).toFixed(5)},17z`;
}
export const foodKey = pt => `${(+pt.lat).toFixed(3)},${(+pt.lng).toFixed(3)}`;   // 약 100m 안은 같은 자리로 봄
