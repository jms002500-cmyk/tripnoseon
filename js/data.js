// 앱이 쓰는 모든 정적 데이터. 지금은 시제품용으로 직접 입력한 값이에요.
// 장소 운영 정보(휴무일, 예약 필요 여부)와 동네별 이동 시간·가격대는 대략값이라
// 실제 API(구글 Places 등)를 붙일 때 교체 대상이에요.
//
// 장소(PLACES) 필드
//   id      고유 키
//   name    한국어 이름 / ja: 일본어 이름(구글 지도 검색어로도 씀)
//   area    AREAS의 키 (동네)
//   lat,lng 좌표
//   hours   머무는 시간(시간). full:true면 하루 종일이라 0
//   full    하루를 통째로 쓰는 곳(디즈니 등)
//   anchor  "꼭 갈 곳" 단계에 후보로 보여줄지
//   kind    KINDS 중 하나 (화면에서 종류별로 거르기)
//   tags    STYLES 중 해당하는 취향
//   kid     'all' 누구나 | 'kids' 아이 동반에 좋음 | 'teen' 10대가 좋아함 | 'adult' 어른 취향
//   closed  휴무 요일 배열 (0=일 … 6=토)
//   book    예약 필요 여부
//   note    짧은 안내 문구
//   indoor  비 오는 날 기준: true 실내 | 'part' 반쯤(가게는 실내, 거리는 걸어 다님) | false 실외 (시부야 스카이는 옥상이라 실외)

export const AREAS = {
  maihama:{name:'마이하마', station:'JR 마이하마역', q:'舞浜駅', lat:35.6365, lng:139.8838, hotel:true, disneyMin:0,
    disneyText:'걸어서 바로', price:'높음', lx:0, ly:48, anchor:'middle',
    note:'디즈니 가는 날 아침·저녁이 편해요. 도심 관광지와는 멀어요.'},
  tokyo:{name:'도쿄역·긴자', station:'JR 도쿄역', q:'東京駅', lat:35.6765, lng:139.7655, hotel:true, disneyMin:18,
    disneyText:'게이요선 약 15~20분', price:'높음', lx:-20, ly:8, anchor:'end',
    note:'디즈니, 공항버스, 신칸센이 다 연결되는 교통 중심이에요. 게이요선 타는 곳까지 역 안 통로가 길어요.'},
  akiba:{name:'우에노·아키하바라', station:'JR 우에노역', q:'上野駅', lat:35.7060, lng:139.7745, hotel:true, disneyMin:35,
    disneyText:'환승 1번, 약 30~40분', price:'보통', lx:-20, ly:-12, anchor:'end',
    note:'나리타 공항 가는 스카이라이너가 우에노에서 출발해요. 가격 대비 위치가 좋아요.'},
  asakusa:{name:'아사쿠사·스카이트리', station:'아사쿠사역', q:'浅草駅', lat:35.7110, lng:139.8020, hotel:true, disneyMin:40,
    disneyText:'환승 1~2번, 약 35~45분', price:'보통', lx:20, ly:-18, anchor:'start',
    note:'옛 거리 분위기라 저녁 산책하기 좋아요. 시부야·신주쿠 쪽과는 멀어요.'},
  shinjuku:{name:'신주쿠', station:'JR 신주쿠역', q:'新宿駅', lat:35.6909, lng:139.7003, hotel:true, disneyMin:45,
    disneyText:'환승 1번, 약 40~50분', price:'보통~높음', lx:-20, ly:8, anchor:'end',
    note:'숙소 선택지가 가장 많아요. 역이 크고 복잡해서 아이와 다닐 땐 쓸 출구를 미리 정해두세요.'},
  shibuya:{name:'시부야·하라주쿠', station:'JR 시부야역', q:'渋谷駅', lat:35.6640, lng:139.7010, hotel:true, disneyMin:50,
    disneyText:'환승 1~2번, 약 45~55분', price:'높음', lx:-20, ly:14, anchor:'end',
    note:'10대가 좋아하는 쇼핑 거리가 걸어서 닿아요.'},
  ikebukuro:{name:'이케부쿠로', station:'JR 이케부쿠로역', q:'池袋駅', lat:35.7295, lng:139.7109, hotel:true, disneyMin:55,
    disneyText:'환승 1번, 약 50~60분', price:'보통', lx:-20, ly:4, anchor:'end',
    note:'선샤인시티(수족관·포켓몬센터)가 가까워요. 동쪽 관광지와는 멀어요.'},
  bay:{name:'오다이바·도요스', station:'도요스역', q:'豊洲駅', lat:35.6400, lng:139.7860, hotel:true, disneyMin:30,
    disneyText:'환승 1번, 약 25~35분', price:'보통', lx:22, ly:34, anchor:'start',
    note:'팀랩, 미라이칸, 쇼핑몰이 모여 있어요. 바다 쪽 야경이 좋아요.'},
  west:{name:'기치조지·미타카', station:'JR 미타카역', q:'三鷹駅', lat:35.7020, lng:139.5760, hotel:false,
    lx:-14, ly:50, anchor:'start', note:''}
};

