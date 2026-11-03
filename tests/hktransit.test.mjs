// 홍콩 MTR 다음 열차: 역 목록·좌표 · 가까운 역 · 주소 · 답 읽기(실제 응답 모양) · 문구
import test from 'node:test';
import assert from 'node:assert/strict';
import { MTR_STATIONS, MTR_LINES, nearStations, distText, mtrUrl, parseNextTrain, waitText, dirText, stationKo, MTR_ERR } from '../js/hktransit.js';
import { AREAS } from '../js/regions/hksz-data.js';

const km = (a, b) => { const r = Math.PI / 180; return 6371 * Math.hypot((b.lng - a.lng) * r * Math.cos((a.lat + b.lat) / 2 * r), (b.lat - a.lat) * r); };

test('역 목록: 97역, 홍콩 안 좌표, 노선은 다음 열차 API의 노선만', () => {
  const all = Object.values(MTR_STATIONS);
  assert.equal(all.length, 97);
  all.forEach(s => {
    assert.ok(s.lat > 22.19 && s.lat < 22.55 && s.lng > 113.9 && s.lng < 114.28, `${s.code} 좌표가 홍콩 밖이에요`);
    assert.ok(s.ko && s.zh && s.lines.length, s.code);
    s.lines.forEach(l => assert.ok(MTR_LINES[l], `${s.code}의 ${l}`));
  });
  assert.deepEqual(MTR_STATIONS.ADM.lines.slice().sort(), ['EAL', 'ISL', 'SIL', 'TWL']);
  assert.deepEqual(MTR_STATIONS.DIS.lines, ['DRL']);
  assert.ok(MTR_STATIONS.SUN.lines.includes('DRL') && MTR_STATIONS.SUN.lines.includes('TCL'));
  assert.equal(new Set(all.map(s => s.ko)).size, 97, '한국어 이름이 겹쳐요');
});

test('역 좌표가 앱의 동네 대표역 좌표와 0.3km 안 (따로 대조한 값끼리)', () => {
  const pairs = { tst:'TST', mongkok:'MOK', central:'CEN', cwb:'CAB', disney:'DIS', tungchung:'TUC', south:'OCP' };
  Object.entries(pairs).forEach(([a, c]) => assert.ok(km(AREAS[a], MTR_STATIONS[c]) < 0.3, `${a} ↔ ${c} ${km(AREAS[a], MTR_STATIONS[c]).toFixed(2)}km`));
});

test('가까운 역: 가까운 순, 개수·거리 제한', () => {
  const avenue = { lat:22.2935, lng:114.1740 };   // 침사추이 해변 산책로
  const n = nearStations(avenue, 3);
  assert.equal(n.length, 3);
  assert.deepEqual(n.slice(0, 2).map(x => x.code), ['ETS', 'TST']);
  assert.ok(n[0].km <= n[1].km && n[1].km <= n[2].km);
  assert.equal(nearStations({ lat:22.3155, lng:114.0451 }, 1)[0].code, 'DIS');   // 디즈니 리조트
  assert.equal(nearStations({ lat:22.5383, lng:114.0567 }, 5, 5)[0].code, 'LMC');   // 선전 푸톈도 국경 역이 가까워서, 화면은 도시(홍콩)로 따로 거름
  assert.equal(nearStations({ lat:22.62, lng:114.14 }, 5, 5).length, 0);   // 선전 룽강: 5km 안에 MTR역 없음
  assert.deepEqual(nearStations(null), []);
  assert.deepEqual(nearStations({ lat:'', lng:undefined }), []);
});

test('거리 한마디', () => {
  assert.equal(distText(0.01), '약 50m');
  assert.equal(distText(0.34), '약 350m');
  assert.equal(distText(1.24), '약 1.2km');
});

