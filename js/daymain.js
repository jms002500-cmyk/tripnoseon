// 이날의 메인 (v0.91.0, 2026-11-16 사용자 요청: "메인이 되는 위치를 선택하면 그 근처에 있는 것들을 추천해서 동선을 짜주는 것")
//   일정 단계 날짜 카드의 '🎯 이날의 메인'. 순수 함수(테스트 대상) — 일정 계산은 logic.js plan(메인 날로 근처 곳을 모음),
//   화면은 views.js mainRow·mainNear, 누르기는 app.js
import { NEAR_MAIN_KM, isFood, buildDays, allPlaces, dist, plan, pinPlan } from './logic.js';
import { latLngOf } from './gplace.js';

// 이날의 메인 정하기 (key: 날짜, id: 장소 id, ''면 메인 풀기) → s를 고침
//   · 다른 날의 메인이던 곳이면 그날 것은 풀고, 메인은 담은 곳으로
//   · 하루 종일 곳이면 그날을 그 곳으로(fullDay), 그날로 정해 둔 다른 하루 종일 곳은 풀어 자리를 비움
//   · 다른 장소는 지금 날짜에 고정(pinPlan)하되, 메인 2.5km 안에서 자동으로 놓였던 곳(손으로 옮긴 적 없는 곳)은 풀어 메인 날로 모이게
export function setMain(s, key, id){
  const days = buildDays(s); const d = days.find(x => x.key === key); if(!d) return false;
  const dm = Object.assign({}, s.dmain || {});
  if(!id){ delete dm[key]; s.dmain = dm; return true; }
  const p = allPlaces(s).find(x => x.id === id); if(!p) return false;
  const before = Object.assign({}, s.assign || {}); const P0 = plan(s);
  Object.keys(dm).forEach(k => { if(dm[k] === id) delete dm[k]; });
  dm[key] = id; s.dmain = dm;
  s.picked = Object.assign({}, s.picked, { [id]:true });
  if(p.full){
    const fd = Object.assign({}, s.fullDay || {});
    Object.keys(fd).forEach(k => { if(k !== id && fd[k] === d.i) delete fd[k]; });
    fd[id] = d.i; s.fullDay = fd;
  }
  const a = pinPlan(s, P0); delete a[id];
  const near = q => latLngOf(q) && dist(p, q) <= NEAR_MAIN_KM;
  // 근처인데 자동으로 놓였던 곳 → 풀어서 메인 날로 모이게
  allPlaces(s).forEach(q => { if(q.id !== id && s.picked[q.id] && before[q.id] == null && near(q)) delete a[q.id]; });
  // 메인 날에 자동으로 놓여 있던 먼 곳 → 풀어서 다른 날로 (그대로 두면 메인 근처 곳이 들어갈 자리가 없음)
  const d0 = P0.days.find(x => x.key === key);
  if(d0) d0.items.forEach(q => { if(q.id !== id && before[q.id] == null && !near(q)) delete a[q.id]; });
  s.assign = a;
  return true;
}

// 메인 근처 (일정 plan 결과 P의 그날 d): 다른 날·못 넣은 곳에 있는 담은 곳(이날로 옮길 후보)과 안 담은 추천(가까운 순 6곳)
//   하루 종일 메인 날이면 먹을 곳만(그날은 다른 장소를 넣을 시간이 없어서)
//   → { other:[{ p, km, day(지금 날 i | null) }], recs:[{ p, km }] } | null(메인 없음)
export function nearMain(s, P, d, km = NEAR_MAIN_KM){
  const m = d && d.main; if(!m || !latLngOf(m)) return null;
  const at = {};
  P.days.forEach(x => { if(x.full) at[x.full.id] = x.i; x.items.forEach(p => { at[p.id] = x.i; }); (x.meals || []).forEach(p => { at[p.id] = x.i; }); });
  const ok = p => !p.full && (!d.full || isFood(p));
  const near = allPlaces(s).filter(p => p.id !== m.id && latLngOf(p) && ok(p)).map(p => ({ p, km:dist(m, p) })).filter(o => o.km <= km).sort((a, b) => a.km - b.km);
  return {
    other:near.filter(o => s.picked[o.p.id] && at[o.p.id] !== d.i).map(o => Object.assign(o, { day:at[o.p.id] != null ? at[o.p.id] : null })),
    recs:near.filter(o => !s.picked[o.p.id]).slice(0, 6)
  };
}

// 메인 고르기 목록: 담은 곳 — 꼭 갈 곳 먼저, 그다음 지금 그날에 있는 곳, 나머지는 이름순
export function mainChoices(s, d){
  const here = new Set([...(d.full ? [d.full.id] : []), ...d.items.map(p => p.id)]);
  const rank = p => (s.must && s.must[p.id] ? 0 : here.has(p.id) ? 1 : 2);
  return allPlaces(s).filter(p => s.picked && s.picked[p.id]).sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name), 'ko'));
}

// 이날 근처로 옮기기·담기 (하루 종일 메인 날이면 날짜를 풀어 '먹을 곳'으로 붙게, 아니면 다른 곳은 그대로 두고 그날로)
export function pullToDay(s, id, di, full){
  const a = full ? Object.assign({}, s.assign) : pinPlan(s);   // 담기 전 일정 기준으로 다른 곳을 고정 (담은 뒤에 재면 다른 곳이 한 번 섞임)
  s.picked = Object.assign({}, s.picked, { [id]:true });
  if(full) delete a[id]; else a[id] = di;
  s.assign = a;
}
