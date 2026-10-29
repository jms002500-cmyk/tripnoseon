// 장소 이름 → 위치 후보. OpenStreetMap Nominatim(무료, 키 없음)을 씀.
// 이용 규칙: 1초에 1번 이하, 같은 검색 반복 금지 → 줄 세워 천천히 보내고 결과는 브라우저에 저장해 둠.
// 찾은 위치는 '후보'일 뿐이라 화면에서 사용자가 확인하게 함.
import { nearTokyo, queryVariants } from './gimport.js';
import { REGION } from './data.js';

const URL_BASE = 'https://nominatim.openstreetmap.org/search';
const C_KEY = 'tripnoseon-geo';
const GAP_MS = 1100;
let last = 0;

function cacheGet(){ try{ return JSON.parse(localStorage.getItem(C_KEY) || '{}'); }catch(e){ return {}; } }
function cacheSet(q, v){ try{ const c = cacheGet(); c[q] = v; localStorage.setItem(C_KEY, JSON.stringify(c)); }catch(e){} }
const wait = ms => new Promise(r => setTimeout(r, ms));

async function search(q){
  const now = Date.now(); if(now - last < GAP_MS) await wait(GAP_MS - (now - last)); last = Date.now();
  const p = new URLSearchParams({ q, format:'jsonv2', limit:'5', countrycodes:REGION.codes.join(','), 'accept-language':'ko', viewbox:REGION.viewbox });
  const res = await fetch(`${URL_BASE}?${p}`, { headers:{ Accept:'application/json' } });
  if(!res.ok) throw new Error('geocode ' + res.status);
  const list = await res.json();
  // 도쿄 범위 밖(같은 이름의 오사카·후쿠오카 지점 등)은 버림
  return (Array.isArray(list) ? list : []).map(r => ({ lat:+r.lat, lng:+r.lon, label:String(r.display_name || '').split(',').slice(0, 3).join(',').trim() }))
    .find(r => nearTokyo(r)) || null;
}

// 찾으면 { lat, lng, label }, 못 찾으면 null. 네트워크 오류는 throw
export async function geocode(name){
  const key = name.trim(); const c = cacheGet();
  if(key in c) return c[key];
  let hit = null;
  for(const q of queryVariants(key)){ hit = await search(q); if(hit) break; }
  cacheSet(key, hit);
  return hit;
}
