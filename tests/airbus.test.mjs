// 공항버스: 주소 · 시각 읽기 · 답 읽기(인천 터미널별, 한국공항공사) · 동네로 찾기 · 다음 차
import test from 'node:test';
import assert from 'node:assert/strict';
import { busUrl, timesOf, phoneOf, parseBuses, findBuses, busByNo, isWeekend, nextTimes, gapOf, hhmm } from '../js/airbus.js';
import { krAirport } from '../js/parking.js';

const ICN1 = krAirport('ICN1'), ICN2 = krAirport('ICN2'), GMP = krAirport('GMP');

test('주소: 인천은 지역, 한국공항공사는 공항 코드·쪽', () => {
  const a = busUrl(ICN1, 'k%2B1', '1');
  assert.ok(a.startsWith('https://apis.data.go.kr/B551177/BusInformation/getBusInfo?'));
  assert.ok(a.includes('serviceKey=k%2B1') && a.includes('area=1') && a.includes('type=json'));
  assert.ok(!busUrl(ICN1, 'k', '').includes('area='));
  assert.ok(!busUrl(ICN1, 'k', '9').includes('area='));
  const g = busUrl(GMP, 'k', '', 2);
  assert.ok(g.startsWith('https://apis.data.go.kr/B551178/airport-bus/info?') && g.includes('schAirport=GMP') && g.includes('pageNo=2') && g.includes('numOfRows=100'));
});

test('시각·전화 읽기', () => {
  assert.deepEqual(timesOf('0549, 0614, 0644'), [349, 374, 404]);
  assert.deepEqual(timesOf('8:00 / 8:40 / 22:30 / 8:00'), [480, 520, 1350]);
  assert.deepEqual(timesOf('*20.9.29(화)부터 시간변경 *\r\n8:00 / 9:15'), [480, 555]);
  assert.deepEqual(timesOf(null), []);
  assert.equal(phoneOf('대한공항리무진(02-2664-9898)'), '0226649898');
  assert.equal(phoneOf('KAL리무진 02)2667-0386'), '0226670386');
  assert.equal(phoneOf('도심공항리무진 1588-7946'), '15887946');
  assert.equal(phoneOf(''), '');
});

const ICN = JSON.stringify({ response:{ header:{ resultCode:'00' }, body:{ totalCount:3, items:[
  { area:'1', busnumber:'6100(수락/노원/망우)', adultfare:'18000', busclass:'우등', cpname:'한국도심공항(02-551-0077~8)',
    t1wdayt:'0555, 0620, 0645, 0710', t1wt:'0600, 0700', t2wdayt:'0535, 0600', t2wt:null,
    routeinfo:'인천공항2터미널, 인천공항1터미널, 수락터미널(도심공항), 노원역, 중계역', t1ridelo:'1F : 4B', t2ridelo:'B1F : 22' },
  { area:'1', busnumber:'6003(대림역)', adultfare:'16,000', busclass:'우등', cpname:'대한공항리무진(02-2664-9898)',
    t1wdayt:'0549, 0614', t1wt:'0549, 0614', t2wdayt:null, t2wt:null, routeinfo:'인천공항1터미널, 발산역, 대림역', t1ridelo:'1F : 6A', t2ridelo:null },
  { area:'7', busnumber:null, adultfare:'27900', t1wdayt:null, routeinfo:null }
] } } });

test('인천: 고른 터미널 시간표만, 그 터미널에 안 서는 버스는 뺌, 주말이 없으면 평일로', () => {
  const a = parseBuses(ICN1, ICN);
  assert.equal(a.ok, true); assert.equal(a.total, 3); assert.equal(a.buses.length, 2);
  const b = a.buses[0];
  assert.equal(b.no, '6100(수락/노원/망우)'); assert.equal(b.fare, 18000); assert.equal(b.tel, '025510077'); assert.equal(b.ride, '1F : 4B');
  assert.deepEqual(b.wd, [355, 380, 405, 430]); assert.deepEqual(b.we, [360, 420]);
  assert.deepEqual(b.stops.slice(2), ['수락터미널(도심공항)', '노원역', '중계역']);
  assert.equal(a.buses[1].fare, 16000);
  const t2 = parseBuses(ICN2, ICN);
  assert.deepEqual(t2.buses.map(x => x.no), ['6100(수락/노원/망우)']);
  assert.deepEqual(t2.buses[0].we, [335, 360]);   // 주말 칸이 비면 평일 시간표
  assert.equal(t2.buses[0].ride, 'B1F : 22');
});

