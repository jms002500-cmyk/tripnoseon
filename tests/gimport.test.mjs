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
