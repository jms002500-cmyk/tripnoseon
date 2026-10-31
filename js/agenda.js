// 하루의 '시간 정해진 일'(오가는 길·비행기·숙소 체크인/체크아웃·입장권·시내 체크인)을 시각순으로 모으고,
// 오늘 화면 맨 위에 '다음에 할 일'을 고름. 가족 단톡에 보낼 일정표 글도 여기서. 순수 함수(테스트 대상).
//   시각은 현지 분(0~1439). 집 ↔ 공항은 한국 시각이라 현지로 바꿔서 줄 세움(home:true, kst: 한국 시각 분)
import { movesOn, moveText, moveMin, isEmptyMove, legOf } from './moves.js';
import { bookingRows } from './bookings.js';
import { AFTER_LANDING, DAY_START, hm, toMin, minText } from './flight.js';
import { TZ_OFFSET } from './ics.js';
import { bookings } from './vault.js';

const HOME_TZ = 9;
const localOf = (s, kst) => kst == null ? null : (kst - (HOME_TZ - (TZ_OFFSET[s.city] ?? HOME_TZ)) * 60 + 1440) % 1440;

// d: plan(s).days의 하루, ctx: views.js moveCtx (공항·숙소 이름)
//   → [{ min, icon, text, sub, kind:'move'|'flight'|'book'|'itc', m?(이동), home?, kst?, guess? }] 시각순(시각 없는 건 뒤)
export function dayAgenda(s, d, ctx){
  const out = []; const c = ctx || {};
  const ms = movesOn(s, d.key).filter(m => !isEmptyMove(m)); const has = k => ms.some(m => m.k === k);
  ms.forEach(m => {
    const t = toMin(m.time); const home = !!legOf(m.k).home;
    if(m.k === 'out' && d.depart && d.depart.leave >= 0 && t == null) return;   // 시각 없는 숙소 → 공항은 아래 '공항으로 출발'로
    const guessIn = m.k === 'in' && t == null && d.arrive ? d.arrive.at + AFTER_LANDING : null;   // 시각을 안 넣은 공항 → 숙소는 입국 뒤로 줄 세움
    out.push({ min:home ? localOf(s, t) : t != null ? t : guessIn, icon:'', text:moveText(m, c, minText), sub:[m.booked ? '예약함' : '', guessIn != null ? '시각은 어림' : '', m.note || ''].filter(Boolean).join(' · '), kind:'move', m, home, kst:home ? t : null });
  });
  const a = d.arrive, z = d.depart && d.depart.leave >= 0 ? d.depart : null;
  if(a){
    out.push({ min:a.at, icon:'✈️', text:`${a.ap.name} 도착`, sub:'입국·짐 찾기 약 1시간', kind:'flight', dir:'out' });
    if(!has('in')) out.push({ min:a.at + AFTER_LANDING, icon:'🧳', text:`${a.ap.name} → ${c.inHotel || '숙소'} · 약 ${minText(a.transfer)}`, sub:'어림', kind:'move', guess:true });
  }
  if(z){
    if(!ms.some(m => m.k === 'out' && toMin(m.time) != null)) out.push({ min:z.leave, icon:'🧳', text:`숙소에서 공항으로 출발 · 약 ${minText(z.transfer)}`, sub:(ms.find(m => m.k === 'out') ? moveText(ms.find(m => m.k === 'out'), c, minText) + ' · ' : '') + '짐 챙기기', kind:'move' });
    out.push({ min:z.at, icon:'✈️', text:`${z.ap.name} 출발`, sub:'2시간 30분 전 공항 도착 기준', kind:'flight', dir:'back' });
  }
  bookingRows(bookings(s.vault), d.key).forEach(b => out.push({ min:b.time, icon:b.icon, text:b.text, sub:'예약', kind:'book' }));
  if(z && s.flight && s.flight.itc) out.push({ min:DAY_START, icon:'🧳', text:'시내 체크인 · 홍콩역·구룡역에서 짐 부치기', sub:'참여 항공사만 · 받는 시간 확인', kind:'itc' });
  const rank = x => x.min == null ? 9999 : x.min;
  return out.sort((x, y) => rank(x) - rank(y));
}

// 다음에 할 일: 지금(nowMin) 이후 첫 일과 그다음 것들. 지난 일은 past. nowMin이 null이면(오늘이 아닌 날) 모두 다음
export function nextUp(list, nowMin){
  if(nowMin == null) return { past:[], next:list[0] || null, later:list.slice(1) };
  const i = list.findIndex(x => x.min == null || x.min >= nowMin - 10);   // 10분 지난 것까지는 '지금'
  if(i < 0) return { past:list, next:null, later:[] };
  return { past:list.slice(0, i), next:list[i], later:list.slice(i + 1) };
}

// 가족 단톡용 일정표 글. P: plan(s), ctx: moveCtx, head: '홍콩·선전 여행 · 12/6~12/10 · 가족 3명'. 예약번호는 안 넣음
export function planText(s, P, ctx, head){
  const lines = [`🧳 ${head}`];
  const f = s.flight || {};
  if(f.arr || f.dep) lines.push(`✈️ ${[f.arr ? `가는 날 ${f.arr} 도착` : '', f.dep ? `오는 날 ${f.dep} 출발` : ''].filter(Boolean).join(' · ')} (현지 시각)`);
  P.days.forEach((d, i) => {
    lines.push('', `${d.i + 1}일차 ${d.label}`);
    dayAgenda(s, d, ctx).filter(x => !x.guess).forEach(x => lines.push(`  ${x.home && x.kst != null ? `${hm(x.kst)}(한국)` : x.min != null ? hm(x.min) : '     '} ${x.icon ? x.icon + ' ' : ''}${x.text}`));
    const names = d.full ? [d.full.name] : d.items.map(p => p.name);
    lines.push(names.length ? `  📍 ${names.join(' → ')}` : '  📍 쉬어 가는 날');
    if(i < P.days.length - 1 && d.to && d.to.name) lines.push(`  🏨 ${d.to.name}`);
  });
  lines.push('', '시각은 어림이에요. 트립노선으로 정리했어요');
  return lines.join('\n');
}
