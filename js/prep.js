// 출발 전 할 일 타임라인: 가는 날 기준 D-30 ~ 당일, 지역·동행·한 일에 맞춰. 순수 함수(테스트 대상).
//   s.prep = { 할 일 키:true } — 함께 짜기로 공유(가족 누가 해도 체크). 앱에서 이미 해 둔 건(여권 사본·오가는 길·준비물) 저절로 체크
//   go: 그 화면으로 가는 버튼(app.js goTo 목적지: js/packing.js PACK_GO 값, js/guide.js DEST 이름)
//   몰라서 못 쓰는 기능이 없게, 쓸 때가 된 날에 그 기능을 할 일로 꺼내 줌(AI 추천·주차장·공항버스·백업·끊김 확인·도움)
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
  add(20, 'places', '가고 싶은 곳 담기', '쓰시는 AI 앱에 우리 가족에 맞는 곳을 물어보고 답을 붙여 넣으면 장소를 찾아 담아 드려요.' + (hk ? ' 동네별 가족 식당도 골라 뒀어요.' : ''), 'aiplan');
  add(30, 'passexp', '여권 만료일 확인', `여권이 여행 끝나는 날부터 6개월 넘게 남았는지 보세요${kids ? '(아이 여권도)' : ''}. 새로 만들면 1~2주 걸려요.`);
  add(21, 'insure', '여행자 보험 들기', '아이·어른 모두. 증권은 보관함에 넣어 두세요.', 'vault');
  add(14, 'data', '로밍·eSIM 정하기', sz ? '선전(중국 본토)은 카카오톡·구글이 막혀요. 한국 통신사 로밍이 가장 편해요.' : '길찾기·번역을 계속 쓰니 데이터가 넉넉한 걸로.');
  add(10, 'money', '현지 돈 조금 바꾸기', hk ? '홍콩달러 조금(옥토퍼스 충전·작은 가게)' + (sz ? ', 선전은 알리페이·위챗페이로 대부분 돼요.' : '.') : jp ? '엔화 현금·동전 지갑. 작은 식당·자판기는 현금만 받는 곳이 많아요.' : '');
  if(sz) add(7, 'cnarrive', '중국 입국카드 온라인 작성', '가족 한 사람씩. 작성한 화면을 캡처해 보관함에 넣어 두세요.', 'vault');
  if(jp) add(7, 'vjw', 'Visit Japan Web 등록', '입국 심사·세관 QR. 한 계정에 같이 가는 가족을 넣고, QR은 한 사람씩 따로 보여 줘요.', 'vault');
  add(7, 'packlist', '준비물 체크리스트 만들기', '추천을 담고 누구 짐인지 나눠 두세요.', 'pack');
  add(5, 'moves', '공항 오가는 길 정하기', '자가용이면 공항 주차장 남은 자리를, 공항버스면 우리 동네를 지나는 버스를 앱에서 찾아 드려요. 정한 시각이 일정에 들어가요.', 'movebox');
  add(3, 'backup', '백업 파일 만들어 두기', '폰을 잃어버리거나 바꿔도 다른 폰에서 일정·보관함을 그대로 되돌릴 수 있어요.', 'backupbox');
  add(2, 'offline', '인터넷 없이 열리는지 확인', '비행기 모드로 앱을 한 번 열어 보세요. 일정·보관함·긴급 정보는 이 폰에 저장돼 있어요. 홈 화면에 설치해 두면 더 빨리 열려요.');
  add(3, 'weather', '일기예보 보기', '여행지 단계 날씨에 출발 16일 안부터 예보가 떠요. 비 오면 일정 단계 \'비 오면?\'으로 바꿔요.', 'where');
  add(2, 'checkin', '항공사 온라인 체크인', '보통 출발 24~48시간 전에 열려요(항공사마다 달라요). 좌석을 같이 앉게 정해요.');
  add(1, 'idcopy', '여권 사본 넣어 두기', '여권을 잃어버리면 여행증명서를 빨리 받아요. 이 폰에만 저장돼요.', 'idbox');
  add(1, 'cal', '일정을 폰 캘린더에 넣기', '공항 가기 1시간 전 같은 알림을 폰이 울려 줘요.', 'icsbox');
  add(1, 'bag', '짐 마무리', '보조배터리는 부치는 짐 말고 들고 타요. 액체는 100ml 이하로.', 'pack');
  add(1, 'helpread', '여행 중 쓸 기능 훑어보기', (hk ? 'MTR 다음 열차, 근처 가족 식당, 국경 대기 시간, 긴급 숙소 카드처럼' : '오늘 하루, 근처 식당, 긴급 숙소 카드, 📷 메뉴판 묻기처럼') + ' 여행 중에 쓰는 기능을 위쪽 ‘도움’에 모아 뒀어요.', 'help');
  add(0, 'leave', '집에서 나서는 시각 확인', '공항버스·기차 시각과 공항 도착 시간(출발 2~3시간 전)을 다시 보세요.', 'movebox');
  const go = (s.moves || []).find(m => m.k === 'go');
  if(go && go.how === 'car') add(0, 'parknow', '공항 주차장 남은 자리 보기', '나서기 전에 주차장마다 얼마나 찼는지 보고 덜 붐비는 곳으로 가요.', 'movebox');
  if(go && go.how === 'abus') add(0, 'busnow', '공항버스 시간 다시 보기', '정해 둔 버스와 동네 정류장 시각을 나서기 전에 한 번 더 확인해요.', 'movebox');
  const auto = {
    idcopy:idCopies(s.vault).some(x => (x.files || []).length),
    moves:(s.moves || []).some(m => (m.k === 'go' || m.k === 'in') && !isEmptyMove(m)),
    packlist:Object.values(s.pack || {}).some(x => x && !x.hide),
    places:Object.keys(s.picked || {}).length >= 3,
    backup:!!s.lastBackup
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
