// 홍콩·선전 지역의 동네(AREAS)·장소(PLACES)·노선(LINES)·국경(BORDER) 데이터.
// 모양은 js/data.js의 도쿄 AREAS·PLACES와 같아요(필드 설명은 그 파일 맨 위 주석).
// 다른 점: ja 칸은 '현지 이름'(홍콩은 번체 중문 또는 공식 영어 이름, 선전은 간체 중문)이라 구글 지도 검색어로 써요.
//          AREAS에는 city('hk' | 'sz')가 더 있고, 장소 id는 hk_·sz_로 시작해요.
//
// 출처와 확인 (2026-10-29)
// - 좌표: 이 작업 환경에서는 OpenStreetMap(Nominatim)·위키백과에 직접 접속이 막혀 있어서,
//   웹 검색으로 위키백과 좌표(WGS-84)·Mapcarta(OpenStreetMap 자료)·좌표 정리 사이트(Sygic/Tripomatic, latitude.to 등)를
//   두 곳 이상 대조해 0.5km 안으로 맞췄어요. 서로 다르면 위키백과 쪽을 따랐어요.
//   좌표를 바로 못 찾아 바로 옆 확인된 지점으로 맞춘 곳(모두 0.5km 안으로 봄):
//     hk_apliu(삼수이포역 C2 출구), hk_k11(스타의 거리와 우주박물관 사이, 솔즈베리로드 18), hk_centralmarket(미드레벨 에스컬레이터 아래 끝),
//     hk_taikwun(할리우드로드 10, 에스컬레이터 옆), hk_leetung(완차이역 D출구), sz_dafen(다펀역 옆), sz_museum(시민센터 위키백과 좌표 두 개 사이),
//     sz_dji(OCT 하버 안), sz_talent(인재공원역·선전베이 문화광장 옆).
//   확인 못 해서 넣지 않은 곳: 홍콩 역사박물관(보수 공사), 선전 야생동물원(좌표가 분 단위로만 나옴), 푸톈 맹그로브 공원, 선전베이 만상성, BYD 전시관(예약 단체 방문만 받는 것으로 보임).
// - 중국 본토 지도는 GCJ-02 좌표를 써서, 구글 지도 그림 위에 여기 좌표(WGS-84)를 찍으면 선전 쪽이 수백 m 어긋나 보일 수 있어요.
// - 휴무 요일(closed): 공식 누리집으로 확인한 홍콩 박물관 5곳만 넣었어요(LCSD 우주박물관·과학관·예술관, M+, 고궁문화박물관. 모두 공휴일엔 열어요).
//   선전 박물관은 월요일에 쉬는 곳이 많지만 공식 누리집으로 확인하지 못해 note로만 알려요.
// - 이동 시간·가격대·국경 소요 시간은 대략값이에요. 화면에 "대략값"을 같이 보여 주세요.

