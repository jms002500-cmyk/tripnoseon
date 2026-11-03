// 홍콩 ↔ 선전 국경 대기 시간: 주소 · 답 읽기(실제 응답 모양) · 코드 뜻 · 자료 시각 · 넘는 날·방향 · 화면
import test from 'node:test';
import assert from 'node:assert/strict';
import { BORDER_URL, BORDER_SOURCE, BORDER_ALT, CPS, cpOfBorder, QUEUE, queueOf, parseQueue, hkClock, dataTime, crossDir, moveCross, borderRows, BORDER_ERR } from '../js/border.js';
import { BORDER } from '../js/regions/hksz-data.js';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';

// 실제 응답 모양 (CPQueueTimeV.json, 서버가 주는 그대로 줄바꿈·쉼표 위치. 값은 지어낸 상태)
const REAL = `{
  "HYW":
  {
    "arrQueue":0,
    "depQueue":0
  }
,
  "HZM":
  {
    "arrQueue":0,
    "depQueue":1
  }
,
  "LMC":
  {
    "arrQueue":0,
    "depQueue":0
  }
,
  "LSC":
  {
    "arrQueue":99,
    "depQueue":99
  }
,
  "LWS":
  {
    "arrQueue":1,
    "depQueue":2
  }
,
  "MKT":
  {
    "arrQueue":0,
    "depQueue":0
  }
,
  "SBC":
  {
    "arrQueue":4,
    "depQueue":0
  }
,
  "STK":
  {
    "arrQueue":99,
    "depQueue":99
  }
}`;

