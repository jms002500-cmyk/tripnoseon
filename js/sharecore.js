// 함께 짜기(공유 여행)의 순수 함수 모음. Firebase·DOM을 건드리지 않음 → tests/에서 바로 테스트.
// 공유하는 것은 일정과 가계부(예산 포함)·준비물·긴급 정보(SHARED_KEYS)뿐. 화면 위치·필터·라쿠텐 키·날씨·환율·가져오기 대기 목록·보관함은 각자 기기에만 둠.
import { DEFAULT, WHO, PACE, REGIONS, CURRENCY } from './data.js';
import { allPlaces } from './logic.js';
import { money } from './ledger.js';
import { budgetOf } from './budget.js';

export const SHARED_KEYS = ['who', 'adults', 'kids', 'styles', 'pace', 'country', 'city', 'cityOnly', 'start', 'end', 'flight', 'moves',
  'picked', 'must', 'fullDay', 'custom', 'hotelArea', 'assign', 'hotels', 'hotelPick', 'hotelCur',
  'spend', 'party', 'lrate', 'budget', 'pack', 'safety', 'dlock', 'nights', 'prep'];
// id → 값 모양의 납작한 맵. 칸 하나씩 따로 보내서 두 사람이 다른 장소를 담거나 지출·준비물을 동시에 고쳐도 서로 덮어쓰지 않게
export const MAP_KEYS = ['picked', 'must', 'fullDay', 'assign', 'spend', 'pack', 'dlock', 'nights', 'prep'];
// id가 있는 객체 배열(오가는 길·직접 담은 곳·숙소 후보·나누는 사람). 서버에는 배열 대신
//   p.<칸>Items {id: 항목} + p.<칸>Order [id 순서]로 둬서 항목 하나씩 따로 보냄 → 두 사람이 다른 항목을 동시에 더하고·고치고·지워도 둘 다 남음.
//   순서는 통째로 보내지만 순서에 없는 항목도 버리지 않고 뒤에 붙여서(id 순), 순서끼리 덮어써도 항목은 안 사라짐.
//   옛 공유 여행(p.<칸> 배열)도 그대로 읽고, 그 칸을 처음 고칠 때 새 모양으로 올림.
export const LIST_KEYS = ['moves', 'custom', 'hotels', 'party'];
export const DELETE = { __delete:true };   // Firebase deleteField()로 바꿔 보낼 표시

const clone = o => JSON.parse(JSON.stringify(o === undefined ? null : o));
// 객체 칸 순서와 상관없이 같은지 (Firestore는 맵 칸을 이름순으로 돌려줌)
const stable = o => Array.isArray(o) ? `[${o.map(stable).join(',')}]`
  : o && typeof o === 'object' ? `{${Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`
  : JSON.stringify(o === undefined ? null : o);
const same = (a, b) => (a === undefined) === (b === undefined) && stable(a) === stable(b);
const safeId = k => /^[A-Za-z0-9_-]{1,80}$/.test(k) && k !== '__proto__';
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const IT = k => `${k}Items`, OD = k => `${k}Order`;
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);

// 배열 → { items:{id: 항목}, order:[id] }. 모든 항목에 겹치지 않는 안전한 id가 있을 때만(아니면 null → 배열 통째로)
function byId(arr){
  if(!Array.isArray(arr)) return null;
  const items = {}, order = [];
  for(const x of arr){
    if(!isMap(x) || typeof x.id !== 'string' || !safeId(x.id) || has(items, x.id)) return null;
    items[x.id] = clone(x); order.push(x.id);
  }
  return { items, order };
}
// 서버 모양(p) → 상태 배열. 새 모양이면 순서대로, 순서에 없는 항목은 뒤에 id 순으로
function listOf(p, k){
  const items = p[IT(k)];
  const ids = Object.keys(items).filter(id => isMap(items[id]));
  const ok = new Set(ids), seen = new Set(), out = [];
  (Array.isArray(p[OD(k)]) ? p[OD(k)] : []).forEach(id => { if(ok.has(id) && !seen.has(id)){ seen.add(id); out.push(id); } });
  ids.filter(id => !seen.has(id)).sort().forEach(id => out.push(id));
  return out.map(id => { const x = clone(items[id]); if(x.id !== id) x.id = id; return x; });
}
const listForm = (p, k) => !!p && isMap(p[IT(k)]);

