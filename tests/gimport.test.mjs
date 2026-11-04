// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, coordsFromUrl, nameFromUrl, safeMapUrl, parseImport, nearTokyo, nearestArea, toRow, rowToPlace, queryVariants } from '../js/gimport.js';

test('CSV: 따옴표 안의 쉼표·줄바꿈·BOM 처리', () => {
  const rows = parseCSV('﻿Title,Note,URL\r\n"도쿄, 타워","줄1\n줄2",https://x\r\n\r\n');
  assert.deepEqual(rows, [['Title', 'Note', 'URL'], ['도쿄, 타워', '줄1\n줄2', 'https://x']]);
});

test('링크에서 좌표: 장소 핀(!3d!4d)을 화면 중심(@)보다 우선', () => {
  const u = 'https://www.google.com/maps/place/浅草寺/@35.7,139.79,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d35.7147651!4d139.7966553';
  assert.deepEqual(coordsFromUrl(u), { lat:35.7147651, lng:139.7966553 });
  assert.deepEqual(coordsFromUrl('https://www.google.com/maps/@35.6586,139.7454,15z'), { lat:35.6586, lng:139.7454 });
  assert.deepEqual(coordsFromUrl('https://www.google.com/maps/search/35.6586,+139.7454'), { lat:35.6586, lng:139.7454 });
  assert.deepEqual(coordsFromUrl('https://maps.google.com/?q=35.6586,139.7454'), { lat:35.6586, lng:139.7454 });
});

test('테이크아웃 저장 목록 링크(좌표 없음)는 null, 이름은 주소에서 꺼냄', () => {
  const u = 'https://www.google.com/maps/place/%E6%B5%85%E8%8D%89%E5%AF%BA/data=!4m2!3m1!1s0x60188ec2bc9a7f2b:0x3c4f8a8b4b0f8e1';
  assert.equal(coordsFromUrl(u), null);
  assert.equal(nameFromUrl(u), '浅草寺');
});

test('구글 지도 주소만 링크로 허용', () => {
  assert.ok(safeMapUrl('https://www.google.com/maps/place/x'));
  assert.ok(safeMapUrl('https://maps.app.goo.gl/abc'));
  assert.equal(safeMapUrl('javascript:alert(1)'), '');
  assert.equal(safeMapUrl('https://evil.example/maps'), '');
});

test('테이크아웃 CSV 읽기: 제목 줄 건너뛰고 이름 중복 제거', () => {
  const csv = 'Title,Note,URL,Tags,Comment\n' +
    '센소지,아침 일찍,https://www.google.com/maps/place/x/data=!4m2!3m1!1s0x1:0x2,,\n' +
    '팀랩,,https://www.google.com/maps/place/y/data=!3d35.6491!4d139.7898,,\n' +
    '센소지,,https://www.google.com/maps/place/x,,\n';
  const list = parseImport(csv, '도쿄.csv');
  assert.equal(list.length, 2);
  assert.equal(list[0].name, '센소지'); assert.equal(list[0].note, '아침 일찍'); assert.equal(list[0].lat, null);
  assert.equal(list[1].lat, 35.6491);
});

test('Saved Places.json 읽기: [0,0] 좌표는 없는 것으로', () => {
  const json = JSON.stringify({ type:'FeatureCollection', features:[
    { type:'Feature', geometry:{ type:'Point', coordinates:[139.8107, 35.7101] }, properties:{ google_maps_url:'http://maps.google.com/?cid=1', location:{ name:'도쿄 스카이트리', address:'Oshiage' } } },
    { type:'Feature', geometry:{ type:'Point', coordinates:[0, 0] }, properties:{ google_maps_url:'http://maps.google.com/?cid=2', location:{ name:'이치란 라멘' } } }
  ]});
  const list = parseImport(json, 'Saved Places.json');
  assert.equal(list.length, 2);
  assert.deepEqual([list[0].lat, list[0].lng], [35.7101, 139.8107]);
  assert.equal(list[1].lat, null);
});

test('붙여넣기: 이름만, 링크만, 이름+링크', () => {
  const list = parseImport('츠키지 시장\nhttps://www.google.com/maps/place/%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC/@35.6586,139.7454,17z\n우리 단골집 https://maps.google.com/?q=35.69,139.70', '');
  assert.deepEqual(list.map(x => x.name), ['츠키지 시장', '東京タワー', '우리 단골집']);
  assert.equal(list[0].lat, null); assert.equal(list[1].lat, 35.6586); assert.equal(list[2].lng, 139.70);
});

test('도쿄에서 너무 먼 좌표는 위치 없음으로 처리', () => {
  assert.ok(nearTokyo({ lat:35.3192, lng:139.5467 }));      // 가마쿠라
  assert.ok(!nearTokyo({ lat:34.6937, lng:135.5023 }));     // 오사카
  const r = toRow({ name:'오사카성', url:'', note:'', lat:34.6873, lng:135.5262 }, 'k1');
  assert.equal(r.st, 'need'); assert.equal(r.lat, null);
});

