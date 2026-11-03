// 실행: npm test  (Firebase 없이 동기화 계산만)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone } from '../js/logic.js';
import { sharedOf, syncedOf, diffShared, applyRemote, mergeRemote, applyChanges, afterPush, setPath, inviteLink, parseJoin, voteSummary, describeChange, defaultTitle, DELETE, SHARED_KEYS, LIST_KEYS } from '../js/sharecore.js';

const base = () => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids:[9], start:'2027-03-07', end:'2027-03-11', picked:{ tdl:true }, must:{ tdl:true } });

test('공유하는 것은 일정뿐 (화면 위치·라쿠텐·날씨·환율·가져오기 목록은 빼고)', () => {
  const s = Object.assign(base(), { step:3, rkOn:true, rk:{ items:[1] }, wx:{ a:1 }, fx:{ rate:8 }, imports:[{ name:'x' }], areaFilter:'akiba' });
  const p = sharedOf(s);
  ['step', 'rkOn', 'rk', 'wx', 'fx', 'imports', 'areaFilter', 'geoBusy'].forEach(k => assert.ok(!(k in p), k));
  // id 있는 목록 칸은 Items + Order로, 나머지는 이름 그대로
  const want = SHARED_KEYS.flatMap(k => LIST_KEYS.includes(k) ? [`${k}Items`, `${k}Order`] : [k]);
  assert.deepEqual(Object.keys(p).sort(), want.sort());
  assert.deepEqual(applyRemote({}, p).kids, [9]);
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
  assert.equal(d.length, SHARED_KEYS.length + LIST_KEYS.length);
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

/* ---------- 함께 짜기 동시 수정: id 있는 목록(오가는 길·직접 담은 곳·숙소 후보·나누는 사람) ---------- */

// Firestore updateDoc처럼: 'p.a.b' 경로는 가운데 맵을 만들며 그 칸만 바꾸고, DELETE는 그 칸을 지움
function serverApply(doc, changes){
  changes.forEach(([path, v]) => {
    const parts = path.split('.'); let o = doc;
    for(let i = 0; i < parts.length - 1; i++){ if(!o[parts[i]] || typeof o[parts[i]] !== 'object' || Array.isArray(o[parts[i]])) o[parts[i]] = {}; o = o[parts[i]]; }
    const last = parts[parts.length - 1];
    if(v === DELETE) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v));
  });
}
const snap = doc => JSON.parse(JSON.stringify(doc.p));   // 서버가 보내 주는 일정
// app.js의 흐름과 같은 기기 하나: 고치고 → 올리고(diffShared) → 받으면 내 변경을 다시 얹음(mergeRemote)
function device(doc){
  const d = { s:applyRemote(base(), snap(doc)), last:syncedOf(snap(doc)) };
  d.push = () => { const ch = diffShared(d.last, sharedOf(d.s)); d.last = afterPush(d.last, ch); serverApply(doc, ch); return ch; };
  d.recv = () => { const p = snap(doc); const pending = mergeRemote(d.s, p, d.last); d.last = syncedOf(p); if(pending) d.push(); };
  return d;
}
const mv = (id, o) => Object.assign({ id, k:'etc', date:'2027-03-08', time:'', how:'', min:null, from:'', to:'', booked:false, note:'' }, o);
const startDoc = (extra) => { const doc = { p:sharedOf(Object.assign(base(), extra)) }; return doc; };
const ids = arr => arr.map(x => x.id);

