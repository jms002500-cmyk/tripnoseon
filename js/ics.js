// 폰 캘린더에 넣기: 일정·비행기·보관함 예약을 .ics 파일(iCalendar)로. 알림(VALARM)은 폰 캘린더가 울려 줌 → 서버·인터넷 없이.
// 시각은 어림: 그날 나서는 시각(보통 9:30, 첫날은 비행기 도착 뒤)부터 이동 시간(transit.js 어림)과 머무는 시간을 차례로 더함.
// 순수 함수(테스트 대상). 파일 만들기·보내기는 app.js.
import { legMinutes } from './transit.js';
import { DAY_START, dayEnd, hm, toMin } from './flight.js';
import { movesOn, moveEnds, moveMin, howOf, legOf, isEmptyMove } from './moves.js';
import { PACE } from './data.js';

const TZ_OFFSET = { tokyo:9, hksz:8 };   // 현지 시각 → UTC (두 곳 다 서머타임 없음)
const HOME_TZ = 9;                       // 집 ↔ 공항은 한국 시각

// 그날 장소마다 어림 시각 [{ p, start, end }] (분). 하루 종일 곳은 나서는 시각 ~ 하루 끝
export function dayTimes(s, d){
  const base = PACE[s.pace].hours; let t = d.arrive ? d.arrive.ready : DAY_START;
  if(d.full) return [{ p:d.full, start:t, end:Math.max(t + 60, dayEnd(base)) }];
  let prev = d.from; const out = [];
  (d.items || []).forEach(p => {
    t += prev ? legMinutes(prev, p) : 0; const end = t + Math.round(p.hours * 60);
    out.push({ p, start:t, end }); t = end; prev = p;
  });
  return out;
}

