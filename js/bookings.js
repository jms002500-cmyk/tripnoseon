// 보관함 예약을 앱 전체에 반영 (실제로 예약한 것이 계획보다 우선):
//   항공권 → 여행 날짜·비행기 시간(s.start/end, s.flight) · 숙소 → 숙소 후보·밤별 숙소(s.hotels, s.nights, s.hotelPick)
//   입장권·교통·기타 예약에 장소를 연결하면 → 그 장소를 담고 그날 일정으로(s.picked, s.assign / 하루 종일 곳은 s.fullDay)
// 예약번호·첨부는 보관함(이 기기)에만 남음. 여기서 바꾸는 칸은 일정 칸이라 함께 짜기로 공유됨(숙소 이름·위치 포함, 예약번호 없음).
// 순수 함수(테스트 대상): 상태를 고치지 않고 바꿀 칸만 돌려줌 { patch, msgs, locate }. 저장·위치 찾기는 app.js.
import { AIRPORTS, toMin, NIGHT_DEP } from './flight.js';
import { buildDays, allPlaces } from './logic.js';
import { legOf } from './moves.js';
import { travellers } from './pax.js';

const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '');
export const addDay = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const md = key => `${+key.slice(5, 7)}/${+key.slice(8, 10)}`;
const norm = t => String(t || '').replace(/\s+/g, '').toLowerCase();
export const PLACE_KINDS = ['ticket', 'transport', 'etc'];   // 장소를 연결할 수 있는 예약

// 가는 편·오는 편: 넣은 값, 없으면 날짜로 짐작 (여행 날짜가 없으면 가는 편)
//   여행 날짜가 없으면 보관함의 다른 항공권보다 늦은 날이면 오는 편, 오는 날만 비었으면 가는 날보다 뒤면 오는 편
export function flightDir(s, it){
  if(it.dir === 'out' || it.dir === 'back') return it.dir;
  if(!isKey(it.date)) return 'out';
  if(!s.start) return (s.vault || []).some(x => x.kind === 'flight' && x.id !== it.id && isKey(x.date) && x.date < it.date) ? 'back' : 'out';
  if(s.end && it.date >= s.end) return 'back';
  if(it.date <= s.start) return 'out';
  if(!s.end) return 'back';
  return (Date.parse(it.date) - Date.parse(s.start)) > (Date.parse(s.end) - Date.parse(it.date)) ? 'back' : 'out';
}

