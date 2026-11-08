// AI 도우미 부탁 문장: 여행지·동행·환율에 맞춰 만들고, 모르는 건 추측하지 말라고 함
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { ASK_KINDS, askPrompt, partyLine, rateLine, geminiBody, geminiText, geminiError, askJsonPrompt, askSchema, askParse, receiptLine, composedPrompt, wrapText, askGroups, askOrder, askRecItem, askTransPrompt, hasHangul, askCount, askStep, askSplit, askKeysOf, askLastList, askLastSave, ASK_LAST, askKeyInfo, askKeys, askKeyNow, askTargets, askErrTag, ASK_KEY, ASK_VKEY, ASK_USE, b64url, pemToDer, jwtClaims } from '../js/askai.js';

test('키 칸: 구글 키·버텍스 키·서비스 계정 JSON을 구분', () => {
  const sa = { private_key:'-----BEGIN PRIVATE KEY-----\nQUJD\nREVG\n-----END PRIVATE KEY-----\n', client_email:'a@b.iam.gserviceaccount.com', project_id:'p1' };
  // 칸이 곧 경로: 같은 AQ. 키라도 넣은 칸에 따라 감
  assert.equal(askKeyInfo(' AIzaXYZ ').kind, 'gemini');
  assert.equal(askKeyInfo('AQ.abc').kind, 'gemini');
  assert.equal(askKeyInfo('AQ.abc', true).kind, 'express');
  assert.equal(askKeyInfo(JSON.stringify(sa), true).kind, 'sa');
  assert.equal(askKeyInfo(JSON.stringify(sa)), null);
  assert.equal(askKeyInfo('{"a":1}', true), null); assert.equal(askKeyInfo('{ 깨진', true), null); assert.equal(askKeyInfo('두 낱말'), null); assert.equal(askKeyInfo('두 낱말', true), null); assert.equal(askKeyInfo(''), null);
  assert.deepEqual(askTargets(askKeyInfo('AQ.abc')).length, 1);
  assert.match(askTargets(askKeyInfo('AQ.abc'))[0], /generativelanguage.*gemini-3\.5-flash-lite:generateContent/);
  assert.equal(askTargets(askKeyInfo('AQ.abc', true))[0], 'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(askTargets({ kind:'sa', sa })[0], 'https://aiplatform.googleapis.com/v1/projects/p1/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent');
  assert.ok(askTargets({ kind:'sa', sa }).length > 1 && askTargets({ kind:'sa', sa }).every(u => u.includes('/projects/p1/')));
  // 저장된 키 읽기: 없음·한쪽·둘 다(기본 구글, 고르면 버텍스)·예전 판의 JSON
  const box = o => ({ m:new Map(Object.entries(o)), getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, x){ this.m.set(k, x); }, removeItem(k){ this.m.delete(k); } });
  assert.equal(askKeyNow(askKeys(box({}))), null);
  assert.equal(askKeys(box({ [ASK_KEY]:'AQ.g' })).use, 'g');
  assert.equal(askKeys(box({ [ASK_VKEY]:'AQ.v' })).use, 'v');
  assert.equal(askKeys(box({ [ASK_VKEY]:'AQ.v', [ASK_USE]:'g' })).use, 'v');
  assert.equal(askKeyNow(askKeys(box({ [ASK_KEY]:'AQ.g', [ASK_VKEY]:'AQ.v' }))).kind, 'gemini');
  assert.equal(askKeyNow(askKeys(box({ [ASK_KEY]:'AQ.g', [ASK_VKEY]:'AQ.v', [ASK_USE]:'v' }))).kind, 'express');
  const old = box({ [ASK_KEY]:JSON.stringify(sa) }), ks = askKeys(old);
  assert.equal(ks.use, 'v'); assert.equal(askKeyNow(ks).kind, 'sa'); assert.equal(old.getItem(ASK_KEY), null); assert.equal(old.getItem(ASK_VKEY), JSON.stringify(sa));
  // 실패 문구에 붙는 코드는 대문자 코드만 (구글 문장은 옮기지 않음)
  assert.equal(askErrTag(401, { error:{ status:'UNAUTHENTICATED', message:'비밀 AQ.x', details:[{ reason:'ACCESS_TOKEN_TYPE_UNSUPPORTED' }] } }), '401 ACCESS_TOKEN_TYPE_UNSUPPORTED');
  assert.equal(askErrTag(429, { error:{ status:'RESOURCE_EXHAUSTED' } }), '429 RESOURCE_EXHAUSTED');
  assert.equal(askErrTag(500, null), '500'); assert.equal(askErrTag(400, { error:{ status:'문장 그대로 AQ.x' } }), '400');
  assert.deepEqual([...pemToDer(sa.private_key)], [...Buffer.from('QUJDREVG', 'base64')]);
  assert.equal(b64url('a?>'), Buffer.from('a?>').toString('base64url'));
  const c = jwtClaims(sa, 100); assert.equal(c.iss, sa.client_email); assert.equal(c.exp, 3700);
});

