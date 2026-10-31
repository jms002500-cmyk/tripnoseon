// 비행기 시간으로 첫날·마지막 날 쓸 수 있는 시간 계산. 시각은 모두 현지 시각을 분(0~1439)으로 셈. 순수 함수(테스트 대상).
//   s.flight = { ap:'HKG', arr:'10:30'(첫날 도착), dep:'18:00'(마지막 날 출발) } — 함께 짜기로 공유. 비우면 예전처럼 첫날·마지막 날은 반나절
// 공항~시내 시간은 어림 (2026-10 기준 일반 경로: 홍콩 공항철도+갈아타기, 나리타 스카이라이너·하네다 게이큐 등)
export const DAY_START = 9 * 60 + 30;   // 보통 날 숙소에서 나서는 시각
export const AFTER_LANDING = 60;        // 내려서 입국 심사·짐 찾기
export const HOTEL_DROP = 30;           // 숙소에 짐 맡기기
export const EARLY = 150;               // 국제선 출발 2시간 30분 전 공항 도착
export const BAG_PICKUP = 30;           // 마지막 날 숙소에 들러 짐 찾기
export const AIRPORTS = {
  tokyo:[{ code:'NRT', name:'나리타 공항', min:80 }, { code:'HND', name:'하네다 공항', min:40 }],
  hksz:[{ code:'HKG', name:'홍콩 국제공항', min:{ hk:50, sz:120 } }, { code:'SZX', name:'선전 바오안 공항', min:{ hk:130, sz:50 } }]   // 다른 도시로 가면 국경 포함
};

export const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
export const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const minText = m => m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`;
// '오후 1시', '오전 9:30'
export const koTime = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : '시'}`; };

export const airportOf = (region, code) => { const l = AIRPORTS[region] || []; return l.find(a => a.code === code) || l[0] || null; };
// 공항 ↔ 그 도시 숙소 (분)
export const transferMin = (ap, city) => !ap ? 60 : typeof ap.min === 'number' ? ap.min : (ap.min[city] || Object.values(ap.min)[0]);
// 보통 하루가 끝나는 시각: 다니는 시간 + 이동·식사 여유 2시간 30분
export const dayEnd = base => DAY_START + Math.round((base + 2.5) * 60);
// from~to 사이 다닐 수 있는 시간(0.5시간 단위). 그 사이 이동·식사 여유를 보통 날과 같은 비율로 뺌
export const capBetween = (from, to, base) => Math.max(0, Math.min(base, Math.round((to - from) / 60 * base / (base + 2.5) * 2) / 2));

// 첫날: 도착 → 시내에 나서는 시각(ready)·다닐 시간. city: 첫 밤을 자는 도시('' = 도시 하나인 지역)
export function arriveInfo(f, region, city, base){
  const t = toMin(f && f.arr); if(t == null) return null;
  const ap = airportOf(region, f.ap); const tr = transferMin(ap, city); const ready = t + AFTER_LANDING + tr + HOTEL_DROP;
  return { at:t, ready, transfer:tr, ap, cap:capBetween(ready, dayEnd(base), base) };
}
// 마지막 날: 출발 → 숙소에서 나서야 하는 시각(leave)·다닐 시간 (짐 찾으러 숙소에 들르는 30분 빼고)
export function departInfo(f, region, city, base){
  const t = toMin(f && f.dep); if(t == null) return null;
  const ap = airportOf(region, f.ap); const tr = transferMin(ap, city); const leave = t - EARLY - tr;
  return { at:t, leave, transfer:tr, ap, cap:capBetween(DAY_START, leave - BAG_PICKUP, base) };
}
