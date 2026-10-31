// 여행 기록 한 장
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { recordOf, recordText, photoOf, newPhotoItem } from '../js/record.js';
import { bookings } from '../js/vault.js';
import { doneKey } from '../js/today.js';

const trip = () => Object.assign(clone(D.DEFAULT), { start:'2027-03-07', end:'2027-03-09', who:'family', adults:2, kids:[12],
  picked:{ sensoji:true, ameyoko:true, uenozoo:true }, spend:{ a:{ d:'2027-03-08', amt:1200, cur:'JPY', what:'라멘', cat:'food', by:'me' } }, fx:{ rates:{ JPY:9 } } });

test('날짜별 간 곳(✓)·쓴 돈·한마디, 글로 보내기', () => {
  const s = trip(); const P = plan(s); const d = P.days.find(x => x.items.length);
  s.tdone = { [doneKey(d.key, d.items[0].id)]:true };
  s.vault = [Object.assign(newPhotoItem(d.key, 'p1'), { memo:'아이가 좋아했어요', files:[{ fid:'f1', type:'image/jpeg' }] })];
  const R = recordOf(s, P); const x = R.days[d.i];
  assert.equal(x.places[0].done, true); assert.equal(x.note, '아이가 좋아했어요'); assert.equal(x.files.length, 1);
  assert.equal(R.doneCount, 1); assert.ok(R.placeCount >= 3);
  assert.equal(R.days.find(y => y.d.key === '2027-03-08').spent, 10800);   // 1200엔 × 9원
  const t = recordText(R, '도쿄 여행 · 3/7~3/9 · 가족 3명');
  assert.match(t, /^🧳 도쿄 여행/); assert.match(t, new RegExp(`${d.items[0].name} ✓`)); assert.match(t, /"아이가 좋아했어요"/); assert.match(t, /쓴 돈 모두/);
});

test('사진 항목은 보관함 예약 목록에 안 섞임', () => {
  const v = [newPhotoItem('2027-03-07', 'p1'), { id:'t', kind:'ticket', title:'입장권' }];
  assert.deepEqual(bookings(v).map(x => x.id), ['t']);
  assert.equal(photoOf(v, '2027-03-07').id, 'p1'); assert.equal(photoOf(v, '2027-03-08'), null);
});
