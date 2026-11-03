// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { roundLoc, shouldSend, canShareLoc, locExpired, ageText, locList, kmText, locMapUrl, expiredLocs, locToday } from '../js/loc.js';
import { ymd } from '../js/weather.js';

test('올릴 위치는 약 10m로 줄임', () => {
  assert.deepEqual(roundLoc({ latitude:35.714765, longitude:139.796655, accuracy:23.6 }), { lat:35.7148, lng:139.7967, acc:24 });
  assert.equal(roundLoc({ latitude:NaN, longitude:1 }), null);
  assert.equal(roundLoc(null), null);
  assert.equal(roundLoc({ latitude:1, longitude:2, accuracy:99999 }).acc, 5000);
});

test('움직였거나 2분 지났을 때만 올림', () => {
  const a = { lat:35.7148, lng:139.7967 };
  assert.ok(shouldSend(null, a, 0));
  assert.ok(!shouldSend(null, null, 0));
  const last = Object.assign({ t:0 }, a);
  assert.ok(!shouldSend(last, { lat:35.7149, lng:139.7967 }, 60000));          // 약 11m, 1분
  assert.ok(shouldSend(last, { lat:35.7149, lng:139.7967 }, 120000));          // 2분
  assert.ok(shouldSend(last, { lat:35.7160, lng:139.7967 }, 30000));           // 약 130m
  assert.ok(!shouldSend(last, { lat:35.7300, lng:139.7967 }, 10000));          // 20초 안에는 안 올림
});

test('함께 짜기 여행·마지막 날까지만', () => {
  const s = { shareId:'t1', end:'2027-03-11', locOn:true };
  assert.ok(canShareLoc(s, '2027-03-11'));
  assert.ok(!canShareLoc(s, '2027-03-12'));
  assert.ok(!canShareLoc({ end:'2027-03-11' }, '2027-03-08'));
  assert.ok(!canShareLoc({ shareId:'t1' }, '2027-03-08'));
  assert.ok(locExpired(s, '2027-03-12'));
  assert.ok(!locExpired(s, '2027-03-11'));
  assert.ok(!locExpired(Object.assign({}, s, { locOn:false }), '2027-03-12'));
});

test('몇 분 전', () => {
  assert.equal(ageText(20000), '방금');
  assert.equal(ageText(5 * 60000), '5분 전');
  assert.equal(ageText(3 * 3600000), '3시간 전');
  assert.equal(ageText(50 * 3600000), '2일 전');
  assert.equal(ageText(undefined), '');
});

test('가족 위치 목록: 나 먼저, 끝난 여행 빼기, 오래됨 표시, 거리', () => {
  const now = 10 * 3600000;
  const docs = [
    { uid:'b', name:'엄마', lat:35.71, lng:139.80, at:now - 40 * 60000, until:'2027-03-11' },
    { uid:'a', name:'나', lat:35.70, lng:139.80, at:now - 60000, until:'2027-03-11' },
    { uid:'c', name:'아이', lat:35.70, lng:139.79, at:now - 2 * 60000, until:'2027-03-11' },
    { uid:'d', name:'옛날', lat:35.70, lng:139.79, at:now, until:'2027-03-01' },
    { uid:'e', name:'이상', lat:'x', lng:1 }
  ];
  const L = locList(docs, { myUid:'a', today:'2027-03-09', now, me:{ lat:35.70, lng:139.80 } });
  assert.deepEqual(L.map(x => x.uid), ['a', 'c', 'b']);
  assert.ok(L[0].mine); assert.equal(L[0].km, null);
  assert.equal(L[1].ageText, '2분 전'); assert.ok(!L[1].stale);
  assert.ok(L[2].stale);
  assert.ok(L[2].km > 1 && L[2].km < 1.2);
});

test('거리·지도 링크', () => {
  assert.equal(kmText(null), '');
  assert.equal(kmText(0.123), '120m');
  assert.equal(kmText(0.001), '10m');
  assert.equal(kmText(2.34), '2.3km');
  assert.equal(locMapUrl({ lat:35.7, lng:139.8 }), 'https://www.google.com/maps/search/?api=1&query=35.7,139.8');
});

test('끝난 여행의 위치: 주인은 모두, 다른 사람은 자기 것만 지움', () => {
  const docs = [{ uid:'a', until:'2027-03-11' }, { uid:'b', until:'2027-03-11' }, { uid:'c', until:'2027-03-20' }, { uid:'d' }];
  assert.deepEqual(expiredLocs(docs, { today:'2027-03-12', myUid:'a', isOwner:true }), ['a', 'b']);
  assert.deepEqual(expiredLocs(docs, { today:'2027-03-12', myUid:'b', isOwner:false }), ['b']);
  assert.deepEqual(expiredLocs(docs, { today:'2027-03-11', myUid:'a', isOwner:true }), []);
  assert.deepEqual(expiredLocs(null, { today:'2027-03-12', myUid:'a', isOwner:true }), []);
});

test('위치 공유 날짜는 여행지 날짜: 폰 시계가 한국 시간이어도 홍콩 마지막 날 밤에 안 꺼짐', () => {
  const HK = 'Asia/Hong_Kong', KR = 'Asia/Seoul';
  const s = { shareId:'t1', start:'2027-03-07', end:'2027-03-11', locOn:true };
  const docs = [{ uid:'me', until:'2027-03-11' }, { uid:'mom', until:'2027-03-11' }];
  // 마지막 날 홍콩 23:30 = 한국 다음 날 00:30
  const late = new Date('2027-03-11T15:30:00Z');
  assert.equal(locToday(late, HK), '2027-03-11');
  assert.equal(locToday(late, KR), '2027-03-12');                 // 고치기 전(폰 날짜, 한국 시계)은 이 날짜라
  assert.ok(locExpired(s, locToday(late, KR)));                     //   마지막 날 밤 1시간 동안 꺼지고
  assert.deepEqual(expiredLocs(docs, { today:locToday(late, KR), myUid:'me', isOwner:true }), ['me', 'mom']);   //   주인 폰이 가족 위치까지 지웠음
  assert.ok(!locExpired(s, locToday(late, HK)) && canShareLoc(s, locToday(late, HK)));
  assert.deepEqual(expiredLocs(docs, { today:locToday(late, HK), myUid:'me', isOwner:true }), []);
  // 홍콩 자정이 지나면 끝남
  const after = new Date('2027-03-11T16:00:00Z');
  assert.equal(locToday(after, HK), '2027-03-12');
  assert.ok(locExpired(s, locToday(after, HK)) && !canShareLoc(s, locToday(after, HK)));
  // 첫날 전날 밤 홍콩 23:30(한국은 첫날 00:30): 출발 전에도 켤 수 있어서 어느 날짜든 같음
  const eve = new Date('2027-03-06T15:30:00Z');
  assert.equal(locToday(eve, HK), '2027-03-06');
  assert.ok(canShareLoc(s, locToday(eve, HK)) && !locExpired(s, locToday(eve, HK)));
  // 시간대를 모르면 폰 날짜
  const d = new Date(2027, 2, 9, 12, 0); assert.equal(locToday(d), ymd(d));
});
