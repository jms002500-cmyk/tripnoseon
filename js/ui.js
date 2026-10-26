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
