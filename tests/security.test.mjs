// 실행: npm test
// 개인정보·보안 점검(2026-11-03)에서 고친 것: 공유 여행·남이 준 백업 파일에서 온 값이 화면에 HTML로 들어가거나 화면을 멈추지 않는지,
// 백업 되돌리기의 '__proto__'·첨부 종류, Firestore 규칙이 앱이 쓰는 칸과 맞는지.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT, PLACES } from '../js/data.js';
import { clone } from '../js/logic.js';
import { sharedOf, applyRemote, cleanShared, SHARED_KEYS } from '../js/sharecore.js';
import { parseBackup, restoreState, safeFileType, b64ToBlob } from '../js/backup.js';
import * as V from '../js/views.js';

if(typeof globalThis.location === 'undefined') globalThis.location = { href:'https://example.test/tripnoseon/' };   // 함께 짜기 창의 초대 링크
const X = '"\'><x-xss>';
const pid = PLACES[0].id, area = PLACES[0].area;

// 화면이 깊은 곳까지 그려지게 칸을 고루 채운 여행 (이름·날짜는 지어낸 값)
function trip(){
  return Object.assign(clone(DEFAULT), {
    who:'family', adults:2, kids:[7, 12], styles:['맛집'], start:'2027-03-07', end:'2027-03-10',
    flight:{ ap:'HND', arr:'10:30', dep:'18:00' },
    moves:[{ id:'m1', k:'go', time:'06:00', how:'car', min:60, from:'집', to:'인천', booked:true, note:'메모', kap:'ICN' },
      { id:'m2', k:'etc', date:'2027-03-08', time:'09:00', how:'rail', min:30, from:'A역', to:'B역', booked:false, note:'' }],
    picked:{ [pid]:true, c1:true }, must:{ [pid]:true }, assign:{}, fullDay:{},
    custom:[{ id:'c1', name:'담은 곳', ja:'', area, lat:35.70, lng:139.75, hours:2, tags:[], kid:'all', custom:true, url:'https://www.google.com/maps/place/x', note:'노트', src:'gmap', kind:'food', indoor:true }],
    hotelArea:area, hotelPick:'h1', hotelCur:'JPY',
    hotels:[{ id:'h1', name:'호텔A', ko:'', price:10000, pcur:'JPY', mapUrl:'', bookUrl:'https://example.com/b', memo:'메모', lat:35.70, lng:139.76, area, st:'ok', src:'link', approx:false, label:'', addr:'東京', tel:'03-0000-0000', booked:true }],
    spend:{ e1:{ d:'2027-03-08', amt:1200, cur:'JPY', what:'라멘', cat:'food', pay:'cash', by:'p1', split:['p1', 'p2'], at:1, pl:pid } },
    party:[{ id:'p1', name:'가' }, { id:'p2', name:'나' }], lrate:9.3, budget:{ total:2000000, cats:{} },
    pack:{ k1:{ t:'여권', c:'doc', who:'p1', done:false, doneBy:'', at:1, src:'' } },
    safety:{ hname:'ホテル', addr:'東京都', tel:'03-0000-0000', meet:'로비' }, dlock:{}, nights:{}, prep:{},
    vault:[{ id:'v1', kind:'ticket', title:'입장권', date:'2027-03-08', time:'10:00', code:'Q1', link:'https://example.com/t', memo:'', placeId:pid, files:[], amt:5000, cur:'JPY' }],
    shareId:'abcdefghij1234567890' });
}
const sh = () => ({ authReady:true, user:{ uid:'u1', name:'나' }, votes:{}, comments:[], log:[], locs:[], today:'2027-03-08', nowMin:600, open:true,
  trip:{ ownerUid:'u1', title:'T', open:true, members:{ u1:{ name:'나' }, u2:{ name:'남' } }, memberUids:['u1', 'u2'] } });