// 내 상태 → 서버에 두는 모양 (id 있는 객체 배열은 Items + Order)
export function sharedOf(s){
  const o = {};
  SHARED_KEYS.forEach(k => {
    const v = clone(s[k] === undefined ? DEFAULT[k] : s[k]);
    const m = LIST_KEYS.includes(k) ? byId(v) : null;
    if(m){ o[IT(k)] = m.items; o[OD(k)] = m.order; } else o[k] = v;
  });
  return o;
}

// 받은 서버 일정(p) 그대로의 모양 = 다음에 보낼 차이의 기준. 옛 배열 모양 칸은 배열 그대로 둬서
// 처음 고칠 때 그 칸을 통째로 새 모양으로 올리게 (항목 하나만 올리면 서버에 그 항목만 남으므로)
export function syncedOf(p){
  const o = {};
  SHARED_KEYS.forEach(k => {
    if(LIST_KEYS.includes(k) && listForm(p, k)){
      const items = p[IT(k)], m = {};
      Object.keys(items).forEach(id => { if(isMap(items[id])) m[id] = clone(items[id]); });
      o[IT(k)] = m; o[OD(k)] = clone(Array.isArray(p[OD(k)]) ? p[OD(k)] : []);
    } else o[k] = clone(p && p[k] !== undefined ? p[k] : DEFAULT[k]);
  });
  return o;
}

// 지난번 맞춘 일정(prev) → 지금 일정(next) 차이를 Firestore 갱신 목록으로: [['p.picked.sensoji', true], ['p.start', '2027-03-07'], ['p.movesItems.m1', {...}], ...]
// prev·next는 sharedOf/syncedOf 모양
export function diffShared(prev, next){
  const out = [];
  SHARED_KEYS.forEach(k => {
    if(LIST_KEYS.includes(k)){ diffList(prev, next, k, out); return; }
    const a = prev ? prev[k] : undefined, b = next[k];
    if(same(a, b)) return;
    if(MAP_KEYS.includes(k)) diffMap(`p.${k}`, a, b, out);
    else out.push([`p.${k}`, clone(b)]);
  });
  return out;
}
// 맵을 칸 하나씩. id가 이상하면 통째로
function diffMap(path, a, b, out){
  if(!(isMap(a) && isMap(b) && Object.keys(a).concat(Object.keys(b)).every(safeId))){ out.push([path, clone(b)]); return; }
  new Set(Object.keys(a).concat(Object.keys(b))).forEach(id => {
    if(!has(b, id)) out.push([`${path}.${id}`, DELETE]);
    else if(!has(a, id) || !same(a[id], b[id])) out.push([`${path}.${id}`, clone(b[id])]);
  });
}
function diffList(prev, next, k, out){
  const it = IT(k), od = OD(k);
  const before = prev ? (listForm(prev, k) ? listOf(prev, k) : (prev[k] === undefined ? DEFAULT[k] : prev[k])) : undefined;
  if(!listForm(next, k)){
    // id 없는 항목이 섞임 → 옛 방식(배열 통째로). 서버에 새 모양이 있으면 지워야 배열을 읽음
    if(listForm(prev, k)) out.push([`p.${it}`, DELETE], [`p.${od}`, DELETE], [`p.${k}`, clone(next[k])]);
    else if(!prev || !same(before, next[k])) out.push([`p.${k}`, clone(next[k])]);
    return;
  }
  if(listForm(prev, k)){
    diffMap(`p.${it}`, prev[it], next[it], out);
    if(!same(prev[od], next[od])) out.push([`p.${od}`, clone(next[od])]);
    return;
  }
  // 처음 올리거나 서버가 아직 옛 배열 모양: 내용이 바뀌었을 때만 통째로 새 모양으로
  if(prev && same(before, listOf(next, k))) return;
  out.push([`p.${it}`, clone(next[it])], [`p.${od}`, clone(next[od])]);
}

// 서버 일정(p)을 내 상태에 덮어씀. 없는 칸은 기본값. 새 모양(Items+Order)·옛 모양(배열) 모두 읽음
//   남이 고친 값이라 모양을 바로잡아서 넣음(cleanShared)
export function applyRemote(s, p){
  SHARED_KEYS.forEach(k => {
    if(LIST_KEYS.includes(k) && listForm(p, k)) s[k] = listOf(p, k);
    else s[k] = clone(p && p[k] !== undefined ? p[k] : DEFAULT[k]);
  });
  return cleanShared(s);
}

