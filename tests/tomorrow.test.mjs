// 내일 미리 보기 · 숙소 나서기 전 확인 · 국경 닫는 시각 · 알리페이 준비 할 일 (편명·날짜·이름은 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { tomorrowOf, EVE_FROM } from '../js/tomorrow.js';
import { checkoutList } from '../js/bags.js';
import { lateCross, closeMin } from '../js/border.js';
import { prepTasks } from '../js/prep.js';

const base = { city:'hksz', who:'family', adults:2, kids:[10], pace:'normal', moves:[], vault:[], fsegs:{}, flight:{ ap:'HKG', arr:'', dep:'', ap2:'', way:'' } };
const day = (i, key, extra) => Object.assign({ i, key, label:key.slice(5), kind:'full', items:[], from:{ name:'A 호텔', lat:22.28, lng:114.16 }, to:{ name:'A 호텔', lat:22.28, lng:114.16 } }, extra);

test('내일 미리 보기: 숙소 옮기는 날 전날 밤엔 짐 싸기·짐 고르기·여권', () => {
  const P = { days:[day(0, '2027-03-07'), day(1, '2027-03-08', { cross:true, to:{ name:'B 호텔', lat:22.54, lng:113.98 }, items:[{ id:'x', name:'어느 곳', lat:22.29, lng:114.17, hours:1 }] })] };
  const T = tomorrowOf(Object.assign({}, base), P, 0, '2027-03-07', {});
  assert.equal(T.d.i, 1); assert.equal(T.place.name, '어느 곳');
  assert.deepEqual(T.tips.map(x => x.t), ['오늘 밤 짐 싸 두기', '짐을 어떻게 할지 정하기', '여권 챙기기']);
  const T2 = tomorrowOf(Object.assign({}, base, { bags:{ '2027-03-08':'first' } }), P, 0, '2027-03-07', {});
  assert.ok(!T2.tips.some(x => /어떻게 할지/.test(x.t)));
  assert.match(T2.first.text, /먼저 짐 맡기기/);   // 내일 첫 일은 고른 짐 줄
  assert.equal(tomorrowOf(base, P, 1, '2027-03-08', {}), null);   // 마지막 날 다음은 없음
  assert.equal(EVE_FROM, 18 * 60);
});

test('내일 미리 보기: 오는 날 전날 밤엔 나서는 시각·짐·체크인 안 한 사람·남은 돈, 비 소식', () => {
  const s = Object.assign({}, base, { fsegs:{ b:{ dir:'back', fno:'CX401', date:'2027-03-10', from:'HKG', to:'ICN', dep:'12:40', who:['a1', 'a2', 'k1'], ck:['a1'] } } });
  const P = { days:[day(0, '2027-03-09'), day(1, '2027-03-10', { kind:'depart', depart:{ at:760, leave:490, ap:{ name:'홍콩 국제공항', code:'HKG' }, transfer:50 } })] };
  const wx = { forecast:[{ date:'2027-03-10', text:'비', hi:20, lo:16, rain:80 }] };
  const T = tomorrowOf(s, P, 0, '2027-03-09', { wx });
  assert.equal(T.leave, 490);
  assert.deepEqual(T.tips.map(x => x.icon), ['🧳', '📲', '💴', '☔']);
  assert.match(T.tips[1].t, /아직 2명/); assert.match(T.tips[1].url, /^https:/);
});

test('숙소 나서기 전 확인: 오는 날·숙소 옮기는 날만, 아이 물건·남은 돈은 맞는 날에만, 체크는 날짜별', () => {
  const s = Object.assign(clone(D.DEFAULT), base, { outck:{ '2027-03-10|passport':true } });
  const dep = day(1, '2027-03-10', { kind:'depart' });
  const L = checkoutList(s, dep);
  assert.deepEqual(L.map(x => x.k), ['passport', 'safe', 'charger', 'bath', 'key', 'kid', 'money']);
  assert.deepEqual(L.filter(x => x.done).map(x => x.k), ['passport']);
  const mv = checkoutList(Object.assign({}, s, { kids:[] }), day(2, '2027-03-08', { to:{ name:'B 호텔' } }));
  assert.ok(!mv.some(x => x.k === 'kid' || x.k === 'money') && mv.every(x => !x.done));
  assert.deepEqual(checkoutList(s, day(3, '2027-03-07')), []);   // 숙소를 안 옮기는 날
});

test('국경 닫는 시각: 일정에서 지나는 곳이 닫기 1시간 안쪽이면 알림, 늦게까지 여는 곳을 알려 줌', () => {
  assert.equal(closeMin('LSC'), 22 * 60 + 30); assert.equal(closeMin('LMC'), null); assert.equal(closeMin('LWS'), 1440);
  assert.equal(lateCross(20 * 60, 'lokmachau'), null);
  const w = lateCross(21 * 60 + 45, 'lokmachau');
  assert.ok(w && w.cp === 'LSC' && !w.past);
  assert.ok(w.alt.includes('LMC') && w.alt.includes('LWS') && !w.alt.includes('HYW'));   // 황강 24시간·뤄후 24:00, 롄탕 22:00은 아님
  assert.ok(lateCross(23 * 60, 'lokmachau').past);
  assert.equal(lateCross(23 * 60, 'huanggang'), null);   // 24시간 여는 곳
  assert.equal(lateCross(21 * 60 + 10, '').close, 22 * 60);   // 지나는 곳을 모르면 가장 일찍 닫는 곳(롄탕 22:00) 기준
  assert.equal(lateCross(null, 'luohu'), null);
});

test('알리페이·위챗페이 준비: 선전 가는 여행만 출발 10일 전, 준비물에서 체크하면 저절로', () => {
  const s = Object.assign(clone(D.DEFAULT), { city:'hksz', cityOnly:'', start:'2027-03-06', end:'2027-03-10' });
  const t = prepTasks(s).find(x => x.key === 'payapp');
  assert.ok(t && t.dday === 10 && !t.done && t.go === 'pack');
  assert.ok(prepTasks(Object.assign({}, s, { pack:{ sg_alipay:{ t:'알리페이', done:true } } })).find(x => x.key === 'payapp').done);
  assert.ok(!prepTasks(Object.assign({}, s, { cityOnly:'hk' })).some(x => x.key === 'payapp'));
});
