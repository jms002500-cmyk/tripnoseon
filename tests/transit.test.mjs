// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, AREAS, PLACES } from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { CHECKED, PASSES, METRO_IC, metroFare, childFare, zoneOf, legSegments, riders, dayTrips, transitPlan, transitTip, breakEven } from '../js/transit.js';

// 지어낸 여행: 2027-03-07(일) ~ 11(목), 어른 2 + 12살
const trip = extra => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11', who:'family', adults:2, kids:[12], hotelArea:'tokyo' }, extra);
const P_ = id => PLACES.find(p => p.id === id);
const hotel = { key:'tokyo', ...AREAS.tokyo };

test('요금 확인 날짜와 공식 가격 (바꿀 땐 공식 출처로 다시 확인)', () => {
  assert.match(CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(PASSES.map(p => [p.key, p.days, p.adult, p.child]), [['24', 1, 1000, 500], ['48', 2, 1500, 750], ['72', 3, 2000, 1000]]);
  assert.deepEqual(METRO_IC.map(x => x[1]), [178, 209, 252, 293, 324]);
});

test('지하철 운임: 직선거리를 철도 거리로 늘려서 구간 요금, 아이는 반값(1엔 미만 버림)', () => {
  assert.equal(metroFare(2), 178);       // 2.6km
  assert.equal(metroFare(5), 209);       // 6.5km
  assert.equal(metroFare(10), 252);      // 13km
  assert.equal(metroFare(40), 324);
  assert.deepEqual([178, 209, 252, 293, 324].map(childFare), [89, 104, 126, 146, 162]);
});

test('패스 밖 지역: 디즈니(JR 게이요선)·오다이바(유리카모메)·미타카(JR 주오선)·시모키타자와(사철)', () => {
  assert.equal(zoneOf(P_('tdl')).key, 'disney');
  assert.equal(zoneOf(AREAS.maihama).key, 'disney');
  assert.equal(zoneOf(P_('miraikan')).key, 'odaiba');
  assert.equal(zoneOf(P_('odaiba')).key, 'odaiba');
  assert.equal(zoneOf(P_('ghibli')).key, 'west');
  assert.equal(zoneOf(P_('shimokita')).key, 'setagaya');
  ['teamlab', 'toyosu', 'kidzania', 'sensoji', 'meiji', 'nakano', 'tsukiji', 'tower'].forEach(id => assert.equal(zoneOf(P_(id)), null, id));
  assert.equal(zoneOf(AREAS.bay), null);   // 도요스역은 유라쿠초선
});

test('한 구간 나누기: 가까우면 걸어서, 디즈니는 도쿄역에서 바로 게이요선', () => {
  assert.deepEqual(legSegments(P_('odaiba'), P_('miraikan')), []);                 // 0.7km 걷기
  const s1 = legSegments(hotel, P_('sensoji'));
  assert.equal(s1.length, 1); assert.equal(s1[0].kind, 'subway');
  const s2 = legSegments(hotel, P_('tdl'));
  assert.deepEqual(s2.map(x => x.kind), ['out']); assert.equal(s2[0].line, 'JR 게이요선'); assert.equal(s2[0].at, '도쿄역');
  const s3 = legSegments(AREAS.shinjuku, P_('tdl'));                              // 신주쿠에서는 지하철 + 게이요선
  assert.deepEqual(s3.map(x => x.kind), ['subway', 'out']);
  const s4 = legSegments(P_('miraikan'), hotel);                                  // 오다이바 → 유리카모메 → 지하철
  assert.deepEqual(s4.map(x => x.kind), ['out', 'subway']); assert.equal(s4[0].line, '유리카모메');
  const s5 = legSegments(P_('teamlab'), P_('odaiba'));                            // 팀랩(도요스 걸어서) → 유리카모메만
  assert.deepEqual(s5.map(x => x.kind), ['out']);
});

test('요금 낼 사람: 12살은 아이 요금, 13살은 어른, 6살 미만은 무료(어른 1명당 2명까지)', () => {
  assert.deepEqual(riders(trip()), { adults:2, children:1, free:0, guess:false });
  assert.deepEqual(riders(trip({ kids:[13, 9, 4] })), { adults:3, children:1, free:1, guess:false });
  assert.deepEqual(riders(trip({ adults:1, kids:[1, 2, 3] })), { adults:1, children:1, free:2, guess:false });
  assert.equal(riders(trip({ who:null })).guess, true);
  assert.equal(riders(trip({ who:'solo', adults:2 })).adults, 1);
  assert.equal(riders(trip({ who:'couple', kids:[8] })).children, 0);   // 가족이 아니면 아이 없음
});

test('하루 이동: 숙소 → 장소들 → 숙소, 비어 있으면 0번', () => {
  assert.equal(dayTrips({ items:[] }, hotel).rides, 0);
  const d = dayTrips({ items:[P_('sensoji'), P_('skytree')] }, hotel);
  assert.equal(d.legs.length, 3);
  assert.equal(d.rides, 3);
  assert.equal(d.fareC, d.legs.flatMap(l => l.segs).reduce((t, x) => t + childFare(x.fare), 0));
  const dis = dayTrips({ full:P_('tdl'), items:[] }, hotel);
  assert.equal(dis.rides, 0); assert.equal(dis.outs.length, 2);                 // 도쿄역 숙소면 디즈니는 게이요선만
});

test('지하철을 많이 타는 날이 이어지면 48시간권, 적게 타면 IC 카드', () => {
  // 하루에 멀리 떨어진 곳을 여럿: 아사쿠사·우에노·신주쿠·시부야·이케부쿠로
  const busy = trip({ start:'2027-03-08', end:'2027-03-09', pace:'packed',
    picked:{ sensoji:true, tnm:true, tocho:true, meiji:true, sunshine:true, tower:true, tsukiji:true, kanda:true, ebisu:true, nezu:true } });
  const t = transitPlan(busy, plan(busy));
  assert.ok(t.best <= t.single);
  assert.equal(t.single, t.days.reduce((a, d) => a + d.single, 0));
  const dayCost = d => d.fareA * 2 + d.fareC;
  t.days.forEach(d => assert.equal(d.single, dayCost(d)));
  // 가장 싼 조합이 맞는지 직접 확인 (2일: 낱개·24+24·24+낱개·48)
  const [a, b] = t.days.map(d => d.single); const p = k => PASSES.find(x => x.key === k).adult * 2 + PASSES.find(x => x.key === k).child;
  assert.equal(t.best, Math.min(a + b, p('24') + b, a + p('24'), p('24') * 2, p('48')));
  assert.ok(t.saving > 0);
  assert.match(transitTip(t), /^1~2일차는 48시간권이 [\d,]+엔 이득이에요/);

  const quiet = trip({ picked:{ ginza:true, charast:true } });                // 숙소 근처만
  const q = transitPlan(quiet, plan(quiet));
  assert.equal(q.saving, 0);
  assert.ok(q.blocks.every(x => !x.pass));
});

test('한 줄 추천 문구', () => {
  const day = (rides, single) => ({ rides, single, legs:[{ segs:Array.from({ length:rides }, () => ({ kind:'subway', fare:200 })) }] });
  const none = { days:[day(0, 0)], blocks:[{ from:0, to:0, pass:null }] };
  assert.match(transitTip(none), /지하철 탈 일이 거의 없어요/);
  const few = { days:[day(2, 400)], blocks:[{ from:0, to:0, pass:null }] };
  assert.match(transitTip(few), /IC 카드.*하루 6번 이상/);
  assert.equal(breakEven(few), 6);                                             // 1000 / 200 = 5번이면 같음 → 6번부터 이득
  const two = { days:[day(6, 1200), day(6, 1200), day(1, 200)],
    blocks:[{ from:0, to:1, pass:PASSES[1], cost:1500, single:2400 }, { from:2, to:2, pass:null, cost:200, single:200 }] };
  assert.equal(transitTip(two), '1~2일차는 48시간권이 900엔 이득이에요. 나머지 날은 IC 카드로 타세요.');
  const one = { days:[day(6, 1200)], blocks:[{ from:0, to:0, pass:PASSES[0], cost:1000, single:1200 }] };
  assert.equal(transitTip(one), '1일차는 24시간권이 200엔 이득이에요.');
});

test('일정이 바뀌어도 계산이 일정과 같은 날 수', () => {
  const s = trip({ picked:{ tdl:true, teamlab:true, ghibli:true, sensoji:true } });
  const P = plan(s); const t = transitPlan(s, P);
  assert.equal(t.days.length, P.days.length);
  assert.equal(t.blocks.reduce((n, b) => n + b.to - b.from + 1, 0), P.days.length);
  const gd = t.days.find(d => d.legs.some(l => l.to.id === 'ghibli'));
  assert.ok(gd.outs.some(o => o.line === 'JR 주오선'));
});

test('이동 시간 어림: 걷기·지하철·패스 밖 갈아타기', async () => {
  const { legMinutes, legMode, minText, dayTrips } = await import('../js/transit.js');
  const asakusa = { lat:35.7148, lng:139.7967 }, near = { lat:35.7101, lng:139.8107 }, shibuya = { lat:35.6580, lng:139.7016 };
  const tdl = { lat:35.6329, lng:139.8804, area:'maihama' };
  const walk = legMinutes(asakusa, { lat:35.7180, lng:139.7967 });
  assert.ok(walk >= 3 && walk <= 10, `걷기 ${walk}`);
  assert.equal(legMode([]), '걸어서');
  const sub = legMinutes(asakusa, shibuya);
  assert.ok(sub >= 30 && sub <= 50, `아사쿠사→시부야 ${sub}`);
  const dis = legMinutes(asakusa, tdl);
  assert.ok(dis >= 40 && dis <= 70, `아사쿠사→디즈니 ${dis}`);
  assert.equal(sub % 5, 0);
  assert.equal(minText(45), '45분'); assert.equal(minText(60), '1시간'); assert.equal(minText(75), '1시간 15분');
  const T = dayTrips({ items:[near, shibuya] }, asakusa);
  assert.equal(T.legs.length, 3); assert.equal(T.travelMin, Math.round(T.legs.reduce((t, l) => t + l.min, 0) / 5) * 5);
  // 나눠 자는 날: 출발·돌아갈 숙소가 다름
  const T2 = dayTrips({ items:[shibuya], from:asakusa, to:tdl }, asakusa);
  assert.equal(T2.legs[1].to, tdl);
});