export const PLACES = [
  {id:'tdl', kind:'테마파크', indoor:false, name:'도쿄 디즈니랜드', ja:'東京ディズニーランド', area:'maihama', lat:35.6329, lng:139.8804, hours:0, full:true, anchor:true, tags:['테마파크'], kid:'kids', book:true, note:'날짜 지정 입장권이에요. 주말과 연말은 많이 붐벼요.'},
  {id:'tds', kind:'테마파크', indoor:false, name:'도쿄 디즈니씨', ja:'東京ディズニーシー', area:'maihama', lat:35.6267, lng:139.8851, hours:0, full:true, anchor:true, tags:['테마파크'], kid:'teen', book:true, note:'스릴 있는 놀이기구가 많아 10대 이상이 특히 좋아해요.'},
  {id:'ghibli', kind:'박물관·미술관', indoor:true, name:'지브리 미술관', ja:'三鷹の森ジブリ美術館', area:'west', lat:35.6962, lng:139.5704, hours:2.5, anchor:true, tags:['문화·역사','체험'], kid:'all', closed:[2], book:true, note:'날짜·시간 지정 예약제예요.'},
  {id:'teamlab', kind:'체험·캐릭터', indoor:true, name:'팀랩 플래닛', ja:'チームラボプラネッツ TOKYO', area:'bay', lat:35.6491, lng:139.7898, hours:2, anchor:true, tags:['체험'], kid:'all', book:true, note:'물속을 걷는 전시가 있어서 무릎까지 걷을 수 있는 바지가 편해요.'},
  {id:'skytree', kind:'전망대', indoor:true, name:'도쿄 스카이트리', ja:'東京スカイツリー', area:'asakusa', lat:35.7101, lng:139.8107, hours:2, anchor:true, tags:['관광명소','쇼핑'], kid:'all', note:'아래층 소라마치 쇼핑몰과 같이 둘러보면 좋아요.'},
  {id:'sensoji', kind:'신사·절', indoor:false, anchor:true, name:'센소지', ja:'浅草寺', area:'asakusa', lat:35.7148, lng:139.7967, hours:1.5, tags:['문화·역사','관광명소'], kid:'all', note:'절 앞 나카미세 거리의 길거리 간식이 유명해요.'},
  {id:'uenozoo', kind:'수족관·동물원', indoor:false, anchor:true, name:'우에노 동물원', ja:'恩賜上野動物園', area:'akiba', lat:35.7166, lng:139.7713, hours:2.5, tags:['자연·산책','체험'], kid:'kids', closed:[1]},
  {id:'ameyoko', kind:'거리·시장', indoor:'part', name:'아메요코 시장', ja:'アメ横商店街', area:'akiba', lat:35.7100, lng:139.7745, hours:1, tags:['맛집','쇼핑'], kid:'all', note:'과일 꼬치, 해산물 덮밥 같은 시장 먹거리가 많아요.'},
  {id:'akihabara', kind:'거리·시장', indoor:'part', name:'아키하바라 거리', ja:'秋葉原電気街', area:'akiba', lat:35.6984, lng:139.7731, hours:2, tags:['쇼핑'], kid:'teen', note:'애니·게임 굿즈 매장이 몰려 있어요.'},
  {id:'domecity', kind:'테마파크', indoor:false, anchor:true, name:'도쿄 돔 시티 어트랙션즈', ja:'東京ドームシティ アトラクションズ', area:'akiba', lat:35.7056, lng:139.7536, hours:2, tags:['테마파크','체험'], kid:'kids', note:'도심 속 놀이공원이에요. 놀이기구마다 따로 요금을 내요.'},
  {id:'takeshita', kind:'거리·시장', indoor:false, name:'하라주쿠 다케시타 거리', ja:'竹下通り', area:'shibuya', lat:35.6716, lng:139.7031, hours:1.5, tags:['쇼핑','맛집'], kid:'teen', note:'크레페 가게와 10대 패션 매장이 모여 있어요.'},
  {id:'meiji', kind:'신사·절', indoor:false, anchor:true, name:'메이지 신궁', ja:'明治神宮', area:'shibuya', lat:35.6764, lng:139.6993, hours:1.5, tags:['문화·역사','자연·산책'], kid:'all', note:'도심 한가운데 큰 숲길이에요.'},
  {id:'scramble', kind:'거리·시장', indoor:false, name:'시부야 스크램블 교차로', ja:'渋谷スクランブル交差点', area:'shibuya', lat:35.6595, lng:139.7005, hours:0.5, tags:['관광명소'], kid:'all'},
  {id:'shibuyasky', kind:'전망대', indoor:false, anchor:true, name:'시부야 스카이', ja:'SHIBUYA SKY', area:'shibuya', lat:35.6584, lng:139.7022, hours:1.5, tags:['관광명소'], kid:'all', book:true, note:'해 질 녘 시간대 표가 가장 먼저 매진돼요.'},
  {id:'parco', kind:'체험·캐릭터', indoor:true, name:'시부야 파르코 (포켓몬센터·닌텐도)', ja:'渋谷PARCO', area:'shibuya', lat:35.6620, lng:139.6989, hours:1.5, tags:['쇼핑','체험'], kid:'teen'},
  {id:'gyoen', kind:'공원·정원', indoor:false, name:'신주쿠 교엔', ja:'新宿御苑', area:'shinjuku', lat:35.6852, lng:139.7101, hours:1.5, tags:['자연·산책'], kid:'all', closed:[1], note:'넓은 정원이라 쉬어 가기 좋아요.'},
  {id:'tocho', kind:'전망대', indoor:true, name:'도쿄도청 전망대', ja:'東京都庁展望室', area:'shinjuku', lat:35.6896, lng:139.6917, hours:1, tags:['관광명소'], kid:'all', note:'무료 전망대예요.'},
  {id:'omoide', kind:'먹거리', indoor:'part', name:'오모이데요코초', ja:'思い出横丁', area:'shinjuku', lat:35.6930, lng:139.6995, hours:1, tags:['맛집'], kid:'adult', note:'좁은 꼬치·선술집 골목이에요.'},
  {id:'odaiba', kind:'쇼핑', indoor:true, name:'오다이바 다이버시티', ja:'ダイバーシティ東京 プラザ', area:'bay', lat:35.6252, lng:139.7756, hours:2.5, tags:['쇼핑','관광명소'], kid:'all', note:'실물 크기 건담 조각상 앞이 사진 명소예요.'},
  {id:'miraikan', kind:'박물관·미술관', indoor:true, anchor:true, name:'미라이칸 (과학미래관)', ja:'日本科学未来館', area:'bay', lat:35.6192, lng:139.7767, hours:2, tags:['체험'], kid:'kids', closed:[2]},
  {id:'kidzania', kind:'체험·캐릭터', indoor:true, anchor:true, name:'키자니아 도쿄', ja:'キッザニア東京', area:'bay', lat:35.6551, lng:139.7922, hours:4, tags:['체험'], kid:'kids', book:true, note:'직업 체험 테마파크예요. 진행은 일본어 위주예요.'},
  {id:'toyosu', kind:'먹거리', indoor:true, name:'도요스 시장', ja:'豊洲市場', area:'bay', lat:35.6455, lng:139.7845, hours:1.5, tags:['맛집'], kid:'all', closed:[0], note:'아침 일찍 가야 해요. 수요일에 쉬는 날도 있어요.'},
  {id:'tsukiji', kind:'먹거리', indoor:false, anchor:true, name:'츠키지 장외시장', ja:'築地場外市場', area:'tokyo', lat:35.6654, lng:139.7707, hours:1.5, tags:['맛집'], kid:'all', note:'오전에 가야 문 연 가게가 많아요.'},
  {id:'ginza', kind:'쇼핑', indoor:'part', name:'긴자 거리', ja:'銀座', area:'tokyo', lat:35.6717, lng:139.7650, hours:2, tags:['쇼핑'], kid:'all', note:'주말 낮에는 중앙 대로가 보행자 거리가 돼요.'},
  {id:'charast', kind:'체험·캐릭터', indoor:true, name:'도쿄역 캐릭터 스트리트', ja:'東京キャラクターストリート', area:'tokyo', lat:35.6800, lng:139.7680, hours:1, tags:['쇼핑'], kid:'teen', note:'도쿄역 지하에 캐릭터 상점이 모여 있어요.'},
  {id:'tower', kind:'전망대', indoor:true, anchor:true, name:'도쿄 타워', ja:'東京タワー', area:'tokyo', lat:35.6586, lng:139.7454, hours:1.5, tags:['관광명소'], kid:'all'},
  {id:'sunshine', kind:'체험·캐릭터', indoor:true, anchor:true, name:'선샤인시티 (수족관·포켓몬센터)', ja:'サンシャインシティ', area:'ikebukuro', lat:35.7289, lng:139.7193, hours:3, tags:['쇼핑','체험'], kid:'kids'},
  {id:'inokashira', kind:'공원·정원', indoor:false, name:'이노카시라 공원', ja:'井の頭恩賜公園', area:'west', lat:35.6997, lng:139.5729, hours:1.5, tags:['자연·산책'], kid:'all', note:'지브리 미술관과 걸어서 이어져요.'},
  {id:'hpstudio', kind:'테마파크', indoor:true, name:'해리 포터 스튜디오 투어 도쿄', ja:'ワーナー ブラザース スタジオツアー東京', area:'ikebukuro', lat:35.7456, lng:139.6457, hours:4, anchor:true, tags:['체험','테마파크'], kid:'teen', book:true, note:'해리 포터 영화 세트·소품 전시. 날짜·시간 지정 예약제, 세이부선 도시마엔역 바로 앞이에요.'},
  {id:'tnm', kind:'박물관·미술관', indoor:true, name:'도쿄 국립박물관', ja:'東京国立博物館', area:'akiba', lat:35.7190, lng:139.7760, hours:2, anchor:true, tags:['문화·역사'], kid:'all', closed:[1], note:'일본에서 가장 오래되고 큰 박물관. 월요일 휴관(공휴일이면 다음 날).'},
  {id:'kahaku', kind:'박물관·미술관', indoor:true, name:'국립과학박물관', ja:'国立科学博物館', area:'akiba', lat:35.7159, lng:139.7767, hours:2.5, anchor:true, tags:['체험','문화·역사'], kid:'kids', closed:[1], note:'공룡 화석과 지구관이 있어 아이들이 좋아해요. 월요일 휴관.'},
  {id:'uenopark', kind:'공원·정원', indoor:false, name:'우에노 공원', ja:'上野恩賜公園', area:'akiba', lat:35.7140, lng:139.7739, hours:1, tags:['자연·산책'], kid:'all', note:'박물관·동물원이 모여 있는 큰 공원이에요.'},
  {id:'yanaka', kind:'거리·시장', indoor:false, name:'야나카 긴자', ja:'谷中銀座商店街', area:'akiba', lat:35.7276, lng:139.7660, hours:1, tags:['맛집','문화·역사'], kid:'all', note:'옛 동네 분위기 상점가. 멘치카쓰 같은 길거리 간식이 유명해요.'},
  {id:'nezu', kind:'신사·절', indoor:false, name:'네즈 신사', ja:'根津神社', area:'akiba', lat:35.7200, lng:139.7607, hours:1, tags:['문화·역사'], kid:'all', note:'붉은 도리이가 줄지어 선 작은 길이 있어요.'},
  {id:'kanda', kind:'신사·절', indoor:false, name:'간다 묘진', ja:'神田明神', area:'akiba', lat:35.7019, lng:139.7677, hours:1, tags:['문화·역사'], kid:'all', note:'아키하바라에서 걸어서 갈 수 있는 신사예요.'},
  {id:'sumida', kind:'수족관·동물원', indoor:true, name:'스미다 수족관', ja:'すみだ水族館', area:'asakusa', lat:35.7101, lng:139.8093, hours:1.5, anchor:true, tags:['체험'], kid:'kids', note:'스카이트리 아래 소라마치 안에 있어요. 펭귄 수조가 유명해요.'},
  {id:'kappabashi', kind:'쇼핑', indoor:false, name:'갓파바시 도구 거리', ja:'かっぱ橋道具街', area:'asakusa', lat:35.7131, lng:139.7885, hours:1, tags:['쇼핑'], kid:'all', note:'주방용품·칼·식품 모형 가게 거리. 일요일엔 쉬는 가게가 많아요.'},
  {id:'hanayashiki', kind:'테마파크', indoor:false, name:'하나야시키 놀이공원', ja:'浅草花やしき', area:'asakusa', lat:35.7155, lng:139.7946, hours:2, tags:['테마파크'], kid:'kids', note:'일본에서 가장 오래된 작은 놀이공원. 어린아이에게 맞아요.'},
  {id:'tcv', kind:'전망대', indoor:true, name:'롯폰기 힐스 도쿄 시티 뷰', ja:'東京シティビュー', area:'tokyo', lat:35.6604, lng:139.7291, hours:1.5, anchor:true, tags:['관광명소'], kid:'all', note:'도쿄타워가 정면으로 보이는 실내 전망대. 야경이 좋아요.'},
  {id:'borderless', kind:'체험·캐릭터', indoor:true, name:'팀랩 보더리스', ja:'チームラボボーダレス', area:'tokyo', lat:35.6620, lng:139.7434, hours:2.5, anchor:true, tags:['체험'], kid:'all', book:true, note:'아자부다이 힐스의 디지털 아트 미술관. 날짜·시간 지정 표예요.'},
  {id:'zojoji', kind:'신사·절', indoor:false, name:'조조지', ja:'増上寺', area:'tokyo', lat:35.6573, lng:139.7483, hours:1, tags:['문화·역사'], kid:'all', note:'도쿄타워를 배경으로 사진 찍기 좋은 절이에요.'},
  {id:'palace', kind:'공원·정원', indoor:false, name:'고쿄 히가시교엔', ja:'皇居東御苑', area:'tokyo', lat:35.6867, lng:139.7574, hours:1.5, tags:['자연·산책','문화·역사'], kid:'all', closed:[1, 5], note:'옛 에도성 터의 정원. 무료, 월·금 휴원.'},
  {id:'marunouchi', kind:'야경·일루미네이션', indoor:false, name:'마루노우치 나카도리', ja:'丸の内仲通り', area:'tokyo', lat:35.6800, lng:139.7628, hours:1, tags:['관광명소','쇼핑'], kid:'all', note:'11월~2월 가로수 샴페인 골드 일루미네이션. 저녁에 걷기 좋아요.'},
  {id:'hamarikyu', kind:'공원·정원', indoor:false, name:'하마리큐 정원', ja:'浜離宮恩賜庭園', area:'tokyo', lat:35.6602, lng:139.7638, hours:1.5, tags:['자연·산책'], kid:'all', note:'바닷물을 끌어들인 연못 정원. 연못 위 찻집에서 말차를 마실 수 있어요.'},
  {id:'tsukishima', kind:'먹거리', indoor:'part', name:'쓰키시마 몬자 거리', ja:'月島もんじゃストリート', area:'tokyo', lat:35.6643, lng:139.7825, hours:1.5, tags:['맛집'], kid:'all', note:'도쿄식 철판 요리 몬자야키 가게가 줄지어 있어요.'},
  {id:'tokyost', kind:'거리·시장', indoor:false, name:'도쿄역 마루노우치 역사', ja:'東京駅丸の内駅舎', area:'tokyo', lat:35.6812, lng:139.7660, hours:0.5, tags:['관광명소','문화·역사'], kid:'all', note:'100년 넘은 붉은 벽돌 역 건물. 밤 조명도 예뻐요.'},
  {id:'ramenst', kind:'먹거리', indoor:true, name:'도쿄 라멘 스트리트', ja:'東京ラーメンストリート', area:'tokyo', lat:35.6804, lng:139.7679, hours:1, tags:['맛집'], kid:'all', note:'도쿄역 지하에 유명 라멘집이 모여 있어요. 점심엔 줄이 길어요.'},
  {id:'ebisu', kind:'야경·일루미네이션', indoor:false, name:'에비스 가든 플레이스', ja:'恵比寿ガーデンプレイス', area:'shibuya', lat:35.6420, lng:139.7136, hours:1, tags:['쇼핑','관광명소'], kid:'all', note:'겨울엔 대형 바카라 샹들리에 일루미네이션을 해요.'},
  {id:'omotesando', kind:'쇼핑', indoor:'part', name:'오모테산도', ja:'表参道', area:'shibuya', lat:35.6691, lng:139.7041, hours:1.5, tags:['쇼핑'], kid:'all', note:'명품 매장과 건축이 멋진 가로수길. 하라주쿠와 이어져요.'},
  {id:'yoyogi', kind:'공원·정원', indoor:false, name:'요요기 공원', ja:'代々木公園', area:'shibuya', lat:35.6714, lng:139.6952, hours:1, tags:['자연·산책'], kid:'all', note:'메이지 신궁 옆 넓은 공원. 겨울엔 파란 일루미네이션 행사가 열려요.'},
  {id:'miyashita', kind:'쇼핑', indoor:'part', name:'미야시타 파크', ja:'MIYASHITA PARK', area:'shibuya', lat:35.6620, lng:139.7019, hours:1, tags:['쇼핑','맛집'], kid:'all', note:'옥상 공원이 있는 쇼핑몰. 1층에 요코초 먹거리 골목이 있어요.'},
  {id:'shimokita', kind:'거리·시장', indoor:'part', name:'시모키타자와', ja:'下北沢', area:'shibuya', lat:35.6617, lng:139.6663, hours:1.5, tags:['쇼핑','맛집'], kid:'all', note:'빈티지 옷가게·카페·잡화점 골목.'},
  {id:'godzilla', kind:'거리·시장', indoor:false, name:'신주쿠 고질라 헤드', ja:'新宿東宝ビル', area:'shinjuku', lat:35.6954, lng:139.7020, hours:0.5, tags:['관광명소'], kid:'teen', note:'가부키초 건물 위 실물 크기 고질라 머리. 잠깐 사진 찍고 가요.'},
  {id:'nakano', kind:'쇼핑', indoor:true, name:'나카노 브로드웨이', ja:'中野ブロードウェイ', area:'shinjuku', lat:35.7093, lng:139.6656, hours:1.5, tags:['쇼핑'], kid:'teen', note:'애니·피규어·장난감 중고 가게가 빼곡한 건물이에요.'},
  {id:'rikugien', kind:'공원·정원', indoor:false, name:'리쿠기엔', ja:'六義園', area:'ikebukuro', lat:35.7334, lng:139.7463, hours:1.5, anchor:true, tags:['자연·산책','문화·역사'], kid:'all', note:'에도 시대 정원. 12월 초까지 단풍이 남아 있고 야간 조명도 해요.'},
  {id:'koishikawa', kind:'공원·정원', indoor:false, name:'고이시카와 고라쿠엔', ja:'小石川後楽園', area:'akiba', lat:35.7054, lng:139.7492, hours:1, tags:['자연·산책'], kid:'all', note:'도쿄 돔 옆의 오래된 정원이에요.'},
  {id:'gotokuji', kind:'신사·절', indoor:false, name:'고토쿠지', ja:'豪徳寺', area:'shibuya', lat:35.6535, lng:139.6469, hours:1, tags:['문화·역사'], kid:'all', note:'수천 개의 복고양이(마네키네코) 인형이 놓인 절이에요.'},
  {id:'harmonica', kind:'먹거리', indoor:'part', name:'기치조지 하모니카 요코초', ja:'ハモニカ横丁', area:'west', lat:35.7038, lng:139.5793, hours:1, tags:['맛집','쇼핑'], kid:'all', note:'작은 가게가 하모니카 칸처럼 붙은 시장 골목.'},
  {id:'odaibapark', kind:'야경·일루미네이션', indoor:false, name:'오다이바 해변공원', ja:'お台場海浜公園', area:'bay', lat:35.6311, lng:139.7774, hours:1, tags:['자연·산책','관광명소'], kid:'all', note:'레인보우 브리지와 도쿄 야경이 보이는 바닷가예요.'},
  {id:'smallworlds', kind:'체험·캐릭터', indoor:true, name:'스몰 월드 도쿄', ja:'SMALL WORLDS TOKYO', area:'bay', lat:35.6378, lng:139.7883, hours:2, anchor:true, tags:['체험'], kid:'kids', note:'도시·우주·애니 장면을 정교한 미니어처로 만든 실내 전시예요.'},
  {id:'legoland', kind:'체험·캐릭터', indoor:true, name:'레고랜드 디스커버리 센터 도쿄', ja:'レゴランド・ディスカバリー・センター東京', area:'bay', lat:35.6288, lng:139.7757, hours:2, tags:['체험','테마파크'], kid:'kids', note:'3~10살 대상 실내 레고 놀이 시설. 어른끼리는 입장할 수 없어요.'},
  {id:'joypolis', kind:'테마파크', indoor:true, name:'도쿄 조이폴리스', ja:'東京ジョイポリス', area:'bay', lat:35.6290, lng:139.7757, hours:2.5, anchor:true, tags:['테마파크','체험'], kid:'teen', note:'실내 놀이공원. 비 오는 날에도 좋아요.'},
  {id:'maxell', kind:'수족관·동물원', indoor:true, name:'맥셀 아쿠아 파크 시나가와', ja:'マクセル アクアパーク品川', area:'shibuya', lat:35.6284, lng:139.7358, hours:2, anchor:true, tags:['체험'], kid:'kids', note:'시나가와역 앞 호텔 안 수족관. 돌고래 쇼가 있어요.'},
  {id:'keyakizaka', kind:'야경·일루미네이션', indoor:false, name:'롯폰기 게야키자카', ja:'けやき坂', area:'tokyo', lat:35.6594, lng:139.7279, hours:0.5, tags:['관광명소'], kid:'all', note:'11~12월 하얀 LED 가로수 길 너머로 도쿄타워가 보여요.'},
  {id:'kiyosumi', kind:'공원·정원', indoor:false, name:'기요스미 정원', ja:'清澄庭園', area:'tokyo', lat:35.6800, lng:139.7978, hours:1, tags:['자연·산책'], kid:'all', note:'연못 위 징검돌을 건너는 조용한 정원이에요.'}
];

