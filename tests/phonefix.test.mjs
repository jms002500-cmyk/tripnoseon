// 폰 점검에서 고친 것: 사람 번호 맞추기(호칭·이름), 영수증 같이 넣기, 첫날 출발 전·오는 날 한국 도착 줄, 예전 항공권 편 정보
//   (이름·번호·날짜·시각은 모두 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReads, readDrafts, assignPax, normName } from '../js/readdoc.js';
import { fsegsFill, fsegId } from '../js/bookings.js';
import { dayAgenda } from '../js/agenda.js';

const S = { city:'hksz', adults:2, kids:[8], start:'2027-03-06', end:'2027-03-10', flight:{ ap:'HKG', arr:'', dep:'', ap2:'', way:'' }, fsegs:{}, vault:[] };
const leg = (fno, date, from, to, name, ticket) => ({ kind:'flight', items:[{ fno, date, from, to, time:'08:00', time2:'10:40', code:'ABC123', passengers:[{ name, ticket }] }] });

test('아이 호칭(MSTR·MISS)은 아이 칸, 파일 순서가 바뀌어도 아이가 어른 1이 안 됨', () => {
  const d = readDrafts(S, mergeReads([{ j:leg('CX400', '2027-03-06', 'ICN', 'HKG', 'HONG/MINJI MISS', '160-3'), k:0 },
    { j:leg('CX400', '2027-03-06', 'ICN', 'HKG', 'HONG/GILDONG MR', '160-1'), k:1 }, { j:leg('CX400', '2027-03-06', 'ICN', 'HKG', 'KIM/YOUNGHEE MS', '160-2'), k:2 }]));
  assert.deepEqual(d[0].pcode, { k1:'160-3', a1:'160-1', a2:'160-2' });
  assert.deepEqual(d[0].rwho, { 0:'k1', 1:'a1', 2:'a2' });
});

test('가는 편·오는 편을 다른 순서로 넣어도 같은 이름은 같은 사람 (띄어쓰기가 달라도)', () => {
  const r = mergeReads([
    { j:leg('CX400', '2027-03-06', 'ICN', 'HKG', 'HONG/GILDONG MR', '160-1'), k:0 }, { j:leg('CX400', '2027-03-06', 'ICN', 'HKG', 'KIM/YOUNGHEE MS', '160-2'), k:1 },
    { j:leg('OZ700', '2027-03-10', 'HKG', 'ICN', 'KIM/YOUNG HEE MS', '988-2'), k:2 }, { j:leg('OZ700', '2027-03-10', 'HKG', 'ICN', 'HONG/GIL DONG MR', '988-1'), k:3 }]);
  const d = readDrafts(S, r);
  assert.deepEqual([d[0].pcode, d[1].pcode], [{ a1:'160-1', a2:'160-2' }, { a1:'988-1', a2:'988-2' }]);
  const s2 = Object.assign({}, S, { vault:[{ kind:'flight', pname:d[0].pname }] });   // 다음에 따로 읽는 항공권도 남긴 이름으로
  assert.deepEqual(readDrafts(s2, mergeReads([{ j:leg('OZ700', '2027-03-10', 'HKG', 'ICN', 'KIM/YOUNGHEE MS', '988-2'), k:0 }]))[0].pcode, { a2:'988-2' });
  assert.equal(normName('PARK/JI MIN MISS'), normName('PARK/JIMIN MISS'));
  assert.deepEqual(assignPax([{ name:'A/B MSTR' }], [{ key:'a1' }, { key:'a2' }], new Map()), ['a1']);   // 아이 칸이 없으면 빈 칸에
});

test('항공권과 같이 넣은 영수증은 따로 예약을 만들지 않고, 금액이 없는 편에만 금액', () => {
  const tk = { kind:'flight', items:[{ fno:'OZ700', date:'2027-03-10', from:'HKG', to:'ICN', code:'QQQ111', passengers:[{ name:'HONG/GILDONG MR', ticket:'988-1' }] }] };
  const rc = { kind:'ticket', items:[{ code:'QQQ111', amount:410000, currency:'KRW', date:'2027-01-02' }] };
  const d = readDrafts(S, mergeReads([{ j:tk, k:0 }, { j:rc, k:1 }]));
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].amt, d[0].rf], [410000, [0, 1]]);
});

test('첫날 오늘 화면: 공항 도착·출발(한국 시각)이 현지 도착보다 앞, 탑승권은 출발 줄 · 오는 날 한국 도착 줄', () => {
  const s = Object.assign({}, S, { flight:{ ap:'HKG', arr:'10:40', dep:'18:30', ap2:'', way:'', odep:'08:00', rarr:'23:05' }, moves:[],
    fsegs:{ f1:{ dir:'back', fno:'OZ700', date:'2027-03-10', from:'HKG', to:'ICN', dep:'18:30', arr:'23:05', who:['a1'] } } });
  const L = dayAgenda(s, { i:0, key:'2027-03-06', arrive:{ at:640, ap:{ name:'홍콩 국제공항' }, transfer:50 } }, {});
  assert.deepEqual(L.slice(0, 3).map(x => [x.text, x.kst, x.home, x.kind]), [['공항 도착 · 체크인·짐 부치기', 330, true, 'pre'], ['출발', 480, true, 'flight'], ['홍콩 국제공항 도착', undefined, undefined, 'arr']]);
  assert.equal(L[0].min, 270);   // 한국 05:30 = 홍콩 04:30 (줄 세우기는 현지 시각)
  const z = dayAgenda(s, { i:4, key:'2027-03-10', depart:{ at:1110, leave:900, ap:{ name:'홍콩 국제공항' }, transfer:50 } }, {});
  assert.deepEqual(z.map(x => x.text).slice(-2), ['홍콩 국제공항 출발', '인천국제공항 도착']);
  assert.equal(z[z.length - 1].kst, 1385);
});

test('예전에 넣은 항공권(누가 어느 편 없음)은 앱 열 때 편 정보를 채움, 이미 있으면 그대로', () => {
  const v = { kind:'flight', fno:'CX 400', date:'2027-03-06', time:'08:00', time2:'10:40', dir:'out', ap:'HKG', from:'ICN', to:'HKG', pcode:{ a1:'1', a2:'2', k1:'3' } };
  const f = fsegsFill(Object.assign({}, S, { vault:[v] }));
  assert.deepEqual(f[fsegId('2027-03-06', 'CX400')].who, ['a1', 'a2', 'k1']);
  assert.equal(fsegsFill(Object.assign({}, S, { vault:[v], fsegs:f })), null);
});
