// 도쿄 교통패스 계산. 날짜별 일정(숙소 → 장소들 → 숙소)의 이동을 직선거리로 어림해서
// 지하철 낱개 표(IC 카드) 값과 Tokyo Subway Ticket 24/48/72시간권을 비교함.
// 순수 함수(테스트 대상). 화면은 views.js의 vPlan(transitBox).
//
// 요금은 2026-10-29 공식 출처로 확인 (화면에도 확인 날짜를 보여 줌. 바꿀 땐 공식 출처로 다시 확인하고 CHECKED와 테스트도 고칠 것):
//   Tokyo Subway Ticket: 도쿄 메트로·도쿄도 교통국 2026-01-30 공동 발표 '기획 승차권 발매액 변경'
//     (2026-03-14부터 어른 1,000/1,500/2,000엔, 아이 500/750/1,000엔. 그 전은 800/1,200/1,500엔)
//     도쿄 메트로 전 노선 + 도에이 지하철 전 노선. 처음 탄 때부터 24/48/72시간. 외국인 여행자용(여권 필요)
//   도쿄 메트로 보통 운임(tokyometro.jp 보통권·PASMO 운임표, 2026-03-14 운임 안내): IC 1~6km 178엔, 7~11km 209엔,
//     12~19km 252엔, 20~27km 293엔, 28~40km 324엔. 아이(초등학생, 13살 미만)는 반값, IC는 1엔 미만 버림
//   도에이 지하철 보통 운임(kotsu.metro.tokyo.jp 보통 운임): IC 1~4km 178엔, 5~9km 220엔, 10~15km 272엔,
//     16~21km 325엔, 22~27km 377엔, 28km~ 430엔. 메트로보다 같거나 비싸서, 낱개 표는 더 싼 메트로 요금으로 어림함
//     (그래서 실제로는 패스가 조금 더 이득일 수 있음)
//   어린이: 6살 미만(미취학)은 어른 1명당 2명까지 무료로 봄
import { dist } from './logic.js';

export const CHECKED = '2026-10-29';

// 패스 가격 (hours 시간 = days 일 연속으로 봄)
export const PASSES = [
  { key:'24', label:'24시간권', days:1, adult:1000, child:500 },
  { key:'48', label:'48시간권', days:2, adult:1500, child:750 },
  { key:'72', label:'72시간권', days:3, adult:2000, child:1000 }
];

// 도쿄 메트로 IC 운임: 철도 거리(km) 이하면 그 값
export const METRO_IC = [[6, 178], [11, 209], [19, 252], [27, 293], [Infinity, 324]];

export const WALK_KM = 1.0;        // 직선 1km 안은 걸어서 감 (약 15분)
export const ROUTE_FACTOR = 1.3;   // 직선거리 → 철도 거리 어림

const ST = (name, lat, lng) => ({ name, lat, lng });
// 지하철(패스)로 바로 못 가는 곳. 들어가고 나올 때 hubs 중 한 역에서 다른 노선으로 갈아탄다고 봄
export const ZONES = [
  { key:'disney', line:'JR 게이요선', test:p => p.area === 'maihama' || dist(p, { lat:35.6329, lng:139.8804 }) < 2.5,
    hubs:[ST('도쿄역', 35.6790, 139.7660), ST('핫초보리', 35.6745, 139.7775), ST('신키바', 35.6458, 139.8270)] },
  { key:'odaiba', line:'유리카모메', test:p => p.lat < 35.639 && p.lat > 35.60 && p.lng > 139.76 && p.lng < 139.80,
    hubs:[ST('신바시', 35.6663, 139.7583), ST('도요스', 35.6549, 139.7963)] },
  { key:'west', line:'JR 주오선', test:p => p.area === 'west' || (p.lng < 139.62 && p.lat > 35.66 && p.lat < 35.75),
    hubs:[ST('나카노', 35.7056, 139.6657), ST('신주쿠', 35.6909, 139.7003)] },
  { key:'setagaya', line:'오다큐·게이오선', test:p => p.lng < 139.675 && p.lng > 139.60 && p.lat < 35.668 && p.lat > 35.62,
    hubs:[ST('시부야', 35.6580, 139.7016), ST('신주쿠', 35.6909, 139.7003)] }
];