export const AREAS = {
  // 홍콩
  tst:{name:'침사추이', city:'hk', station:'MTR 침사추이역', q:'尖沙咀站', lat:22.2975, lng:114.1722, hotel:true, disneyMin:40,
    disneyText:'환승 2번, 약 35~45분', price:'높음', lx:20, ly:14, anchor:'start',
    note:'항구 야경·박물관·쇼핑몰이 걸어서 닿아요. 선전 가는 고속철 서구룡역도 가까워요.'},
  mongkok:{name:'몽콕·야우마테이', city:'hk', station:'MTR 몽콕역', q:'旺角站', lat:22.3191, lng:114.1694, hotel:true, disneyMin:40,
    disneyText:'환승 2번, 약 35~45분', price:'보통', lx:20, ly:-10, anchor:'start',
    note:'야시장·길거리 음식이 많고 숙소값이 비교적 낮아요. 밤늦게까지 붐비고 방이 좁은 편이에요.'},
  central:{name:'센트럴·성완', city:'hk', station:'MTR 센트럴역', q:'中環站', lat:22.2819, lng:114.1581, hotel:true, disneyMin:30,
    disneyText:'홍콩역에서 퉁청선, 환승 1번, 약 25~35분', price:'높음', lx:-20, ly:8, anchor:'end',
    note:'피크 트램·미드레벨 에스컬레이터가 가까워요. 홍콩역에서 디즈니·공항 가기 편해요.'},
  cwb:{name:'코즈웨이베이·완차이', city:'hk', station:'MTR 코즈웨이베이역', q:'銅鑼灣站', lat:22.2798, lng:114.1836, hotel:true, disneyMin:45,
    disneyText:'환승 2번, 약 40~50분', price:'높음', lx:20, ly:14, anchor:'start',
    note:'쇼핑몰·식당이 많고 2층 트램이 앞을 지나요. 디즈니·공항과는 먼 편이에요.'},
  disney:{name:'디즈니 리조트', city:'hk', station:'MTR 디즈니랜드 리조트역', q:'迪士尼站', lat:22.3155, lng:114.0451, hotel:true, disneyMin:0,
    disneyText:'걸어서·셔틀버스로 바로', price:'높음', lx:0, ly:-20, anchor:'middle',
    note:'디즈니 호텔에서 자면 아침 일찍부터 밤 불꽃놀이까지 편해요. 시내까지는 30~40분이에요. 호텔 공사 일정은 예약 전에 확인하세요.'},
  tungchung:{name:'퉁청·공항', city:'hk', station:'MTR 퉁청역', q:'東涌站', lat:22.2893, lng:113.9416, hotel:true, disneyMin:15,
    disneyText:'써니베이 환승, 약 15분', price:'보통~높음', lx:0, ly:40, anchor:'middle',
    note:'공항과 가깝고 옹핑 360 케이블카가 바로 앞이에요. 시내 관광지까지는 30분 넘게 걸려요.'},
  south:{name:'홍콩섬 남쪽', city:'hk', station:'MTR 오션파크역', q:'海洋公園站', lat:22.2486, lng:114.1745, hotel:false,
    lx:0, ly:40, anchor:'middle', note:''},
  // 선전
  futian:{name:'푸톈 CBD', city:'sz', station:'푸톈역(고속철·지하철)', q:'福田站', lat:22.5383, lng:114.0567, hotel:true, disneyMin:100,
    disneyText:'고속철로 서구룡 뒤 MTR, 출입국 포함 약 1시간 30분~2시간', price:'보통', lx:-20, ly:28, anchor:'end',
    note:'고속철 푸톈역에서 홍콩 서구룡까지 약 15분. 평안금융센터·시민센터가 걸어서 닿아요. 택시·버스가 거의 다 전기차예요.'},
  huaqiang:{name:'화창베이', city:'sz', station:'지하철 화창로역', q:'华强北', lat:22.5432, lng:114.0840, hotel:true, disneyMin:110,
    disneyText:'국경 넘어 MTR, 출입국 포함 약 1시간 40분~2시간', price:'낮음~보통', lx:20, ly:-12, anchor:'start',
    note:'전자상가 한가운데라 구경하기 좋아요. 숙소값이 비교적 낮고 지하철 1·2·3·7호선이 지나요.'},
  luohu:{name:'뤄후(국경)', city:'sz', station:'지하철 뤄후역', q:'罗湖口岸', lat:22.5322, lng:114.1133, hotel:true, disneyMin:110,
    disneyText:'로우역에서 MTR 동철선, 출입국 포함 약 1시간 40분~2시간', price:'낮음~보통', lx:20, ly:16, anchor:'start',
    note:'홍콩 동철선과 이어지는 뤄후 국경이 바로 앞이라 오가기 쉬워요. 오래된 상점가 분위기예요.'},
  oct:{name:'화교성(OCT)', city:'sz', station:'지하철 세계의 창역', q:'世界之窗站', lat:22.5399, lng:113.9693, hotel:true, disneyMin:120,
    disneyText:'국경 넘어 MTR, 출입국 포함 약 2시간', price:'보통', lx:0, ly:-22, anchor:'middle',
    note:'세계의 창·환러구·OCT 하버·DJI 매장이 모여 있어 아이와 하루 보내기 좋아요.'},
  nanshan:{name:'난산·셔커우', city:'sz', station:'지하철 허우하이역', q:'后海站', lat:22.5242, lng:113.9474, hotel:true, disneyMin:110,
    disneyText:'선전베이 국경 버스 뒤 MTR, 출입국 포함 약 1시간 40분~2시간', price:'보통~높음', lx:-20, ly:30, anchor:'end',
    note:'기술 기업 본사가 모인 새 도심이에요. 선전베이 국경과 바닷가 공원이 가까워요.'},
  longgang:{name:'룽강(다펀)', city:'sz', station:'지하철 다펀역', q:'大芬站', lat:22.6139, lng:114.1383, hotel:false,
    lx:0, ly:-22, anchor:'middle', note:''}
};

