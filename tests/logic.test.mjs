// 실행: npm test  (Node 18 이상, 설치할 패키지 없음)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, PLACES } from '../js/data.js';
import { clone, buildDays, searchPlaces, setTripDate, datesReversed, fullAssign, rankAreas, plan, fitScore, capacity, autoPickIds } from '../js/logic.js';

test('장소 찾기: 이름·현지 이름·주소·동네·설명, 띄어쓰기 무시, 이름 맞는 곳 먼저', () => {
  const L = [
    { id:'a', name:'오션파크', ja:'海洋公園', addr:'Ocean Park, Aberdeen', area:'south', kind:'테마파크', tags:['아이'], note:'' },
    { id:'b', name:'스타페리 부두', ja:'', addr:'Star Ferry Pier', area:'tst', kind:'거리', tags:[], note:'오션파크 가는 버스 근처' },
    { id:'c', name:'K11 뮤지아', local:'K11 MUSEA', addr:'18 Salisbury Road', area:'tst', menu:'딤섬', note:'' }
  ];
  const A = { south:{ name:'홍콩섬 남쪽' }, tst:{ name:'침사추이' } };
  const ids = q => searchPlaces(L, q, A).map(p => p.id);
  assert.deepEqual(ids('오션파크'), ['a', 'b']);       // 이름이 먼저, 설명에만 있는 곳은 뒤에
  assert.deepEqual(ids('오션 파크'), ['a', 'b']);       // 띄어 써도 찾음
  assert.deepEqual(ids('오션 거리'), ['b']);            // 낱말이 모두 있어야 함
  assert.deepEqual(ids('스타 페리'), ['b']);
  assert.deepEqual(ids('海洋'), ['a']);
  assert.deepEqual(ids('salisbury'), ['c']);
  assert.deepEqual(ids('침사추이'), ['b', 'c']);
  assert.deepEqual(ids('딤섬'), ['c']);
  assert.deepEqual(ids('침사추이 딤섬'), ['c']);
  assert.deepEqual(ids('   '), []);
  assert.deepEqual(ids('없는곳'), []);
});

test('가는 날을 오는 날 뒤로 옮기면 여행 길이를 지켜 오는 날도 옮김', () => {
  const s = { start:'2027-03-07', end:'2027-03-11' };
  setTripDate(s, 'start', '2027-03-20');
  assert.deepEqual([s.start, s.end], ['2027-03-20', '2027-03-24']);
  setTripDate(s, 'start', '2027-03-22');
  assert.deepEqual([s.start, s.end], ['2027-03-22', '2027-03-24']);   // 앞뒤가 맞으면 한쪽만
  setTripDate(s, 'end', '2027-03-30');
  assert.deepEqual([s.start, s.end], ['2027-03-22', '2027-03-30']);
  setTripDate(s, 'start', '2027-12-30');
  assert.equal(s.end, '2028-01-07');                                  // 해가 넘어가도
  const r = { start:'2027-03-20', end:'2027-03-10' };                 // 이미 뒤집힌 일정을 받은 경우
  assert.equal(datesReversed(r), true);
  setTripDate(r, 'end', '2027-03-26');
  assert.deepEqual([r.start, r.end, datesReversed(r)], ['2027-03-20', '2027-03-26', false]);
  const e = { start:'', end:'' }; setTripDate(e, 'start', '2027-03-20');
  assert.deepEqual([e.start, e.end], ['2027-03-20', '']);
});

// 지어낸 예시 일정: 가족 3명(13살), 도쿄, 2027-03-07(일) ~ 03-11(목), 디즈니랜드 필수
// (실제 사람의 일정은 넣지 않음. 앱 기본값은 비어 있어서 여기서 채움)
const demo = () => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids:[13], styles:['테마파크','쇼핑','체험','맛집'],
  start:'2027-03-07', end:'2027-03-11', picked:{ tdl:true }, must:{ tdl:true } });
const byId = id => PLACES.find(p => p.id === id);

test('날짜: 4박 5일, 첫날·마지막 날은 절반 시간', () => {
  const days = buildDays(demo());
  assert.equal(days.length, 5);
  assert.deepEqual(days.map(d => d.kind), ['arrive', 'full', 'full', 'full', 'depart']);
  assert.equal(days[0].wd, 0);           // 3/7 일요일
  assert.equal(days[0].cap, 4);          // 적당히 7시간의 절반 → 4
  assert.equal(days[1].cap, 7);
});

test('디즈니는 주말이 아닌 온종일 날(3/8 월)로 자동 배치', () => {
  const s = demo(); const days = buildDays(s);
  assert.equal(fullAssign(s, days).tdl, 1);
});

test('디즈니랜드와 디즈니씨를 같이 담으면 서로 다른 날', () => {
  const s = demo(); s.picked.tds = true; s.must.tds = true;
  const fa = fullAssign(s, buildDays(s));
  assert.notEqual(fa.tdl, fa.tds);
});

test('디즈니만 담으면 마이하마가 숙소 1순위', () => {
  assert.equal(rankAreas(demo())[0].key, 'maihama');
});

test('10대 아이가 있으면 10대 취향 장소에 이유가 붙음', () => {
  const f = fitScore(byId('takeshita'), demo());
  assert.ok(f.why.some(w => w.includes('13살')));
});

test('어른 취향 골목은 아이 동반일 때 점수가 깎임', () => {
  assert.ok(fitScore(byId('omoide'), demo()).score < 0);
});

