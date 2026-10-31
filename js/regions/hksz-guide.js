// 홍콩·선전 여행 안내 (긴급 번호·공관·문장·분실·날씨 경보·입국·교통·돈·준비물). 인터넷 없이 열리게 모든 내용을 앱 안에 둠.
// 순수 데이터·함수(테스트 대상: tests/hksz-guide.test.mjs). 모양은 js/safety.js(JP_CALLS·PHRASES·LOST·QUAKE)를 따름.
// city: 'hk' 홍콩 | 'sz' 선전(중국 본토) | 없거나 'both' 두 곳 다.
//
// 2026-10-29 공식 출처로 확인 (이 세션은 누리집을 직접 열 수 없어 검색 도구로 공식 도메인 내용만 골라 확인):
//   주홍콩 대한민국 총영사관 — overseas.mofa.go.kr/hk-ko/wpge/m_28619/contents.do (주소·대표·긴급전화)
//     overseas.mofa.go.kr/hk-en/wpge/m_1498/contents.do (근무시간) · overseas.mofa.go.kr/hk-ko/wpge/m_1526/contents.do (여권 분실)
//   주광저우 대한민국 총영사관(광둥성 관할, 선전 포함) — www.mofa.go.kr/cn-guangzhou-ko/wpge/m_111/contents.do
//     관할 지역은 overseas.mofa.go.kr/cn-ko/brd/m_1253/view.do?seq=1154305 (2020년 자료)
//   외교부 영사안전콜센터 +82-2-3210-0404 (24시간)
//   중국 긴급번호 110·119·120·122 — 주선양·주우한 총영사관 안전 공지, 주중국 대사관 '중국 공공서비스 전화번호'
//   중국 본토 여권 분실 — overseas.mofa.go.kr/cn-shanghai-ko/brd/m_516/view.do?seq=1297360, 주시안 총영사관 안전 공지 25-2
//   중국 무비자(한국 포함 45개국, 30일, 2026-12-31 24시까지) — kr.china-embassy.gov.cn/lsfw/hzlxzyw/zgqz/202511/t20251104_11746485.htm
//     외교부 주중국 대사관 영사소식 www.mofa.go.kr/cn-ko/brd/m_1237/view.do?seq=1348046
//   중국 입국카드 온라인 작성(2025-11-20부터) — 국가이민관리국 통지(중국 대사관 게재) us.china-embassy.gov.cn/lsfw/zj/qz/202512/t20251203_11765336.htm
//   중국 세관 현금 신고 — guangzhou.customs.gov.cn (广州海关 行邮监管), gov.cn 2004년 제5호 국무원 공보
//   중국 현금 거절 금지(2026-02-01 시행) — pbc.gov.cn 중국인민은행 공고〔2025〕제29호
//   알리페이·위챗페이 해외 카드 — english.www.gov.cn/news/202404/11/content_WS6617c858c6d0868f4e8e5f4d.html
//   선전 지하철 해외 카드(2026-09-10 모든 개찰구) — www.sz.gov.cn/cn/xxgk/bmtx/content/post_12980912.html, qh.sz.gov.cn/en/news/content/post_12990336.html
//   가오더 지도 영어·한국어 — english.shanghai.gov.cn (2025-01, 2025-07 기사)
//   홍콩 무비자 90일 — www.immd.gov.hk/eng/services/visas/visit-visa-entry-permit.html
//   홍콩 입국카드 폐지(2024-10-16) — www.immd.gov.hk/eng/faq/imm-clearance.html
//   홍콩 여권 유효기간 6개월 — www.hketosydney.gov.hk/eng/hk_imm.htm, www.hketokl.gov.hk/about-hong-kong/travelling/
//   국경 검사장 운영 시간 — www.immd.gov.hk/eng/contactus/control_points.html, legco.gov.hk 2026-03-27 보안위원회 문서
//   황강 새 커우안(2026-10-12 06:30부터 24시간, 한 번에 심사) — www.info.gov.hk/gia/general/202610/09/P2026100900281.htm
//   선전베이 한 건물 심사 — www.immd.gov.hk/publications/a_report_2024/en/chapter3.html
//   서구룡역 고속철 한곳 심사 — www.info.gov.hk/gia/general/201711/18/P2017111800419.htm
//   홍콩 세관 현금 신고 HK$120,000 — www.customs.gov.hk/en/faqs/currency-and-bearer-negotiable-instruments/
//   홍콩 관광청 안내 전화 — www.discoverhongkong.com/eng/contact-us.html, 긴급 999 — discoverhongkong.com 'Emergency & useful numbers'
//   MTR·옥토퍼스 — www.mtr.com.hk/en/customer/tickets/about_sj.html, www.mtr.com.hk/en/customer/tickets/to_form_lw_lmc.html,
//     www.mtr.com.hk/en/customer/tourist/firstclass_index.html, www.mtr.com.hk/en/customer/main/typhoon_readiness.html,
//     www.octopus.com.hk/en/consumer/tourist/choices/index.html, www.octopus.com.hk/en/consumer/tourist/apple-pay/index.html
//   홍콩 날씨 경보 — www.hko.gov.hk/en/wservice/warning/rainstor.htm, www.hko.gov.hk/en/wxinfo/dailywx/warnlegend.htm
//   홍콩 12월 평년값(1991~2020) — www.hko.gov.hk/en/cis/normal/1991_2020/normals.htm
//   선전 12월 평년값 — weather.sz.gov.cn 2025년 선전시 기후공보, 2026년 4분기 기후 전망
//   전기 — 홍콩 discoverhongkong.com·EMSD 안내(220V, BS1363 세 핀), 중국 caac.gov.cn 생활 안내(220V, 두 핀·세 핀)
//   본토 인터넷 — LG U+ 로밍 이용 가이드 www.lguplus.com/plan/roaming/guide

