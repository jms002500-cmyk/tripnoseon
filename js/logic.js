// 계산만 하는 순수 함수 모음 (DOM을 건드리지 않음 → tests/에서 바로 테스트 가능)
import { AREAS, PLACES, PACE, WD } from './data.js';

export function clone(o){ return JSON.parse(JSON.stringify(o)); }

// 두 지점 사이 직선거리(km)
export function dist(a, b){
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*toR) * Math.cos(b.lat*toR) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function centroid(items){
  const n = items.length;
  return { lat: items.reduce((s,p)=>s+p.lat, 0)/n, lng: items.reduce((s,p)=>s+p.lng, 0)/n };
}

// 'YYYY-MM-DD'를 현지 날짜로 (UTC로 해석하면 하루 밀리는 문제를 피함)
export function parseDate(str){ const [y,m,d] = str.split('-').map(Number); return new Date(y, m-1, d); }

export function allPlaces(s){ return PLACES.concat(s.custom || []); }
export function pickedPlaces(s){ return allPlaces(s).filter(p => s.picked[p.id]); }
export function closedText(p){ return p.closed && p.closed.length ? p.closed.map(w => WD[w]).join('·') + '요일 휴무' : ''; }
export function kindLabel(k){ return { arrive:'도착하는 날', depart:'돌아오는 날', full:'온종일', single:'당일' }[k]; }

// 여행 날짜 목록. 첫날·마지막 날은 이동 때문에 쓸 수 있는 시간이 절반
export function buildDays(s){
  if(!s.start || !s.end) return [];
  let a = parseDate(s.start), b = parseDate(s.end);
  if(b < a){ const t = a; a = b; b = t; }
  const dates = [];
  for(let d = new Date(a); d <= b && dates.length < 10; d.setDate(d.getDate()+1)) dates.push(new Date(d));
  const base = PACE[s.pace].hours;
  return dates.map((d, i) => {
    const kind = dates.length === 1 ? 'single' : i === 0 ? 'arrive' : i === dates.length-1 ? 'depart' : 'full';
    const cap = (kind === 'arrive' || kind === 'depart') ? Math.max(2, Math.round(base/2)) : base;
    return { i, date:d, wd:d.getDay(), kind, cap, label:`${d.getMonth()+1}/${d.getDate()} (${WD[d.getDay()]})` };
  });
}

// 동행·취향에 맞는 정도. why는 화면에 보여줄 이유, neg는 주의 사항
export function fitScore(p, s){
  let sc = 0; const why = []; const neg = [];
  const ov = (p.tags || []).filter(t => s.styles.includes(t));
  sc += ov.length * 2; if(ov.length) why.push(ov.join('·'));
  const kids = s.who === 'family' ? s.kids : [];
  if(kids.length){
    const teen = kids.find(a => a >= 10); const young = kids.some(a => a < 7);
    if(p.kid === 'adult'){ sc -= 4; neg.push('어른 취향 골목'); }
    if(p.kid === 'teen' && teen != null){ sc += 2; why.push(`${teen}살이 좋아할 곳`); }
    if(p.kid === 'kids'){ sc += 2; why.push('아이와 가기 좋아요'); }
    if(p.kid === 'teen' && young && teen == null) sc -= 1;
  } else if(s.who === 'parents'){
    if((p.tags || []).some(t => t === '문화·역사' || t === '자연·산책')){ sc += 1.5; why.push('부모님과 천천히 둘러보기 좋아요'); }
    if(p.kid === 'teen') sc -= 1;
  } else if(s.who){
    if(p.kid === 'kids') sc -= 1;
    if(p.kid === 'adult'){ sc += 1; why.push('어른끼리 가기 좋아요'); }
  }
  if(p.book) neg.push('예약 필요');
  return { score:sc, why, neg };
}

// 하루 종일 쓰는 곳(디즈니 등)을 어느 날에 둘지. 사용자가 고른 날 우선, 없으면 평일 온종일 날
export function fullAssign(s, days){
  const res = {}; const used = new Set();
  const fulls = pickedPlaces(s).filter(p => p.full);
  const fullIdx = days.filter(d => d.kind === 'full' || d.kind === 'single').map(d => d.i);
  const pool = fullIdx.length ? fullIdx : days.map(d => d.i);
  fulls.forEach(p => { const w = s.fullDay[p.id]; if(w != null && pool.includes(w) && !used.has(w)){ res[p.id] = w; used.add(w); } });
  fulls.forEach(p => {
    if(res[p.id] != null) return;
    const free = pool.filter(i => !used.has(i)); if(!free.length){ res[p.id] = null; return; }
    const wk = free.filter(i => days[i].wd >= 1 && days[i].wd <= 5);
    const pick = (wk.length ? wk : free)[0]; res[p.id] = pick; used.add(pick);
  });
  return res;
}

