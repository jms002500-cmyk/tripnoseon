// 구글 지도에서 가져온 장소 목록을 읽는 순수 함수 모음 (DOM·네트워크를 건드리지 않음)
//
// 받는 형식
//   1) 구글 테이크아웃 '저장됨' 목록 CSV  (Title, Note, URL, Tags, Comment) — 좌표가 없음
//   2) 구글 테이크아웃 '지도(내 장소)'의 Saved Places.json (GeoJSON) — 좌표가 있을 수도 있음([0,0]이면 없음)
//   3) 붙여넣은 글: 한 줄에 장소 이름 또는 구글 지도 링크 하나
// 좌표가 없는 곳은 이름으로 위치 후보를 찾아(geocode.js) 사용자가 확인한 뒤 담음
import { AREAS } from './data.js';
import { dist } from './logic.js';

const TOKYO = { lat:35.6812, lng:139.7671 };
export const MAX_KM = 80;     // 도쿄역에서 이보다 멀면 잘못 찾은 위치로 봄 (가마쿠라·닛코 정도까지 허용)
export const FAR_KM = 6;      // 가장 가까운 동네 중심에서 이보다 멀면 '동네 밖' 안내

// 따옴표·줄바꿈이 들어간 칸까지 처리하는 CSV 파서
export function parseCSV(text){
  const rows = []; let row = []; let cell = ''; let q = false;
  const t = String(text).replace(/^﻿/, '');
  for(let i = 0; i < t.length; i++){
    const c = t[i];
    if(q){
      if(c === '"'){ if(t[i+1] === '"'){ cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if(c === '"') q = true;
    else if(c === ','){ row.push(cell); cell = ''; }
    else if(c === '\n' || c === '\r'){
      if(c === '\r' && t[i+1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if(cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

function num(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
function okPt(lat, lng){ return lat != null && lng != null && !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180; }

// 구글 지도 링크에서 좌표 꺼내기. 장소 핀(!3d…!4d…)을 화면 중심(@…)보다 우선
export function coordsFromUrl(url){
  if(!url) return null;
  const u = String(url);
  const pats = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*\+?(-?\d+(?:\.\d+)?)/i,
    /\/maps\/search\/(-?\d+(?:\.\d+)?)(?:,|%2C)\s*\+?(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
  ];
  for(const re of pats){
    const m = u.match(re);
    if(m){ const lat = num(m[1]), lng = num(m[2]); if(okPt(lat, lng)) return { lat, lng }; }
  }
  return null;
}

// https://www.google.com/maps/place/浅草寺/data=… → '浅草寺'
export function nameFromUrl(url){
  const m = String(url || '').match(/\/maps\/place\/([^/@?]+)/);
  if(!m) return '';
  try{ return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); }catch(e){ return m[1]; }
}

// 화면에 링크로 걸어도 되는 주소인지 (https 구글 지도 계열만)
export function safeMapUrl(url){
  const u = String(url || '').trim();
  return /^https:\/\/((www\.|maps\.)?google\.[a-z.]+\/maps|maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[a-z.]+\/)/i.test(u) ? u : '';
}

function item(name, url, note, pt){
  const n = String(name || '').trim() || nameFromUrl(url) || (pt ? `지도에 찍은 곳 (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})` : '');
  if(!n) return null;
  return { name:n.slice(0, 60), url:safeMapUrl(url), note:String(note || '').trim().slice(0, 120), lat:pt ? pt.lat : null, lng:pt ? pt.lng : null };
}

function fromCSV(text){
  const rows = parseCSV(text); if(!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const hasHead = head.includes('title') || head.includes('url') || head.includes('제목');
  const col = (names, d) => { const i = head.findIndex(h => names.includes(h)); return i >= 0 ? i : d; };
  const ti = hasHead ? col(['title', '제목', 'name', '이름'], 0) : 0;
  const ni = hasHead ? col(['note', '메모'], -1) : -1;
  const ui = hasHead ? col(['url', '링크'], -1) : rows[0].findIndex(c => /^https?:/i.test(c));
  return rows.slice(hasHead ? 1 : 0).map(r => {
    const url = ui >= 0 ? r[ui] : ''; const note = ni >= 0 ? r[ni] : '';
    return item(r[ti], url, note, coordsFromUrl(url));
  }).filter(Boolean);
}

function fromJSON(data){
  const feats = Array.isArray(data) ? data : (data && Array.isArray(data.features) ? data.features : []);
  return feats.map(f => {
    const pr = f.properties || {}; const loc = pr.location || pr.Location || {};
    const c = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
    let pt = c ? { lng:num(c[0]), lat:num(c[1]) } : null;
    if(!pt || !okPt(pt.lat, pt.lng)) pt = null;
    const url = pr.google_maps_url || pr['Google Maps URL'] || '';
    if(!pt) pt = coordsFromUrl(url);
    return item(loc.name || loc['Business Name'] || pr.name || pr.Title || loc.address || pr.address, url, loc.address || '', pt);
  }).filter(Boolean);
}

// 붙여넣은 글: 한 줄에 하나. '이름 https://…' 처럼 이름과 링크가 같이 있어도 됨
export function parseLines(text){
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/https?:\/\/\S+/);
    if(!m) return item(l, '', '', null);
    const url = m[0]; const name = l.replace(url, '').replace(/[\s\-–:|·]+$/, '').trim();
    return item(name || nameFromUrl(url), url, '', coordsFromUrl(url));
  }).filter(Boolean);
}

// 파일 내용 → 가져올 항목 목록. 이름이 같은 곳은 하나만
export function parseImport(text, filename){
  const t = String(text || '').replace(/^﻿/, '').trim(); let out;
  if(/\.json$/i.test(filename || '') || t.startsWith('{') || t.startsWith('[')){
    try{ out = fromJSON(JSON.parse(t)); }catch(e){ out = []; }
  } else if(/\.csv$/i.test(filename || '') || /^"?title"?,/i.test(t)) out = fromCSV(t);
  else out = parseLines(t);
  const seen = new Set();
  return out.filter(x => { const k = x.name.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
}

// 이름 검색어 후보. OpenStreetMap의 한국어 이름은 띄어쓰기 없이 붙은 경우가 많고('도쿄국립박물관'),
// 지점명('시부야점')이나 앞에 붙인 '도쿄'는 없는 경우가 많아서 순서대로 바꿔 가며 찾음 (최대 3번)
export function queryVariants(name){
  const b = String(name || '').trim().replace(/\s+/g, ' ');
  const noCity = b.replace(/^(도쿄|東京|tokyo)\s*/i, '');
  const noBranch = b.replace(/점$/, '').replace(/\s*\([^)]*\)\s*$/, '');
  const out = [b, b.replace(/ /g, ''), noCity, noBranch].filter(q => q.length >= 2);
  return [...new Set(out)].slice(0, 3);
}

// 도쿄 범위 안의 좌표인지 (이름 검색이 엉뚱한 지역을 찾았을 때 거르기)
export function nearTokyo(pt){ return !!pt && okPt(pt.lat, pt.lng) && dist(TOKYO, pt) <= MAX_KM; }

// 가장 가까운 동네
export function nearestArea(pt){
  let best = null, bd = Infinity;
  Object.entries(AREAS).forEach(([k, a]) => { const d = dist(a, pt); if(d < bd){ bd = d; best = k; } });
  return { key:best, km:bd };
}

// 가져오기 대기 목록의 한 줄 (상태 저장용). st: ok 위치 있음 | need 찾아야 함 | fail 못 찾음
export function toRow(x, k){
  const has = nearTokyo(x);
  return { k, name:x.name, url:x.url, note:x.note,
    lat:has ? x.lat : null, lng:has ? x.lng : null, st:has ? 'ok' : 'need', src:has ? 'link' : '',
    area:has ? nearestArea(x).key : '', hours:1.5, skip:false, label:'' };
}

// 대기 목록 한 줄 → 앱 장소(custom). 위치를 못 찾았으면 고른 동네 근처에 흩뿌리고 approx 표시
export function rowToPlace(r, id, n){
  const area = r.area || (r.lat != null ? nearestArea(r).key : 'tokyo');
  let lat = r.lat, lng = r.lng, approx = false;
  if(lat == null){ const a = AREAS[area]; const ang = n * 2.4, rr = 0.004; lat = a.lat + Math.sin(ang)*rr; lng = a.lng + Math.cos(ang)*rr; approx = true; }
  return { id, name:r.name, ja:'', area, lat, lng, hours:r.hours, tags:[], kid:'all', custom:true,
    url:r.url || '', note:r.note || '', approx, src:'gmap' };
}