export const CHECKED = '2026-10-29';

export const CITY_NAMES = { hk:'홍콩', sz:'선전' };

// tel: 링크는 한국 휴대폰 로밍에서도 걸리게 국가번호(+852 홍콩, +86 중국, +82 한국)를 붙임. 긴급번호는 그대로
export const CALLS = [
  { key:'hk999', label:'홍콩 경찰·구급차·소방', num:'999', tel:'999', when:'사고·도난·다쳤을 때·불났을 때·아이를 잃어버렸을 때', big:true, city:'hk' },
  { key:'cn110', label:'중국 경찰', num:'110', tel:'110', when:'사고·도난·싸움·아이를 잃어버렸을 때', big:true, city:'sz' },
  { key:'cn120', label:'중국 구급차', num:'120', tel:'120', when:'다쳤거나 많이 아플 때', big:true, city:'sz' },
  { key:'cn119', label:'중국 소방', num:'119', tel:'119', when:'불났을 때', city:'sz' },
  { key:'cn122', label:'중국 교통사고', num:'122', tel:'122', when:'차 사고가 났을 때', city:'sz' },
  { key:'hktb', label:'홍콩 관광청 안내 전화', num:'+852-2508-1234', tel:'+852-2508-1234', when:'매일 9~18시 · 관광 안내. 이 번호로 걸려 오는 전화는 사기예요(관광청은 먼저 걸지 않아요)', city:'hk' },
  { key:'consul', label:'외교부 영사안전콜센터', num:'+82-2-3210-0404', tel:'+82-2-3210-0404', when:'24시간 · 사건·사고 접수, 통역 도움' },
  { key:'hkEmg', label:'주홍콩 총영사관 긴급전화', num:'+852-9731-0092', tel:'+852-9731-0092', when:'평일 18시~다음 날 9시, 주말 24시간 · 사건·사고', city:'hk' },
  { key:'hkMain', label:'주홍콩 총영사관 대표', num:'+852-2529-4141', tel:'+852-2529-4141', when:'평일 근무시간 · 여권 분실·여행 서류', city:'hk' },
  { key:'gzEmg', label:'주광저우 총영사관 긴급전화 (선전 담당)', num:'+86-139-2247-3457', tel:'+86-139-2247-3457', when:'24시간 · 사건·사고', city:'sz' },
  { key:'gzMain', label:'주광저우 총영사관 대표', num:'+86-20-2919-2999', tel:'+86-20-2919-2999', when:'평일 8시 30분~12시, 13시 30분~17시 30분 · 여권 분실', city:'sz' }
];