test('목록 칸은 id마다 따로 보냄 (오가는 길 하나 더하면 그 항목과 순서만)', () => {
  const a = sharedOf(Object.assign(base(), { moves:[mv('m1')] }));
  const b = sharedOf(Object.assign(base(), { moves:[mv('m1'), mv('m2', { how:'rail' })] }));
  assert.deepEqual(diffShared(a, b), [['p.movesItems.m2', mv('m2', { how:'rail' })], ['p.movesOrder', ['m1', 'm2']]]);
  const c = sharedOf(Object.assign(base(), { moves:[mv('m1', { time:'09:00' }), mv('m2', { how:'rail' })] }));
  assert.deepEqual(diffShared(b, c), [['p.movesItems.m1', mv('m1', { time:'09:00' })]]);   // 고치기는 그 항목만, 순서는 그대로
  const d = sharedOf(Object.assign(base(), { moves:[mv('m2', { how:'rail' })] }));
  assert.deepEqual(diffShared(b, d), [['p.movesItems.m1', DELETE], ['p.movesOrder', ['m2']]]);
  assert.deepEqual(['moves', 'custom', 'hotels', 'party'].sort(), LIST_KEYS.slice().sort());
  ['vault', 'sphone', 'idLater', 'locOn', 'tdone'].forEach(k => assert.ok(!SHARED_KEYS.includes(k) && !LIST_KEYS.includes(k), k));
});

test('동시 수정: 둘 다 오가는 길을 더해도 둘 다 남음', () => {
  const doc = startDoc({ moves:[mv('m1')] });
  const A = device(doc), B = device(doc);
  A.s.moves = A.s.moves.concat(mv('ma', { note:'A' }));
  B.s.moves = B.s.moves.concat(mv('mb', { note:'B' }));
  A.push(); B.push();   // B는 A 것을 받기 전에 올림 (예전엔 배열 통째로 덮어써서 ma가 사라졌음)
  A.recv(); B.recv();
  assert.deepEqual(ids(applyRemote({}, snap(doc)).moves).sort(), ['m1', 'ma', 'mb']);
  assert.deepEqual(ids(A.s.moves), ids(B.s.moves));
  assert.deepEqual(ids(A.s.moves).sort(), ['m1', 'ma', 'mb']);
  assert.deepEqual(ids(A.s.moves).slice(0, 1), ['m1']);   // 원래 있던 건 그대로 앞에
});

test('동시 수정: 하나 고치고 하나 더해도 둘 다 남음 (숙소 후보)', () => {
  const doc = startDoc({ hotels:[{ id:'h1', name:'숙소1', price:100 }, { id:'h2', name:'숙소2', price:200 }] });
  const A = device(doc), B = device(doc);
  A.s.hotels = A.s.hotels.map(h => h.id === 'h1' ? Object.assign({}, h, { price:150 }) : h);
  B.s.hotels.push({ id:'h3', name:'숙소3', price:300 });
  B.push(); A.push();
  A.recv(); B.recv();
  for(const d of [A, B]){
    assert.deepEqual(d.s.hotels.map(h => [h.id, h.price]), [['h1', 150], ['h2', 200], ['h3', 300]]);
  }
});

test('동시 수정: 하나 지우고 다른 하나 고쳐도 지운 게 되살아나지 않음 (나누는 사람)', () => {
  const doc = startDoc({ party:[{ id:'me', name:'나' }, { id:'p1', name:'엄마' }, { id:'p2', name:'아빠' }] });
  const A = device(doc), B = device(doc);
  A.s.party = A.s.party.filter(p => p.id !== 'p1');
  B.s.party = B.s.party.map(p => p.id === 'p2' ? { id:'p2', name:'아버지' } : p);   // B의 목록엔 아직 p1이 있음
  A.push(); B.push();
  A.recv(); B.recv();
  for(const d of [A, B]) assert.deepEqual(d.s.party, [{ id:'me', name:'나' }, { id:'p2', name:'아버지' }]);
  assert.deepEqual(applyRemote({}, snap(doc)).party.map(p => p.id), ['me', 'p2']);
});

