// 다른 앱 가계부 가져오기. 지금은 트리플 '가계부 내보내기(CSV)'.
// 트리플은 2026-11-03에 끝나고 가계부는 CSV로만 남음(앱 공지). 형식은 2026-10-27 실제로 내보낸 파일로 확인:
//   UTF-8(BOM), 값마다 큰따옴표, 금액에 천 단위 쉼표("1,200")
//   머리줄: 일차,항목명,카테고리,금액,통화,통화 당 원화,원화 환산,장소,나만보기 비용,결제한 사람,결제한 사람 수,나눠 낼 사람,나눠 낼 사람 수
//   일차는 "1 일차"처럼 날짜 없이 적힘 → 트립노선 여행 날짜에 맞춰 넣음
//   지출 줄 뒤에 빈 줄과 '▼ 통화별 금액', '▼ 총금액' 요약이 붙음 → 빈 줄에서 멈춤
// 순수 함수(테스트 대상). 파일 읽기와 상태 저장은 app.js.
import { partyOf, tripDates } from './ledger.js';

const TRIPLE_HEAD = ['일차', '항목명', '카테고리', '금액', '통화'];
const TRIPLE_CAT = { 숙소:'stay', 항공:'flight', 교통:'move', 식비:'food', 쇼핑:'shop', 관광:'ticket', 기타:'etc' };
const MAX_PEOPLE = 12;

