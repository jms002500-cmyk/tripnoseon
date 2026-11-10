// 확인서 글을 이 폰 안에서 규칙으로 읽기 (2026-11-09, 사용자 요청: AI를 거치지 않고 로컬로)
//   PDF는 pdf.js로 글자를 꺼내고, 사진은 tesseract.js(영문 글자 인식)로 글자를 꺼낸 뒤 여기서 칸을 찾음 — 확인서는 밖으로 안 나감.
//   돌려주는 모양은 AI 답과 같음({ kind, items, unclear }) → readdoc.js readDrafts가 그대로 보관함 초안으로 바꿈. 순수 함수(테스트 대상)
//   못 찾으면 items가 빈 배열 → 화면이 AI로 읽기를 권함

// 자주 가는 공항 (한국 출발·도착 + 이 앱 지역 + 근처). 이 목록에 있는 세 글자만 공항으로 봄(다른 대문자 세 글자와 헷갈리지 않게)
export const IATA = ['ICN', 'GMP', 'PUS', 'CJU', 'TAE', 'CJJ', 'KWJ', 'MWX', 'RSU', 'USN', 'YNY', 'HKG', 'SZX', 'MFM', 'CAN', 'ZUH', 'PEK', 'PKX', 'PVG', 'SHA',
  'TPE', 'TSA', 'KHH', 'NRT', 'HND', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA', 'KOJ', 'SDJ', 'BKK', 'DMK', 'SGN', 'HAN', 'DAD', 'MNL', 'CEB', 'SIN', 'KUL', 'DPS', 'GUM', 'SPN'];
// 자주 타는 항공사 코드 (한국 출발·이 앱 지역·근처). 이 코드가 붙은 편명을 먼저 믿음
export const AIRLINES = ['KE', 'OZ', '7C', 'LJ', 'TW', 'ZE', 'BX', 'RS', 'RF', 'YP', '4V', 'HX', 'CX', 'UO', 'NX', 'MU', 'CA', 'CZ', 'ZH', 'HU', 'FM', 'MF', '3U', 'NH', 'JL', 'MM', 'GK', 'BC', 'ZG', 'BR', 'CI', 'JX', 'IT', 'VJ', 'VN', 'QH', '5J', 'PR', 'Z2', 'TG', 'FD', 'SL', 'SQ', 'TR', 'MH', 'AK', 'D7', 'OD', 'QR', 'EK', 'EY', 'TK', 'AF', 'KL', 'LH', 'BA', 'AA', 'DL', 'UA', 'AC', 'QF', 'NZ', 'GA', 'QZ'];
const MON = { JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12 };
const pad = n => String(n).padStart(2, '0');
const okDay = (y, m, d) => y >= 2000 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();   // 2/31 같은 날은 버림

// 글 속 날짜들 [{ i(위치), key:'YYYY-MM-DD' }]. 연도가 없으면 baseYear(여행 해)
export function findDates(t, baseYear){
  const out = []; const by = baseYear || new Date().getFullYear(); const add = (i, y, m, d) => { if(okDay(y, m, d)) out.push({ i, key:`${y}-${pad(m)}-${pad(d)}` }); };
  let m;
  const R1 = /(20\d{2})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/g;                                  // 2026-12-20 · 2026.12.20 · 2026년 12월 20일
  while((m = R1.exec(t))) add(m.index, +m[1], +m[2], +m[3]);
  const R2 = /\b(\d{1,2})\s?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s?(20\d{2}|\d{2})?\b/gi;   // 20DEC26 · 20 Dec 2026
  while((m = R2.exec(t))){ const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : by; add(m.index, y, MON[m[2].toUpperCase()], +m[1]); }
  const R3 = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s(\d{1,2}),?\s(20\d{2})\b/gi;          // Dec 20, 2026
  while((m = R3.exec(t))) add(m.index, +m[3], MON[m[1].toUpperCase()], +m[2]);
  const R4 = /(?<!\d[\s.년-]*)(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;                                                  // 12월 20일 (연도 없음)
  while((m = R4.exec(t))) add(m.index, by, +m[1], +m[2]);
  return out.sort((a, b) => a.i - b.i).filter((x, k, A) => !k || x.i !== A[k - 1].i);
}
// 글 속 시각들 [{ i, hm }] (24시간 HH:MM)
export function findTimes(t){
  const out = []; const R = /(?<![\d:])([01]?\d|2[0-3])\s?[:시]\s?([0-5]\d)(?![\d:])/g; let m;
  while((m = R.exec(t))) out.push({ i:m.index, hm:`${pad(+m[1])}:${m[2]}` });
  return out;
}
const pick = (t, re) => { const m = re.exec(t); return m ? m[1] : ''; };

// 확인서 글 → { kind, items, unclear }
export function parseDocText(text, o = {}){
  const t = String(text || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const U = t.toUpperCase(); const by = o.year;
  // 예약번호: 중개 사이트로 예약하면 둘(사이트 번호 + 항공사 예약번호). code = 항공사(PNR, 체크인용), code2 = 사이트 번호
  const codes = []; { const R = /(?:예약\s*번호|확인\s*번호|주문\s*번호|BOOKING\s*(?:REFERENCE|REF\.?|CODE|NO\.?|NUMBER)|RESERVATION\s*(?:CODE|NUMBER|NO\.?)|CONFIRMATION\s*(?:CODE|NUMBER|NO\.?)|ORDER\s*(?:NO\.?|NUMBER)|PNR)\s*[:：#]?\s*[^\w\n]{0,3}\s*([A-Z0-9]{5,12})\b/g; let m; while((m = R.exec(U))) if(!codes.includes(m[1]) && /\d|^[A-Z]{6}$/.test(m[1])) codes.push(m[1]); }
  const air = pick(U, /(?:항공사\s*(?:예약\s*번호|PNR)|AIRLINE\s*(?:BOOKING\s*)?(?:REFERENCE|REF\.?|PNR|CODE)|항공사\s*확인\s*번호)\s*[:：#]?\s*[^\w\n]{0,3}\s*([A-Z0-9]{5,8})\b/);
  const code = air || (codes.length > 1 ? codes.find(c => /^[A-Z0-9]{6}$/.test(c) && /[A-Z]/.test(c)) : '') || codes[0] || '';
  let code2 = codes.find(c => c !== code) || '';
  // 표 모양: '예약번호 Booking Reference'가 머리줄에 있고 값은 다음 줄 (대한항공 e-티켓). 다음 줄의 6자리(글자 섞인) 번호
  let codeT = '';
  if(!code){ const L = U.split('\n'); for(let i = 0; i < L.length - 1 && !codeT; i++){ if(/BOOKING\s*REF|예약\s*번호|PNR/.test(L[i])){ const c = (L[i + 1].match(/(?<![A-Z0-9])[A-Z0-9]{6}(?![A-Z0-9])/g) || []).filter(x => /[A-Z]/.test(x) && !IATA.includes(x)); if(c.length) codeT = c[c.length - 1]; } } }
  const tickets = []; { const R = /\b(\d{3})[- ]?(\d{10})\b/g; let m; while((m = R.exec(t))) { const v = `${m[1]}-${m[2]}`; if(!tickets.includes(v)) tickets.push(v); } }
  const names = []; { const R = /\b([A-Z]{2,}) ?\/ ?([A-Z]{2,}(?: [A-Z]{2,})??) ?(MR|MS|MRS|MSTR|MISS|CHD|INF)\b/g; /* 성/이름 호칭 (호칭이 있어야 사람으로 봄) */ let m; while((m = R.exec(U))) { const v = `${m[1]}/${m[2]}${m[3] ? ' ' + m[3] : ''}`; if(!names.includes(v) && !IATA.includes(m[1])) names.push(v); } }
  const amt = (() => { const m = /(?:총\s*(?:결제\s*)?(?:금액|액)|결제\s*금액|합계|TOTAL(?:\s*(?:AMOUNT|FARE|PRICE))?|GRAND\s*TOTAL|AMOUNT\s*PAID)\s*[:：]?\s*(KRW|HKD|CNY|JPY|USD|₩|HK\$|￥|¥|원)?\s*([\d,]+(?:\.\d{1,2})?)\s*(KRW|HKD|CNY|JPY|USD|원)?/i.exec(t);
    if(!m) return null; const n = +m[2].replace(/,/g, ''); if(!(n > 0)) return null;
    const c = (m[1] || m[3] || '').toUpperCase(); const cur = { '₩':'KRW', '원':'KRW', 'HK$':'HKD', '￥':'JPY', '¥':'JPY' }[c] || (/^[A-Z]{3}$/.test(c) ? c : '');
    return { amount:n, currency:cur }; })();
  const passengers = names.map((n, i) => ({ name:n, ticket:tickets[i] || '' }));
  const bag = (() => { const m = /(?:무료\s*)?(?:위탁\s*)?수하물\s*(?:BAGGAGE)?\s*[:：]?\s*(\d{1,2})\s*(PCS|PIECES?|PC|KG|K|개)(?![A-Z0-9])|BAGGAGE(?:\s*ALLOWANCE)?\s*[:：]?\s*(\d{1,2})\s*(PCS|PIECES?|PC|KG|K)(?![A-Z0-9])/i.exec(t); if(!m) return ''; const n = m[1] || m[3], u = (m[2] || m[4]).toUpperCase(); return /^K/.test(u) ? `${n}kg` : `${n}개`; })();   // 위탁 수하물 허용량
  if(!passengers.length && tickets.length) tickets.forEach(tk => passengers.push({ name:'', ticket:tk }));

  // 비행기: 편명 위치마다 그 앞뒤 구간에서 공항 두 개·날짜·시각
  const FN = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/g; const hits = []; let m;
  while((m = FN.exec(U))) if(!IATA.includes(m[1] + m[2]) && !/^\d+$/.test(m[1])) hits.push({ i:m.index, fno:`${m[1]}${String(+m[2])}`, end:FN.lastIndex });   // CX 0411 → CX411 (앞 0 빼고 같은 편끼리 맞게)
  // 알려진 항공사 코드가 붙은 편명이 있으면 그것만 (글자 인식이 한글을 'S283'처럼 읽은 가짜 편명을 빼려고)
  { const known = hits.filter(h => AIRLINES.includes(h.fno.slice(0, 2))); if(known.length) hits.splice(0, hits.length, ...known); }
  const segs = [];
  hits.forEach((h, k) => {
    // 구간: 편명이 있는 줄 처음부터 다음 편명이 있는 줄 앞까지 (표는 한 줄, 여행사 확인서는 다음 줄에 날짜·공항)
    const lineStart = i => U.lastIndexOf('\n', i) + 1;
    const from = Math.max(k ? hits[k - 1].end : 0, lineStart(h.i)), to = Math.min(U.length, hits[k + 1] ? Math.max(h.end, lineStart(hits[k + 1].i)) : U.length, h.end + 260);
    // 공항 두 곳: 편명 뒤 구간에서, 없으면 앞쪽까지(공항·시각이 편명 위에 있는 모양), 글자 인식이 붙여 읽은 것('MEZICN')도
    const apsIn = (w, loose) => { const aps = []; IATA.forEach(c => { const r = new RegExp(loose ? `(?<![A-Z])[A-Z]{0,3}${c}(?![A-Z])` : `\\b${c}\\b`, 'g'); let x; while((x = r.exec(w))) aps.push({ i:x.index, c }); }); aps.sort((a, b) => a.i - b.i); return aps.filter((a, j) => !j || a.c !== aps[j - 1].c).slice(0, 2); };
    const ok2 = A => A.length === 2 && A[0].c !== A[1].c;
    let lo = from, two = apsIn(U.slice(from, to), false);
    if(!ok2(two)){ lo = k ? hits[k - 1].end : 0; two = apsIn(U.slice(lo, to), false); }
    if(!ok2(two)) two = apsIn(U.slice(lo, to), true);
    if(!ok2(two)) return;   // 공항 두 곳이 없으면 편명이 아님
    const ds = findDates(t.slice(lo, to), by), ts = findTimes(t.slice(lo, to));
    segs.push({ fno:h.fno, from:two[0].c, to:two[1].c, date:ds.length ? ds[0].key : '', time:ts[0] ? ts[0].hm : '', time2:ts[1] ? ts[1].hm : '' });
  });
  const flights = []; segs.forEach(x => { const same = flights.find(y => y.fno === x.fno && (!y.date || !x.date || y.date === x.date)); if(same){ ['date', 'time', 'time2'].forEach(k => { if(!same[k]) same[k] = x[k]; }); } else flights.push(x); });
  if(flights.length){
    flights.sort((a, b) => (a.date || '9').localeCompare(b.date || '9') || (a.time || '').localeCompare(b.time || ''));
    return { kind:'flight', items:flights.map((f, i) => Object.assign({ title:'', date:f.date, time:f.time, time2:f.time2, fno:f.fno, from:f.from, to:f.to, code:code || codeT }, code2 ? { code2 } : {}, bag ? { bag } : {},
      i === 0 && amt ? amt : {}, { passengers:i === 0 || passengers.some(p => p.ticket) ? passengers : [] })), unclear:flights.some(f => !f.date || !f.time) ? '날짜·시각을 다 찾지 못한 편이 있어요' : '' };
  }
  // 숙소: 체크인·체크아웃 날짜
  const cin = /(?:체크인|CHECK[\s-]?IN|ARRIVAL|입실)/i.exec(t), cout = /(?:체크아웃|CHECK[\s-]?OUT|DEPARTURE|퇴실)/i.exec(t);
  if(cin && cout){
    const near = re => { const ds = findDates(t.slice(re.index, re.index + 80), by); return ds.length ? ds[0].key : ''; };
    const tn = re => { const ts = findTimes(t.slice(re.index, re.index + 80)); return ts.length ? ts[0].hm : ''; };
    const addr = pick(t, /([^\n]*[香港九龍新界深圳市区區街道路號号][^\n]{4,})/).trim().slice(0, 120);
    // 이름: 호텔·리조트 같은 말이 든 줄, 없으면 현지어 주소 바로 윗줄
    const lines = t.split('\n').map(x => x.trim()); const ai = addr ? lines.indexOf(addr) : -1;
    const title = (pick(t, /([^\n]{0,40}(?:HOTEL|호텔|INN|RESORT|리조트|HOSTEL|SUITES|APARTMENT)[^\n]{0,30})/i) || (ai > 0 ? lines[ai - 1] : '')).trim().slice(0, 60);
    return { kind:'hotel', items:[Object.assign({ title, date:near(cin), date2:near(cout), time:tn(cin), time2:tn(cout), code, addr }, code2 ? { code2 } : {}, amt || {})], unclear:'' };
  }
  // 그 밖(입장권 등): 첫 날짜·시각과 예약번호
  const ds = findDates(t, by), ts = findTimes(t);
  if(ds.length || code) return { kind:'ticket', items:[Object.assign({ title:'', date:ds.length ? ds[0].key : '', time:ts.length ? ts[0].hm : '', code, passengers }, amt || {})], unclear:'이름은 직접 적어 주세요' };
  return { kind:'etc', items:[], unclear:'' };
}