test('끊긴 동안 고친 것: 남이 지운 항목은 내 옛 목록으로 되살리지 않고, 내가 고친 건 다시 얹어 올림', () => {
  const doc = startDoc({ custom:[{ id:'c1', name:'카페', area:'asakusa' }, { id:'c2', name:'빵집', area:'asakusa' }] });
  const A = device(doc), B = device(doc);
  A.s.custom = A.s.custom.filter(c => c.id !== 'c1'); A.push();                        // A가 c1 지움 (서버 반영)
  B.s.custom = B.s.custom.map(c => c.id === 'c2' ? Object.assign({}, c, { name:'빵집2' }) : c);   // B는 끊긴 채 c2 고침
  B.recv();   // 다시 연결: 서버 일정(c1 없음)을 받고 내 변경(c2)만 얹어 올림
  A.recv();
  for(const d of [A, B]) assert.deepEqual(d.s.custom.map(c => [c.id, c.name]), [['c2', '빵집2']]);
});

test('같은 항목을 둘이 고치면 나중에 올린 것이 이김', () => {
  const doc = startDoc({ moves:[mv('m1'), mv('m2')] });
  const A = device(doc), B = device(doc);
  A.s.moves = A.s.moves.map(m => m.id === 'm1' ? Object.assign({}, m, { time:'08:00' }) : m);
  B.s.moves = B.s.moves.map(m => m.id === 'm1' ? Object.assign({}, m, { time:'10:30' }) : m);
  A.push(); B.push();
  A.recv(); B.recv();
  for(const d of [A, B]) assert.equal(d.s.moves.find(m => m.id === 'm1').time, '10:30');
  assert.deepEqual(ids(A.s.moves), ['m1', 'm2']);
});

test('지우는 동안 같은 항목을 남이 고치면 고친 쪽(나중 것)이 남음', () => {
  const doc = startDoc({ moves:[mv('m1'), mv('m2')] });
  const A = device(doc), B = device(doc);
  A.s.moves = A.s.moves.filter(m => m.id !== 'm1'); A.push();
  B.s.moves = B.s.moves.map(m => m.id === 'm1' ? Object.assign({}, m, { note:'택시' }) : m); B.push();
  A.recv(); B.recv();
  for(const d of [A, B]) assert.deepEqual(d.s.moves.map(m => [m.id, m.note]), [['m2', ''], ['m1', '택시']]);
});

test('옛 공유 여행(목록이 배열)도 그대로 읽고, 그 칸을 처음 고칠 때 통째로 새 모양으로 올림', () => {
  const old = Object.assign({}, sharedOf(base()));
  LIST_KEYS.forEach(k => { delete old[`${k}Items`]; delete old[`${k}Order`]; });
  old.moves = [mv('m1'), mv('m2')]; old.hotels = [{ id:'h1', name:'숙소1' }]; old.party = []; old.custom = [];
  const doc = { p:old };
  const A = device(doc), B = device(doc);
  assert.deepEqual(ids(A.s.moves), ['m1', 'm2']);
  // 안 바뀐 칸은 옛 모양 그대로 둠 (다른 칸을 고쳐도 목록을 통째로 다시 올리지 않음)
  A.s.start = '2027-03-08';
  assert.deepEqual(A.push(), [['p.start', '2027-03-08']]);
  // 처음 고친 칸은 항목 하나가 아니라 통째로 (서버에 그 항목만 남지 않게)
  A.s.moves = A.s.moves.concat(mv('ma'));
  assert.deepEqual(A.push().map(x => x[0]), ['p.movesItems', 'p.movesOrder']);
  assert.ok(Array.isArray(doc.p.moves));   // 옛 배열은 건드리지 않음 (옛 앱이 열려 있어도 깨지지 않게)
  // B는 아직 옛 모양을 기준으로 끊긴 채 고쳤다가 받음 → 항목마다 다시 얹음
  B.s.moves = B.s.moves.map(m => m.id === 'm2' ? Object.assign({}, m, { how:'taxi' }) : m);
  B.recv(); A.recv();
  for(const d of [A, B]) assert.deepEqual(d.s.moves.map(m => [m.id, m.how]), [['m1', ''], ['m2', 'taxi'], ['ma', '']]);
  assert.deepEqual(applyRemote({}, snap(doc)).hotels, [{ id:'h1', name:'숙소1' }]);   // 안 고친 목록은 옛 배열에서 읽음
});