test('메뉴 답: 분류별로 묶고, 칸이 맞아야 받음', () => {
  const g = askGroups([{ group:'국수', ko:'가' }, { group:'밥', ko:'나' }, { group:' 국수 ', ko:'다' }, { ko:'라' }]);
  assert.deepEqual(g.map(x => [x.name, x.items.length]), [['국수', 2], ['밥', 1], ['그 밖의 메뉴', 1]]);
  assert.deepEqual(askGroups(null), []);
  const sc = askSchema('menu');
  assert.ok(sc.required.includes('rules'));
  assert.ok(sc.properties.items.items.required.includes('prices'));
  assert.equal(askParse('menu', JSON.stringify({ currency:'CNY', recommend:[], items:[], order:{} })), null);
  assert.ok(askParse('menu', JSON.stringify({ currency:'CNY', rules:[], recommend:[], items:[], order:{} })));
  const s = fam({ city:'hksz' }), p = askJsonPrompt(s, 'menu', '');
  ['양고기', '수타면', '빠뜨리지', '지어내면 안 돼', '참고에 없는 요청', 'rules'].forEach(w => assert.match(p, new RegExp(w), w));
  assert.doesNotMatch(p, /최대 30개/);
});

test('메뉴 고르기: 여러 메뉴·수량으로 주문 문장을 만듦', () => {
  const items = [
    { ko:'계란 볶음밥', local:'蛋炒饭', prices:[{ label:'', price:18 }] },
    { ko:'토마토 달걀 덮밥', local:'番茄炒蛋盖浇面/饭', prices:[{ label:'면', price:20 }, { label:'밥', price:18 }] },
    { ko:'소고기 수타면', local:'牛肉拉面', prices:[{ label:'보통', price:16 }, { label:'대', price:18 }] },
    { ko:'굴소스 볶음', local:'蚝油炒', prices:[{ label:'', price:null }] }
  ];
  const d = { currency:'CNY', items, request:{ ko:'땅콩 빼 주세요', local:'请不要放花生。' } };
  const o = askOrder(d, { '0:0':1, '1:1':2, '2:1':1 });
  assert.equal(o.count, 4); assert.equal(o.total, 72); assert.equal(o.unknown, false);
  assert.equal(o.local, '你好，我要这些：\n蛋炒饭 × 1\n番茄炒蛋盖浇饭 × 2\n牛肉拉面（大碗） × 1\n请不要放花生。');
  assert.equal(o.ko, '계란 볶음밥 1개, 토마토 달걀 덮밥 (밥) 2개, 소고기 수타면 (대) 1개\n땅콩 빼 주세요');
  assert.match(askOrder({ currency:'HKD', items }, { '0:0':1 }).local, /^唔該/);
  assert.match(askOrder({ currency:'JPY', items }, { '0:0':1 }).local, /^すみません/);
  assert.equal(askOrder({ currency:'CNY', items }, { '1:0':1 }).lines[0].local, '番茄炒蛋盖浇面');
  assert.equal(askOrder({ currency:'CNY', items }, { '2:0':1 }).lines[0].local, '牛肉拉面（16元）');   // 한글 구분은 가격으로 알아보게
  // 직원에게 보여 줄 문장에는 한글이 들어가면 안 됨
  const sized = l => ({ currency:'CNY', items:[{ ko:'면', local:'牛肉面', prices:[{ label:l, price:16 }, { label:'x', price:18 }] }] });
  [['일반', '牛肉面（16元）'], ['보통', '牛肉面（16元）'], ['매운맛', '牛肉面（16元）'], ['대', '牛肉面（大碗）'], ['큰 그릇', '牛肉面（大碗）'], ['소', '牛肉面（小碗）'], ['작은 사이즈', '牛肉面（小碗）'], ['중', '牛肉面（中碗）'], ['大', '牛肉面（大）']]
    .forEach(([l, want]) => assert.equal(askOrder(sized(l), { '0:0':1 }).lines[0].local, want, l));
  assert.equal(askOrder({ ...sized('대'), currency:'JPY' }, { '0:0':1 }).lines[0].local, '牛肉面（大盛り）');
  assert.equal(askOrder(sized('일반'), { '0:0':1 }).lines[0].ko, '면 (일반)');   // 뜻 줄은 한국어 그대로
  // 옵션은 AI가 준 메뉴판 글자 이름이 먼저. 한글이면 쓰지 않음. 셋 이상도 가격으로 구분
  const three = { currency:'HKD', items:[{ ko:'국수', local:'湯麵', prices:[{ label:'순한맛', local:'清湯麵', price:30 }, { label:'매운맛', local:'매운 국수', price:32 }, { label:'곱빼기', price:null }] }] };
  assert.equal(askOrder(three, { '0:0':1 }).lines[0].local, '清湯麵');
  assert.equal(askOrder(three, { '0:1':1 }).lines[0].local, '湯麵（HK$32）');
  assert.equal(askOrder(three, { '0:2':1 }).lines[0].local, '湯麵（3）');
  // AI가 옵션 이름 칸에 가격을 넣어도 주문 문장이 망가지지 않음 (실제로 나온 답)
  const bad = l => ({ currency:'CNY', items:[{ ko:'덮밥', local:'孜然牛肉盖浇面/饭', prices:[{ label:'면', local:l, price:25 }, { label:'밥', local:l, price:22 }] }] });
  ['25元', '孜然牛肉盖浇面/饭 22元'].forEach(l => assert.equal(askOrder(bad(l), { '0:1':1 }).lines[0].local, '孜然牛肉盖浇饭'));
  const odd = { currency:'CNY', items:[{ ko:'국수', local:'汤面', prices:[{ label:'가', local:'25元', price:25 }, { label:'나', price:22 }] }] };
  assert.equal(askOrder(odd, { '0:0':1 }).lines[0].local, '汤面（25元）');
  // 메뉴별 요청·전체 요청·직접 쓴 말
  const dd = { currency:'CNY', items:[items[0], items[2]] };
  const m = askOrder(dd, { '0:0':2, '1:1':1 }, { reqs:{ '0:0':['nospicy', 'cilantro'], '*':['salt'] }, free:[{ ko:'작은 그릇에', local:'请用小碗。' }] });
  assert.equal(m.local, '你好，我要这些：\n蛋炒饭 × 2（不要辣，不要香菜）\n牛肉拉面（大碗） × 1\n全部：少盐\n请用小碗。');
  assert.equal(m.ko, '계란 볶음밥 2개(안 맵게, 고수 빼기), 소고기 수타면 (대) 1개\n전체: 덜 짜게\n작은 그릇에');
  assert.equal(m.lines[0].say, '蛋炒饭 × 2（不要辣，不要香菜）');   // 크게 보기 화면의 줄에도 요청이 들어감
  assert.match(askOrder({ currency:'HKD', items:dd.items }, { '0:0':1 }, { reqs:{ '0:0':['cilantro'] } }).local, /走芫茜/);
  assert.match(askOrder({ currency:'JPY', items:dd.items }, { '0:0':1 }, { reqs:{ '0:0':['cilantro'] } }).local, /パクチー抜き/);
  assert.equal(hasHangul('牛肉'), false); assert.equal(hasHangul('밥'), true);
  assert.match(askTransPrompt('물 주세요', 'HKD'), /광둥어/); assert.match(askTransPrompt('x', 'CNY'), /간체/);
  const u = askOrder(d, { '0:0':1, '3:0':2 }); assert.equal(u.total, 18); assert.equal(u.unknown, true);
  assert.equal(askOrder(d, {}).count, 0); assert.equal(askOrder(d, undefined).count, 0);
  assert.equal(askOrder(d, { '9:0':1, '0:0':0 }).count, 0);   // 없는 메뉴·0개는 넣지 않음
  assert.equal(askRecItem(d, { name:'다른 이름', local:'牛肉拉面' }), items[2]);
  assert.equal(askRecItem(d, { name:'계란 볶음밥' }), items[0]);
  assert.equal(askRecItem(d, { name:'없는 메뉴', local:'无' }), null);
});

