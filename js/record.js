// 여행 기록 한 장: 날짜별 간 곳·동선·쓴 돈·사진·한마디를 한 화면에 묶고, 글로 보내거나 인쇄(PDF로 저장)할 수 있게.
// 사진·한마디는 보관함 항목(kind 'photo', 날짜마다 하나)으로 둠 → 영수증처럼 첨부 저장·크게 보기·백업을 그대로 씀. 이 기기에만(공유 안 함).
// 순수 함수(테스트 대상). 화면은 views.js vRecord, 사진 넣기는 app.js.
import { ledgerSummary, money } from './ledger.js';
import { doneKey } from './today.js';

export const MAX_DAY_PHOTOS = 6;
export const isPhoto = it => !!it && it.kind === 'photo';
export const photoOf = (vault, date) => (vault || []).find(it => isPhoto(it) && it.date === date) || null;
export const newPhotoItem = (date, id) => ({ id, kind:'photo', title:`여행 사진 · ${date}`, date, time:'', code:'', link:'', memo:'', placeId:null, files:[] });

// P: plan(s) 결과 → { days:[{ d, places:[{ p, done }], spent, note, files }], total, base, doneCount, placeCount }
export function recordOf(s, P){
  const L = ledgerSummary(s); const done = s.tdone || {};
  const days = P.days.map(d => {
    const stops = d.full ? [d.full] : d.items; const g = L.groups.find(x => x.d === d.key); const ph = photoOf(s.vault, d.key);
    return { d, places:stops.map(p => ({ p, done:!!done[doneKey(d.key, p.id)] })), spent:g ? g.total : 0, note:(ph && ph.memo) || '', files:(ph && ph.files) || [] };
  });
  const all = days.flatMap(x => x.places);
  return { days, total:L.total, base:L.base, doneCount:all.filter(x => x.done).length, placeCount:all.length };
}

// 가족에게 보낼 글. head: '홍콩·선전 여행 · 12/6~12/10 · 가족 3명'
export function recordText(R, head){
  const lines = [`🧳 ${head}`, ''];
  R.days.forEach(x => {
    const names = x.places.map(y => y.p.name + (y.done ? ' ✓' : '')).join(', ');
    lines.push(`${x.d.i + 1}일차 ${x.d.label}${names ? ` · ${names}` : ' · 쉬어 가는 날'}${x.spent ? ` · ${money(x.spent, R.base)}` : ''}`);
    if(x.note) lines.push(`  "${x.note}"`);
  });
  lines.push('');
  if(R.total) lines.push(`쓴 돈 모두 ${money(R.total, R.base)}`);
  lines.push('트립노선으로 정리했어요');
  return lines.join('\n');
}