test('순서 목록끼리 덮어써도 항목은 안 사라지고, 순서에 없는 건 뒤에', () => {
  const p = { movesItems:{ m1:mv('m1'), m2:mv('m2'), m3:mv('m3') }, movesOrder:['m3', 'm1', 'gone', 'm1'] };
  assert.deepEqual(ids(applyRemote({}, p).moves), ['m3', 'm1', 'm2']);
  assert.deepEqual(ids(applyRemote({}, { movesItems:{ m2:{ k:'etc' } } }).moves), ['m2']);   // 항목에 id가 없어도 키로 채움
});

test('id가 없거나 겹치는 목록은 예전처럼 배열 통째로', () => {
  const s = Object.assign(base(), { party:[{ name:'이름만' }] });
  const p = sharedOf(s);
  assert.deepEqual(p.party, [{ name:'이름만' }]); assert.ok(!('partyItems' in p));
  const prev = sharedOf(Object.assign(base(), { party:[{ id:'me', name:'나' }] }));
  assert.deepEqual(diffShared(prev, p), [['p.partyItems', DELETE], ['p.partyOrder', DELETE], ['p.party', [{ name:'이름만' }]]]);
  assert.deepEqual(applyRemote({}, setPath(setPath(setPath(JSON.parse(JSON.stringify(prev)), 'p.partyItems', DELETE), 'p.partyOrder', DELETE), 'p.party', [{ name:'이름만' }])).party, [{ name:'이름만' }]);
  assert.ok(!('hotelsItems' in sharedOf(Object.assign(base(), { hotels:[{ id:'h1' }, { id:'h1' }] }))));
  assert.ok(!('hotelsItems' in sharedOf(Object.assign(base(), { hotels:[{ id:'a.b' }] }))));   // 점은 Firestore 경로를 쪼개므로
});

test('변경 기록 문장은 새 모양에서도 그대로, 이름만 순서 바뀐 서버 항목은 바뀐 걸로 안 봄', () => {
  const a = sharedOf(Object.assign(base(), { hotels:[{ id:'h1', name:'숙소1' }] }));
  const b = sharedOf(Object.assign(base(), { hotels:[{ id:'h1', name:'숙소1' }, { id:'h2', name:'숙소2' }], moves:[mv('m1')] }));
  assert.equal(describeChange(a, b), '숙소 후보 추가 · 오가는 길 고침');
  assert.equal(describeChange(a, sharedOf(Object.assign(base(), { hotels:[{ id:'h1', name:'숙소1' }] }))), '');
  // Firestore는 맵 칸을 이름순으로 돌려줌 → 칸 순서만 다른 건 차이가 아님
  const fromServer = syncedOf({ hotelsItems:{ h1:{ name:'숙소1', id:'h1' } }, hotelsOrder:['h1'] });
  assert.deepEqual(diffShared(fromServer, a).filter(x => x[0].startsWith('p.hotels')), []);
});

test('applyChanges: 목록 칸 경로를 배열에 id로 얹음', () => {
  const s = { moves:[mv('m1'), mv('m2')] };
  applyChanges(s, [['p.movesItems.m3', mv('m3')], ['p.movesItems.m1', DELETE], ['p.movesOrder', ['m3', 'm2']], ['p.start', '2027-01-01']]);
  assert.deepEqual(ids(s.moves), ['m3', 'm2']); assert.equal(s.start, '2027-01-01');
});

