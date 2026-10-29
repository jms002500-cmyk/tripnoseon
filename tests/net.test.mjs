// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { sinceText, netBanner } from '../js/net.js';

const at = (d, h, m) => new Date(2027, 2, d, h, m).getTime();

test('마지막 연결 시각 짧게', () => {
  const now = at(8, 15, 40);
  assert.equal(sinceText(null, now), '');
  assert.equal(sinceText('엉터리', now), '');
  assert.equal(sinceText(now - 30000, now), '방금');
  assert.equal(sinceText(at(8, 15, 12), now), '오후 3:12');
  assert.equal(sinceText(at(8, 0, 5), now), '오전 12:05');
  assert.equal(sinceText(at(8, 12, 0), now), '오후 12:00');
  assert.equal(sinceText(at(7, 21, 3), now), '어제 오후 9:03');
  assert.equal(sinceText(at(5, 9, 30), now), '3/5 오전 9:30');
});

test('연결돼 있으면 띠 없음, 막 다시 연결되면 잠깐 알림', () => {
  assert.equal(netBanner({ online:true, now:0 }), null);
  assert.deepEqual(netBanner({ online:true, back:true, shared:false }), { kind:'back', title:'다시 연결됐어요', text:'', more:'' });
  assert.match(netBanner({ online:true, back:true, shared:true }).text, /함께 짜기/);
});

test('끊기면 저장된 내용이라고 짧게, 공유 여행이면 나중에 올라간다고', () => {
  const now = at(8, 15, 40);
  const solo = netBanner({ online:false, at:at(8, 15, 12), now, shared:false });
  assert.equal(solo.kind, 'off');
  assert.equal(solo.text, '저장된 내용이에요 · 마지막 연결 오후 3:12');
  assert.doesNotMatch(solo.more, /가족/);
  assert.match(solo.more, /지도·식당 찾기·빈방/);
  const shared = netBanner({ online:false, at:null, now, shared:true });
  assert.equal(shared.text, '저장된 내용이에요');
  assert.match(shared.more, /고친 내용은 다시 연결되면 가족에게 올라가요/);
});
