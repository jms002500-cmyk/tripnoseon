// 홍콩·선전 가족 식당 목록 (어른 2·아이 1, 한국인 가족 기준으로 고름). '어디서 먹을지'를 돕는 자료예요.
// 일반 장소(PLACES)와 따로 둬요: 식당을 장소로 넣으면 일정 시간을 잡아먹고 '꼭 갈 곳' 후보처럼 다뤄져서,
// 오늘 하루 화면의 끼니 자리(food.js mealSlots) 근처와 장소 담기 단계의 '동네별 식당'에서만 보여 줘요(js/eats.js).
//
// 칸
//   id      eat_hk_… · eat_sz_… (장소 id와 겹치지 않게)
//   name    한국어 이름 / local: 현지 이름(홍콩 번체, 선전 간체 — 구글·가오더 검색어로 씀)
//   area    AREAS 키 (hksz-data.js)
//   lat,lng 좌표(WGS-84). pos에 어디를 기준으로 맞췄는지
//   kind    EAT_KINDS(js/eats.js) 중 하나
//   indoor  비 오는 날 기준 (장소와 같은 뜻)
//   menu    대표 메뉴
//   price   1인 어림 { cur, lo, hi } (대략값) — 못 찾았으면 null
//   spicy   0 안 매움 | 1 매운 메뉴가 조금 있음
//   kid     아이와 가기 (좌석·분위기)
//   queue   줄 서는 때
//   hours   영업시간 (출처마다 다르면 가장 흔한 값과 '가기 전 확인')
//   closed  쉬는 요일 (0=일 … 6=토) — 출처 두 곳이 같은 요일을 말할 때만
//   note    그 밖에 알아 둘 것
//   src     출처 주소(두 곳 이상) / checked: 확인한 날
//
// 확인 방법 (2026-11-03)
// - 이 작업 환경은 구글 지도·OpenStreetMap·미슐랭 가이드·hk01 등에 직접 접속이 막혀 있어, 웹 검색 결과에 나온 각 누리집 내용으로 확인했어요.
// - 영업 중: 미슐랭 가이드 식당 페이지 또는 2024~2026년 글을 포함해 서로 다른 출처 두 곳 이상에 같은 주소로 나오는 곳만.
// - 좌표: 식당 자체 좌표(Sygic 등)가 있으면 그 값, 없으면 식당이 든 건물·역의 좌표(위키백과·DBpedia·앱에 이미 확인해 둔 장소)를
//   주소에 맞춰 0.3km 안으로 맞췄어요. 선전은 중국 지도 앱 좌표(GCJ-02)를 쓰지 않았어요.
// - 가격은 출처에 나온 값 또는 메뉴 값으로 어림한 대략값이에요(화면에 '대략값'으로 보여 줌).
//
// 넣지 않은 곳 (확실하지 않아서)
//   홍콩 디즈니랜드 호텔 식당(크리스털 로터스 등) — 호텔 전체가 2026-10-12부터 보수 공사로 닫음, 다시 여는 날 미정(SCMP·RTHK)
//   디즈니 익스플로러스 로지·할리우드 호텔 식당 — 2026 운영 시간·좌표를 두 곳에서 못 찾음 (디즈니 날은 파크 안에서 먹는 일이 많음)
//   스위트 다이너스티(糖朝, 침사추이) — 한커우로드 지점은 닫았고 캔턴로드 지점 주소가 출처마다 다름
//   카이카이 디저트(佳佳甜品) — 닝포 거리 본점을 닫고 옮김, 새 주소를 두 곳에서 못 찾음
//   타이오 룩아웃(타이오 헤리티지 호텔) — 영업은 확인했지만 건물 좌표를 못 찾음(마을 좌표와 0.8km 차이)
//   선전 미슐랭 빕구르망(2026 첫 발표 21곳: 卖鱼佬砂锅粥·小龙牛肉面·九九面馆 등) — 대부분 관광지에서 먼 동네 가게라 WGS-84 좌표를 확인할 길이 없음
//   润园四季椰子鸡(코코넛 닭 훠궈) — 브랜드는 여러 출처에 있지만 지점 주소·좌표를 두 곳에서 맞춰 보지 못함
//   点都德 海岸城店·大汤家·鼎Dimlar 등 — 출처가 한 곳(hk01)뿐이거나 건물 좌표를 못 찾음
//   화창베이·룽강(다펀)·디즈니 동네 — 위 기준에 맞는 곳을 못 찾아 비워 둠

