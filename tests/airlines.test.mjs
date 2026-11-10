// 항공사별 체크인·수하물 안내 (js/airlines.js), 확인서의 위탁 수하물, 출발 전 할 일·오늘 화면 연결 (편명·날짜는 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRLINES, airlineOf, airlineCode, checkinOpenDate, onlineText, powerbankRules } from '../js/airlines.js';
import { parseDocText } from '../js/docparse.js';
import { prepTasks } from '../js/prep.js';
import { dayAgenda } from '../js/agenda.js';
import { DEFAULT } from '../js/data.js';

test('편명 앞 두 글자로 항공사, 모르는 항공사는 null', () => {
  assert.equal(airlineCode('KE 900'), 'KE'); assert.equal(airlineCode('7C1101'), '7C'); assert.equal(airlineCode(''), '');
  assert.equal(airlineOf('HX700').name, '홍콩항공'); assert.equal(airlineOf('ZZ123'), null);
  assert.equal(onlineText(airlineOf('KE900')), '출발 48시간 전부터 1시간 전까지');
  assert.equal(checkinOpenDate('UO800', '2027-03-10'), '2027-03-08');   // 48시간 → 이틀 전
  assert.equal(checkinOpenDate('LJ100', '2027-03-10'), '2027-03-09');   // 24시간 → 하루 전
  assert.equal(checkinOpenDate('MM100', '2027-03-10'), '');             // 온라인 체크인 시간이 없는 항공사
  Object.entries(AIRLINES).forEach(([k, a]) => { assert.ok(a.name && a.counter && a.url && a.url.checkin, k); assert.match(a.url.checkin, /^https:\/\//, k); });
});

test('보조배터리 규정은 출발·도착 지역에 맞춰 (한국·홍콩·중국)', () => {
  assert.equal(powerbankRules('ICN', 'HKG').length, 2);
  assert.match(powerbankRules('SZX', 'ICN')[0], /3C/);
  assert.deepEqual(powerbankRules('NRT', 'KIX'), []);
});

test('확인서의 위탁 수하물: Baggage : 1 Piece · 무료 위탁수하물 1개 · 23KG', () => {
  const e = parseDocText('Booking Reference: ABCDEF\n출발 From 도착 To 편명 Flight\nHKG ICN OZ 700\n10MAR2027 18:30 23:05\n수하물 Baggage : 1 Piece', { year:2027 });
  assert.equal(e.items[0].bag, '1개');
  assert.equal(parseDocText('CX 400 06MAR ICN HKG 08:00 10:40\n무료 위탁수하물 1개', { year:2027 }).items[0].bag, '1개');
  assert.equal(parseDocText('CX 400 06MAR ICN HKG 08:00 10:40\nBaggage allowance: 23KG', { year:2027 }).items[0].bag, '23kg');
});

test('출발 전 할 일 온라인 체크인: 가는 편 항공사에 맞춘 날·글 · 오늘 화면에 카운터 마감과 오는 편 체크인 알림', () => {
  const s = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), { city:'hksz', start:'2027-03-06', end:'2027-03-10', who:'family', kids:[8], flight:{ ap:'HKG', arr:'10:40', dep:'18:30', odep:'08:00', rarr:'23:05' }, moves:[],
    fsegs:{ a:{ dir:'out', fno:'LJ100', date:'2027-03-06', from:'ICN', to:'HKG', dep:'08:00', arr:'10:40', who:['a1'] }, b:{ dir:'back', fno:'UO800', date:'2027-03-10', from:'HKG', to:'ICN', dep:'18:30', arr:'23:05', who:['a1'] } } });
  const t = prepTasks(s).find(x => x.key === 'checkin');
  assert.equal(t.date, '2027-03-05'); assert.match(t.t, /진에어 LJ100/); assert.match(t.why, /출발 24시간 전부터 1시간 30분 전까지/);
  const d0 = dayAgenda(s, { i:0, key:'2027-03-06', arrive:{ at:640, ap:{ name:'홍콩 국제공항' }, transfer:50 } }, {});
  assert.match(d0.find(x => x.kind === 'pre' && /공항 도착/.test(x.text)).sub, /진에어/);
  const d2 = dayAgenda(s, { i:2, key:'2027-03-08' }, {});
  assert.match(d2.find(x => x.kind === 'note').text, /오는 편 UO800 온라인 체크인 열림/);
  const d4 = dayAgenda(s, { i:4, key:'2027-03-10', depart:{ at:1110, leave:900, ap:{ name:'홍콩 국제공항' }, transfer:50 } }, {});
  assert.match(d4.find(x => x.dir === 'back').sub, /홍콩익스프레스/);
});
