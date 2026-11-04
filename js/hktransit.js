// 홍콩 MTR 다음 열차 (DATA.GOV.HK '港鐵實時列車資訊' Real-time MTR train information, MTR Corporation 자료, 무료·키 없음).
//   주소: https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=노선&sta=역  (Next Train API Spec v1.7, 2025-03-13)
//   오늘 하루 화면의 '다음 장소' 카드에서 사용자가 누를 때만 부름. 보내는 것은 노선·역 코드뿐, 결과는 화면 전용(s.sh.mtr).
//   CORS: 이 작업 환경에서는 rt.data.gov.hk에 직접 접속이 막혀(2026-11-03) curl로 확인하지 못했어요.
//         다른 정적 웹앱들의 설명(Access-Control-Allow-Origin: *)만 확인됨. 브라우저에서 막히면 'net' 안내가 떠요.
// 응답 → 화면에 쓸 모양은 순수 함수(테스트 대상, 실제 응답 모양은 tests/hktransit.test.mjs).
//   ttnt·valid·source 칸은 자료 사전에 'Dummy'로 적혀 있어 쓰지 않고, 몇 분 뒤는 time − curr_time(둘 다 홍콩 시각)으로 셈.
//   EAL은 timeType(A 도착·D 출발)·route('RAC' 경마장 경유)가 더 옴. status 0이면 특별 운행 안내(message·url).
//
// 역 목록·노선: MTR 공개 자료 mtr_lines_and_stations.csv(opendata.mtr.com.hk, 2026-11-03 사본)의 역 코드·노선 (97역, 경마장역은 경마일에만 서서 뺌)
// 역 좌표: hkbus 오픈 데이터(hk-bus-crawling routeFareList, 2026-11-03)와 OpenStreetMap(Overpass, 2026-09-01 추출)을 대조해
//   97역 모두 160m 안(가운데값 24m)에서 맞음을 확인하고 앞쪽 값을 소수 넷째 자리로. 한국어 이름은 이 앱에서 지은 읽기예요.
//   [한국어, 중문, 위도, 경도, '노선 …']
export const MTR_CHECKED = '2026-11-03';
export const MTR_SOURCE = 'https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data';
// color: 노선 고유색(MTR 노선도의 색, 약도에 그릴 때 씀 — DAY_COLORS처럼 고정값)
export const MTR_LINES = {
  AEL:{ ko:'공항 익스프레스', zh:'機場快綫', color:'#00888A' }, TCL:{ ko:'퉁청선', zh:'東涌綫', color:'#F7943E' }, TML:{ ko:'툰마선', zh:'屯馬綫', color:'#923011' },
  TKL:{ ko:'청콴오선', zh:'將軍澳綫', color:'#7D499D' }, EAL:{ ko:'동철선', zh:'東鐵綫', color:'#5EB6E4' }, SIL:{ ko:'사우스아일랜드선', zh:'南港島綫', color:'#BAC429' },
  TWL:{ ko:'췐완선', zh:'荃灣綫', color:'#E2231A' }, ISL:{ ko:'아일랜드선', zh:'港島綫', color:'#0075C2' }, KTL:{ ko:'쿤통선', zh:'觀塘綫', color:'#00AB4E' }, DRL:{ ko:'디즈니선', zh:'迪士尼綫', color:'#F173AC' }
};
// 약도에 그릴 노선: 끝에서 끝까지 역 순서(갈래는 따로 한 줄). 노선마다 들어가는 역은 위 역 목록(MTR 공개 자료)과 같은지 tests/hktransit.test.mjs가 확인
export const MTR_ROUTES = [
  ['ISL', 'KET HKU SYP SHW CEN ADM WAC CAB TIH FOH NOP QUB TAK SWH SKW HFC CHW'],
  ['TWL', 'CEN ADM TST JOR YMT MOK PRE SSP CSW LCK MEF LAK KWF KWH TWH TSW'],
  ['KTL', 'WHA HOM YMT MOK PRE SKM KOT LOF WTS DIH CHH KOB NTK KWT LAT YAT TIK'],
  ['TKL', 'NOP QUB YAT TIK TKO HAH POA'], ['TKL', 'TKO LHP'],
  ['TCL', 'HOK KOW OLY NAC LAK TSY SUN TUC'],
  ['AEL', 'HOK KOW TSY AIR AWE'],
  ['DRL', 'SUN DIS'],
  ['EAL', 'ADM EXC HUH MKK KOT TAW SHT FOT UNI TAP TWO FAN SHS LOW'], ['EAL', 'SHS LMC'],
  ['TML', 'WKS MOS HEO TSH SHM CIO STW CKT TAW HIK DIH KAT SUW TKW HOM HUH ETS AUS NAC MEF TWW KSR YUL LOP TIS SIH TUM'],
  ['SIL', 'ADM OCP WCH LET SOH']
].map(([line, seq]) => ({ line, seq:seq.split(' ') }));
const RAW = {
  AWE:['아시아월드엑스포','博覽館',22.3218,113.9412,'AEL'],
  AIR:['공항','機場',22.3159,113.9365,'AEL'],
  TSY:['칭이','青衣',22.3584,114.1073,'AEL TCL'],
  KOW:['구룡','九龍',22.3043,114.1614,'AEL TCL'],
  HOK:['홍콩','香港',22.2847,114.1582,'AEL TCL'],
  SUN:['써니베이','欣澳',22.3321,114.029,'DRL TCL'],
  DIS:['디즈니랜드 리조트','迪士尼',22.3155,114.0448,'DRL'],
  LOW:['로우','羅湖',22.5276,114.1132,'EAL'],
  SHS:['셩수이','上水',22.5016,114.1275,'EAL'],
  FAN:['판링','粉嶺',22.4921,114.1387,'EAL'],
  TWO:['타이워','太和',22.4511,114.1612,'EAL'],
  TAP:['타이포마켓','大埔墟',22.4446,114.1704,'EAL'],
  UNI:['대학','大學',22.4137,114.21,'EAL'],
  FOT:['포탄','火炭',22.3958,114.1985,'EAL'],
  SHT:['사틴','沙田',22.3821,114.1869,'EAL'],
  TAW:['타이와이','大圍',22.3728,114.1787,'EAL TML'],
  KOT:['구룡탕','九龍塘',22.3371,114.1758,'EAL KTL'],
  MKK:['몽콕이스트','旺角東',22.322,114.1726,'EAL'],
  HUH:['훙함','紅磡',22.303,114.1822,'EAL TML'],
  EXC:['전시센터','會展',22.2816,114.1753,'EAL'],
  ADM:['애드미럴티','金鐘',22.2794,114.1643,'EAL ISL TWL SIL'],
  LMC:['록마차우','落馬洲',22.5145,114.0657,'EAL'],
  CHW:['차이완','柴灣',22.2646,114.2371,'ISL'],
  HFC:['헝파췬','杏花邨',22.2766,114.2397,'ISL'],
  SKW:['사우께이완','筲箕灣',22.2792,114.2289,'ISL'],
  SWH:['사이완호','西灣河',22.2822,114.2218,'ISL'],
  TAK:['타이쿠','太古',22.2846,114.2165,'ISL'],
  QUB:['쿼리베이','鰂魚涌',22.2886,114.2087,'ISL TKL'],
  NOP:['노스포인트','北角',22.2912,114.2004,'ISL TKL'],
  FOH:['포트리스힐','炮台山',22.2879,114.1936,'ISL'],
  TIH:['틴하우','天后',22.2822,114.1919,'ISL'],
  CAB:['코즈웨이베이','銅鑼灣',22.2802,114.1842,'ISL'],
  WAC:['완차이','灣仔',22.2776,114.1726,'ISL'],
  CEN:['센트럴','中環',22.2822,114.1577,'ISL TWL'],
  SHW:['셩완','上環',22.2866,114.152,'ISL'],
  SYP:['사이잉푼','西營盤',22.2855,114.1427,'ISL'],
  HKU:['홍콩대학','香港大學',22.2841,114.1356,'ISL'],
  KET:['케네디타운','堅尼地城',22.2812,114.1284,'ISL'],
  TIK:['티우껭렝','調景嶺',22.3043,114.2526,'KTL TKL'],
  YAT:['야우통','油塘',22.298,114.237,'KTL TKL'],
  LAT:['람틴','藍田',22.3068,114.2327,'KTL'],
  KWT:['쿤통','觀塘',22.3121,114.2265,'KTL'],
  NTK:['응아우타우콕','牛頭角',22.3155,114.219,'KTL'],
  KOB:['구룡베이','九龍灣',22.3235,114.214,'KTL'],
  CHH:['초이훙','彩虹',22.335,114.209,'KTL'],
  DIH:['다이아몬드힐','鑽石山',22.34,114.2017,'KTL TML'],
  WTS:['웡타이신','黃大仙',22.3417,114.1939,'KTL'],
  LOF:['록푸','樂富',22.338,114.187,'KTL'],
  SKM:['섹킵메이','石硤尾',22.3318,114.1688,'KTL'],
  PRE:['프린스에드워드','太子',22.3244,114.1683,'KTL TWL'],
  MOK:['몽콕','旺角',22.3193,114.1693,'KTL TWL'],
  YMT:['야우마테이','油麻地',22.3128,114.1707,'KTL TWL'],
  HOM:['호만틴','何文田',22.3094,114.1826,'KTL TML'],
  WHA:['웡포아','黃埔',22.3048,114.1898,'KTL'],
  WKS:['우카이사','烏溪沙',22.4291,114.2438,'TML'],
  MOS:['마온산','馬鞍山',22.4249,114.232,'TML'],
  HEO:['헝온','恆安',22.4179,114.2259,'TML'],
  TSH:['타이수이항','大水坑',22.4082,114.2226,'TML'],
  SHM:['섹문','石門',22.3879,114.2085,'TML'],
  CIO:['시티원','第一城',22.383,114.2036,'TML'],
  STW:['사틴와이','沙田圍',22.3769,114.1948,'TML'],
  CKT:['체쿵사원','車公廟',22.3748,114.1859,'TML'],
  HIK:['힌킹','顯徑',22.3637,114.1707,'TML'],
  KAT:['카이탁','啟德',22.3304,114.1993,'TML'],
  SUW:['숭웡토이','宋皇臺',22.3256,114.1906,'TML'],
  TKW:['토과완','土瓜灣',22.3179,114.1876,'TML'],
  ETS:['이스트침사추이','尖東',22.2953,114.1746,'TML'],
  AUS:['오스틴','柯士甸',22.3049,114.1663,'TML'],
  NAC:['남청','南昌',22.3269,114.1535,'TML TCL'],
  MEF:['메이푸','美孚',22.3379,114.1364,'TML TWL'],
  TWW:['췐완웨스트','荃灣西',22.3684,114.1097,'TML'],
  KSR:['깜숭로드','錦上路',22.4351,114.0632,'TML'],
  YUL:['위엔롱','元朗',22.4461,114.0352,'TML'],
  LOP:['롱핑','朗屏',22.4476,114.0255,'TML'],
  TIS:['틴수이와이','天水圍',22.4479,114.0045,'TML'],
  SIH:['시우홍','兆康',22.4115,113.9788,'TML'],
  TUM:['툰문','屯門',22.3951,113.9732,'TML'],
  TUC:['퉁청','東涌',22.2892,113.9413,'TCL'],
  LAK:['라이킹','茘景',22.3483,114.1262,'TCL TWL'],
  OLY:['올림픽','奧運',22.3178,114.1603,'TCL'],
  POA:['포람','寶琳',22.3226,114.2579,'TKL'],
  HAH:['항하우','坑口',22.3157,114.2643,'TKL'],
  TKO:['청콴오','將軍澳',22.3074,114.26,'TKL'],
  LHP:['로하스파크','康城',22.2956,114.2687,'TKL'],
  TSW:['췐완','荃灣',22.3735,114.1181,'TWL'],
  TWH:['타이워하우','大窩口',22.3708,114.125,'TWL'],
  KWH:['콰이힝','葵興',22.3631,114.1312,'TWL'],
  KWF:['콰이퐁','葵芳',22.3568,114.1278,'TWL'],
  LCK:['라이치콕','茘枝角',22.3373,114.148,'TWL'],
  CSW:['청사완','長沙灣',22.3356,114.156,'TWL'],
  SSP:['삼수이포','深水埗',22.3309,114.1621,'TWL'],
  JOR:['조던','佐敦',22.3048,114.1716,'TWL'],
  TST:['침사추이','尖沙咀',22.2977,114.1722,'TWL'],
  OCP:['오션파크','海洋公園',22.2487,114.1743,'SIL'],
  WCH:['웡축항','黃竹坑',22.248,114.168,'SIL'],
  LET:['레이퉁','利東',22.2418,114.156,'SIL'],
  SOH:['사우스호라이즌','海怡半島',22.2428,114.1488,'SIL']
};
export const MTR_STATIONS = Object.fromEntries(Object.entries(RAW).map(([k, [ko, zh, lat, lng, l]]) => [k, { code:k, ko, zh, lat, lng, lines:l.split(' ') }]));
export const stationKo = code => MTR_STATIONS[code] ? `${MTR_STATIONS[code].ko}역` : String(code || '');
// 약도에 그릴 MTR 노선 → [{ line, color, pts:[[lat,lng]…] }]
export const mtrPaths = () => MTR_ROUTES.map(r => ({ line:r.line, color:MTR_LINES[r.line].color, pts:r.seq.map(c => [MTR_STATIONS[c].lat, MTR_STATIONS[c].lng]) }));

