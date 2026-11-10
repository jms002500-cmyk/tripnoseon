// 내 주변 가볼 만한 곳: 지금 위치(이 폰 안에서만 씀, 남기지도 보내지도 않음) → 앱이 가진 장소·가족 식당 중 가까운 곳.
//   예상 못 한 곳에 와도 누르면 바로 보여 주려고. 인터넷 없이 됨(위치는 폰 GPS). 순수 함수(테스트 대상), DOM·네트워크를 건드리지 않음
import { dist, fitScore, lateOf } from './logic.js';
import { walkMin } from './food.js';
import { eatsNear } from './eats.js';

export const NEAR_STEPS = [1, 2, 4];   // km: 이 안에 3곳 넘게 있을 때까지 넓힘 (없으면 가장 가까운 곳 몇 개)
export const WALK_KM = 1.5;            // 이보다 멀면 걸어서보다 지하철·택시
const ok = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);

// places: 장소(지역 자료 + 직접 담은 곳), eats: 가족 식당, s: 상태(담은 곳·동행 맞춤), wd: 현지 요일, hour: 현지 시(0~23)
//   → { radius(km, 못 찾으면 null), far(앱 장소가 4km 밖뿐), items:[{ p, km, walk, byWalk, off(오늘 쉼), night, why, picked }], eats:[...] }
export function nearbyOf({ places, eats, s, pt, wd, hour, limit = 8 }){
  if(!ok(pt)) return null;
  const here = { lat:+pt.lat, lng:+pt.lng };
  const seen = new Set();
  const all = (places || []).filter(p => ok(p) && !seen.has(p.id) && seen.add(p.id)).map(p => ({ p, km:dist(here, p) }));
  const radius = NEAR_STEPS.find(r => all.filter(x => x.km <= r).length >= 3) || null;
  const pool = radius ? all.filter(x => x.km <= radius) : all.slice().sort((a, b) => a.km - b.km).slice(0, 5);
  const night = h => h >= 17 || h < 4; const day = Number.isFinite(hour) && hour >= 4 && hour < 16;
  const items = pool.map(({ p, km }) => {
    const f = s ? fitScore(p, s) : { why:[] };
    return { p, km, walk:walkMin(km), byWalk:km <= WALK_KM, off:wd != null && Array.isArray(p.closed) && p.closed.includes(wd),
      night:lateOf(p) === 2, dusk:lateOf(p) === 1, why:(f.why || []).slice(0, 2), picked:!!(s && s.picked && s.picked[p.id]) };
  });
  // 오늘 쉬는 곳은 뒤로. 저녁엔 야경·야시장을 앞으로, 낮(4~16시)엔 뒤로. 담아 둔 곳은 조금 더 앞으로
  const rank = x => (x.night && day ? x.km * 1.5 + 1.2 : x.km * (x.night && night(hour) ? 0.6 : 1)) * (x.picked ? 0.8 : 1);   // 낮엔 바로 옆 야시장도 1km 넘는 곳 뒤로
  items.sort((a, b) => (a.off - b.off) || (rank(a) - rank(b)));
  const meal = (hour >= 11 && hour < 14) || (hour >= 17 && hour < 21);
  return { radius, far:!radius, items:items.slice(0, limit), eats:eatsNear(eats || [], here, { km:1, wd, meal, cheap:hour >= 11 && hour < 14, limit:4 }) };
}

// 지도 앱으로 더 찾기·길찾기 (누를 때만 좌표가 그 지도 회사로 감)
const ll = pt => `${(+pt.lat).toFixed(5)},${(+pt.lng).toFixed(5)}`;
export const googleNearUrl = pt => `https://www.google.com/maps/search/${encodeURIComponent('관광 명소')}/@${ll(pt)},15z`;
// 가오더(선전, 본토에서 구글이 막힐 때): GPS 좌표(wgs84)를 그대로 넘김
export const amapNearUrl = pt => `https://uri.amap.com/search?keyword=${encodeURIComponent('景点')}&center=${(+pt.lng).toFixed(5)},${(+pt.lat).toFixed(5)}&coordinate=wgs84&view=map&src=tripnoseon`;
export function nearDirUrl(pt, p, byWalk){
  const to = p.mapq || p.addr || `${(+p.lat).toFixed(5)},${(+p.lng).toFixed(5)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${ll(pt)}&destination=${encodeURIComponent(to)}&travelmode=${byWalk ? 'walking' : 'transit'}`;
}
export const amapDirUrl = (pt, p, byWalk) => `https://uri.amap.com/navigation?from=${(+pt.lng).toFixed(5)},${(+pt.lat).toFixed(5)},${encodeURIComponent('我的位置')}&to=${(+p.lng).toFixed(5)},${(+p.lat).toFixed(5)},${encodeURIComponent(p.ja || p.local || p.name)}&mode=${byWalk ? 'walk' : 'bus'}&coordinate=wgs84&src=tripnoseon`;