function renderAll(s){
  const fns = [...V.VIEWS, V.SHEET, V.vToday, V.vSafety, V.vRecord];
  return [null, { mvEdit:'m1' }, { mvEdit:'m2' }, { ledit:'e1', lmore:true }].map(extra => {
    s.sh = Object.assign(sh(), extra || {});
    return fns.map(f => f(s)).join('\n');
  }).join('\n');
}
// 숫자·날짜·목록 칸에 HTML을 넣은 서버 일정 (함께 짜는 사람이 Firestore에 직접 쓸 수 있는 값)
function poisoned(){
  const p = sharedOf(trip());
  Object.assign(p, { who:X, adults:X, kids:[X, 3], styles:X, pace:X, city:X, country:X, cityOnly:X, start:X, end:X, hotelArea:X, hotelCur:X, lrate:X,
    flight:{ ap:5, arr:{}, dep:X }, safety:[X], budget:X, picked:X, nights:X });
  p.spendX = 1;
  p.spend = { e1:Object.assign({}, p.spend.e1, { amt:X, cur:X, split:X }), e2:X };
  p.pack = { k1:Object.assign({}, p.pack.k1, { t:{ a:1 } }), k2:5 };
  p.customItems.c1 = Object.assign({}, p.customItems.c1, { hours:X, lat:'35.7', lng:139.75 });
  p.hotelsItems.h1 = Object.assign({}, p.hotelsItems.h1, { price:X, lat:X });
  p.movesItems.m1 = Object.assign({}, p.movesItems.m1, { min:X, time:7 });
  p.partyItems = { p1:{ id:'p1', name:7 }, p2:X };
  return p;
}

test('공유 여행에서 받은 값: 숫자·날짜 칸의 HTML이 화면에 그대로 들어가지 않고, 화면이 멈추지 않음', () => {
  const s = trip(); applyRemote(s, poisoned());
  let html = '';
  assert.doesNotThrow(() => { html = renderAll(s); });
  assert.ok(!html.includes('<x-xss'), html.slice(Math.max(0, html.indexOf('<x-xss') - 200), html.indexOf('<x-xss') + 20));
});

test('공유 여행에서 받은 값의 모양 바로잡기 (틀린 것만 기본값, 맞는 것은 그대로)', () => {
  const s = applyRemote(trip(), poisoned());
  assert.equal(s.who, null); assert.equal(s.adults, 2); assert.deepEqual(s.kids, [3]); assert.deepEqual(s.styles, []);
  assert.equal(s.pace, 'normal'); assert.equal(s.city, 'tokyo'); assert.equal(s.country, 'jp'); assert.equal(s.cityOnly, '');
  assert.equal(s.start, ''); assert.equal(s.end, ''); assert.equal(s.hotelArea, null); assert.equal(s.hotelCur, 'JPY'); assert.equal(s.lrate, 0);
  assert.deepEqual(s.flight, { ap:'5', arr:'', dep:X });   // 글자 칸은 글자로(화면이 esc 함)
  assert.deepEqual(s.safety, DEFAULT.safety); assert.deepEqual(s.budget, DEFAULT.budget); assert.deepEqual(s.picked, {}); assert.deepEqual(s.nights, {});
  assert.deepEqual(Object.keys(s.spend), ['e1']); assert.equal(s.spend.e1.amt, 0); assert.equal(s.spend.e1.cur, 'KRW'); assert.equal(s.spend.e1.split, null);
  assert.deepEqual(Object.keys(s.pack), ['k1']); assert.equal(s.pack.k1.t, '');
  assert.equal(s.custom[0].hours, 1); assert.equal(s.custom[0].lat, 35.7);
  assert.equal(s.hotels[0].price, 0); assert.equal(s.hotels[0].lat, null);
  const m1 = s.moves.find(m => m.id === 'm1'); assert.equal(m1.min, null); assert.equal(m1.time, '7');
  assert.deepEqual(s.party, [{ id:'p1', name:'7' }]);
  // 앱이 만드는 정상 일정은 하나도 안 바뀜 (여러 번 해도 같음)
  const ok = trip(); const back = applyRemote(clone(ok), sharedOf(ok));
  SHARED_KEYS.forEach(k => assert.deepEqual(back[k], ok[k], k));
  const twice = cleanShared(clone(back)); SHARED_KEYS.forEach(k => assert.deepEqual(twice[k], back[k], k));
  // 홍콩·선전 여행 값도 그대로
  const hk = Object.assign(trip(), { city:'hksz', country:'hk', cityOnly:'sz', hotelCur:'HKD' });
  const hb = applyRemote(clone(hk), sharedOf(hk)); ['city', 'country', 'cityOnly', 'hotelCur'].forEach(k => assert.equal(hb[k], hk[k]));
});