const km = (a, b) => {
  const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
  return 6371 * Math.hypot(x, y);
};
// 좌표에서 가까운 역 n곳 (가까운 순, km). maxKm보다 먼 역은 뺌
export function nearStations(pt, n = 5, maxKm = Infinity){
  if(!pt || !Number.isFinite(+pt.lat) || !Number.isFinite(+pt.lng)) return [];
  const p = { lat:+pt.lat, lng:+pt.lng };
  return Object.values(MTR_STATIONS).map(s => ({ code:s.code, km:km(p, s) })).filter(x => x.km <= maxKm)
    .sort((a, b) => a.km - b.km).slice(0, n);
}
// 거리 한마디: 0.35 → '약 350m', 1.24 → '약 1.2km'
export const distText = k => k < 1 ? `약 ${Math.max(50, Math.round(k * 20) * 50)}m` : `약 ${Math.round(k * 10) / 10}km`;

// 요청 주소. 모르는 노선·역이거나 그 노선에 없는 역이면 ''
export function mtrUrl(line, sta){
  const s = MTR_STATIONS[sta]; if(!MTR_LINES[line] || !s || !s.lines.includes(line)) return '';
  return `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?${new URLSearchParams({ line, sta })}`;
}

// 'YYYY-MM-DD HH:mm:ss' → 분 단위 비교용 초 (같은 시간대끼리 빼기만 함)
function secs(t){
  const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/); if(!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000;
}
const hm = t => { const m = String(t || '').match(/ (\d{2}:\d{2})/); return m ? m[1] : ''; };
const uniq = a => a.filter((x, i) => a.indexOf(x) === i);