test('한국공항공사: 노선·타는 곳·첫차·막차·안내 글', () => {
  const j = JSON.stringify({ response:{ header:{ resultCode:'00' }, body:{ totalCount:2, items:{ item:[
    { BUS_CATEGORY_KOR_NAME:'리무진버스', BUS_DATA_GETON_KOR:'국내선: 5번', BUS_DATA_BUS_NUM:'수락, 노원행(6101)', BUS_DATA_MONEY:'7,500', BUS_DATA_CARD:null,
      BUS_DATA_ROUTE_KOR:'김포공항 국내선 -수락터미널- 노일초교 -마들역- 노원역', BUS_DATA_FIRST_TIME:'08:00', BUS_DATA_END_TIME:'22:30', BUS_DATA_COMNAME_KOR:'도심공항리무진 1588-7946', BUS_DATA_ETC_KOR:'8:00 / 8:40' },
    { BUS_CATEGORY_KOR_NAME:'시내버스', BUS_DATA_GETON_KOR:'국제선: 2번', BUS_DATA_BUS_NUM:'22(고촌, 사우고, 양곡)', BUS_DATA_MONEY:'1,500', BUS_DATA_CARD:'1,400',
      BUS_DATA_ROUTE_KOR:'김포공항 국제선 - 한국공항공사 - 고촌', BUS_DATA_FIRST_TIME:'04:40', BUS_DATA_END_TIME:'24:50', BUS_DATA_COMNAME_KOR:'선진여객 031)983-8133', BUS_DATA_ETC_KOR:'약 12~15분 간격 운행' }
  ] } } } });
  const a = parseBuses(GMP, j);
  assert.equal(a.ok, true); assert.equal(a.total, 2);
  const b = a.buses[0];
  assert.equal(b.no, '수락, 노원행(6101)'); assert.equal(b.fare, 7500); assert.equal(b.card, 0); assert.equal(b.first, '08:00'); assert.equal(b.last, '22:30');
  assert.deepEqual(b.stops, ['김포공항 국내선', '수락터미널', '노일초교', '마들역', '노원역']);
  assert.equal(b.tel, '15887946'); assert.equal(a.buses[1].card, 1400);
});

test('동네·번호로 찾기: 모든 단어가 맞아야, 번호가 같으면 맨 앞', () => {
  const B = parseBuses(ICN1, ICN).buses;
  assert.deepEqual(findBuses(B, '노원역').map(b => b.no), ['6100(수락/노원/망우)']);
  assert.deepEqual(findBuses(B, '노원역').map(b => b.hits), [['노원역']]);
  assert.deepEqual(findBuses(B, '6003').map(b => [b.no, b.exact]), [['6003(대림역)', true]]);
  assert.deepEqual(findBuses(B, '인천공항1터미널 대림').map(b => b.no), ['6003(대림역)']);
  assert.deepEqual(findBuses(B, '부산'), []);
  assert.deepEqual(findBuses(B, '  '), []);
  assert.equal(busByNo(B, '6003(대림역)').fare, 16000); assert.equal(busByNo(B, '없음'), null);
});

test('주말 · 다음 차 · 보통 간격', () => {
  assert.equal(isWeekend('2026-12-05'), true);    // 토
  assert.equal(isWeekend('2026-12-07'), false);   // 월
  assert.equal(isWeekend(''), false);
  assert.deepEqual(nextTimes([355, 380, 405, 430], 380, 2), [380, 405]);
  assert.deepEqual(nextTimes([355], 400), []);
  assert.equal(gapOf([355, 380, 405, 440]), 25); assert.equal(gapOf([355, 380]), null);
  assert.equal(hhmm(355), '05:55'); assert.equal(hhmm(1490), '00:50');
});