// 항공권: 가는 편은 도착 날짜·도착 시각(현지), 오는 편은 출발 날짜·출발 시각(현지)
// 편 정보 칸 이름: 날짜+편명 (같은 편을 여러 사람이 따로 넣어도 한 칸에 사람만 더함)
export const fsegId = (date, fno) => ('f' + String(date || '').replace(/-/g, '') + String(fno || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()).slice(0, 40);
// 이 항공권으로 타는 사람: 인원별 번호를 넣은 사람, 없으면 일행 모두
export function flightWho(s, it){
  const keys = travellers(s).map(t => t.key);
  const pc = it && it.pcode && typeof it.pcode === 'object' ? Object.keys(it.pcode).filter(k => keys.includes(k) && it.pcode[k]) : [];
  const fw = ((it && it.files) || []).map(f => f && f.who).filter(k => keys.includes(k));
  const w = [...new Set(pc.concat(fw))];
  return w.length ? keys.filter(k => w.includes(k)) : keys;
}
// 보관함 항공권은 있는데 '누가 어느 편'(s.fsegs)에 없는 편 → 채운 fsegs (없으면 null). 앱 열 때(v0.82 전에 넣은 항공권)
export function fsegsFill(s){
  let segs = null;
  ((s && s.vault) || []).filter(it => it && it.kind === 'flight' && /^[A-Z0-9]{3,8}$/.test(String(it.fno || '').replace(/\s+/g, '').toUpperCase()) && isKey(it.date)).forEach(it => {
    const cur = segs || s.fsegs || {}; if(cur[fsegId(it.date, it.fno)]) return;
    const r = applyFlight(Object.assign({}, s, { fsegs:cur }), it); if(r.patch.fsegs) segs = r.patch.fsegs;
  });
  return segs;
}
export function applyFlight(s, it){
  const patch = {}, msgs = []; const f = Object.assign({ ap:'', arr:'', dep:'' }, s.flight);
  const apOk = it.ap && (AIRPORTS[s.city] || []).some(a => a.code === it.ap); const dir = flightDir(s, it);
  // 누가 어느 편 (함께 짜기로 공유 — 예약번호·티켓 번호는 안 올림)
  const fno = String(it.fno || '').replace(/\s+/g, '').toUpperCase().slice(0, 10);
  const segs = Object.assign({}, s.fsegs); let mine = null;
  if(/^[A-Z0-9]{3,8}$/.test(fno) && isKey(it.date)){
    const id = fsegId(it.date, fno), old = segs[id] || {}; const keys = travellers(s).map(t => t.key);
    const who = keys.filter(k => (old.who || []).concat(flightWho(s, it)).includes(k));
    const from = /^[A-Z]{3}$/.test(it.from || '') ? it.from : dir === 'back' && apOk ? it.ap : old.from || '';
    const to = /^[A-Z]{3}$/.test(it.to || '') ? it.to : dir === 'out' && apOk ? it.ap : old.to || '';
    mine = { dir, fno, date:it.date, from, to, dep:/^\d{2}:\d{2}$/.test(it.time || '') ? it.time : old.dep || '', arr:/^\d{2}:\d{2}$/.test(it.time2 || '') ? it.time2 : old.arr || '', who };
    { const ck = keys.filter(k => (old.ck || []).includes(k) || (it.bp && flightWho(s, it).includes(k))); if(ck.length) mine.ck = ck; }   // 탑승권을 넣은 사람은 체크인 완료
    if(JSON.stringify(old) !== JSON.stringify(mine)){ segs[id] = mine; patch.fsegs = segs; msgs.push(`${dir === 'back' ? '오는' : '가는'} 편 ${fno}`); }
  }
  // 일행 첫날·마지막 날 시간: 그 방향에서 가장 많은 사람이 타는 편 기준 (친구끼리 따로 예약해 편이 다르면)
  const best = Object.values(segs).filter(x => x && x.dir === dir && Array.isArray(x.who)).sort((a, b) => b.who.length - a.who.length)[0];
  if(mine && best && best.fno !== fno && best.who.length > mine.who.length){
    msgs.push(`${dir === 'back' ? '마지막 날' : '첫날'} 시간은 더 많은 사람이 타는 ${best.fno} 기준 그대로`);
    if(JSON.stringify(f) !== JSON.stringify(Object.assign({ ap:'', arr:'', dep:'' }, s.flight))) patch.flight = f;
    return { patch, msgs };
  }
  // 가는 편 공항 → 도착 공항, 오는 편 공항 → 출발 공항(ap2). 편도로 해 둔 반대쪽 항공권을 넣으면 왕복으로
  if(dir === 'out'){ if(apOk) f.ap = it.ap; if(f.way === 'back'){ f.way = ''; msgs.push('왕복으로'); } }
  else { if(apOk) f.ap2 = it.ap === f.ap ? '' : it.ap; if(f.way === 'out'){ f.way = ''; msgs.push('왕복으로'); } }
  if(dir === 'out'){
    const dep = toMin(it.time), arr = toMin(it.time2);
    const day = isKey(it.date) ? (arr != null && dep != null && arr < dep - 60 ? addDay(it.date, 1) : it.date) : '';   // 밤 비행기는 다음 날 도착
    if(day && day !== s.start){ patch.start = day; msgs.push(`가는 날 ${md(day)}`); }
    if(arr != null && f.arr !== it.time2){ f.arr = it.time2; msgs.push(`첫날 ${it.time2} 도착`); }
    if(dep != null && f.odep !== it.time){ f.odep = it.time; msgs.push(`가는 날 ${it.time} 출발`); }
  } else {
    const night = toMin(it.time) != null && toMin(it.time) < NIGHT_DEP;   // 자정 넘어 출발: 오는 날은 그 전날(그날 밤 숙소에서 나섬)
    const end = isKey(it.date) ? (night ? addDay(it.date, -1) : it.date) : '';
    if(end && end !== s.end){ patch.end = end; msgs.push(`오는 날 ${md(end)}${night ? `(밤 비행기 · ${md(it.date)} ${it.time} 출발)` : ''}`); }
    if(toMin(it.time) != null && f.dep !== it.time){ f.dep = it.time; msgs.push(`마지막 날 ${it.time} 출발`); }
    if(toMin(it.time2) != null && f.rarr !== it.time2){ f.rarr = it.time2; }
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
  if((it.addr || '').trim()) h.addr = it.addr.trim().slice(0, 120);   // 택시용 현지어 주소·전화 → 긴급 정보 숙소 카드 (safety.js hotelCard)
  if((it.tel || '').trim()) h.tel = it.tel.trim().slice(0, 30);
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

// 예약 금액 → 가계부 지출 한 줄(id 'bk' + 예약 id). 금액이 없으면 지울 id. 이미 있으면 날짜·낸 사람·나누기는 그대로
//   예약을 지울 때는 bookingSpendOf로 그 줄을 찾아 같이 지울지 물음(app.js vdel2)
//   o: { today, by, day(cat) → 기본 날짜(ledger.js defaultDay) }
export const BOOK_CAT = { flight:'flight', hotel:'stay', ticket:'ticket', transport:'move', insurance:'etc', entry:'etc', etc:'etc' };
export function bookingSpend(s, it, o = {}){
  const id = 'bk' + it.id; const old = (s.spend || {})[id];
  if(!(it.amt > 0)) return old ? { id, del:true } : null;
  const cat = BOOK_CAT[it.kind] || 'etc';
  return { id, e:Object.assign({ d:o.day ? o.day(cat) : (o.today || ''), pay:'card', by:o.by || null, split:null, at:o.now || 0 }, old || {},
    { amt:Math.round(it.amt * 100) / 100, cur:it.cur || 'KRW', what:String(it.title || '').slice(0, 40), cat, vid:it.id }) };
}

// 예약을 지울 때 같이 볼 가계부 줄: 이 예약 금액으로 만든 지출(spend['bk'+예약 id])이 있으면 { id, e, edited }, 없으면 null
//   edited: 가계부에서 손으로 고친 줄(자세히 적기로 고치면 vid가 빠짐)이거나 금액·통화가 예약과 다름 → 지우기 전에 알려 줌
export function bookingSpendOf(s, it){
  if(!it || !it.id) return null;
  const id = 'bk' + it.id; const e = (s.spend || {})[id]; if(!e) return null;
  const edited = e.vid !== it.id || e.amt !== Math.round((+it.amt || 0) * 100) / 100 || (e.cur || 'KRW') !== (it.cur || 'KRW');
  return { id, e, edited };
}

// 교통 예약을 '오가는 길' 이동에 연결 (공항 픽업·샌딩 차량 등): 그 이동을 '예약함'으로, 예약 시각을 이동 시각으로,
//   이름·메모에 픽업·샌딩이 있으면 수단을 '픽업 차량'으로. sel: 'k:go|in|out|back'(없으면 새로 만듦, id는 그 이름) | 'id:이동 id'
//   → { patch, msgs, moveId }. 공항 오가는 길 날짜는 여행 날짜를 따름(moves.js moveDate), 여행 중 이동은 예약 날짜로
export const PICK_RE = /픽업|샌딩|센딩|pick\s*-?\s*up|sending|drop\s*-?\s*off|transfer|기사|차량|밴/i;
export function applyMove(s, it, sel){
  const patch = {}, msgs = []; const moves = (s.moves || []).slice(); const v = String(sel || '');
  let i = -1, k = '';
  if(/^k:(go|in|out|back)$/.test(v)){ k = v.slice(2); i = moves.findIndex(m => m.k === k); }
  else if(/^id:./.test(v)){ i = moves.findIndex(m => m.id === v.slice(3)); if(i < 0) return { patch, msgs, moveId:null }; }
  else return { patch, msgs, moveId:null };
  const m = i >= 0 ? Object.assign({}, moves[i]) : { id:k, k, date:'', time:'', how:'', min:null, from:'', to:'', booked:false, note:'' };
  m.booked = true;
  if(toMin(it.time) != null) m.time = it.time;
  if(!m.how && PICK_RE.test(`${it.title || ''} ${it.memo || ''}`)) m.how = 'pick';
  if(m.k === 'etc' && isKey(it.date)) m.date = it.date;
  if(i >= 0) moves[i] = m; else moves.push(m);
  if(JSON.stringify(moves) !== JSON.stringify(s.moves || [])){ patch.moves = moves; msgs.push(`${legOf(m.k).label}${m.time ? ` ${m.time}` : ''} 예약함`); }
  return { patch, msgs, moveId:m.id };
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
  const ord = { flight:0, hotel:1 }; const list = (items || []).slice().sort((a, b) => (ord[a.kind] ?? 2) - (ord[b.kind] ?? 2) || String(a.date || '').localeCompare(String(b.date || '')));
  let cur = Object.assign({}, s); const patch = {}, msgs = []; const locate = [];
  list.forEach((it, i) => {
    const r = applyBooking(cur, it, { newId:o.newId ? o.newId(i) : 'h' + i, ...(o.ptOf ? o.ptOf(it) : {}) });
    Object.assign(patch, r.patch); cur = Object.assign(cur, r.patch); msgs.push(...r.msgs); if(r.locate) locate.push(r.hotelId);
  });
  return { patch, msgs, locate:locate.length > 0 };
}

// 날짜 카드에 같이 보일 예약 줄 [{ time(분|null), icon, text }]: 숙소 체크인·체크아웃, 그날 입장권·교통·기타
//   항공권은 비행기 줄로, 오가는 길에서 만든 교통 예약(moveId)은 그 이동 줄로 보이니 뺌
//   moveIds: 지금 있는 이동 id(Set). 주면 연결한 이동이 지워진 교통 예약은 예약 줄로 다시 보임
export function bookingRows(items, key, moveIds){
  const out = [];
  (items || []).forEach(it => {
    if(it.kind === 'hotel'){
      if(it.date2 === key) out.push({ id:it.id, time:toMin(it.time2), icon:'🏨', text:`체크아웃 · ${it.title}` });
      if(it.date === key) out.push({ id:it.id, time:toMin(it.time), icon:'🏨', text:`체크인 · ${it.title}` });
    } else if(PLACE_KINDS.includes(it.kind) && !(it.moveId && (!moveIds || moveIds.has(it.moveId))) && it.date === key)
      out.push({ id:it.id, time:toMin(it.time), icon:it.kind === 'transport' ? '🚆' : it.kind === 'ticket' ? '🎟️' : '📎', text:it.title });
  });
  return out.sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
}
