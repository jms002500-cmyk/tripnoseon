// 늦었을 때 남은 일정 다시 맞추기
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { catchUp, applyCatchUp, dayEndMin } from '../js/catchup.js';
import { doneKey } from '../js/today.js';

const PICKS = ['sensoji', 'ameyoko', 'uenozoo', 'kahaku', 'tnm', 'ginza', 'meiji', 'harajuku', 'shibuya'];
const trip = extra => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-11', who:'family', adults:2, kids:[12],
  picked:Object.fromEntries(PICKS.map(id => [id, true])) }, extra);
const busy = P => P.days.findIndex(d => d.items.length >= 3 && d.kind === 'full');

test('아침이면 다 돌 수 있음, 늦으면 꼭 갈 곳이 아닌 곳부터 뒤에서 뺌', () => {
  const s = trip(); const P = plan(s); const di = busy(P); assert.ok(di >= 0);
  const d = P.days[di];
  assert.equal(catchUp(s, P, di, d.key, 9 * 60).drop.length, 0);
  s.must[d.items[d.items.length - 1].id] = true;                  // 마지막 곳은 꼭 갈 곳
  const P2 = plan(s); const d2 = P2.days[di]; const lastMust = d2.items.find(p => s.must[p.id]);
  const c = catchUp(s, P2, di, d2.key, 17 * 60);
  assert.ok(c.drop.length >= 1); assert.ok(c.finish <= c.end || c.keep.every(p => s.must[p.id]));
  if(lastMust && c.keep.length) assert.ok(c.keep.includes(lastMust) || c.drop.every(x => s.must[x.p.id]));
  assert.ok(c.allFinish > c.end);
});

test('다녀온 곳은 빼고 그다음부터 계산, 다 다녀오면 null', () => {
  const s = trip(); const P = plan(s); const di = busy(P); const d = P.days[di];
  s.tdone = { [doneKey(d.key, d.items[0].id)]:true };
  const c = catchUp(s, P, di, d.key, 10 * 60); assert.equal(c.left.length, d.items.length - 1);
  d.items.forEach(p => { s.tdone[doneKey(d.key, p.id)] = true; });
  assert.equal(catchUp(s, P, di, d.key, 10 * 60), null);
});

test('옮기기: 오늘 남기는 곳은 오늘에 고정, 옮긴 곳은 그날에', () => {
  const s = trip(); const P = plan(s); const di = busy(P); const d = P.days[di];
  const c = catchUp(s, P, di, d.key, 18 * 60); const x = c.drop.find(y => y.to != null) || c.drop[0];
  const moves = { [x.p.id]:x.to != null ? x.to : -1 };
  Object.assign(s, applyCatchUp(s, P, di, moves));
  const P2 = plan(s);
  d.items.filter(p => p.id !== x.p.id).forEach(p => assert.ok(P2.days[di].items.some(q => q.id === p.id), p.id));
  assert.equal(P2.days[di].items.length, d.items.length - 1);          // 비운 시간에 다른 곳이 끼어들지 않음 (오늘 확정)
  assert.ok(P2.days[di].locked);
  if(x.to != null) assert.ok(P2.days[x.to].items.some(q => q.id === x.p.id));
  else assert.ok(P2.unassigned.some(u => u.p.id === x.p.id));
});

test('마지막 날은 공항 가러 나서기 30분 전까지', () => {
  const s = trip({ flight:{ ap:'HND', arr:'', dep:'18:00' } }); const P = plan(s); const last = P.days[P.days.length - 1];
  assert.equal(dayEndMin(s, last), last.depart.leave - 30);
});
