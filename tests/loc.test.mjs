// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { roundLoc, shouldSend, canShareLoc, locExpired, ageText, locList, kmText, locMapUrl } from '../js/loc.js';

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