test('주소·출처: 방문객 줄 자료(V), https, 키 없음', () => {
  assert.equal(BORDER_URL, 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json');
  assert.ok(BORDER_SOURCE.startsWith('https://data.gov.hk/') && BORDER_SOURCE.includes('hk-immd-set28'));
  assert.ok(BORDER_ALT.startsWith('https://www.sb.gov.hk/'));
});

test('답 읽기: 실제 모양 → 검문소 8곳, 선전 오가는 곳부터 정한 순서', () => {
  const r = parseQueue(REAL);
  assert.equal(r.ok, true);
  assert.deepEqual(r.cps.map(x => x.code), ['LWS', 'LSC', 'LMC', 'SBC', 'HYW', 'HZM', 'MKT', 'STK']);
  assert.deepEqual(r.cps[0], { code:'LWS', arr:1, dep:2 });
  assert.deepEqual(r.cps.find(x => x.code === 'SBC'), { code:'SBC', arr:4, dep:0 });
});

test('답 읽기: 숫자 글자도 받고, 모르는 코드는 뒤에, 이상한 칸·값은 뺌', () => {
  const r = parseQueue(JSON.stringify({ XYZ:{ arrQueue:0, depQueue:0 }, LWS:{ arrQueue:'1', depQueue:'0' }, '<b>':{ arrQueue:0 }, SBC:{ arrQueue:'x', depQueue:{} }, HZM:5 }));
  assert.deepEqual(r.cps, [{ code:'LWS', arr:1, dep:0 }, { code:'XYZ', arr:0, dep:0 }]);
  const half = parseQueue('{"LMC":{"depQueue":2}}');
  assert.deepEqual(half.cps, [{ code:'LMC', arr:null, dep:2 }]);
});

test('답 읽기: 못 읽음·빈 자료', () => {
  assert.deepEqual(parseQueue('<html>오류</html>'), { ok:false, err:'bad' });
  assert.deepEqual(parseQueue(''), { ok:false, err:'bad' });
  assert.deepEqual(parseQueue('[1,2]'), { ok:false, err:'bad' });
  assert.deepEqual(parseQueue('null'), { ok:false, err:'bad' });
  assert.deepEqual(parseQueue('{}'), { ok:false, err:'none' });
  assert.ok(BORDER_ERR.bad && BORDER_ERR.none && BORDER_ERR.net && BORDER_ERR.server);
});

test('코드 뜻 (자료 사전, 방문객 기준): 0 보통 30분 · 1 붐빔 45분 · 2 아주 붐빔 · 4 점검 · 99 닫힘', () => {
  assert.deepEqual(Object.keys(QUEUE).map(Number), [0, 1, 2, 4, 99]);
  assert.equal(queueOf(0).k, 'ok'); assert.ok(queueOf(0).ko.includes('30분 안쪽'));
  assert.equal(queueOf(1).k, 'busy'); assert.ok(queueOf(1).ko.includes('45분 안쪽'));
  assert.equal(queueOf(2).k, 'very'); assert.ok(queueOf(2).ko.includes('45분 넘음'));
  assert.ok(queueOf(4).ko.includes('점검'));
  assert.ok(queueOf(99).ko.includes('닫힘'));
  assert.equal(queueOf(7).ko, '모름'); assert.equal(queueOf(null).ko, '모름');
});

test('검문소 이름: 앱의 국경 자료(BORDER)와 맞음, 고속철(서구룡)은 이 자료에 없음', () => {
  ['luohu', 'lokmachau', 'huanggang', 'shenzhenbay'].forEach(k => {
    assert.ok(BORDER.some(b => b.key === k), k);
    const c = cpOfBorder(k); assert.ok(c && CPS[c].main, k);
  });
  assert.equal(cpOfBorder('luohu'), 'LWS'); assert.equal(cpOfBorder('lokmachau'), 'LSC');
  assert.equal(cpOfBorder('huanggang'), 'LMC'); assert.equal(cpOfBorder('shenzhenbay'), 'SBC');
  assert.equal(cpOfBorder('xrl'), ''); assert.equal(cpOfBorder(''), '');
  Object.values(CPS).forEach(c => { assert.ok(c.ko && c.zh && c.hours); if(c.border) assert.ok(BORDER.some(b => b.key === c.border), c.border); });
});

test('보여 줄 줄: 일정에서 지나는 곳을 맨 앞, 선전 오가는 곳과 그 밖으로 나눔', () => {
  const r = parseQueue(REAL);
  const R = borderRows(r, 'SBC');
  assert.deepEqual(R.main.map(x => x.code), ['SBC', 'LWS', 'LSC', 'LMC', 'HYW']);
  assert.deepEqual(R.more.map(x => x.code), ['HZM', 'MKT', 'STK']);
  assert.deepEqual(borderRows(r, '').main.map(x => x.code), ['LWS', 'LSC', 'LMC', 'SBC', 'HYW']);
  assert.deepEqual(borderRows({ ok:false }, 'LWS'), { main:[], more:[] });
});

test('자료 시각: Last-Modified는 홍콩 시각, 없으면 받은 시각, 1시간 넘으면 오래됨', () => {
  const got = Date.UTC(2026, 11, 7, 2, 20);   // 홍콩 10:20
  assert.equal(hkClock(got), '10:20');
  assert.equal(hkClock(Date.UTC(2026, 11, 7, 16, 5)), '00:05');   // 홍콩은 다음 날 0시
  assert.equal(hkClock(NaN), '');
  assert.deepEqual(dataTime('Mon, 07 Dec 2026 02:15:00 GMT', got), { time:'10:15', lm:true, old:false });
  assert.deepEqual(dataTime('Mon, 07 Dec 2026 00:50:00 GMT', got), { time:'08:50', lm:true, old:true });
  assert.deepEqual(dataTime('', got), { time:'10:20', lm:false, old:false });
  assert.deepEqual(dataTime('엉뚱한 값', got), { time:'10:20', lm:false, old:false });
  assert.equal(dataTime('Mon, 07 Dec 2026 05:00:00 GMT', got).lm, false);   // 미래 시각(기기 시계 틀림)은 믿지 않음
});

test('넘는 방향: 홍콩 → 선전 out, 선전 → 홍콩 in, 둘 다 both', () => {
  assert.equal(crossDir([['hk', 'sz']]), 'out');
  assert.equal(crossDir([['sz', 'sz'], ['sz', 'hk']]), 'in');
  assert.equal(crossDir([['hk', 'sz'], ['sz', 'hk']]), 'both');
  assert.equal(crossDir([['hk', 'hk'], ['', 'sz']]), '');
  assert.equal(crossDir(null), '');
});

test('여행 중 이동에 적은 말로 국경 넘는 이동 짐작', () => {
  assert.deepEqual(moveCross('침사추이 숙소', '선전 푸톈 호텔'), { dir:'out' });
  assert.deepEqual(moveCross('深圳 福田', '홍콩 공항'), { dir:'in' });
  assert.deepEqual(moveCross('', '', '로우역에서 국경 넘기'), { dir:'' });
  assert.equal(moveCross('숙소', '디즈니랜드', '셔틀'), null);
  assert.equal(moveCross(undefined, null), null);
});

// 화면: 홍콩·선전 여행에서 숙소를 홍콩 → 선전으로 옮기는 날에만 버튼, 결과는 그 날 카드에
function trip(){
  const s = clone(D.DEFAULT);
  Object.assign(s, { city:'hksz', country:'hk', who:'family', adults:2, kids:[12], start:'2026-12-06', end:'2026-12-09' });
  s.picked = { hk_starferry:true, sz_pingan:true };
  s.nights = { '2026-12-06':'area:tst', '2026-12-07':'area:tst', '2026-12-08':'area:futian' };
  return s;
}
test('화면: 국경 넘는 날 카드에만 홍콩 보안국 대기 시간 링크 (자료는 브라우저에서 못 불러서 링크만), 검문소별 통관 시간', async () => {
  await D.loadRegion('hksz');
  const V = await import('../js/views.js');
  const LINK = 'https://www.sb.gov.hk/eng/bwt/status.html?type=outbound';
  try{
    const s = trip(); s.sh = {};
    const html = V.vPlan(s);
    assert.equal(html.split(LINK).length - 1, 1, '숙소 옮기는 날(12/8) 하나만');
    assert.ok(html.includes('홍콩 → 선전 가는 날'));
    assert.ok(html.includes('뤄후 (로우)') && html.includes('통관 시간 06:30~24:00'));
    assert.ok(html.includes('선전(중국) 쪽 심사 대기 시간은 공개 자료가 없어요'));
    assert.ok(!html.includes('data-act="bdwait"'), '부르는 버튼은 없음');
    // 오늘 화면: 그날을 고르면 같은 링크
    s.sh = { today:'2026-12-08' };
    assert.ok(V.vToday(s).includes(LINK));
    s.sh = { today:'2026-12-07' };
    assert.ok(!V.vToday(s).includes('bwt/status'));
  } finally { D.useRegion('tokyo'); }
  const t = clone(D.DEFAULT); Object.assign(t, { start:'2027-03-07', end:'2027-03-09' }); t.sh = {};
  assert.ok(!V.vPlan(t).includes('bwt/status'), '도쿄에는 없음');
});
