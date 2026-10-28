// 실행: npm test  (숙소 이름은 지어낸 것도 섞임 — 실제 숙소 정보를 확인하는 테스트가 아님)
import test from 'node:test';
import assert from 'node:assert/strict';
import { kanaToHangul, kanaNameToKo, koHotelName, toKatakana } from '../js/janame.js';
import { parseVacant } from '../js/rakuten.js';

test('가나 → 한글: 첫머리 예사소리, 가운데 거센소리, 긴소리 생략, 받침', () => {
  assert.equal(kanaToHangul('トウキョウ'), '도쿄');
  assert.equal(kanaToHangul('シンジュク'), '신주쿠');
  assert.equal(kanaToHangul('ロッポンギ'), '롯폰기');
  assert.equal(kanaToHangul('ハママツチョウ'), '하마마쓰초');
  assert.equal(kanaToHangul('ツキジ'), '쓰키지');
  assert.equal(kanaToHangul('カブキチョウ'), '가부키초');
  assert.equal(kanaToHangul('ケイオウ'), '게이오');
  assert.equal(kanaToHangul('オオテマチ'), '오테마치');
  assert.equal(kanaToHangul('リョウゴク'), '료고쿠');
  assert.equal(kanaToHangul('チャ'), '자');
  assert.equal(kanaToHangul('フィ'), '피');
  assert.equal(toKatakana('しんじゅく'), 'シンジュク');
  assert.equal(toKatakana('ｼﾝｼﾞｭｸ'), 'シンジュク');
});

test('가나 이름 → 낱말마다 띄어 쓴 한글 (영어에서 온 말은 사전)', () => {
  assert.equal(kanaNameToKo('ミツイガーデンホテルギンザプレミア'), '미쓰이 가든 호텔 긴자 프리미어');
  assert.equal(kanaNameToKo('ケイオウプラザホテル'), '게이오 플라자 호텔');
  assert.equal(kanaNameToKo('トウヨコインシンジュクカブキチョウ'), '도요코 인 신주쿠 가부키초');
  assert.equal(kanaNameToKo('ホテルグレイスリーシンジュク'), '호텔 그레이서리 신주쿠');
  assert.equal(kanaNameToKo('トウキョウステーションホテル'), '도쿄 스테이션 호텔');
  assert.equal(kanaNameToKo('ホテル・ヴィラフォンテーヌ　ウエノ'), '호텔 빌라 퐁텐 우에노');
  assert.equal(kanaNameToKo('ほてるジャルシティ'), '호텔 JAL 시티');
  assert.equal(kanaNameToKo('シンジュクプリンスホテル'), '신주쿠 프린스 호텔');   // シンジュク 안의 'イン'에 걸리지 않음
});

test('숙소 이름 + 라쿠텐 읽기 → 한글 이름, 바꿀 필요 없으면 빈칸', () => {
  assert.equal(koHotelName('三井ガーデンホテル銀座プレミア', 'ミツイガーデンホテルギンザプレミア'), '미쓰이 가든 호텔 긴자 프리미어');
  assert.equal(koHotelName('アパホテル浅草駅前', ''), '아파 호텔 아사쿠사 에키마에');          // 읽기가 없으면 한자 사전으로
  assert.equal(koHotelName('東横INN新宿歌舞伎町'), '도요코 INN 신주쿠 가부키초');
  assert.equal(koHotelName('かずさ屋旅館', ''), '');                                       // 못 읽는 한자가 남으면 일본어 그대로
  assert.equal(koHotelName('THE KNOT TOKYO Shinjuku', 'ザノットトウキョウシンジュク'), '');   // 영어 이름은 그대로
  assert.equal(koHotelName('호텔 테스트', ''), '');
  assert.equal(koHotelName('', ''), '');
});

test('라쿠텐 응답의 숙소마다 한글 이름(ko)', () => {
  const json = { hotels:[[{ hotelBasicInfo:{ hotelNo:1, hotelName:'ホテルグレイスリー新宿', hotelKanaName:'ホテルグレイスリーシンジュク', hotelMinCharge:12000 } }],
    [{ hotelBasicInfo:{ hotelNo:2, hotelName:'ホテル2', hotelMinCharge:9000 } }]] };
  const r = parseVacant(json);
  assert.equal(r[0].ko, '호텔 그레이서리 신주쿠');
  assert.equal(r[1].ko, '호텔 2');
});
