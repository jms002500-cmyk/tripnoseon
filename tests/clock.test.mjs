// 시차·내 위치: 시간대 차이, 어디인지, 폰 시계가 다른 나라 시간인지, 좌표는 안 남김
import test from 'node:test';
import assert from 'node:assert/strict';
import { tzOffset, whereOf, clockView, diffText, HOME_TZ } from '../js/clock.js';
import { REGIONS } from '../js/data.js';
import { SHARED_KEYS } from '../js/sharecore.js';
import { stateForBackup } from '../js/backup.js';

const HK = REGIONS.hksz, TK = REGIONS.tokyo;
const at = new Date('2026-12-06T02:30:00Z');   // 한국 11:30, 홍콩 10:30

test('시간대 차이', () => {
  assert.equal(tzOffset(HOME_TZ, at), 540); assert.equal(tzOffset('Asia/Hong_Kong', at), 480); assert.equal(tzOffset('Asia/Tokyo', at), 540);
});

test('어디인지: 홍콩·선전, 한국, 그 밖', () => {
  assert.equal(whereOf({ lat:22.30, lng:114.17 }, HK), 'trip');   // 침사추이
  assert.equal(whereOf({ lat:22.54, lng:114.06 }, HK), 'trip');   // 선전 푸톈
  assert.equal(whereOf({ lat:37.46, lng:126.44 }, HK), 'home');   // 인천공항
  assert.equal(whereOf({ lat:35.18, lng:129.08 }, TK), 'home');   // 부산
  assert.equal(whereOf({ lat:35.68, lng:139.77 }, TK), 'trip');
  assert.equal(whereOf({ lat:25.03, lng:121.56 }, HK), 'other');  // 타이베이 경유
  assert.equal(whereOf(null, HK), '');
});

test('시계: 현지·한국 시각, 폰 시계가 아직 한국이면 알림', () => {
  const c = clockView(at, HK, 540, { where:'trip', at:at.getTime() });
  assert.equal(c.trip.min, 630); assert.equal(c.home.min, 690); assert.equal(c.diff, -60); assert.equal(c.phoneOff, 'home'); assert.ok(c.fresh);
  assert.equal(clockView(at, HK, 480, { where:'trip', at:0 }).phoneOff, '');                 // 폰이 홍콩 시간 → 알림 없음
  assert.equal(clockView(at, HK, 480, { where:'home', at:0 }).phoneOff, 'trip');             // 한국에 돌아왔는데 폰은 홍콩
  assert.equal(clockView(at, HK, 540, null).phoneOff, '');                                    // 위치를 모르면 알림 안 함
  assert.equal(clockView(at, TK, 540, { where:'trip', at:0 }).phoneOff, '');                  // 도쿄는 시차 없음
  assert.equal(clockView(at, TK, 60, { where:'trip', at:0 }).phoneOff, 'other');
  assert.equal(diffText(-60), '현지가 한국보다 1시간 늦어요'); assert.equal(diffText(0), '한국과 시차가 없어요'); assert.equal(diffText(90), '현지가 한국보다 1시간 30분 빨라요');
});

test('내 위치는 이 기기에만, 백업에도 안 넣음', () => {
  assert.ok(!SHARED_KEYS.includes('here'));
  assert.equal(stateForBackup({ here:{ where:'trip', at:1 }, start:'x' }).here, undefined);
});
