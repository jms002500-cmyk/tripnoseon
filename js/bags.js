// 숙소 옮기는 날 짐을 어떻게 할지: 맡겼다 찾기 · 먼저 옮기기 · 국경 넘는 차 · 들고 다니기.
//   s.bags = { 'YYYY-MM-DD': 'keep'|'first'|'car'|'carry' } — 함께 짜기로 공유(가족 누가 정해도 같이 보임).
//   고르면 그날 시간 정해진 일(js/agenda.js)에 줄이 생기고, '맡겼다 찾기'는 되돌아가는 1시간을 그날 다닐 시간에서 뺌(js/logic.js plan).
//   순수 함수(테스트 대상). d: plan(s).days의 하루(from·to 숙소, cross: 국경 넘는 날)
import { DAY_START } from './flight.js';

export const BAG_WAYS = ['keep', 'first', 'car', 'carry'];
export const KEEP_BACK = 1;   // 맡긴 짐 찾으러 되돌아가는 시간(시간)

// 숙소를 옮기는 날인지 (마지막 날 숙소 → 공항은 아님)
export const moveDay = d => !!(d && d.from && d.to && d.from.name && d.to.name && d.from.name !== d.to.name && d.kind !== 'depart' && d.kind !== 'single');

export function bagChoices(d){
  if(!moveDay(d)) return [];
  const x = !!d.cross, A = d.from.name, B = d.to.name;
  return [
    { k:'keep', label:'맡겼다 찾기', text:`체크아웃하고 ${A} 프런트에 짐을 맡긴 뒤 가볍게 다녀요. 끝나면 돌아가 짐을 찾아 ${x ? '국경을 넘어 ' : ''}${B}로 가요. 되돌아가는 1시간쯤을 빼고 일정을 잡아요.` },
    { k:'first', label:'먼저 옮기기', text:`아침에 짐을 들고 먼저 ${x ? '국경을 넘어 ' : ''}${B}에 가서 맡겨요(체크인 전이라도 보통 맡아 줘요. 미리 물어보세요). 그다음은 새 숙소 근처에서 다녀요.${x ? ' 짐 들고 국경을 넘는 건 덜 붐비는 아침이 편해요.' : ''}` },
    ...(x ? [{ k:'car', label:'국경 넘는 차', text:`국경 넘는 차(크로스보더 차량)를 예약하면 ${A} 앞에서 ${B} 앞까지 짐째 가요. 정한 시각은 일정 단계 '오가는 길'의 여행 중 이동에 넣어 두세요.` }] : []),
    { k:'carry', label:'들고 다니기', text:`짐이 작으면 들고 다녀도 돼요. ${x ? '국경 검문소와 ' : ''}지하철 갈아타는 길은 계단·긴 통로가 많아서 큰 캐리어는 힘들어요.` }
  ];
}

// 그날 시간 정해진 일에 넣을 줄. end: 그날 마지막 장소를 마치는 시각(분, 모르면 null)
export function bagRows(s, d, end){
  if(!moveDay(d)) return [];
  const w = (s.bags || {})[d.key], A = d.from.name, B = d.to.name;
  if(w === 'keep') return [{ min:DAY_START - 10, icon:'🧳', text:`체크아웃 · ${A}에 짐 맡기기`, sub:'구경 끝나고 찾으러 와요', kind:'bag' },
    ...(end != null ? [{ min:end, icon:'🧳', text:`${A}에서 짐 찾아 ${B}로`, sub:d.cross ? '국경 넘기 · 짐 들고 걷는 길이 있어요' : '짐 찾아 새 숙소로', kind:'bag' }] : [])];
  if(w === 'first') return [{ min:DAY_START - 10, icon:'🧳', text:`체크아웃 → ${B}에 먼저 짐 맡기기`, sub:d.cross ? '짐 들고 국경 넘기 · 아침이 덜 붐벼요' : '체크인 전이어도 프런트에 맡아 줘요', kind:'bag' }];
  if(w === 'car') return [{ min:DAY_START - 10, icon:'🚐', text:`체크아웃 → 국경 넘는 차로 ${B}까지`, sub:'탈 시각을 오가는 길에 넣으면 그 시각으로 보여요', kind:'bag' }];
  if(w === 'carry') return [{ min:DAY_START - 10, icon:'🧳', text:'체크아웃 · 짐 들고 다니기', sub:'큰 캐리어는 계단·긴 통로에서 힘들어요', kind:'bag' }];
  return [{ min:DAY_START - 10, icon:'🧳', text:'숙소 옮기는 날 · 짐을 어떻게 할지 정해요', sub:`${A} → ${B} · 오늘 화면·일정 단계의 '짐 옮기는 날'에서 골라요`, kind:'note' }];
}

// 고른 대로 그날 다닐 시간에서 뺄 시간 (맡겼다 찾기만)
export const bagCapCut = (s, d) => moveDay(d) && (s.bags || {})[d.key] === 'keep' ? KEEP_BACK : 0;