test('가까운 동네 찾기와 장소로 바꾸기', () => {
  assert.equal(nearestArea({ lat:35.7148, lng:139.7967 }).key, 'asakusa');   // 센소지
  const ok = rowToPlace({ name:'센소지', lat:35.7148, lng:139.7967, area:'asakusa', hours:1.5, url:'', note:'' }, 'g1', 1);
  assert.equal(ok.area, 'asakusa'); assert.equal(ok.approx, false); assert.equal(ok.custom, true);
  const rough = rowToPlace({ name:'단골집', lat:null, lng:null, area:'shinjuku', hours:1, url:'', note:'' }, 'g2', 2);
  assert.equal(rough.approx, true); assert.ok(Math.abs(rough.lat - 35.6909) < 0.01);
});

test('검색어 후보: 붙여 쓰기, 도쿄 빼기, 지점명 빼기 (최대 3개)', () => {
  assert.deepEqual(queryVariants('도쿄 국립박물관'), ['도쿄 국립박물관', '도쿄국립박물관', '국립박물관']);
  assert.deepEqual(queryVariants('이치란 시부야점'), ['이치란 시부야점', '이치란시부야점', '이치란 시부야']);
  assert.deepEqual(queryVariants('センソウジ'), ['センソウジ']);
});

test('이름 없이 좌표 링크만 붙여도 목록에 들어감', () => {
  const list = parseImport('https://maps.google.com/?q=35.6895,139.6917', '');
  assert.equal(list.length, 1); assert.match(list[0].name, /지도에 찍은 곳/); assert.equal(list[0].lat, 35.6895);
});

test('구글 지도 앱 공유로 열림: 이름·주소로 찾을 말, 짧은 주소는 링크로', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  assert.equal(sharedPlace(P({})), null);
  assert.equal(sharedPlace(P({ dev:'1' })), null);
  // 구글 지도 앱이 보내는 모양: 글에 이름·주소·짧은 주소
  assert.deepEqual(sharedPlace(P({ sx:'팀호완 삼수이포\n9-11 Fuk Wing St, Sham Shui Po\nhttps://maps.app.goo.gl/AbCd123' })),
    { q:'팀호완 삼수이포 9-11 Fuk Wing St, Sham Shui Po', name:'팀호완 삼수이포', url:'https://maps.app.goo.gl/AbCd123' });
  // 제목에 이름, 주소 칸에 링크
  assert.deepEqual(sharedPlace(P({ st:'Tim Ho Wan', su:'https://maps.app.goo.gl/x9' })), { q:'Tim Ho Wan', name:'Tim Ho Wan', url:'https://maps.app.goo.gl/x9' });
  // '구글 지도' 같은 머리말은 빼고, 이상한 주소는 링크로 안 씀
  const r = sharedPlace(P({ st:'Google Maps', sx:'센소지\nhttps://evil.example/x' }));
  assert.equal(r.name, '센소지'); assert.equal(r.url, '');
  // 긴 주소 글은 120자까지
  assert.ok(sharedPlace(P({ sx:'가'.repeat(80) + '\n' + '나'.repeat(80) })).q.length <= 120);
});

// 구글 지도 앱 '공유 → 트립노선'으로 실제로 오는 모양들 (장소·주소·짧은 주소는 지어낸 값)
test('공유 받기: 한국어·영어 이름, 이름과 주소가 다른 줄', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  assert.deepEqual(sharedPlace(P({ sx:'센소지\n2 Chome-3-1 Asakusa, Taito City, Tokyo\n\nhttps://maps.app.goo.gl/Ab12Cd' })),
    { q:'센소지 2 Chome-3-1 Asakusa, Taito City, Tokyo', name:'센소지', url:'https://maps.app.goo.gl/Ab12Cd' });
  assert.deepEqual(sharedPlace(P({ st:'Senso-ji', sx:'Senso-ji\r\n2-3-1 Asakusa, Taito City\r\nhttps://maps.app.goo.gl/Ab12Cd' })),
    { q:'Senso-ji 2-3-1 Asakusa, Taito City', name:'Senso-ji', url:'https://maps.app.goo.gl/Ab12Cd' });
  // 제목과 글 첫 줄이 대소문자만 다르면 한 번만
  assert.equal(sharedPlace(P({ st:'Tim Ho Wan', sx:'TIM HO WAN\nhttps://maps.app.goo.gl/a1' })).q, 'Tim Ho Wan');
  // 한 줄에 이름과 짧은 주소
  assert.deepEqual(sharedPlace(P({ sx:'딤섬 가게 테스트점 https://maps.app.goo.gl/z9' })), { q:'딤섬 가게 테스트점', name:'딤섬 가게 테스트점', url:'https://maps.app.goo.gl/z9' });
});

