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

// 시간표·예약 바로가기: 배·기차·공항버스 같은 수단은 그날 운행 시간을 공식 누리집에서 바로 확인 (주소 확인 2026-10-31)
//   주소만 여는 링크라 앱이 아무 정보도 보내지 않음. area: 'kr'(집 ↔ 공항) | 지역 키, how: 수단, legs: 이 구간에만
export const TT_CHECKED = '2026-10-31';
export const TIMETABLES = [
  { id:'arex', label:'공항철도(AREX) 시간표', url:'https://www.arex.or.kr/', area:'kr', how:['rail'] },
  { id:'icnbus', label:'인천공항 버스 노선·시간 검색', url:'https://www.airport.kr/ap_ko/974/subview.do', area:'kr', how:['abus', 'bus'] },
  { id:'mtrae', label:'홍콩 공항철도(Airport Express) 운행 안내', url:'https://www.mtr.com.hk/en/customer/services/airport_express_index.html', area:'hksz', how:['rail'], legs:['in', 'out'] },
  { id:'mtrjp', label:'MTR 경로·시간 검색', url:'https://www.mtr.com.hk/en/customer/jp/index.php', area:'hksz', how:['metro', 'rail'] },
  { id:'xrl', label:'홍콩 고속철(서구룡역 ↔ 선전·광저우) 시간표·표', url:'https://www.highspeed.mtr.com.hk/en/main/index.html', area:'hksz', how:['rail'], legs:['etc'] },
  { id:'cnrail', label:'중국 기차 시간표·예매 (트립닷컴 한국어)', url:'https://kr.trip.com/trains/china/', area:'hksz', how:['rail'], legs:['etc'] },
  { id:'turbojet', label:'터보젯 배 시간표 (홍콩 ↔ 마카오)', url:'https://www.turbojet.com.hk/kr/', area:'hksz', how:['ferry'] },
  { id:'cotai', label:'코타이 워터젯 배 시간표 (홍콩 ↔ 마카오)', url:'https://www.cotaiwaterjet.com/', area:'hksz', how:['ferry'] },
  { id:'hzmb', label:'강주아오대교 셔틀버스 (홍콩 ↔ 마카오·주하이)', url:'https://www.hzmbus.com/', area:'hksz', how:['bus'], legs:['etc'] },
  { id:'nex', label:"나리타 익스프레스(N'EX) 안내", url:'https://www.jreast.co.jp/ko/multi/nex/', area:'tokyo', how:['rail'], legs:['in', 'out'] },
  { id:'skyliner', label:'게이세이 스카이라이너 시간표·예약', url:'https://www.keisei.co.jp/keisei/tetudou/skyliner/kr/index.php', area:'tokyo', how:['rail'], legs:['in', 'out'] },
  { id:'limo', label:'공항 리무진 버스 시간표', url:'https://www.limousinebus.co.jp/ko/', area:'tokyo', how:['abus', 'bus'], legs:['in', 'out'] },
  { id:'smartex', label:'신칸센 시간·예약 (도카이도·산요)', url:'https://smart-ex.jp/en/', area:'tokyo', how:['rail'], legs:['etc'] },
  { id:'navitime', label:'NAVITIME 일본 전철·버스 (날짜·시각으로 검색)', url:'https://japantravel.navitime.com/ko/', area:'tokyo', how:['rail', 'metro', 'bus', 'abus'] }
];
// 이 이동에 맞는 바로가기. 수단을 안 골랐으면 없음
export function timetableLinks(s, m){
  if(!m || !m.how) return [];
  const area = legOf(m.k).home ? 'kr' : s.city;
  return TIMETABLES.filter(t => t.area === area && t.how.includes(m.how) && (!t.legs || t.legs.includes(m.k)));
}

// 보관함에 넣을 예약(교통) 초안
export function vaultDraft(s, m, ctx){
  const h = howOf(m.how); const e = moveEnds(m, ctx);
  return { kind:'transport', moveId:m.id, title:`${h ? h.label : '이동'} · ${e.from} → ${e.to}`.slice(0, 60), date:moveDate(s, m), time:toMin(m.time) != null ? m.time : '',
    why:'예약 확인서·바우처·예약번호를 넣어 두면 타는 곳에서 바로 꺼내 보여 줄 수 있어요.' };
}
