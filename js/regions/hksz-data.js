// 홍콩·선전 지역의 동네(AREAS)·장소(PLACES)·노선(LINES)·국경(BORDER) 데이터.
// 모양은 js/data.js의 도쿄 AREAS·PLACES와 같아요(필드 설명은 그 파일 맨 위 주석).
// addr 칸: 영어(선전은 중국어) 이름+주소. 구글 지도는 이 값으로 찾아요(현지 이름이 달라도 찾게, 2026-11-06).
// mapq 칸: 주소로 찾으면 목록이 나오는 곳의 '한 곳으로 열리는 검색어'. gid 칸: 검색어로는 한 곳으로 안 열리는 곳의 구글 장소 ID(먼저 씀)
//   (2026-11-08 실제 폰 구글 지도 앱에서 확인: 세계의 창은 매표소, 둥먼은 호텔이 열렸고 난터우·화창베이·웡타이신은 목록이 나와서 고침)
// 다른 점: ja 칸은 '현지 이름'(홍콩은 번체 중문 또는 공식 영어 이름, 선전은 간체 중문)이라 구글 지도 검색어로 써요.
//          AREAS에는 city('hk' | 'sz')가 더 있고, 장소 id는 hk_·sz_로 시작해요.
//
// 안내서 두 권의 내용을 넣은 것 (2026-11-06)
// - 책은 후보를 찾는 데 쓰고 문장은 옮기지 않았어요. 좌표는 위키백과 API와 OpenStreetMap(Nominatim) 값을 대조해 0.5km 안(둘 다 없으면 OSM과 주소)으로 맞췄어요.
// - 시간·요금은 공식 쪽에서 확인했고, 공식에서 못 찾은 값은 메모에 '안내가 있어요·가기 전에 확인'으로 적었어요(closed 칸에는 넣지 않음).
// - 스타페리 요금은 starferry.com.hk 표, 스카이100은 공식 안내에 아직 보수 공사 중이라 그대로 뺐어요(책은 2026년 상반기 재개관 예상).
//
// 출처와 확인 (2026-10-29, 운영 정보 다시 확인 2026-11-01)
// - 좌표: 이 작업 환경에서는 OpenStreetMap(Nominatim)·위키백과에 직접 접속이 막혀 있어서,
//   웹 검색으로 위키백과 좌표(WGS-84)·Mapcarta(OpenStreetMap 자료)·좌표 정리 사이트(Sygic/Tripomatic, latitude.to 등)를
//   두 곳 이상 대조해 0.5km 안으로 맞췄어요. 서로 다르면 위키백과 쪽을 따랐어요.
//   좌표를 바로 못 찾아 바로 옆 확인된 지점으로 맞춘 곳(모두 0.5km 안으로 봄):
//     hk_apliu(삼수이포역 C2 출구), hk_k11(스타의 거리와 우주박물관 사이, 솔즈베리로드 18), hk_centralmarket(미드레벨 에스컬레이터 아래 끝),
//     hk_taikwun(할리우드로드 10, 에스컬레이터 옆), hk_leetung(완차이역 D출구), sz_dafen(다펀역 옆), sz_museum(시민센터 위키백과 좌표 두 개 사이),
//     sz_dji(OCT 하버 안), sz_talent(인재공원역·선전베이 문화광장 옆).
//   뺀 곳: 스카이100 전망대(2025-05-17부터 보수 공사로 닫음, 다시 여는 날 미정 — sky100.com.hk FAQ, 2026-11-01 확인).
//   더한 곳: 홍콩 역사박물관(새 상설전 'Hong Kong Story' 2026-04-01 공개 — info.gov.hk 2026-03-31 보도자료, 좌표는 위키백과, 과학관 바로 옆).
// - 빈 곳 채우기 (2026-11-01). 좌표는 아래 두 곳 이상을 대조해 0.5km 안, 시간은 공식 누리집 또는 서로 다른 두 곳.
//   중국 지도 앱·트립닷컴 좌표는 GCJ-02라 WGS-84 대조에 쓰지 않았어요(선전에서 약 0.5km 어긋남).
//   더한 곳:
//     sz_safari   좌표 Mapcarta(OSM)·위키데이터(약 0.4km 차이, OSM 쪽), 시간 9:30~18:00·17시 입장 마감·매일(선전 본지바오·트립닷컴·chinaexplorertour), 표를 사서 개인 입장
//     sz_mixcbay  좌표 위키데이터·위키백과 화룬 본사 빌딩(상가가 그 발치, 약 0.3km 차이, 가운데), 시간 일~목 10~22시·금토 22시 반(본지바오·불가리 매장 안내)
//     sz_hqbmuseum 좌표 위키미디어 커먼스·outdooractive(30m 안), 시간 화~일 10~18시·월 휴관(박물관 참관 안내 — 본지바오 전재·씨트립), 위챗 실명 예약(무료)
//     hk_maritime 좌표 위키백과·Google Arts & Culture·GoCity, 시간 hkmaritimemuseum.org(평일 9:30~17:30, 주말·공휴일 10~19시, 음력설 첫 이틀 휴관)
//     hk_birdgarden 좌표 위키백과·My Guide Hong Kong(0.1km 안), 시간 매일 7~20시(My Guide·TouchScreenTravels)
//     hk_walledcity 좌표 위키백과·GeoNames(0.1km 안), 시간 공원 매일 6:30~23시(LCSD 안내를 옮긴 Waze·트립닷컴·Little Steps), 전시실 수요일 휴무(두 곳)
//   넣지 않은 곳:
//     푸톈 맹그로브 생태공원 — 좌표가 여행 사이트 한 곳(소수점)뿐. 시간(6~23시, 무료)은 선전시 정부 누리집으로 확인됨
//     BYD 전시관(핑산 본사) — 산업 관광 예약을 학교·기관 단체(최대 50명, 10일 전)만 받음(BYD 공지를 옮긴 기사들)
//     선전베이 문화광장 — 좌표가 위키백과(위키데이터는 같은 값)뿐이고, 실명 예매에 외국 여권이 되는지 못 찾음
//     선전시 소년궁(과학 체험관) — 2026-08-01부터 일부만 시험 운영, 실명 예약에 외국 여권이 되는지 못 찾음
//     수이웨이 1368 먹자거리 — 좌표가 트립닷컴(GCJ-02로 보임) 한 곳뿐
//     디자인 소사이어티(셔커우) — 위키데이터와 다른 두 곳이 0.5km 넘게 다름(GCJ-02 차이로 보임). sz_seaworld 설명에 이미 있음
//     홍콩 문화박물관(사틴) — 이소룡 전시가 2026-07 끝났고 12월 전시를 못 찾음
// - 중국 본토 지도는 GCJ-02 좌표를 써서, 구글 지도 그림 위에 여기 좌표(WGS-84)를 찍으면 선전 쪽이 수백 m 어긋나 보일 수 있어요.
// - 휴무 요일(closed): 공식 누리집으로 확인한 곳만 넣었어요.
//   홍콩: LCSD 우주박물관(화)·과학관(목)·예술관(목)·역사박물관(화), M+(월), 고궁문화박물관(화). M+ 말고는 공휴일엔 열어요.
//   선전: 선전 박물관(월, 선전시 정부 누리집·shenzhenmuseum.com), 현대미술·도시계획관(월, 선전시 문화광전여유체육국 박물관 목록 2026-01).
//         화창베이 박물관(월, 박물관 참관 안내).
//   푸톈 CBD 조명 쇼는 금·토요일·공휴일(그 전날 포함)에만 해서 일~목을 closed로 둠(선전시 도시관리국 안내, 2026-10-01 다시 시작 뒤에도 같음).
// - 이 작업 환경은 공식 누리집에 직접 접속이 막혀 있어(2026-11-01), 검색 도구로 공식 도메인 페이지 내용만 골라 확인했어요.
// - 이동 시간·가격대·국경 소요 시간은 대략값이에요. 화면에 "대략값"을 같이 보여 주세요.
// - 여행 주간(2026-12-06 일 ~ 12-10 목)에 맞춰 다시 확인 (2026-11-03). 그 주 홍콩·본토 공휴일 없음.
//   이 환경은 공식 누리집을 직접 못 열어서(WebFetch 차단) 검색 도구로 공식 도메인 내용을 골라 확인했어요.
//   고친 곳:
//     hk_avenue  심포니 오브 라이트(幻彩詠香江)는 2026-02 예산안에서 '하반기에 끝내고 새 빛 쇼로 바꿈' 발표, 마지막 날짜 미정.
//                9/9~9/20 멈췄다 9/21 다시 함(info.gov.hk P2026090900545·P2026092100182) → 12월에 하는지 확인하라고 안내
//     hk_peak    피크 타워 빛 영상 쇼 '匯映山頂' 2026-06-13부터 1년, 매일 19:30·20:30·21:30 약 10분(hk01·orangenews 2026-06)
//     hk_wheel   클락켄플랩 음악 축제 12/4~6 센트럴 하버프런트 행사장(The Standard·Time Out 2026-10-07 1차 라인업 기사)
//     hk_disney  'A Disney Christmas' 2026-11-20 ~ 2027-01-03(디즈니 공식 페이지·2026-09-17 발표 요약 bestcalendar.jp, 공식 페이지 검색 요약엔 11/17로 나와 시작일만 다름)
//                트리 점등식(드론·눈), 겨울왕국 구역 겨울 마켓(처음). 공식 'Disney Christmas Live in Concert!' 좌석 패스 12/6까지·HK$299부터
//     disney 동네 디즈니랜드 호텔 2026-10-12부터 전체 휴업(hongkongdisneyland.com 호텔 페이지), 할리우드 호텔·익스플로러스 롯지는 영업
//     hk_oceanpark 'North Pole Encounter' 고쳐 짓느라 닫음, 2027년 1분기 다시 엶(oceanpark.com.hk 파크 달력). 파크는 365일 엶(날씨 예외)
//     hk_bigbuddha 지혜의 길(心經簡林) 2025-06-05부터 보수 공사, 2026년 4분기 마칠 예정(info.gov.hk 2025-05-27, 관광사무처 도의회 문서)
//     sz_civic   2026-10-01 국경절에 다시 시작(푸톈구 정부 웨이보를 옮긴 sina·qq 2026-09-28~10-01), 지금도 금·토·공휴일만,
//                11~3월 19:00·20:00·21:00 약 15분(선전 본지바오 2026 안내). 여행 주(일~목)엔 안 함
//   그대로 둔 곳(그 주에 바뀐 소식 못 찾음): LCSD 박물관 휴관 요일, M+·고궁(12/7 월 M+ 휴관, 12/8 화 우주·역사·고궁 휴관, 12/10 목 과학·예술 휴관),
//     피크 트램(2026년 점검은 3/9~12·9/8, 12월 공지 없음), 옹핑 360(2026년 점검은 1·3·5·6·9월과 11/10, 12월 공지 없음), 선전 박물관들(월 휴관),
//     평안금융센터 전망대·선전 환러구(12월 휴업 공지 없음)
// - 장소 9곳 더함 (2026-11-06). 사용자가 산 가이드북 두 권에서 후보만 얻고, 문장·사진은 쓰지 않았어요. 사실은 아래 자료로 다시 확인했어요.
//   좌표는 두 곳 이상을 대조해 0.5km 안(위키백과·Sygic·aroundus·OSM). 공식 누리집은 직접 못 열어 검색 도구로 골라 확인했어요.
//     hk_10kbuddhas 위키백과(계단 431개, 큰비에 닫을 수 있음)·디스커버홍콩(주소), 시간 9~17시는 Mapcarta 한 곳이라 '보통'으로 적음
//     hk_wishingtree 좌표 Sygic·OSM 정류장(0.1km 안), 교통 e-cgo.org.hk·위키백과
//     hk_pingshan 좌표 위키백과·Sygic(취성루), 취성루 시간은 Frommer's·Lonely Planet(화요일 휴무, 자료 일부가 달라 note로만 안내, closed 넣지 않음)
//     hk_hopewell 좌표 위키백과·aroundus, 17층 환승·56층은 위키백과, 무료는 Mapnook·Wanderlog. 시간표를 못 찾아 note로 안내
//     hk_bauhinia 좌표 위키백과·latitude.to(0.2km), 게양식 Lonely Planet·info.gov.hk(취소된 날 사례)
//     hk_bluehouse 좌표 위키백과·aroundus, 시간 Viva Blue House(공식). 수요일 휴무는 여행 안내만 있어 closed 넣지 않음
//     hk_shekobeach 좌표 위키백과·aroundus·Swimpass, 겨울 안전요원 중단 LCSD, 교통 위키백과
//     hk_cheungchau 좌표 위키백과(공공 부두·페리 부두, 60m 안), 요금 2026-04-01부터 TVB(교통부 공지)
//     hk_saikung 좌표 위키백과·travelprofy(0.1km 안), 교통 Hong Kong Cheapo
//   새 동네 3곳은 숙소 후보가 아니라 장소를 묶는 칸이에요(hotel:false). 좌표는 hktransit.js 타이와이·틴수이와이역, 청차우 부두.
// - 장소 6곳 더 넣음 (2026-11-06). 가이드북 두 권은 후보를 찾는 데만 썼어요. 좌표는 두 곳 이상 대조(위키백과·Sygic·aroundus·latitude.to).
//     hk_hkpark 공원 6~23시·무료 hkp.lcsd.gov.hk, 조류관 시간은 자료가 달라 note로 안내
//     hk_noonday 매일 12시·무료 discoverhongkong·Hong Kong Cheapo. 2026년 일정표는 못 찾음
//     hk_tram 요금 hktramways.com(어른 HK$3.3, 12세 미만 HK$1.6), 좌표는 웨스턴 마켓 종점(위키백과)
//     hk_westernmarket·hk_1881 건물 좌표만 확인, 상점 시간은 가게마다 달라요
//     hk_chekung 시간 위키백과·Sygic 7~18시, 다른 안내 8~18시
//   hk_peak note에 루가드 로드: 둘레 약 3.5km·약 1시간·전망대까지 약 20분·길에 물 살 곳 없음(LCSD 안내·Hello Hong Kong·discoverhongkong)
//   못 넣은 곳: 루가드 전망대·타이윤 시장·시노 센터(좌표 두 곳을 못 찾음), 창타이욱(좌표가 위키백과 하나뿐), 아쿠아루나(저녁 요금을 공식으로 못 찾음).
//   확인 못 함: 디즈니 12월 날짜별 운영 시간·쉬는 날, 오션파크 2026 크리스마스 행사, 하버시티 등 쇼핑몰 장식,
//     세계의 창·환러구 겨울 행사(지난해 세계의 창 눈 내리기는 12/7부터), 윈터페스트 정확한 날짜·시간·요금(EVENTS의 tbc)

