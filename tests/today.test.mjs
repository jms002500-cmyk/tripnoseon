// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { phaseOf, dayToShow, shouldAutoOpen, nextStopIndex, fromFor, dayVault, dayWeather, phaseText, doneKey } from '../js/today.js';
import { SHARED_KEYS } from '../js/sharecore.js';

const trip = extra => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11' }, extra);

test('여행 날짜 기준 지금 위치', () => {
  assert.deepEqual(phaseOf(trip(), '2027-02-25'), { phase:'before', index:-1, dday:10, n:5 });
  assert.deepEqual(phaseOf(trip(), '2027-03-09'), { phase:'during', index:2, dday:0, n:5 });
  assert.equal(phaseOf(trip(), '2027-03-12').phase, 'after');
  assert.equal(phaseOf(clone(DEFAULT), '2027-03-09').phase, 'none');
  assert.equal(phaseOf(trip({ start:'2026-12-30', end:'2027-01-02' }), '2027-01-01').index, 2);   // 해 넘김
});

test('보여 줄 날: 고른 날 > 오늘 > 첫날/마지막 날', () => {
  const s = trip();
  assert.equal(dayToShow(s, '2027-03-09', null, 5), 2);
  assert.equal(dayToShow(s, '2027-03-09', 4, 5), 4);
  assert.equal(dayToShow(s, '2027-03-09', 9, 5), 2);       // 없는 날을 고르면 오늘
  assert.equal(dayToShow(s, '2027-02-01', null, 5), 0);
  assert.equal(dayToShow(s, '2027-04-01', null, 5), 4);
  assert.equal(dayToShow(s, '2027-03-09', null, 0), -1);
});

test('여행 중 첫 실행에만 자동으로 열림', () => {
  assert.equal(shouldAutoOpen(trip(), '2027-03-09'), true);
  assert.equal(shouldAutoOpen(trip({ todayOpened:'2027-03-09' }), '2027-03-09'), false);
  assert.equal(shouldAutoOpen(trip({ todayOpened:'2027-03-08' }), '2027-03-09'), true);
  assert.equal(shouldAutoOpen(trip(), '2027-02-01'), false);
});

test('다음 장소와 길찾기 출발점', () => {
  const stops = [{ id:'a' }, { id:'b' }, { id:'c' }]; const hotel = { id:'H' };
  assert.equal(nextStopIndex(stops, '2027-03-09', {}), 0);
  const done = { [doneKey('2027-03-09', 'a')]:true };
  assert.equal(nextStopIndex(stops, '2027-03-09', done), 1);
  assert.equal(nextStopIndex(stops, '2027-03-10', done), 0);                 // 날짜마다 따로
  assert.equal(nextStopIndex(stops, '2027-03-09', Object.assign({ '2027-03-09|b':true, '2027-03-09|c':true }, done)), -1);
  assert.equal(fromFor(stops, 0, hotel).id, 'H');
  assert.equal(fromFor(stops, 2, hotel).id, 'b');
});

test('그날 예약: 그날 날짜 + 그날 장소에 연결된 날짜 없는 것, 시간순', () => {
  const v = [
    { id:'1', kind:'ticket', title:'디즈니', date:'', placeId:'tdl' },
    { id:'2', kind:'flight', title:'가는 편', date:'2027-03-07', time:'08:30' },
    { id:'3', kind:'ticket', title:'팀랩', date:'2027-03-09', time:'15:00' },
    { id:'4', kind:'ticket', title:'시부야 스카이', date:'2027-03-09', time:'10:00' },
    { id:'5', kind:'insurance', title:'보험', date:'' }
  ];
  assert.deepEqual(dayVault(v, '2027-03-09', ['shibuyasky']).map(x => x.id), ['4', '3']);
  assert.deepEqual(dayVault(v, '2027-03-10', ['tdl']).map(x => x.id), ['1']);
  assert.deepEqual(dayVault([], '2027-03-09', []), []);
});

test('그날 날씨: 예보 우선, 없으면 이맘때 평균', () => {
  const wx = { climate:{ hi:12.1, lo:3.4, mean:7.8, rainPct:20 }, forecast:[{ date:'2027-03-09', text:'흐림', hi:11, lo:5, rain:30 }] };
  assert.deepEqual(dayWeather(wx, '2027-03-09'), { kind:'forecast', text:'흐림', hi:11, lo:5, rain:30 });
  assert.equal(dayWeather(wx, '2027-03-10').kind, 'climate');
  assert.equal(dayWeather(null, '2027-03-10'), null);
});

test('머리 문구', () => {
  assert.equal(phaseText({ phase:'before', dday:10, n:5 }, 0), '출발 D-10 · 1일차 미리 보기');
  assert.equal(phaseText({ phase:'during', index:2, n:5 }, 2), '여행 3일째 · 5일 중');
  assert.equal(phaseText({ phase:'during', index:2, n:5 }, 3), '오늘은 3일차 · 4일차를 보고 있어요');
});

test('다녀옴 표시와 화면 상태는 공유하지 않음', () => {
  ['tdone', 'todayOpened', 'mode', 'tday'].forEach(k => assert.ok(!SHARED_KEYS.includes(k)));
  assert.deepEqual(clone(DEFAULT).tdone, {});
});