export const YAMANOTE = [[35.6812,139.7671],[35.6918,139.7709],[35.6984,139.7731],[35.7075,139.7748],[35.7138,139.7773],[35.7206,139.7781],[35.7281,139.7710],[35.7320,139.7668],[35.7381,139.7608],[35.7365,139.7470],[35.7334,139.7393],[35.7317,139.7286],[35.7295,139.7109],[35.7212,139.7066],[35.7128,139.7038],[35.7012,139.7000],[35.6896,139.7006],[35.6830,139.7020],[35.6702,139.7027],[35.6580,139.7016],[35.6467,139.7101],[35.6339,139.7157],[35.6262,139.7236],[35.6197,139.7286],[35.6285,139.7388],[35.6457,139.7476],[35.6555,139.7570],[35.6663,139.7583],[35.6750,139.7630]];
export const KEIYO = [[35.6812,139.7671],[35.6748,139.7777],[35.6458,139.8270],[35.6365,139.8838]];

export const WHO = [{key:'solo',label:'혼자'},{key:'couple',label:'연인·부부'},{key:'friends',label:'친구'},{key:'family',label:'가족 (아이 동반)'},{key:'parents',label:'부모님과'}];
// 장소 종류 (꼭 갈 곳·장소 담기 단계의 거르기 칩 순서)
export const KINDS = ['테마파크','전망대','박물관·미술관','수족관·동물원','체험·캐릭터','공원·정원','신사·절','거리·시장','쇼핑','먹거리','야경·일루미네이션'];
export const STYLES = ['관광명소','맛집','쇼핑','체험','테마파크','자연·산책','문화·역사'];
export const PACE = {relaxed:{label:'여유롭게',hours:5,desc:'하루 2~3곳'}, normal:{label:'적당히',hours:7,desc:'하루 3~4곳'}, packed:{label:'알차게',hours:9,desc:'하루 4곳 이상'}};
export const STEPS = ['동행','여행지','꼭 갈 곳','장소 담기','숙소 동네','일정','준비물','보관함','가계부'];
export const WD = ['일','월','화','수','목','금','토'];
export const DAY_COLORS = ['#F39700','#E60012','#00A7DB','#009944','#9B7CB6','#BB641D','#00ADA9','#C1A470','#6C7A89','#D7006A'];

