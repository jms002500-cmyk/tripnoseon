// 함께 짜기(공유 여행)의 순수 함수 모음. Firebase·DOM을 건드리지 않음 → tests/에서 바로 테스트.
// 공유하는 것은 일정(SHARED_KEYS)뿐. 화면 위치·필터·라쿠텐 키·날씨·환율·가져오기 대기 목록은 각자 기기에만 둠.
import { DEFAULT } from './data.js';
import { allPlaces } from './logic.js';

export const SHARED_KEYS = ['who', 'adults', 'kids', 'styles', 'pace', 'country', 'city', 'start', 'end',
  'picked', 'must', 'fullDay', 'custom', 'hotelArea', 'assign', 'hotels', 'hotelPick', 'hotelCur'];
// 장소 id → 값 모양의 납작한 맵. 칸 하나씩 따로 보내서 두 사람이 다른 장소를 동시에 담아도 서로 덮어쓰지 않게
export const MAP_KEYS = ['picked', 'must', 'fullDay', 'assign'];
export const DELETE = { __delete:true };   // Firebase deleteField()로 바꿔 보낼 표시

const clone = o => JSON.parse(JSON.stringify(o === undefined ? null : o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const safeId = k => /^[A-Za-z0-9_-]{1,80}$/.test(k);

export function sharedOf(s){ const o = {}; SHARED_KEYS.forEach(k => { o[k] = clone(s[k] === undefined ? DEFAULT[k] : s[k]); }); return o; }

// 지난번 맞춘 일정(prev) → 지금 일정(next) 차이를 Firestore 갱신 목록으로: [['p.picked.sensoji', true], ['p.start', '2027-03-07'], ...]
export function diffShared(prev, next){
  const out = [];
  SHARED_KEYS.forEach(k => {
    const a = prev ? prev[k] : undefined, b = next[k];
    if(same(a, b)) return;
    if(MAP_KEYS.includes(k) && a && b && typeof a === 'object' && typeof b === 'object' && Object.keys(a).concat(Object.keys(b)).every(safeId)){
      new Set(Object.keys(a).concat(Object.keys(b))).forEach(id => {
        if(!(id in b)) out.push([`p.${k}.${id}`, DELETE]);
        else if(!same(a[id], b[id])) out.push([`p.${k}.${id}`, clone(b[id])]);
      });
    } else out.push([`p.${k}`, clone(b)]);
  });
  return out;
}

// 서버의 일정(p)을 내 상태에 덮어씀. 없는 칸은 기본값
export function applyRemote(s, p){
  SHARED_KEYS.forEach(k => { s[k] = clone(p && p[k] !== undefined ? p[k] : DEFAULT[k]); });
  return s;
}

// 초대 링크와 읽기. 여행 번호(Firestore 자동 id, 20자)를 아는 것이 곧 초대
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
  if(!parts.length && !same(prev, next)) parts.push('일정 수정');
  return parts.join(' · ').slice(0, 190);
}

// 공유 여행 기본 제목: '도쿄 3/7~3/11'
export function defaultTitle(s){
  const city = { tokyo:'도쿄' }[s.city] || '여행';
  if(!s.start || !s.end) return `${city} 여행`;
  const f = d => { const [, m, dd] = d.split('-').map(Number); return `${m}/${dd}`; };
  return `${city} ${f(s.start)}~${f(s.end)}`;
}