test('백업 되돌리기: __proto__ 칸으로 상태 객체의 프로토타입을 바꾸지 못함', () => {
  const text = JSON.stringify({ app:'tripnoseon', v:1, state:{ step:2 }, files:[] }).replace('"state":{', '"state":{"__proto__":{"vault":[{"id":"x"}],"polluted":1},');
  const r = parseBackup(text); assert.ok(r.ok);
  const s = restoreState(r.data);
  assert.equal(Object.getPrototypeOf(s), Object.prototype); assert.equal(s.polluted, undefined); assert.deepEqual(s.vault, []); assert.equal(s.step, 2);
  assert.equal({}.polluted, undefined);
  // 파싱을 거치지 않은 상태(own '__proto__' 칸)를 넣어도 마찬가지
  const raw = JSON.parse('{"__proto__":{"polluted":1},"step":1}');
  assert.equal(Object.getPrototypeOf(restoreState({ state:raw })), Object.prototype);
});

test('남이 준 백업 파일: 이상한 값은 바로잡고 화면이 HTML을 그리지 않음', () => {
  const st = Object.assign(sharedOf(trip()), { step:'<x>', vault:X, imports:{}, textSize:X, sphone:5, askNote:[X], tdone:[], shareId:'trips/x/locs/y' });
  st.adults = X; st.kids = X; st.custom = [Object.assign(trip().custom[0], { hours:X })];
  const s = restoreState({ state:st });
  assert.equal(s.step, 0); assert.deepEqual(s.vault, []); assert.deepEqual(s.imports, []); assert.equal(s.textSize, ''); assert.equal(s.sphone, '');
  assert.equal(s.askNote, ''); assert.deepEqual(s.tdone, {}); assert.equal(s.shareId, null); assert.equal(s.adults, 2); assert.deepEqual(s.kids, []);
  const s2 = restoreState({ state:Object.assign(trip(), { vault:[{ id:'v', kind:'ticket', title:X, files:X }] }) });
  assert.deepEqual(s2.vault[0].files, []);
  let html = ''; assert.doesNotThrow(() => { html = renderAll(s) + renderAll(s2); });
  assert.ok(!html.includes('<x-xss'));
  // 정상 백업은 그대로 돌아옴
  const ok = trip(); const back = restoreState({ state:clone(ok) });
  ['vault', 'custom', 'hotels', 'spend', 'kids', 'start', 'shareId', 'step'].forEach(k => assert.deepEqual(back[k], ok[k], k));
});

test('백업 첨부 종류: 사진·PDF만 그대로, HTML·SVG 등은 열리지 않는 종류로', () => {
  ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'IMAGE/PNG'].forEach(t => assert.equal(safeFileType(t), t.toLowerCase(), t));
  ['text/html', 'image/svg+xml', 'application/xhtml+xml', 'text/javascript', '', undefined, 'image/png; x=<'].forEach(t => assert.equal(safeFileType(t), 'application/octet-stream', String(t)));
  assert.equal(b64ToBlob(btoa('<script>alert(1)</script>'), 'text/html').type, 'application/octet-stream');
  assert.equal(b64ToBlob(btoa('%PDF'), 'application/pdf').type, 'application/pdf');
});

test('함께 짜기 창: 초대 링크가 열려 있으면 뺀 사람이 다시 들어올 수 있다고 알림', () => {
  const s = trip(); s.sh = sh();
  assert.match(V.SHEET(s), /뺀 사람도 초대 링크가 열려 있으면/);
  s.sh.trip.open = false; assert.doesNotMatch(V.SHEET(s), /뺀 사람도/);
});

test('구글 지도에서 담기: 구글로 가는 것을 화면에 알림', () => {
  const s = trip(); s.sh = sh();
  assert.match(V.vPick(s), /보는 위치·검색어·고른 장소가 구글로 가요/);
});

