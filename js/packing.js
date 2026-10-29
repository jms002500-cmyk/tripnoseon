// 준비물 체크리스트. 여행지·달(계절)·이맘때 날씨·동행(아이 나이)·담은 곳(디즈니 등)에 맞춘 추천 + 직접 추가.
// 순수 함수(테스트 대상). 함께 짜기 여행이면 목록과 체크가 참여자 모두와 공유됨(sharecore의 pack).
//
// 준비물 하나(pack[id])
//   t      이름 / c: PACK_CATS 키 / who: '' 공용 | 나누는 사람 id(가계부와 같은 사람 목록)
//   done   챙김 / doneBy: 챙긴 사람 이름(함께 짜기 중일 때) / at: 넣은 때(ms)
//   src    추천에서 온 것이면 추천 키(지워도 '숨김'으로 남겨 다시 추천하지 않음) / hide: 숨김
import { pickedPlaces } from './logic.js';

export const PACK_CATS = [
  { key:'doc', label:'서류·돈', icon:'🛂' },
  { key:'kid', label:'아이', icon:'🧒' },
  { key:'wear', label:'옷·신발', icon:'🧥' },
  { key:'tech', label:'전자기기', icon:'🔌' },
  { key:'care', label:'약·위생', icon:'💊' },
  { key:'fun', label:'놀거리·디즈니', icon:'🎢' },
  { key:'etc', label:'기타', icon:'🎒' }
];
export const packCatOf = k => PACK_CATS.find(c => c.key === k) || PACK_CATS[PACK_CATS.length - 1];

// 직접 적은 준비물의 분류 (한 글자 단어는 다른 말에 잘못 걸려서 쓰지 않음)
// 위에서부터 먼저 맞는 분류 ('아이패드'는 아이보다 전자기기가 먼저)
const CAT_WORDS = {
  doc:['여권', '비자', '항공권', '카드', '현금', '엔화', '지갑', '보험', '면허', '서류', '바우처'],
  tech:['충전', '배터리', '어댑터', '돼지코', '케이블', '이어폰', '카메라', '유심', '이심', '와이파이', '노트북', '태블릿', '아이패드'],
  wear:['패딩', '외투', '코트', '니트', '바지', '치마', '양말', '속옷', '잠옷', '신발', '운동화', '모자', '장갑', '목도리', '수영복', '티셔츠', '셔츠', '후드'],
  care:['상비약', '감기약', '해열제', '소화제', '진통제', '멀미약', '밴드', '연고', '칫솔', '치약', '샴푸', '로션', '선크림', '립밤', '마스크', '렌즈', '핫팩', '물티슈', '휴지', '생리대', '면도기'],
  kid:['아이', '기저귀', '유모차', '젖병', '분유', '장난감', '아기']
};
export function packCategory(text){
  const t = String(text || '');
  for(const [k, ws] of Object.entries(CAT_WORDS)) if(ws.some(w => t.includes(w))) return k;
  return 'etc';
}

const month = s => s.start ? +s.start.slice(5, 7) : null;
const kidsOf = s => s.who === 'family' ? (s.kids || []) : [];