// 함께 짜는 사람(초대 링크를 받은 누구나)·남이 준 백업 파일이 넣은 일정 칸의 모양을 바로잡음.
//   화면은 숫자·날짜 칸을 esc() 없이 그리는 곳이 있고 목록·맵 모양을 믿고 그려서, 숫자 자리에 HTML 글자가 오면 남의 코드가 실행되고
//   목록 자리에 다른 것이 오면 화면이 통째로 멈춤. 모양이 틀린 값만 기본값으로 바꾸고, 앱이 만드는 모양은 그대로 둠(여러 번 해도 같음)
const NUMLIKE = /^-?\d+(\.\d+)?$/;
const toNum = v => typeof v === 'number' ? (Number.isFinite(v) ? v : null) : typeof v === 'string' && NUMLIKE.test(v.trim()) ? +v : null;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const own = (o, k) => typeof k === 'string' && has(o, k);
const objOr = (v, d) => isMap(v) ? v : clone(d);
const strOr = (v, d) => typeof v === 'string' ? v : d;
// 객체 안 칸: 숫자여야 하는 칸은 숫자(아니면 d), 글자여야 하는 칸은 글자(아니면 '')
function fixNums(o, keys, d){ keys.forEach(k => { if(has(o, k) && o[k] !== null && typeof o[k] !== 'number'){ const n = toNum(o[k]); o[k] = n == null ? d : n; } else if(typeof o[k] === 'number' && !Number.isFinite(o[k])) o[k] = d; }); }
function fixStrs(o, keys){ keys.forEach(k => { if(has(o, k) && o[k] != null && typeof o[k] !== 'string') o[k] = typeof o[k] === 'number' || typeof o[k] === 'boolean' ? String(o[k]) : ''; }); }
const listOfObjs = v => Array.isArray(v) ? v.filter(isMap) : [];
const mapOfObjs = v => { const o = {}; if(isMap(v)) Object.keys(v).forEach(k => { if(k !== '__proto__' && isMap(v[k])) o[k] = v[k]; }); return o; };
export function cleanShared(s){
  const D = k => clone(DEFAULT[k]);
  if(!WHO.some(w => w.key === s.who)) s.who = null;
  { const n = toNum(s.adults); s.adults = n == null ? D('adults') : Math.min(10, Math.max(1, Math.round(n))); }
  s.kids = Array.isArray(s.kids) ? s.kids.map(toNum).filter(n => n != null).map(n => Math.min(17, Math.max(0, Math.round(n)))) : [];
  s.styles = Array.isArray(s.styles) ? s.styles.filter(x => typeof x === 'string') : [];
  if(!own(PACE, s.pace)) s.pace = D('pace');
  if(!own(REGIONS, s.city)) s.city = D('city');
  if(!(typeof s.country === 'string' && /^[a-z]{2}$/.test(s.country))) s.country = REGIONS[s.city].country;
  if(!['', 'hk', 'sz'].includes(s.cityOnly)) s.cityOnly = '';
  ['start', 'end'].forEach(k => { if(!(typeof s[k] === 'string' && DATE.test(s[k]))) s[k] = ''; });
  s.flight = objOr(s.flight, DEFAULT.flight); fixStrs(s.flight, ['ap', 'arr', 'dep']);
  if(!(s.hotelArea === null || (typeof s.hotelArea === 'string' && safeId(s.hotelArea)))) s.hotelArea = null;
  if(!(s.hotelPick === null || typeof s.hotelPick === 'string')) s.hotelPick = null;
  if(!own(CURRENCY, s.hotelCur)) s.hotelCur = D('hotelCur');
  { const n = toNum(s.lrate); s.lrate = n != null && n >= 0 ? n : 0; }
  s.budget = objOr(s.budget, DEFAULT.budget);
  s.safety = objOr(s.safety, DEFAULT.safety); fixStrs(s.safety, ['hname', 'addr', 'tel', 'meet']);
  ['picked', 'must', 'fullDay', 'assign', 'dlock', 'nights', 'prep'].forEach(k => { s[k] = objOr(s[k], DEFAULT[k]); delete s[k].__proto__; });
  s.spend = mapOfObjs(s.spend);
  Object.values(s.spend).forEach(e => {
    fixNums(e, ['amt', 'at'], 0); fixStrs(e, ['d', 'what', 'cat', 'pay', 'by', 'pl', 'vid', 'src']);
    if(!has(e, 'amt')) e.amt = 0;
    if(!(typeof e.cur === 'string' && /^[A-Z]{3}$/.test(e.cur))) e.cur = 'KRW';
    if(e.split != null) e.split = Array.isArray(e.split) ? e.split.filter(x => typeof x === 'string') : null;
  });
  s.pack = mapOfObjs(s.pack);
  Object.values(s.pack).forEach(x => { fixStrs(x, ['t', 'c', 'who', 'doneBy', 'src']); fixNums(x, ['at'], 0); if(typeof x.t !== 'string') x.t = ''; });
  s.party = listOfObjs(s.party); s.party.forEach(x => { fixStrs(x, ['id', 'name']); if(typeof x.name !== 'string') x.name = ''; });
  s.moves = listOfObjs(s.moves); s.moves.forEach(m => { fixStrs(m, ['id', 'k', 'date', 'time', 'how', 'from', 'to', 'note', 'kap', 'bus', 'barea']); fixNums(m, ['min'], null); });
  s.hotels = listOfObjs(s.hotels); s.hotels.forEach(h => {
    fixStrs(h, ['id', 'name', 'ko', 'pcur', 'mapUrl', 'bookUrl', 'memo', 'area', 'st', 'src', 'label', 'addr', 'tel', 'vid']);
    fixNums(h, ['price'], 0); fixNums(h, ['lat', 'lng'], null);
    if(typeof h.name !== 'string') h.name = '';
  });
  s.custom = listOfObjs(s.custom); s.custom.forEach(p => {
    fixStrs(p, ['id', 'name', 'ja', 'gid', 'area', 'kind', 'kid', 'url', 'note', 'src', 'addr']);
    fixNums(p, ['lat', 'lng'], null); fixNums(p, ['gAt'], 0); fixNums(p, ['hours'], 1);
    if(typeof p.name !== 'string') p.name = '';
    if(p.tags != null && !Array.isArray(p.tags)) p.tags = [];
    if(p.closed != null && !Array.isArray(p.closed)) delete p.closed;
  });
  return s;
}