test('앱이 만드는 모양 그대로면 받을 때마다 다시 올리는 고리가 없음 (cleanShared가 값을 안 바꿈)', () => {
  // 합친 뒤 점검(2026-11-03): 받을 때 cleanShared가 정상 값을 바꾸면 mergeRemote → 올림 → 받음 → 또 차이로 끝없이 올리게 됨
  const app = {
    moves:[mv('go', { k:'go', time:'05:30', how:'abus', min:null, kap:'ICN1', barea:'seoul', bus:'6001', booked:true }), mv('e1', { min:40, note:'메모' })],
    custom:[{ id:'g1', name:'구글 곳', ja:'', gid:'ChIJ_abc-1', area:'asakusa', lat:35.71, lng:139.79, hours:1.5, kind:'먹거리', indoor:true, tags:[], kid:'all', custom:true, src:'google', addr:'주소', gAt:1700000000000, closed:[1], closedDates:['2027-03-09'] },
      { id:'c2', name:'테이크아웃', ja:'', area:'asakusa', lat:35.71, lng:139.79, hours:0, tags:[], kid:'all', custom:true, url:'', note:'', approx:true, src:'gmap' }],
    hotels:[{ id:'h1', name:'호텔', ko:'', price:0, pcur:'', mapUrl:'', bookUrl:'', memo:'', lat:null, lng:null, area:'', st:'need', src:'', approx:false, label:'', vid:'v1', booked:true, addr:'주소', tel:'03' },
      { id:'h2', name:'R', ko:'알', price:12000, pcur:'JPY', hotelNo:12345, priceAt:'11/3', soldOut:false, prices:{ agoda:{ v:500, cur:'HKD', at:'11/3' } }, lat:35.7, lng:139.7, area:'asakusa', st:'ok', src:'rakuten', approx:false, label:'' }],
    hotelPick:'h1', nights:{ '2027-03-07':'h1', '2027-03-08':'area:asakusa' }, assign:{ sensoji:-1, g1:2 }, fullDay:{ tdl:1 }, dlock:{ '2027-03-08':true }, prep:{ visa:true, esim:false },
    party:[{ id:'p1', name:'가' }, { id:'p2', name:'나' }], lrate:9.35, budget:{ total:2000000, cats:{ food:300000 } },
    spend:{ bkv1:{ d:'', pay:'card', by:null, split:null, at:0, amt:1200.5, cur:'JPY', what:'호텔', cat:'stay', vid:'v1' },
      e2:{ d:'2027-03-08', amt:900, cur:'JPY', what:'라멘', cat:'food', pay:'cash', by:'p1', split:['p1'], at:5, pl:'g1' },
      x1:{ d:'2027-03-08', amt:300, cur:'JPY', what:'', cat:'food', pay:'', by:'p2', split:null, at:6, ik:'t-1', src:'triple' } },
    pack:{ k_pass:{ t:'여권', c:'doc', who:'', done:true, doneBy:'가', at:1, src:'pass' }, c1:{ t:'우산', c:'etc', who:'p1', done:false, doneBy:'', at:2, src:'' }, k_x:{ t:'x', c:'etc', who:'', done:false, doneBy:'', at:3, src:'x', hide:true } },
    flight:{ ap:'HND', arr:'10:30', dep:'' }, safety:{ hname:'ホテル', addr:'東京', tel:'03', meet:'로비' }, styles:['맛집'], cityOnly:'' };
  const doc = startDoc(app); const a = device(doc), b = device(doc);
  SHARED_KEYS.forEach(k => assert.deepEqual(a.s[k], Object.assign(base(), app)[k], k));   // 받아도 그대로
  assert.deepEqual(diffShared(a.last, sharedOf(a.s)), []);
  // 한 사람이 고쳐 올리고 둘 다 받으면 더 올릴 게 없음 (여러 번 주고받아도)
  a.s.spend.e2.amt = 950; assert.ok(a.push().length);
  for(let i = 0; i < 3; i++) [a, b].forEach(d => { const p = snap(doc); assert.equal(mergeRemote(d.s, p, d.last), false, `${i}번째 받기`); d.last = syncedOf(p); });
  assert.deepEqual(diffShared(a.last, sharedOf(a.s)), []); assert.deepEqual(diffShared(b.last, sharedOf(b.s)), []);
  assert.equal(b.s.spend.e2.amt, 950);
});
