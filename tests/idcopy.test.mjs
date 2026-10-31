// 여권·사진 사본: 예약 목록·캘린더에서 빠짐, 여행이 끝나면 지우기 알림, 공유 안 함
import test from 'node:test';
import assert from 'node:assert/strict';
import { bookings, idCopies, isIdCopy, newIdCopy, idWipeDue, missingBookings } from '../js/vault.js';
import { SHARED_KEYS } from '../js/sharecore.js';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { buildIcs } from '../js/ics.js';

const withFile = it => Object.assign(it, { files:[{ fid:'f1', name:'p.jpg', type:'image/jpeg', size:10 }] });

test('새 사본: 이름 없으면 여권 사본, 30자까지', () => {
  assert.equal(newIdCopy('a', '').title, '여권 사본'); assert.equal(newIdCopy('a', '  아빠 여권 ').title, '아빠 여권');
  assert.equal(newIdCopy('a', 'x'.repeat(50)).title.length, 30); assert.ok(isIdCopy(newIdCopy('a')));
});

test('예약이 아님: 보관함 목록·예약 제안·캘린더에서 빠짐', () => {
  const v = [withFile(newIdCopy('p', '아빠 여권')), { id:'t', kind:'ticket', title:'입장권', date:'2027-03-08', time:'', files:[] }];
  assert.deepEqual(bookings(v).map(x => x.id), ['t']); assert.deepEqual(idCopies(v).map(x => x.id), ['p']);
  const s = Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-09', vault:v, picked:{ sensoji:true } });
  assert.ok(missingBookings(s, bookings(v)).every(m => m.kind !== 'idcopy'));
  assert.doesNotMatch(buildIcs(s, plan(s), bookings(v), new Date('2026-11-01')), /아빠 여권/);
  assert.ok(!SHARED_KEYS.includes('vault')); assert.ok(!SHARED_KEYS.includes('idLater'));
});

test('여행이 끝나면 지우기 알림, 나중에는 그날까지 안 보임', () => {
  const s = { end:'2027-03-09', vault:[withFile(newIdCopy('p', '아빠'))], idLater:'' };
  assert.ok(!idWipeDue(s, '2027-03-09')); assert.ok(idWipeDue(s, '2027-03-10'));
  assert.ok(!idWipeDue(Object.assign({}, s, { idLater:'2027-03-13' }), '2027-03-12')); assert.ok(idWipeDue(Object.assign({}, s, { idLater:'2027-03-13' }), '2027-03-14'));
  assert.ok(!idWipeDue(Object.assign({}, s, { vault:[newIdCopy('p')] }), '2027-03-10'));   // 사진이 없으면 알림 없음
  assert.ok(!idWipeDue(Object.assign({}, s, { end:'' }), '2027-03-10'));
});