export function zoneOf(p){ return p && p.lat != null ? ZONES.find(z => z.test(p)) || null : null; }

// 지하철 IC 운임 (직선 km → 철도 km로 늘려서)
export function metroFare(km){ const r = km * ROUTE_FACTOR; return METRO_IC.find(([k]) => r <= k)[1]; }
export const childFare = f => Math.floor(f / 2);

// 갈아탈 역: 전체 거리가 짧은 쪽. 지하철을 한 번 더 타야 하면 3km만큼 손해로 봄(갈아타는 수고)
function bestHub(z, inside, other){
  return z.hubs.reduce((b, h) => { const k = dist(h, other); const c = dist(inside, h) + k + (k > WALK_KM ? 3 : 0); return !b || c < b.c ? { h, c } : b; }, null).h;
}

// 한 구간(A → B)을 걷기·지하철·패스 밖으로 나눔
//   → [{ kind:'subway', km, fare } | { kind:'out', km, line, at }] (걷는 거리면 빈 배열)
export function legSegments(a, b){
  const km = dist(a, b); if(km <= WALK_KM) return [];
  const za = zoneOf(a), zb = zoneOf(b);
  if(za && za === zb) return [{ kind:'out', km, line:za.line, at:'' }];
  const segs = []; let from = a, to = b; const tail = [];
  if(za){ const h = bestHub(za, a, b); if(dist(a, h) > WALK_KM) segs.push({ kind:'out', km:dist(a, h), line:za.line, at:h.name }); from = h; }
  if(zb){ const h = bestHub(zb, b, from); if(dist(h, b) > WALK_KM) tail.push({ kind:'out', km:dist(h, b), line:zb.line, at:h.name }); to = h; }
  const sk = dist(from, to);
  if(sk > WALK_KM) segs.push({ kind:'subway', km:sk, fare:metroFare(sk) });
  return segs.concat(tail);
}

