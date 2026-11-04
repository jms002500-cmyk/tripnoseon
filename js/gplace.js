// 구글 장소(Places API New) → 트립노선 장소. 순수 함수(테스트 대상). 지도·네트워크는 js/gmap.js.
//   종류(types) → 장소 종류(KINDS)·실내 여부·머무는 시간
//   영업시간(regularOpeningHours.periods) → 그 시간 영업 여부, 쉬는 요일(일정 짜기가 피함)
//   이미 있는 도쿄 장소 65곳과 같은 곳이면 새로 만들지 않고 그 장소를 씀
// 구글 이용 약관: 장소 ID는 계속 저장해도 되고, 좌표 등은 30일 넘게 두지 않게 받은 날(gAt)을 남기고 앱을 열 때 새로 받음(staleGoogle·applyRefresh)
import { PLACES } from './data.js';
import { dist, allPlaces } from './logic.js';
import { nearestArea } from './gimport.js';

// 앞에서부터 먼저 맞는 것 (구글 종류 이름은 developers.google.com/maps/documentation/places/web-service/place-types)
const KIND_RULES = [
  [['amusement_park', 'water_park', 'theme_park'], '테마파크', false, 4],
  [['observation_deck'], '전망대', true, 1.5],
  [['museum', 'art_gallery', 'art_museum', 'history_museum', 'science_museum'], '박물관·미술관', true, 2],
  [['aquarium', 'zoo', 'wildlife_park'], '수족관·동물원', null, 2],
  [['amusement_center', 'children_amusement_center', 'bowling_alley', 'video_arcade', 'planetarium', 'cultural_center'], '체험·캐릭터', true, 2],
  [['park', 'garden', 'botanical_garden', 'national_park', 'hiking_area', 'plaza'], '공원·정원', false, 1.5],
  [['shinto_shrine', 'buddhist_temple', 'place_of_worship', 'church', 'hindu_temple'], '신사·절', false, 1],
  [['market', 'flea_market'], '거리·시장', 'part', 1],
  [['shopping_mall', 'department_store', 'store', 'clothing_store', 'toy_store', 'book_store', 'electronics_store', 'gift_shop', 'supermarket', 'convenience_store'], '쇼핑', true, 1.5],
  [['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway', 'food_court', 'coffee_shop', 'ramen_restaurant', 'sushi_restaurant', 'japanese_restaurant', 'fast_food_restaurant', 'dessert_shop'], '먹거리', true, 1],
  [['tourist_attraction', 'historical_landmark', 'monument', 'landmark'], '거리·시장', 'part', 1]
];
export function kindOf(types){
  const t = new Set(types || []);
  for(const [ts, kind, indoor, hours] of KIND_RULES) if(ts.some(x => t.has(x))){
    // 수족관은 실내, 동물원은 실외
    const ind = indoor === null ? (t.has('aquarium') ? true : false) : indoor;
    return { kind, indoor:ind, hours };
  }
  return { kind:'거리·시장', indoor:'part', hours:1.5 };
}

const mins = t => { const m = String(t).match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
const WEEK = 7 * 1440;

// 그 요일·시간에 여는지 (구글 periods: [{ open:{day,hour,minute}, close:{...} }], day 0=일) → true | false | null(정보 없음)
export function openAtPeriods(periods, wd, time){
  if(!Array.isArray(periods) || !periods.length) return null;
  const t = mins(time); if(t == null) return null;
  if(periods.length === 1 && periods[0].open && !periods[0].close) return true;   // 24시간
  const at = wd * 1440 + t;
  return periods.some(p => {
    if(!p.open) return false;
    const a = p.open.day * 1440 + (p.open.hour || 0) * 60 + (p.open.minute || 0);
    let b = p.close ? p.close.day * 1440 + (p.close.hour || 0) * 60 + (p.close.minute || 0) : a + 1440;
    if(b <= a) b += WEEK;
    return (at >= a && at < b) || (at + WEEK >= a && at + WEEK < b);
  });
}

// 쉬는 요일: 그날 여는 구간이 하나도 없으면 (24시간·정보 없음이면 빈 배열)
export function closedDays(periods){
  if(!Array.isArray(periods) || !periods.length) return [];
  if(periods.length === 1 && periods[0].open && !periods[0].close) return [];
  const open = new Set(periods.filter(p => p.open).map(p => p.open.day));
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !open.has(d));
}

