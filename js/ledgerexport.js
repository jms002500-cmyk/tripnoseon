// 가계부 엑셀 내보내기. 지출 목록을 엑셀에서 한글이 안 깨지게 여는 CSV(UTF-8 BOM, 줄 끝 CRLF)로.
// 순수 함수(테스트 대상). 파일 저장·보내기(Web Share)는 app.js가 맡음.
import { catOf, PAYS, partyOf, ledgerSummary, rateOf, tripDates } from './ledger.js';
import { convert } from './prices.js';

export const CSV_HEAD = ['날짜', '일차', '분류', '내용', '금액', '통화', '원화 환산', '낸 사람', '누구 몫', '결제'];
const CUR_LABEL = { JPY:'엔', KRW:'원' };

// 칸 하나. 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감쌈.
// 글자 칸이 =, +, -, @ 로 시작하면 엑셀이 수식으로 읽으니(함께 짜는 사람이 적은 내용일 수도 있음) 앞에 '를 붙임
function cell(v){
  if(typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let t = String(v == null ? '' : v);
  if(/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
export const csvLine = row => row.map(cell).join(',');

// 지출 목록 → 표(머리줄 + 지출 줄 + 마지막 합계 줄). 순서는 가계부 화면과 같음(여행 전 → 날짜별 → 여행 후)
export function ledgerRows(s){
  const L = ledgerSummary(s); const rate = rateOf(s); const party = partyOf(s); const days = tripDates(s);
  const name = id => (party.find(p => p.id === id) || {}).name || '';
  const rows = [CSV_HEAD.slice()];
  let krw = 0, missing = 0; const byCur = {};
  L.groups.forEach(g => g.items.forEach(e => {
    const w = convert(e.amt, e.cur, 'KRW', rate);
    if(w == null) missing++; else krw += w;
    byCur[e.cur] = (byCur[e.cur] || 0) + e.amt;
    const i = days.indexOf(e.d);
    const sp = e.split && e.split.length
      ? (e.split.length === 1 && e.split[0] === e.by ? '혼자 부담' : e.split.map(name).filter(Boolean).join('·'))
      : party.length > 1 ? '모두' : '';
    rows.push([
      e.d === 'before' ? '여행 전' : e.d === 'after' ? '여행 후' : e.d || '',
      i >= 0 ? `${i + 1}일차` : '',
      catOf(e.cat).label, e.what || catOf(e.cat).label,
      e.amt, CUR_LABEL[e.cur] || e.cur,
      w == null ? '' : Math.round(w),
      name(e.by), sp,
      e.pay ? (PAYS.find(p => p.key === e.pay) || {}).label || '' : ''
    ]);
  }));
  // 합계: 원화 환산 칸에 원화 합계. 통화가 하나뿐이면 금액 칸에도 그 통화 합계
  const curs = Object.keys(byCur);
  const note = [`${L.count}건`, rate > 0 && byCur.JPY ? `환율 1엔 = ${rate.toFixed(2)}원` : '',
    missing ? `환율이 없어 엔화 ${missing}건은 원화 합계에서 빠짐` : ''].filter(Boolean).join(' · ');
  rows.push(['합계', '', '', note, curs.length === 1 ? byCur[curs[0]] : '', curs.length === 1 ? CUR_LABEL[curs[0]] : '',
    krw || !missing ? Math.round(krw) : '', '', '', '']);
  return rows;
}

export function ledgerCsv(s){ return '﻿' + ledgerRows(s).map(csvLine).join('\r\n') + '\r\n'; }

export function ledgerCsvName(now){
  const d = now || new Date(); const p = n => String(n).padStart(2, '0');
  return `tripnoseon-ledger-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}.csv`;
}
