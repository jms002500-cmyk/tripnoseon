// 확인서 글을 이 폰 안에서 규칙으로 읽기 (js/docparse.js) — 실제 확인서 모양을 본뜬 글(가짜 이름·번호)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocText, findDates, findTimes } from '../js/docparse.js';
import { readDrafts } from '../js/readdoc.js';

const AIRLINE = `ELECTRONIC TICKET ITINERARY/RECEIPT
Date of Issue: 01NOV26
Booking Reference: ABC123
Passenger Name                Ticket Number
HONG/GILDONG MR               160 1234567890
KIM/YOUNGHEE MS               160 1234567891
HONG/MINJUN MSTR              160 1234567892
Flight   Date    From                     To                       Depart  Arrive
CX 411   20DEC   SEOUL INCHEON ICN        HONG KONG HKG            09:05   11:55
CX 438   23DEC   HONG KONG HKG            SEOUL INCHEON ICN        18:40   23:10
Total Amount KRW 1,650,000`;

const OTA = `[여행사] 항공권 예약 확인
예약번호: QX7T2M   발권일 2026.11.01 14:22
여정 1  대한항공 KE603
2026년 12월 20일 (일)  인천(ICN) 08:30 → 홍콩(HKG) 11:20
여정 2  대한항공 KE608
2026년 12월 26일 (토)  홍콩(HKG) 19:35 → 인천(ICN) 00:15
탑승객  HONG/GILDONG MR · KIM/YOUNGHEE MS · HONG/MINJUN MSTR
총 결제금액 1,284,600원`;

const HOTEL = `Booking confirmation
Confirmation number: 4821937551
Harbour Grand Kowloon
香港九龍紅磡德豐街20號
Check-in: Sun 20 Dec 2026 (from 15:00)
Check-out: Wed 23 Dec 2026 (until 12:00)
Total price HK$ 5,400`;

test('항공사 e-티켓(영문 표): 두 편·예약번호·탑승객별 티켓 번호·금액, 발행일은 안 고름', () => {
  const r = parseDocText(AIRLINE, { year:2026 });
  assert.equal(r.kind, 'flight');
  assert.deepEqual(r.items.map(x => [x.fno, x.from, x.to, x.date, x.time, x.time2, x.code]),
    [['CX411', 'ICN', 'HKG', '2026-12-20', '09:05', '11:55', 'ABC123'], ['CX438', 'HKG', 'ICN', '2026-12-23', '18:40', '23:10', 'ABC123']]);
  assert.deepEqual(r.items[0].passengers.map(p => [p.name, p.ticket]), [['HONG/GILDONG MR', '160-1234567890'], ['KIM/YOUNGHEE MS', '160-1234567891'], ['HONG/MINJUN MSTR', '160-1234567892']]);
  assert.deepEqual([r.items[0].amount, r.items[0].currency], [1650000, 'KRW']);
  // 보관함 초안으로: 인원별 번호까지
  const d = readDrafts({ city:'hksz', adults:2, kids:[10] }, r);
  assert.deepEqual([d[0].dir, d[0].ap, d[1].dir], ['out', 'HKG', 'back']);
  assert.deepEqual(d[0].pcode, { a1:'160-1234567890', a2:'160-1234567891', k1:'160-3333333333'.replace('3333333333', '1234567892') });
});

test('한국 여행사 확인서: 2026년 12월 20일·인천(ICN) → 홍콩(HKG)·원', () => {
  const r = parseDocText(OTA, { year:2026 });
  assert.deepEqual(r.items.map(x => [x.fno, x.from, x.to, x.date, x.time, x.time2]),
    [['KE603', 'ICN', 'HKG', '2026-12-20', '08:30', '11:20'], ['KE608', 'HKG', 'ICN', '2026-12-26', '19:35', '00:15']]);
  assert.equal(r.items[0].code, 'QX7T2M');
  assert.deepEqual([r.items[0].amount, r.items[0].currency], [1284600, 'KRW']);
  assert.equal(r.items[0].passengers.length, 3);
});

test('숙소 바우처: 체크인·체크아웃 날짜와 시각, 이름, 현지어 주소, 홍콩달러', () => {
  const r = parseDocText(HOTEL, { year:2026 });
  assert.equal(r.kind, 'hotel');
  const h = r.items[0];
  assert.deepEqual([h.title, h.date, h.date2, h.time, h.time2, h.code, h.addr, h.amount, h.currency],
    ['Harbour Grand Kowloon', '2026-12-20', '2026-12-23', '15:00', '12:00', '4821937551', '香港九龍紅磡德豐街20號', 5400, 'HKD']);
});

test('날짜·시각 모양들, 못 찾으면 빈 목록', () => {
  assert.deepEqual(findDates('20DEC26 · 2026-12-21 · Dec 22, 2026 · 12월 23일 · 2026년 12월 24일', 2026).map(x => x.key),
    ['2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24']);
  assert.deepEqual(findDates('31FEB · 2026-13-01', 2026), []);
  assert.deepEqual(findTimes('09:05 · 23:10 · 24:00 · 1234 · 12:345').map(x => x.hm), ['09:05', '23:10']);
  assert.deepEqual(parseDocText('안녕하세요 확인서가 아니에요').items, []);
  assert.equal(parseDocText('UP TO 3000 POINTS').items.length, 0);   // 공항이 없으면 편명으로 안 봄
});
