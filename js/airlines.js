// 항공사별 체크인·수하물·마감 안내 (2026-11-10 사용자 요청: 항공사마다 체크인 방법·수하물·마감이 다르니 예약한 항공사에 맞춰 보여 주기)
//   값은 각 항공사·공항·정부 공식 누리집에서 확인한 것만 (확인한 날 CHECKED). 확인 못 한 칸은 비워 두고 공식 안내 링크로.
//   편명 앞 두 글자(항공사 코드)로 찾음. 순수 자료·함수(테스트 대상)
export const CHECKED = '2026-11-10';

// online: [열림(출발 몇 시간 전), 닫힘 글]  counter: 공항 카운터 마감  icn: 인천공항 터미널  hkg: 홍콩공항 카운터 위치
// carry: 기내 수하물  notes: 주의할 점  url: 공식 안내(체크인·수하물)  pb: 보조배터리 기내 사용 (국적사 자체 규정)
export const AIRLINES = {
  KE:{ name:'대한항공', online:[48, '1시간 전'], counter:'국제선 출발 1시간 전 마감', icn:'T2',
    notes:['미국·캐나다 노선은 온라인 체크인이 출발 24시간 전부터예요.', '온라인 체크인을 해도 출발 1시간 전까지 출국장에 들어가지 않으면 체크인이 자동 취소돼요.'],
    pb:'2026년 1월 26일부터 기내에서 보조배터리 사용(충전) 금지',
    url:{ checkin:'https://www.koreanair.com/at/ko/airport/check-in/pre-check-in/online-check-in', counter:'https://www.koreanair.com/contents/plan-your-travel/check-in/counter-check-in/airport-counter?hl=ko' } },
  OZ:{ name:'아시아나항공', online:[48, '1시간 전'], counter:'인천·김포·나리타·하네다·홍콩 등 출발 50분 전 마감(공항마다 40~60분 전)', icn:'T2',
    notes:['미주 노선은 온라인 체크인이 출발 24시간 전부터예요.', '국제선은 출발 최소 2시간 전 공항 도착을 권해요.'],
    pb:'2026년 1월 26일부터 기내에서 보조배터리 사용(충전) 금지',
    url:{ checkin:'https://m.flyasiana.com/C/GB/KO/contents/online-check-in', counter:'https://m.flyasiana.com/C/KR/KO/contents/check-in-procedure-international-flights' } },
  HX:{ name:'홍콩항공', online:[48, '1시간 30분 전'], counter:'홍콩공항: 출발 3시간 전 열고 60분 전 마감', gate:'탑승구 출발 20분 전 마감',
    hkg:'홍콩공항 터미널 2(T2) Q열 카운터 (2026년 5월 27일부터, 셀프 체크인은 R열 등)',
    notes:['홍콩역·구룡역 공항철도 시내 체크인 셀프 시설: 홍콩역 06:00~19:00, 구룡역 06:00~15:00.'],
    url:{ checkin:'https://m.hongkongairlines.com/html_en/checkin/checkin_index.html', counter:'https://www.hongkongairlines.com/en_HK/airport-information/hong-kong/check-in' } },
  CX:{ name:'캐세이퍼시픽', online:[48, '1시간 30분 전'], counter:'대부분 공항 출발 60분 전 마감 (중국 본토 일부는 40~60분 전)', icn:'T1',
    notes:['48시간 전 온라인 체크인은 회원번호를 넣은 예약에 먼저 열리고, 아니면 24시간 전부터일 수 있어요.', '홍콩공항 키오스크는 출발 24시간 전~60분 전, 홍콩역·구룡역 시내 체크인은 24시간 전~90분 전.'],
    url:{ checkin:'https://www.cathaypacific.com/cx/en_US/faqs/check-in/check-in-kiosk/what-are-the-earliest-and-latest-times-that-I-can-check-in-and-collect-my-boarding-pass.html' } },
  UO:{ name:'홍콩익스프레스', online:[48, '75분 전'], counter:'홍콩공항: 카운터·짐 맡기기 출발 60분 전, 키오스크 75분 전 마감', gate:'탑승구 출발 30분 전 마감',
    hkg:'홍콩공항 터미널 2(T2) U열 (2026년 6월 10일부터)',
    carry:'작은 개인 물품까지 합쳐 7kg, 56×36×23cm 이하 — 넘으면 카운터에서 부쳐야 하고 탑승구에서는 HK$800/개',
    notes:['위탁 수하물은 운임에 들어 있지 않으면 미리 사 두는 게 싸요.'],
    url:{ checkin:'https://www.hkexpress.com/en/travel-help/check-in-guide', baggage:'https://www.hkexpress.com/en/Plan-Your-Trip/Baggage/Carry-On-Baggage' } },
  '7C':{ name:'제주항공', online:[24, '1시간 30분 전'], counter:'국제선 출발 60분 전 마감', icn:'T1',
    carry:'캐리어 1개 + 개인 소지품 1개(면세품 포함) 합쳐 10kg, 세 변 합 115cm(한 변 55cm) 이하',
    notes:['해외 출발 모바일 탑승권은 일본 일부·마카오·홍콩·태국·타이베이만 돼요.'],
    pb:'2026년 1월 22일부터 기내에서 보조배터리 사용 금지',
    url:{ checkin:'https://www.jejuair.net/ko/linkService/fastProcedure/guide.do', baggage:'https://www.jejuair.net/ko/linkService/boardingProcessGuide/cabinBaggage.do' } },
  LJ:{ name:'진에어', online:[24, '1시간 30분 전'], counter:'인천: 출발 3시간 전~50분 전 (T2 3층 E21~40), 위탁 수하물 50분 전 마감', gate:'탑승구 출발 10분 전 마감', icn:'T2',
    carry:'세 변 합 115cm 이하 1개',
    notes:['인천 T2 셀프 백드롭(F카운터) 05:00~20:00, 출발 1시간 전까지.'],
    pb:'2026년 1월 26일부터 기내에서 보조배터리 사용(충전) 금지',
    url:{ checkin:'https://www.jinair.com/ready/checkin/webMobile?snsLang=ko_KR&ctrCd=KOR' } },
  TW:{ name:'티웨이항공', online:[24, '1시간 전'], counter:'인천: 출발 3시간 전~50분 전, 국제선 50분 전 마감',
    notes:['해외 출발편 온라인 체크인은 유럽·일본 일부·대만(송산)·홍콩·시드니만 돼요.'],
    url:{ checkin:'https://www.twayair.com/app/serviceInfo/contents/1121' } },
  BX:{ name:'에어부산', online:[48, '1시간 30분 전'], counter:'국제선 출발 50분 전 마감 (인천 T2 3층 E카운터, 3시간 전부터)', icn:'T2',
    notes:['해외 출발편은 모바일 탑승권이 안 돼요(공항 카운터).', '인천 출발 국제선은 3시간 전 공항 도착을 권해요.'],
    pb:'2026년 1월 26일부터 기내에서 보조배터리 사용(충전) 금지',
    url:{ checkin:'https://www.airbusan.com/content/common/service/airport/autoIssue' } },
  ZE:{ name:'이스타항공', online:[24, '1시간 30분 전'], counter:'위탁 수하물 출발 1시간 전 마감, 출국장은 1시간 전까지 통과', gate:'탑승 출발 15분 전 종료',
    carry:'세 변 합 115cm·10kg 이하 1개',
    notes:['중국·베트남 출발 등은 온라인 체크인이 안 돼요.'],
    pb:'2026년 1월 1일부터 기내에서 보조배터리 사용 금지',
    url:{ checkin:'https://www.eastarjet.com/newstar/PGWIJ00001' } },
  RS:{ name:'에어서울', online:[24, '1시간 30분 전'], counter:'인천 출발 60분 전 마감 (나리타·간사이 등은 50분 전)', gate:'탑승 출발 10분 전 마감',
    notes:['국제선은 출발 60분 전까지 보안검색을 통과해야 해요.', '중국 출·도착 노선은 온라인 체크인이 안 돼요.'],
    pb:'2026년 1월 26일부터 기내에서 보조배터리 사용(충전) 금지',
    url:{ checkin:'https://flyairseoul.com/CW/ko/online-check-in.do' } },
  NH:{ name:'ANA', online:[24, '75분 전'], counter:'카운터·짐 맡기기 출발 60분 전까지',
    notes:['여권 정보·좌석 지정은 출발 48시간 전까지 마쳐 두세요.', '다른 항공사가 운항하는 공동운항편은 온라인 체크인이 안 돼요.'],
    url:{ checkin:'https://www.ana.co.jp/en/jp/guide/boarding-procedures/checkin/online-checkin/' } },
  JL:{ name:'JAL', online:[24, '1시간 전'], counter:'일본 출발 국제선: 짐 맡기기 출발 60분 전까지, 탑승구에는 30분 전쯤',
    url:{ checkin:'https://www.jal.co.jp/jp/en/inter/boarding/online-checkin/' } },
  MM:{ name:'피치항공', online:null, counter:'국제선 출발 50분 전 엄격 마감 (카운터는 보통 2시간 전부터)',
    carry:'2개 합쳐 7kg, 세 변 합 115cm 이하',
    notes:['앱 자동 체크인은 출발 120분 전에 탑승권이 나와요(노선에 따라 안 될 수 있어요).'],
    url:{ checkin:'https://www.flypeach.com/en/lm/ai/airports/how_to_checkin', baggage:'https://www.flypeach.com/en/lm/ai/airports/baggage/carry_on_bag' } }
};