// 답 글 → { ok:true, line, sta, at:'14:16', delay, dirs:[{ dir, dests:['CHW'], plat, trains:[{ min, time, plat, dest, rac, dep }] }] }
//   | { ok:false, line, sta, err:'alert'(특별 운행 안내: msg·url) | 'none'(지금 열차 정보 없음) | 'bad'(못 읽음) }
//   이미 떠난 열차(1분 넘게 지난 것)는 빼고, 방향마다 3대까지
export function parseNextTrain(text, line, sta){
  const base = { ok:false, line, sta };
  let j; try{ j = JSON.parse(String(text || '')); }catch(e){ return { ...base, err:'bad' }; }
  if(!j || typeof j !== 'object') return { ...base, err:'bad' };
  if(+j.status !== 1){
    const msg = String(j.message || (j.error && j.error.errorMsg) || '').replace(/Please click here for more information\.?/i, '').trim();
    const code = String((j.error && j.error.errorCode) || '');
    if(code === 'NT-204' || /contents are empty/i.test(msg) || !msg) return { ...base, err:'none' };
    const url = /^https:\/\/([a-z0-9-]+\.)*mtr\.com\.hk\//i.test(String(j.url || '')) ? String(j.url) : '';
    return { ...base, err:'alert', msg:msg.slice(0, 300), url };
  }
  const d = j.data && j.data[`${line}-${sta}`];
  if(!d || typeof d !== 'object') return { ...base, err:j.data ? 'none' : 'bad' };
  const now = secs(d.curr_time) ?? secs(j.curr_time);
  if(now == null) return { ...base, err:'none' };   // 자료가 없을 때 시각이 '-'로 옴
  const dirs = ['UP', 'DOWN'].map(dir => {
    const trains = (Array.isArray(d[dir]) ? d[dir] : []).map(t => {
      const at = secs(t.time); if(at == null) return null;
      const diff = at - now; if(diff < -60) return null;
      return { min:Math.max(0, Math.floor(diff / 60)), time:hm(t.time), plat:String(t.plat || ''), dest:String(t.dest || ''),
        rac:String(t.route || '') === 'RAC', dep:String(t.timeType || t.timetype || '') === 'D' };
    }).filter(Boolean).sort((a, b) => a.min - b.min).slice(0, 3);
    if(!trains.length) return null;
    const plats = uniq(trains.map(t => t.plat).filter(Boolean));
    return { dir, dests:uniq(trains.map(t => t.dest).filter(Boolean)), plat:plats.length === 1 ? plats[0] : '', trains };
  }).filter(Boolean);
  if(!dirs.length) return { ...base, err:'none' };
  return { ok:true, line, sta, at:hm(d.curr_time) || hm(j.curr_time), delay:String(j.isdelay || '') === 'Y', dirs };
}

// 몇 분 뒤 한마디: 0 → '곧 도착'(출발역이면 '곧 출발'), 3 → '3분 뒤'
export const waitText = t => t.min <= 0 ? (t.dep ? '곧 출발' : '곧 도착') : `${t.min}분 뒤`;
// 방향 이름: '차이완 방면' (행선지가 여럿이면 '로우·록마차우 방면')
export const dirText = r => `${r.dests.map(c => MTR_STATIONS[c] ? MTR_STATIONS[c].ko : c).join('·') || '이 노선'} 방면`;

export const MTR_ERR = {
  none:'지금은 열차 정보가 없어요. 첫차 전이거나 막차가 끝났을 수 있어요.',
  alert:'MTR 특별 운행 안내가 있어요.',
  busy:'잠깐 사이에 너무 많이 물어봤어요. 10초쯤 뒤에 다시 눌러 주세요.',
  server:'MTR 열차 정보를 지금 못 받아요. 잠시 후 다시 눌러 주세요.',
  bad:'열차 정보를 못 읽었어요. 잠시 후 다시 눌러 주세요.',
  net:'열차 정보를 못 불러왔어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'
};
