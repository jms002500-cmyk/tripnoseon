// 구글 평점 (v0.89.0, 2026-11-16, 사용자 요청: 추천한 곳·가족 식당에 구글 별점과 몇 명이 매겼는지 — 갈지 말지 객관적으로)
//   앱 추천 장소(PLACES)·가족 식당(EATS)을 구글 장소로 찾아 장소 ID·평점·평가 수·지도 주소를 이 기기에만 25일 둠
//   (구글 약관: 장소 ID 말고는 30일 넘게 두지 않음. 함께 짜기·백업에 안 들어감 — 상태가 아니라 따로 둔 칸 'tripnoseon-grating')
//   구글에서 찾고 받는 일은 gmap.js(구글 지도 시트). 여기는 순수 함수(테스트 대상) + 이 기기 저장
import { dist } from './logic.js';
import { latLngOf } from './gplace.js';
import { safeMapUrl } from './gimport.js';

export const GR_KEY = 'tripnoseon-grating';
export const GR_DAYS = 25;
const DAY = 86400000;

// 구글에서 찾을 말: 장소 ID가 있으면 그것(바로 받음), 없으면 지도 검색어 → 주소 → 현지 이름 → 이름 (100자까지)
export function lookupOf(x){
  if(!x) return null;
  const q = [x.mapq, x.addr, x.local, x.ja, x.name].map(v => String(v || '').trim()).find(Boolean) || '';
  return { gid:String(x.gid || ''), q:q.slice(0, 100) };
}
// 찾은 구글 장소가 우리 좌표 근처인지 (기본 600m: 식당 좌표는 건물·역 기준이라 여유). 우리 좌표가 없으면 구글 좌표만 있으면 됨
export function nearEnough(ours, g, km = 0.6){
  const a = latLngOf(ours), b = latLngOf(g);
  if(!b) return false;
  return !a || dist(a, b) <= km;
}

// 저장된 값: 받은 지 25일 안이면 { gid, r, n, u, at }, 못 찾은 곳은 { none:true, at } 하루만(그 뒤 다시 찾아 봄) → 아니면 null
export function freshOf(cache, id, now){
  const v = cache && Object.prototype.hasOwnProperty.call(cache, id) ? cache[id] : null;
  if(!v || !Number.isFinite(v.at)) return null;
  const age = now - v.at; if(age < 0) return null;
  return age < (v.none ? 1 : GR_DAYS) * DAY ? v : null;
}
// 화면 글: '구글 ★4.4 (5,178명)' · 평가가 없는 곳은 '구글 평점 없음' · 못 찾았거나 안 받았으면 ''
export function rateText(v){
  if(!v || v.none) return '';
  if(!(v.r > 0)) return '구글 평점 없음';
  return `구글 ★${(+v.r).toFixed(1)} (${Math.max(0, Math.round(v.n || 0)).toLocaleString('ko-KR')}명)`;
}
// 받은 값 모양 바로잡기 (구글 응답 → 저장할 값)
export function cleanRate(v, now){
  if(!v || typeof v !== 'object') return null;
  const at = Number.isFinite(v.at) ? v.at : now;
  if(v.none) return { none:true, at };
  const r = Number(v.r), n = Number(v.n);
  return { gid:String(v.gid || '').slice(0, 300), r:Number.isFinite(r) && r >= 0 && r <= 5 ? Math.round(r * 10) / 10 : 0,
    n:Number.isFinite(n) && n >= 0 ? Math.round(n) : 0, u:safeMapUrl(v.u), at };
}
// 저장해 둔 것 정리 (앱 열 때): 오래된 것·이상한 값·이상한 키는 버림
export function pruneCache(o, now){
  const out = {};
  if(!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).forEach(k => {
    if(k === '__proto__' || k.length > 80 || !/^[\w-]+$/.test(k)) return;
    const v = cleanRate(o[k], now); if(v && freshOf({ [k]:v }, k, now)) out[k] = v;
  });
  return out;
}
// 평점 높은 순 (같으면 평가 많은 순, 평점 없는 곳·안 받은 곳은 뒤 — 원래 순서 유지)
//   items: [{ id, … }] → 같은 항목들을 새 순서로
export function byRating(items, cache, now){
  const sc = x => { const v = freshOf(cache, x.id, now); return v && !v.none && v.r > 0 ? [v.r, v.n || 0] : [-1, -1]; };
  return (items || []).map((x, i) => ({ x, i, s:sc(x) }))
    .sort((a, b) => (b.s[0] - a.s[0]) || (b.s[1] - a.s[1]) || (a.i - b.i)).map(o => o.x);
}

// ── 이 기기 저장 (localStorage). 노드 테스트처럼 저장소가 없으면 메모리만 ──
let mem = null;
export function grCache(){
  if(!mem){ try{ mem = pruneCache(JSON.parse(localStorage.getItem(GR_KEY) || '{}'), Date.now()); }catch(e){ mem = {}; } }
  return mem;
}
export function grPut(id, v){
  const c = grCache(); const x = cleanRate(v, Date.now()); if(!x || !id) return;
  c[id] = x;
  try{ localStorage.setItem(GR_KEY, JSON.stringify(c)); }catch(e){ /* 저장소가 꽉 찼거나 막힘: 이번 화면에서만 */ }
}
export const grOf = id => freshOf(grCache(), id, Date.now());