// 수하물 기준 (일반석·이코노미, 미주 외 국제선, 2026-11-10 공식 누리집 확인). 운임·노선마다 다르니 확인서에 적힌 게 먼저
//   carry: 기내 수하물  checked: 무료 위탁 수하물
const BAG = {
  KE:{ carry:'가방 1개 + 개인 소지품 1개, 합쳐 10kg — 가방은 세 변 합 115cm(또는 55×40×20cm), 소지품은 40×30×15cm 이내',
    checked:'일반석 1개 23kg (일행끼리 무게 합산 안 됨)', url:{ baggage:'https://www.koreanair.com/contents/plan-your-travel/baggage/checked-baggage/free-baggage?hl=ko' } },
  OZ:{ carry:'가방 1개 10kg, 세 변 합 115cm + 개인 소지품 1개(40×30×20cm)', checked:'일반석 1개 23kg, 세 변 합 158cm',
    url:{ baggage:'https://m.flyasiana.com/C/KR/KO/contents/free-baggage' } },
  HX:{ carry:'가방 1개 + 작은 물건 1개, 합쳐 7kg — 가방은 56×36×23cm 이내 (넘으면 탑승구에서 HK$500/개)', checked:'운임마다 달라요 — 확인서에 적힌 개수·무게대로',
    url:{ baggage:'https://www.hongkongairlines.com/en_HK/fly-with-us/baggage/handcarry' } },
  CX:{ carry:'이코노미 1개 7kg', checked:'이코노미 Light 1개 23kg, Essential·Flex 2개 각 23kg',
    url:{ baggage:'https://flights.cathaypacific.com/en_US/baggage.html' } },
  UO:{ checked:'운임에 없으면 미리 사야 해요(공항·탑승구에서 사면 더 비싸요)' },
  '7C':{ checked:'베이직 운임 없음, 스탠다드 15kg, BIZ LITE 30kg (한 개 32kg·158cm까지)' },
  TW:{ carry:'1개 10kg, 세 변 합 115cm', checked:'스마트 15kg, 일반 20kg, 이벤트 운임 없음 (일행끼리 무게 합산 돼요, 한 개 32kg까지)',
    url:{ baggage:'https://www.twayair.com/app/serviceInfo/contents/1148' } },
  BX:{ carry:'1개 10kg, 세 변 합 115cm', checked:'실속·일반 운임 15kg (괌 노선 23kg)', url:{ baggage:'https://m.airbusan.com/mc/common/service/baggage/free' } },
  ZE:{ checked:'일반·할인 운임 15kg, 특가 운임 없음' },
  RS:{ carry:'1개 10kg, 세 변 합 115cm(55×40×20cm)', checked:'정규·할인 운임 15kg, 특가 운임 없음', url:{ baggage:'https://m.flyairseoul.com/CM/ko/destinations02.do' } },
  NH:{ carry:'가방 1개 + 개인 소지품 1개, 합쳐 10kg — 가방은 세 변 합 115cm, 소지품은 40×30×20cm', checked:'이코노미 0~2개 각 23kg (운임마다 달라요, 세 변 합 158cm)',
    url:{ baggage:'https://www.ana.co.jp/en/us/travel-information/baggage-information/checked-baggage/' } },
  JL:{ carry:'가방 1개 + 개인 소지품 1개, 합쳐 10kg — 가방은 세 변 합 115cm', checked:'이코노미 2개 각 23kg (세 변 합 203cm)',
    url:{ baggage:'https://www.jal.co.jp/jp/en/inter/baggage/checked/' } }
};
Object.entries(BAG).forEach(([k, v]) => { const a = AIRLINES[k]; if(!a) return; const { url, ...rest } = v; Object.assign(a, rest); if(url) a.url = Object.assign({}, a.url, url); });

