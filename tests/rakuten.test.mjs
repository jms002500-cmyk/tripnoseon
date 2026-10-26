// 실행: npm test  (네트워크는 쓰지 않음. 응답은 지어낸 예시)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { partyParams, partyNote, vacantUrl, parseVacant, errorText, RK_URL } from '../js/rakuten.js';

const fam = kids => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids, start:'2027-03-07', end:'2027-03-11' });
const KEYS = { appId:'test-app-id', key:'pk_test' };

test('아이 나이 → 일본 학년 구분, 13살 이상은 어른', () => {
  assert.deepEqual(partyParams(fam([12])), { adultNum:2, upClassNum:1, lowClassNum:0, infantWithoutMBNum:0 });
  assert.deepEqual(partyParams(fam([14, 7, 3])), { adultNum:3, upClassNum:0, lowClassNum:1, infantWithoutMBNum:1 });
  assert.equal(partyParams(Object.assign(clone(DEFAULT), { who:'solo' })).adultNum, 1);
  assert.equal(partyNote(fam([12])), '어른 2명, 초등 고학년(10~12살) 1명');
});

test('요청 주소: 좌표 반경 검색과 숙소 번호 다시 조회', () => {
  const u1 = new URL(vacantUrl(KEYS, fam([12]), { pt:{ lat:35.711, lng:139.799 } }));
  assert.equal(u1.origin + u1.pathname, RK_URL);
  assert.equal(u1.searchParams.get('applicationId'), 'test-app-id');
  assert.equal(u1.searchParams.get('accessKey'), 'pk_test');
  assert.equal(u1.searchParams.get('checkinDate'), '2027-03-07');
  assert.equal(u1.searchParams.get('checkoutDate'), '2027-03-11');
  assert.equal(u1.searchParams.get('datumType'), '1');
  assert.equal(u1.searchParams.get('searchRadius'), '3');
  assert.equal(u1.searchParams.get('upClassNum'), '1');
  assert.equal(u1.searchParams.get('lowClassNum'), null);
  assert.equal(u1.searchParams.get('sort'), '+roomCharge');
  const u2 = new URL(vacantUrl(KEYS, fam([]), { hotelNos:['111', '222'] }));
  assert.equal(u2.searchParams.get('hotelNo'), '111,222');
  assert.equal(u2.searchParams.get('latitude'), null);
});

const basic = (no, extra) => ({ hotelBasicInfo: Object.assign({ hotelNo:no, hotelName:'ホテル' + no, nearestStation:'上野',
  reviewAverage:4.2, reviewCount:100, hotelMinCharge:8000, latitude:35.71, longitude:139.77, planListUrl:'https://travel.rakuten.co.jp/x' + no }, extra) });
const room = (total, breakfast) => ({ roomInfo:[ { roomBasicInfo:{ planName:'P', withBreakfastFlag:breakfast ? 1 : 0, reserveUrl:'https://r' } }, { dailyCharge:{ stayDate:'2027-03-07', rakutenCharge:total/3, total, chargeFlag:0 } } ] });

test('응답 읽기: formatVersion 2, 가장 싼 플랜의 1박 합계', () => {
  const json = { hotels:[ [ basic(111), room(30000, true), room(24000, false) ], [ basic(222) ] ] };
  const r = parseVacant(json);
  assert.equal(r.length, 2);
  assert.equal(r[0].hotelNo, '111'); assert.equal(r[0].price, 24000); assert.equal(r[0].priceIsPlan, true); assert.equal(r[0].breakfast, false);
  assert.equal(r[1].price, 8000); assert.equal(r[1].priceIsPlan, false);   // 플랜 요금이 없으면 최저가 목안
  assert.equal(r[0].lat, 35.71); assert.equal(r[0].url, 'https://travel.rakuten.co.jp/x111');
});

test('응답 읽기: formatVersion 1 모양(hotels[].hotel[])도 받음', () => {
  const json = { hotels:[ { hotel:[ basic(333), room(18000, true) ] } ] };
  const r = parseVacant(json);
  assert.equal(r[0].hotelNo, '333'); assert.equal(r[0].price, 18000); assert.equal(r[0].breakfast, true);
  assert.deepEqual(parseVacant({}), []);
});

test('오류 응답을 사용자 말로', () => {
  assert.equal(errorText(404, { error:'not_found' }).empty, true);
  assert.match(errorText(429, null).text, /잠시 후/);
  assert.match(errorText(403, { errors:{ errorCode:403, errorMessage:'REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING' } }).text, /허용된 웹사이트/);
  assert.match(errorText(401, { errors:{ errorCode:401, errorMessage:'Invalid accessKey' } }).text, /키가 맞지 않아요/);
  assert.match(errorText(400, { errors:{ errorCode:400, errorMessage:'wrong_parameter' } }).text, /날짜와 인원/);
});
