// 앱이 고른 가족 식당 (지역 자료의 EATS, 지금은 홍콩·선전 js/regions/hksz-eats.js).
// 식당은 일반 장소(PLACES)와 따로 둬서 일정 시간을 잡아먹지 않고, 오늘 하루 화면의 끼니 자리 근처와
// 장소 담기 단계의 '동네별 식당'에서만 보여 줘요. 순수 함수(테스트 대상). DOM·네트워크를 건드리지 않음.
import { dist } from './logic.js';
import { walkMin } from './food.js';

// 식당 종류 → 아이콘 (자료의 kind는 이 중 하나)
export const EAT_KINDS = { '딤섬':'🥟', '차찬텡':'☕', '완탕면':'🍜', '국수':'🍜', '로스트':'🍗', '디저트':'🍮', '광둥요리':'🥢', '중국요리':'🥢', '채식':'🥬', '훠궈':'🍲', '양식':'🍽️', '한식':'🍚' };
export const eatIcon = e => EAT_KINDS[e.kind] || '🍽️';
export const NEAR_KM = 1.5;   // 끼니 자리에서 이만큼 안에 있는 곳만 (지하철 한두 정거장)

// 1인 가격 어림 → 'HK$50~80' · '60~80위안' (없으면 '')
export function priceText(p){
  if(!p || !(p.lo > 0)) return '';
  const r = p.hi > p.lo ? `${p.lo}~${p.hi}` : `${p.lo}`;
  return p.cur === 'HKD' ? `HK$${r}` : p.cur === 'CNY' ? `${r}위안` : p.cur === 'JPY' ? `${r}엔` : `${r} ${p.cur}`;
}
const snack = e => e.kind === '디저트' ? 1 : 0;
export const isClosedOn = (e, wd) => wd != null && Array.isArray(e.closed) && e.closed.includes(wd);

// 한 지점 근처 식당: km 안에 있는 곳을 가까운 순으로, 그날 쉬는 곳은 맨 뒤
//   meal: true면 끼니 자리라 디저트·간식 가게를 식사할 곳 뒤로
//   돌려주는 값: 식당에 { km, walk(분), off(그날 쉼) }를 더한 것
export function eatsNear(list, pt, opt = {}){
  if(!pt || pt.lat == null || !Array.isArray(list)) return [];
  const max = opt.km != null ? opt.km : NEAR_KM; const wd = opt.wd;
  return list.map(e => { const km = dist(pt, e); return Object.assign({}, e, { km, walk:walkMin(km), off:isClosedOn(e, wd) }); })
    .filter(e => e.km <= max)
    .sort((a, b) => (a.off - b.off) || (opt.meal ? snack(a) - snack(b) : 0) || (a.km - b.km))
    .slice(0, opt.limit || 3);
}

// 동네별로 묶기 (AREAS에 적힌 순서). cities를 주면 그 도시 동네만, area를 주면 그 동네만. 빈 동네는 뺌
export function eatsByArea(list, areas, opt = {}){
  const cities = opt.cities && opt.cities.length ? opt.cities : null;
  return Object.keys(areas || {})
    .filter(k => (!opt.area || opt.area === 'all' || opt.area === k) && (!cities || cities.includes(areas[k].city)))
    .map(k => ({ key:k, area:areas[k], items:(list || []).filter(e => e.area === k) }))
    .filter(g => g.items.length);
}

// 지도 링크: 구글은 현지 이름으로 그 좌표 근처를 찾고, 선전은 가오더(본토에서 구글이 막힘)도 같이
export const eatMapUrl = e => `https://www.google.com/maps/search/${encodeURIComponent(e.local)}/@${(+e.lat).toFixed(5)},${(+e.lng).toFixed(5)},17z`;
export const eatAmapUrl = e => `https://uri.amap.com/search?keyword=${encodeURIComponent(e.local)}&city=440300&view=map&src=tripnoseon`;
// 출처 주소 → 보여 줄 짧은 이름 (도메인)
export function srcName(url){
  const m = /^https?:\/\/([^/]+)/.exec(url || ''); if(!m) return '';
  return m[1].replace(/^(www|m|global|guide|travel|ae|gs|en)\./, '');
}
