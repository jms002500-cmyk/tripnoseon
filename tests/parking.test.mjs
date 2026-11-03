// 공항 주차장 남은 자리: 공항 짐작 · 키 다듬기 · 답 읽기 · 붐빔 정도
import test from 'node:test';
import assert from 'node:assert/strict';
import { guessKap, moveKap, cleanKey, parkUrl, parseParking, xmlItems, crowdOf, krAirport } from '../js/parking.js';

const ICN1 = krAirport('ICN1'), ICN2 = krAirport('ICN2'), GMP = krAirport('GMP');

test('도착 이름으로 공항 짐작', () => {
  assert.equal(guessKap('인천공항 2터미널'), 'ICN2');
  assert.equal(guessKap('인천공항 T1'), 'ICN1');
  assert.equal(guessKap('인천공항'), '');          // 터미널을 모르면 고르게
  assert.equal(guessKap('김포공항 국제선'), 'GMP');
  assert.equal(guessKap('김해공항'), 'PUS');
  assert.equal(guessKap(''), '');
});

test('인증키: 인코딩 키는 풀고, 주소에 한 번만 인코딩', () => {
  assert.equal(cleanKey(' abc%2Bdef%3D%3D '), 'abc+def==');
  assert.equal(cleanKey('abc+def=='), 'abc+def==');
  const u = parkUrl(ICN1, 'abc%2Bdef%3D%3D');
  assert.ok(u.startsWith('https://apis.data.go.kr/B551177/StatusOfParking/getTrackingParking?'));
  assert.ok(u.includes('serviceKey=abc%2Bdef%3D%3D'));
  assert.ok(parkUrl(GMP, 'k').startsWith('https://apis.data.go.kr/B551178/parking-realtime-status/info?'));
});

const ICN_JSON = JSON.stringify({ response:{ header:{ resultCode:'00', resultMsg:'NORMAL SERVICE.' }, body:{ items:[
  { floor:'T1 단기주차장지하1층', parking:'900', parkingarea:'1000', datetm:'20261206071530.000' },
  { floor:'T1 장기 P1 주차장', parking:'1500', parkingarea:'3000', datetm:'20261206071530.000' },
  { floor:'T2 단기주차장 지상층', parking:'1210', parkingarea:'1200', datetm:'20261206071530.000' }
], numOfRows:100, pageNo:1, totalCount:3 } } });

test('인천: 터미널별로 거르고 남은 자리 = 면수 − 서 있는 차 (넘치면 0)', () => {
  const a = parseParking(ICN1, ICN_JSON);
  assert.equal(a.ok, true); assert.equal(a.at, '12/6 07:15');
  assert.deepEqual(a.rows, [
    { name:'단기주차장 지하1층', used:900, total:1000, free:100 },
    { name:'장기 P1 주차장', used:1500, total:3000, free:1500 }
  ]);
  const b = parseParking(ICN2, ICN_JSON);
  assert.deepEqual(b.rows, [{ name:'단기주차장 지상층', used:1210, total:1200, free:0 }]);
  // items.item 모양이어도
  const c = parseParking(ICN1, JSON.stringify({ response:{ header:{ resultCode:'00' }, body:{ items:{ item:{ floor:'T1 단기주차장 지상층', parking:'10', parkingarea:'100' } } } } }));
  assert.equal(c.rows[0].free, 90);
});

test('한국공항공사: 공항 이름으로 거름, 화물 주차장 뺌(여객 겸용은 둠), XML 답도 읽음', () => {
  const j = JSON.stringify({ response:{ header:{ resultCode:'00' }, body:{ items:{ item:[
    { aprKor:'김포국제공항', aprEng:'GIMPO', parkingAirportCodeName:'국내선 제1주차장', parkingFullSpace:'2,500', parkingIstay:'2400', parkingGetdate:'2026-12-06', parkingGettime:'07:20:00' },
    { aprKor:'김포국제공항', parkingAirportCodeName:'화물청사', parkingFullSpace:737, parkingIstay:737 },
    { aprKor:'김해국제공항', parkingAirportCodeName:'P3 여객(화물)', parkingFullSpace:878, parkingIstay:831 }
  ] } } } });
  const g = parseParking(GMP, j);
  assert.equal(g.ok, true); assert.equal(g.at, '12/6 07:20');
  assert.deepEqual(g.rows, [{ name:'국내선 제1주차장', used:2400, total:2500, free:100 }]);
  assert.deepEqual(parseParking(krAirport('PUS'), j).rows, [{ name:'P3 여객(화물)', used:831, total:878, free:47 }]);
  const x = `<response><header><resultCode>00</resultCode></header><body><items>
    <item><aprKor>김포국제공항</aprKor><parkingAirportCodeName>국제선 주차장</parkingAirportCodeName><parkingFullSpace>1000</parkingFullSpace><parkingIstay>250</parkingIstay></item>
  </items></body></response>`;
  assert.equal(xmlItems(x).length, 1);
  assert.deepEqual(parseParking(GMP, x).rows, [{ name:'국제선 주차장', used:250, total:1000, free:750 }]);
});

