// 시차·내 위치: 지금 한국에 있는지 여행지에 있는지(위치를 허락하면) → 보여 줄 시각을 고르고, 폰 시계가 아직 다른 나라 시간이면 알림.
// 일정 계산(다음에 할 일·늦었을 때 맞추기)은 늘 여행지 시각(today.js tripClock)이라 위치가 없어도 맞음. 여기는 '보여 주기'와 '폰 시계 확인'.
//   s.here = { where:'home'|'trip'|'other', at:확인한 때(ms) } — 이 기기에만, 좌표는 남기지 않음(나라만). 함께 짜기·백업에 안 넣음
// 순수 함수(테스트 대상). 위치 받기(geolocation)는 app.js.
import { dist } from './logic.js';

export const HOME_TZ = 'Asia/Seoul';
export const HERE_FRESH = 30 * 60000;   // 30분 지나면 다시 확인

// 그 시간대의 UTC와 차이(분). 예: 서울 540, 홍콩 480
export function tzOffset(tz, now){
  const d = now || new Date();
  try{
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:tz, year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', hourCycle:'h23' })
      .formatToParts(d).map(x => [x.type, +x.value || 0]));
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
    return Math.round((asUtc - Math.floor(d.getTime() / 60000) * 60000) / 60000);
  }catch(e){ return -d.getTimezoneOffset(); }
}

// 좌표 → 어디인지. 한국은 대략 범위, 여행지는 지역 중심에서 반경(+여유) 안
const IN_KOREA = p => p.lat >= 33 && p.lat <= 38.7 && p.lng >= 124.5 && p.lng <= 131;
export function whereOf(pt, region){
  if(!pt || !Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) return '';
  if(region && region.center && dist(region.center, pt) <= (region.radiusKm || 60) * 1.5) return 'trip';
  if(IN_KOREA(pt)) return 'home';
  return 'other';
}

// 화면용 시계. deviceOff: 폰 시계의 UTC 차이(분, -getTimezoneOffset), here: s.here
//   → { trip:{ min }, home:{ min }, diff(여행지 - 한국, 분), where, phoneOff:'home'|'trip'|'', fresh }
//   phoneOff: 지금 있는 곳과 폰 시계가 다를 때 폰이 따르는 곳 (예: 홍콩에 왔는데 폰이 아직 한국 시간이면 'home')
export function clockView(now, region, deviceOff, here){
  const d = now || new Date(); const tz = (region && region.tz) || HOME_TZ;
  const tOff = tzOffset(tz, d), hOff = tzOffset(HOME_TZ, d);
  const m = off => { const x = Math.floor((d.getTime() / 60000 + off) % 1440); return (x + 1440) % 1440; };
  const fresh = !!(here && here.at && d.getTime() - here.at < HERE_FRESH);
  const where = here && here.where || '';
  let phoneOff = '';
  if(where === 'trip' && deviceOff !== tOff) phoneOff = deviceOff === hOff ? 'home' : 'other';
  if(where === 'home' && deviceOff !== hOff) phoneOff = deviceOff === tOff ? 'trip' : 'other';
  return { trip:{ min:m(tOff) }, home:{ min:m(hOff) }, diff:tOff - hOff, where, phoneOff, fresh };
}

// '현지가 한국보다 1시간 늦어요' / '한국과 시차가 없어요'
export function diffText(diff){
  if(!diff) return '한국과 시차가 없어요';
  const h = Math.abs(diff) / 60; const t = Number.isInteger(h) ? `${h}시간` : `${Math.floor(h)}시간 ${Math.abs(diff) % 60}분`;
  return `현지가 한국보다 ${t} ${diff < 0 ? '늦어요' : '빨라요'}`;
}