export const PLACES = [
  // 홍콩 · 침사추이
  {id:'hk_avenue', kind:'야경·일루미네이션', indoor:false, name:'스타의 거리 (침사추이 해변 산책로)', ja:'星光大道', area:'tst', lat:22.2935, lng:114.1740, hours:1, anchor:true, tags:['관광명소','자연·산책'], kid:'all', note:'항구 건너 홍콩섬 빌딩 야경이 정면으로 보여요. 저녁엔 빌딩 조명 쇼를 해요.'},
  {id:'hk_starferry', kind:'체험·캐릭터', indoor:'part', name:'스타페리', ja:'天星小輪 尖沙咀碼頭', area:'tst', lat:22.2935, lng:114.1680, hours:0.5, tags:['관광명소','체험'], kid:'all', note:'침사추이와 센트럴을 10분쯤 건너는 100년 넘은 배예요. 옥토퍼스 카드로 타요.'},
  {id:'hk_space', kind:'박물관·미술관', indoor:true, name:'홍콩 우주박물관', ja:'香港太空館', area:'tst', lat:22.2944, lng:114.1719, hours:2, anchor:true, tags:['체험'], kid:'kids', closed:[2], note:'돔 천장 영상관과 우주 체험 전시가 있어요. 화요일 휴관(공휴일은 열어요).'},
  {id:'hk_science', kind:'박물관·미술관', indoor:true, name:'홍콩 과학관', ja:'香港科學館', area:'tst', lat:22.3010, lng:114.1775, hours:2.5, anchor:true, tags:['체험'], kid:'kids', closed:[4], note:'직접 만지고 해 보는 전시가 많아요. 목요일 휴관(공휴일은 열어요).'},
  {id:'hk_art', kind:'박물관·미술관', indoor:true, name:'홍콩 예술관', ja:'香港藝術館', area:'tst', lat:22.2934, lng:114.1716, hours:1.5, tags:['문화·역사'], kid:'all', closed:[4], note:'바다 쪽 큰 창으로 항구가 보이는 미술관이에요. 목요일 휴관(공휴일은 열어요).'},
  {id:'hk_harbourcity', kind:'쇼핑', indoor:true, name:'하버시티', ja:'海港城', area:'tst', lat:22.2975, lng:114.1686, hours:2, tags:['쇼핑'], kid:'all', note:'홍콩에서 가장 큰 쇼핑몰 가운데 하나예요. 비 오는 날 다니기 좋아요.'},
  {id:'hk_k11', kind:'쇼핑', indoor:true, name:'K11 뮤제아', ja:'K11 MUSEA', area:'tst', lat:22.2945, lng:114.1745, hours:1.5, tags:['쇼핑','문화·역사'], kid:'all', note:'예술 작품을 곳곳에 둔 바닷가 쇼핑몰이에요. 스타의 거리 바로 옆이에요.'},
  {id:'hk_kowloonpark', kind:'공원·정원', indoor:false, name:'구룡공원', ja:'九龍公園', area:'tst', lat:22.3004, lng:114.1704, hours:1, tags:['자연·산책'], kid:'all', note:'네이선로드 옆 도심 공원이에요. 홍학 연못과 새장이 있어요.'},
  {id:'hk_mplus', kind:'박물관·미술관', indoor:true, name:'M+ 박물관', ja:'M+', area:'tst', lat:22.3010, lng:114.1596, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[1], note:'아시아 현대 미술·디자인 미술관이에요. 월요일 휴관(공휴일도 월요일이면 쉬어요). 앞 잔디밭에서 항구가 잘 보여요.'},
  {id:'hk_palace', kind:'박물관·미술관', indoor:true, name:'홍콩 고궁문화박물관', ja:'香港故宮文化博物館', area:'tst', lat:22.3021, lng:114.1556, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[2], note:'베이징 자금성 유물을 보여 줘요. 화요일 휴관(공휴일은 열어요). 시간 지정 표를 미리 사 두면 편해요.'},
  {id:'hk_sky100', kind:'전망대', indoor:true, name:'스카이100 전망대', ja:'天際100', area:'tst', lat:22.3034, lng:114.1602, hours:1.5, anchor:true, tags:['관광명소'], kid:'all', note:'ICC 빌딩 100층 실내 전망대예요. 비 오는 날에도 갈 수 있어요.'},
  // 홍콩 · 몽콕·야우마테이
  {id:'hk_ladies', kind:'거리·시장', indoor:'part', name:'레이디스 마켓', ja:'女人街', area:'mongkok', lat:22.3171, lng:114.1710, hours:1, tags:['쇼핑'], kid:'all', note:'기념품·잡화 노점 거리예요. 오후부터 밤까지 열고 흥정이 기본이에요.'},
  {id:'hk_temple', kind:'거리·시장', indoor:false, name:'템플 스트리트 야시장', ja:'廟街夜市', area:'mongkok', lat:22.3070, lng:114.1701, hours:1.5, tags:['맛집','쇼핑'], kid:'all', note:'저녁에 열리는 야시장이에요. 노점 해산물과 길거리 음식이 많아요.'},
  {id:'hk_sneaker', kind:'쇼핑', indoor:'part', name:'스니커 거리 (파윤 거리)', ja:'花園街', area:'mongkok', lat:22.3180, lng:114.1714, hours:1, tags:['쇼핑'], kid:'teen', note:'운동화 가게가 줄지어 있는 거리예요.'},
  {id:'hk_goldfish', kind:'거리·시장', indoor:'part', name:'금붕어 시장', ja:'金魚街', area:'mongkok', lat:22.3210, lng:114.1703, hours:0.5, tags:['관광명소'], kid:'kids', note:'비닐봉지에 담긴 금붕어가 가게 앞에 줄줄이 걸려 있어요.'},
  {id:'hk_apliu', kind:'거리·시장', indoor:'part', name:'삼수이포 압리우 거리', ja:'鴨寮街', area:'mongkok', lat:22.3302, lng:114.1616, hours:1.5, tags:['쇼핑'], kid:'teen', note:'중고 전자제품·부품 노점 거리예요. 근처 원단·단추 골목도 구경거리예요.'},
  {id:'hk_wongtaisin', kind:'신사·절', indoor:false, name:'웡타이신 사원', ja:'黃大仙祠', area:'mongkok', lat:22.3426, lng:114.1936, hours:1, anchor:true, tags:['문화·역사'], kid:'all', note:'소원이 잘 이루어진다는 도교 사원이에요. MTR 웡타이신역 바로 앞이에요.'},
  {id:'hk_chilin', kind:'공원·정원', indoor:false, name:'치린 수도원·난롄 정원', ja:'志蓮淨苑', area:'mongkok', lat:22.3407, lng:114.2052, hours:1.5, tags:['문화·역사','자연·산책'], kid:'all', note:'못을 쓰지 않고 나무로 지은 당나라 양식 절과 길 건너 정원이에요. 무료예요.'},
  // 홍콩 · 센트럴·성완
  {id:'hk_peak', kind:'전망대', indoor:false, name:'빅토리아 피크 (피크 트램)', ja:'凌霄閣', area:'central', lat:22.2712, lng:114.1500, hours:2.5, anchor:true, tags:['관광명소','자연·산책'], kid:'all', note:'피크 트램을 타고 올라가 홍콩 전체를 내려다봐요. 해 질 녘엔 트램 줄이 길어요.'},
  {id:'hk_escalator', kind:'거리·시장', indoor:'part', name:'미드레벨 에스컬레이터', ja:'中環至半山自動扶梯', area:'central', lat:22.2836, lng:114.1547, hours:0.5, tags:['관광명소'], kid:'all', note:'언덕을 오르는 800m 길이 야외 에스컬레이터예요. 아침에는 내려가는 방향으로만 움직여요.'},
  {id:'hk_pmq', kind:'쇼핑', indoor:'part', name:'PMQ', ja:'元創方', area:'central', lat:22.2834, lng:114.1519, hours:1, tags:['쇼핑','문화·역사'], kid:'all', note:'옛 경찰 기숙사를 고친 디자인 소품 가게 모음이에요.'},
  {id:'hk_taikwun', kind:'박물관·미술관', indoor:'part', name:'대관 (타이쿤)', ja:'大館', area:'central', lat:22.2817, lng:114.1543, hours:1, tags:['문화·역사'], kid:'all', note:'옛 경찰서·감옥을 고친 문화 공간이에요. 무료 전시가 많아요.'},
  {id:'hk_manmo', kind:'신사·절', indoor:true, name:'만모 사원', ja:'文武廟', area:'central', lat:22.2840, lng:114.1502, hours:0.5, tags:['문화·역사'], kid:'all', note:'천장에 매달린 나선형 향이 인상적인 옛 사원이에요.'},
  {id:'hk_lkf', kind:'먹거리', indoor:'part', name:'란콰이퐁', ja:'蘭桂坊', area:'central', lat:22.2810, lng:114.1555, hours:1.5, tags:['맛집'], kid:'adult', note:'바·식당이 모인 골목이에요. 밤늦게까지 붐벼요.'},
  {id:'hk_centralmarket', kind:'먹거리', indoor:true, name:'센트럴 마켓', ja:'中環街市', area:'central', lat:22.2848, lng:114.1557, hours:1, tags:['맛집','쇼핑'], kid:'all', note:'1930년대 시장 건물을 고친 푸드홀·상점가예요.'},
  {id:'hk_zoo', kind:'수족관·동물원', indoor:false, name:'홍콩 동식물공원', ja:'香港動植物公園', area:'central', lat:22.2780, lng:114.1562, hours:1, tags:['자연·산책'], kid:'kids', note:'무료로 들어가는 도심 속 작은 동물원·식물원이에요.'},
  {id:'hk_wheel', kind:'전망대', indoor:'part', name:'홍콩 관람차', ja:'香港摩天輪', area:'central', lat:22.2852, lng:114.1618, hours:0.5, tags:['관광명소'], kid:'all', note:'센트럴 바닷가 대관람차예요. 밤에 타면 항구 야경이 좋아요.'},
  // 홍콩 · 코즈웨이베이·완차이
  {id:'hk_timessquare', kind:'쇼핑', indoor:true, name:'타임스스퀘어', ja:'時代廣場', area:'cwb', lat:22.2783, lng:114.1821, hours:1.5, tags:['쇼핑'], kid:'all', note:'코즈웨이베이 대표 쇼핑몰이에요. 주변에 백화점과 식당이 많아요.'},
  {id:'hk_victoriapark', kind:'공원·정원', indoor:false, name:'빅토리아 공원', ja:'維多利亞公園', area:'cwb', lat:22.2822, lng:114.1885, hours:1, tags:['자연·산책'], kid:'all', note:'도심의 큰 공원이에요. 놀이터와 산책길이 있어요.'},
  {id:'hk_racecourse', kind:'체험·캐릭터', indoor:false, name:'해피밸리 경마장', ja:'跑馬地馬場', area:'cwb', lat:22.2722, lng:114.1810, hours:2, tags:['체험'], kid:'adult', note:'경마 시즌(대략 9월~7월) 수요일 밤 경주가 유명해요. 경주 날짜는 홍콩자키클럽 누리집에서 확인하세요.'},
  {id:'hk_leetung', kind:'쇼핑', indoor:false, name:'리퉁 애비뉴', ja:'利東街', area:'cwb', lat:22.2755, lng:114.1716, hours:0.5, tags:['쇼핑','관광명소'], kid:'all', note:'유럽풍 보행자 거리예요. 완차이역 D출구와 이어져요.'},
  // 홍콩 · 디즈니
  {id:'hk_disney', kind:'테마파크', indoor:false, name:'홍콩 디즈니랜드', ja:'香港迪士尼樂園', area:'disney', lat:22.3130, lng:114.0413, hours:0, full:true, anchor:true, tags:['테마파크'], kid:'kids', book:true, note:'날짜마다 값이 다른 날짜 지정 입장권이에요. 겨울왕국 구역이 인기예요.'},
  {id:'hk_inspiration', kind:'공원·정원', indoor:false, name:'인스피레이션 레이크', ja:'迪欣湖活動中心', area:'disney', lat:22.3220, lng:114.0375, hours:1, tags:['자연·산책'], kid:'kids', note:'디즈니 옆 호수 공원이에요. 무료로 산책할 수 있어요.'},
  // 홍콩 · 퉁청·공항
  {id:'hk_ngong360', kind:'체험·캐릭터', indoor:'part', name:'옹핑 360 케이블카', ja:'昂坪360', area:'tungchung', lat:22.2902, lng:113.9387, hours:1.5, anchor:true, tags:['관광명소','체험'], kid:'all', note:'퉁청에서 옹핑까지 약 25분 케이블카예요. 바닥이 유리인 칸도 있어요. 바람이 세면 멈춰요.'},
  {id:'hk_bigbuddha', kind:'신사·절', indoor:false, name:'톈탄 대불·포린 사원', ja:'天壇大佛', area:'tungchung', lat:22.2540, lng:113.9050, hours:2, anchor:true, tags:['문화·역사','관광명소'], kid:'all', note:'계단 위에 앉은 34m 청동 대불이에요. 옹핑 360 케이블카와 묶어서 가요.'},
  {id:'hk_taio', kind:'거리·시장', indoor:false, name:'타이오 어촌', ja:'大澳', area:'tungchung', lat:22.2544, lng:113.8642, hours:2, tags:['문화·역사','맛집'], kid:'all', note:'나무 기둥 위 수상 가옥 마을이에요. 옹핑에서 버스로 가요.'},
  {id:'hk_citygate', kind:'쇼핑', indoor:true, name:'시티게이트 아웃렛', ja:'東薈城名店倉', area:'tungchung', lat:22.2898, lng:113.9410, hours:1.5, tags:['쇼핑'], kid:'all', note:'퉁청역 바로 위 아웃렛이에요. 공항 가는 날 들르기 좋아요.'},
  // 홍콩 · 남쪽
  {id:'hk_oceanpark', kind:'테마파크', indoor:false, name:'오션파크', ja:'香港海洋公園', area:'south', lat:22.2467, lng:114.1757, hours:0, full:true, anchor:true, tags:['테마파크','체험'], kid:'all', note:'판다·수족관과 놀이기구가 함께 있어요. 산 위·아래 구역은 케이블카나 열차로 오가요.'},
  {id:'hk_repulse', kind:'공원·정원', indoor:false, name:'리펄스베이', ja:'淺水灣', area:'south', lat:22.2368, lng:114.1962, hours:1, tags:['자연·산책'], kid:'all', note:'초승달 모양 모래 해변이에요. 센트럴에서 버스로 30분쯤 걸려요.'},
  {id:'hk_stanley', kind:'거리·시장', indoor:'part', name:'스탠리 마켓', ja:'赤柱市集', area:'south', lat:22.2183, lng:114.2125, hours:1.5, tags:['쇼핑','자연·산책'], kid:'all', note:'바닷가 마을 시장이에요. 기념품 가게와 바닷가 산책로가 있어요.'},
  {id:'hk_aberdeen', kind:'체험·캐릭터', indoor:false, name:'애버딘 삼판선', ja:'香港仔海濱公園', area:'south', lat:22.2473, lng:114.1543, hours:1, tags:['체험','문화·역사'], kid:'all', note:'작은 배(삼판선)를 타고 수상 마을이 있던 항구를 한 바퀴 돌아요.'},

  // 선전 · 화창베이
  {id:'sz_huaqiangbei', kind:'거리·시장', indoor:'part', name:'화창베이 전자상가 거리', ja:'华强北商业街', area:'huaqiang', lat:22.5440, lng:114.0804, hours:2, anchor:true, tags:['쇼핑','체험'], kid:'teen', note:'세계 전자제품 부품이 모이는 거리예요. 드론·로봇·휴대폰 액세서리 가게가 빌딩마다 가득해요.'},
  {id:'sz_seg', kind:'쇼핑', indoor:true, name:'SEG 전자시장', ja:'赛格电子市场', area:'huaqiang', lat:22.5436, lng:114.0811, hours:1.5, tags:['쇼핑','체험'], kid:'teen', note:'1~10층이 전자부품 가게예요. 부품을 사서 직접 만드는 사람들이 찾는 곳이에요.'},
  // 선전 · 푸톈 CBD
  {id:'sz_pingan', kind:'전망대', indoor:true, name:'평안금융센터 전망대 (Free Sky)', ja:'平安金融中心 云际观光层', area:'futian', lat:22.5364, lng:114.0504, hours:1.5, anchor:true, tags:['관광명소'], kid:'all', note:'599m 빌딩 116층 실내 전망대예요. 선전 빌딩숲이 한눈에 보여요. 표 살 때 여권을 챙기세요.'},
  {id:'sz_lianhuashan', kind:'공원·정원', indoor:false, name:'롄화산 공원', ja:'莲花山公园', area:'futian', lat:22.5562, lng:114.0539, hours:1.5, tags:['자연·산책','문화·역사'], kid:'all', note:'언덕 위 덩샤오핑 동상 앞에서 푸톈 CBD가 내려다보여요.'},
  {id:'sz_civic', kind:'야경·일루미네이션', indoor:false, name:'푸톈 CBD 빌딩 조명 쇼', ja:'市民中心 灯光秀', area:'futian', lat:22.5467, lng:114.0544, hours:0.5, tags:['관광명소'], kid:'all', note:'시민센터 앞에서 빌딩 수십 채가 함께 빛나는 조명 쇼를 봐요. 열리는 날·시간이 정해져 있어 미리 확인하세요.'},
  {id:'sz_museum', kind:'박물관·미술관', indoor:true, name:'선전 박물관', ja:'深圳博物馆', area:'futian', lat:22.5440, lng:114.0575, hours:1.5, tags:['문화·역사'], kid:'all', note:'작은 어촌이던 선전이 40여 년 만에 큰 도시가 된 이야기를 보여 줘요. 시민센터 동쪽 건물이고, 월요일엔 쉬는 경우가 많아요.'},
  {id:'sz_mocape', kind:'박물관·미술관', indoor:true, name:'선전 현대미술·도시계획관', ja:'深圳市当代艺术与城市规划馆', area:'futian', lat:22.5486, lng:114.0567, hours:1.5, tags:['문화·역사'], kid:'all', note:'선전의 도시 계획과 현대 미술 전시를 한 건물에서 해요. 구름 같은 지붕 건물이 멋져요.'},
  // 선전 · 화교성(OCT)
  {id:'sz_window', kind:'테마파크', indoor:false, name:'세계의 창', ja:'世界之窗', area:'oct', lat:22.5375, lng:113.9698, hours:4, anchor:true, tags:['테마파크','관광명소'], kid:'all', note:'에펠탑·피라미드 같은 세계 명소를 줄여 만든 공원이에요. 저녁엔 조명이 켜져요.'},
  {id:'sz_happyvalley', kind:'테마파크', indoor:false, name:'선전 환러구 (해피밸리)', ja:'深圳欢乐谷', area:'oct', lat:22.5455, lng:113.9756, hours:5, anchor:true, tags:['테마파크'], kid:'teen', note:'롤러코스터가 많은 놀이공원이에요. 10대가 특히 좋아해요.'},
  {id:'sz_splendid', kind:'테마파크', indoor:false, name:'금수중화 민속촌', ja:'锦绣中华民俗村', area:'oct', lat:22.5330, lng:113.9855, hours:3, tags:['문화·역사','테마파크'], kid:'all', note:'중국 곳곳의 명소를 줄인 모형과 소수민족 마을 공연이 있어요.'},
  {id:'sz_octloft', kind:'거리·시장', indoor:'part', name:'OCT-LOFT 창의문화원', ja:'华侨城创意文化园', area:'oct', lat:22.5381, lng:113.9934, hours:1, tags:['문화·역사','쇼핑'], kid:'all', note:'옛 공장 건물을 고친 디자인 가게·카페 거리예요. 차오청둥역에서 걸어가요.'},
  {id:'sz_octharbour', kind:'쇼핑', indoor:'part', name:'OCT 하버', ja:'欢乐海岸', area:'oct', lat:22.5265, lng:113.9831, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'호숫가 쇼핑·식당 거리예요. 저녁 산책하기 좋아요.'},
  {id:'sz_dji', kind:'체험·캐릭터', indoor:true, name:'DJI 플래그십 스토어', ja:'大疆旗舰店 欢乐海岸', area:'oct', lat:22.5262, lng:113.9835, hours:1, anchor:true, tags:['체험','쇼핑'], kid:'teen', note:'선전에서 시작한 드론 회사 DJI의 4층짜리 매장이에요. 드론·카메라를 직접 만져 볼 수 있고 바깥 공원은 드론 비행 공간이에요.'},
  // 선전 · 난산·셔커우
  {id:'sz_baypark', kind:'공원·정원', indoor:false, name:'선전베이 공원', ja:'深圳湾公园', area:'nanshan', lat:22.5140, lng:113.9640, hours:1.5, tags:['자연·산책'], kid:'all', note:'바닷가를 따라 길게 이어진 공원이에요. 건너편이 홍콩이고 겨울엔 철새가 와요.'},
  {id:'sz_talent', kind:'공원·정원', indoor:false, name:'인재공원', ja:'人才公园', area:'nanshan', lat:22.5140, lng:113.9440, hours:1, tags:['자연·산책','관광명소'], kid:'all', note:'호숫가에서 선전베이 빌딩 야경이 보여요. 밤 산책하기 좋아요.'},
  {id:'sz_huawei', kind:'쇼핑', indoor:true, name:'만상천지 (화웨이 매장)', ja:'深圳万象天地', area:'nanshan', lat:22.5450, lng:113.9511, hours:1.5, tags:['쇼핑','체험'], kid:'teen', note:'화웨이가 2019년 첫 글로벌 플래그십 매장을 연 쇼핑몰이에요. 둘레가 기술 기업이 모인 난산 과기원이에요. 매장 운영은 가기 전에 확인하세요.'},
  {id:'sz_nantou', kind:'거리·시장', indoor:'part', name:'난터우 고성', ja:'南头古城', area:'nanshan', lat:22.5409, lng:113.9200, hours:1.5, tags:['문화·역사','맛집'], kid:'all', note:'오래된 성 마을을 고친 골목이에요. 카페와 간식 가게가 많아요.'},
  {id:'sz_seaworld', kind:'거리·시장', indoor:'part', name:'셔커우 해상세계', ja:'海上世界', area:'nanshan', lat:22.4863, lng:113.9120, hours:1.5, tags:['관광명소','맛집'], kid:'all', note:'육지에 올라앉은 옛 여객선(밍화호) 둘레에 식당가가 모여 있어요. 걸어서 갈 거리에 디자인 박물관 디자인 소사이어티가 있어요.'},
  {id:'sz_bayglory', kind:'전망대', indoor:'part', name:'만취즈광 대관람차', ja:'湾区之光', area:'nanshan', lat:22.5441, lng:113.8830, hours:1, tags:['관광명소'], kid:'all', note:'바오안 바닷가 128m 대관람차예요. 해 질 녘이 좋아요. 다른 곳과 좀 떨어져 있어요.'},
  // 선전 · 뤄후
  {id:'sz_luohucc', kind:'쇼핑', indoor:true, name:'뤄후 상업성', ja:'罗湖商业城', area:'luohu', lat:22.5322, lng:114.1133, hours:1.5, tags:['쇼핑'], kid:'all', note:'국경 바로 위 쇼핑몰이에요. 옷·가방·안마 가게가 많고 흥정이 기본이에요.'},
  {id:'sz_dongmen', kind:'거리·시장', indoor:'part', name:'둥먼 보행자 거리', ja:'东门步行街', area:'luohu', lat:22.5483, lng:114.1124, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'선전에서 가장 오래된 상점가예요. 지하철 라오제역 A출구에서 가까워요.'},
  // 선전 · 룽강
  {id:'sz_dafen', kind:'거리·시장', indoor:'part', name:'다펀 유화마을', ja:'大芬油画村', area:'longgang', lat:22.6125, lng:114.1365, hours:2, tags:['문화·역사','체험'], kid:'all', note:'화가 작업실 수백 곳이 모인 마을이에요. 유화 그리기 체험을 하는 가게도 있어요.'}
];