test('Firestore 규칙: 의견·변경 기록·참여자 항목은 앱이 쓰는 칸만, 시각은 서버 시각만 (콘솔에 게시해야 적용)', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const share = readFileSync(new URL('../js/share.js', import.meta.url), 'utf8');
  assert.match(rules, /keys\(\)\.hasOnly\(\['uid', 'name', 'placeId', 'text', 'at'\]\)/);
  assert.match(rules, /keys\(\)\.hasOnly\(\['uid', 'name', 'text', 'at'\]\)/);
  assert.equal((rules.match(/request\.resource\.data\.at == request\.time/g) || []).length, 3);   // 위치·의견·변경 기록
  assert.equal((rules.match(/myEntryOk\(\)/g) || []).length, 3);   // 정의 + 만들기 + 참여하기
  // share.js가 실제로 쓰는 칸이 규칙이 허용하는 칸과 같음 (규칙만 바꾸고 앱은 그대로면 의견·기록이 막힘)
  const fields = fn => { const m = share.match(new RegExp(`export async function ${fn}[\\s\\S]*?addDoc\\([^{]*\\{([^}]*)\\}`)); return [...m[1].matchAll(/(?:^|,)\s*(\w+):/g)].map(x => x[1]).sort(); };
  assert.deepEqual(fields('addComment'), ['at', 'name', 'placeId', 'text', 'uid']);
  assert.deepEqual(fields('addLog'), ['at', 'name', 'text', 'uid']);
  assert.match(share, /members:\{ \[user\.uid\]:\{ name:user\.name \} \}/);
  assert.match(share, /\[`members\.\$\{user\.uid\}`\]:\{ name:user\.name \}/);
});

test('화면도 한 겹 더: 바로잡기 전 값(이 기기 상태)이어도 동행·날짜·통화 칸은 esc', () => {
  const s = Object.assign(trip(), { adults:X, kids:[X], start:X, end:X }); s.sh = sh();
  s.spend.e1.cur = X; s.sh.ledit = 'e1'; s.sh.lmore = true;
  const html = [V.vWho(s), V.vWhere(s), V.vLedger(s), V.partyText(s)].join('');
  assert.ok(!html.includes('<x-xss'));
});

test('공유 여행에서 받은 값: 날짜 휴관·일정 순서·밤별 숙소·사이트별 가격 칸도 모양을 바로잡아 화면이 멈추지 않음', () => {
  // 합친 뒤 점검(2026-11-03): 같은 날 들어온 날짜 휴관(closedDates)을 cleanShared가 몰라서 글자·객체가 오면 장소 담기·일정 화면이 멈췄고,
  //   assign(날 번호)·nights(숙소 id)·숙소 prices(사이트별 가격) 칸도 모양을 안 봐서 일정·숙소 동네 화면이 멈췄음
  const bad = [
    p => { p.customItems.c1.closedDates = 'x'; }, p => { p.customItems.c1.closedDates = 5; }, p => { p.customItems.c1.closedDates = [{}, '2027-03-08', X]; },
    p => { p.assign = { [pid]:[] }; }, p => { p.assign = { [pid]:X }; }, p => { p.nights = { '2027-03-08':{} }; }, p => { p.nights = { '2027-03-08':5 }; },
    p => { p.hotelsItems.h1.prices = { agoda:null }; }, p => { p.hotelsItems.h1.prices = { agoda:{ v:X, cur:{} } }; }, p => { p.hotelsItems.h1.prices = X; }
  ];
  bad.forEach((f, i) => {
    const p = sharedOf(trip()); f(p);
    const s = applyRemote(trip(), p);
    let html = ''; assert.doesNotThrow(() => { html = renderAll(s); }, `경우 ${i}`);
    assert.ok(!html.includes('<x-xss'), `경우 ${i}`);
  });
  { const p = sharedOf(trip()); p.customItems.c1.closedDates = [{}, '2027-03-08', X]; assert.deepEqual(applyRemote(trip(), p).custom[0].closedDates, ['2027-03-08']); }
  { const p = sharedOf(trip()); p.hotelsItems.h1.prices = { agoda:{ v:X, cur:{} }, x:5 }; assert.deepEqual(applyRemote(trip(), p).hotels[0].prices, { agoda:{ v:0, cur:'' } }); }
  // 앱이 만드는 값은 그대로 (빼둔 곳 -1, 동네로 정한 밤 'area:', 날짜 휴관, 사이트별 가격)
  const ok = Object.assign(trip(), { assign:{ [pid]:-1, c1:2 }, nights:{ '2027-03-07':'h1', '2027-03-08':`area:${area}` } });
  ok.custom[0].closed = [2]; ok.custom[0].closedDates = ['2027-03-09'];
  ok.hotels[0].prices = { agoda:{ v:12000, cur:'KRW', at:'11/3' }, booking:{ v:0, cur:'JPY' } };
  const back = applyRemote(clone(ok), sharedOf(ok));
  ['assign', 'nights', 'custom', 'hotels'].forEach(k => assert.deepEqual(back[k], ok[k], k));
});