export const CONSULATES = [
  { city:'hk', name:'주홍콩 대한민국 총영사관', local:'大韓民國駐香港總領事館', addr:'香港金鐘夏慤道16號遠東金融中心5-6樓 (애드미럴티, Far East Finance Centre 5층)', hours:'평일 9~17시 30분(점심 12~13시 30분). 여권 업무 9~16시 30분. 주말·공휴일 쉼' },
  { city:'sz', name:'주광저우 대한민국 총영사관 (선전이 있는 광둥성 담당)', local:'大韩民国驻广州总领事馆', addr:'广州市海珠区赤岗领事馆区友邻三路18号 (선전에서 고속철로 가요)', hours:'평일 8시 30분~12시, 13시 30분~17시 30분. 주말·공휴일 쉼' }
];

const isFor = (x, city) => !x.city || x.city === 'both' || x.city === city;
export function forCity(list, city){ return (list || []).filter(x => isFor(x, city)); }
export function callsFor(city){ return forCity(CALLS, city); }
export function consulateFor(city){ return CONSULATES.find(c => c.city === city) || null; }

// 보여 주는 문장 (크게 띄워 직원·택시 기사에게 보여 줌). 홍콩은 번체·광둥어, 선전은 간체·보통화
export const PHRASES = {
  hk:[
    { local:'請幫幫我', ko:'도와주세요', read:'쳉 퐁퐁 응오' },
    { local:'請叫救護車', ko:'구급차를 불러 주세요', read:'쳉 끼우 까우우체' },
    { local:'請報警', ko:'경찰을 불러 주세요', read:'쳉 뽀우껭' },
    { local:'我個小朋友唔見咗', ko:'아이를 잃어버렸어요', read:'응오 꼬 씨우팡야우 음 낀 쪼' },
    { local:'請帶我去呢個地址', ko:'이 주소로 가 주세요', read:'쳉 따이 응오 허이 니꼬 떼이찌' },
    { local:'洗手間喺邊度？', ko:'화장실이 어디예요?', read:'싸이싸우깐 하이 삔또우?' },
    { local:'可唔可以用信用卡？', ko:'카드 되나요?', read:'호 음 호이 융 쏜융캇?' },
    { local:'可唔可以用八達通？', ko:'옥토퍼스 되나요?', read:'호 음 호이 융 빳땃퉁?' },
    { local:'我嘅護照唔見咗', ko:'여권을 잃어버렸어요', read:'응오 께 우찌우 음 낀 쪼' },
    { local:'有冇人識講韓文或者英文？', ko:'한국어나 영어 하는 분 있나요?', read:'야우 모우 얀 씩꽁 혼만 왁쩨 잉만?' },
    { local:'我有過敏', ko:'알레르기가 있어요', read:'응오 야우 꿔만' }
  ],
  sz:[
    { local:'请帮帮我', ko:'도와주세요', read:'칭 빵빵 워' },
    { local:'请叫救护车', ko:'구급차를 불러 주세요', read:'칭 쟈오 지우후처' },
    { local:'请报警', ko:'경찰을 불러 주세요', read:'칭 빠오징' },
    { local:'我的孩子走丢了', ko:'아이를 잃어버렸어요', read:'워더 하이쯔 저우띠우 러' },
    { local:'请带我去这个地址', ko:'이 주소로 가 주세요', read:'칭 따이 워 취 쩌거 띠즈' },
    { local:'洗手间在哪里？', ko:'화장실이 어디예요?', read:'시서우젠 짜이 나리?' },
    { local:'可以刷卡吗？', ko:'카드 되나요?', read:'커이 솨카 마?' },
    { local:'可以用支付宝吗？', ko:'알리페이 되나요?', read:'커이 융 즈푸바오 마?' },
    { local:'可以付现金吗？', ko:'현금 되나요?', read:'커이 푸 셴진 마?' },
    { local:'我的护照丢了', ko:'여권을 잃어버렸어요', read:'워더 후자오 띠우 러' },
    { local:'有人会说韩语或英语吗？', ko:'한국어나 영어 하는 분 있나요?', read:'여우 런 후이 숴 한위 훠 잉위 마?' },
    { local:'我有过敏', ko:'알레르기가 있어요', read:'워 여우 꿔민' }
  ]
};
export function phrasesFor(city){ return PHRASES[city] || []; }