// 약도에 그릴 주요 노선. 꼭짓점은 역 위치를 어림한 값이라 약도용이에요(대략값).
// color는 노선 고유색이라 DAY_COLORS처럼 고정값으로 둬요.
export const LINES = [
  { name:'MTR 췐완선', color:'#E2231A', pts:[[22.2819,114.1581],[22.2789,114.1647],[22.2975,114.1722],[22.3049,114.1717],[22.3128,114.1706],[22.3191,114.1694],[22.3245,114.1683],[22.3307,114.1623],[22.3372,114.1481],[22.3383,114.1379],[22.3484,114.1262],[22.3735,114.1178]] },
  { name:'MTR 퉁청선', color:'#F7943E', pts:[[22.2850,114.1580],[22.3049,114.1615],[22.3178,114.1602],[22.3266,114.1538],[22.3484,114.1262],[22.3586,114.1077],[22.3317,114.0290],[22.2893,113.9416]] },
  { name:'MTR 디즈니선', color:'#F173AC', pts:[[22.3317,114.0290],[22.3155,114.0451]] },
  { name:'MTR 동철선', color:'#5EB6E4', pts:[[22.2789,114.1647],[22.2817,114.1754],[22.3030,114.1818],[22.3221,114.1724],[22.3370,114.1761],[22.3727,114.1786],[22.3827,114.1872],[22.4134,114.2100],[22.4445,114.1704],[22.4920,114.1387],[22.5012,114.1280],[22.5283,114.1133]] },
  { name:'선전 지하철 1호선', color:'#00A650', pts:[[22.5320,114.1133],[22.5395,114.1185],[22.5446,114.1163],[22.5446,114.1040],[22.5430,114.0858],[22.5378,114.0565],[22.5359,114.0225],[22.5398,113.9960],[22.5397,113.9860],[22.5399,113.9693],[22.5407,113.9390]] },
  { name:'고속철 (서구룡↔푸톈·선전북)', color:'#8A8F98', pts:[[22.3040,114.1645],[22.5383,114.0567],[22.6119,114.0239]] }
];