const esc = x => String(x || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// 'YYYY-MM-DD' + 현지 분 → UTC '20261206T034500Z'
function utc(key, min, tz){
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, min) - tz * 3600000);
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
// 한 줄 75바이트 넘으면 접기 (iCalendar 규칙, 한글은 3바이트)
function fold(line){
  const enc = new TextEncoder(); if(enc.encode(line).length <= 75) return line;
  const out = []; let cur = '', n = 0;
  for(const ch of line){ const b = enc.encode(ch).length; if(n + b > (out.length ? 74 : 75)){ out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
  out.push(cur); return out.join('\r\n ');
}
const alarm = (min, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(text)}`, `TRIGGER:-PT${min}M`, 'END:VALARM'];

// P: plan(s) 결과, vault: 보관함 예약(영수증 빼고). now: 만든 시각(Date). ctx: 오가는 길 기본 이름(views.js moveCtx)
export function buildIcs(s, P, vault, now, ctx){
  const tz = TZ_OFFSET[s.city] != null ? TZ_OFFSET[s.city] : 9; const stamp = utc(new Date(now).toISOString().slice(0, 10), 0, 0);
  const ev = []; let seq = 0;
  const add = (key, start, end, title, o = {}) => {
    ev.push(['BEGIN:VEVENT', `UID:${key}-${++seq}-${o.id || 'x'}@tripnoseon`, `DTSTAMP:${stamp}`,
      ...(start == null ? [`DTSTART;VALUE=DATE:${key.replace(/-/g, '')}`] : [`DTSTART:${utc(key, start, o.tz || tz)}`, `DTEND:${utc(key, Math.max(end, start + 15), o.tz || tz)}`]),
      `SUMMARY:${esc(title)}`, ...(o.loc ? [`LOCATION:${esc(o.loc)}`] : []), ...(o.desc ? [`DESCRIPTION:${esc(o.desc)}`] : []),
      ...(o.alarms || []).flatMap(([m, t]) => alarm(m, t)), 'END:VEVENT']);
  };
  P.days.forEach(d => {
    const tag = `${d.i + 1}일차`; const mv = movesOn(s, d.key).filter(m => !isEmptyMove(m)); const out = mv.find(m => m.k === 'out');
    // 오가는 길: 시각을 넣은 것만 (숙소 → 공항은 아래 '공항으로 출발'에 합침). 여행 중 이동은 시각이 없으면 그날 하루 일정으로
    mv.filter(m => m.k !== 'out' && (toMin(m.time) != null || m.k === 'etc')).forEach(m => {
      const st = toMin(m.time); const e = moveEnds(m, ctx); const h = howOf(m.how); const L = legOf(m.k);
      const title = `${h ? h.icon : L.icon} ${h ? h.label : L.label} · ${e.from} → ${e.to}${m.booked ? ' (예약)' : ''}`;
      add(d.key, st, st == null ? null : st + (moveMin(m) || 30), title, { id:'mv' + m.id, tz:L.home ? HOME_TZ : 0,
        alarms:st == null ? [] : m.k === 'go' ? [[60, `1시간 뒤 ${e.to}(으)로 출발해요.`], [15, `15분 뒤 ${e.to}(으)로 출발해요.`]] : [[30, `30분 뒤 ${h ? h.label : '이동'} 출발 · ${e.from} → ${e.to}`]],
        desc:[moveMin(m) ? `약 ${moveMin(m)}분` : '', m.note || '', L.home ? '한국 시각' : '', m.booked ? '예약번호·바우처는 트립노선 보관함에서 보세요.' : ''].filter(Boolean).join('\n') });
    });
    if(d.arrive) add(d.key, d.arrive.at, d.arrive.at + 30, `✈️ ${tag} 도착 · ${d.arrive.ap.name}`, { id:'arr', desc:`입국·짐 찾기 뒤 숙소로. ${hm(d.arrive.ready)}쯤부터 다니는 걸로 짰어요.` });
    dayTimes(s, d).forEach(({ p, start, end }, j) => {
      const al = [];
      if(j === 0) al.push([30, `${tag} 첫 장소 ${p.name}: 30분 뒤 출발`]);
      else if(p.book || s.must[p.id]) al.push([30, `${p.name}: 30분 뒤`]);
      add(d.key, start, end, `${tag} · ${p.name}`, { id:p.id, loc:[p.name, p.ja].filter(Boolean).join(' '), alarms:al,
        desc:[p.full ? '하루 종일' : `약 ${p.hours}시간`, p.book ? '예약 필요' : '', p.note || '', '시각은 트립노선 어림이에요. 실제와 다를 수 있어요.'].filter(Boolean).join('\n') });
    });
    if(d.depart && d.depart.leave >= 0){
      const h = out && howOf(out.how);
      add(d.key, d.depart.leave, d.depart.leave + d.depart.transfer, `🧳 숙소에서 공항으로 출발${h ? ` · ${h.label}${out.booked ? '(예약)' : ''}` : ''} · ${d.depart.ap.name}`, { id:'leave',
        alarms:[[60, '1시간 뒤 공항으로 출발해요. 짐을 챙기세요.'], [15, '15분 뒤 공항으로 출발해요.']], desc:[`비행기 ${hm(d.depart.at)} 출발 · ${d.depart.set ? '오가는 길에 넣은 시각' : '2시간 30분 전 공항 도착 기준'}`, out && out.note || ''].filter(Boolean).join('\n') });
      add(d.key, d.depart.at, d.depart.at + 30, `✈️ ${tag} 출발 비행기`, { id:'dep' });
    }
  });
  (vault || []).filter(it => /^\d{4}-\d{2}-\d{2}$/.test(it.date || '')).forEach(it => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(it.time || ''); const st = m ? +m[1] * 60 + +m[2] : null;
    add(it.date, st, st == null ? null : st + 60, `🎟️ ${it.title || '예약'}`, { id:it.id, alarms:st == null ? [] : [[60, `${it.title || '예약'}: 1시간 뒤`]],
      desc:'보관함에 넣은 예약이에요. 예약번호·QR은 트립노선 보관함에서 보세요.' });
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tripnoseon//ko', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:트립노선 여행',
    ...ev.flat(), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