export const LOST = [
  { t:'여권 (홍콩)', d:'가까운 경찰서에 분실 신고 → 분실증명서를 받아 총영사관에 가요. 여권 사진 1장, 신분증, 여권 사본, 항공권 사본(긴급여권)이 필요해요. 신고한 여권은 다시 찾아도 못 써요.', city:'hk' },
  { t:'여권 (선전)', d:'파출소 신고 → 공안국 출입경관리처에서 \'护照报失证明(여권 분실증명)\' → 주광저우 총영사관에서 새 여권 → 다시 출입경관리처에서 출국 비자(숙소 등록표 필요). 1~2주 걸릴 수 있어요. 먼저 총영사관 긴급전화로 연락하세요.', city:'sz' },
  { t:'지갑·카드·휴대폰', d:'카드사 해외 분실 신고부터 해요. 휴대폰에 알리페이·위챗페이가 있으면 바로 잠그거나 카드 연결을 끊어요. 경찰 분실 신고는 보험 청구에 필요해요.' },
  { t:'지하철에 두고 내림', d:'역무원에게 말해요. 노선·시간·칸 위치를 알면 찾기 쉬워요.' },
  { t:'아이를 잃어버렸을 때', d:'그 자리에서 크게 이름을 부르고, 가까운 직원·경찰(홍콩 999, 선전 110)에 바로 알려요. 미리 정한 만날 장소로도 가 봐요. 국경 검사장처럼 사람 많은 곳에선 손을 꼭 잡아요.' }
];

// 홍콩 날씨 경보 때 할 일 (도쿄의 QUAKE 모양). 12월엔 드물어요
export const WEATHER = [
  '12월엔 드물지만, 홍콩 천문대(香港天文台)가 태풍 신호와 폭우 경보를 내요. 숙소 TV·누리집이나 날씨 전화(1878 200)로 확인해요.',
  '태풍 8호 신호(八號風球)가 걸리면 바람이 아주 세요(시속 63~117km). 안전한 실내에 머물러요.',
  '8호 신호 때 MTR 지하철은 대체로 다니지만 점점 줄 수 있고, 날씨가 갑자기 나빠지면 바로 멈출 수도 있어요. MTR 버스는 8호 신호 3시간 뒤 멈춰요.',
  '흑색 폭우 경보(黑雨, 1시간에 70mm 넘는 비)가 나오면 실내나 안전한 곳에 머물고, 물이 넘친 길·개울에 가까이 가지 않아요.',
  '신호가 내려가도 쓰러진 나무·떨어진 간판이 남아 있을 수 있어요. 숙소 직원의 안내를 따르세요.'
];

