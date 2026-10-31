// 출발 전 할 일 타임라인: 가는 날 기준 D-30 ~ 당일, 지역·동행·한 일에 맞춰. 순수 함수(테스트 대상).
//   s.prep = { 할 일 키:true } — 함께 짜기로 공유(가족 누가 해도 체크). 앱에서 이미 해 둔 건(여권 사본·오가는 길·준비물) 저절로 체크
//   go: 그 화면으로 가는 버튼(app.js 'pkgo'와 같은 목적지, js/packing.js PACK_GO 값)
import { idCopies } from './vault.js';
import { isEmptyMove } from './moves.js';

const addDay = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export const daysTo = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// → [{ key, dday, date, t, why, go, done, auto }] 날짜순
export function prepTasks(s){
  if(!s.start) return [];
  const hk = s.city === 'hksz', jp = s.city === 'tokyo'; const sz = hk && s.cityOnly !== 'hk';
  const kids = s.who === 'family' && (s.kids || []).length;
  const L = [];
  const add = (dday, key, t, why, go) => L.push({ key, dday, t, why:why || '', go:go || '' });
  add(30, 'passexp', '여권 만료일 확인', `여권이 여행 끝나는 날부터 6개월 넘게 남았는지 보세요${kids ? '(아이 여권도)' : ''}. 새로 만들면 1~2주 걸려요.`);
  add(21, 'insure', '여행자 보험 들기', '아이·어른 모두. 증권은 보관함에 넣어 두세요.', 'vault');
  add(14, 'data', '로밍·eSIM 정하기', sz ? '선전(중국 본토)은 카카오톡·구글이 막혀요. 한국 통신사 로밍이 가장 편해요.' : '길찾기·번역을 계속 쓰니 데이터가 넉넉한 걸로.');
  add(10, 'money', '현지 돈 조금 바꾸기', hk ? '홍콩달러 조금(옥토퍼스 충전·작은 가게)' + (sz ? ', 선전은 알리페이·위챗페이로 대부분 돼요.' : '.') : jp ? '엔화 현금·동전 지갑. 작은 식당·자판기는 현금만 받는 곳이 많아요.' : '');
  if(sz) add(7, 'cnarrive', '중국 입국카드 온라인 작성', '가족 한 사람씩. 작성한 화면을 캡처해 보관함에 넣어 두세요.', 'vault');
  if(jp) add(7, 'vjw', 'Visit Japan Web 등록', '입국 심사·세관 QR. 가족 한 사람씩 등록해요.', 'vault');
  add(7, 'packlist', '준비물 체크리스트 만들기', '추천을 담고 누구 짐인지 나눠 두세요.', 'pack');
  add(5, 'moves', '공항 오가는 길 정하기', '공항버스·픽업은 미리 예약할수록 좋아요. 정한 시각이 일정에 들어가요.', 'movebox');
  add(3, 'weather', '일기예보 보기', '여행지 단계 날씨에 출발 16일 안부터 예보가 떠요. 비 오면 일정 단계 \'비 오면?\'으로 바꿔요.', 'where');
  add(2, 'checkin', '항공사 온라인 체크인', '보통 출발 24~48시간 전에 열려요(항공사마다 달라요). 좌석을 같이 앉게 정해요.');
  add(1, 'idcopy', '여권 사본 넣어 두기', '여권을 잃어버리면 여행증명서를 빨리 받아요. 이 폰에만 저장돼요.', 'idbox');
  add(1, 'cal', '일정을 폰 캘린더에 넣기', '공항 가기 1시간 전 같은 알림을 폰이 울려 줘요.', 'icsbox');
  add(1, 'bag', '짐 마무리', '보조배터리는 부치는 짐 말고 들고 타요. 액체는 100ml 이하로.', 'pack');
  add(0, 'leave', '집에서 나서는 시각 확인', '공항버스·기차 시각과 공항 도착 시간(출발 2~3시간 전)을 다시 보세요.', 'movebox');
  const auto = {
    idcopy:idCopies(s.vault).some(x => (x.files || []).length),
    moves:(s.moves || []).some(m => (m.k === 'go' || m.k === 'in') && !isEmptyMove(m)),
    packlist:Object.values(s.pack || {}).some(x => x && !x.hide)
  };
  const done = s.prep || {};
  return L.map(x => Object.assign(x, { date:addDay(s.start, -x.dday), done:!!done[x.key] || !!auto[x.key], auto:!done[x.key] && !!auto[x.key] }))
    .sort((a, b) => b.dday - a.dday);
}

// 오늘 기준: 지난 할 일 중 안 한 것(late) + 오늘~3일 안 할 일(soon). 출발 뒤면 없음
export function prepNow(s, today){
  if(!s.start || !today || today > s.start) return { late:[], soon:[], left:0 };
  const all = prepTasks(s); const left = daysTo(today, s.start);
  return { late:all.filter(x => !x.done && x.dday > left), soon:all.filter(x => !x.done && x.dday <= left && x.dday >= left - 3), left };
}
