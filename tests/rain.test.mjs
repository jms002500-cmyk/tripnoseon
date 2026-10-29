// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { isRainy, dayRain, outdoorStops, indoorAlternatives, betterFullDay, swapPlan, undoSwap, indoorShare } from '../js/rain.js';

// 지어낸 여행: 2027-03-07(일) ~ 11(목), 어른 2 + 12살
const trip = extra => Object.assign(clone(DEFAULT), { start:'2027-03-07', end:'2027-03-11', who:'family', adults:2, kids:[12] }, extra);
const where = (P, id) => P.days.findIndex(d => d.items.some(p => p.id === id) || (d.full && d.full.id === id));

test('비 오는 날 판단: 확률 50% 이상이거나 비·눈', () => {
  assert.equal(isRainy({ rain:60, text:'흐림' }), true);
  assert.equal(isRainy({ rain:20, text:'소나기' }), true);
  assert.equal(isRainy({ rain:30, text:'흐림' }), false);
  assert.equal(isRainy(null), false);
  const wx = { forecast:[{ date:'2027-03-08', rain:70, text:'비' }] };
  assert.deepEqual(dayRain(wx, '2027-03-08'), { rainy:true, prob:70, text:'비' });
  assert.equal(dayRain(wx, '2027-03-09'), null);                    // 예보 없음
});

test('실외 장소마다 가까운 실내 대안: 우에노 동물원 → 근처 박물관', () => {
  const s = trip({ picked:{ uenozoo:true, meiji:true, sensoji:true } });
  const P = plan(s); const di = where(P, 'uenozoo');
  const day = P.days[di];
  assert.ok(outdoorStops(day).some(p => p.id === 'uenozoo'));
  const alts = indoorAlternatives(s, P, di, P.days[di].items.find(p => p.id === 'uenozoo'), 3);
  assert.equal(alts.length, 3);
  assert.ok(alts.every(a => a.p.indoor === true && !a.p.full));
  assert.ok(alts[0].km < 1.5, `${alts[0].p.name} ${alts[0].km}`);   // 우에노 공원 안의 박물관
  assert.ok(alts.every(a => !(a.p.closed || []).includes(day.wd)));  // 그날 휴무인 곳은 빼고
  assert.ok(alts.every(a => a.p.kid !== 'adult'));
});

test('전망대는 비 오는 날 대안에서 뒤로', () => {
  const s = trip({ picked:{ gyoen:true } });
  const P = plan(s); const di = where(P, 'gyoen');
  const alts = indoorAlternatives(s, P, di, P.days[di].items.find(p => p.id === 'gyoen'), 3);
  assert.notEqual(alts[0].p.kind, '전망대');
});

test('이미 일정에 있는 실내 장소는 대안으로 안 나옴', () => {
  const s = trip({ picked:{ uenozoo:true, kahaku:true, tnm:true } });
  const P = plan(s); const di = where(P, 'uenozoo');
  const ids = indoorAlternatives(s, P, di, P.days[di].items.find(p => p.id === 'uenozoo'), 5).map(a => a.p.id);
  assert.ok(!ids.includes('kahaku') && !ids.includes('tnm'));
});

test('바꾸기와 되돌리기', () => {
  const s = trip({ picked:{ uenozoo:true }, assign:{} });
  const u = swapPlan(s, 'uenozoo', 'kahaku', 2);
  assert.equal(s.assign.uenozoo, -1); assert.equal(s.picked.kahaku, true); assert.equal(s.assign.kahaku, 2);
  const P = plan(s); assert.equal(where(P, 'kahaku'), 2); assert.ok(P.unassigned.some(x => x.p.id === 'uenozoo'));
  undoSwap(s, u);
  assert.deepEqual(s.assign, {}); assert.equal(s.picked.kahaku, undefined); assert.equal(s.picked.uenozoo, true);
});

test('바꾸기: 그날 남는 장소는 그날에 고정하고, 되돌리면 고정도 풀림', () => {
  const s = trip({ picked:{ uenozoo:true, ameyoko:true }, assign:{} });
  const P = plan(s); const di = where(P, 'uenozoo'); const keep = P.days[di].items.map(p => p.id);
  const u = swapPlan(s, 'uenozoo', 'kahaku', di, keep);
  keep.filter(id => id !== 'uenozoo').forEach(id => assert.equal(s.assign[id], di));
  const P2 = plan(s); keep.filter(id => id !== 'uenozoo').forEach(id => assert.equal(where(P2, id), di));
  undoSwap(s, u);
  assert.deepEqual(s.assign, {});
});

test('디즈니 날에 비가 오면 비 안 오는 다른 날을 제안', () => {
  const s = trip({ picked:{ tdl:true } });
  const P = plan(s); const di = where(P, 'tdl');
  const date = i => `2027-03-${String(7 + i).padStart(2, '0')}`;
  const wx = { forecast:[0, 1, 2, 3, 4].map(i => ({ date:date(i), rain:i === di ? 80 : i === 3 ? 10 : 40, text:i === di ? '비' : '흐림' })) };
  const b = betterFullDay(P, wx, di);
  assert.ok(b && b.i !== di); assert.equal(b.i, di === 3 ? 2 : 3);
  assert.equal(betterFullDay(P, { forecast:[] }, di), null);         // 예보가 없으면 제안 안 함
});

test('담은 곳 실내 비율', () => {
  assert.deepEqual(indoorShare(trip({ picked:{ uenozoo:true, kahaku:true, tdl:true, ginza:true } })), { indoor:1, total:3 });
});