// 입국·국경 (한국 일반 여권 기준)
export const ENTRY = [
  { key:'hkVisa', title:'홍콩 입국', city:'hk', text:'한국 여권은 90일까지 비자 없이 머물 수 있어요. 입국카드는 2024년 10월 16일부터 안 써요. 여권은 홍콩을 떠나는 날 뒤로 6개월 넘게 남아 있어야 해요.' },
  { key:'cnVisa', title:'중국 본토 무비자 (12월 여행 가능)', city:'sz', text:'한국 일반 여권은 관광·친지 방문 등으로 30일까지 비자 없이 들어갈 수 있어요. 지금 정책은 2026년 12월 31일 24시까지라 12월 여행은 해당돼요. 30일은 들어간 다음 날부터 세요. 돌아가는 표와 머무는 곳 연락처를 보여 줄 수 있게 준비해요. 2027년 1월에 들어가는 일정이면 새 공지를 꼭 확인하세요.' },
  { key:'cnCard', title:'중국 입국카드', city:'sz', text:'2025년 11월 20일부터 미리 온라인으로 쓸 수 있어요. 국가이민관리국 누리집, \'移民局12367\' 앱, 위챗·알리페이 미니프로그램에서 가족 한 사람씩 써요. 못 썼으면 검사장에서 QR이나 종이 카드로 써도 돼요.' },
  { key:'cnStay', title:'중국에서 머무는 동안', city:'sz', text:'머무는 곳을 등록(주숙등기)해야 해요. 호텔은 체크인 때 여권을 보여 주면 호텔이 등록해 줘요. 무비자로는 일·공연·취재 같은 다른 활동은 안 돼요.' },
  { key:'border', title:'홍콩 → 선전 국경 넘기', city:'both', text:'홍콩 출국 심사 → 선전 입국 심사 → 세관 순서예요. 여권을 두 번 보여 줘요. 돌아올 때는 거꾸로예요. 가족이 같이 줄을 서고, 아이 여권도 각자 챙겨요.' },
  { key:'points', title:'국경 검사장과 시간 (대략값)', city:'both', text:'뤄후(羅湖·罗湖) 6시 30분~24시 · 록마차우 지선(落馬洲支線, 선전 푸톈 커우안) 6시 30분~22시 30분 · 선전베이(深圳灣) 6시 30분~24시, 두 쪽 심사를 한 건물에서 · 황강(皇崗) 새 커우안 2026년 10월 12일부터 24시간, 한 번에 심사 · 서구룡역 고속철은 역 안에서 두 쪽 심사를 같이 해요. 명절엔 시간이 늘기도 해요.' },
  { key:'customs', title:'세관', city:'both', text:'신고할 게 없으면 초록색 통로(본토는 \'无申报通道\')로 가요. 홍콩은 현금이 HK$120,000 넘으면, 본토는 위안화 현금 2만 위안 또는 외화 미화 5천 달러 넘으면 신고해요.' }
];