// 이동 시간 어림. 구글 길찾기 API(Routes)는 일본 대중교통 경로를 주지 않아서(2026-10 확인) 앱이 직선거리로 어림하고,
// 정확한 시간·경로는 구글 지도 길찾기 링크로 봄
export const WALK_KMH = 4.5;     // 걷기
export const RAIL_KMH = 28;      // 지하철·전철 평균 (정차 포함)
export const STATION_MIN = 10;   // 역까지 걷기·기다리기·역에서 나와 걷기
export function legMinutes(a, b, segs){
  segs = segs || legSegments(a, b);
  if(!segs.length) return Math.max(3, Math.round(dist(a, b) * ROUTE_FACTOR / WALK_KMH * 60));
  let m = STATION_MIN;
  segs.forEach((x, i) => { const rk = x.km * ROUTE_FACTOR; m += rk / RAIL_KMH * 60; if(i) m += 5; if(x.kind === 'subway' && rk > 8) m += 4; });   // 갈아타기
  return Math.max(5, Math.round(m / 5) * 5);
}
export const legMode = segs => !segs || !segs.length ? '걸어서' : segs.map(x => x.kind === 'subway' ? '지하철' : x.line).join(' → ');
export const minText = m => m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`;

// 동행 → 요금 낼 사람: 어른(13살 이상), 아이(6~12살, 초등학생), 무료(6살 미만, 어른 1명당 2명까지)
export function riders(s){
  const adultsBase = !s.who ? 1 : s.who === 'solo' ? 1 : Math.max(1, s.adults || 1);
  const ages = s.who === 'family' ? (s.kids || []) : [];
  const teen = ages.filter(a => a >= 13).length; const child = ages.filter(a => a >= 6 && a <= 12).length;
  const small = ages.filter(a => a < 6).length; const adults = adultsBase + teen;
  const freeMax = adults * 2; const free = Math.min(small, freeMax);
  return { adults, children:child + (small - free), free, guess:!s.who };
}

// 하루의 이동: 숙소 → 장소들(또는 하루 종일 장소) → 숙소
export function dayTrips(d, hotel){
  const stops = d.full ? [d.full] : (d.items || []);
  if(!stops.length) return { legs:[], rides:0, fareA:0, fareC:0, outs:[], travelMin:0 };
  const pts = [d.from || hotel].concat(stops, [d.to || hotel]);   // 나눠 자는 날은 출발·돌아갈 숙소가 다름
  const legs = []; for(let i = 1; i < pts.length; i++){ const segs = legSegments(pts[i-1], pts[i]);
    legs.push({ from:pts[i-1], to:pts[i], km:dist(pts[i-1], pts[i]), segs, min:legMinutes(pts[i-1], pts[i], segs), mode:legMode(segs) }); }
  const subs = legs.flatMap(l => l.segs.filter(x => x.kind === 'subway'));
  const outs = legs.flatMap(l => l.segs.filter(x => x.kind === 'out'));
  return { legs, rides:subs.length, fareA:subs.reduce((t, x) => t + x.fare, 0), fareC:subs.reduce((t, x) => t + childFare(x.fare), 0), outs,
    travelMin:Math.round(legs.reduce((t, l) => t + l.min, 0) / 5) * 5 };   // 하루 합계는 5분 단위
}

// 일정 P(logic.plan) 전체 계산. 가장 싼 조합을 날짜 순서대로 찾음(패스는 연속한 날에만)
//   → { people, days:[{ i, label, ...dayTrips, single }], blocks:[{ from, to, pass|null, cost, single }], single, best, saving }
export function transitPlan(s, P){
  const ppl = riders(s);
  const days = P.days.map(d => { const t = dayTrips(d, P.hotel); return { i:d.i, label:d.label, ...t, single:t.fareA * ppl.adults + t.fareC * ppl.children }; });
  const n = days.length; const cost = [0]; const pick = [null];
  const passCost = p => p.adult * ppl.adults + p.child * ppl.children;
  for(let i = 1; i <= n; i++){
    cost[i] = cost[i-1] + days[i-1].single; pick[i] = { len:1, pass:null };
    PASSES.forEach(p => { if(p.days <= i){ const c = cost[i - p.days] + passCost(p); if(c < cost[i]){ cost[i] = c; pick[i] = { len:p.days, pass:p }; } } });
  }
  const blocks = []; for(let i = n; i > 0; i -= pick[i].len){
    const k = pick[i]; const ds = days.slice(i - k.len, i); const single = ds.reduce((t, d) => t + d.single, 0);
    blocks.unshift({ from:i - k.len, to:i - 1, pass:k.pass, cost:k.pass ? passCost(k.pass) : single, single });
  }
  const single = days.reduce((t, d) => t + d.single, 0);
  return { people:ppl, days, blocks, single, best:cost[n], saving:single - cost[n] };
}

// 24시간권이 이득이 되는 하루 탑승 횟수 (어른 기준, 이 일정의 평균 운임으로)
export function breakEven(t){
  const subs = t.days.flatMap(d => d.legs.flatMap(l => l.segs.filter(x => x.kind === 'subway')));
  const avg = subs.length ? subs.reduce((a, x) => a + x.fare, 0) / subs.length : METRO_IC[1][1];
  return Math.floor(PASSES[0].adult / avg) + 1;
}

const yen = n => `${Math.round(n).toLocaleString('en-US')}엔`;
const range = b => b.from === b.to ? `${b.from + 1}일차` : `${b.from + 1}~${b.to + 1}일차`;

// 한 줄 추천: '1~2일차는 48시간권이 1,240엔 이득이에요. 나머지 날은 IC 카드로 타세요.'
export function transitTip(t){
  if(!t.days.some(d => d.rides)) return '일정이 가까운 곳끼리라 지하철 탈 일이 거의 없어요. 패스는 필요 없어요.';
  const ps = t.blocks.filter(b => b.pass);
  if(!ps.length) return `하루에 타는 횟수가 적어서 패스보다 IC 카드(스이카 등)로 그때그때 내는 게 더 싸요. 24시간권은 하루 ${breakEven(t)}번 이상 타야 이득이에요.`;
  const rest = t.blocks.some(b => !b.pass && t.days.slice(b.from, b.to + 1).some(d => d.rides));
  return ps.map(b => `${range(b)}는 ${b.pass.label}이 ${yen(b.single - b.cost)}`).join(', ') + ' 이득이에요.'
    + (rest ? ' 나머지 날은 IC 카드로 타세요.' : '');
}

export { yen as transitYen, range as transitRange };
