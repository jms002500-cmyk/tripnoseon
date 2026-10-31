// 보관함 예약을 앱 전체에 반영 (실제로 예약한 것이 계획보다 우선):
//   항공권 → 여행 날짜·비행기 시간(s.start/end, s.flight) · 숙소 → 숙소 후보·밤별 숙소(s.hotels, s.nights, s.hotelPick)
//   입장권·교통·기타 예약에 장소를 연결하면 → 그 장소를 담고 그날 일정으로(s.picked, s.assign / 하루 종일 곳은 s.fullDay)
// 예약번호·첨부는 보관함(이 기기)에만 남음. 여기서 바꾸는 칸은 일정 칸이라 함께 짜기로 공유됨(숙소 이름·위치 포함, 예약번호 없음).
// 순수 함수(테스트 대상): 상태를 고치지 않고 바꿀 칸만 돌려줌 { patch, msgs, locate }. 저장·위치 찾기는 app.js.
import { AIRPORTS, toMin } from './flight.js';
import { buildDays, allPlaces } from './logic.js';

const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '');
export const addDay = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const md = key => `${+key.slice(5, 7)}/${+key.slice(8, 10)}`;
const norm = t => String(t || '').replace(/\s+/g, '').toLowerCase();
export const PLACE_KINDS = ['ticket', 'transport', 'etc'];   // 장소를 연결할 수 있는 예약

// 가는 편·오는 편: 넣은 값, 없으면 날짜로 짐작 (여행 날짜가 없으면 가는 편)
export function flightDir(s, it){
  if(it.dir === 'out' || it.dir === 'back') return it.dir;
  if(!isKey(it.date) || !s.start) return 'out';
  if(s.end && it.date >= s.end) return 'back';
  if(it.date <= s.start) return 'out';
  return s.end && (Date.parse(it.date) - Date.parse(s.start)) > (Date.parse(s.end) - Date.parse(it.date)) ? 'back' : 'out';
}

// 항공권: 가는 편은 도착 날짜·도착 시각(현지), 오는 편은 출발 날짜·출발 시각(현지)
export function applyFlight(s, it){
  const patch = {}, msgs = []; const f = Object.assign({ ap:'', arr:'', dep:'' }, s.flight);
  if(it.ap && (AIRPORTS[s.city] || []).some(a => a.code === it.ap)) f.ap = it.ap;
  if(flightDir(s, it) === 'out'){
    const dep = toMin(it.time), arr = toMin(it.time2);
    const day = isKey(it.date) ? (arr != null && dep != null && arr < dep - 60 ? addDay(it.date, 1) : it.date) : '';   // 밤 비행기는 다음 날 도착
    if(day && day !== s.start){ patch.start = day; msgs.push(`가는 날 ${md(day)}`); }
    if(arr != null && f.arr !== it.time2){ f.arr = it.time2; msgs.push(`첫날 ${it.time2} 도착`); }
  } else {
    if(isKey(it.date) && it.date !== s.end){ patch.end = it.date; msgs.push(`오는 날 ${md(it.date)}`); }
    if(toMin(it.time) != null && f.dep !== it.time){ f.dep = it.time; msgs.push(`마지막 날 ${it.time} 출발`); }
  }
  if(JSON.stringify(f) !== JSON.stringify(Object.assign({ ap:'', arr:'', dep:'' }, s.flight))) patch.flight = f;
  return { patch, msgs };
}

// 숙소: 같은 예약으로 만든 숙소 후보(vid) 또는 이름이 같은 후보를 고치고, 없으면 새로 만듦.
//   체크인~체크아웃 전날 밤을 그 숙소로(s.nights). 여행의 모든 밤이면 정한 숙소(s.hotelPick)로.
//   o: { newId, pt:{ lat, lng, area } | null(위치 모름 → locate:true), mapUrl }
export function applyHotel(s, it, o = {}){
  const patch = {}, msgs = []; const name = String(it.title || '').trim().slice(0, 60); if(!name) return { patch, msgs };
  const hotels = (s.hotels || []).slice();
  let i = hotels.findIndex(x => x.vid === it.id); if(i < 0) i = hotels.findIndex(x => norm(x.name) === norm(name));
  const h = i >= 0 ? Object.assign({}, hotels[i]) : { id:o.newId, name, price:0, pcur:s.hotelCur || '', mapUrl:'', bookUrl:'', memo:'', lat:null, lng:null, area:'', st:'need', src:'', approx:false, label:'' };
  Object.assign(h, { vid:it.id, booked:true, name });
  if(o.pt) Object.assign(h, { lat:o.pt.lat, lng:o.pt.lng, area:o.pt.area || h.area, st:'ok', src:'link', approx:false, mapUrl:o.mapUrl || h.mapUrl });
  if(i >= 0) hotels[i] = h; else { hotels.push(h); msgs.push(`숙소 후보에 '${name}'`); }
  patch.hotels = hotels;
  const cin = isKey(it.date) ? it.date : s.start || '', cout = isKey(it.date2) && (!cin || it.date2 > cin) ? it.date2 : '';
  if(!s.start && cin) patch.start = cin;
  if(!s.end && cout) patch.end = cout;
  const start = patch.start || s.start, end = patch.end || s.end;
  if(start && end && cin){
    const last = cout || end; const keys = [];
    for(let k = start; k < end && keys.length < 30; k = addDay(k, 1)) if(k >= cin && k < last) keys.push(k);
    let all = 0; for(let k = start; k < end && all < 31; k = addDay(k, 1)) all++;
    if(keys.some(k => (s.nights || {})[k] !== h.id)){
      const nights = Object.assign({}, s.nights); keys.forEach(k => { nights[k] = h.id; }); patch.nights = nights;
      msgs.push(`${keys.length === all ? '모든 밤' : `${md(keys[0])}부터 ${keys.length}박`} '${name}'`);
    }
    if((keys.length === all || !s.hotelPick) && s.hotelPick !== h.id) patch.hotelPick = h.id;
  } else if(!s.hotelPick) patch.hotelPick = h.id;
  if(i >= 0 && !Object.keys(patch).some(k => k !== 'hotels') && JSON.stringify(hotels[i]) === JSON.stringify((s.hotels || [])[i])) delete patch.hotels;   // 바뀐 게 없으면 그대로
  return { patch, msgs, locate:h.lat == null, hotelId:h.id };
}

