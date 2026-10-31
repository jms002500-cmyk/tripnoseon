// 오가는 길: 집 ↔ 공항, 공항 ↔ 숙소, 여행 중 예약한 이동(국경 버스·기차·배·픽업 차량 등)을 일정에 같이 보여 줌.
// s.moves = [{ id, k, date, time, how, min, from, to, booked, note }] — 함께 짜기로 공유(예약번호·바우처는 넣지 않고 보관함에).
//   k: 'go' 집→공항(가는 날, 한국 시각) · 'in' 공항→숙소(첫날) · 'out' 숙소→공항(마지막 날) · 'back' 공항→집(오는 날, 한국 시각) · 'etc' 여행 중(date)
//   time: 타는(나서는) 시각 'HH:MM', min: 걸리는 시간(분, 모르면 null). from·to를 비우면 기본 이름(집·공항·숙소)
// 'in'·'out'에 시각·걸리는 시간을 넣으면 첫날·마지막 날 다닐 시간 계산(js/flight.js)이 그 값을 씀. 순수 함수(테스트 대상).
import { toMin } from './flight.js';

export const MOVE_LEGS = [
  { k:'go', label:'집 → 공항', icon:'🏠', home:true, timeLabel:'집에서 나서는 시각' },
  { k:'in', label:'공항 → 숙소', icon:'🛬', timeLabel:'공항에서 출발(픽업) 시각' },
  { k:'out', label:'숙소 → 공항', icon:'🛫', timeLabel:'숙소에서 나서는(픽업) 시각' },
  { k:'back', label:'공항 → 집', icon:'🏠', home:true, timeLabel:'공항에서 출발 시각' },
  { k:'etc', label:'여행 중 이동', icon:'🧭', timeLabel:'타는 시각' }
];
export const MOVE_HOW = [
  { k:'car', label:'자가용', icon:'🚗' }, { k:'abus', label:'공항버스', icon:'🚌' }, { k:'rail', label:'공항철도·기차', icon:'🚆' },
  { k:'taxi', label:'택시', icon:'🚕' }, { k:'pick', label:'픽업 차량', icon:'🚐' }, { k:'bus', label:'버스', icon:'🚌' },
  { k:'metro', label:'지하철', icon:'🚇' }, { k:'ferry', label:'배', icon:'⛴️' }, { k:'etc', label:'기타', icon:'🧭' }
];
export const legOf = k => MOVE_LEGS.find(x => x.k === k) || MOVE_LEGS[MOVE_LEGS.length - 1];
export const howOf = k => MOVE_HOW.find(x => x.k === k) || null;
export const STD_LEGS = ['go', 'in', 'out', 'back'];
const RANK = { go:0, in:1, etc:2, out:3, back:4 };

// 이동 날짜: 공항 오가는 길은 가는 날·오는 날, 여행 중 이동은 넣은 날짜
export const moveDate = (s, m) => m.k === 'go' || m.k === 'in' ? s.start || '' : m.k === 'out' || m.k === 'back' ? s.end || '' : m.date || '';
export const moveMin = m => m && m.min > 0 ? Math.round(m.min) : null;
// 넣은 게 하나도 없으면 빈 이동(완료할 때 지움)
export const isEmptyMove = m => !m.how && toMin(m.time) == null && !moveMin(m) && !m.booked && !(m.note || '').trim() && !(m.from || '').trim() && !(m.to || '').trim();

// 출발·도착 이름. ctx: { ap:'도착 공항 이름', inHotel, outHotel }
export function moveEnds(m, ctx){
  const c = ctx || {}; const f = (m.from || '').trim(), t = (m.to || '').trim();
  const def = { go:['집', '공항'], in:[c.ap || '공항', c.inHotel || '숙소'], out:[c.outHotel || '숙소', c.ap || '공항'], back:['공항', '집'], etc:['출발지', '도착지'] }[m.k] || ['출발지', '도착지'];
  return { from:f || def[0], to:t || def[1] };
}

// 그날 이동, 하루 안 순서: 집→공항, 공항→숙소, 여행 중(시각순), 숙소→공항, 공항→집
export function movesOn(s, key){
  return (s.moves || []).filter(m => key && moveDate(s, m) === key)
    .sort((a, b) => RANK[a.k] - RANK[b.k] || String(a.time || '99:99').localeCompare(String(b.time || '99:99')));
}

// 첫날·마지막 날 비행기 계산(js/flight.js)에 넘길 값 { time(분|null), min(분|null) } | null
export function legOverride(s, k){
  const m = (s.moves || []).find(x => x.k === k); if(!m) return null;
  const t = toMin(m.time), n = moveMin(m);
  return t == null && n == null ? null : { time:t, min:n };
}

// 여행 중 이동에 쓰는 시간(분): 하루가 빠듯한지 볼 때 더함
export const etcMinutes = (s, key) => movesOn(s, key).filter(m => m.k === 'etc').reduce((a, m) => a + (moveMin(m) || 0), 0);

// 한 줄 요약: '🚐 픽업 차량 · 홍콩 국제공항 → 숙소 · 약 50분'
export function moveText(m, ctx, minText){
  const h = howOf(m.how); const e = moveEnds(m, ctx); const n = moveMin(m);
  return `${h ? `${h.icon} ${h.label}` : `${legOf(m.k).icon} 수단 미정`} · ${e.from} → ${e.to}${n ? ` · 약 ${minText ? minText(n) : `${n}분`}` : ''}`;
}

// 보관함에 넣을 예약(교통) 초안
export function vaultDraft(s, m, ctx){
  const h = howOf(m.how); const e = moveEnds(m, ctx);
  return { kind:'transport', title:`${h ? h.label : '이동'} · ${e.from} → ${e.to}`.slice(0, 60), date:moveDate(s, m), time:toMin(m.time) != null ? m.time : '',
    why:'예약 확인서·바우처·예약번호를 넣어 두면 타는 곳에서 바로 꺼내 보여 줄 수 있어요.' };
}