// 홍콩↔선전 국경 넘는 곳. minutes는 홍콩 시내 대표 출발점에서 선전 쪽 지하철에 닿기까지 출입국 포함 대략 시간(대략값).
export const BORDER = [
  { key:'luohu', name:'뤄후 (로우)', local:'罗湖口岸 / 羅湖管制站', lat:22.5322, lng:114.1133,
    how:'MTR 동철선 종점 로우역에서 내려 걸어서 국경을 넘으면 선전 지하철 1호선 뤄후역이에요. 애드미럴티에서 기차로 약 50분.', minutes:75 },
  { key:'lokmachau', name:'푸톈 (록마차우)', local:'福田口岸 / 落馬洲支線管制站', lat:22.5148, lng:114.0656,
    how:'MTR 동철선 록마차우역(상수이에서 갈라짐)에서 다리를 건너면 선전 지하철 4·10호선 푸톈커우안역이에요. 푸톈 CBD·화창베이와 가까워요.', minutes:75 },
  { key:'huanggang', name:'황강 (록마차우 버스)', local:'皇岗口岸 / 落馬洲管制站', lat:22.5208, lng:114.0750,
    how:'국경 버스가 오가는 곳이에요. 2026년에 새 통관 건물(두 나라 심사를 한곳에서)로 바뀌는 중이라 가기 전에 운영 상황을 확인하세요.', minutes:80 },
  { key:'shenzhenbay', name:'선전베이', local:'深圳湾口岸', lat:22.5039, lng:113.9447,
    how:'홍콩 위안랑·틴수이와이 쪽에서 B2·B3 같은 국경 버스로 가요. 두 나라 심사를 한 건물에서 받아요. 난산·셔커우와 가까워요.', minutes:90 },
  { key:'xrl', name:'서구룡역 고속철 (→푸톈·선전북)', local:'香港西九龍站', lat:22.3040, lng:114.1645,
    how:'서구룡역 안에서 두 나라 출입국 심사를 한 번에 받고 고속철을 타요. 푸톈까지 약 15분, 선전북까지 약 20분. 여권 이름으로 기차표를 미리 사야 해요.', minutes:45 }
];