test('요청 주소: 그 노선에 있는 역만', () => {
  assert.equal(mtrUrl('TWL', 'TST'), 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=TWL&sta=TST');
  assert.equal(mtrUrl('DRL', 'DIS'), 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=DRL&sta=DIS');
  assert.equal(mtrUrl('ISL', 'TST'), '');     // 침사추이에는 아일랜드선이 없음
  assert.equal(mtrUrl('XXX', 'ADM'), '');
  assert.equal(mtrUrl('TWL', '<b>'), '');
});

// 실제 응답 모양 (2026-09 · 2026-04에 기록된 공개 응답을 본뜸, 시각만 바꿈)
const ISL_ADM = JSON.stringify({ sys_time:'2026-12-07 14:16:54', curr_time:'2026-12-07 14:16:44', data:{ 'ISL-ADM':{ curr_time:'2026-12-07 14:16:44', sys_time:'2026-12-07 14:16:54',
  UP:[{ seq:'1', dest:'CHW', plat:'3', time:'2026-12-07 14:19:44', ttnt:'3', valid:'Y', source:'-' }, { seq:'2', dest:'CHW', plat:'3', time:'2026-12-07 14:24:44', ttnt:'8', valid:'Y', source:'-' },
      { seq:'3', dest:'CHW', plat:'3', time:'2026-12-07 14:27:44', ttnt:'11', valid:'Y', source:'-' }, { seq:'4', dest:'CHW', plat:'3', time:'2026-12-07 14:31:44', ttnt:'15', valid:'Y', source:'-' }],
  DOWN:[{ seq:'1', dest:'KET', plat:'2', time:'2026-12-07 14:17:10', ttnt:'0', valid:'Y', source:'-' }, { seq:'2', dest:'KET', plat:'2', time:'2026-12-07 14:23:44', ttnt:'7', valid:'Y', source:'-' }] } },
  isdelay:'N', status:1, message:'successful' });

test('답 읽기: 방향마다 몇 분 뒤·시각·승강장 (ttnt 대신 시각으로 셈)', () => {
  const r = parseNextTrain(ISL_ADM, 'ISL', 'ADM');
  assert.equal(r.ok, true);
  assert.equal(r.at, '14:16'); assert.equal(r.delay, false);
  assert.equal(r.dirs.length, 2);
  const [up, down] = r.dirs;
  assert.equal(up.dir, 'UP'); assert.deepEqual(up.dests, ['CHW']); assert.equal(up.plat, '3');
  assert.deepEqual(up.trains.map(t => t.min), [3, 8, 11]);   // 3대까지
  assert.deepEqual(up.trains.map(t => t.time), ['14:19', '14:24', '14:27']);
  assert.equal(down.trains[0].min, 0);
  assert.equal(dirText(up), '차이완 방면');
  assert.equal(waitText(up.trains[0]), '3분 뒤');
  assert.equal(waitText(down.trains[0]), '곧 도착');
});

test('답 읽기: 종점(한 방향만)·지연·이미 떠난 열차', () => {
  const t = JSON.stringify({ sys_time:'2026-12-08 09:00:05', curr_time:'2026-12-08 09:00:00', data:{ 'DRL-SUN':{ curr_time:'2026-12-08 09:00:00', sys_time:'2026-12-08 09:00:05',
    DOWN:[{ seq:'1', dest:'DIS', plat:'3', time:'2026-12-08 08:58:00', ttnt:'0', valid:'Y', source:'-' }, { seq:'2', dest:'DIS', plat:'3', time:'2026-12-08 09:02:30', ttnt:'2', valid:'Y', source:'-' }] } },
    isdelay:'Y', status:1, message:'successful' });
  const r = parseNextTrain(t, 'DRL', 'SUN');
  assert.equal(r.ok, true); assert.equal(r.delay, true);
  assert.equal(r.dirs.length, 1);
  assert.deepEqual(r.dirs[0].trains.map(t => t.min), [2]);   // 2분 전 열차는 뺌
  assert.equal(dirText(r.dirs[0]), '디즈니랜드 리조트 방면');
});

test('답 읽기: 동철선 행선지 여럿·경마장 경유·출발(timeType D)', () => {
  const t = JSON.stringify({ sys_time:'2026-12-09 10:00:00', curr_time:'2026-12-09 10:00:00', data:{ 'EAL-ADM':{ curr_time:'2026-12-09 10:00:00', sys_time:'2026-12-09 10:00:00',
    UP:[{ seq:'1', dest:'LOW', plat:'1', time:'2026-12-09 10:00:20', ttnt:'0', valid:'Y', source:'-', route:'', timeType:'D' },
        { seq:'2', dest:'LMC', plat:'2', time:'2026-12-09 10:04:00', ttnt:'4', valid:'Y', source:'-', route:'RAC', timeType:'D' }] } },
    isdelay:'N', status:1, message:'successful' });
  const r = parseNextTrain(t, 'EAL', 'ADM'); const d = r.dirs[0];
  assert.deepEqual(d.dests, ['LOW', 'LMC']);
  assert.equal(d.plat, '');   // 승강장이 달라서 열차마다
  assert.equal(dirText(d), '로우·록마차우 방면');
  assert.equal(waitText(d.trains[0]), '곧 출발');
  assert.equal(d.trains[1].rac, true);
});

test('답 읽기: 특별 운행 안내·빈 자료·이상한 답', () => {
  const alert = parseNextTrain(JSON.stringify({ status:0, message:'Special train service arrangements are now in place on this line. Please click here for more information.', url:'https://www.mtr.com.hk/alert/alert_title_wap.html', curr_time:'2026-12-07 08:00:00' }), 'TCL', 'TUC');
  assert.equal(alert.ok, false); assert.equal(alert.err, 'alert');
  assert.equal(alert.msg, 'Special train service arrangements are now in place on this line.');
  assert.equal(alert.url, 'https://www.mtr.com.hk/alert/alert_title_wap.html');
  const evil = parseNextTrain(JSON.stringify({ status:0, message:'x', url:'javascript:alert(1)' }), 'TCL', 'TUC');
  assert.equal(evil.url, '');   // MTR 누리집 주소만 링크로
  // 실제 빈 답 (NT-204)
  const empty = parseNextTrain(JSON.stringify({ resultCode:0, timestamp:'2026-12-07 01:30:00', error:{ errorCode:'NT-204', errorMsg:'The contents are empty!' }, status:0, message:'The contents are empty!' }), 'SIL', 'OCP');
  assert.equal(empty.err, 'none');
  // 자료가 없을 때 시각이 '-'
  assert.equal(parseNextTrain(JSON.stringify({ sys_time:'-', curr_time:'-', data:{ 'TWL-TST':{ curr_time:'-', sys_time:'-', UP:[], DOWN:[] } }, isdelay:'N', status:1, message:'successful' }), 'TWL', 'TST').err, 'none');
  // 방향 둘 다 비었음 (실제 EAL-RAC 답)
  assert.equal(parseNextTrain(JSON.stringify({ sys_time:'2026-12-07 16:22:15', curr_time:'2026-12-07 16:22:12', data:{ 'EAL-RAC':{ curr_time:'2026-12-07 16:22:12', sys_time:'2026-12-07 16:22:15', UP:[], DOWN:[] } }, isdelay:'N', status:1, message:'successful' }), 'EAL', 'RAC').err, 'none');
  assert.equal(parseNextTrain('<html>502 Bad Gateway</html>', 'TWL', 'TST').err, 'bad');
  assert.equal(parseNextTrain('', 'TWL', 'TST').err, 'bad');
  assert.equal(parseNextTrain('null', 'TWL', 'TST').err, 'bad');
  Object.keys(MTR_ERR).forEach(k => assert.ok(MTR_ERR[k].endsWith('요.'), k));
});

test('역 이름', () => {
  assert.equal(stationKo('TST'), '침사추이역');
  assert.equal(stationKo('ZZZ'), 'ZZZ');
});