// 교통
export const TRANSPORT = [
  { key:'octopus', title:'옥토퍼스 카드 (홍콩)', city:'hk', text:'지하철·버스·편의점에서 찍어요. 아이 요금은 3~11살이라 12살부터는 어른 요금이에요. 여행자용 \'투어리스트 옥토퍼스\'는 HK$39(보증금 없음, 카드값은 돌려받지 못하고 남은 돈만 돌려받아요). 아이폰 지갑에 넣는 옥토퍼스는 보증금 HK$50, 여행자용 앱으로 환불해요.' },
  { key:'mtr', title:'MTR 지하철 (홍콩)', city:'hk', text:'옥토퍼스 말고도 QR이나 비접촉 신용카드로 탈 수 있어요. 카드·QR은 어른 요금만 돼요. 동철선(東鐵綫) 일등칸은 따로 결제해야 하고, 안 하면 벌금 HK$1,000이에요.' },
  { key:'eastRail', title:'동철선으로 국경 가기', city:'both', text:'MTR 동철선을 타고 뤄후역이나 록마차우역에서 내려 걸어서 국경을 넘어요. 옥토퍼스·QR·비접촉 카드로 탈 수 있어요. 록마차우 쪽은 22시 30분에 닫으니 늦게 돌아올 땐 뤄후로 와요.' },
  { key:'xrl', title:'고속철 (서구룡역 ↔ 선전)', city:'both', text:'서구룡역에서 고속철을 타면 푸톈역 등 선전까지 빨라요. 역 안에서 홍콩·본토 심사를 한 번에 해요. 표는 미리 사고, 출발보다 넉넉히 가요.' },
  { key:'bay', title:'선전베이·황강 (버스)', city:'both', text:'선전베이와 황강 새 커우안은 한 건물에서 두 쪽 심사를 해서 버스로 넘기 편해요. 황강은 24시간 열어요.' },
  { key:'szMetro', title:'선전 지하철', city:'sz', text:'2026년 9월부터 모든 개찰구에서 해외 카드(Visa·Mastercard·AMEX·JCB)를 찍고 탈 수 있어요. 비접촉 결제가 되는 카드여야 해요. 휴대폰 지갑에 넣은 카드도 돼요. 표 사기·아이 표는 고객센터나 자동 발매기에서 해외 카드로 해요.' },
  { key:'taxi', title:'택시·차 부르기 (선전)', city:'sz', text:'가오더 지도(高德地图, Amap) 앱에서 차를 부를 수 있어요. 한국어·영어 화면이 있어요. 기사에게는 목적지 중국어 주소를 보여 줘요.' },
  { key:'internet', title:'인터넷·지도 (선전)', city:'sz', text:'본토에서는 현지 유심·와이파이로는 구글 등이 열리지 않아요. 한국 통신사 로밍은 그대로 쓸 수 있다고 안내해요. 해외 eSIM은 상품마다 달라 사기 전에 확인하세요. 지도는 가오더 지도(한국어 지원)를 써요.' }
];

// 돈
export const MONEY = {
  hk:{ cur:'HKD', tips:[
    '교통·편의점은 옥토퍼스로 거의 다 돼요.',
    '지하철은 비접촉 신용카드로도 타요(어른 요금).',
    '가게마다 카드가 되는지 물어보세요(문장 카드: \'可唔可以用信用卡？\').',
    '현금이 HK$120,000 넘으면 세관에 신고해요.'
  ] },
  sz:{ cur:'CNY', tips:[
    '본토는 휴대폰 결제가 기본이에요. 알리페이·위챗페이에 해외 카드(Visa·Mastercard·JCB 등)를 연결해요. 한국에서 미리 해 두세요.',
    '연결한 해외 카드로 한 번에 200위안까지는 수수료가 없고, 넘으면 3%가 붙을 수 있어요(바뀔 수 있으니 앱에서 확인).',
    '카드 연결이 거절되면 카드사 고객센터에 해외 결제를 열어 달라고 해요.',
    '2026년 2월부터 가게는 위안화 현금을 거절하면 안 돼요. 그래도 잔돈이 없는 곳이 있으니 작은 돈을 조금 챙겨요.',
    '지하철은 해외 카드를 찍고 타요.'
  ] }
};

