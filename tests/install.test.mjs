// 홈 화면 설치 안내: 브라우저마다 맞는 안내
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHint } from '../js/install.js';

const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36';
const KAKAO = CHROME + ' KAKAOTALK 10.9.0';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

test('이미 홈 화면 앱이면 안내 안 함', () => assert.equal(installHint(CHROME, { standalone:true, canPrompt:true }), null));
test('카카오톡 안 브라우저는 다른 브라우저로 열라고', () => assert.equal(installHint(KAKAO, { canPrompt:false }).kind, 'inapp'));
test('설치 창을 띄울 수 있으면 버튼', () => assert.equal(installHint(CHROME, { canPrompt:true }).kind, 'prompt'));
test('브라우저별 메뉴 안내', () => {
  assert.equal(installHint(SAMSUNG, {}).kind, 'samsung');
  assert.equal(installHint(CHROME, {}).kind, 'chrome');
  assert.equal(installHint(IPHONE, {}).kind, 'ios'); assert.match(installHint(IPHONE, {}).steps[0], /공유 버튼/);
  assert.match(installHint(IPHONE_CHROME, {}).steps[0], /사파리/);
});
test('PC는 설치 창이 없으면 안내 안 함', () => {
  assert.equal(installHint(PC, { mobile:false }), null);
  assert.equal(installHint(PC, { canPrompt:true }).kind, 'prompt');
});