// CSV 한 덩어리 → 줄마다 칸 배열 (큰따옴표 안의 쉼표·줄바꿈, "" 이스케이프, BOM, CRLF)
export function parseCsv(text){
  const t = String(text || '').replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for(let i = 0; i < t.length; i++){
    const ch = t[i];
    if(q){
      if(ch === '"'){ if(t[i+1] === '"'){ cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if(ch === '"') q = true;
    else if(ch === ',') { row.push(cell); cell = ''; }
    else if(ch === '\n' || ch === '\r'){
      if(ch === '\r' && t[i+1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if(cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

const num = v => { const n = parseFloat(String(v || '').replace(/[,\s원¥₩]/g, '')); return isFinite(n) ? n : 0; };
const names = v => String(v || '').split(',').map(x => x.trim().slice(0, 12)).filter(Boolean);
const hash = str => { let h = 5381; for(let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// "1 일차" → 1, "여행준비" → 'before', "여행 후·정리" → 'after'
function dayOf(v){
  const s = String(v || '').trim();
  const m = s.match(/(\d+)\s*일\s*차/);
  if(m) return +m[1];
  if(/준비|전/.test(s)) return 'before';
  if(/후|정리|다녀/.test(s)) return 'after';
  return null;
}

// 트리플 CSV → { ok, rows } | { ok:false, error }
export function readTripleCsv(text){
  const all = parseCsv(text);
  const head = (all[0] || []).map(x => x.trim());
  if(!TRIPLE_HEAD.every((h, i) => head[i] === h)) return { ok:false, error:'트리플 가계부 파일이 아니에요. 트리플 가계부 화면 오른쪽 위 ··· → \'가계부 내보내기(CSV)\'로 만든 파일을 골라 주세요.' };
  const col = k => head.indexOf(k);
  const rows = [];
  for(const r of all.slice(1)){
    if(!r.some(c => c.trim())) break;                    // 빈 줄 = 지출 끝, 아래는 요약
    if(/^▼/.test((r[0] || '').trim())) break;
    const g = k => (col(k) >= 0 ? (r[col(k)] || '') : '').trim();
    rows.push({ raw:r.join('\u0001'), day:dayOf(g('일차')), dayText:g('일차'), what:g('항목명').slice(0, 40), cat:TRIPLE_CAT[g('카테고리')] || 'etc',
      amt:num(g('금액')), cur:g('통화').toUpperCase(), krw:num(g('원화 환산')), place:g('장소').slice(0, 40),
      private:/^(o|y|예|true)$/i.test(g('나만보기 비용')), payers:names(g('결제한 사람')), sharers:names(g('나눠 낼 사람')) });
  }
  if(!rows.length) return { ok:false, error:'이 파일에 적힌 지출이 없어요.' };
  return { ok:true, rows };
}

// 가져오기 계획(미리보기): 날짜·사람·건수·합계·경고. 상태는 바꾸지 않음
export function planTripleImport(text, s){
  const r = readTripleCsv(text); if(!r.ok) return r;
  const ds = tripDates(s);
  if(!ds.length) return { ok:false, error:'여행지 단계에서 여행 날짜를 먼저 정해 주세요. 트리플 가계부는 \'1 일차\'처럼 일차로만 적혀 있어서, 날짜가 있어야 맞춰 넣을 수 있어요.' };
  const have = new Set(Object.values(s.spend || {}).map(e => e && e.ik).filter(Boolean));
  const people = []; const add = n => { if(n && !people.includes(n)) people.push(n); };
  const items = []; let dup = 0, late = 0, other = 0;
  r.rows.forEach(x => {
    const ik = 't' + hash(x.raw);
    if(have.has(ik) || have.has(ik + '-0')){ dup++; return; }   // 같은 파일을 두 번 가져와도 겹치지 않게
    let d = x.day === 'before' || x.day === 'after' ? x.day : typeof x.day === 'number' ? ds[x.day - 1] : '';
    if(typeof x.day === 'number' && x.day > ds.length){ d = 'after'; late++; }
    if(typeof x.day === 'number' && x.day < 1) d = 'before';
    let amt = Math.round(x.amt), cur = x.cur, what = x.what || '';
    if(cur !== 'JPY' && cur !== 'KRW'){ other++; what = `${what} (${cur} ${x.amt.toLocaleString('ko-KR')})`.trim(); amt = Math.round(x.krw); cur = 'KRW'; }
    if(!(amt > 0)) return;
    x.payers.forEach(add); x.sharers.forEach(add);
    items.push({ ik, d, amt, cur, what:what.slice(0, 40), cat:x.cat, payers:x.payers, sharers:x.sharers, private:x.private, dayText:x.dayText });
  });
  const sum = { JPY:0, KRW:0 }; items.forEach(e => { sum[e.cur] += e.amt; });
  return { ok:true, items, people, dup, late, other, sum, firstDay:ds[0] };
}

// 계획을 상태에 넣을 모양으로: 새 사람은 나누는 사람에 더하고, 지출은 { id: 지출 }
//   newId: 번호 만드는 함수(테스트에서 고정값), now: 적은 때(ms) 시작값
//   결제한 사람이 여럿이면 금액을 똑같이 나눠 한 사람씩 따로 적음(트립노선 지출은 낸 사람이 한 명)
export function applyTripleImport(s, plan, newId, now){
  // 기본 '나'만 있고 아직 아무 데도 안 쓰였으면 '나' 대신 가져온 이름들로
  const used = Object.values(s.spend || {}).some(e => e && e.by === 'me');
  const party = (s.party && s.party.length) || used ? partyOf(s).map(p => Object.assign({}, p)) : [];
  const idOf = n => { let p = party.find(x => x.name === n); if(!p && party.length < MAX_PEOPLE){ p = { id:newId('p'), name:n }; party.push(p); } return p ? p.id : null; };
  plan.people.forEach(idOf);
  if(!party.length) party.push({ id:'me', name:'나' });
  const all = party.map(p => p.id);
  const spend = {}; let t = now || Date.now();
  plan.items.forEach(e => {
    const payers = e.payers.map(idOf).filter(Boolean);
    const by = payers.length ? payers : [idOf(e.sharers[0]) || all[0]];
    const sharers = e.sharers.map(idOf).filter(Boolean);
    by.forEach((pid, i) => {
      const part = i === by.length - 1 ? e.amt - Math.floor(e.amt / by.length) * (by.length - 1) : Math.floor(e.amt / by.length);
      const split = e.private ? [pid] : sharers.length && sharers.length < all.length ? sharers : null;
      spend[newId('x')] = { d:e.d, amt:part, cur:e.cur, what:e.what || '', cat:e.cat, pay:'', by:pid, split, at:t++, ik:by.length > 1 ? `${e.ik}-${i}` : e.ik, src:'triple' };
    });
  });
  return { party, spend };
}