// 처음 연 사람의 상태. 실제 사람의 일정은 넣지 않음(공개 저장소). 입력한 값은 그 기기 localStorage에만 저장
export const DEFAULT = {step:0, who:null, adults:2, kids:[], styles:[], pace:'normal',
  country:'jp', city:'tokyo', start:'', end:'',
  picked:{}, must:{}, fullDay:{}, custom:[], hotelArea:null, assign:{}, areaFilter:'all', kindFilter:'all', anchorKind:'all',
  imports:[], geoBusy:false, geoErr:false, impMsg:'',       // imports: 구글 지도에서 가져와 확인을 기다리는 곳
  hotels:[], hotelPick:null, hotelCur:'JPY', hotelSort:'place', hotelMsg:'', hotelBusy:false, hotelErr:false,   // hotels: 숙소 후보
  rkOn:false, rk:null, rkBusy:false,   // rkOn: 라쿠텐 키가 이 기기에 있는지(키 자체는 상태에 넣지 않음), rk: 마지막 빈방 검색 결과
  wx:null, wxBusy:false, fx:null,      // wx: 여행 날짜 날씨(이맘때 평균·예보), fx: 환율 { rate: 1엔당 원, date, src }
  vault:[], vedit:null, vdraft:null, lastBackup:'',   // vault: 예약 보관함(이 기기에만, 공유 안 함), vedit: 고치는 항목 id, vdraft: 제안에서 채운 새 항목
  locOn:false,   // 위치 공유를 이 기기에서 켰는지 (js/loc.js, 기기마다)
  nights:{},   // 나눠 자기 { '그날 밤 YYYY-MM-DD': 숙소 후보 id } (js/logic.js nightHotel, 함께 짜기로 공유)
  dlock:{},   // 일차별 확정 { 'YYYY-MM-DD': true } (js/logic.js lockDay, 함께 짜기로 공유)
  spend:{}, party:[], lrate:0, lby:null, budget:{ total:0, cats:{} },
  pack:{}, pfilter:'all',
  safety:{ hname:'', addr:'', tel:'', meet:'' }, sphone:'',   // 긴급 정보(js/safety.js): safety 숙소 일본어 이름·주소·전화·만날 장소(함께 짜기로 공유), sphone 부모 연락처(이 기기에만)   // 준비물(js/packing.js): pack {id: 준비물}(함께 짜기로 공유), pfilter 화면 거르기
  mode:null, tday:null, tdone:{}, todayOpened:'',   // 오늘 하루 화면(js/today.js): mode 'today'면 그 화면, tday 고른 날(없으면 오늘), tdone 다녀옴 표시(기기마다), todayOpened 자동으로 연 날   // 가계부(js/ledger.js): spend 지출 {id: 지출}, party 나누는 사람 [{id,name}], lrate 정산 환율(1엔당 원, 0이면 받아 온 환율), lby 이 기기에서 마지막으로 낸 사람, budget 예산 {total 원, cats {분류: 원}}(js/budget.js)
  shareId:null};                       // shareId: 함께 짜는 공유 여행 번호(없으면 이 기기에만 있는 여행)

// 숙소 가격 통화. 후보끼리 비교해야 해서 여행 하나에 통화 하나만 씀
export const CURRENCY = { JPY:{ label:'엔', sign:'¥' }, KRW:{ label:'원', sign:'₩' } };