// 'p.key' / 'p.key.id' 경로의 값을 서버 모양 객체(기준 일정 등)에 넣기. DELETE면 지움
export function setPath(o, path, v){
  const [, key, sub] = path.split('.');
  if(!key || key === '__proto__' || sub === '__proto__') return o;
  if(sub == null){ if(v === DELETE) delete o[key]; else o[key] = v; return o; }
  o[key] = isMap(o[key]) ? o[key] : {};
  if(v === DELETE) delete o[key][sub]; else o[key][sub] = v;
  return o;
}

// 올린 뒤의 서버 모양 = 기준(prev)에 올린 차이를 얹은 것. 다음 기준으로 씀
//   (sharedOf(지금)을 그대로 기준으로 삼으면, 안 고쳐서 아직 옛 배열 모양인 목록 칸을 새 모양으로 착각해 다음에 항목 하나만 올리게 됨)
export function afterPush(prev, changes){ return changes.reduce((o, [path, v]) => setPath(o, path, v === DELETE ? DELETE : clone(v)), clone(prev || {})); }

// 차이 목록을 내 상태(배열 모양)에 얹기. 목록 칸은 id로 찾아 바꾸고·더하고·지움
export function applyChanges(s, changes){
  changes.forEach(([path, v]) => {
    const [, key, sub] = path.split('.');
    const k = LIST_KEYS.find(x => key === IT(x) || key === OD(x));
    if(!k){ setPath(s, path, v === DELETE ? DELETE : clone(v)); return; }
    const arr = Array.isArray(s[k]) ? s[k].slice() : [];
    if(key === OD(k)){ if(Array.isArray(v)) s[k] = reorder(arr, v); return; }
    if(sub == null){ if(isMap(v)) s[k] = listOf({ [IT(k)]:v, [OD(k)]:arr.map(x => x && x.id) }, k); return; }
    const i = arr.findIndex(x => x && x.id === sub);
    if(v === DELETE){ if(i >= 0) arr.splice(i, 1); }
    else { const x = clone(v); x.id = sub; if(i >= 0) arr[i] = x; else arr.push(x); }
    s[k] = arr;
  });
  return s;
}
// order에 적힌 순서대로, 적히지 않은 항목은 원래 순서대로 뒤에
function reorder(arr, order){
  const pos = new Map(); order.forEach((id, i) => { if(!pos.has(id)) pos.set(id, i); });
  const inOrder = arr.filter(x => x && pos.has(x.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id));
  return inOrder.concat(arr.filter(x => !(x && pos.has(x.id))));
}

