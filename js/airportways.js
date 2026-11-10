// 공항 오가는 길 추천 방법 (2026-11-10 사용자 요청: 집 ↔ 공항, 공항 ↔ 숙소를 버스·택시·예약 차량 등으로 하나씩 정하게)
//   구간(go 집→공항 · in 공항→숙소 · out 숙소→공항 · back 공항→집)·공항·숙소 도시에 맞는 방법을 카드로 보여 주고,
//   고르면 오가는 길(s.moves)의 수단(how)을 정함. 값은 공식 누리집·앱의 지역 안내(js/regions/hksz-guide.js)에서 확인한 것만.
//   순수 함수(테스트 대상)
import { TRANSPORT } from './regions/hksz-guide.js';
export const WAYS_CHECKED = '2026-11-10';
const g = key => ((TRANSPORT || []).find(x => x.key === key) || {}).text || '';
const LINK = {
  arex:'https://www.arex.or.kr/', icnbus:'https://www.airport.kr/ap_ko/976/subview.do',
  mtrae:'https://www.mtr.com.hk/en/customer/services/airport_express_index.html',
  hkmainland:'https://www.hongkongairport.com/en/transport/mainland-connection/hk-sz-airports-link.page'
};

// → [{ how, title, text, link? }]  where: { ap:'HKG'|'SZX'|'NRT'…, city:'hk'|'sz'|'' (숙소 도시), region:'hksz'|'tokyo' }
export function airportWays(k, where){
  const w = where || {};
  if(k === 'go' || k === 'back') return [
    { how:'rail', title:'공항철도 (AREX)', text:'서울역에서 직통열차는 인천공항 1터미널까지 43분·2터미널까지 51분(어른 9,500원, 30~40분마다), 일반열차는 59~66분. 타는 항공사의 터미널을 꼭 확인하세요.', link:LINK.arex },
    { how:'abus', title:'공항버스 (리무진)', text:'동네 정류장에서 짐을 싣고 바로 가요. 고르면 아래에서 우리 동네를 지나는 버스와 시간을 찾을 수 있어요.', link:LINK.icnbus },
    { how:'car', title:'자가용', text:'고르면 인천·김포공항 주차장 남은 자리를 앱에서 볼 수 있어요. 여행 기간만큼 장기 주차요금이 들어요.' },
    { how:'taxi', title:'택시·콜택시', text:'짐이 많거나 새벽 비행기일 때 편해요. 나서는 시각에 맞춰 미리 불러 두세요.' },
    { how:'pick', title:'공항 픽업·샌딩 예약', text:'예약한 차로 가요. 예약했으면 \'예약했어요\'를 켜고 바우처는 보관함에 넣어 두세요.' }
  ];
  if(k !== 'in' && k !== 'out') return [];   // 여행 중 이동은 추천 없음
  if(w.region === 'hksz' && w.ap === 'SZX') return [
    { how:'metro', title:'지하철 11호선', text:'공항 지상교통센터(GTC)의 공항역에서 타요. 푸톈까지 30분대, 10분쯤마다 다녀요. 요금이 가장 싸요. 짐이 많으면 갈아타는 역 계단을 조심하세요.' },
    { how:'taxi', title:'택시·디디(DiDi)', text:'지상교통센터(GTC)의 택시·디디 승강장에서 타요. 시내까지 40~60분, 막히면 더 걸려요. 숙소 한자 주소를 보여 주세요(긴급 화면의 숙소 카드).' },
    { how:'pick', title:'픽업 차량 예약', text:'예약했으면 \'예약했어요\'를 켜고 기사님 만나는 곳을 메모에 적어 두세요. 바우처는 보관함에.' }
  ];
  if(w.region === 'hksz' && w.city === 'sz') return [
    { how:'abus', title:'국경 넘는 공항 버스·리무진', text:'홍콩공항 터미널 2 코치 홀(2025년 9월 23일부터)에서 선전 가는 버스·리무진 표를 사요. 국경에서 출입국 심사를 거쳐요(가족 모두 여권).', link:LINK.hkmainland },
    { how:'pick', title:'국경 넘는 픽업 차량 예약', text:'숙소 앞까지 가는 예약 차량이에요. 국경 심사 방법이 차량마다 달라서 예약할 때 물어보세요. 바우처는 보관함에.' },
    { how:'rail', title:'공항철도·MTR + 걸어서 국경', text:'MTR로 국경역(로우·록마차우)까지 가서 걸어서 넘고 선전 지하철로 갈아타요. 싸지만 짐이 많으면 힘들어요.', link:LINK.mtrae }
  ];
  if(w.region === 'hksz') return [
    { how:'rail', title:'공항철도 (Airport Express)', text:g('hkAel') || '공항에서 칭이·구룡·홍콩역까지 가요. 가장 빨라요.', link:LINK.mtrae },
    { how:'abus', title:'공항버스 A21·A11', text:g('hkAirBus') || 'A21은 침사추이·몽콕 쪽, A11은 센트럴·코즈웨이베이 쪽으로 가요.' },
    { how:'bus', title:'S1 버스 + 지하철 (가장 싸요)', text:g('hkS1') || 'S1 버스로 퉁청역까지 가서 MTR로 갈아타요.' },
    { how:'taxi', title:'택시·우버', text:[g('hkTaxi'), g('hkUber')].filter(Boolean).join(' ') || '목적지는 한자 주소로 보여 주세요.' },
    { how:'pick', title:'픽업 차량 예약', text:'예약했으면 \'예약했어요\'를 켜고 기사님 만나는 곳(도착층 출구 등)을 메모에. 바우처는 보관함에.' }
  ];
  if(w.region === 'tokyo') return [
    { how:'rail', title:'공항 열차 (스카이라이너·N\'EX·게이큐)', text:'공항에서 시내까지 가장 빨라요. 고르면 아래에 시간표·예약 바로가기가 붙어요.' },
    { how:'abus', title:'공항 리무진 버스', text:'짐을 싣고 호텔·큰 역 앞까지 가요. 고르면 아래에 시간표가 붙어요.' },
    { how:'taxi', title:'택시', text:'짐이 많고 가족이 함께면 편하지만 비싸요.' },
    { how:'pick', title:'픽업 차량 예약', text:'예약했으면 \'예약했어요\'를 켜고 바우처는 보관함에.' }
  ];
  return [];
}