test('말이 안 통할 때 문구: 세 말이 모두 있고 한글이 섞이지 않음', async () => {
  const T = await import('../js/asktalk.js');
  [T.REQS, T.SAYS, T.ASKS, T.REPLIES].forEach(list => {
    assert.equal(new Set(list.map(x => x.key)).size, list.length);
    list.forEach(x => { assert.ok(x.ko && hasHangul(x.ko), x.key); ['CNY', 'HKD', 'JPY'].forEach(c => { assert.ok(x[c], `${x.key} ${c}`); assert.equal(hasHangul(x[c]), false, `${x.key} ${c}`); }); });
  });
  ['CNY', 'HKD', 'JPY'].forEach(c => { const w = T.talkWords(c); ['reply', 'num', 'gone', 'write', 'go', 'all', 'dot', 'lang', 'html'].forEach(k => assert.ok(w[k], k)); assert.ok(w.unit(5)); });
  assert.equal(T.talkOf(T.REQS[0], 'KRW'), T.REQS[0].CNY);
});

test('같은 메뉴 나눠 요청: 수량을 줄별로 쪼개고 합쳐 셈', () => {
  const items = [{ ko:'계란 볶음밥', local:'蛋炒饭', prices:[{ label:'', price:18 }] }];
  let c = askStep({}, '0:0', 1); c = askStep(c, '0:0', 1); c = askStep(c, '0:0', 1);
  assert.deepEqual(c, { '0:0':3 });
  const x = askSplit(c, '0:0'); assert.equal(x.key, '0:0:1'); assert.deepEqual(x.cart, { '0:0':2, '0:0:1':1 });
  assert.equal(askCount(x.cart, '0:0'), 3); assert.deepEqual(askKeysOf(x.cart, '0:0'), ['0:0', '0:0:1']);
  const y = askSplit(x.cart, '0:0'); assert.equal(y.key, '0:0:2');
  assert.equal(askSplit({ '0:0':1 }, '0:0'), null); assert.equal(askSplit(undefined, '0:0'), null);
  const o = askOrder({ currency:'CNY', items }, x.cart, { reqs:{ '0:0:1':['nospicy'] } });
  assert.equal(o.count, 3); assert.equal(o.total, 54);
  assert.equal(o.local, '你好，我要这些：\n蛋炒饭 × 2\n蛋炒饭 × 1（不要辣）');
  assert.equal(askCount(askStep(x.cart, '0:0', -1), '0:0'), 2);   // 빼면 나눈 줄부터
  assert.deepEqual(askStep(x.cart, '0:0', -1), { '0:0':2 });
  assert.deepEqual(askStep({}, '0:0', -1), {});
  assert.deepEqual(askKeysOf({ '1:0':1, '11:0':1 }, '1:0'), ['1:0']);   // 번호가 비슷해도 섞이지 않음
});

