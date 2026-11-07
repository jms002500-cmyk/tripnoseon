// 실행: npm test  (네트워크는 쓰지 않음)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT } from '../js/data.js';
import { clone, compareHotels } from '../js/logic.js';
import { SITES, siteUrl, convert, addKrw, priceOptions, bestPrice } from '../js/prices.js';

test('글 속 현지 금액에 원화 참고 금액을 붙임', () => {
  const r = { HKD:190, CNY:200, JPY:9 };
  assert.equal(addKrw('1인 약 HK$30~45 · 걸어서 5분', r), '1인 약 HK$30~45 (약 5,700~8,600원) · 걸어서 5분');
  assert.equal(addKrw('어른 HK$3.3, 아이 HK$1.6이에요.', r), '어른 HK$3.3 (약 630원), 아이 HK$1.6 (약 300원)이에요.');
  assert.equal(addKrw('보증금 HK$350쯤부터', r), '보증금 HK$350쯤 (약 66,500원)부터');
  assert.equal(addKrw('HK$120,000 넘으면 신고', r), 'HK$120,000 (약 22,800,000원) 넘으면 신고');
  assert.equal(addKrw('2층 HK$5.0·1층 HK$4.0', r), '2층 HK$5.0 (약 950원)·1층 HK$4.0 (약 760원)');   // 가운뎃점 뒤 층수를 금액으로 읽지 않음
  assert.equal(addKrw('HK$500·1,000 지폐', r), 'HK$500·1,000 (약 95,000~190,000원) 지폐');
  assert.equal(addKrw('입장료 60위안', r), '입장료 60위안 (약 12,000원)');
  assert.equal(addKrw('라멘 1,200엔이에요', r), '라멘 1,200엔 (약 10,800원)이에요');
  assert.equal(addKrw('¥100~150', r, 'CNY'), '¥100~150 (약 20,000~30,000원)');
  assert.equal(addKrw('¥100', r), '¥100 (약 900원)');
  assert.equal(addKrw('엔화·위안화·3엔진·HK$ 없음', r), '엔화·위안화·3엔진·HK$ 없음');
  const once = addKrw('HK$30', r);
  assert.equal(addKrw(once, r), once);                                  // 다시 그려도 두 번 안 붙음
  assert.equal(addKrw('HK$30 (20원)', {}), 'HK$30 (20원)');             // 환율이 없으면 그대로
  assert.equal(addKrw('HK$30', null), 'HK$30');
});

const s0 = () => Object.assign(clone(DEFAULT), { who:'family', adults:2, kids:[9], start:'2027-03-07', end:'2027-03-11' });
const site = k => SITES.find(x => x.key === k);
const H = { id:'h1', name:'ホテルA', price:20000, src:'rakuten' };

test('사이트 주소에 날짜·인원(아이 나이)이 들어감', () => {
  const s = s0();
  const ag = new URL(siteUrl(site('agoda'), H, s));
  assert.equal(ag.searchParams.get('city'), '5085'); assert.equal(ag.searchParams.get('checkIn'), '2027-03-07');
  assert.equal(ag.searchParams.get('los'), '4'); assert.equal(ag.searchParams.get('adults'), '2'); assert.equal(ag.searchParams.get('childAges'), '9');
  const bk = new URL(siteUrl(site('booking'), H, s));
  assert.equal(bk.searchParams.get('ss'), 'ホテルA'); assert.equal(bk.searchParams.get('checkout'), '2027-03-11'); assert.equal(bk.searchParams.get('age'), '9');
  const tr = new URL(siteUrl(site('trip'), H, s));
  assert.equal(tr.searchParams.get('city'), '228'); assert.equal(tr.searchParams.get('ages'), '9');
  const rk = new URL(siteUrl(site('rakutenKr'), H, s));
  assert.ok(rk.pathname.startsWith('/kor/ko-kr/hotel_list/cnt_japan/sub_tokyo/'));
  assert.equal(rk.searchParams.get('startServiceDate'), '2027-03-07'); assert.equal(rk.searchParams.get('numberOfAdults_1'), '3');
  // 날짜가 없으면 날짜 없이
  assert.equal(new URL(siteUrl(site('agoda'), H, clone(DEFAULT))).searchParams.get('checkIn'), null);
});

test('통화 바꾸기 (1엔 = 8.5원)', () => {
  assert.equal(convert(10000, 'JPY', 'KRW', 8.5), 85000);
  assert.equal(convert(85000, 'KRW', 'JPY', 8.5), 10000);
  assert.equal(convert(100, 'KRW', 'KRW', null), 100);
  assert.equal(convert(100, 'KRW', 'JPY', null), null);
  assert.equal(convert(0, 'JPY', 'JPY', 1), null);
});

test('가장 싼 곳: 원화로 적은 사이트 가격을 엔으로 바꿔 라쿠텐 가격과 비교', () => {
  const h = Object.assign({}, H, { prices:{ agoda:{ v:161500, cur:'KRW' }, booking:{ v:180000, cur:'KRW' }, trip:{ v:0, cur:'KRW' } } });
  const opts = priceOptions(h, 'JPY', 8.5);
  assert.deepEqual(opts.map(o => o.key), ['base', 'agoda', 'booking']);   // 0원은 빼고
  const b = bestPrice(h, 'JPY', 8.5);
  assert.equal(b.key, 'agoda'); assert.equal(b.value, 19000);
  assert.equal(bestPrice(h, 'JPY', null).key, 'base');   // 환율이 없으면 같은 통화끼리만
});

test('비교 계산이 사이트 최저가로 합계·정렬', () => {
  const s = s0(); s.fx = { rate:8.5 };
  s.hotels = [
    { id:'a', name:'A', lat:35.71, lng:139.79, price:20000, prices:{ agoda:{ v:127500, cur:'KRW' } } },   // 최저 15000엔
    { id:'b', name:'B', lat:35.71, lng:139.79, price:17000 }
  ];
  const r = compareHotels(s, 'price').rows;
  assert.deepEqual(r.map(x => x.h.id), ['a', 'b']);
  assert.equal(r[0].price, 15000); assert.equal(r[0].total, 60000); assert.equal(r[0].best.key, 'agoda');
});

test('직접 넣은 숙소 가격은 넣을 때 통화로 기억 (나중에 통화를 바꿔도 금액이 안 바뀜)', () => {
  const rate = { HKD:170, CNY:200 };
  const h = { price:1450, pcur:'HKD' };
  assert.equal(bestPrice(h, 'HKD', rate).value, 1450);
  const c = bestPrice(h, 'CNY', rate); assert.equal(c.cur, 'HKD'); assert.equal(Math.round(c.value), Math.round(1450 * 170 / 200));
  assert.equal(bestPrice({ price:900 }, 'CNY', rate).value, 900);   // 옛 데이터(pcur 없음)는 지금 통화로
});