// 가족 식당 목록은 따로 둔 파일에서 (장소와 섞이지 않게)
export { EATS } from './hksz-eats.js';

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
    note:'디즈니 호텔에서 자면 아침 일찍부터 밤 불꽃놀이까지 편해요. 시내까지는 30~40분이에요. 디즈니랜드 호텔은 2026년 10월 12일부터 공사로 문을 닫았어요(할리우드 호텔·익스플로러스 롯지는 열어요).'},
  tungchung:{name:'퉁청·공항', city:'hk', station:'MTR 퉁청역', q:'東涌站', lat:22.2893, lng:113.9416, hotel:true, disneyMin:15,
    disneyText:'써니베이 환승, 약 15분', price:'보통~높음', lx:0, ly:40, anchor:'middle',
    note:'공항과 가깝고 옹핑 360 케이블카가 바로 앞이에요. 시내 관광지까지는 30분 넘게 걸려요.'},
  south:{name:'홍콩섬 남쪽', city:'hk', station:'MTR 오션파크역', q:'海洋公園站', lat:22.2486, lng:114.1745, hotel:false,
    lx:0, ly:40, anchor:'middle', note:''},
  ntcentral:{name:'사틴·타이포·사이쿵', city:'hk', station:'MTR 타이와이역', q:'大圍站', lat:22.3728, lng:114.1787, hotel:false,
    lx:20, ly:-10, anchor:'start', note:''},
  ntwest:{name:'틴수이와이(핑산)', city:'hk', station:'MTR 틴수이와이역', q:'天水圍站', lat:22.4479, lng:114.0045, hotel:false,
    lx:-20, ly:-10, anchor:'end', note:''},
  islands:{name:'청차우섬', city:'hk', station:'센트럴 5번 부두에서 배', q:'長洲碼頭', lat:22.2081, lng:114.0283, hotel:false,
    lx:0, ly:24, anchor:'middle', note:''},
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
  {id:'hk_avenue', kind:'야경·일루미네이션', indoor:false, name:'스타의 거리 (침사추이 해변 산책로)', ja:'星光大道', addr:'Avenue of Stars, Tsim Sha Tsui Promenade, Salisbury Road, Tsim Sha Tsui, Hong Kong', mapq:'스타의 거리', area:'tst', lat:22.2935, lng:114.1740, hours:1, anchor:true, tags:['관광명소','자연·산책'], kid:'all', note:'항구 건너 홍콩섬 빌딩 야경이 정면으로 보여요. 저녁 8시 빌딩 조명 쇼(심포니 오브 라이트)는 2026년 안에 끝내고 새 빛 쇼로 바꾸기로 해서, 12월에도 하는지 가기 전에 확인하세요. 빌딩 불빛 야경은 그대로예요.'},
  {id:'hk_starferry', kind:'체험·캐릭터', indoor:'part', name:'스타페리', ja:'天星小輪 尖沙咀碼頭', addr:'Star Ferry Pier, Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2935, lng:114.1680, hours:0.5, tags:['관광명소','체험'], kid:'all', note:'침사추이와 센트럴을 10분쯤 건너는 100년 넘은 배예요. 옥토퍼스 카드로 타요. 평일 어른 2층 HK$5.0·1층 HK$4.0, 주말·공휴일 2층 HK$6.5·1층 HK$5.6이에요. 어린이 요금은 12살 미만까지예요. 층마다 타는 곳이 달라요. 완차이로 가는 노선도 있어요. 2027년 1월 25일부터 요금이 올라요. 항구를 도는 하버 투어도 있어요(시간은 공식 누리집 확인).'},
  {id:'hk_space', kind:'박물관·미술관', indoor:true, name:'홍콩 우주박물관', ja:'香港太空館', addr:'Hong Kong Space Museum, 10 Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2944, lng:114.1719, hours:2, anchor:true, tags:['체험'], kid:'kids', closed:[2], note:'돔 천장 영상관과 우주 체험 전시가 있어요. 화요일 휴관(공휴일은 열어요). 평일(월·수~금)엔 오후 1시에 열어요.'},
  {id:'hk_science', kind:'박물관·미술관', indoor:true, name:'홍콩 과학관', ja:'香港科學館', addr:'Hong Kong Science Museum, 2 Science Museum Road, Tsim Sha Tsui East, Hong Kong', area:'tst', lat:22.3010, lng:114.1775, hours:2.5, anchor:true, tags:['체험'], kid:'kids', closed:[4], note:'직접 만지고 해 보는 전시가 많아요. 목요일 휴관(공휴일은 열어요).'},
  {id:'hk_history', kind:'박물관·미술관', indoor:true, name:'홍콩 역사박물관', ja:'香港歷史博物館', addr:'Hong Kong Museum of History, 100 Chatham Road South, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.3016, lng:114.1771, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[2], note:'옛 마을부터 지금 도시까지 홍콩 이야기를 보여 주는 상설전을 2026년 4월 새로 열었어요. 상설전은 무료예요. 화요일 휴관(공휴일은 열어요). 과학관 바로 옆이에요.'},
  {id:'hk_art', kind:'박물관·미술관', indoor:true, name:'홍콩 예술관', ja:'香港藝術館', addr:'Hong Kong Museum of Art, 10 Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2934, lng:114.1716, hours:1.5, tags:['문화·역사'], kid:'all', closed:[4], note:'바다 쪽 큰 창으로 항구가 보이는 미술관이에요. 목요일 휴관(공휴일은 열어요).'},
  {id:'hk_harbourcity', kind:'쇼핑', indoor:true, name:'하버시티', ja:'海港城', addr:'Harbour City, 3-27 Canton Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2975, lng:114.1686, hours:2, tags:['쇼핑'], kid:'all', note:'홍콩에서 가장 큰 쇼핑몰 가운데 하나예요. 비 오는 날 다니기 좋아요. 오션 터미널 쪽에 토이저러스가 있고, 맨 끝 데크에서 항구가 보여요.'},
  {id:'hk_k11', kind:'쇼핑', indoor:true, name:'K11 뮤제아', ja:'K11 MUSEA', addr:'K11 MUSEA, 18 Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2945, lng:114.1745, hours:1.5, tags:['쇼핑','문화·역사'], kid:'all', note:'예술 작품을 곳곳에 둔 바닷가 쇼핑몰이에요. 스타의 거리 바로 옆이에요.'},
  {id:'hk_kowloonpark', kind:'공원·정원', indoor:false, name:'구룡공원', ja:'九龍公園', addr:'Kowloon Park, 22 Austin Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.3004, lng:114.1704, hours:1, tags:['자연·산책'], kid:'all', note:'네이선로드 옆 도심 공원이에요. 홍학 연못과 새장이 있어요. 공원 안에 헤리티지 디스커버리 센터가 있어요.'},
  {id:'hk_mplus', kind:'박물관·미술관', indoor:true, name:'M+ 박물관', ja:'M+', addr:'M+, 38 Museum Drive, West Kowloon Cultural District, Hong Kong', area:'tst', lat:22.3010, lng:114.1596, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[1], note:'아시아 현대 미술·디자인 미술관이에요. 월요일 휴관(공휴일도 월요일이면 쉬어요). 앞 잔디밭에서 항구가 잘 보여요.'},
  {id:'hk_palace', kind:'박물관·미술관', indoor:true, name:'홍콩 고궁문화박물관', ja:'香港故宮文化博物館', addr:'Hong Kong Palace Museum, 8 Museum Drive, West Kowloon Cultural District, Hong Kong', area:'tst', lat:22.3021, lng:114.1556, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[2], note:'베이징 자금성 유물을 보여 줘요. 화요일 휴관(공휴일은 열어요). 시간 지정 표를 미리 사 두면 편해요.'},
  // 홍콩 · 몽콕·야우마테이
  {id:'hk_ladies', kind:'거리·시장', indoor:'part', name:'레이디스 마켓', ja:'女人街', addr:'Ladies\' Market, Tung Choi Street, Mong Kok, Hong Kong', area:'mongkok', lat:22.3171, lng:114.1710, hours:1, tags:['쇼핑'], kid:'all', note:'기념품·잡화 노점 거리예요. 오후부터 밤까지 열고 흥정이 기본이에요. 낮엔 일부만 열고 해가 진 뒤에 붐벼요. 낮에 금붕어·꽃시장을 보고 밤에 여기와 템플 스트리트로 가면 좋아요. 값은 여러 곳을 비교하고 흥정하세요. 소매치기를 조심하세요. 한 블록 옆 사이영초이 거리에는 전자제품 가게가 많아요.'},
  {id:'hk_temple', kind:'거리·시장', indoor:false, name:'템플 스트리트 야시장', ja:'廟街夜市', addr:'Temple Street Night Market, Temple Street, Yau Ma Tei, Hong Kong', area:'mongkok', lat:22.3070, lng:114.1701, hours:1.5, tags:['맛집','쇼핑'], kid:'all', note:'저녁에 열리는 야시장이에요. 노점 해산물과 길거리 음식이 많아요. 저녁 8~9시쯤 가장 활기차요. 비 오면 노점이 많이 쉬어요. 가방은 앞으로 메세요. 근처에 야우마테이 틴하우 사원이 있어요.'},
  {id:'hk_sneaker', kind:'쇼핑', indoor:'part', name:'스니커 거리 (파윤 거리)', ja:'花園街', addr:'Sneakers Street, Fa Yuen Street, Mong Kok, Hong Kong', area:'mongkok', lat:22.3180, lng:114.1714, hours:1, tags:['쇼핑'], kid:'teen', note:'운동화 가게가 줄지어 있는 거리예요.'},
  {id:'hk_goldfish', kind:'거리·시장', indoor:'part', name:'금붕어 시장', ja:'金魚街', addr:'Goldfish Market, Tung Choi Street, Mong Kok, Hong Kong', area:'mongkok', lat:22.3210, lng:114.1703, hours:0.5, tags:['관광명소'], kid:'kids', note:'비닐봉지에 담긴 금붕어가 가게 앞에 줄줄이 걸려 있어요.'},
  {id:'hk_apliu', kind:'거리·시장', indoor:'part', name:'삼수이포 압리우 거리', ja:'鴨寮街', addr:'Apliu Street, Sham Shui Po, Hong Kong', area:'mongkok', lat:22.3302, lng:114.1616, hours:1.5, tags:['쇼핑'], kid:'teen', note:'중고 전자제품·부품 노점 거리예요. 근처 원단·단추 골목도 구경거리예요. 폰 케이스·충전기가 싼 편이에요. 붐비니 소매치기를 조심하세요.'},
  {id:'hk_wongtaisin', kind:'신사·절', indoor:false, name:'웡타이신 사원', ja:'黃大仙祠', addr:'Wong Tai Sin Temple, 2 Chuk Yuen Village, Wong Tai Sin, Hong Kong', mapq:'嗇色園黃大仙祠', area:'mongkok', lat:22.3426, lng:114.1936, hours:1, anchor:true, tags:['문화·역사'], kid:'all', note:'소원이 잘 이루어진다는 도교 사원이에요. MTR 웡타이신역 바로 앞이에요. 입구 쪽에서 점치는 대나무 막대를 빌릴 수 있고, 풀이는 돈을 내요. 구룡성채 공원과 묶기 좋아요. 점 풀이는 HK$30쯤이에요(책 기준).'},
  {id:'hk_birdgarden', kind:'공원·정원', indoor:false, name:'위엔포 거리 새 정원·꽃시장', ja:'園圃街雀鳥花園', addr:'Yuen Po Street Bird Garden, Yuen Po Street, Mong Kok, Hong Kong', area:'mongkok', lat:22.3259, lng:114.1738, hours:0.5, tags:['관광명소','자연·산책'], kid:'all', note:'새장을 들고 나온 어르신들이 모이는 중국식 작은 정원이에요. 바로 아래 꽃시장 거리를 지나 금붕어 시장까지 걸어서 이어져요. 매일 아침 7시~밤 8시에 열어요.'},
  {id:'hk_walledcity', kind:'공원·정원', indoor:false, name:'구룡성채 공원', ja:'九龍寨城公園', addr:'Kowloon Walled City Park, Tung Tau Tsuen Road, Kowloon City, Hong Kong', area:'mongkok', lat:22.3319, lng:114.1900, hours:1, tags:['문화·역사','자연·산책'], kid:'all', note:'빌딩이 빽빽했던 옛 구룡성채 자리를 정원으로 바꾼 곳이에요. 남아 있는 옛 관청 건물에서 성채 시절 모습을 보여 줘요. 공원은 매일 아침 6시 반~밤 11시, 전시실은 수요일에 쉬어요. 무료예요. 12띠 동물 조각 정원과 옛 남문 터가 있어요.'},
  {id:'hk_chilin', kind:'공원·정원', indoor:false, name:'치린 수도원·난롄 정원', ja:'志蓮淨苑', addr:'Chi Lin Nunnery, 5 Chi Lin Drive, Diamond Hill, Hong Kong', mapq:'Chi Lin Nunnery, Hong Kong', area:'mongkok', lat:22.3407, lng:114.2052, hours:1.5, tags:['문화·역사','자연·산책'], kid:'all', note:'못을 쓰지 않고 나무로 지은 당나라 양식 절과 길 건너 정원이에요. 무료예요. 절은 오전 9시~오후 4시 반, 정원은 아침 7시~밤 9시에 열어요.'},
  // 홍콩 · 센트럴·성완
  {id:'hk_peak', kind:'전망대', indoor:false, name:'빅토리아 피크 (피크 트램)', ja:'凌霄閣', addr:'The Peak Tower, 128 Peak Road, The Peak, Hong Kong', area:'central', lat:22.2712, lng:114.1500, hours:2.5, anchor:true, tags:['관광명소','자연·산책'], kid:'all', note:'피크 트램을 타고 올라가 홍콩 전체를 내려다봐요. 트램은 매일 아침 7시 반~밤 11시에 다니고, 해 질 녘엔 줄이 길어요. 무료로 보고 싶다면 피크 타워에서 루가드 로드를 따라 20분쯤 걸어 전망대까지 가요. 둘레길은 약 3.5km, 1시간쯤 걸리고 길에서 물을 살 수 없어요. 피크 타워에서 매일 저녁 7시 반·8시 반·9시 반에 10분쯤 빛 영상 쇼를 해요(2026년 6월부터 1년, 날씨에 따라 바뀔 수 있어요). 12월엔 오후 5시 40분쯤 해가 지니 오후 3~4시쯤 올라가면 낮·노을·야경을 다 볼 수 있어요. 올라갈 때는 트램 오른쪽 자리가 전망이 좋아요. 흐리면 아래가 안 보이니 예보를 보고 가세요. 내려갈 때 줄이 길면 15번 버스나 1번 초록 미니버스로 시내에 가요. 기념품은 시내 야시장보다 비싸요. 트램과 스카이 테라스 428을 묶은 표(스카이 패스)가 있어요. 어른 왕복 HK$180쯤이고 3~11살만 어린이 요금이에요. 스카이 테라스는 2026년 5월부터 오전 8시 반~밤 10시예요. 피크 타워 쪽 라이언스 파빌리온에서도 무료로 전망을 봐요. 피크 갤러리아 옥상에도 무료 전망대가 있어요(책 기준).'},
  {id:'hk_escalator', kind:'거리·시장', indoor:'part', name:'미드레벨 에스컬레이터', ja:'中環至半山自動扶梯', addr:'Central-Mid-Levels Escalator, Cochrane Street, Central, Hong Kong', mapq:'Central-Mid-Levels Escalator, Hong Kong', area:'central', lat:22.2836, lng:114.1547, hours:0.5, tags:['관광명소'], kid:'all', note:'언덕을 오르는 800m 길이 야외 에스컬레이터예요. 아침에는 내려가는 방향으로만 움직여요. 오전 10시쯤부터는 올라가는 방향으로 바뀌어요. 끝까지 갈 필요 없이 소호까지만 가도 충분해요.'},
  {id:'hk_pmq', kind:'쇼핑', indoor:'part', name:'PMQ', ja:'元創方', addr:'PMQ, 35 Aberdeen Street, Central, Hong Kong', area:'central', lat:22.2834, lng:114.1519, hours:1, tags:['쇼핑','문화·역사'], kid:'all', note:'옛 경찰 기숙사를 고친 디자인 소품 가게 모음이에요.'},
  {id:'hk_taikwun', kind:'박물관·미술관', indoor:'part', name:'대관 (타이쿤)', ja:'大館', addr:'Tai Kwun, 10 Hollywood Road, Central, Hong Kong', area:'central', lat:22.2817, lng:114.1543, hours:1, tags:['문화·역사'], kid:'all', note:'옛 경찰서·감옥을 고친 문화 공간이에요. 무료 전시가 많아요. 마당은 매일 열고, 현대미술 전시관은 월요일에 쉬어요. 둘레 소호 골목에 벽화가 많아 사진 찍기 좋아요.'},
  {id:'hk_manmo', kind:'신사·절', indoor:true, name:'만모 사원', ja:'文武廟', addr:'Man Mo Temple, 124-126 Hollywood Road, Sheung Wan, Hong Kong', area:'central', lat:22.2840, lng:114.1502, hours:0.5, tags:['문화·역사'], kid:'all', note:'천장에 매달린 나선형 향이 인상적인 옛 사원이에요. 입장은 무료예요. 바로 아래가 캣 스트리트예요.'},
  {id:'hk_lkf', kind:'먹거리', indoor:'part', name:'란콰이퐁', ja:'蘭桂坊', addr:'Lan Kwai Fong, D\'Aguilar Street, Central, Hong Kong', area:'central', lat:22.2810, lng:114.1555, hours:1.5, tags:['맛집'], kid:'adult', note:'바·식당이 모인 골목이에요. 밤늦게까지 붐벼요.'},
  {id:'hk_centralmarket', kind:'먹거리', indoor:true, name:'센트럴 마켓', ja:'中環街市', addr:'Central Market, 93 Queen\'s Road Central, Central, Hong Kong', area:'central', lat:22.2848, lng:114.1557, hours:1, tags:['맛집','쇼핑'], kid:'all', note:'1930년대 시장 건물을 고친 푸드홀·상점가예요.'},
  {id:'hk_zoo', kind:'수족관·동물원', indoor:false, name:'홍콩 동식물공원', ja:'香港動植物公園', addr:'Hong Kong Zoological and Botanical Gardens, Albany Road, Central, Hong Kong', mapq:'香港動植物公園', area:'central', lat:22.2780, lng:114.1562, hours:1, tags:['자연·산책'], kid:'kids', note:'무료로 들어가는 도심 속 작은 동물원·식물원이에요.'},
  {id:'hk_wheel', kind:'전망대', indoor:'part', name:'홍콩 관람차', ja:'香港摩天輪', addr:'Hong Kong Observation Wheel, 33 Man Kwong Street, Central, Hong Kong', area:'central', lat:22.2852, lng:114.1618, hours:0.5, tags:['관광명소'], kid:'all', note:'센트럴 바닷가 대관람차예요. 밤에 타면 항구 야경이 좋아요. 2026년 12월 4~6일(금~일)엔 바로 옆 센트럴 하버프런트에서 음악 축제(클락켄플랩)가 열려 둘레가 붐벼요.'},
  {id:'hk_maritime', kind:'박물관·미술관', indoor:true, name:'홍콩 해사박물관', ja:'香港海事博物館', addr:'Hong Kong Maritime Museum, Central Pier 8, Central, Hong Kong', area:'central', lat:22.2866, lng:114.1620, hours:1.5, tags:['체험','문화·역사'], kid:'all', note:'배 모형과 함께 홍콩 항구와 바닷길 이야기를 보여 주는 박물관이에요. 센트럴 8번 부두 2층이라 스타페리를 내려 바로 가요. 평일 9시 반~5시 반, 주말·공휴일 10시~7시에 열고 음력설 첫 이틀만 쉬어요.'},
  // 홍콩 · 코즈웨이베이·완차이
  {id:'hk_timessquare', kind:'쇼핑', indoor:true, name:'타임스스퀘어', ja:'時代廣場', addr:'Times Square, 1 Matheson Street, Causeway Bay, Hong Kong', mapq:'Times Square, Hong Kong', area:'cwb', lat:22.2783, lng:114.1821, hours:1.5, tags:['쇼핑'], kid:'all', note:'코즈웨이베이 대표 쇼핑몰이에요. 주변에 백화점과 식당이 많아요.'},
  {id:'hk_victoriapark', kind:'공원·정원', indoor:false, name:'빅토리아 공원', ja:'維多利亞公園', addr:'Victoria Park, 1 Hing Fat Street, Causeway Bay, Hong Kong', area:'cwb', lat:22.2822, lng:114.1885, hours:1, tags:['자연·산책'], kid:'all', note:'도심의 큰 공원이에요. 놀이터와 산책길이 있어요.'},
  {id:'hk_racecourse', kind:'체험·캐릭터', indoor:false, name:'해피밸리 경마장', ja:'跑馬地馬場', addr:'Happy Valley Racecourse, 2 Sports Road, Happy Valley, Hong Kong', area:'cwb', lat:22.2722, lng:114.1810, hours:2, tags:['체험'], kid:'adult', note:'경마 시즌(대략 9월~7월) 수요일 밤 경주가 유명해요. 2026년 12월 9일(수) 밤엔 국제 기수 대회 경주가 있어요. 다른 날짜는 홍콩자키클럽 누리집에서 확인하세요. 주의: 홍콩 규정상 18세 미만은 경주가 열리는 날 경마장에 들어갈 수 없어요. 아이와 함께라면 경주 날 입장은 어려우니 바깥에서 분위기만 보거나 일정에서 빼세요.'},
  {id:'hk_leetung', kind:'쇼핑', indoor:false, name:'리퉁 애비뉴', ja:'利東街', addr:'Lee Tung Avenue, 200 Queen\'s Road East, Wan Chai, Hong Kong', area:'cwb', lat:22.2755, lng:114.1716, hours:0.5, tags:['쇼핑','관광명소'], kid:'all', note:'유럽풍 보행자 거리예요. 완차이역 D출구와 이어져요.'},
  // 홍콩 · 디즈니
  {id:'hk_disney', kind:'테마파크', indoor:false, name:'홍콩 디즈니랜드', ja:'香港迪士尼樂園', addr:'Hong Kong Disneyland, Lantau Island, Hong Kong', area:'disney', lat:22.3130, lng:114.0413, hours:0, full:true, anchor:true, tags:['테마파크'], kid:'kids', book:true, note:'날짜마다 값이 다른 날짜 지정 입장권이에요. 겨울왕국 구역이 인기예요. 11월 20일~1월 3일은 크리스마스 행사 기간이라 저녁마다 메인 스트리트 트리 점등(드론·눈 효과)이 있고, 겨울왕국 구역에 겨울 마켓이 처음 열려요. 여는 시간은 날마다 달라 공식 달력에서 확인하세요. 공식 앱으로 지도와 대기 시간을 보고 음식도 주문할 수 있어요. 폐장 직전엔 상점이 붐비니 기념품은 일찍 사세요. 초등 고학년·10대가 좋아할 곳은 하이퍼스페이스 마운틴, 아이언맨 익스피리언스, 빅 그리즐리 마운틴, 미스틱 매너예요. 키 제한은 앱에서 확인하세요.'},
  {id:'hk_inspiration', kind:'공원·정원', indoor:false, name:'인스피레이션 레이크', ja:'迪欣湖活動中心', addr:'Inspiration Lake Recreation Centre, Lantau Island, Hong Kong', area:'disney', lat:22.3220, lng:114.0375, hours:1, tags:['자연·산책'], kid:'kids', note:'디즈니 옆 호수 공원이에요. 매일 아침 9시~저녁 7시에 무료로 산책할 수 있어요. 오리배 빌려 타기는 2026년 3월부터 쉬고 있어요.'},
  // 홍콩 · 퉁청·공항
  {id:'hk_ngong360', kind:'체험·캐릭터', indoor:'part', name:'옹핑 360 케이블카', ja:'昂坪360', addr:'Ngong Ping 360 Tung Chung Terminal, 11 Tat Tung Road, Tung Chung, Hong Kong', area:'tungchung', lat:22.2902, lng:113.9387, hours:1.5, anchor:true, tags:['관광명소','체험'], kid:'all', note:'퉁청에서 옹핑까지 약 25분 케이블카예요. 바닥이 유리인 칸도 있어요. 바람이 세면 멈춰요. 주말엔 줄이 길어요. 흐리면 전망이 약하니 전날 예보를 보세요. 내리면 옹핑 빌리지를 지나 대불로 걸어가요.'},
  {id:'hk_bigbuddha', kind:'신사·절', indoor:false, name:'톈탄 대불·포린 사원', ja:'天壇大佛', addr:'Tian Tan Buddha, Ngong Ping, Lantau Island, Hong Kong', mapq:'티안 탄 부처상', area:'tungchung', lat:22.2540, lng:113.9050, hours:2, anchor:true, tags:['문화·역사','관광명소'], kid:'all', note:'계단 위에 앉은 34m 청동 대불이에요. 옹핑 360 케이블카와 묶어서 가요. 근처 지혜의 길(나무 기둥 길)은 보수 공사로 닫혀 있고 2026년 말 마칠 예정이라, 열었는지 가서 확인하세요. 오후엔 역광이라 사진은 오전이 좋아요. 평일 오전이 덜 붐벼요.'},
  {id:'hk_taio', kind:'거리·시장', indoor:false, name:'타이오 어촌', ja:'大澳', addr:'Tai O Fishing Village, Lantau Island, Hong Kong', mapq:'Tai O Fishing Village', area:'tungchung', lat:22.2544, lng:113.8642, hours:2, tags:['문화·역사','맛집'], kid:'all', note:'나무 기둥 위 수상 가옥 마을이에요. 옹핑에서 버스로 가요. 옹핑에서 21번 버스로 오고, 퉁청으로 돌아갈 때는 11번 버스를 타요. 작은 배 구경은 사람이 차면 떠나요. 돌고래는 요즘 보기 어렵다고 해요. 말린 해산물과 오징어구이 가게가 많아요.'},
  {id:'hk_citygate', kind:'쇼핑', indoor:true, name:'시티게이트 아웃렛', ja:'東薈城名店倉', addr:'Citygate Outlets, 20 Tat Tung Road, Tung Chung, Hong Kong', area:'tungchung', lat:22.2898, lng:113.9410, hours:1.5, tags:['쇼핑'], kid:'all', note:'퉁청역 바로 위 아웃렛이에요. 공항 가는 날 들르기 좋아요. 평일 오전이 한산해요.'},
  // 홍콩 · 남쪽
  {id:'hk_oceanpark', kind:'테마파크', indoor:false, name:'오션파크', ja:'香港海洋公園', addr:'Ocean Park, 180 Wong Chuk Hang Road, Aberdeen, Hong Kong', mapq:'Ocean Park, Hong Kong', area:'south', lat:22.2467, lng:114.1757, hours:0, full:true, anchor:true, tags:['테마파크','체험'], kid:'all', note:'판다·수족관과 놀이기구가 함께 있어요. 산 위·아래 구역은 케이블카나 열차로 오가요. 북극 동물 전시관(North Pole Encounter)은 고쳐 짓느라 닫았고 2027년 1~3월에 다시 열 예정이에요. 아침에 정문 쪽 아래 구역을 먼저 보고, 오션 익스프레스로 산 위 구역에 올라가 놀이기구를 탄 뒤 케이블카로 내려오면 덜 헤매요. 바람이 세면 케이블카가 멈출 수 있어요. 산 위 구역의 헤어 레이저·아크틱 블라스트·더 플래시가 인기예요. 아래 구역엔 판다관과 그랜드 아쿠아리움이 있어요.'},
  {id:'hk_repulse', kind:'공원·정원', indoor:false, name:'리펄스베이', ja:'淺水灣', addr:'Repulse Bay Beach, Beach Road, Repulse Bay, Hong Kong', area:'south', lat:22.2368, lng:114.1962, hours:1, tags:['자연·산책'], kid:'all', note:'초승달 모양 모래 해변이에요. 센트럴에서 버스로 30분쯤 걸려요. 센트럴 익스체인지 스퀘어에서 6·6X·260번 버스로 가요. 2층 앞자리 전망이 좋아요. 같은 버스로 스탠리까지 이어져서 하루에 묶기 좋아요. 해변 동쪽 끝에 신상이 많은 바닷가 사당이 있어요. 11~3월은 수영철이 아니에요. 해변 산책로로 딥워터베이까지 1km 남짓 걸어갈 수 있어요.'},
  {id:'hk_shekobeach', kind:'공원·정원', indoor:false, name:'섹오 해변·마을', ja:'石澳', addr:'Shek O Beach, Shek O Road, Shek O, Hong Kong', mapq:'石澳泳灘', area:'south', lat:22.2290, lng:114.2510, hours:2, tags:['자연·산책'], kid:'all', note:'홍콩섬 동쪽 끝의 작은 바닷가 마을이에요. 11~3월엔 해변 안전요원이 없어서 물에 들어가지 말고 산책만 하세요. MTR 사우케이완역 앞에서 9번 버스를 타요. 마을에서 15분쯤 걸으면 바다가 보이는 따이또차우 전망대가 있어요.'},
  // 홍콩 · 완차이 더 보기
  {id:'hk_noonday', kind:'체험·캐릭터', indoor:false, name:'눈 데이 건 (정오의 대포)', ja:'怡和午炮', addr:'Noonday Gun, 221 Gloucester Road, Causeway Bay, Hong Kong', area:'cwb', lat:22.2826, lng:114.1838, hours:0.5, tags:['문화·역사','체험'], kid:'all', note:'매일 낮 12시에 바닷가에서 대포를 쏘는 오랜 전통이에요. 무료로 볼 수 있고 20분쯤 일찍 가면 자리 잡기 좋아요. 끝나고 잠깐 가까이서 사진을 찍을 수 있어요. 큰길 건너로 가는 지하도 입구를 찾기 어려우니 지도를 보며 가세요.'},
  {id:'hk_hopewell', kind:'전망대', indoor:true, name:'호프웰 센터 전망 엘리베이터', ja:'合和中心', addr:'Hopewell Centre, 183 Queen\'s Road East, Wan Chai, Hong Kong', area:'cwb', lat:22.2745, lng:114.1716, hours:0.5, tags:['관광명소','체험'], kid:'all', note:'17층에서 유리 엘리베이터로 갈아타고 56층까지 오르며 완차이 풍경을 봐요. 돈을 내지 않고 탈 수 있어요. 위층 식당 영업 시간에 맞춰 움직인다고 하니 가기 전에 확인하세요. 시간은 책마다 달라요. 클로즈업은 수~일 오전 9시~자정, 화 낮 12시~자정이고, 트래블로거 책은 평일 낮 12시~2시 반·저녁 6시 반~10시예요.'},
  {id:'hk_bauhinia', kind:'공원·정원', indoor:false, name:'골든 바우히니아 광장', ja:'金紫荊廣場', addr:'Golden Bauhinia Square, 1 Expo Drive, Wan Chai, Hong Kong', area:'cwb', lat:22.2843, lng:114.1737, hours:0.5, tags:['관광명소','문화·역사'], kid:'all', note:'1997년 홍콩 반환을 기념하는 금빛 꽃 조형물이 있는 바닷가 광장이에요. 매일 아침 8시쯤 국기 게양식을 해요(행사가 있으면 취소될 수 있어요). 7시 50분쯤 시작한다는 안내도 있으니 일찍 가세요. 옆으로 이어진 바닷가 산책로(엑스포 프로머네이드)는 저녁에 항구 야경을 조용히 보기 좋아요. 책 기준 내리는 시간은 저녁 6시예요.'},
  {id:'hk_bluehouse', kind:'박물관·미술관', indoor:'part', name:'블루하우스', ja:'藍屋', addr:'Blue House, 72-74A Stone Nullah Lane, Wan Chai, Hong Kong', area:'cwb', lat:22.2739, lng:114.1741, hours:1, tags:['문화·역사'], kid:'all', note:'파란 외벽이 눈에 띄는 완차이의 옛 4층 건물이에요. 안내 시간은 아침 10시~오후 6시인데 1층 전시는 수요일에 쉰다는 안내가 있어 가기 전에 확인하세요. MTR 완차이역 A3 출구에서 걸어가요.'},
  // 홍콩 · 센트럴·성완·침사추이 더 보기
  {id:'hk_hkpark', kind:'공원·정원', indoor:false, name:'홍콩 공원', ja:'香港公園', addr:'Hong Kong Park, 19 Cotton Tree Drive, Central, Hong Kong', area:'central', lat:22.2775, lng:114.1617, hours:1.5, tags:['자연·산책'], kid:'kids', note:'빌딩 사이에 있는 무료 공원이에요. 아침 6시~밤 11시에 열어요. 새장 안을 걸어 다니는 조류관과 다기 박물관이 있는데, 시설 시간은 따로라 가기 전에 확인하세요. MTR 애드미럴티역이 가까워요. 다기 박물관은 화요일에 쉬어요(공휴일은 열어요).'},
  {id:'hk_tram', kind:'체험·캐릭터', indoor:'part', name:'2층 트램 타기', ja:'香港電車 上環街市總站', addr:'Western Market, 323 Des Voeux Road Central, Sheung Wan, Hong Kong', area:'central', lat:22.2869, lng:114.1507, hours:1, tags:['체험','관광명소'], kid:'all', note:'홍콩섬 북쪽을 천천히 달리는 2층 전차예요. 2층 앞자리에서 거리를 구경하기 좋아요. 어른 HK$3.3, 12세 미만 HK$1.6이에요. 옥토퍼스와 현금, 카드, QR로 낼 수 있어요. 뒷문으로 타서 앞문으로 내리며 요금을 내요. 냉방이 없어 창문을 열고 달리고, 2층 천장이 낮아요.'},
  {id:'hk_westernmarket', kind:'거리·시장', indoor:true, name:'웨스턴 마켓', ja:'西港城', addr:'Western Market, 323 Des Voeux Road Central, Sheung Wan, Hong Kong', area:'central', lat:22.2872, lng:114.1504, hours:0.5, tags:['쇼핑','문화·역사'], kid:'all', note:'성완의 붉은 벽돌 옛 시장 건물이에요. 지금은 상점과 식당이 들어서 있고 트램 종점이 바로 옆이에요. 가게 시간은 곳마다 달라요. 가까운 본햄 스트랜드에 건어물 가게가 많아요.'},
  {id:'hk_1881', kind:'쇼핑', indoor:'part', name:'1881 헤리티지', ja:'1881 Heritage', addr:'1881 Heritage, 2A Canton Road, Tsim Sha Tsui, Hong Kong', mapq:'1881 Heritage, Hong Kong', area:'tst', lat:22.2955, lng:114.1700, hours:0.5, tags:['쇼핑','문화·역사'], kid:'all', note:'옛 해경 본부 건물을 쇼핑몰로 바꾼 곳이에요. 건물과 안뜰을 구경하기 좋아요. 침사추이 스타페리 선착장 가까이에 있어요.'},
  // 홍콩 · 신계와 섬
  {id:'hk_chekung', kind:'신사·절', indoor:false, name:'체쿵 사원', ja:'沙田車公廟', addr:'Che Kung Temple, Che Kung Miu Road, Sha Tin, Hong Kong', area:'ntcentral', lat:22.3734, lng:114.1829, hours:1, tags:['문화·역사','체험'], kid:'all', note:'바람개비를 돌려 운을 비는 사원이에요. 보통 아침부터 오후 6시까지 열어요. MTR 체쿵템플역이 가까워요. 걸어서 15분쯤 가면 주민이 사는 옛 객가 마을 창타이욱도 볼 수 있어요.'},
  {id:'hk_10kbuddhas', kind:'신사·절', indoor:false, name:'만불사', ja:'萬佛寺', addr:'Ten Thousand Buddhas Monastery, 221 Pai Tau Village, Sha Tin, Hong Kong', area:'ntcentral', lat:22.3875, lng:114.1847, hours:2, tags:['문화·역사','관광명소'], kid:'all', note:'금빛 불상이 양옆에 늘어선 계단을 올라가는 산 중턱 절이에요. 계단이 431개나 돼서 편한 신발이 좋아요. 보통 아침 9시~오후 5시에 열고, 큰비가 오면 닫기도 해요. MTR 사틴역 쪽에서 걸어가요. 사틴역에서 15분쯤 걸은 뒤 계단을 올라요. 납골당(포푹힐) 입구로 헷갈리기 쉬우니 표지판을 보세요. 체쿵 사원·뉴타운 플라자와 하루에 묶기 좋아요. 책에는 오전 9시~오후 5시 반으로 나와요.'},
  {id:'hk_wishingtree', kind:'공원·정원', indoor:false, name:'람췬 소원나무', ja:'林村許願樹', addr:'Lam Tsuen Wishing Trees, Fong Ma Po Village, Tai Po, Hong Kong', mapq:'Lam Tsuen Wishing Trees, Hong Kong', area:'ntcentral', lat:22.4560, lng:114.1425, hours:1, tags:['문화·역사','체험'], kid:'all', note:'소원을 적어 거는 마을 명소이고 틴하우 사원이 가까워요. MTR 타이포마켓역 A3 출구에서 64K 버스를 타고 팡마포에서 내려요.'},
  {id:'hk_saikung', kind:'거리·시장', indoor:false, name:'사이쿵 타운', ja:'西貢', addr:'Sai Kung Public Pier, Sai Kung, Hong Kong', mapq:'西貢', area:'ntcentral', lat:22.3814, lng:114.2733, hours:3, tags:['맛집','자연·산책'], kid:'all', note:'항구 앞에 해산물 식당이 모인 바닷가 마을이에요. MTR이 닿지 않아요. 초이홍역 C2 출구 쪽에서 1A 미니버스를 타요. 초이홍역에서 92번 버스도 가요. 부두 배에서 해산물을 사서 식당에 맡기는 방식은 흥정이 어려우니 값을 먼저 물어보세요.'},
  {id:'hk_pingshan', kind:'신사·절', indoor:false, name:'핑산 헤리티지 트레일', ja:'屏山文物徑', addr:'Ping Shan Heritage Trail, Ping Shan, Yuen Long, Hong Kong', area:'ntwest', lat:22.4488, lng:114.0062, hours:2, tags:['문화·역사','자연·산책'], kid:'all', note:'옛 탑과 사당, 마을을 따라 걷는 평지 산책길이에요. MTR 틴수이와이역 E3 출구 가까이에서 시작해요. 취성루 탑은 낮 1~2시와 화요일에 닫는다는 안내가 있어 그 시간은 피하세요.'},
  {id:'hk_cheungchau', kind:'거리·시장', indoor:false, name:'청차우섬', ja:'長洲', addr:'Cheung Chau Ferry Pier, Praya Street, Cheung Chau, Hong Kong', area:'islands', lat:22.2081, lng:114.0283, hours:4, tags:['자연·산책','맛집'], kid:'all', note:'골목을 걸으며 해산물을 먹기 좋은 작은 섬이에요. 센트럴 5번 부두에서 Sun Ferry 배로 가요. 2026년 4월 기준 어른 편도 일반선 HK$16.7, 고속선 HK$32.9예요. 시간표는 가기 전에 확인하세요. 어묵과 찹쌀 간식은 오후 3시쯤 떨어질 수 있어요. 팍타이 사원, 동완 해변, 바닷가 바위 산책길(미니 만리장성)이 있어요. 차가 없어요. 청포차이 동굴은 어두워서 휴대폰 불빛이 필요해요.'},
  {id:'hk_taiyuen', kind:'거리·시장', indoor:false, name:'타이윤 거리 (장난감 시장)', ja:'太原街', addr:'Tai Yuen Street, Wan Chai, Hong Kong', area:'cwb', lat:22.2761, lng:114.1732, hours:0.5, tags:['쇼핑'], kid:'kids', note:'장난감·문구 노점이 줄지어 있는 완차이 골목이에요. 피규어와 옛날 장난감을 구경하기 좋아요. 완차이역에서 가깝고 2층 트램 길과 이어져요. 노점 시간은 정해져 있지 않으니 낮에 가세요.'},
  {id:'hk_centralplaza', kind:'전망대', indoor:true, name:'센트럴 플라자 46층 스카이 로비', ja:'Central Plaza 中環廣場', addr:'Central Plaza, 18 Harbour Road, Wan Chai, Hong Kong', area:'cwb', lat:22.2801, lng:114.1735, hours:0.5, tags:['관광명소'], kid:'all', note:'입장료 없이 46층 사무실 로비 창으로 완차이와 항구를 내려다봐요. 평일 업무 시간에만 올라갈 수 있어요. 로비에서 위층으로 올라가 46층 직행 엘리베이터를 타요. 관광 시설이 아니라서 그날 되는지 건물 안내 데스크에 물어보세요.'},
  {id:'hk_tamar', kind:'공원·정원', indoor:false, name:'타마르 공원', ja:'Tamar Park 添馬公園', addr:'Tamar Park, Harcourt Road, Admiralty, Hong Kong', area:'central', lat:22.2813, lng:114.1655, hours:0.75, tags:['자연·산책'], kid:'all', note:'정부 청사 앞 바닷가 잔디 공원이에요. 무료이고 MTR 애드미럴티역에서 걸어가요. 저녁에 항구 불빛을 보며 쉬기 좋아요.'},
  {id:'hk_sunyatsen', kind:'박물관·미술관', indoor:true, name:'쑨원 기념관', ja:'Dr Sun Yat-sen Museum 孫中山紀念館', addr:'Dr Sun Yat-sen Museum, 7 Castle Road, Mid-Levels, Hong Kong', area:'central', lat:22.2820, lng:114.1510, hours:1, tags:['문화·역사'], kid:'teen', note:'쑨원의 삶을 보여 주는 옛 서양식 저택 박물관이에요. 고쳐서 2025년 11월에 다시 열었어요. 목요일에 쉰다는 안내가 많고, 평일 10~18시·주말 10~19시쯤이에요. 입장료는 전시마다 달라요. 가기 전에 확인하세요.'},
  {id:'hk_citygallery', kind:'박물관·미술관', indoor:true, name:'시티 갤러리', ja:'City Gallery 展城館', addr:'City Gallery, 3 Edinburgh Place, Central, Hong Kong', area:'central', lat:22.2826, lng:114.1622, hours:1, tags:['문화·역사','체험'], kid:'kids', note:'홍콩 도시 계획을 모형과 체험 전시로 보여 줘요. 무료예요. 화요일 휴관 안내가 있어요(2018년 정부 자료라 가기 전에 확인하세요). 시티홀·해사박물관과 가까워요.'},
  {id:'hk_heritagecentre', kind:'박물관·미술관', indoor:true, name:'홍콩 헤리티지 디스커버리 센터', ja:'香港文物探知館', addr:'Hong Kong Heritage Discovery Centre, Kowloon Park, Haiphong Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2993, lng:114.1698, hours:1, tags:['문화·역사'], kid:'all', note:'구룡공원 안 옛 병영 건물 전시관이에요. 무료예요. 목요일에 쉰다는 안내가 있고, 평일 10~18시·주말 10~19시쯤이에요.'},
  {id:'hk_murray', kind:'거리·시장', indoor:'part', name:'머레이 하우스·블레이크 부두', ja:'Murray House 美利樓', addr:'Murray House, 96 Stanley Main Street, Stanley, Hong Kong', area:'south', lat:22.2181, lng:114.2098, hours:0.5, tags:['문화·역사','자연·산책'], kid:'all', note:'센트럴에 있던 옛 건물을 스탠리 바닷가로 옮겨 다시 세운 곳이에요. 안에 식당이 있고 앞이 옛 부두를 옮겨 온 블레이크 부두예요. 스탠리 마켓과 걸어서 이어져요.'},
  {id:'hk_horizon', kind:'쇼핑', indoor:true, name:'호라이즌 플라자', ja:'Horizon Plaza 新海怡廣場', addr:'Horizon Plaza, 2 Lee Wing Street, Ap Lei Chau, Hong Kong', area:'south', lat:22.2390, lng:114.1526, hours:1.5, tags:['쇼핑'], kid:'adult', note:'압레이차우 공장 건물 층마다 가구·생활용품 아웃렛이 들어 있어요. 가게 대부분 오전 10시~오후 7시예요. MTR 사우스 호라이즌스역에서 조금 멀어서 택시나 셔틀을 알아보고 가세요.'},
  {id:'hk_lamma', kind:'공원·정원', indoor:false, name:'람마섬', ja:'Lamma Island 南丫島', addr:'Yung Shue Wan Ferry Pier, Lamma Island, Hong Kong', mapq:'용수완 페리 부두', area:'islands', lat:22.2256, lng:114.1117, hours:4, tags:['자연·산책'], kid:'teen', note:'차가 없는 섬이에요. 센트럴 4번 부두에서 배로 융슈완에 내려 소쿠완까지 1시간 반쯤 걷고, 소쿠완에서 배로 돌아오는 코스가 많아요. 배 시간표는 가기 전에 확인하세요.'},
  {id:'hk_catstreet', kind:'거리·시장', indoor:false, name:'캣 스트리트 (골동품 거리)', ja:'Upper Lascar Row 摩羅上街', addr:'Upper Lascar Row, Sheung Wan, Hong Kong', area:'central', lat:22.2848, lng:114.1497, hours:0.5, tags:['쇼핑','문화·역사'], kid:'all', note:'옛 물건과 소품을 파는 작은 골목이에요. 만모 사원 바로 아래에 있어요. 오전 늦게 열고 저녁 6시쯤 닫아요. 오래돼 보여도 진짜가 아닌 물건이 많으니 비싼 것은 사지 마세요.'},
  {id:'hk_jccac', kind:'체험·캐릭터', indoor:true, name:'JCCAC 예술 공방 건물', ja:'JCCAC 賽馬會創意藝術中心', addr:'Jockey Club Creative Arts Centre, 30 Pak Tin Street, Shek Kip Mei, Hong Kong', area:'mongkok', lat:22.3348, lng:114.1656, hours:1, tags:['문화·역사','체험'], kid:'teen', note:'옛 공장 건물을 고친 작가 공방 건물이에요. 구경은 무료이고 작은 전시·가게가 있어요. 공방마다 여는 시간이 달라요. 삼수이포 압리우 거리와 묶기 좋아요.'},
  {id:'hk_fukwing', kind:'거리·시장', indoor:false, name:'푹윙 거리 (장난감 도매 거리)', ja:'福榮街', addr:'Fuk Wing Street, Sham Shui Po, Hong Kong', area:'mongkok', lat:22.3292, lng:114.1660, hours:0.5, tags:['쇼핑'], kid:'kids', note:'삼수이포역 가까이에 장난감·파티 소품 도매 가게가 모인 길이에요. 낮에 가세요. 팀호완 삼수이포점이 이 길에 있어요.'},
  {id:'hk_wkartpark', kind:'공원·정원', indoor:false, name:'서구룡 아트 파크', ja:'Art Park 藝術公園', addr:'Art Park, 18 Museum Drive, West Kowloon Cultural District, Hong Kong', area:'tst', lat:22.3000, lng:114.1565, hours:1, tags:['자연·산책'], kid:'all', note:'M+ 박물관 앞으로 이어지는 넓은 바닷가 잔디 공원이에요. 무료이고 항구 건너 홍콩섬 야경이 잘 보여요. 아이가 뛰어놀기 좋아요.'},
  {id:'hk_dragonsback', kind:'공원·정원', indoor:false, name:'드래곤스 백 등산로', ja:'Dragon\'s Back 龍脊', addr:'Dragon\'s Back, Shek O, Hong Kong', area:'south', lat:22.2375, lng:114.2428, hours:3, tags:['자연·산책'], kid:'teen', note:'능선을 따라 바다를 보며 걷는 코스예요. MTR 사우케이완역 앞에서 9번 버스를 타고 토테이완에서 내려 시작해요. 능선까지만 갔다 돌아와도 2시간쯤 걸려요. 초등 고학년이면 걸을 수 있지만 오르막이 있고 길에서 물을 살 수 없어요. 물과 편한 신발을 챙기세요.'},
  {id:'hk_shanghaist', kind:'거리·시장', indoor:false, name:'상하이 거리 (주방용품 골목)', ja:'上海街', addr:'Shanghai Street, Yau Ma Tei, Hong Kong', area:'mongkok', lat:22.3092, lng:114.1701, hours:0.5, tags:['쇼핑','문화·역사'], kid:'all', note:'대나무 찜통과 칼, 그릇 가게가 모인 오래된 거리예요. 딤섬 찜통을 기념품으로 사기 좋아요. 점심 뒤에 가게가 많이 열어요. 같은 동네의 옥 시장(玉器小販市場)은 옮겼다는 안내가 있으니 구글 지도로 위치를 확인하세요. 옥은 모조품이 많아요.'},
  {id:'hk_statue', kind:'공원·정원', indoor:false, name:'황후상 광장·HSBC 빌딩', ja:'Statue Square 皇后像廣場', addr:'Statue Square, Chater Road, Central, Hong Kong', mapq:'Statue Square, Hong Kong', area:'central', lat:22.2812, lng:114.1599, hours:0.5, tags:['문화·역사'], kid:'all', note:'옛 입법부 건물과 HSBC 본점이 둘러싼 센트럴 중심 광장이에요. HSBC 건물 앞 사자상과 뚫린 1층을 구경해요. 일요일엔 사람이 많이 모여요.'},
  {id:'hk_pottinger', kind:'거리·시장', indoor:false, name:'포팅어 거리', ja:'砵典乍街 Pottinger Street', addr:'Pottinger Street, Central, Hong Kong', area:'central', lat:22.2833, lng:114.1559, hours:0.25, tags:['쇼핑','문화·역사'], kid:'all', note:'돌계단 골목 양옆에 소품 가게가 늘어서 있어요. 미드레벨 에스컬레이터와 가까워 소호 구경길에 지나가요.'},
  {id:'hk_kennedy', kind:'공원·정원', indoor:false, name:'케네디타운 바닷가', ja:'Kennedy Town 堅尼地城', addr:'Kennedy Town Praya, Kennedy Town, Hong Kong', area:'central', lat:22.2812, lng:114.1267, hours:1, tags:['자연·산책'], kid:'all', note:'홍콩섬 서쪽 끝 MTR·트램 종점 동네예요. 바닷가 산책로에서 보는 노을이 좋아요. 트램을 타고 끝까지 와서 카페에 들르기 좋아요. 포브스 거리에는 돌담에 뿌리내린 큰 나무들이 있어요.'},
  {id:'hk_whampoa', kind:'쇼핑', indoor:true, name:'더 황푸 (배 모양 쇼핑몰)', ja:'The Whampoa 黃埔天地', addr:'The Whampoa, 5 Shung King Street, Hung Hom, Hong Kong', area:'tst', lat:22.3046, lng:114.1891, hours:1, tags:['쇼핑'], kid:'kids', note:'커다란 배 모양 건물이 있는 쇼핑몰이에요. MTR 웡포아역과 이어져요.'},
  {id:'hk_clocktower', kind:'야경·일루미네이션', indoor:false, name:'시계탑·문화센터 앞', ja:'Clock Tower 尖沙咀鐘樓', addr:'Former Kowloon-Canton Railway Clock Tower, Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2936, lng:114.1695, hours:0.25, tags:['관광명소','문화·역사'], kid:'all', note:'옛 기차역에 있던 시계탑이에요. 스타페리 부두 바로 옆이고 항구 사진을 찍기 좋은 곳이에요.'},
  {id:'hk_peninsula', kind:'쇼핑', indoor:true, name:'페닌슐라 호텔', ja:'The Peninsula 半島酒店', addr:'The Peninsula Hong Kong, Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2952, lng:114.1717, hours:0.5, tags:['관광명소','문화·역사'], kid:'adult', note:'1928년에 연 호텔이에요. 건물과 로비 구경만 해도 좋고, 로비 애프터눈 티로 유명해요.'},
  {id:'hk_aqualuna', kind:'체험·캐릭터', indoor:false, name:'아쿠아루나 (붉은 돛 유람선)', ja:'AquaLuna 張保仔', addr:'Aqua Luna, Tsim Sha Tsui Public Pier, Salisbury Road, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2935, lng:114.1690, hours:1, tags:['체험'], kid:'all', note:'붉은 돛을 단 옛 모양 배로 저녁 항구를 45분쯤 도는 유람선이에요. 침사추이 1번 부두나 센트럴 9번 부두에서 타요. 저녁 배가 어른 HK$195~270쯤이고 4~11살은 어린이 요금이에요. 시간과 요금은 공식 예약 쪽에서 확인하세요.'},
  {id:'hk_oceanterminal', kind:'전망대', indoor:false, name:'오션 터미널 데크', ja:'Ocean Terminal Deck 海運觀點', addr:'Ocean Terminal Deck, Harbour City, Tsim Sha Tsui, Hong Kong', area:'tst', lat:22.2946, lng:114.1652, hours:0.5, tags:['관광명소'], kid:'all', note:'하버시티 오션 터미널 맨 끝의 무료 전망 데크예요. 항구를 270도로 볼 수 있어요. 해 질 녘에 좋아요. 쇼핑몰 여는 시간 안에 가세요.'},
  {id:'hk_newtown', kind:'쇼핑', indoor:true, name:'뉴타운 플라자 (사틴)', ja:'New Town Plaza 新城市廣場', addr:'New Town Plaza, 18 Sha Tin Centre Street, Sha Tin, Hong Kong', area:'ntcentral', lat:22.3816, lng:114.1883, hours:1.5, tags:['쇼핑'], kid:'kids', note:'사틴역과 이어진 큰 쇼핑몰이에요. 만불사·체쿵 사원 다녀오며 밥 먹기 좋아요. 3층 스누피 월드는 지금 운영하는지 확실하지 않으니 가서 확인하세요.'},
  {id:'hk_monster', kind:'거리·시장', indoor:false, name:'몬스터 빌딩 (익청 빌딩)', ja:'Monster Building 怪獸大廈', addr:'Yick Cheong Building, 1046 King\'s Road, Quarry Bay, Hong Kong', area:'cwb', lat:22.2841, lng:114.2123, hours:0.5, tags:['관광명소'], kid:'teen', note:'다닥다닥 붙은 아파트가 하늘을 가리는 건물이에요. 지금도 주민이 살아서 조용히 봐야 해요. 안뜰 촬영을 막거나 허락을 받으라는 안내가 있으니 현장 안내판을 따르세요. MTR 쿼리베이역에서 걸어서 10분쯤이에요.'},
  {id:'hk_heritagemuseum', kind:'박물관·미술관', indoor:true, name:'홍콩 문화 박물관 (사틴)', ja:'香港文化博物館', addr:'Hong Kong Heritage Museum, 1 Man Lam Road, Sha Tin, Hong Kong', area:'ntcentral', lat:22.3774, lng:114.1854, hours:1.5, tags:['문화·역사'], kid:'all', note:'신계 생활과 광둥 오페라, 대중문화 전시가 있는 큰 박물관이에요. 체쿵 사원과 가까워 사틴 코스에 넣기 좋아요. 쉬는 날과 입장료는 공식 누리집에서 확인하세요.'},
  {id:'hk_sino', kind:'쇼핑', indoor:true, name:'시노 센터 (피규어·애니 상가)', ja:'信和中心', addr:'Sino Centre, 582-592 Nathan Road, Mong Kok, Hong Kong', area:'mongkok', lat:22.3161, lng:114.1703, hours:1, tags:['쇼핑'], kid:'teen', note:'피규어·건담 모형·캐릭터 상품 가게가 층마다 모인 상가예요. 초등 고학년·10대가 좋아할 만한 곳이에요. 가게 대부분 오전 늦게 열고 저녁 일찍 닫을 수 있어 낮에 가세요. 모형 총은 한국에 가져올 수 없어요.'},
  {id:'hk_centrallibrary', kind:'박물관·미술관', indoor:true, name:'홍콩 중앙도서관', ja:'香港中央圖書館', addr:'Hong Kong Central Library, 66 Causeway Road, Causeway Bay, Hong Kong', area:'cwb', lat:22.2799, lng:114.1896, hours:0.5, tags:['문화·역사'], kid:'all', note:'빅토리아 공원 맞은편의 큰 공공도서관이에요. 무료로 들어가고 창밖으로 공원이 보여요. 비 오는 날 쉬어 가기 좋아요.'},
  {id:'hk_muiwo', kind:'공원·정원', indoor:false, name:'무이워', ja:'Mui Wo 梅窩', addr:'Mui Wo Ferry Pier, Lantau Island, Hong Kong', mapq:'Mui Wo 梅窩', area:'tungchung', lat:22.2645, lng:114.0013, hours:3, tags:['자연·산책'], kid:'all', note:'책 기준: 란타우 동쪽 바닷가 마을이에요. 센트럴 6번 부두에서 배로 가요. 자전거를 빌려 해변을 돌기 좋아요.'},
  {id:'hk_cheungsha', kind:'공원·정원', indoor:false, name:'청샤 해변', ja:'Cheung Sha Beach 長沙泳灘', addr:'Lower Cheung Sha Beach, South Lantau Road, Lantau Island, Hong Kong', area:'tungchung', lat:22.2335, lng:113.9569, hours:1.5, tags:['자연·산책'], kid:'all', note:'책 기준: 란타우 남쪽의 긴 모래 해변이에요. 겨울엔 수영보다 산책하기 좋아요. 옹핑이나 무이워에서 버스로 들를 수 있어요.'},
  {id:'hk_discobay', kind:'공원·정원', indoor:false, name:'디스커버리 베이', ja:'Discovery Bay 愉景灣', addr:'Discovery Bay Plaza, Lantau Island, Hong Kong', mapq:'Discovery Bay 愉景灣', area:'tungchung', lat:22.2994, lng:114.0146, hours:2.5, tags:['자연·산책'], kid:'kids', note:'책 기준: 인공 해변과 식당가가 있는 란타우 동쪽 주택가예요. 센트럴에서 배로 가요. 평일이 한적해요.'},
  {id:'hk_pengchau', kind:'공원·정원', indoor:false, name:'펑차우섬', ja:'Peng Chau 坪洲', addr:'Peng Chau Ferry Pier, Peng Chau, Hong Kong', area:'islands', lat:22.2859, lng:114.0443, hours:2.5, tags:['자연·산책'], kid:'all', note:'책 기준: 차 없는 작은 섬이에요. 틴하우 사원과 작은 산책로가 있어요. 센트럴 6번 부두에서 배로 가요.'},
  {id:'hk_hku', kind:'거리·시장', indoor:false, name:'홍콩대학 본관', ja:'University of Hong Kong 香港大學', addr:'Main Building, University of Hong Kong, Pok Fu Lam Road, Hong Kong', area:'central', lat:22.2842, lng:114.1378, hours:0.75, tags:['문화·역사'], kid:'all', note:'책 기준: 100년 넘은 붉은 벽돌 본관을 볼 수 있어요. MTR HKU역에서 가요. 수업 중인 곳이니 조용히 구경하세요.'},
  {id:'hk_stjohn', kind:'거리·시장', indoor:'part', name:'성 요한 성당', ja:"St John's Cathedral 聖約翰座堂", addr:'St. John\'s Cathedral, 4-8 Garden Road, Central, Hong Kong', area:'central', lat:22.2796, lng:114.1598, hours:0.25, tags:['문화·역사'], kid:'all', note:'책 기준: 영국 식민지 시절에 지은 오래된 성공회 성당이에요. 홍콩 공원으로 올라가는 길에 들르기 좋아요. 좌표는 어림값이에요.'},
  {id:'hk_oldpost', kind:'거리·시장', indoor:false, name:'옛 완차이 우체국', ja:'舊灣仔郵政局', addr:'Old Wan Chai Post Office, 221 Queen\'s Road East, Wan Chai, Hong Kong', area:'cwb', lat:22.2753, lng:114.1737, hours:0.25, tags:['문화·역사'], kid:'all', note:'책 기준: 홍콩에서 가장 오래된 우체국 건물 가운데 하나예요. 지금은 안내 시설로 쓰여요. 좌표는 어림값이에요.'},
  {id:'hk_hungshing', kind:'신사·절', indoor:true, name:'훙싱 사원 (완차이)', ja:'洪聖廟', addr:'Hung Shing Temple, 129-131 Queen\'s Road East, Wan Chai, Hong Kong', area:'cwb', lat:22.2754, lng:114.1708, hours:0.25, tags:['문화·역사'], kid:'all', note:'책 기준: 바닷가였던 시절의 흔적이 남은 작은 사원이에요. 퀸스로드 이스트에 있어요.'},
  {id:'hk_stanley', kind:'거리·시장', indoor:'part', name:'스탠리 마켓', ja:'赤柱市集', addr:'Stanley Market, Stanley New Street, Stanley, Hong Kong', area:'south', lat:22.2183, lng:114.2125, hours:1.5, tags:['쇼핑','자연·산책'], kid:'all', note:'바닷가 마을 시장이에요. 기념품 가게와 바닷가 산책로가 있어요. 상점은 오전 10~11시쯤 열어요. 평일은 한산하고 주말이 북적여요. 돌아가는 버스 정류장은 내린 곳과 다를 수 있으니 확인하세요. 둘러볼 곳으로 틴하우 사원, 세인트 스티븐 해변, 스탠리 군인 묘지가 있어요.'},
  {id:'hk_aberdeen', kind:'체험·캐릭터', indoor:false, name:'애버딘 삼판선', ja:'香港仔海濱公園', addr:'Aberdeen Promenade, Aberdeen Praya Road, Aberdeen, Hong Kong', area:'south', lat:22.2473, lng:114.1543, hours:1, tags:['체험','문화·역사'], kid:'all', note:'작은 배(삼판선)를 타고 수상 마을이 있던 항구를 한 바퀴 돌아요. 배를 타지 않아도 바닷가 산책로(애버딘 프로머네이드)를 걸을 수 있어요.'},

  // 선전 · 화창베이
  {id:'sz_huaqiangbei', kind:'거리·시장', indoor:'part', name:'화창베이 전자상가 거리', ja:'华强北商业街', addr:'华强北商业街, 深圳市福田区华强北路', gid:'ChIJfUACIzf0AzQR-OkaJLdm0Uk', area:'huaqiang', lat:22.5440, lng:114.0804, hours:2, anchor:true, tags:['쇼핑','체험'], kid:'teen', note:'세계 전자제품 부품이 모이는 거리예요. 드론·로봇·휴대폰 액세서리 가게가 빌딩마다 가득해요.'},
  {id:'sz_seg', kind:'쇼핑', indoor:true, name:'SEG 전자시장', ja:'赛格电子市场', addr:'SEG Plaza, Huaqiangbei, Shenzhen', area:'huaqiang', lat:22.5436, lng:114.0811, hours:1.5, tags:['쇼핑','체험'], kid:'teen', note:'1~10층이 전자부품 가게예요. 부품을 사서 직접 만드는 사람들이 찾는 곳이에요.'},
  {id:'sz_hqbmuseum', kind:'박물관·미술관', indoor:true, name:'화창베이 박물관', ja:'华强北博物馆', addr:'华强北博物馆, 深圳市福田区深南中路3006号', area:'huaqiang', lat:22.5466, lng:114.0821, hours:1, tags:['체험','문화·역사'], kid:'teen', closed:[1], note:'화창베이가 전자상가 거리로 자라 온 이야기와 옛 전자제품을 보여 줘요. 광보 현대지창 빌딩 5층이에요. 무료지만 위챗 미니프로그램 실명 예약을 받아요(여권으로 되는지 미리 확인하세요). 화~일 오전 10시~오후 6시, 월요일 휴관.'},
  // 선전 · 푸톈 CBD
  {id:'sz_pingan', kind:'전망대', indoor:true, name:'평안금융센터 전망대 (Free Sky)', ja:'平安金融中心 云际观光层', addr:'平安金融中心, 深圳市福田区益田路5033号', mapq:'Ping An Finance Centre, Shenzhen', area:'futian', lat:22.5364, lng:114.0504, hours:1.5, anchor:true, tags:['관광명소'], kid:'all', note:'599m 빌딩 116층 실내 전망대예요. 선전 빌딩숲이 한눈에 보여요. 표 살 때 여권을 챙기세요.'},
  {id:'sz_lianhuashan', kind:'공원·정원', indoor:false, name:'롄화산 공원', ja:'莲花山公园', addr:'莲花山公园, 深圳市福田区红荔路6030号', mapq:'Lianhuashan Park, Shenzhen', area:'futian', lat:22.5562, lng:114.0539, hours:1.5, tags:['자연·산책','문화·역사'], kid:'all', note:'언덕 위 덩샤오핑 동상 앞에서 푸톈 CBD가 내려다보여요.'},
  {id:'sz_civic', kind:'야경·일루미네이션', indoor:false, name:'푸톈 CBD 빌딩 조명 쇼', ja:'市民中心 灯光秀', addr:'深圳市民中心, 深圳市福田区福中三路', mapq:'市民中心 灯光秀', area:'futian', lat:22.5467, lng:114.0544, hours:0.5, tags:['관광명소'], kid:'all', closed:[0,1,2,3,4], note:'시민센터 앞에서 빌딩 수십 채가 함께 빛나는 조명 쇼를 봐요. 금·토요일과 중국 공휴일(그 전날 포함) 밤에만 해요. 11~3월엔 저녁 7시·8시·9시에 15분쯤씩 해요. 시민광장에서 보려면 위챗 미니프로그램 예약이 필요하고, 롄화산 꼭대기에선 예약 없이 봐요. 점검으로 멈췄다가 2026년 10월 1일에 다시 시작했어요.'},
  {id:'sz_museum', kind:'박물관·미술관', indoor:true, name:'선전 박물관', ja:'深圳博物馆', addr:'深圳博物馆, 深圳市福田区福中路市民中心A区', mapq:'深圳博物馆历史民俗馆', area:'futian', lat:22.5440, lng:114.0575, hours:1.5, tags:['문화·역사'], kid:'all', closed:[1], note:'작은 어촌이던 선전이 40여 년 만에 큰 도시가 된 이야기를 보여 줘요. 시민센터 동쪽 건물(진톈루관)이에요. 월요일 휴관(공휴일은 열어요), 오전 10시~오후 6시예요.'},
  {id:'sz_mocape', kind:'박물관·미술관', indoor:true, name:'선전 현대미술·도시계획관', ja:'深圳市当代艺术与城市规划馆', addr:'深圳市当代艺术与城市规划馆, 深圳市福田区福中路184号', area:'futian', lat:22.5486, lng:114.0567, hours:1.5, tags:['문화·역사'], kid:'all', closed:[1], note:'선전의 도시 계획과 현대 미술 전시를 한 건물에서 해요. 구름 같은 지붕 건물이 멋져요. 월요일 휴관(공휴일은 열어요).'},
  // 선전 · 화교성(OCT)
  {id:'sz_window', kind:'테마파크', indoor:false, name:'세계의 창', ja:'世界之窗', addr:'世界之窗, 深圳市南山区深南大道9037号', gid:'ChIJ____7_PxAzQRBuBr2pNmuIU', area:'oct', lat:22.5375, lng:113.9698, hours:4, anchor:true, tags:['테마파크','관광명소'], kid:'all', note:'에펠탑·피라미드 같은 세계 명소를 줄여 만든 공원이에요. 저녁엔 조명이 켜져요.'},
  {id:'sz_happyvalley', kind:'테마파크', indoor:false, name:'선전 환러구 (해피밸리)', ja:'深圳欢乐谷', addr:'深圳欢乐谷, 深圳市南山区侨城西街18号', mapq:'深圳欢乐谷, Shenzhen', area:'oct', lat:22.5455, lng:113.9756, hours:5, anchor:true, tags:['테마파크'], kid:'teen', note:'롤러코스터가 많은 놀이공원이에요. 10대가 특히 좋아해요.'},
  {id:'sz_splendid', kind:'테마파크', indoor:false, name:'금수중화 민속촌', ja:'锦绣中华民俗村', addr:'锦绣中华民俗村, 深圳市南山区深南大道9003号', area:'oct', lat:22.5330, lng:113.9855, hours:3, tags:['문화·역사','테마파크'], kid:'all', note:'중국 곳곳의 명소를 줄인 모형과 소수민족 마을 공연이 있어요.'},
  {id:'sz_octloft', kind:'거리·시장', indoor:'part', name:'OCT-LOFT 창의문화원', ja:'华侨城创意文化园', addr:'华侨城创意文化园, 深圳市南山区锦绣北街', area:'oct', lat:22.5381, lng:113.9934, hours:1, tags:['문화·역사','쇼핑'], kid:'all', note:'옛 공장 건물을 고친 디자인 가게·카페 거리예요. 차오청둥역에서 걸어가요.'},
  {id:'sz_octharbour', kind:'쇼핑', indoor:'part', name:'OCT 하버', ja:'欢乐海岸', addr:'欢乐海岸, 深圳市南山区滨海大道3001号', mapq:'Happy Mall, Shenzhen', area:'oct', lat:22.5265, lng:113.9831, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'호숫가 쇼핑·식당 거리예요. 저녁 산책하기 좋아요.'},
  {id:'sz_dji', kind:'체험·캐릭터', indoor:true, name:'DJI 플래그십 스토어', ja:'大疆旗舰店 欢乐海岸', addr:'大疆旗舰店, 深圳市南山区欢乐海岸', area:'oct', lat:22.5262, lng:113.9835, hours:1, anchor:true, tags:['체험','쇼핑'], kid:'teen', note:'선전에서 시작한 드론 회사 DJI의 4층짜리 매장이에요. 드론·카메라를 직접 만져 볼 수 있고 바깥 공원은 드론 비행 공간이에요.'},
  // 선전 · 난산·셔커우
  {id:'sz_baypark', kind:'공원·정원', indoor:false, name:'선전베이 공원', ja:'深圳湾公园', addr:'深圳湾公园, 深圳市南山区滨海大道', area:'nanshan', lat:22.5140, lng:113.9640, hours:1.5, tags:['자연·산책'], kid:'all', note:'바닷가를 따라 길게 이어진 공원이에요. 건너편이 홍콩이고 겨울엔 철새가 와요.'},
  {id:'sz_talent', kind:'공원·정원', indoor:false, name:'인재공원', ja:'人才公园', addr:'人才公园, 深圳市南山区科苑南路', area:'nanshan', lat:22.5140, lng:113.9440, hours:1, tags:['자연·산책','관광명소'], kid:'all', note:'호숫가에서 선전베이 빌딩 야경이 보여요. 밤 산책하기 좋아요.'},
  {id:'sz_mixcbay', kind:'쇼핑', indoor:true, name:'선전베이 만상성', ja:'深圳湾万象城', addr:'深圳湾万象城, 深圳市南山区科苑南路2888号', mapq:'深圳灣萬象城, Shenzhen', area:'nanshan', lat:22.5174, lng:113.9400, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'화룬 본사 빌딩 아래 큰 쇼핑몰이에요. 식당이 많아 선전베이 공원·인재공원 다녀오며 밥 먹기 좋아요. 일~목 오전 10시~밤 10시, 금·토는 밤 10시 반까지 열어요.'},
  {id:'sz_safari', kind:'수족관·동물원', indoor:false, name:'선전 야생동물원', ja:'深圳野生动物园', addr:'深圳野生动物园, 深圳市南山区西丽湖路4065号', mapq:'Shenzhen Safari Park', area:'nanshan', lat:22.5999, lng:113.9658, hours:4, anchor:true, tags:['체험','자연·산책'], kid:'all', note:'시리 호수 옆 넓은 언덕에 동물이 풀려 있는 동물원이에요. 걸어서 보는 구역과 차를 타고 도는 맹수 구역, 동물 공연이 있어요. 매일 오전 9시 반~오후 6시(5시 입장 마감)이고, 지하철 7호선 시리후역에서 가까워요. 다른 곳과 떨어져 있어 반나절은 잡으세요.'},
  {id:'sz_huawei', kind:'쇼핑', indoor:true, name:'만상천지 (화웨이 매장)', ja:'深圳万象天地', addr:'深圳万象天地, 深圳市南山区深南大道9668号', area:'nanshan', lat:22.5450, lng:113.9511, hours:1.5, tags:['쇼핑','체험'], kid:'teen', note:'화웨이가 2019년 첫 글로벌 플래그십 매장을 연 쇼핑몰이에요. 둘레가 기술 기업이 모인 난산 과기원이에요. 매장은 매일 오전 10시~밤 10시에 열어요.'},
  {id:'sz_nantou', kind:'거리·시장', indoor:'part', name:'난터우 고성', ja:'南头古城', addr:'南头古城, 深圳市南山区南头街', gid:'ChIJqTL043DuAzQRKzdae9hKRXU', area:'nanshan', lat:22.5409, lng:113.9200, hours:1.5, tags:['문화·역사','맛집'], kid:'all', note:'오래된 성 마을을 고친 골목이에요. 카페와 간식 가게가 많아요.'},
  {id:'sz_seaworld', kind:'거리·시장', indoor:'part', name:'셔커우 해상세계', ja:'海上世界', addr:'海上世界, 深圳市南山区太子路', mapq:'Sea World, Shenzhen', area:'nanshan', lat:22.4863, lng:113.9120, hours:1.5, tags:['관광명소','맛집'], kid:'all', note:'육지에 올라앉은 옛 여객선(밍화호) 둘레에 식당가가 모여 있어요. 걸어서 갈 거리에 디자인 박물관 디자인 소사이어티가 있어요.'},
  {id:'sz_bayglory', kind:'전망대', indoor:'part', name:'만취즈광 대관람차', ja:'湾区之光', addr:'湾区之光摩天轮, 深圳市宝安区欢乐港湾', area:'nanshan', lat:22.5441, lng:113.8830, hours:1, tags:['관광명소'], kid:'all', note:'바오안 바닷가 128m 대관람차예요. 해 질 녘이 좋아요. 다른 곳과 좀 떨어져 있어요.'},
  // 선전 · 뤄후
  {id:'sz_luohucc', kind:'쇼핑', indoor:true, name:'뤄후 상업성', ja:'罗湖商业城', addr:'罗湖商业城, 深圳市罗湖区人民南路', area:'luohu', lat:22.5322, lng:114.1133, hours:1.5, tags:['쇼핑'], kid:'all', note:'국경 바로 위 쇼핑몰이에요. 옷·가방·안마 가게가 많고 흥정이 기본이에요. 상표를 베낀 물건이 많아요. 호객을 따라가지 마세요.'},
  {id:'sz_dongmen', kind:'거리·시장', indoor:'part', name:'둥먼 보행자 거리', ja:'东门步行街', addr:'东门步行街, 深圳市罗湖区东门中路', mapq:'深圳东门步行街', area:'luohu', lat:22.5483, lng:114.1124, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'선전에서 가장 오래된 상점가예요. 지하철 라오제역 A출구에서 가까워요. 상표를 베낀 물건이 많고 흥정이 기본이에요. 값은 여러 곳을 비교하세요.'},
  // 선전 · 룽강
  {id:'sz_dafen', kind:'거리·시장', indoor:'part', name:'다펀 유화마을', ja:'大芬油画村', addr:'大芬油画村, 深圳市龙岗区布吉街道', mapq:'Dafen Oil Painting Village, Shenzhen', area:'longgang', lat:22.6125, lng:114.1365, hours:2, tags:['문화·역사','체험'], kid:'all', note:'화가 작업실 수백 곳이 모인 마을이에요. 유화 그리기 체험을 하는 가게도 있어요.'}
];

// 약도에 그릴 주요 노선. 꼭짓점은 역 위치를 어림한 값이라 약도용이에요(대략값).
// 홍콩 MTR은 공개 자료의 역 좌표로 map.js가 따로 그림(hktransit.js MTR_ROUTES)
// color는 노선 고유색이라 DAY_COLORS처럼 고정값으로 둬요.
export const LINES = [
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

// 여행 기간 행사 (날짜가 정해진 것만). logic.js tripEvents가 여행 날짜와 겹치는 것을 골라 일정 단계에 보여 줘요.
//   id      ev_로 시작   city 'hk' | 'sz'   from·to 'YYYY-MM-DD'(그날 포함)   wd  여는 요일만(없으면 매일)
//   place   관련 장소 id(있으면 '담기' 버튼, 그 장소가 일정에 있는 날 카드에 한 줄)
//   time·where·fee·note  화면 문구   tbc  날짜·시간이 아직 발표 전(from·to는 발표된 달 범위)
// 확인 2026-11-03 (출처는 위 머리 주석의 '여행 주간' 줄). 행사는 바뀌기 쉬우니 화면에 '가기 전에 확인'을 같이 보여 줘요.
export const EVENTS_CHECKED = '2026-11-03';
export const EVENTS = [
  { id:'ev_hkdlxmas', name:'디즈니 크리스마스 (A Disney Christmas)', city:'hk', from:'2026-11-20', to:'2027-01-03', place:'hk_disney',
    time:'파크 여는 시간 동안 · 트리 점등은 저녁', fee:'입장권에 들어 있어요',
    note:'메인 스트리트 크리스마스 트리 점등(드론·눈 효과)과 겨울왕국 구역의 첫 겨울 마켓이 있어요.' },
  { id:'ev_hkdlconcert', name:'디즈니 크리스마스 라이브 콘서트', city:'hk', from:'2026-12-05', to:'2026-12-06', place:'hk_disney',
    time:'성 앞 무대 · 공연 시간은 디즈니 앱에서', fee:'성 앞 좌석은 좌석 패스를 따로 사요(HK$299부터)',
    note:'두 주말만 하는 성 앞 크리스마스 콘서트예요. 12월 6일(일)이 마지막 공연 날이에요.' },
  { id:'ev_winterfest', name:'홍콩 윈터페스트 크리스마스 타운', city:'hk', from:'2026-11-01', to:'2027-01-10', tbc:true,
    where:'센트럴 스테츄 스퀘어 가든 (皇后像廣場花園)', time:'지난해엔 평일 오후 4시~밤 11시 반, 주말 오전 11시부터',
    note:'홍콩 관광청이 해마다 큰 크리스마스 트리와 마켓을 꾸미는 곳이에요. 올해는 2026년 11월~2027년 1월 초라고만 나와 있고 날짜·시간은 아직 발표 전이에요.' },
  { id:'ev_peaklight', name:'피크 타워 빛 영상 쇼', city:'hk', from:'2026-06-13', to:'2027-06-12', place:'hk_peak',
    time:'매일 저녁 7시 반·8시 반·9시 반, 10분쯤', where:'빅토리아 피크 피크 타워',
    note:'2026년 6월부터 1년 동안 해요. 날씨나 계절에 따라 시간이 바뀔 수 있어요.' },
  { id:'ev_clockenflap', name:'클락켄플랩 음악 축제', city:'hk', from:'2026-12-04', to:'2026-12-06',
    where:'센트럴 하버프런트 행사장 (홍콩 관람차 옆)', fee:'표를 따로 사요',
    note:'어른 위주 야외 공연 축제예요. 이 주말엔 센트럴 바닷가와 MTR 센트럴·홍콩역이 붐벼요.' },
  { id:'ev_ijc', name:'국제 기수 대회 (해피밸리 수요일 밤 경마)', city:'hk', from:'2026-12-09', to:'2026-12-09', place:'hk_racecourse',
    time:'저녁 경주', fee:'입장료가 있어요(홍콩자키클럽 누리집)',
    note:'세계 기수들이 겨루는 밤 경주예요. 홍콩 규정상 18세 미만은 경주 날 입장할 수 없어서 아이와는 들어가기 어려워요. 규정이 바뀌었는지 자키클럽 누리집에서 확인하세요.' }
];
