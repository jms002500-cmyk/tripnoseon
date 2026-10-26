// 도쿄 약도(SVG). 실제 지도 타일 없이 위경도를 단순 투영해서 위치 관계만 보여줌.
// 구글 지도 JS API를 붙이면 이 파일을 교체하면 됨.
import { AREAS, YAMANOTE, KEIYO, DAY_COLORS } from './data.js';
import { allPlaces, pickedPlaces, rankAreas } from './logic.js';
import { esc } from './ui.js';

const B = { minLng:139.555, maxLng:139.915, minLat:35.600, maxLat:35.748 };
const KX = Math.cos(35.67 * Math.PI / 180);
export const MW = 1000;
export const MH = Math.round(MW * (B.maxLat - B.minLat) / ((B.maxLng - B.minLng) * KX));

export function px(o){
  return [ +((o.lng - B.minLng) / (B.maxLng - B.minLng) * MW).toFixed(1), +((B.maxLat - o.lat) / (B.maxLat - B.minLat) * MH).toFixed(1) ];
}
function pathOf(pts, close){
  return pts.map((p, i) => { const [x, y] = px({ lat:p[0], lng:p[1] }); return (i ? 'L' : 'M') + x + ' ' + y; }).join(' ') + (close ? ' Z' : '');
}

// mode: 'pick'(장소 담기) | 'stay'(숙소 동네) | 'plan'(일정, P = plan() 결과)
export function mapSVG(mode, s, P){
  let g = ''; let legend = '';
  g += `<path d="${pathOf(YAMANOTE, true)}" class="m-loop"/>`;
  g += `<path d="${pathOf(KEIYO, false)}" class="m-keiyo"/>`;
  { const [x, y] = px({ lat:35.7395, lng:139.7290 }); g += `<text x="${x}" y="${y-14}" text-anchor="middle" class="m-cap">야마노테선</text>`; }
  { const [x, y] = px({ lat:35.6560, lng:139.8330 }); g += `<text x="${x}" y="${y-14}" text-anchor="middle" class="m-cap">게이요선 → 디즈니</text>`; }
  Object.values(AREAS).forEach(a => { const [x, y] = px(a); g += `<text x="${x + a.lx}" y="${y + a.ly}" text-anchor="${a.anchor}" class="m-area">${esc(a.name)}</text>`; });

  if(mode === 'pick'){
    allPlaces(s).forEach(p => {
      const [x, y] = px(p); const on = !!s.picked[p.id]; const must = !!s.must[p.id];
      g += `<circle cx="${x}" cy="${y}" r="${on ? (must ? 16 : 12) : 8}" class="${on ? (must ? 'm-must' : 'm-on') : 'm-off'}"/>`;
    });
    legend = `<span class="lg"><i style="background:var(--accent)"></i>담은 곳</span><span class="lg"><i style="background:var(--surface);border:2px solid var(--muted)"></i>아직 안 담은 곳</span>`;
  }

  if(mode === 'stay'){
    const ranked = rankAreas(s); const chosen = s.hotelArea;
    pickedPlaces(s).forEach(p => { const [x, y] = px(p); g += `<circle cx="${x}" cy="${y}" r="11" class="m-on"/>`; });
    ranked.forEach((r, i) => {
      const [x, y] = px(r.a); const hi = chosen ? r.key === chosen : i === 0;
      g += `<rect x="${x-19}" y="${y-19}" width="38" height="38" rx="8" class="m-hotel${hi ? ' best' : ''}"/><text x="${x}" y="${y+8}" text-anchor="middle" class="m-htext${hi ? ' best' : ''}">${i+1}</text>`;
    });
    // 숙소 후보: 마름모. 정한 숙소는 채워서 크게
    const cands = (s.hotels || []).filter(h => h.lat != null);
    cands.forEach(h => {
      const [x, y] = px(h); const on = s.hotelPick === h.id; const r = on ? 15 : 11;
      g += `<path d="M${x} ${y-r} L${x+r} ${y} L${x} ${y+r} L${x-r} ${y} Z" class="m-cand${on ? ' on' : ''}"/>`;
    });
    legend = `<span class="lg"><i style="background:var(--accent)"></i>담은 곳</span><span class="lg"><i style="background:var(--ink);border-radius:3px"></i>숙소 동네 순위</span>`
      + (cands.length ? `<span class="lg"><i class="lg-cand"></i>숙소 후보</span>` : '');
  }

  if(mode === 'plan' && P){
    const [hx, hy] = px(P.hotel);
    P.days.forEach(d => {
      const col = DAY_COLORS[d.i % DAY_COLORS.length];
      if(d.full){
        const [x, y] = px(d.full);
        g += `<path d="M${hx} ${hy} L${x} ${y}" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="4 10" stroke-linecap="round"/>`;
        g += `<circle cx="${x}" cy="${y}" r="15" fill="${col}" stroke="#FFFFFF" stroke-width="3"/>`;
        return;
      }
      if(!d.items.length) return;
      const pts = [[hx, hy]].concat(d.items.map(p => px(p)));
      g += `<path d="${pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ')}" fill="none" stroke="${col}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;
    });
    P.days.forEach(d => {
      const col = DAY_COLORS[d.i % DAY_COLORS.length];
      d.items.forEach((p, j) => {
        const [x, y] = px(p);
        g += `<circle cx="${x}" cy="${y}" r="15" fill="${col}" stroke="#FFFFFF" stroke-width="3"/><text x="${x}" y="${y+6}" text-anchor="middle" class="m-num">${j+1}</text>`;
      });
    });
    g += `<rect x="${hx-20}" y="${hy-20}" width="40" height="40" rx="8" class="m-hotel best"/><text x="${hx}" y="${hy+8}" text-anchor="middle" class="m-htext best">숙</text>`;   // 숙소 후보를 정했으면 그 호텔 위치
    legend = P.days.map(d => `<span class="lg"><i style="background:${DAY_COLORS[d.i % DAY_COLORS.length]}"></i>${d.i+1}일차</span>`).join('')
      + `<span class="lg"><i style="background:var(--ink);border-radius:3px"></i>숙소</span>`;
  }

  return `<figure class="map"><svg viewBox="0 0 ${MW} ${MH}" role="img" aria-label="도쿄 약도">${g}</svg><figcaption>${legend}<span class="lg">위치 관계만 보여주는 약도예요</span></figcaption></figure>`;
}
