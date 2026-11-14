// 출발 전 할 일 타임라인: 가는 날 기준 D-30 ~ 당일, 지역·동행·한 일에 맞춰. 순수 함수(테스트 대상).
//   s.prep = { 할 일 키:true } — 함께 짜기로 공유(가족 누가 해도 체크). 앱에서 이미 해 둔 건(여권 사본·오가는 길·준비물) 저절로 체크
//   go: 그 화면으로 가는 버튼(app.js goTo 목적지: js/packing.js PACK_GO 값, js/guide.js DEST 이름)
//   몰라서 못 쓰는 기능이 없게, 쓸 때가 된 날에 그 기능을 할 일로 꺼내 줌(AI 추천·주차장·공항버스·백업·끊김 확인·도움)
import { idCopies } from './vault.js';
import { isEmptyMove } from './moves.js';
import { pickedPlaces } from './logic.js';
import { airlineOf, onlineText, counterFor } from './airlines.js';

const addDay = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const addrOk = a => !!(a || '').trim() && !/[가-힣]/.test(a);   // 기사님이 읽을 수 있는 현지어 주소
export const daysTo = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// 여행 준비라기보다 앱 기능을 미리 써 보는 일: 화면에서 '앱에서 해 두면 좋은 것'으로 따로 접어 둠 (app:true)
export const PREP_APP = ['askkey', 'gsave', 'backup', 'weather', 'voice', 'offline', 'helpread'];
// → [{ key, dday, date, t, why, go, done, auto, app? }] 날짜순
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
  if(sz) add(10, 'payapp', '알리페이·위챗페이 깔고 카드 연결', '선전(중국 본토)은 가게·택시 대부분이 휴대폰 결제예요. 한국에서 앱을 깔고 해외 카드(Visa·Mastercard·JCB 등)를 연결해 두세요. 연결이 거절되면 카드사에 물어야 하니 미리 해요.');
  if(sz) add(5, 'mapapp', '가오더 지도(Amap) 앱 깔기', '선전(중국 본토)에선 구글 지도가 잘 안 돼요. 가오더는 한국어 화면이 있고 차 부르기도 돼요. 한국에서 깔고 한 번 열어 두세요.');
  if(sz) add(7, 'cnarrive', '중국 입국카드 온라인 작성', '가족 한 사람씩. 작성한 화면을 캡처해 보관함에 넣어 두세요.', 'vault');
  if(jp) add(7, 'vjw', 'Visit Japan Web 등록', '입국 심사·세관 QR. 한 계정에 같이 가는 가족을 넣고, QR은 한 사람씩 따로 보여 줘요.', 'vault');
  add(5, 'transapp', '번역 앱에 오프라인 언어 받기', `구글 번역 앱에서 ${hk ? '중국어(번체·간체)' : '일본어'} 오프라인 번역을 받아 두면 인터넷이 끊겨도 카메라로 간판·안내문을 읽어요.${sz ? ' 선전에서 현지 유심을 쓰면 구글이 막히는데, 받아 둔 언어는 그대로 돼요.' : ''}`);
  add(5, 'askkey', '📷 메뉴판 읽기 준비', '메뉴판 사진을 찍으면 한국어로 풀어 주고 고른 메뉴로 주문 문장을 만들어 줘요. AI 묻기 창에서 구글 AI 키를 한 번 넣어 두세요. 키가 없어도 준비된 부탁·질문 문구는 인터넷 없이 쓸 수 있어요.', 'ask');
  add(21, 'hoteladd', '예약한 숙소를 앱에 넣기', '숙소 예약 확인서를 보관함에 넣으면 숙소 위치·밤별 숙소·긴급 숙소 카드가 저절로 채워져요. 아직 안 정했으면 숙소 동네 단계에서 동네부터 골라요.', 'vault');
  add(14, 'hotelcard', '택시용 숙소 주소 카드 채우기', `예약 확인서의 ${hk ? '한자' : '일본어'} 주소와 숙소 전화를 넣어 두면 택시 기사나 길을 물을 사람에게 화면만 크게 보여 주면 돼요.${hk ? ' 홍콩·선전에 나눠 자면 숙소마다 넣어요.' : ''}`, 'soshotel');
  if(kids) add(3, 'kidcard', '아이 미아 카드 만들기', '긴급 화면에 부모 연락처를 넣으면 현지어 카드가 만들어져요. 아이 폰 배경으로 캡처해 두면 아이가 혼자서도 보여 줄 수 있어요.', 'soskid');
  add(2, 'voice', '🔊 소리로 들려주기 시험', `긴급 화면의 문장을 눌러 크게 보기에서 🔊를 한 번 눌러 보세요. 소리가 안 나면 폰 설정의 '텍스트 음성 변환'에서 ${hk ? '중국어·광둥어' : '일본어'} 음성을 받아 두세요.`, 'sos');
  add(5, 'gsave', '⭐ 담은 곳을 내 구글 지도에 저장', '일정 단계의 \'내 구글 지도에 저장\'에서 한 곳씩 누르면 구글 지도 앱이 그 장소로 열려요. \'저장\'을 눌러 여행 목록에 넣어 두면 여행 중 구글 지도 \'저장됨\'에서 바로 보여요.' + (sz ? ' 선전(중국 본토)에서는 로밍이 아니면 구글 지도가 안 열리니 한국에서 해 두세요.' : ''), 'gsavebox');
  add(7, 'packlist', '준비물 체크리스트 만들기', '추천을 담고 누구 짐인지 나눠 두세요.', 'pack');
  add(5, 'moves', '공항 오가는 길 정하기', '자가용이면 공항 주차장 남은 자리를, 공항버스면 우리 동네를 지나는 버스를 앱에서 찾아 드려요. 정한 시각이 일정에 들어가요.', 'movebox');
  add(3, 'backup', '백업 파일 만들어 두기', '폰을 잃어버리거나 바꿔도 다른 폰에서 일정·보관함을 그대로 되돌릴 수 있어요.', 'backupbox');
  add(2, 'offline', '인터넷 없이 열리는지 확인', '비행기 모드로 앱을 한 번 열어 보세요. 일정·보관함·긴급 정보는 이 폰에 저장돼 있어요. 홈 화면에 설치해 두면 더 빨리 열려요.');
  add(3, 'weather', '일기예보 보기', '여행지 단계 날씨에 출발 16일 안부터 예보가 떠요. 비 오면 일정 단계 \'비 오면?\'으로 바꿔요.', 'where');
  { // 가는 편 항공사가 앱에 있으면 그 항공사 온라인 체크인 여는 날·시간·카운터 마감으로 (js/airlines.js)
    const seg = Object.values(s.fsegs || {}).filter(x => x && x.dir === 'out' && x.fno).sort((a, b) => (a.date + a.dep).localeCompare(b.date + b.dep))[0];
    const fl = seg || (s.vault || []).find(x => x && x.kind === 'flight' && x.fno && x.dir !== 'back');
    const a = fl ? airlineOf(fl.fno) : null;
    if(a && a.online) add(Math.max(1, Math.ceil(a.online[0] / 24)), 'checkin', `${a.name} ${fl.fno} 온라인 체크인`, `${onlineText(a)} 앱·누리집에서 해요. 공항 카운터는 ${counterFor(a, fl.from)}. 좌석을 같이 앉게 정하고, 짐이 있으면 공항에서 맡겨요.`, 'vault');
    else add(2, 'checkin', '항공사 온라인 체크인', `${a ? `${a.name}: ${counterFor(a, fl.from)}. ` : ''}보통 출발 24~48시간 전에 열려요(항공사마다 달라요). 좌석을 같이 앉게 정해요.`);
  }
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
    backup:!!s.lastBackup,
    payapp:!!((s.pack || {}).sg_alipay && (s.pack || {}).sg_alipay.done),   // 준비물 추천 '알리페이·위챗페이 설치하고 해외 카드 연결'(hksz-guide.js alipay)
    hoteladd:(s.vault || []).some(x => x && x.kind === 'hotel') || (s.hotels || []).length > 0,
    hotelcard:addrOk((s.safety || {}).addr) || (s.hotels || []).some(h => addrOk(h.addr)),
    kidcard:!!s.sphone,
    gsave:(ps => ps.length > 0 && ps.every(p => s.gsaved && s.gsaved[p.id]))(pickedPlaces(s)),
    checkin:(L => L.length > 0 && L.every(x => (x.who || []).length && (x.who || []).every(k => (x.ck || []).includes(k))))(Object.values(s.fsegs || {}).filter(x => x && x.dir === 'out'))
  };
  const done = s.prep || {};
  return L.map(x => Object.assign(x, { date:addDay(s.start, -x.dday), done:!!done[x.key] || !!auto[x.key], auto:!done[x.key] && !!auto[x.key], ...(PREP_APP.includes(x.key) ? { app:true } : {}) }))
    .sort((a, b) => b.dday - a.dday);
}

// 오늘 기준: 지난 할 일 중 안 한 것(late) + 오늘~3일 안 할 일(soon). 출발 뒤면 없음
export function prepNow(s, today){
  if(!s.start || !today || today > s.start) return { late:[], soon:[], left:0 };
  const all = prepTasks(s); const left = daysTo(today, s.start);
  return { late:all.filter(x => !x.done && x.dday > left), soon:all.filter(x => !x.done && x.dday <= left && x.dday >= left - 3), left };
}
