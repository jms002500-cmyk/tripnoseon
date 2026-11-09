// 일정 줄마다 그 일에 필요한 서류(보관함 예약)를 바로 꺼내기 (2026-11-09, 사용자 요청: 일정마다 보관함에서 일일이 찾지 않게)
//   비행기 줄 → 그 편 항공권, 이동 줄(공항 픽업·샌딩 등) → 그 이동에 연결한 교통 예약, 장소 → 그 장소에 연결한 입장권·예약,
//   예약 줄(체크인·입장권) → 그 예약. 순수 함수(테스트 대상). 보관함은 이 기기에만 있어서 서류 버튼도 이 기기에서만 보임
import { bookings } from './vault.js';
import { flightDir } from './bookings.js';

export const DOC_LABEL = { flight:'탑승권', hotel:'숙소 확인서', ticket:'입장권', transport:'예약 확인서', entry:'입국 서류', insurance:'보험 증권', etc:'서류' };
export const docLabel = it => DOC_LABEL[it && it.kind] || '서류';

// q: { place:장소 id } | { move:이동 id } | { flight:'out'|'back' } | { id:예약 id }
export function docsOf(s, q){
  const B = bookings(s && s.vault); if(!q) return [];
  if(q.id) return B.filter(it => it.id === q.id);
  if(q.place) return B.filter(it => it.placeId === q.place);
  if(q.move) return B.filter(it => it.moveId === q.move);
  if(q.flight) return B.filter(it => it.kind === 'flight' && flightDir(s, it) === q.flight);
  return [];
}
