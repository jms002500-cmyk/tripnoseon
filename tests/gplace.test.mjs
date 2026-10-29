// 실행: npm test  (구글 응답 모양은 Places API (New) 문서 기준, 값은 지어냄)
import test from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, openAtPeriods, closedDays, matchKnown, toCustom, gmapsPlaceUrl } from '../js/gplace.js';
import { gdir } from '../js/ui.js';

const P = (d, oh, om, cd, ch, cm) => ({ open:{ day:d, hour:oh, minute:om }, close:{ day:cd, hour:ch, minute:cm } });
// 화~일 11:00-21:00 (월요일 휴무)
const TUE_SUN = [2, 3, 4, 5, 6, 0].map(d => P(d, 11, 0, d, 21, 0));

test('종류 → 장소 종류·실내·머무는 시간', () => {
  assert.deepEqual(kindOf(['museum', 'tourist_attraction']), { kind:'박물관·미술관', indoor:true, hours:2 });
  assert.equal(kindOf(['aquarium']).indoor, true);
  assert.equal(kindOf(['zoo']).indoor, false);
  assert.equal(kindOf(['ramen_restaurant', 'restaurant']).kind, '먹거리');
  assert.equal(kindOf(['buddhist_temple', 'tourist_attraction']).kind, '신사·절');
  assert.deepEqual(kindOf([]), { kind:'거리·시장', indoor:'part', hours:1.5 });
});

test('영업시간: 그 시간 영업·쉬는 요일·자정 넘김·24시간', () => {
  assert.equal(openAtPeriods(TUE_SUN, 2, '12:30'), true);
  assert.equal(openAtPeriods(TUE_SUN, 2, '22:00'), false);
  assert.equal(openAtPeriods(TUE_SUN, 1, '12:30'), false);           // 월요일
  assert.deepEqual(closedDays(TUE_SUN), [1]);
  const late = [P(5, 18, 0, 6, 2, 0)];                                 // 금 18시 ~ 토 2시
  assert.equal(openAtPeriods(late, 6, '01:00'), true);
  const sat = [P(6, 18, 0, 0, 1, 0)];                                  // 토 18시 ~ 일 1시 (주를 넘김)
  assert.equal(openAtPeriods(sat, 0, '00:30'), true);
  const allDay = [{ open:{ day:0, hour:0, minute:0 } }];
  assert.equal(openAtPeriods(allDay, 3, '03:00'), true); assert.deepEqual(closedDays(allDay), []);
  assert.equal(openAtPeriods(null, 3, '12:00'), null); assert.deepEqual(closedDays(undefined), []);
});

test('이미 있는 도쿄 장소와 같은 곳이면 그 장소', () => {
  assert.equal(matchKnown({ name:'센소지', lat:35.71475, lng:139.79670 }).id, 'sensoji');   // 센소지 바로 옆
  assert.equal(matchKnown({ name:'팀랩 플래닛 도쿄', lat:35.6493, lng:139.7900 }).id, 'teamlab');
  assert.equal(matchKnown({ name:'チームラボプラネッツ TOKYO DMM', lat:35.6493, lng:139.7900 }).id, 'teamlab');
  assert.equal(matchKnown({ name:'쓰키지 장외시장', lat:35.6655, lng:139.7708 }).id, 'tsukiji');
  assert.equal(matchKnown({ name:'와일드매직', lat:35.6497, lng:139.7900 }), null);       // 팀랩 바로 옆 다른 가게
  assert.equal(matchKnown({ name:'센소지', lat:35.60, lng:139.60 }), null);              // 이름이 같아도 먼 곳
  assert.equal(matchKnown({ lat:35.71475, lng:139.79670 }), null);                      // 이름 없음
});

test('구글 장소 → 직접 담은 장소: 동네·종류·쉬는 요일·장소 ID·받은 날', () => {
  const p = toCustom({ id:'ChIJtest', name:'테스트 라멘', lat:35.6938, lng:139.7034, types:['ramen_restaurant', 'restaurant'], addr:'東京都新宿区', periods:TUE_SUN }, 'gx1', 1000);
  assert.deepEqual([p.id, p.gid, p.area, p.kind, p.indoor, p.hours, p.custom, p.src, p.gAt], ['gx1', 'ChIJtest', 'shinjuku', '먹거리', true, 1, true, 'google', 1000]);
  assert.deepEqual(p.closed, [1]);
  assert.equal(toCustom({ id:'x', name:'공원', lat:35.67, lng:139.70, types:['park'] }, 'g2', 1).closed, undefined);
});

test('구글 지도 링크: 장소 ID로 정확히', () => {
  assert.equal(gmapsPlaceUrl('테스트 라멘', 'ChIJtest'), 'https://www.google.com/maps/search/?api=1&query=%ED%85%8C%EC%8A%A4%ED%8A%B8+%EB%9D%BC%EB%A9%98&query_place_id=ChIJtest');
  const u = new URL(gdir({ name:'숙소', lat:35.69, lng:139.70 }, { name:'테스트 라멘', gid:'ChIJtest', lat:35.69, lng:139.70 }));
  assert.equal(u.searchParams.get('destination'), '테스트 라멘');
  assert.equal(u.searchParams.get('destination_place_id'), 'ChIJtest');
  assert.equal(u.searchParams.get('origin'), '35.690000,139.700000');
  assert.equal(u.searchParams.get('origin_place_id'), null);
});

test('구글에서 담은 곳: 25일 지나면 새로 받고, 좌표·쉬는 요일만 고침', async () => {
  const { staleGoogle, applyRefresh, REFRESH_DAYS } = await import('../js/gplace.js');
  const day = 86400000, now = 100 * day;
  const custom = [
    { id:'g1', src:'google', gid:'G1', gAt:now - (REFRESH_DAYS + 1) * day, name:'옛 가게', lat:35.70, lng:139.80, kind:'먹거리', hours:1, closed:[1] },
    { id:'g2', src:'google', gid:'G2', gAt:now - 3 * day },
    { id:'g3', src:'google', gid:'G3' },            // 받은 날이 없으면 새로 받음
    { id:'c1', custom:true, lat:1, lng:2 },          // 직접 담은 곳은 아님
    { id:'g4', src:'google', gid:'', gAt:0 }         // 장소 ID가 없으면 못 받음
  ];
  assert.deepEqual(staleGoogle(custom, now).map(p => p.id), ['g1', 'g3']);
  const r = applyRefresh(custom[0], { id:'G1', lat:35.7101, lng:139.8107, addr:'도쿄도 스미다구', periods:null }, now);
  assert.equal(r.lat, 35.7101); assert.equal(r.gAt, now); assert.equal(r.addr, '도쿄도 스미다구');
  assert.equal(r.name, '옛 가게'); assert.equal(r.kind, '먹거리'); assert.equal(r.hours, 1);
  assert.equal(r.closed, undefined);   // 쉬는 요일 정보가 없어졌으면 지움
  assert.equal(applyRefresh(custom[0], { lat:'x', lng:1 }, now), custom[0]);
});