// 서버 일정(p)을 받았을 때: 아직 서버에 못 올린 내 변경(기준 base → 지금 s)을 기억했다가 서버 일정 위에 다시 얹음.
//   목록 칸도 항목(id)마다 얹으므로 다른 사람이 더하고·고치고·지운 항목은 그대로 남고, 내가 건드린 항목만 내 것으로.
//   내가 안 건드린 항목은 기준과 같으니 차이에 안 들어가서, 남이 지운 항목이 내 옛 목록 때문에 되살아나지 않음.
// 다시 얹은 게 있으면(=올릴 게 남았으면) true
export function mergeRemote(s, p, base){
  const pending = base ? diffShared(itemsForm(base), sharedOf(s)) : [];
  applyRemote(s, p);
  if(pending.length) applyChanges(s, pending);
  return pending.length > 0;
}
// 기준이 옛 배열 모양이어도 내 변경은 항목마다 계산하도록 (서버에 보내지 않고 이 기기 안에서만 씀)
function itemsForm(b){
  const o = Object.assign({}, b);
  LIST_KEYS.forEach(k => {
    if(listForm(o, k)) return;
    const m = byId(o[k] === undefined ? DEFAULT[k] : o[k]);
    if(m){ o[IT(k)] = m.items; o[OD(k)] = m.order; delete o[k]; }
  });
  return o;
}

