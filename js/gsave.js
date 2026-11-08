// ⭐ 내 구글 지도에 저장 (2026-11-08)
//   구글은 다른 앱이 사용자의 구글 지도 '저장됨' 목록을 바꾸는 길을 열어 두지 않음 → 자동으로는 못 넣음.
//   그래서 장소마다 구글 지도 앱을 '그 장소 한 곳'으로 열어 사용자가 '저장'을 한 번 누르게 함.
//   검색어는 지도 링크와 같은 것(v0.60.0에서 장소마다 한 곳으로 열리는지 확인한 mapq·addr), 구글에서 고른 곳은 장소 ID로.
//   어디까지 저장했는지는 이 기기에만 (s.gsaved { 키: 연 때 }) — 구글 계정이 사람마다 달라서 공유하지 않음
import { safeMapUrl } from './gimport.js';
import { gmapsPlaceUrl } from './gplace.js';
import { gmap } from './ui.js';

export const hotelKey = h => 'h:' + h.id;
const near = p => `https://www.google.com/maps/search/${encodeURIComponent(p.name)}/@${(+p.lat).toFixed(5)},${(+p.lng).toFixed(5)},17z`;

// 장소(또는 숙소) → 구글 지도에서 그 장소를 여는 주소
export function gsaveUrl(p, hotel){
  if(p.gid) return gmapsPlaceUrl(p.name, p.gid);
  const u = safeMapUrl(p.url); if(u) return u;
  if(!p.custom && !hotel) return gmap(p.mapq || p.addr || p.ja || p.name);
  if(p.lat != null && p.lat !== '' && !p.approx) return near(p);
  return gmap(p.name);
}

export const isSaved = (s, key) => !!(s.gsaved && s.gsaved[key]);

// 일정(plan 결과) → 저장할 목록: 숙소 먼저, 그다음 날짜순, 날짜를 못 정한 곳은 맨 끝
//   → { rows:[{ d|null, title, items:[{ key, name, url, saved }] }], total, done }
export function gsaveList(s, P){
  const seen = new Set(), rows = [];
  const item = (key, name, url) => ({ key, name, url, saved:isSaved(s, key) });
  const hs = [];
  P.days.forEach(d => [d.from, d.to].forEach(h => {
    const x = h && h.hid && (s.hotels || []).find(o => o.id === h.hid);
    if(x && !seen.has(hotelKey(x))){ seen.add(hotelKey(x)); hs.push(item(hotelKey(x), x.name, gsaveUrl(x, true))); }
  }));
  if(hs.length) rows.push({ d:null, title:'🏨 숙소', items:hs });
  P.days.forEach(d => {
    const items = (d.full ? [d.full] : []).concat(d.items).filter(p => !seen.has(p.id) && seen.add(p.id)).map(p => item(p.id, p.name, gsaveUrl(p)));
    if(items.length) rows.push({ d, title:`${d.i + 1}일차 · ${d.label}`, items });
  });
  const rest = (P.unassigned || []).map(u => u.p).filter(p => !seen.has(p.id) && seen.add(p.id)).map(p => item(p.id, p.name, gsaveUrl(p)));
  if(rest.length) rows.push({ d:null, title:'날짜 안 정한 곳', items:rest });
  const all = rows.flatMap(r => r.items);
  return { rows, total:all.length, done:all.filter(x => x.saved).length };
}

// 이 기기 칸 모양 바로잡기 (백업 파일에서 올 때)
export function cleanGsaved(o){
  const out = {};
  if(o && typeof o === 'object' && !Array.isArray(o)) Object.entries(o).forEach(([k, v]) => { if(typeof k === 'string' && k.length <= 80 && Number.isFinite(v)) out[k] = v; });
  return out;
}