const C = '2026-11-03';

export const EATS = [
  // ── 홍콩 · 침사추이 (조던 포함)
  {id:'eat_hk_adc', name:'오스트레일리아 데어리 컴퍼니', local:'澳洲牛奶公司', area:'tst', lat:22.3047, lng:114.1724,
    pos:'주소(조던 파크스 거리 47-49)·조던역 C2 출구 기준', kind:'차찬텡', indoor:true,
    menu:'스크램블 에그 토스트, 우유 푸딩(雙皮奶)', price:{cur:'HKD', lo:50, hi:80}, spicy:0,
    kid:'맵지 않고 아이 입맛에 맞아요. 합석이 기본이고 빨리 먹고 나가는 분위기예요.', queue:'아침·점심에 줄이 길지만 빨리 줄어요.',
    hours:'아침 7시 반쯤~밤 (출처마다 달라요)', note:'목요일에 쉰다는 안내가 있어요. 가기 전에 확인하세요.',
    src:['https://en.wikipedia.org/wiki/Australia_Dairy_Company', 'https://www.discoverhongkong.com/in/interactive-map/australia-dairy-company.html', 'https://dairynews.today/news/australia-dairy-company-closes-for-black-rainstorm-prioritizing-employee-safety.html'], checked:C},
  {id:'eat_hk_mammy', name:'마미 팬케이크 (에그와플)', local:'媽咪雞蛋仔', area:'tst', lat:22.2968, lng:114.1733,
    pos:'주소(카나번로드 8-12)·침사추이역 기준', kind:'디저트', indoor:'part',
    menu:'홍콩식 에그와플(雞蛋仔) — 기본·초콜릿·참깨 맛', price:{cur:'HKD', lo:30, hi:45}, spicy:0,
    kid:'들고 다니며 먹는 간식이라 아이가 좋아해요. 앉을 자리는 거의 없어요.', queue:'저녁에 잠깐 줄 서요.',
    hours:'오전 11시~밤 11시쯤', note:'미슐랭 길거리 음식으로 여러 해 뽑힌 가게예요.',
    src:['https://www.klook.com/activity/6252-mammy-pancake-hong-kong/', 'https://www.tatlerasia.com/dining/digest/best-egg-waffles-hong-kong', 'https://www.burpple.com/mammy-pancake-812-carnarvon-road/reviews'], checked:C},
  {id:'eat_hk_dtf', name:'딘타이펑 (실버코드)', local:'鼎泰豐 新港中心', area:'tst', lat:22.2966, lng:114.1691,
    pos:'실버코드 건물(캔턴로드 30) 위키백과 위치', kind:'딤섬', indoor:true,
    menu:'샤오룽바오, 새우 볶음밥, 우육면', price:{cur:'HKD', lo:150, hi:250}, spicy:0,
    kid:'미슐랭이 가족 친화로 표시한 곳이에요. 아이 의자가 있고 한국 사람 입맛에도 무난해요.', queue:'주말 점심·저녁엔 기다려요. 식당에 직접 예약할 수 있어요.',
    hours:'오전 11시 반~밤 10시 반쯤', note:'하버시티 바로 건너편 쇼핑몰 3층이에요.',
    src:['https://guide.michelin.com/en/hong-kong-region/hong-kong/restaurant/din-tai-fung-silvercord', 'https://www.timeout.com/hong-kong/restaurants/din-tai-fung-tsim-sha-tsui', 'https://en.wikipedia.org/wiki/Silvercord'], checked:C},
  {id:'eat_hk_jade', name:'제이드 가든 (스타하우스)', local:'翠園 星光行', area:'tst', lat:22.2951, lng:114.1689,
    pos:'스타하우스(솔즈베리로드 3)·스타페리 부두 건너편', kind:'딤섬', indoor:true,
    menu:'하가우(새우 딤섬), 시우마이, 차슈바오', price:{cur:'HKD', lo:150, hi:250}, spicy:0,
    kid:'넓은 홀에 둥근 식탁이라 가족끼리 앉기 좋아요. 창가에서 항구·시계탑이 보여요.', queue:'주말 점심이 붐벼요. 전화(2730 6888)로 예약하면 편해요.',
    hours:'점심 딤섬·저녁 (가기 전 확인)', note:'맥심 그룹의 광둥요리 식당이에요. 스타페리 타기 전후에 들르기 좋아요.',
    src:['https://www.discoverhongkong.com/uk/plan/qts/restaurants-results/restaurants-details.id2405.翠園.html', 'https://www.klook.com/activity/122089-jade-garen-tsim-sha-tsui/', 'https://burpple.com/f/EvBa4WLK'], checked:C},

  // ── 홍콩 · 몽콕·야우마테이 (프린스에드워드·삼수이포 포함)
  {id:'eat_hk_mido', name:'미도 카페', local:'美都餐室', area:'mongkok', lat:22.3101, lng:114.1705,
    pos:'Sygic 좌표(22.3102, 114.1704)·주소(템플 스트리트 63)', kind:'차찬텡', indoor:true,
    menu:'돼지갈비 그라탱 밥(焗豬扒飯), 밀크티, 프렌치토스트', price:{cur:'HKD', lo:60, hi:100}, spicy:0,
    kid:'1950년대 타일·창문이 그대로인 2층 자리가 볼거리예요. 맵지 않아요.', queue:'점심때 잠깐 기다려요.',
    hours:'아침 8시 반~저녁 (출처마다 달라요)', note:'현금만 받는다는 안내가 있어요. 수요일에 쉰다는 안내도 있어 가기 전에 확인하세요. 템플 스트리트 야시장 바로 옆이에요.',
    src:['https://en.wikipedia.org/wiki/Mido_Cafe', 'https://www.discoverhongkong.com/ca/interactive-map/mido-cafe.html', 'https://travel.sygic.com/en/poi/mido-cafe-poi:45166', 'https://www.timeout.com/hong-kong/restaurants/mido-cafe'], checked:C},
  {id:'eat_hk_onedimsum', name:'원 딤섬', local:'一點心', area:'mongkok', lat:22.3238, lng:114.1703,
    pos:'주소(퉁초이 거리 209A, 플레잉필드로드 모퉁이)·프린스에드워드역 기준', kind:'딤섬', indoor:true,
    menu:'하가우, 시우마이, 창펀(쌀국수 롤)', price:{cur:'HKD', lo:80, hi:130}, spicy:0,
    kid:'작은 가게라 합석할 때가 많아요. 값이 싸고 금방 나와요.', queue:'주말 아침부터 줄 서요.',
    hours:'평일 오전 10시~자정, 주말 오전 9시~자정쯤', note:'예전에 미슐랭 별을 받았던 동네 딤섬집이에요.',
    src:['https://weave-living.com/en/hk/journal/weaves-favourite-eats-drinks-prince-edward', 'https://www.mongkok.dorsetthotels.com/5-must-try-mongkok-dim-sum-spots.html', 'https://mapstr.com/place/QTRHJGdCCxg'], checked:C},
  {id:'eat_hk_kamwah', name:'깜와 카페 (파인애플 번)', local:'金華冰廳', area:'mongkok', lat:22.3228, lng:114.1711,
    pos:'주소(뷰트 거리 47)·프린스에드워드역·파윤 거리 기준', kind:'차찬텡', indoor:true,
    menu:'버터 파인애플 번(菠蘿油), 에그타르트, 밀크티', price:{cur:'HKD', lo:40, hi:70}, spicy:0,
    kid:'갓 구운 빵이라 아이 간식으로 좋아요. 포장해서 들고 가도 돼요.', queue:'아침 문 열 때부터 줄이 있어요.',
    hours:'매일 아침 6시 반~밤 10시 (2026-07 안내)', note:'스니커 거리·금붕어 시장과 가까워요.',
    src:['https://www.yonder.fr/cityguides/hong-kong/restaurants/kam-wah-cafe', 'https://www.timeout.com/hong-kong/restaurants/kam-wah-cafe', 'https://www.sassymamahk.com/directory/kam-wah-cafe-bakery/'], checked:C},
  {id:'eat_hk_kungwo', name:'궁와 두부 가게', local:'公和荳品廠', area:'mongkok', lat:22.3300, lng:114.1636,
    pos:'주소(삼수이포 페이호 거리 118)·삼수이포역 기준', kind:'디저트', indoor:true,
    menu:'두부 푸딩(豆腐花), 두유, 튀긴 두부', price:{cur:'HKD', lo:20, hi:50}, spicy:0,
    kid:'부드럽고 달아서 아이가 잘 먹어요. 오래된 가게라 자리가 좁아요.', queue:'주말 오후에 잠깐 기다려요.',
    hours:'매일 오전 7시~밤 9시', note:'미슐랭 빕구르망을 받은 곳이에요. 압리우 거리와 가까워요.',
    src:['https://guide.michelin.com/en/hong-kong-region/hong-kong/restaurant/kung-wo-tofu', 'https://eatbook.sg/hong-kong-food-michelin-budget/', 'https://sethlui.com/street-food-guide-hong-kong/'], checked:C},

  // ── 홍콩 · 센트럴·성완
  {id:'eat_hk_maxims', name:'맥심스 팰리스 (시청)', local:'美心皇宮 大會堂', area:'central', lat:22.2822, lng:114.1614,
    pos:'홍콩 시청 저층 건물(에든버러 플레이스 5) 위키백과 위치', kind:'딤섬', indoor:true,
    menu:'수레(카트)로 돌아다니는 딤섬 — 하가우·시우마이·찹쌀밥', price:{cur:'HKD', lo:150, hi:250}, spicy:0,
    kid:'수레에서 직접 골라 먹는 재미가 있고 넓어요. 창밖으로 항구가 보여요.', queue:'점심은 예약을 안 받아서 문 열기 전부터 번호표를 받아요.',
    hours:'딤섬 오전 11시~오후 3시(일·공휴일 오전 9시부터), 저녁 따로', note:'시청 2층이에요. 홍콩 관람차·해사박물관과 가까워요.',
    src:['https://lcsd.gov.hk/en/hkch/facilities/cateringfacilities/cityhallmaximspalace.html', 'https://www.timeout.com/hong-kong/restaurants/city-hall-maxims-palace', 'https://en.wikipedia.org/wiki/Hong_Kong_City_Hall'], checked:C},
  {id:'eat_hk_tsimchai', name:'침차이키 (완탕면)', local:'沾仔記', area:'central', lat:22.2832, lng:114.1547,
    pos:'주소(웰링턴 거리 98)·센트럴 마켓 기준 0.3km 안', kind:'완탕면', indoor:true,
    menu:'새우 완탕면, 어묵·소고기 국수', price:{cur:'HKD', lo:40, hi:70}, spicy:0,
    kid:'국물이 맑고 맵지 않아요. 작은 가게라 합석해요.', queue:'평일 점심(12~2시)에 직장인 줄, 금방 빠져요.',
    hours:'매일 오전 11시~밤 10시쯤', note:'미슐랭 빕구르망 국숫집이에요. 길 건너편이 막스 누들이에요.',
    src:['https://guide.michelin.com/gb/en/hong-kong-region/hong-kong/restaurant/tsim-chai-kee-wellington-street', 'https://danielfooddiary.com/2026/08/31/oldtowncentral/', 'https://www.eatandtravelwithus.com/?p=17194'], checked:C},
  {id:'eat_hk_yatlok', name:'얏록 (거위 구이)', local:'一樂燒鵝', area:'central', lat:22.2823, lng:114.1553,
    pos:'주소(스탠리 거리 34-38)·란콰이퐁 기준 0.3km 안', kind:'로스트', indoor:true,
    menu:'거위 구이 덮밥·국수, 차슈', price:{cur:'HKD', lo:80, hi:150}, spicy:0,
    kid:'맵지 않지만 가게가 좁아 오래 앉아 있기 어려워요. 포장도 돼요.', queue:'오전 11시부터 줄 서요.',
    hours:'오전 10시~밤 8시 반쯤', note:'미슐랭 1스타 거위 구이집이에요. 쉬는 날이 출처마다 달라요(일요일 또는 수요일). 가기 전에 확인하세요.',
    src:['https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurant/yat-lok', 'https://www.timeout.com/hong-kong/restaurants/yat-lok-central', 'https://ordinarypatrons.com/2024/03/28/yat-lok-roast-goose-hong-kong-michelin-star-restaurant/'], checked:C},
  {id:'eat_hk_lanfong', name:'란퐁윤 (밀크티)', local:'蘭芳園', area:'central', lat:22.2835, lng:114.1539,
    pos:'주소(게이지 거리 2)·미드레벨 에스컬레이터 바로 아래', kind:'차찬텡', indoor:'part',
    menu:'홍콩식 밀크티, 돼지고기 번(豬扒包), 라면 볶음', price:{cur:'HKD', lo:50, hi:80}, spicy:0,
    kid:'가게 앞 간이 의자 자리라 짧게 먹고 가기 좋아요.', queue:'아침·점심에 붐벼요.',
    hours:'월~토 오전 7시 반~오후 6시', closed:[0], note:'일요일에 쉬어요. 미드레벨 에스컬레이터 타기 전에 들르기 좋아요.',
    src:['https://www.timeout.com/hong-kong/restaurants/lan-fong-yuen-central', 'https://www.nomss.com/lan-fong-yuen-hong-kong-central-milktea/', 'https://www.misstamchiak.com/lan-fong-yuen/'], checked:C},

  // ── 홍콩 · 코즈웨이베이·완차이
  {id:'eat_hk_hohungkee', name:'호홍키 (완탕면·죽)', local:'何洪記', area:'cwb', lat:22.2798, lng:114.1836,
    pos:'하이산 플레이스 위키백과·Sygic 좌표 (12층 가게)', kind:'완탕면', indoor:true,
    menu:'완탕면, 생선·소고기 죽, 소고기 볶음면(乾炒牛河)', price:{cur:'HKD', lo:100, hi:180}, spicy:0,
    kid:'쇼핑몰 안이라 깨끗하고 자리가 넉넉해요. 죽은 아이도 잘 먹어요.', queue:'점심·저녁에 기다려요. 예약은 거의 안 받아요.',
    hours:'오전 11시 반~밤 11시쯤', note:'미슐랭 1스타 완탕면집이에요. 코즈웨이베이역과 바로 이어져요.',
    src:['https://guide.michelin.com/gb/en/hong-kong-region/hong-kong/restaurant/ho-hung-kee', 'https://www.timeout.com/hong-kong/restaurants/ho-hung-kee', 'https://en.wikipedia.org/wiki/Hysan_Place'], checked:C},
  {id:'eat_hk_kams', name:'깜스 로스트 구스', local:'甘牌燒鵝', area:'cwb', lat:22.2775, lng:114.1722,
    pos:'주소(완차이 헤네시로드 226)·완차이역 기준', kind:'로스트', indoor:true,
    menu:'거위 구이, 차슈, 로스트 덮밥', price:{cur:'HKD', lo:90, hi:150}, spicy:0,
    kid:'맵지 않아요. 30석쯤 작은 가게라 아이와는 붐비지 않는 오후가 좋아요.', queue:'점심·저녁에 1시간쯤 기다리기도 해요. 예약 안 받아요.',
    hours:'매일 오전 11시 반~밤 9시 반쯤', note:'미슐랭 1스타 거위 구이집이에요.',
    src:['https://guide.michelin.com/en/hong-kong-region/hong-kong/restaurant/kam-s-roast-goose', 'https://www.discoverhongkong.com/eng/interactive-map/kam-s-roast-goose.html', 'https://live2makan.com/2025/01/31/kams-roast-goose-%E7%94%98%E7%89%8C%E7%87%92%E9%B5%9D-hong-kong/'], checked:C},
  {id:'eat_hk_yeeshun', name:'이순 밀크 컴퍼니', local:'義順牛奶公司', area:'cwb', lat:22.2803, lng:114.1830,
    pos:'주소(록하트로드 506)·코즈웨이베이역 C출구 기준', kind:'디저트', indoor:true,
    menu:'우유 푸딩(雙皮奶), 생강 우유 푸딩, 마카오식 돼지갈비 번', price:{cur:'HKD', lo:40, hi:70}, spicy:0,
    kid:'따뜻하거나 차가운 우유 푸딩을 골라요. 아이 간식으로 좋아요.', queue:'저녁에 잠깐 기다려요.',
    hours:'낮 12시~자정쯤', note:'마카오에서 시작한 우유 푸딩 가게예요.',
    src:['https://www.timeout.com/hong-kong/restaurants/yee-shun-milk-company', 'https://tinyurbankitchen.com/yee-shun-milk-company-double-skin-milk-pudding/'], checked:C},
  {id:'eat_hk_putien', name:'푸톈 (코즈웨이베이)', local:'莆田 利舞臺廣場', area:'cwb', lat:22.2780, lng:114.1830,
    pos:'리 시어터 플라자(퍼시벌 거리 99)·하이산 플레이스 기준 0.3km 안', kind:'중국요리', indoor:true,
    menu:'푸젠식 볶음 쌀국수, 김 수프, 탕수 돼지고기', price:{cur:'HKD', lo:200, hi:300}, spicy:0,
    kid:'미슐랭이 2026년 \'가족 모임에 좋은 중국 식당\'으로 꼽았어요. 맵지 않은 메뉴가 많아요.', queue:'주말 저녁엔 기다려요. 전화로 묻고 가세요.',
    hours:'매일 오전 11시 반~밤 10시 반쯤', note:'미슐랭 빕구르망이에요. 쇼핑몰 7층이에요.',
    src:['https://guide.michelin.com/en/hong-kong-region/hong-kong/restaurant/putien-causeway-bay', 'https://guide.michelin.com/mo/en/article/dining-out/hong-kong-best-family-friendly-chinese-restaurants', 'https://www.timeout.com/hong-kong/restaurants/putien'], checked:C},

  // ── 홍콩 · 퉁청·공항 (옹핑)
  {id:'eat_hk_polin', name:'포린 사원 채식 식당', local:'寶蓮禪寺齋堂', area:'tungchung', lat:22.2555, lng:113.9079,
    pos:'포린 사원 위키백과·DBpedia 좌표 (사원 안 식당)', kind:'채식', indoor:true,
    menu:'채식 세트(버섯·두부 요리, 채소 국수), 두부 푸딩', price:{cur:'HKD', lo:80, hi:120}, spicy:0,
    kid:'고기 없는 사찰 음식이에요. 넓은 식당에서 세트로 나와요.', queue:'주말 점심에 붐벼요.',
    hours:'오전 11시 반~오후 4시 반쯤', note:'톈탄 대불 계단 아래 사원 안이에요. 옹핑 360 케이블카와 같이 가는 날 점심으로 좋아요.',
    src:['https://www.timeout.com/hong-kong/restaurants/po-lin-monastery-vegetarian-kitchen', 'https://www.greenqueen.com.hk/green-queen-guide-hong-kong/6874/po-lin-monastery-vegetarian-restaurant/', 'https://en.wikipedia.org/wiki/Po_Lin_Monastery'], checked:C},

  // ── 홍콩 · 남쪽 (오션파크)
  {id:'eat_hk_neptune', name:'넵튠스 레스토랑 (오션파크 수족관)', local:"海龍王餐廳 Neptune's Restaurant", area:'south', lat:22.2474, lng:114.1750,
    pos:'오션파크 입구 쪽 워터프런트(아쿠아 시티)·오션파크 좌표 기준', kind:'광둥요리', indoor:true,
    menu:'광둥요리 점심 세트, 딤섬', price:{cur:'HKD', lo:390, hi:600}, spicy:0,
    kid:'커다란 수족관 창 앞에서 상어·가오리를 보며 먹어요. 아이가 아주 좋아해요. 값은 비싼 편이에요.', queue:'점심은 90분 제한이에요. 전화((852) 3923 2161)로 예약하세요.',
    hours:'점심 오전 11시~오후 5시, 저녁 5시부터(마지막 주문 8시 반)', note:'점심 세트는 1인 HK$388부터, 봉사료 10%가 붙어요.',
    src:['https://www.oceanpark.com.hk/en/experience/dining-and-shopping/restaurants/neptune-s-restaurant', 'https://wanderlog.com/place/details/6865638/neptunes-restaurant', 'https://supertaste.tvbs.com.tw/exhibition/colorfulhongkong/index.html'], checked:C},

  // ── 선전 · 푸톈 CBD
  {id:'eat_sz_libaoge', name:'리바오거 (케리 플라자)', local:'利宝阁 嘉里建设广场店', area:'futian', lat:22.5353, lng:114.0569,
    pos:'케리 플라자 1동 입주사 좌표(22.5353, 114.0569)·주소(중심4로, 3동 2층)', kind:'광둥요리', indoor:true,
    menu:'바삭 오리 구이(白金桂花脆皮鸭), 하가우, 돼지갈비찜', price:null, spicy:0,
    kid:'큰 광둥식 차루라 둥근 식탁·아이 의자가 있어요. 맵지 않아요.', queue:'주말 아침 딤섬 시간에 붐벼요.',
    hours:'평일 오전 10시 반~밤 10시, 주말·공휴일 오전 9시 반~밤 10시', note:'지하철 1·4호선 컨벤션센터(会展中心)역 B출구에서 걸어서 7분쯤이에요. 그날 만든 음식만 낸다고 알려진 곳이에요.',
    src:['https://global.hk01.com/旅游/60268880/深圳早茶店11大-点心-2起免茶位-邻近各大口岸-这间本地人力推', 'https://m.bendibao.com/wangdian/yuecai/list52.htm', 'https://www.ipc.org/group/572571'], checked:C},

  // ── 선전 · 뤄후
  {id:'eat_sz_fanlou', name:'판러우 (자나나 광장)', local:'蘩楼 罗湖口岸佳宁娜广场店', area:'luohu', lat:22.5365, lng:114.1168,
    pos:'주소(인민남로 2002, 춘펑로 교차로)·뤄후 국경에서 북쪽으로 걸어서 5분', kind:'딤섬', indoor:true,
    menu:'바로 쪄 주는 딤섬 — 하가우·시우마이·창펀', price:{cur:'CNY', lo:80, hi:100}, spicy:0,
    kid:'넓은 차루예요. 국경을 넘자마자 들르기 좋아요.', queue:'늘 줄이 길어요. 주말엔 1~2시간 전에 번호표를 받기도 해요.',
    hours:'오전 8시 반~오후 4시, 오후 5시~밤 9시', note:'건물 4층이에요. 지하철 1호선 궈마오역 A출구 또는 9호선 인민남역 C출구.',
    src:['https://www.stheadline.com/zh-hans/travel/3538564/', 'https://www.stheadline.com/zh-hans/food/3230476/', 'https://ae.trip.com/moments/detail/shenzhen-26-131755052'], checked:C},
  {id:'eat_sz_chuxiang', name:'추샹러우 (궈마오)', local:'储香楼 粤点茶楼 国贸店', area:'luohu', lat:22.5422, lng:114.1178,
    pos:'주소(인민남로 3009-7)·궈마오역과 라오제역 사이', kind:'딤섬', indoor:true,
    menu:'물소 우유 번(水牛奶包), 성게 새우 창펀, 말발굽 떡(马蹄糕), 에그타르트', price:{cur:'CNY', lo:60, hi:80}, spicy:0,
    kid:'봉사료·최소 주문 없이 손으로 빚은 딤섬을 내요. 맵지 않아요.', queue:'오후 2시에도 줄이 있어요. 붐비는 때를 피해 가세요.',
    hours:'가기 전 확인 (출처에 없음)', note:'지하철 1호선 궈마오역에서 걸어서 7분, 1·3호선 라오제역에서 6분이에요. 둥먼 보행자 거리와 가까워요.',
    src:['https://global.hk01.com/旅游/60268880/深圳早茶店11大-点心-2起免茶位-邻近各大口岸-这间本地人力推', 'https://sina.cn/detail/niktyyr0715685', 'https://gs.ctrip.com/html5/you/travels/26/4126330.html'], checked:C},

  // ── 선전 · 화교성(OCT)
  {id:'eat_sz_huayuan', name:'화위안 1호 (OCT 하버)', local:'华苑壹号 欢乐海岸店', area:'oct', lat:22.5265, lng:113.9831,
    pos:'OCT 하버(欢乐海岸, 빈하이대로 3001) — 앱의 sz_octharbour 좌표', kind:'광둥요리', indoor:true,
    menu:'수정 하가우, 바삭 비둘기 구이(脆皮BB鸽), 사테 소 위', price:null, spicy:0,
    kid:'쇼핑몰 안 큰 광둥식 식당이라 먹고 호숫가를 걸으며 구경하기 좋아요.', queue:'주말 점심에 붐벼요.',
    hours:'가기 전 확인 (출처에 없음)', note:'20년 된 광둥식 차루예요. 이름(壹号/一号)과 층이 출처마다 달라요. 지하철 2호선 훙수완역 D출구.',
    src:['https://global.hk01.com/旅游/60332594/深圳湾饮茶8大推介-人均-55-点心即叫即蒸-必试叉烧酥-虾饺王', 'https://m.bendibao.com/show702258_2.html'], checked:C},

  // ── 선전 · 난산·셔커우
  {id:'eat_sz_caielan', name:'차이란 홍콩식 딤섬 (만상천지)', local:'蔡澜港式点心 万象天地店', area:'nanshan', lat:22.5450, lng:113.9511,
    pos:'선전 만상천지(深南大道 9668) — 앱의 sz_huawei 좌표', kind:'딤섬', indoor:true,
    menu:'홍콩식 딤섬 — 하가우·차슈바오·창펀', price:{cur:'CNY', lo:80, hi:100}, spicy:0,
    kid:'쇼핑몰 지하층이라 화웨이 매장 구경과 묶기 좋아요. 맵지 않아요.', queue:'위챗 공식 계정으로 번호표를 받는 지점이 많아요.',
    hours:'쇼핑몰 영업시간 (가기 전 확인)', note:'홍콩 음식평론가 차이란(蔡澜) 이름을 건 체인이에요. 지하철 1호선 가오신위안역 A출구.',
    src:['https://global.hk01.com/旅游/60278118/南山饮茶推介10间-虾饺皇必吃-即点即蒸-近地铁站-海景叹茶', 'https://gs.ctrip.com/html5/you/travels/2/3997207.html', 'https://www.yicai.com/news/102694223.html'], checked:C}
];