// 하루 종일 쓰는 날을 뺀 나머지 날의 시간 합계 vs 담은 곳에 필요한 시간
export function capacity(s){
  const days = buildDays(s); const fa = fullAssign(s, days);
  const fullDays = new Set(Object.values(fa).filter(v => v != null));
  const total = days.filter(d => !fullDays.has(d.i)).reduce((x,d) => x + d.cap, 0);
  const used = pickedPlaces(s).filter(p => !p.full).reduce((x,p) => x + p.hours, 0);
  return { total, used };
}

// 숙소 동네 순위: 담은 곳까지 평균 직선거리 + (디즈니가 있으면) 디즈니 이동 시간 가중
export function rankAreas(s){
  const picked = pickedPlaces(s); const dayPicks = picked.filter(p => !p.full);
  const hasDisney = picked.some(p => p.full && p.area === 'maihama');
  return Object.entries(AREAS).filter(([, a]) => a.hotel).map(([key, a]) => {
    const ds = dayPicks.map(p => dist(a, p));
    const avg = ds.length ? ds.reduce((x,y) => x+y, 0)/ds.length : 0;
    const near = ds.filter(x => x <= 2.5).length;
    const score = avg + (hasDisney ? a.disneyMin/12 : 0);
    return { key, a, avg, near, score };
  }).sort((x, y) => x.score - y.score);
}

// 가장 가까운 동네
export function nearestArea(pt){
  let best = null, bd = Infinity;
  Object.entries(AREAS).forEach(([k, a]) => { const d = dist(a, pt); if(d < bd){ bd = d; best = k; } });
  return { key:best, km:bd };
}

// 일정의 출발점. 숙소 후보를 정했으면 그 호텔 위치, 아니면 정한 동네(없으면 1순위 동네) 중심
export function hotelOf(s){
  const h = (s.hotels || []).find(x => x.id === s.hotelPick && x.lat != null);
  if(h){ const k = h.area || nearestArea(h).key; return { ...AREAS[k], key:k, name:h.name, lat:h.lat, lng:h.lng, cand:true }; }
  const k = s.hotelArea || rankAreas(s)[0].key; return { key:k, ...AREAS[k] };
}

// 담은 곳(하루 종일 쓰는 곳 제외)까지 평균 직선거리. 담은 곳이 없으면 null
export function avgToPicks(s, pt){
  const ds = pickedPlaces(s).filter(p => !p.full).map(p => dist(pt, p));
  return ds.length ? ds.reduce((x,y) => x+y, 0)/ds.length : null;
}

export function nights(s){ const n = buildDays(s).length; return n > 1 ? n - 1 : 0; }
export function partySize(s){ return !s.who ? 0 : s.who === 'solo' ? 1 : s.who === 'family' ? s.adults + s.kids.length : s.adults; }

// 숙소 후보 비교. 위치 점수는 동네 순위와 같은 방식(담은 곳까지 평균 직선거리 + 디즈니 이동 시간 가중)
//   sort: 'place' 위치 점수순 | 'price' 1박 가격순 (가격 없는 곳은 뒤로)
//   위치를 아직 모르는 후보는 noLoc으로 따로 돌려줌
export function compareHotels(s, sort){
  const picked = pickedPlaces(s); const dayPicks = picked.filter(p => !p.full);
  const hasDisney = picked.some(p => p.full && p.area === 'maihama');
  const n = nights(s); const ppl = partySize(s);
  const rows = []; const noLoc = [];
  (s.hotels || []).forEach(h => {
    if(h.lat == null){ noLoc.push(h); return; }
    const area = h.area || nearestArea(h).key; const a = AREAS[area];
    const ds = dayPicks.map(p => dist(h, p));
    const avg = ds.length ? ds.reduce((x,y) => x+y, 0)/ds.length : 0;
    const near = ds.filter(x => x <= 2.5).length;
    const disneyMin = a.disneyMin != null ? a.disneyMin : 60;
    const score = avg + (hasDisney ? disneyMin/12 : 0);
    const total = h.price > 0 && n ? h.price * n : null;
    rows.push({ h, area, a, avg, near, score, total, per: total && ppl ? Math.round(total / ppl) : null });
  });
  const byPlace = (x, y) => x.score - y.score;
  rows.sort(sort === 'price' ? (x, y) => ((x.h.price > 0 ? x.h.price : Infinity) - (y.h.price > 0 ? y.h.price : Infinity)) || byPlace(x, y) : byPlace);
  return { rows, noLoc, hasDisney, nights:n, people:ppl, dayCount:dayPicks.length };
}