test('잘못된 답: 키 · 한도 · 자료 없음 · 깨진 글', () => {
  const notReg = JSON.stringify({ OpenAPI_ServiceResponse:{ cmmMsgHeader:{ errMsg:'SERVICE_KEY_IS_NOT_REGISTERED_ERROR', returnReasonCode:'30' } } });
  assert.deepEqual(parseParking(ICN1, notReg), { ok:false, err:'key' });
  const limit = JSON.stringify({ OpenAPI_ServiceResponse:{ cmmMsgHeader:{ errMsg:'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR', returnReasonCode:'22' } } });
  assert.deepEqual(parseParking(ICN1, limit), { ok:false, err:'limit' });
  assert.deepEqual(parseParking(ICN1, '<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>'), { ok:false, err:'key' });
  assert.deepEqual(parseParking(GMP, ICN_JSON), { ok:false, err:'none' });   // 김포 줄이 없음
  assert.deepEqual(parseParking(ICN1, JSON.stringify({ response:{ header:{ resultCode:'99' }, body:{} } })), { ok:false, err:'bad' });
  assert.deepEqual(parseParking(ICN1, 'Unexpected errors'), { ok:false, err:'bad' });
  assert.deepEqual(parseParking(ICN1, '{깨진'), { ok:false, err:'bad' });
});

test('붐빔 정도', () => {
  assert.equal(crowdOf({ free:0, total:100 }).k, 'full');
  assert.equal(crowdOf({ free:3, total:100 }).k, 'full');
  assert.equal(crowdOf({ free:10, total:100 }).k, 'busy');
  assert.equal(crowdOf({ free:30, total:100 }).k, 'mid');
  assert.equal(crowdOf({ free:60, total:100 }).k, 'ok');
});

test('이동의 공항: 고른 공항 먼저, 집 → 공항은 도착 이름, 공항 → 집은 출발 이름으로 짐작', () => {
  assert.equal(moveKap({ k:'go', from:'김포 집', to:'인천공항 2터미널' }), 'ICN2');
  assert.equal(moveKap({ k:'back', from:'인천공항 T1', to:'김포 집' }), 'ICN1');   // 집 이름(김포)을 공항으로 보지 않음
  assert.equal(moveKap({ k:'back', from:'', to:'광주 집' }), '');
  assert.equal(moveKap({ k:'back', kap:'GMP', from:'인천공항 T1' }), 'GMP');
  assert.equal(moveKap(null), '');
});

test('엉뚱한 답(게이트웨이 오류 HTML·JSON)은 빈 목록이 아니라 못 읽은 답', () => {
  assert.deepEqual(parseParking(ICN1, '<html><body><h1>502 Bad Gateway</h1></body></html>'), { ok:false, err:'bad' });
  assert.deepEqual(parseParking(ICN1, '<!DOCTYPE html><html><head><title>Error</title></head></html>'), { ok:false, err:'bad' });
  assert.deepEqual(parseParking(ICN1, JSON.stringify({ message:'Internal Server Error' })), { ok:false, err:'bad' });
  // 정상 답에 자료가 없으면 그대로 '자료 없음'
  assert.deepEqual(parseParking(ICN1, '<response><header><resultCode>00</resultCode></header><body><items/></body></response>'), { ok:false, err:'none' });
  assert.deepEqual(parseParking(ICN1, JSON.stringify({ response:{ header:{ resultCode:'00' }, body:{ items:'' } } })), { ok:false, err:'none' });
});