// 추천 목록: [{ key, t, c, why }]. key는 영문·숫자(함께 짜기 칸 이름으로 씀)
//   wx: s.wx (이맘때 평균 climate.lo·rainPct를 씀, 없으면 달로만 판단)
export function suggestPacking(s, wx){
  const out = []; const add = (key, c, t, why) => out.push({ key, c, t, why:why || '' });
  const m = month(s); const cl = wx && wx.climate; const lo = cl && cl.lo != null ? Math.round(cl.lo) : null;
  const jp = s.country === 'jp'; const kids = kidsOf(s); const ids = new Set(pickedPlaces(s).map(p => p.id));
  const winter = (lo != null && lo <= 8) || [12, 1, 2].includes(m);
  const city = { tokyo:'도쿄', hksz:'홍콩·선전' }[s.city] || '여행지';

  // 서류·돈
  add('passport', 'doc', '여권', '만료일이 여행 끝나는 날보다 넉넉한지 확인하세요.');
  add('tickets', 'doc', '항공권·숙소 예약 확인서', '보관함에 넣어 두면 인터넷 없이도 열려요.');
  if(jp) add('vjw', 'doc', 'Visit Japan Web 입국 QR', '입국 심사·세관 QR이에요. 가족 한 사람씩 각자 등록해야 해요.');
  if(jp) add('yen', 'doc', '엔화 현금·동전 지갑', '작은 식당·자판기·코인로커는 아직 현금만 받는 곳이 많아요.');
  add('card', 'doc', '해외 결제 카드', '수수료가 적은 카드를 하나 챙기면 좋아요.');
  if(jp) add('ic', 'doc', '교통카드 (Suica·PASMO 또는 휴대폰 교통카드)', kids.some(a => a >= 6 && a <= 12) ? '초등학생은 어린이 요금 카드가 따로 있어요(역 창구에서 만들어요).' : '지하철·버스·편의점에서 찍고 다녀요.');
  add('insurance', 'doc', '여행자 보험', '');
  // 전자기기
  if(jp) add('plug', 'tech', '일본용 11자 어댑터(돼지코)', '일본은 100V에 납작한 두 핀 콘센트예요. 휴대폰 충전기는 대부분 그대로 써요. 사람 수만큼 있으면 편해요.');
  add('charger', 'tech', '충전기·케이블', '');
  add('battery', 'tech', '보조배터리', '기내에만 들고 타요(부치는 짐에 넣으면 안 돼요).');
  add('data', 'tech', '유심·eSIM 또는 포켓와이파이', '길찾기·번역을 계속 쓰니 데이터가 넉넉한 걸로.');
  // 옷·신발
  add('shoes', 'wear', '편한 운동화', '하루 1~2만 보 걷는 날이 많아요.');
  if(winter){
    add('padding', 'wear', '패딩·두꺼운 외투', lo != null ? `${m || ''}${m ? '월 ' : ''}${city} 아침 ${lo}° 안팎이에요.` : '겨울이라 아침저녁이 추워요.');
    add('layers', 'wear', '니트·기모 옷 (겹쳐 입기)', '실내·지하철은 따뜻해서 벗기 쉬운 옷이 좋아요.');
    add('gloves', 'wear', '장갑·목도리', '');
  }
  // 약·위생
  add('meds', 'care', '상비약 (해열제·소화제·밴드)', '');
  add('toiletry', 'care', '세면도구', '');
  if(winter){
    add('hotpack', 'care', '핫팩', '일본 편의점에서도 \'카이로(カイロ)\'로 팔아요.');
    add('lipbalm', 'care', '립밤·보습크림', '겨울 도쿄는 건조해요.');
  }
  // 기타
  add('umbrella', 'etc', '접이식 우산', cl && cl.rainPct != null ? `이맘때 비 온 날이 ${cl.rainPct}%예요.` : '');
  if(jp){
    add('ecobag', 'etc', '접이식 장바구니', '편의점·마트 봉투는 돈을 받아요.');
    add('trashbag', 'etc', '작은 비닐봉지 (쓰레기용)', '길에 쓰레기통이 거의 없어요. 숙소까지 들고 가요.');
  }
  // 아이
  if(kids.length){
    add('kidpass', 'kid', '아이 여권 (입국 QR도 따로)', '아이도 여권·입국 등록이 한 사람씩 필요해요.');
    add('kidmeds', 'kid', '아이 상비약 (해열제·멀미약·체온계)', '');
    add('kidcard', 'kid', '미아 대비 연락처 카드', '숙소 이름(일본어)과 부모 번호를 적어 아이 주머니에. 사람 많은 역·디즈니에서 길을 잃으면 보여 주게 해요.');
    add('snack', 'kid', '간식·물병', '');
    if(kids.some(a => a >= 5)) add('kidfun', 'kid', '이동 중 놀거리·이어폰', '공항·전철 대기 시간이 길어요.');
    if(kids.some(a => a >= 10)) add('kidphone', 'kid', '아이 휴대폰 로밍·위치 공유', '따로 다니는 순간이 생겨요. 만날 장소도 미리 정해 두세요.');
    if(kids.some(a => a <= 3)){
      add('diaper', 'kid', '기저귀·물티슈', '');
      add('stroller', 'kid', '휴대용 유모차', '역 이동이 길어요. 큰 역은 엘리베이터 위치를 미리 보면 편해요.');
    }
  }
  // 담은 곳에 맞춰
  if(ids.has('tdl') || ids.has('tds')){
    add('dapp', 'fun', '도쿄 디즈니 리조트 앱 설치·입장권 연결', '대기 시간 확인과 유료 패스 구매를 앱으로 해요. 출발 전에 로그인해 두세요.');
    add('dsheet', 'fun', '퍼레이드 대기용 작은 돗자리', '자리 잡고 앉아서 기다려요.');
    if(winter) add('dwarm', 'fun', '디즈니 저녁용 무릎담요·핫팩', '저녁 퍼레이드·불꽃놀이를 기다리면 많이 추워요.');
  }
  if(ids.has('teamlab')) add('teamlab', 'wear', '무릎까지 걷을 수 있는 바지', '팀랩 플래닛은 물속을 걸어요.');
  return out;
}

const KEY_ID = key => 'sg_' + key;   // 추천에서 담은 것의 번호 (두 사람이 같은 추천을 동시에 담아도 하나로)

// 아직 목록에 없는(숨기지도 않은) 추천
export function missingSuggestions(pack, sugg){ return sugg.filter(x => !(pack || {})[KEY_ID(x.key)]); }

// 추천을 목록에 넣을 모양으로 { id: 준비물 }
export function seedItems(sugg, now){
  const o = {}; let t = now || Date.now();
  sugg.forEach(x => { o[KEY_ID(x.key)] = { t:x.t, c:x.c, who:'', done:false, doneBy:'', at:t++, src:x.key }; });
  return o;
}

// 직접 적은 줄 → 준비물들. 쉼표·줄바꿈으로 여러 개
export function customItems(text, newId, now){
  const o = {}; let t = now || Date.now();
  String(text || '').split(/[,\n、]/).map(x => x.trim().slice(0, 40)).filter(Boolean).slice(0, 30)
    .forEach(name => { o[newId()] = { t:name, c:packCategory(name), who:'', done:false, doneBy:'', at:t++, src:'' }; });
  return o;
}

// 화면용: 걸러서 분류별로 묶고 개수 세기
//   filter: 'all' | 'left'(안 챙긴 것) | 'common'(공용) | 사람 id
export function packView(pack, filter){
  const all = Object.entries(pack || {}).filter(([, x]) => x && !x.hide).map(([id, x]) => Object.assign({ id }, x));
  const f = filter || 'all';
  const shown = all.filter(x => f === 'all' ? true : f === 'left' ? !x.done : f === 'common' ? !x.who : x.who === f);
  const groups = PACK_CATS.map(c => ({ cat:c, items:shown.filter(x => (packCatOf(x.c).key) === c.key).sort((a, b) => (a.done - b.done) || (a.at || 0) - (b.at || 0)) }))
    .filter(g => g.items.length);
  return { groups, total:all.length, done:all.filter(x => x.done).length, shown:shown.length };
}