test('읽은 메뉴판 보관: 최근 5장, 망가져도 앱이 멈추지 않음', () => {
  const box = () => ({ m:new Map(), full:false, getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, x){ if(this.full && x.length > 40) throw new Error('quota'); this.m.set(k, x); } });
  const b = box(); assert.deepEqual(askLastList(b), []);
  for(let i = 1; i <= 7; i++) askLastSave(b, { id:i, data:{ shop:`가게${i}` } });
  assert.deepEqual(askLastList(b).map(x => x.id), [7, 6, 5, 4, 3]);
  askLastSave(b, { id:5, data:{ shop:'가게5' }, cart:{ '0:0':2 } });   // 같은 메뉴판은 고쳐 쓰고 맨 앞으로
  assert.deepEqual(askLastList(b).map(x => x.id), [5, 7, 6, 4, 3]); assert.deepEqual(askLastList(b)[0].cart, { '0:0':2 });
  b.m.set(ASK_LAST, '{깨짐'); assert.deepEqual(askLastList(b), []);
  b.m.set(ASK_LAST, '[null,{"id":1}]'); assert.deepEqual(askLastList(b), []);
  const f = box(); f.full = true; assert.equal(askLastSave(f, { id:1, data:{ shop:'아주 긴 가게 이름 '.repeat(20) } }), false);
});

