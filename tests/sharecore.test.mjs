// 실행: npm test  (Firebase 없이 동기화 계산만)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { sharedOf, diffShared, applyRemote, inviteLink, parseJoin, voteSummary, describeChange, defaultTitle, DELETE, SHARED_KEYS } from '../js/sharecore.js';

const base = () => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids:[9], start:'2027-03-07', end:'2027-03-11', picked:{ tdl:true }, must:{ tdl:true } });

test('공유하는 것은 일정뿐 (화면 위치·라쿠텐·날씨·환율·가져오기 목록은 빼고)', () => {
  const s = Object.assign(base(), { step:3, rkOn:true, rk:{ items:[1] }, wx:{ a:1 }, fx:{ rate:8 }, imports:[{ name:'x' }], areaFilter:'akiba' });
  const p = sharedOf(s);
  ['step', 'rkOn', 'rk', 'wx', 'fx', 'imports', 'areaFilter', 'geoBusy'].forEach(k => assert.ok(!(k in p), k));
  assert.deepEqual(Object.keys(p).sort(), SHARED_KEYS.slice().sort());
});

test('담기·빼기는 장소 칸 하나씩, 나머지는 통째로', () => {
  const a = sharedOf(base());
  const b = sharedOf(Object.assign(base(), { picked:{ sensoji:true }, start:'2027-03-08' }));
  const d = diffShared(a, b);
  assert.deepEqual(d.find(x => x[0] === 'p.picked.sensoji'), ['p.picked.sensoji', true]);
  assert.deepEqual(d.find(x => x[0] === 'p.picked.tdl'), ['p.picked.tdl', DELETE]);
  assert.deepEqual(d.find(x => x[0] === 'p.start'), ['p.start', '2027-03-08']);
  assert.equal(d.length, 3);
  assert.deepEqual(diffShared(a, sharedOf(base())), []);
});

test('처음 올릴 때(prev 없음)는 모든 칸을 통째로', () => {
  const d = diffShared(null, sharedOf(base()));
  assert.equal(d.length, SHARED_KEYS.length);
  assert.ok(d.every(([path]) => /^p\.\w+$/.test(path)));
});

test('서버 일정을 내 상태에 덮어쓰고, 없는 칸은 기본값', () => {
  const s = Object.assign(base(), { step:5, rkOn:true });
  applyRemote(s, { picked:{ sensoji:true }, start:'2027-04-01' });
  assert.deepEqual(s.picked, { sensoji:true }); assert.equal(s.start, '2027-04-01');
  assert.deepEqual(s.hotels, []); assert.equal(s.who, null);   // 서버에 없으면 기본값
  assert.equal(s.step, 5); assert.equal(s.rkOn, true);          // 공유 안 하는 칸은 그대로
});

test('초대 링크 만들고 읽기', () => {
  const link = inviteLink('https://x.github.io/tripnoseon/#old', 'AbC123def456GHI789jk');
  assert.equal(link, 'https://x.github.io/tripnoseon/#join=AbC123def456GHI789jk');
  assert.equal(parseJoin('#join=AbC123def456GHI789jk'), 'AbC123def456GHI789jk');
  assert.equal(parseJoin('#join=../../x'), null);
  assert.equal(parseJoin(''), null);
});

test('투표 모음', () => {
  const v = { sensoji:{ u1:1, u2:1, u3:-1 } };
  assert.deepEqual(voteSummary(v, 'sensoji', 'u3'), { up:2, down:1, mine:-1 });
  assert.deepEqual(voteSummary(v, 'tdl', 'u1'), { up:0, down:0, mine:0 });
});

test('변경 기록 문장과 기본 제목', () => {
  const a = sharedOf(base());
  const b = sharedOf(Object.assign(base(), { picked:{ tdl:true, sensoji:true } }));
  assert.equal(describeChange(a, b), '센소지 담음');
  const c = sharedOf(Object.assign(base(), { start:'2027-03-08' }));
  assert.match(describeChange(a, c), /날짜를 2027-03-08/);
  assert.equal(defaultTitle(base()), '도쿄 3/7~3/11');
  assert.equal(defaultTitle(clone(DEFAULT)), '도쿄 여행');
});

test('기기마다 두는 설정(글씨 크기·AI 덧붙일 말)은 함께 짜기로 안 보냄, 비행기 시간·도시 고르기는 보냄', () => {
  ['textSize', 'askNote'].forEach(k => assert.ok(!SHARED_KEYS.includes(k), k));
  ['flight', 'cityOnly'].forEach(k => assert.ok(SHARED_KEYS.includes(k), k));
});
