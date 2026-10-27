// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { JP_CALLS, PHRASES, QUAKE, LOST, EMBASSY, telHref, callsFor, hotelCard, kidCardJa } from '../js/safety.js';
import { SHARED_KEYS } from '../js/sharecore.js';
import { stateForBackup } from '../js/backup.js';

test('긴급 번호: 공식 출처로 확인한 값 그대로, 전화 링크 모양', () => {
  const by = k => JP_CALLS.find(c => c.key === k);
  assert.equal(by('police').num, '110'); assert.equal(by('fire').num, '119');
  assert.equal(by('jnto').num, '050-3816-2787');
  assert.equal(by('consul').num, '+82-2-3210-0404');
  assert.equal(by('embassy').num, '+81-70-2153-5454');
  assert.equal(by('consular').num, '+81-3-3455-2601');
  assert.equal(EMBASSY.addr, '東京都港区南麻布1-2-5');
  assert.equal(telHref('+81-50-3816-2787'), 'tel:+815038162787');
  assert.equal(telHref('#7119'), 'tel:%237119');
  assert.equal(telHref('110'), 'tel:110');
  JP_CALLS.forEach(c => assert.match(telHref(c.tel), /^tel:(\+?\d{3,15}|%23\d{4})$/, c.key));
});

test('도시 전용 번호는 그 도시에서만', () => {
  assert.ok(callsFor({ city:'tokyo' }).some(c => c.key === 'med'));
  assert.ok(!callsFor({ city:'osaka' }).some(c => c.key === 'med'));
  assert.ok(callsFor({ city:'osaka' }).some(c => c.key === 'embassy'));
});

test('문장·지진·분실 안내가 비어 있지 않음', () => {
  assert.ok(PHRASES.length >= 8 && PHRASES.every(p => p.ja && p.ko && p.read));
  assert.ok(QUAKE.length >= 4); assert.ok(LOST.length >= 3);
});

test('숙소 카드: 정한 숙소 이름, 직접 넣은 주소가 우선', () => {
  const s = Object.assign(clone(DEFAULT), { hotels:[{ id:'h1', name:'ホテルテスト新宿', lat:35.69, lng:139.70 }], hotelPick:'h1' });
  assert.deepEqual(hotelCard(s), { name:'ホテルテスト新宿', addr:'', tel:'', mapUrl:'https://www.google.com/maps/search/?api=1&query=35.69,139.7' });
  s.safety = { hname:'', addr:'東京都新宿区1-2-3', tel:'03-0000-0000' };
  assert.equal(hotelCard(s).addr, '東京都新宿区1-2-3');
  assert.equal(hotelCard(clone(DEFAULT)).name, '');
});

test('미아 카드 문장', () => {
  assert.equal(kidCardJa('+82-10-0000-0000', 'ホテルA'), '迷子になりました。\nこの番号に電話してください: +82-10-0000-0000\nホテル: ホテルA');
  assert.equal(kidCardJa('', ''), '迷子になりました。');
});

test('숙소 주소는 가족과 공유, 부모 번호는 이 기기에만(백업에는 남음)', () => {
  assert.ok(SHARED_KEYS.includes('safety')); assert.ok(!SHARED_KEYS.includes('sphone'));
  const b = stateForBackup(Object.assign(clone(DEFAULT), { sphone:'+82-10-0000-0000' }));
  assert.equal(b.sphone, '+82-10-0000-0000');
});