test('공유 받기: 짧은 주소만·빈 칸·쓸 게 없는 공유', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  // 짧은 주소만 → 이름은 모름(지도에서 검색칸 안내), 링크는 남김
  assert.deepEqual(sharedPlace(P({ su:'https://maps.app.goo.gl/OnlyLink1' })), { q:'', name:'', url:'https://maps.app.goo.gl/OnlyLink1' });
  assert.deepEqual(sharedPlace(P({ sx:'https://maps.app.goo.gl/OnlyLink1' })), { q:'', name:'', url:'https://maps.app.goo.gl/OnlyLink1' });
  // 긴 구글 지도 주소면 주소 속 이름을 씀
  assert.equal(sharedPlace(P({ sx:'https://www.google.com/maps/place/Tim+Ho+Wan+(Sham+Shui+Po)/@22.33,114.16,17z' })).name, 'Tim Ho Wan (Sham Shui Po)');
  assert.equal(sharedPlace(P({ st:'', sx:'  ', su:'' })), null);
  assert.equal(sharedPlace(null), null);
  assert.equal(sharedPlace({}), null);
  // 앱 이름만·구글 지도가 아닌 주소만이면 공유로 쓸 게 없음
  assert.equal(sharedPlace(P({ st:'구글 지도에서 보기', su:'https://evil.example/x' })), null);
  assert.equal(sharedPlace(P({ st:'Google Maps' })), null);
  // 드롭한 핀·좌표만 있는 줄은 이름이 아님
  assert.deepEqual(sharedPlace(P({ sx:'Dropped pin\n22.3193, 114.1694\nhttps://maps.app.goo.gl/pin1' })), { q:'', name:'', url:'https://maps.app.goo.gl/pin1' });
  assert.equal(sharedPlace(P({ sx:'드롭한 핀\nhttps://maps.app.goo.gl/pin2' })).name, '');
});

test('공유 받기: 구글 지도·Google 지도 머리말 줄', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  for(const head of ['구글 지도', '구글지도', 'Google Maps', 'Google 지도', 'google maps에서 보기', '구글 지도에서 공유'])
    assert.equal(sharedPlace(P({ st:head, sx:`센소지\nhttps://maps.app.goo.gl/h1` })).name, '센소지', head);
  // 'Google 지도: 이름'이면 뒤를 이름으로
  assert.equal(sharedPlace(P({ sx:'Google 지도: 센소지\nhttps://maps.app.goo.gl/h2' })).name, '센소지');
  assert.equal(sharedPlace(P({ st:'Google Maps: Senso-ji' })).q, 'Senso-ji');
});

test('공유 받기: 제목·글 속 주소, 문장부호, 이상한 주소', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  // 제목 안의 주소는 빼고 이름만
  assert.deepEqual(sharedPlace(P({ st:'Senso-ji https://maps.app.goo.gl/t1 temple' })), { q:'Senso-ji temple', name:'Senso-ji temple', url:'https://maps.app.goo.gl/t1' });
  // 괄호·마침표가 주소에 붙지 않음
  assert.deepEqual(sharedPlace(P({ sx:'센소지 (https://maps.app.goo.gl/p1)' })), { q:'센소지', name:'센소지', url:'https://maps.app.goo.gl/p1' });
  assert.deepEqual(sharedPlace(P({ sx:'센소지.\nhttps://maps.app.goo.gl/p2.' })), { q:'센소지.', name:'센소지.', url:'https://maps.app.goo.gl/p2' });
  assert.equal(sharedPlace(P({ sx:'센소지 (https://maps.app.goo.gl/p3) 본당' })).name, '센소지 본당');
  // 주소에 따옴표·꺾쇠는 들어가지 않음
  assert.equal(sharedPlace(P({ st:'Senso-ji', su:'https://maps.app.goo.gl/q2"><b>x' })).url, 'https://maps.app.goo.gl/q2');
  // 다른 사이트 주소가 먼저 와도 구글 지도 주소를 고름 (주소 칸 우선)
  assert.equal(sharedPlace(P({ sx:'센소지 https://evil.example/a', su:'https://maps.app.goo.gl/ok1' })).url, 'https://maps.app.goo.gl/ok1');
  assert.equal(sharedPlace(P({ sx:'센소지 https://evil.example/a\nhttps://maps.app.goo.gl/ok2' })).url, 'https://maps.app.goo.gl/ok2');
  assert.equal(sharedPlace(P({ sx:'센소지 javascript:alert(1)' })).url, '');
});

test('공유 받기: 아주 긴 글은 잘라서', async () => {
  const { sharedPlace } = await import('../js/gimport.js');
  const P = o => new URLSearchParams(o);
  const r = sharedPlace(P({ st:'이'.repeat(500), sx:('주소 '.repeat(2000)) + '\nhttps://maps.app.goo.gl/long1' }));
  assert.ok(r.name.length <= 60); assert.ok(r.q.length <= 120);
  assert.equal(r.url, '');   // 2000자 넘는 뒤쪽 링크는 버림(글을 끝까지 읽지 않음)
  const many = sharedPlace(P({ sx:Array.from({ length:500 }, (_, i) => `줄 ${i}`).join('\n') }));
  assert.equal(many.q, '줄 0 줄 1');
});

test('공유 칸만 주소에서 지우기', async () => {
  const { stripShare } = await import('../js/gimport.js');
  assert.equal(stripShare('?st=a&sx=b&su=c'), '');
  assert.equal(stripShare('?st=a&dev=1&sx=b'), '?dev=1');
  assert.equal(stripShare(''), '');
  assert.equal(stripShare('?dev=0'), '?dev=0');
});