test('공개 코드에 비밀키가 없음', () => {
  ['js/askai.js', 'js/app.js', 'js/views.js', 'js/firebase-config.js'].forEach(f => assert.doesNotMatch(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /-----BEGIN PRIVATE KEY-----[A-Za-z0-9+\/]|"private_key"\s*:|AQ\.[A-Za-z0-9_-]{20}/, f));
});
import { parseLine } from '../js/ledger.js';

test('앱 안 답: 종류마다 칸 정의가 있고, 모양이 맞아야 받음', () => {
  const s = fam({ city:'hksz' });
  ASK_KINDS.forEach(k => { assert.ok(askSchema(k.key).required.length, k.key); assert.match(askJsonPrompt(s, k.key, '땅콩 알레르기'), /참고: 땅콩 알레르기/); });
  assert.deepEqual(geminiBody('부탁', 'image/jpeg', 'QQ', askSchema('menu')).generationConfig.responseMimeType, 'application/json');
  const ok = '{"currency":"HKD","rules":[],"recommend":[],"items":[],"order":{"ko":"a","local":"b"}}';
  assert.equal(askParse('menu', ok).currency, 'HKD');
  assert.equal(askParse('menu', '```json\n' + ok + '\n```').currency, 'HKD');
  assert.equal(askParse('menu', '{"items":[]}'), null);   // 칸이 빠지면 답으로 받지 않음
  assert.equal(askParse('menu', '메뉴는 다음과 같아요'), null);
});

test('영수증 → 가계부 한 줄을 가계부가 그대로 읽음', () => {
  const s = fam({ city:'hksz' });
  assert.equal(receiptLine({ what:'점심', total:267.3, currency:'HKD' }), '점심 267.3홍콩달러');
  assert.equal(receiptLine({ what:'점심', total:null, currency:'HKD' }), '');
  const r = parseLine(receiptLine({ what:'점심', total:267.3, currency:'HKD' }), s, { today:'2026-12-21', cur:'HKD', by:'' });
  assert.equal(r.ok, true); assert.equal(r.e.cur, 'HKD'); assert.equal(r.e.amt, 267);   // 가계부는 정수
});