test('휴무일에는 배치하지 않음 (우에노 동물원은 월요일 휴무)', () => {
  const s = demo(); s.picked.uenozoo = true;
  const P = plan(s);
  P.days.forEach(d => { if(d.items.some(p => p.id === 'uenozoo')) assert.notEqual(d.wd, 1); });
});

test('하루 쓸 수 있는 시간을 넘기지 않음', () => {
  const s = demo(); autoPickIds(s).forEach(id => { s.picked[id] = true; });
  plan(s).days.forEach(d => { if(!d.full) assert.ok(d.used <= d.cap + 0.01, `${d.label} ${d.used}/${d.cap}`); });
});

test('직접 빼둔 곳(-1)은 일정에 안 들어감', () => {
  const s = demo(); s.picked.sensoji = true; s.assign.sensoji = -1;
  const P = plan(s);
  assert.ok(P.unassigned.some(u => u.p.id === 'sensoji'));
  assert.ok(!P.days.some(d => d.items.some(p => p.id === 'sensoji')));
});

test('추천 채우기는 남은 시간 안에서만 담음', () => {
  const s = demo(); autoPickIds(s).forEach(id => { s.picked[id] = true; });
  const c = capacity(s); assert.ok(c.used <= c.total);
});

test('처음 연 상태(기본값)는 비어 있고 화면 계산이 깨지지 않음', () => {
  const s = clone(DEFAULT);
  assert.equal(s.who, null); assert.equal(s.start, ''); assert.deepEqual(s.picked, {});
  assert.deepEqual(buildDays(s), []);
  assert.deepEqual(capacity(s), { total:0, used:0 });
  assert.equal(plan(s).days.length, 0);
  assert.equal(fitScore(byId('omoide'), s).score, 0);   // 동행을 안 정했으면 점수를 깎지도 더하지도 않음
});

test('일차별 확정: 확정한 날은 자동 배치·다시 짜기가 안 바꿈', async () => {
  const { lockDay, unlockDay, keepLockedAssign, isLocked } = await import('../js/logic.js');
  const s = demo(); PLACES.filter(p => !p.full && p.area === 'asakusa').slice(0, 3).forEach(p => { s.picked[p.id] = true; });
  const P = plan(s);
  const di = P.days.findIndex(d => !d.full && d.items.length); assert.ok(di >= 0);
  const before = P.days[di].items.map(p => p.id);
  lockDay(s, di);
  const key = buildDays(s)[di].key; assert.equal(s.dlock[key], true);
  before.forEach(id => assert.equal(s.assign[id], di));
  // 새로 담은 곳은 확정한 날로 자동으로 안 들어감
  const extra = PLACES.find(p => !p.full && !s.picked[p.id] && p.area === P.days[di].items[0].area);
  if(extra){ s.picked[extra.id] = true; const Q = plan(s); assert.ok(!Q.days[di].items.some(p => p.id === extra.id)); assert.ok(Q.days[di].locked); }
  // 다시 짜기: 확정한 날 고정만 남김
  const other = PLACES.find(p => !p.full && s.picked[p.id] && s.assign[p.id] == null);
  if(other) s.assign[other.id] = -1;
  const kept = keepLockedAssign(s);
  assert.deepEqual(Object.keys(kept).sort(), before.slice().sort());
  unlockDay(s, di); assert.ok(!isLocked(s, buildDays(s)[di])); assert.ok(!plan(s).days[di].locked);
});

test('나눠 자기: 밤마다 숙소, 날마다 출발·돌아갈 숙소', async () => {
  const { nightHotel, dayHotels, isSplitStay } = await import('../js/logic.js');
  const s = demo(); // 2027-03-07 ~ 03-11 (5일, 4박)
  s.hotels = [{ id:'h1', name:'아사쿠사 호텔', lat:35.712, lng:139.796, area:'asakusa' }, { id:'h2', name:'마이하마 호텔', lat:35.630, lng:139.880, area:'maihama' }, { id:'h3', name:'위치 모름' }];
  s.hotelPick = 'h1';
  const days = buildDays(s);
  assert.equal(nightHotel(s, '2027-03-08').name, '아사쿠사 호텔');
  assert.ok(!isSplitStay(s, days));
  s.nights = { '2027-03-08':'h2', '2027-03-09':'h3' };            // 위치 모르는 후보는 정한 숙소로
  assert.equal(nightHotel(s, '2027-03-08').name, '마이하마 호텔');
  assert.equal(nightHotel(s, '2027-03-09').name, '아사쿠사 호텔');
  const dh = dayHotels(s, days).map(h => [h.from.name, h.to.name]);
  assert.deepEqual(dh, [
    ['아사쿠사 호텔', '아사쿠사 호텔'],   // 1일차: 그날 밤 숙소에서
    ['아사쿠사 호텔', '마이하마 호텔'],   // 2일차: 짐 옮기는 날
    ['마이하마 호텔', '아사쿠사 호텔'],   // 3일차: 다시 아사쿠사로
    ['아사쿠사 호텔', '아사쿠사 호텔'],
    ['아사쿠사 호텔', '아사쿠사 호텔']    // 마지막 날: 전날 밤 숙소에서
  ]);
  assert.ok(isSplitStay(s, days));
  const P = plan(s);
  assert.equal(P.days[1].to.name, '마이하마 호텔'); assert.equal(P.hotel.name, '아사쿠사 호텔');
});