// 보조배터리 — 출발지 규정 (한국 국토교통부·홍콩 민항처·중국 민항국)
export const POWERBANK = {
  KR:'한국 출발: 부치는 짐에 넣으면 안 되고 들고 타요. 100Wh 이하 5개까지, 단자를 절연테이프로 막거나 비닐(지퍼백)에 넣고, 머리 위 선반에 두지 말고, 기내에서 충전하지 마세요(국토교통부).',
  HK:'홍콩 출발·도착: 한 사람 2개까지, 기내에서 충전 금지, 홍콩 항공사는 머리 위 선반 보관 금지(홍콩 민항처, 2026년 3월 28일부터).',
  CN:'중국 본토(선전 등): 3C 표시가 없거나 리콜된 보조배터리는 중국 국내선에 못 가져가요(2025년 6월 28일부터). 3C 표시가 있는 걸 챙기세요.'
};
const REGION_OF = { ICN:'KR', GMP:'KR', PUS:'KR', CJU:'KR', TAE:'KR', CJJ:'KR', MWX:'KR', HKG:'HK', SZX:'CN', CAN:'CN', PVG:'CN', PEK:'CN', PKX:'CN' };

export const airlineCode = fno => { const m = /^([A-Z0-9]{2})\s*\d/.exec(String(fno || '').trim().toUpperCase()); return m ? m[1] : ''; };
export const airlineOf = fno => AIRLINES[airlineCode(fno)] || null;
// 온라인 체크인이 열리는 날: 출발 날짜에서 (열리는 시간 ÷ 24)일 전. 모르면 ''
export function checkinOpenDate(fno, date){
  const a = airlineOf(fno); if(!a || !a.online || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
  const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - Math.ceil(a.online[0] / 24))).toISOString().slice(0, 10);
}
// 이 편 체크인 상태: today(현지 날짜 'YYYY-MM-DD')가 체크인 여는 날 ~ 출발 날이면 open. left: 안 한 사람 키
export function checkinState(seg, today){
  if(!seg || !seg.fno) return null;
  const opens = checkinOpenDate(seg.fno, seg.date); const ck = seg.ck || []; const left = (seg.who || []).filter(k => !ck.includes(k));
  const open = !!today && !!seg.date && today <= seg.date && (opens ? today >= opens : today === seg.date);
  return { opens, open, left, done:(seg.who || []).length > 0 && !left.length };
}
export const onlineText = a => a && a.online ? `출발 ${a.online[0]}시간 전부터 ${a.online[1]}까지` : '';
// 이 편에 해당하는 보조배터리 규정: 출발 공항 나라 규정 + 홍콩은 오가는 편 모두
export function powerbankRules(from, to){
  const R = [REGION_OF[from], REGION_OF[to] === 'HK' ? 'HK' : ''].filter(Boolean);
  return [...new Set(R)].map(r => POWERBANK[r]);
}