// 준비물 추천. cat은 js/packing.js의 PACK_CATS 키
export const PACKING = [
  { key:'hkPlug', text:'홍콩용 G형 어댑터 (네모 세 핀)', cat:'tech', why:'홍콩은 220V에 네모난 세 핀 콘센트라 한국 플러그가 안 맞아요. 사람 수만큼 있으면 편해요.', city:'hk' },
  { key:'cnPlug', text:'중국용 멀티 어댑터', cat:'tech', why:'본토는 220V에 납작한 두 핀(A형)·八자 세 핀(I형) 콘센트예요. 한국 둥근 플러그가 안 들어가는 곳이 있어요.', city:'sz' },
  { key:'alipay', text:'알리페이·위챗페이 설치하고 해외 카드 연결', cat:'doc', why:'본토는 휴대폰 결제가 기본이에요. 연결이 거절되면 카드사에 물어야 하니 한국에서 미리 해요.', city:'sz' },
  { key:'cnCard', text:'중국 입국카드 온라인 작성', cat:'doc', why:'가족 한 사람씩 써요. 미리 하면 검사장 줄이 짧아요.', city:'sz' },
  { key:'roam', text:'한국 통신사 로밍 (또는 확인한 eSIM)', cat:'tech', why:'본토 현지 유심·와이파이로는 구글 등이 막혀요. 로밍은 한국처럼 쓸 수 있다고 통신사가 안내해요.', city:'sz' },
  { key:'amap', text:'가오더 지도(Amap) 앱 설치', cat:'tech', why:'본토에선 구글 지도가 잘 안 돼요. 가오더는 한국어 화면이 있고 차 부르기도 돼요.', city:'sz' },
  { key:'passValid', text:'여권 만료일 확인 (6개월 넘게)', cat:'doc', why:'홍콩은 떠나는 날 뒤로 6개월 넘게 남아 있어야 해요. 아이 여권도 같이 봐요.' },
  { key:'passCopy', text:'여권 사본·여권 사진 1장씩', cat:'doc', why:'잃어버리면 총영사관에서 새로 받을 때 필요해요.' },
  { key:'tapCard', text:'비접촉 결제 되는 해외 카드', cat:'doc', why:'홍콩 MTR·선전 지하철 개찰구에서 바로 찍고 타요.' },
  { key:'octopus', text:'옥토퍼스 (아이폰 지갑 또는 투어리스트 카드)', cat:'doc', why:'12살부터는 어른 카드예요. 아이 요금은 11살까지예요.', city:'hk' },
  { key:'cny', text:'위안화 현금 조금', cat:'doc', why:'작은 가게·잔돈용이에요.', city:'sz' },
  { key:'hkWear', text:'얇은 겉옷·긴소매 (겹쳐 입기)', cat:'wear', why:'홍콩 12월은 평균 18.2°, 낮 20.4° 밤 16.2° 안팎이에요(1991~2020 평년값).', city:'hk' },
  { key:'szWear', text:'따뜻한 겉옷 하나', cat:'wear', why:'선전 12월은 평균 17.4° 안팎이지만, 찬 바람이 오면 10° 아래로 떨어지는 날도 있어요.', city:'sz' }
];

// 준비물 추천을 packing.js suggestPacking과 같은 모양({ key, c, t, why })으로
export function packingFor(city){ return forCity(PACKING, city).map(p => ({ key:p.key, c:p.cat, t:p.text, why:p.why })); }

// 한 도시 안내 한 묶음 (화면에서 한 번에 쓰기 좋게)
export function guideFor(city){
  return {
    calls:callsFor(city), consulate:consulateFor(city), phrases:phrasesFor(city), lost:forCity(LOST, city),
    weather:city === 'hk' ? WEATHER : [], entry:forCity(ENTRY, city), transport:forCity(TRANSPORT, city),
    money:MONEY[city] || null, packing:packingFor(city)
  };
}

// 홍콩 공항철도 시내 체크인 (홍콩역·구룡역): 참여 항공사만, 무료로 비행기 짐을 미리 부침. 받는 시간·항공사는 공식 페이지에서 확인
//   www.hongkongairport.com/en/baggage/airport-express-check-in.page (2026-10-31 확인)
export const ITC = { url:'https://www.hongkongairport.com/en/baggage/airport-express-check-in.page', checked:'2026-10-31',
  text:'마지막 날 홍콩역·구룡역(공항철도)에서 비행기 짐을 미리 부치면 짐 없이 다니다 공항으로 가요. 참여 항공사만 되고 무료예요. 받는 시간·항공사는 꼭 확인하세요.' };