test('사진 위 부탁 문장: 안내 줄을 붙이고 폭에 맞춰 줄바꿈', () => {
  assert.match(composedPrompt(fam({ city:'hksz' }), 'menu', ''), /^\[이 글 아래 사진을 보고/);
  assert.deepEqual(wrapText('가나다라마\n바', 3, t => t.length), ['가나다', '라마', '바']);
  assert.deepEqual(wrapText('', 3, t => t.length), ['']);
});

test('앱 안에서 바로 받기: 보낼 모양·답 정리·오류 문구', () => {
  assert.deepEqual(geminiBody('부탁', 'image/jpeg', 'QUJD').contents[0].parts, [{ text:'부탁' }, { inline_data:{ mime_type:'image/jpeg', data:'QUJD' } }]);
  const j = { candidates:[{ content:{ parts:[{ text:'## 메뉴\n* **완탕면** HK$50' }, { text:'\n끝' }] } }] };
  assert.equal(geminiText(j), '메뉴\n• 완탕면 HK$50\n끝');
  assert.equal(geminiText({}), ''); assert.equal(geminiText(null), '');
  assert.match(geminiError(429, null), /무료 사용량/);
  assert.match(geminiError(400, { error:{ message:'API key not valid.' } }), /키가 맞지 않아요/);
  assert.match(geminiError(403, null), /키가 맞지 않아요/);
  assert.match(geminiError(400, { error:{ message:'Invalid image' } }), /읽지 못했어요/);
  assert.match(geminiError(503, null), /잠시 바빠요/);
});

const fam = extra => Object.assign(clone(D.DEFAULT), { who:'family', adults:2, kids:[12] }, extra);

test('동행 한 줄', () => {
  assert.equal(partyLine(fam()), '가족 3명(어른 2명, 아이 12살)');
  assert.equal(partyLine(Object.assign(clone(D.DEFAULT), { who:'friends', adults:3 })), '친구 3명');
  assert.equal(partyLine(clone(D.DEFAULT)), '여행자');
});

test('도쿄 메뉴판: 일본어로 주문, 엔 환율, 아이 나이, 추측 금지', () => {
  const p = askPrompt(fam({ fx:{ rates:{ JPY:9.2 } } }), 'menu');
  assert.match(p, /^일본 도쿄 여행 중이야\. 일행은 한국인 가족 3명/);
  assert.match(p, /메뉴판/); assert.match(p, /일본어 한 줄/); assert.match(p, /1엔 ≈ 9\.2원/);
  assert.match(p, /12살 아이가 먹기 괜찮은지/); assert.match(p, /잘 안 보임/);
  assert.match(p, /\n1\. 사진 전체를 끝까지 훑어서/);
});

test('홍콩·선전: 둘 다면 두 말·두 통화, 홍콩만이면 광둥어·홍콩달러만', async () => {
  await D.loadRegion('hksz');
  try{
    const both = fam({ city:'hksz', fx:{ rates:{ HKD:178, CNY:190 } } });
    const p = askPrompt(both, 'menu');
    assert.match(p, /^홍콩·선전 여행 중이야/); assert.match(p, /광둥어/); assert.match(p, /중국어/);
    assert.equal(rateLine(both), '1홍콩달러 ≈ 178원, 1위안 ≈ 190원');
    const hk = fam({ city:'hksz', cityOnly:'hk', fx:{ rates:{ HKD:178, CNY:190 } } });
    const q = askPrompt(hk, 'receipt');
    assert.match(q, /^홍콩 여행 중이야/); assert.doesNotMatch(q, /위안|선전/); assert.match(q, /186홍콩달러/);
  } finally { D.useRegion('tokyo'); }
});

test('환율을 모르면 어림하라고만', () => {
  const p = askPrompt(fam(), 'menu');
  assert.match(p, /환율은 최근 값으로 어림/);
});

test('아이가 없으면 아이 질문 없음, 덧붙인 말은 참고로', () => {
  const s = Object.assign(clone(D.DEFAULT), { who:'couple', adults:2 });
  const p = askPrompt(s, 'medicine', '  땅콩 알레르기 있어요 ');
  assert.doesNotMatch(p, /살 아이/); assert.match(p, /참고: 땅콩 알레르기 있어요\n/); assert.match(p, /약사/);
});

test('상황마다 문장이 있고, 모르는 상황은 메뉴판으로', () => {
  const s = fam();
  ASK_KINDS.forEach(k => assert.ok(askPrompt(s, k.key).length > 80, k.key));
  assert.equal(askPrompt(s, 'nope'), askPrompt(s, 'menu'));
});

test('간판용 빠른 번역 바로가기: 자동 감지 → 한국어, https만', async () => {
  const { QUICK_TRANSLATE } = await import('../js/askai.js');
  assert.deepEqual(QUICK_TRANSLATE.map(x => x.key), ['google', 'papago']);
  QUICK_TRANSLATE.forEach(x => { assert.match(x.url, /^https:\/\//); assert.match(x.url, /auto/); assert.match(x.url, /=ko\b/); });
  const { quickHref, quickNote } = await import('../js/askai.js');
  const phone = 'Mozilla/5.0 (Linux; Android 10; K) Chrome/120 Mobile', iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
  QUICK_TRANSLATE.forEach(x => {
    const h = quickHref(x, phone);
    assert.match(h, /^intent:\/\/[^#]+#Intent;scheme=https;package=[\w.]+;S\.browser_fallback_url=https%3A%2F%2Fplay\.google\.com%2Fstore%2Fapps%2Fdetails%3Fid%3D[\w.]+;end$/);
    assert.equal(quickHref(x, iphone), x.url);
    assert.equal(quickHref(x, undefined), x.url);
  });
  assert.notEqual(quickNote(phone), quickNote(iphone));
});

test('숫자로 답받기: 상대가 쓴 숫자를 한국어로, 그 나라 돈이면 원화 어림', async () => {
  const { numSay } = await import('../js/views.js');
  const s = Object.assign(clone(D.DEFAULT), { city:'hksz', fx:{ rates:{ KRW:1, HKD:0.0057, CNY:0.0049 }, at:'2026-11-06' } });
  const m = numSay(s, '120', 'HKD');
  assert.match(m, /상대가 쓴 숫자: 120/); assert.match(m, /HK\$120/);
  assert.equal(numSay(s, 'abc', 'HKD'), '');
  assert.match(numSay(s, '1,280', 'CNY'), /1280/);
});

test('소리 음성 고르기: 갤럭시(zh_CN_#Hans·yue_HK_#Hant)·아이폰(zh-HK)·크롬(cmn-Hans-CN) 이름을 모두 알아봄', async () => {
  const { pickVoice } = await import('../js/asktalk.js');
  const galaxy = ['ko_KR', 'ja_JP', 'yue_HK_#Hant', 'zh_CN_#Hans', 'zh_HK_#Hans', 'zh_HK_#Hant', 'zh_TW_#Hant'].map(lang => ({ lang }));
  assert.equal(pickVoice(galaxy, 'zh-CN').lang, 'zh_CN_#Hans');   // 예전엔 이걸 못 알아보고 '음성이 없어요'라고 했음
  assert.equal(pickVoice(galaxy, 'zh-HK').lang, 'yue_HK_#Hant');  // 홍콩은 광둥어 먼저
  assert.equal(pickVoice(galaxy, 'ja').lang, 'ja_JP');
  const iphone = [{ lang:'zh-HK' }, { lang:'zh-CN' }, { lang:'ja-JP' }];
  assert.equal(pickVoice(iphone, 'zh-HK').lang, 'zh-HK'); assert.equal(pickVoice(iphone, 'zh-CN').lang, 'zh-CN');
  assert.equal(pickVoice([{ lang:'cmn-Hans-CN' }, { lang:'yue-Hant-HK' }], 'zh-CN').lang, 'cmn-Hans-CN');
  assert.equal(pickVoice([{ lang:'zh-TW' }, { lang:'zh-HK' }], 'zh-HK').lang, 'zh-HK');
  assert.equal(pickVoice([{ lang:'ko-KR' }, { lang:'en-US' }], 'zh-HK'), null);
  assert.equal(pickVoice([], 'ja'), null);
});