// 구글 장소와 같은 곳인 도쿄 장소(65곳 목록): 이름이 겹치고 400m 안에서 가장 가까운 곳
//   거리만 보면 바로 옆 가게(팀랩 옆 바비큐집)까지 같은 곳으로 잡힘. 이름이 안 맞으면 새 장소로 담는 편이 덜 틀림
//   '츠/쓰'처럼 표기가 갈리는 글자는 맞춰서 비교 (츠키지 = 쓰키지)
const normName = t => String(t || '').toLowerCase().replace(/츠/g, '쓰').replace(/[\s·・\-–_.,()（）'"&]/g, '');
function sameName(a, p){
  const g = normName(a); if(g.length < 2) return false;
  return [p.name, p.ja].some(n => { const k = normName(n); return k.length >= 2 && (g.includes(k) || k.includes(g)); });
}
export function matchKnown(pt){
  let best = null, bd = 0.4;
  PLACES.forEach(p => { const d = dist(p, pt); if(d < bd && sameName(pt.name, p)){ bd = d; best = p; } });
  return best;
}

// 구글 장소 하나(필요한 칸만 꺼낸 평범한 객체) → 직접 담은 장소
//   g: { id, name, lat, lng, types, addr, periods, mapsUrl }
export function toCustom(g, newId, now){
  const k = kindOf(g.types);
  const p = { id:newId, name:String(g.name || '구글 지도에서 고른 곳').slice(0, 60), ja:'', gid:g.id || '', area:nearestArea(g).key,
    lat:+g.lat, lng:+g.lng, hours:k.hours, kind:k.kind, indoor:k.indoor, tags:[], kid:'all', custom:true, src:'google',
    addr:String(g.addr || '').slice(0, 120), gAt:now || Date.now() };
  const cd = closedDays(g.periods); if(cd.length) p.closed = cd;
  return p;
}

// 새로 받을 구글 장소: 받은 지 REFRESH_DAYS일이 지난 것 (30일 전에 여유 있게)
export const REFRESH_DAYS = 25;
export function staleGoogle(custom, now){
  const lim = REFRESH_DAYS * 86400000;
  return (custom || []).filter(p => p && p.src === 'google' && p.gid && !(now - (p.gAt || 0) < lim));
}
// 새로 받은 구글 정보로 고침: 좌표·주소·동네·쉬는 요일·받은 날. 이름·종류·머무는 시간은 그대로(담을 때 정한 값)
//   g: { id, lat, lng, addr, periods } (gmap.js refreshPlaces)
export function applyRefresh(p, g, now){
  if(!p || !g || !Number.isFinite(+g.lat) || !Number.isFinite(+g.lng)) return p;
  const out = Object.assign({}, p, { lat:+g.lat, lng:+g.lng, area:nearestArea(g).key, gAt:now });
  if(g.addr) out.addr = String(g.addr).slice(0, 120);
  const cd = closedDays(g.periods); if(cd.length) out.closed = cd; else delete out.closed;
  return out;
}

// 구글 지도 앱·웹으로 열기 (장소 ID가 있으면 정확히 그 장소)
export function gmapsPlaceUrl(name, gid){
  const q = new URLSearchParams({ api:'1', query:name || '' }); if(gid) q.set('query_place_id', gid);
  return `https://www.google.com/maps/search/?${q}`;
}

// ── 구글 지도 시트(gmap.js)가 쓰는 계산 ──
// 지도에 올려도 되는 좌표 → { lat, lng } | null (빈 값·글자·범위 밖은 null. +null·+''은 0이 되니 따로 거름)
export function latLngOf(p){
  if(!p || p.lat == null || p.lng == null || p.lat === '' || p.lng === '') return null;
  const lat = +p.lat, lng = +p.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
// 핀 종류: 꼭 갈 곳 > 담은 곳 > 안 담은 추천
export const pinKind = (s, p) => s.must && s.must[p.id] ? 'must' : s.picked && s.picked[p.id] ? 'on' : 'rec';
// 지도에 그릴 핀 → [{ kind, pos, title, place | hotel }]. showRec가 false면 안 담은 추천은 뺌(꼭 갈 곳은 늘 담은 곳)
export function pinList(s, showRec){
  const out = [];
  allPlaces(s).forEach(p => { const pos = latLngOf(p); const kind = pinKind(s, p); if(pos && (showRec || kind !== 'rec')) out.push({ kind, pos, title:p.name || '', place:p }); });
  (s.hotels || []).forEach(h => { const pos = latLngOf(h); if(pos) out.push({ kind:'hotel', pos, title:h.name || '', hotel:h }); });
  return out;
}
// 담은 장소가 지금 들어 있는 날(카드의 날짜 고르기 기본값) → 일차 번호 | null(자동·빼 둠·안 담음). 하루 종일 장소는 fullDay
export function dayOf(s, p){
  if(!p || !s.picked || !s.picked[p.id]) return null;
  const d = p.full ? (s.fullDay || {})[p.id] : (s.assign || {})[p.id];
  return Number.isInteger(d) && d >= 0 ? d : null;
}
// 공유받은 장소를 자동 완성으로 찾을 말: 이름+주소 → 이름만 → 이름 앞 세 낱말 (같은 말은 한 번, 100자까지)
export function findInputs(q, name){
  const n = String(name || '').trim();
  const list = [q, n, n.split(/\s+/).slice(0, 3).join(' ')].map(x => String(x || '').trim().slice(0, 100)).filter(Boolean);
  return list.filter((x, i) => list.indexOf(x) === i);
}
// 담기·옮기기 뒤 알림 (name: onPick이 돌려준 장소 이름, ''면 못 담음). wasDay: 누르기 전 그 장소의 날(dayOf), wasOn: 이미 담겨 있었는지
//   → { ok, text }
export function pickMsg(name, day, wasOn, wasDay){
  if(!name) return { ok:false, text:'담지 못했어요. 닫았다가 다시 눌러 주세요.' };
  const q = `'${name}'`;
  if(!wasOn) return { ok:true, text:`${q}을(를) ${day == null ? '일정에' : `${day + 1}일차에`} 담았어요.` };
  if(day == null) return { ok:true, text:`${q}은(는) 날짜를 자동으로 정해요.` };
  return { ok:true, text:day === wasDay ? `${q}은(는) 이미 ${day + 1}일차에 있어요.` : `${q}을(를) ${day + 1}일차로 옮겼어요.` };
}