// 초대 링크와 읽기. 여행 번호(Firestore 자동 id, 20자)를 아는 것이 곧 초대
// 공유 여행 문서 소식을 어떻게 받을지: 'data'(일정) | 'gone'(정말 지워짐) | 'wait'(아직 모름)
//   끊긴 채로 열면 Firestore가 서버에 묻지 못하고 '이 기기 사본엔 없음'(exists:false, fromCache:true)을 먼저 줌.
//   그걸 '지워졌어요'로 보면 공유가 끊기고 끊긴 동안 고친 것도 못 올림 → 서버가 답할 때까지 기다림
export function tripSnap(exists, fromCache){ return exists ? 'data' : fromCache ? 'wait' : 'gone'; }
export function inviteLink(base, tripId){ return `${base.split('#')[0]}#join=${tripId}`; }
export function parseJoin(hash){ const m = String(hash || '').match(/^#join=([A-Za-z0-9]{10,40})$/); return m ? m[1] : null; }

// 장소 하나의 투표 모음 {uid: 1|-1} → 좋아요·글쎄요 수와 내 표
export function voteSummary(votes, placeId, uid){
  const v = (votes && votes[placeId]) || {};
  const vals = Object.values(v);
  return { up:vals.filter(x => x === 1).length, down:vals.filter(x => x === -1).length, mine:v[uid] || 0 };
}

// 바뀐 내용을 사람이 읽는 한 줄로 (변경 기록용). 장소 이름은 담긴 곳·직접 담은 곳에서 찾음
export function describeChange(prev, next){
  if(!prev) return '';
  prev = applyRemote({}, prev); next = applyRemote({}, next);   // 서버 모양(Items+Order)도 배열로 펴서 비교
  const names = id => { const p = allPlaces(next).concat(allPlaces(prev)).find(x => x.id === id); return p ? p.name : '장소'; };
  const parts = [];
  const added = Object.keys(next.picked || {}).filter(id => !(prev.picked || {})[id]);
  const removed = Object.keys(prev.picked || {}).filter(id => !(next.picked || {})[id]);
  if(added.length) parts.push(`${added.slice(0, 3).map(names).join(', ')}${added.length > 3 ? ` 외 ${added.length - 3}곳` : ''} 담음`);
  if(removed.length) parts.push(`${removed.slice(0, 3).map(names).join(', ')}${removed.length > 3 ? ` 외 ${removed.length - 3}곳` : ''} 뺌`);
  const mustAdd = Object.keys(next.must || {}).filter(id => !(prev.must || {})[id]);
  if(mustAdd.length) parts.push(`${mustAdd.map(names).join(', ')}을(를) 꼭 갈 곳으로`);
  if(prev.start !== next.start || prev.end !== next.end) parts.push(`날짜를 ${next.start || '?'} ~ ${next.end || '?'}로`);
  if(prev.hotelPick !== next.hotelPick){ const h = (next.hotels || []).find(x => x.id === next.hotelPick); parts.push(h ? `숙소를 ${h.name}(으)로 정함` : '정한 숙소를 취소'); }
  if((next.hotels || []).length > (prev.hotels || []).length) parts.push('숙소 후보 추가');
  if(!same(prev.assign, next.assign)) parts.push('일정 순서 조정');
  if(!same(prev.flight, next.flight)) parts.push('비행기 시간 고침');
  if(!same(prev.moves, next.moves)) parts.push('오가는 길 고침');
  { const pd = Object.keys(next.prep || {}).filter(k => next.prep[k] && !(prev.prep || {})[k]).length; if(pd) parts.push(`출발 전 할 일 ${pd}개 함`); }
  const ps = prev.spend || {}, ns = next.spend || {};
  const sAdd = Object.keys(ns).filter(id => !ps[id]), sDel = Object.keys(ps).filter(id => !ns[id]);
  const sEdit = Object.keys(ns).filter(id => ps[id] && !same(ps[id], ns[id]));
  if(sAdd.length){ const e = ns[sAdd[0]]; parts.push(`지출 적음: ${[e.what, money(e.amt, e.cur)].filter(Boolean).join(' ')}${sAdd.length > 1 ? ` 외 ${sAdd.length - 1}건` : ''}`); }
  if(sEdit.length) parts.push(`지출 ${sEdit.length}건 고침`);
  if(sDel.length) parts.push(`지출 ${sDel.length}건 지움`);
  const pp = prev.pack || {}, np = next.pack || {};
  const pAdd = Object.keys(np).filter(id => !pp[id] && !np[id].hide);
  const pDone = Object.keys(np).filter(id => pp[id] && np[id].done && !pp[id].done).length;
  const pUndo = Object.keys(np).filter(id => pp[id] && !np[id].done && pp[id].done).length;
  if(pAdd.length) parts.push(pAdd.length > 3 ? `준비물 ${pAdd.length}개 추가` : `준비물 추가: ${pAdd.map(id => np[id].t).join(', ')}`);
  if(pDone) parts.push(`준비물 ${pDone}개 챙김`);
  if(pUndo) parts.push(`준비물 ${pUndo}개 체크 풂`);
  if(!same(prev.party, next.party)) parts.push('정산할 사람 바꿈');
  if(!same(prev.safety, next.safety)) parts.push('긴급 정보(숙소 주소·만날 장소) 고침');
  if(prev.lrate !== next.lrate) parts.push('정산 환율 바꿈');
  if(!same(prev.dlock || {}, next.dlock || {})) parts.push(Object.keys(next.dlock || {}).length > Object.keys(prev.dlock || {}).length ? '일정 확정' : '일정 확정 풀기');
  if(!same(budgetOf(prev), budgetOf(next))) parts.push('예산 바꿈');
  if(!parts.length && !same(prev, next)) parts.push('일정 수정');
  return parts.join(' · ').slice(0, 190);
}

// 공유 여행 기본 제목: '도쿄 3/7~3/11'
export function defaultTitle(s){
  const city = s.city === 'hksz' && s.cityOnly ? ({ hk:'홍콩', sz:'선전' }[s.cityOnly] || '홍콩·선전') : ({ tokyo:'도쿄', hksz:'홍콩·선전' }[s.city] || '여행');
  if(!s.start || !s.end) return `${city} 여행`;
  const f = d => { const [, m, dd] = d.split('-').map(Number); return `${m}/${dd}`; };
  return `${city} ${f(s.start)}~${f(s.end)}`;
}
