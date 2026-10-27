// 화면 조각을 만드는 작은 도우미들
import { DAY_COLORS } from './data.js';

export function esc(t){
  return String(t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
export function chip(act, v, label, on, dis){
  return `<button type="button" class="chip" data-act="${act}" data-v="${esc(v)}" aria-pressed="${!!on}"${dis ? ' disabled' : ''}>${label}</button>`;
}
// 도쿄 메트로 역 번호판처럼 생긴 날짜 배지 (D1, D2 …)
export function badge(i){ return `<span class="badge" style="--day:${DAY_COLORS[i % DAY_COLORS.length]}">D${i+1}</span>`; }
export function gmap(q){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; }

// 구글 지도 길찾기(대중교통). 폰에서는 구글 지도 앱이 열림. 길찾기는 직접 만들지 않고 연결만 함
//   이름이 확실한 기본 장소는 일본어 이름으로, 나머지(직접 담은 곳·숙소)는 좌표로
export function gdirPoint(p){ return p.ja && !p.custom ? p.ja : `${(+p.lat).toFixed(6)},${(+p.lng).toFixed(6)}`; }
//   구글 지도에서 고른 곳(gid 있음)은 이름 + 장소 ID로 보내 정확히 그 장소가 열리게
export function gdir(from, to){
  const pt = p => p.gid ? p.name : gdirPoint(p);
  const q = new URLSearchParams({ api:'1', origin:pt(from), destination:pt(to), travelmode:'transit' });
  if(from.gid) q.set('origin_place_id', from.gid);
  if(to.gid) q.set('destination_place_id', to.gid);
  return `https://www.google.com/maps/dir/?${q}`;
}