// 장소를 연결한 예약: 그 장소를 담고 예약 날짜(여행 날짜 안)로 옮김
export function applyPlace(s, it){
  const patch = {}, msgs = [];
  if(!it.placeId || !isKey(it.date)) return { patch, msgs };
  const p = allPlaces(s).find(x => x.id === it.placeId); if(!p) return { patch, msgs };
  const d = buildDays(s).find(x => x.key === it.date);
  if(!d){ msgs.push(`${md(it.date)}은 여행 날짜 밖이라 일정에는 안 넣었어요`); return { patch, msgs }; }
  if(!(s.picked || {})[p.id]) patch.picked = Object.assign({}, s.picked, { [p.id]:true });
  if(p.full){ if((s.fullDay || {})[p.id] !== d.i) patch.fullDay = Object.assign({}, s.fullDay, { [p.id]:d.i }); }
  else if((s.assign || {})[p.id] !== d.i) patch.assign = Object.assign({}, s.assign, { [p.id]:d.i });
  if(Object.keys(patch).length) msgs.push(`${p.name} → ${d.i + 1}일차`);
  return { patch, msgs };
}

// 예약 하나 반영. o: applyHotel에 넘길 값
export function applyBooking(s, it, o){
  if(!it) return { patch:{}, msgs:[] };
  if(it.kind === 'flight') return applyFlight(s, it);
  if(it.kind === 'hotel') return applyHotel(s, it, o);
  if(PLACE_KINDS.includes(it.kind)) return applyPlace(s, it);
  return { patch:{}, msgs:[] };
}

// 보관함 전부 다시 반영: 항공권(날짜) → 숙소(밤) → 장소 순서. o.newId(i), o.ptOf(it): 숙소 위치
export function applyAll(s, items, o = {}){
  const ord = { flight:0, hotel:1 }; const list = (items || []).slice().sort((a, b) => (ord[a.kind] ?? 2) - (ord[b.kind] ?? 2));
  let cur = Object.assign({}, s); const patch = {}, msgs = []; const locate = [];
  list.forEach((it, i) => {
    const r = applyBooking(cur, it, { newId:o.newId ? o.newId(i) : 'h' + i, ...(o.ptOf ? o.ptOf(it) : {}) });
    Object.assign(patch, r.patch); cur = Object.assign(cur, r.patch); msgs.push(...r.msgs); if(r.locate) locate.push(r.hotelId);
  });
  return { patch, msgs, locate:locate.length > 0 };
}

// 날짜 카드에 같이 보일 예약 줄 [{ time(분|null), icon, text }]: 숙소 체크인·체크아웃, 그날 입장권·교통·기타
//   항공권은 비행기 줄로, 오가는 길에서 만든 교통 예약(moveId)은 그 이동 줄로 보이니 뺌
export function bookingRows(items, key){
  const out = [];
  (items || []).forEach(it => {
    if(it.kind === 'hotel'){
      if(it.date2 === key) out.push({ time:toMin(it.time2), icon:'🏨', text:`체크아웃 · ${it.title}` });
      if(it.date === key) out.push({ time:toMin(it.time), icon:'🏨', text:`체크인 · ${it.title}` });
    } else if(PLACE_KINDS.includes(it.kind) && !it.moveId && it.date === key)
      out.push({ time:toMin(it.time), icon:it.kind === 'transport' ? '🚆' : it.kind === 'ticket' ? '🎟️' : '📎', text:it.title });
  });
  return out.sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
}