// 가장 가까운 곳부터 차례로 (간단한 동선 정렬)
export function orderNN(items, start){
  const left = items.slice(); const out = []; let cur = start;
  while(left.length){
    let bi = 0, bd = Infinity;
    left.forEach((p, i) => { const d = dist(cur, p); if(d < bd){ bd = d; bi = i; } });
    cur = left.splice(bi, 1)[0]; out.push(cur);
  }
  return out;
}

// 날짜별 일정 초안
//  1) 하루 종일 쓰는 곳을 먼저 배치
//  2) 사용자가 직접 옮긴 곳(s.assign) 배치 (-1은 빼두기)
//  3) 나머지는 동네끼리 묶어서, 시간·휴무일을 지키며 가까운 날에 배치
export function plan(s){
  const days = buildDays(s); const res = days.map(d => ({ ...d, full:null, items:[], used:0 }));
  const hotel = hotelOf(s); const fa = fullAssign(s, days); const unassigned = []; const auto = [];
  pickedPlaces(s).forEach(p => {
    if(p.full){
      const di = fa[p.id];
      if(di == null){ unassigned.push({ p, why:'하루를 통째로 쓸 날이 없어요' }); return; }
      res[di].full = p; res[di].used = res[di].cap; return;
    }
    const m = s.assign[p.id];
    if(m === -1){ unassigned.push({ p, why:'직접 빼둔 곳' }); return; }
    if(m != null && m >= 0 && m < res.length && !res[m].full){ res[m].items.push(p); res[m].used += p.hours; return; }
    auto.push(p);
  });
  // 동네 단위로 묶기: 큰 묶음(그리고 꼭 갈 곳이 있는 묶음)부터 배치
  const groupHours = {}, groupMust = {};
  auto.forEach(p => { groupHours[p.area] = (groupHours[p.area] || 0) + p.hours; if(s.must[p.id]) groupMust[p.area] = 1; });
  auto.sort((a, b) => (groupMust[b.area]||0) - (groupMust[a.area]||0) || groupHours[b.area] - groupHours[a.area]
    || a.area.localeCompare(b.area) || (s.must[b.id]?1:0) - (s.must[a.id]?1:0) || b.hours - a.hours);
  auto.forEach(p => {
    let best = null, bestCost = Infinity, blockedByClosed = false;
    res.forEach(d => {
      if(d.full) return;
      if(d.used + p.hours > d.cap + 0.01) return;
      if(p.closed && p.closed.includes(d.wd)){ blockedByClosed = true; return; }
      let c;
      if(d.items.some(q => q.area === p.area)) c = dist(p, centroid(d.items)) * 0.2;
      else if(d.items.length){ const k = dist(p, centroid(d.items)); c = k <= 4 ? 1 + k : 8 + k; }
      else c = 5 + dist(p, hotel) * 0.1 + (d.kind === 'full' || d.kind === 'single' ? 0 : 2);
      if(c < bestCost){ bestCost = c; best = d; }
    });
    if(best){ best.items.push(p); best.used += p.hours; }
    else unassigned.push({ p, why: blockedByClosed ? '남은 날짜가 휴무일이에요' : '시간이 모자라요' });
  });
  res.forEach(d => { d.items = orderNN(d.items, hotel); });
  return { days:res, unassigned, hotel };
}

// 추천 순서대로 남은 시간을 채울 장소 id 목록
export function autoPickIds(s){
  const cap = capacity(s); let left = cap.total - cap.used; const ids = [];
  allPlaces(s).filter(p => !s.picked[p.id] && !p.full)
    .map(p => ({ p, sc: fitScore(p, s).score })).sort((x, y) => y.sc - x.sc)
    .forEach(({ p, sc }) => { if(sc > 0 && p.hours <= left){ ids.push(p.id); left -= p.hours; } });
  return ids;
}
