// 🌙 저녁에 내일 미리 보기 (오늘 화면, 여행 중 저녁 6시 뒤). 내일 나서는 시각·첫 일·첫 장소·날씨·꺼낼 예약과
//   오늘 밤 해 둘 일(짐 싸기·온라인 체크인·짐 고르기·여권·우산). 숙소 옮기는 날·오는 날 아침이 급하지 않게.
//   순수 함수(테스트 대상). 화면은 views.js tomorrowBox
import { dayAgenda } from './agenda.js';
import { moveDay } from './bags.js';
import { airlineOf, checkinState } from './airlines.js';
import { dayWeather, dayVault } from './today.js';
import { bookings } from './vault.js';
import { DAY_START, hm } from './flight.js';

export const EVE_FROM = 18 * 60;   // 이 시각부터 오늘 화면에 내일 미리 보기

// P: plan(s), i: 오늘 날 번호, today: 현지 날짜, opt { wx: 날씨, ctx: views.js moveCtx }
//   → { d, leave(오는 날 숙소에서 나서는 시각), first(내일 첫 시간 정해진 일), place(첫 장소), start, w(날씨), tips:[{ icon, t, d, url?, day? }] } | null(내일이 없음)
export function tomorrowOf(s, P, i, today, opt = {}){
  const d = P && P.days && P.days[i + 1]; if(!d) return null;
  const tips = [];
  const ag = dayAgenda(s, d, opt.ctx || {}).filter(x => x.min != null && !x.guess && x.kind !== 'note' && x.kind !== 'arr');
  const leave = d.depart && d.depart.leave >= 0 ? d.depart.leave : null;
  const place = d.full || (d.items || [])[0] || null;
  if(leave != null){
    tips.push({ icon:'🧳', t:'오늘 밤 짐 싸 두기', d:`내일 ${hm(leave)}에 숙소에서 공항으로 나서요. 보조배터리는 부치는 짐 말고 들고 타요.` });
    Object.values(s.fsegs || {}).filter(x => x && x.dir === 'back' && x.date === d.key).forEach(x => { const st = checkinState(x, today); const a = airlineOf(x.fno);
      if(st && st.open && st.left.length) tips.push({ icon:'📲', t:`${x.fno} 온라인 체크인 · 아직 ${st.left.length}명`, d:'오늘 밤에 해 두면 내일 공항 줄이 짧고 좌석도 같이 앉게 정할 수 있어요.', url:a && a.url && a.url.checkin || '' }); });
    tips.push({ icon:'💴', t:'남은 현지 돈·교통카드 잔액', d:'공항 편의점·식당에서 써도 돼요.' });
  } else if(moveDay(d)){
    tips.push({ icon:'🧳', t:'오늘 밤 짐 싸 두기', d:`내일 ${d.from.name} → ${d.to.name}로 숙소를 옮겨요.` });
    if(!(s.bags || {})[d.key]) tips.push({ icon:'🧳', t:'짐을 어떻게 할지 정하기', d:'맡겼다 찾기·먼저 옮기기 가운데 골라 두면 내일 할 일 시각이 맞춰져요.', day:d.i });
  }
  if(d.cross) tips.push({ icon:'🛂', t:'여권 챙기기', d:'내일 국경을 넘어요. 가족 모두 여권이 있어야 해요.' });
  const w = dayWeather(opt.wx, d.key);
  if(w && w.kind === 'forecast' && w.rain >= 50) tips.push({ icon:'☔', t:'내일 비 소식', d:'우산을 챙기고, 실외 장소는 내일 화면의 \'비 오면?\'으로 바꿀 수 있어요.', day:d.i });
  const vs = dayVault(bookings(s.vault), d.key, (d.items || []).map(p => p.id).concat(d.full ? [d.full.id] : []));
  if(vs.length) tips.push({ icon:'🎫', t:`내일 꺼낼 예약 ${vs.length}건`, d:vs.slice(0, 3).map(v => v.title).filter(Boolean).join(' · ') || '보관함에 있어요' });
  return { d, leave, first:ag[0] || null, place, start:leave != null ? leave : DAY_START, w, tips };
}
