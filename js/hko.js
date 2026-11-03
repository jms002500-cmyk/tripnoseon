// 홍콩 천문대(Hong Kong Observatory, HKO) 공개 자료. 키 없음·무료, 아무 개인 정보도 보내지 않음(주소에 자료 종류·언어만).
//   9일 예보(fnd): 홍콩에서 보내는 여행 날짜는 Open-Meteo 예보 대신 이 예보를 씀(선전 날짜는 그대로 Open-Meteo)
//   지금 날씨(rhrread)·경보(warnsum): 여행 중이고 오늘이 홍콩 날짜일 때만
//   한국어 자료가 없어 영어(lang=en)를 받아 날씨 그림 번호·경보 코드로 한국어로 바꿔 보여 줌
// 위쪽은 순수 함수(테스트 대상 tests/hko.test.mjs), 맨 아래 loadHko만 네트워크를 씀. 부르는 때·저장은 app.js ensureHko.
//   자료 설명: HKO Open Data API 문서 https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf

export const HKO_API = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php';
export const hkoUrl = type => `${HKO_API}?dataType=${encodeURIComponent(type)}&lang=en`;
export const HKO_LINK = {
  warn:'https://www.hko.gov.hk/textonly/v2/warning/warn.htm',   // 지금 발효 중인 경보 (글자만 있는 가벼운 쪽)
  fnd:'https://www.hko.gov.hk/en/wxinfo/currwx/fnd.htm',          // 9일 예보
};
export const HKO_GAP = 30 * 60000;          // 앱을 열 때 많아야 30분에 한 번
export const WARN_FRESH = 3 * 3600000;      // 받은 지 3시간 넘은 경보·지금 날씨는 안 보여 줌(끊긴 채로 옛 경보를 보여 주지 않게)
export const FND_DAYS = 9;

const p2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const num = v => typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : null);
const str = v => typeof v === 'string' ? v : '';

// 날씨 그림 번호 → 한국어 (HKO 'Weather icons' 설명 https://www.hko.gov.hk/textonly/v2/explain/wxicon_e.htm)
//   70~75는 밤 '맑음'(달 모양만 다름)
const ICON_KO = {
  50:'맑음', 51:'대체로 맑음', 52:'구름 사이로 해', 53:'맑고 가끔 소나기', 54:'구름 많고 소나기',
  60:'구름 많음', 61:'흐림', 62:'약한 비', 63:'비', 64:'강한 비', 65:'뇌우',
  70:'맑음', 71:'맑음', 72:'맑음', 73:'맑음', 74:'맑음', 75:'맑음', 76:'대체로 흐림', 77:'대체로 맑음',
  80:'바람 강함', 81:'건조', 82:'습함', 83:'안개', 84:'옅은 안개', 85:'연무',
  90:'더움', 91:'따뜻함', 92:'선선함', 93:'추움',
};
export const iconText = c => ICON_KO[num(c)] || '';
const RAIN_ICON = new Set([53, 54, 62, 63, 64, 65]);

// 큰비 가능성(PSR, Probability of Significant Rain) → 한국어와 rain.js가 쓰는 '비 올 확률' 비슷한 숫자
//   HKO 구간: 낮음 <30%, 중하 30~45%, 중간 45~55%, 중상 55~70%, 높음 ≥70%. 숫자는 판단용 대략값(화면엔 말로 보여 줌)
const PSR = { 'Low':['낮음', 20], 'Medium Low':['조금 낮음', 40], 'Medium':['중간', 45], 'Medium High':['조금 높음', 60], 'High':['높음', 80] };
export function psrKo(p){ const x = PSR[str(p).trim()]; return x ? x[0] : ''; }
export function psrPct(p){ const x = PSR[str(p).trim()]; return x ? x[1] : null; }

// 'YYYYMMDD' → 'YYYY-MM-DD'
export function fndDate(v){ const m = /^(\d{4})(\d{2})(\d{2})$/.exec(str(v)); return m ? `${m[1]}-${m[2]}-${m[3]}` : ''; }

// 9일 예보 응답 → [{ date, text, hi, lo, rain, psr, hum, src:'hko' }]
//   rain: 비 그림(소나기·비·뇌우)이면 60 이상으로 올려 rain.js가 비 오는 날로 보게
export function parseFnd(json){
  const list = json && Array.isArray(json.weatherForecast) ? json.weatherForecast : [];
  return list.map(f => {
    if(!f || typeof f !== 'object') return null;
    const date = fndDate(f.forecastDate); if(!date) return null;
    const icon = num(f.ForecastIcon); const pct = psrPct(f.PSR);
    const rain = RAIN_ICON.has(icon) ? Math.max(pct == null ? 0 : pct, 60) : pct;
    const v = o => o && typeof o === 'object' ? num(o.value) : null;
    return { date, text:iconText(icon), hi:v(f.forecastMaxtemp), lo:v(f.forecastMintemp), rain, psr:psrKo(f.PSR),
      hum:v(f.forecastMaxrh) != null ? [v(f.forecastMinrh), v(f.forecastMaxrh)] : null, src:'hko' };
  }).filter(Boolean);
}

// 지금 날씨 응답(rhrread) → { temp, hum, text, at } | null. 천문대 본부(Hong Kong Observatory) 관측값, 없으면 첫 관측소
export function parseNow(json){
  if(!json || typeof json !== 'object') return null;
  const rows = x => Array.isArray(x) ? x : (x && Array.isArray(x.data) ? x.data : []);
  const pick = list => list.find(r => r && /observatory/i.test(str(r.place))) || list.find(r => r && num(r.value) != null) || null;
  const t = pick(rows(json.temperature)), h = pick(rows(json.humidity));
  const icon = Array.isArray(json.icon) ? json.icon[0] : json.icon;
  const out = { temp:t ? num(t.value) : null, hum:h ? num(h.value) : null, text:iconText(icon),
    at:str((json.temperature && json.temperature.recordTime) || json.updateTime) };
  return out.temp == null && out.hum == null && !out.text ? null : out;
}

// 경보 코드 → 한국어 한 줄. level 'high'는 밖에 나가지 말아야 할 만큼 센 것(빨간 띠)
const WARN_KO = {
  WCOLD:{ icon:'🥶', name:'추위 경보', tip:'따뜻하게 입고 실외 일정은 줄이세요' },
  WHOT:{ icon:'🥵', name:'더위 경보', tip:'물을 자주 마시고 한낮 실외 일정은 줄이세요' },
  WFROST:{ icon:'❄️', name:'서리 경보', tip:'산 위·높은 곳은 매우 추워요. 따뜻하게 준비하세요' },
  WMSGNL:{ icon:'💨', name:'강한 계절풍 신호', tip:'바람이 세요. 바닷가·배 일정은 조심하세요' },
  WTS:{ icon:'⛈️', name:'뇌우 경보', tip:'번개가 쳐요. 넓은 야외와 물가를 피하세요' },
  WL:{ icon:'⛰️', name:'산사태 경보', tip:'산길·등산은 피하고 비탈에서 떨어져 있으세요', level:'high' },
  WFNTSA:{ icon:'🌊', name:'신계 북부 홍수 특별 안내', tip:'신계 북부 낮은 곳은 피하세요' },
  WTMW:{ icon:'🌊', name:'해일 경보', tip:'바닷가에서 멀리 떨어지세요', level:'high' },
};
const SUB_KO = {
  WRAINA:{ icon:'🌧️', name:'황색 폭우 경보', tip:'비가 많이 와요. 실내 일정 위주로 다니세요' },
  WRAINR:{ icon:'🌧️', name:'적색 폭우 경보', tip:'밖에 나가지 말고 안전한 실내에 머무세요', level:'high' },
  WRAINB:{ icon:'⛔', name:'흑색 폭우 경보', tip:'밖에 나가지 마세요. 많은 시설이 문을 닫아요', level:'high' },
  WFIREY:{ icon:'🔥', name:'황색 화재 위험 경보', tip:'산·공원에서 불을 쓰지 마세요' },
  WFIRER:{ icon:'🔥', name:'적색 화재 위험 경보', tip:'산·공원에서 불을 쓰지 마세요' },
  TC1:{ icon:'🌀', name:'태풍 1호 신호', tip:'태풍이 다가와요. 소식을 자주 확인하세요' },
  TC3:{ icon:'🌀', name:'태풍 3호 신호', tip:'바람이 세요. 배·야외 일정은 미루세요' },
  TC8:{ icon:'🌀', name:'태풍 8호 신호', tip:'대중교통·가게가 멈춰요. 숙소에 머무세요', level:'high' },
  TC9:{ icon:'🌀', name:'태풍 9호 신호', tip:'매우 위험해요. 숙소 안, 창문에서 떨어져 있으세요', level:'high' },
  TC10:{ icon:'🌀', name:'태풍 10호 신호', tip:'매우 위험해요. 숙소 안, 창문에서 떨어져 있으세요', level:'high' },
};
// 심한 순서(위에 먼저 보여 줌)
const RANK = ['TC10', 'TC9', 'TC8', 'WRAINB', 'WRAINR', 'WTMW', 'WL', 'TC3', 'WRAINA', 'WTS', 'WMSGNL', 'WFNTSA', 'WCOLD', 'WHOT', 'TC1', 'WFROST', 'WFIRER', 'WFIREY'];

// 경보 하나 → { key, code, icon, name, tip, level, line, at }
export function warnKo(key, code){
  const k = str(key), c = str(code) || k;
  const sub = /^TC8/.test(c) ? 'TC8' : c;   // TC8NE·TC8SE·TC8NW·TC8SW
  const w = SUB_KO[sub] || WARN_KO[k] || WARN_KO[c] || { icon:'⚠️', name:'홍콩 천문대 경보', tip:'원문을 확인해 주세요' };
  return { key:k, code:sub, icon:w.icon, name:w.name, tip:w.tip, level:w.level || 'mid', line:`${w.icon} ${w.name} — ${w.tip}` };
}

// 경보 요약 응답(warnsum) → 지금 발효 중인 경보 목록(심한 순). 없으면 [] (응답은 {} )
export function parseWarnsum(json){
  if(!json || typeof json !== 'object' || Array.isArray(json)) return [];
  const out = [];
  for(const key of Object.keys(json)){
    const v = json[key]; if(!v || typeof v !== 'object') continue;
    const code = str(v.code) || key;
    if(str(v.actionCode).toUpperCase() === 'CANCEL' || code.toUpperCase() === 'CANCEL') continue;
    out.push({ ...warnKo(key, code), at:str(v.updateTime || v.issueTime) });
  }
  const r = w => { const i = RANK.indexOf(w.code); return i < 0 ? (RANK.indexOf(w.key) < 0 ? 99 : RANK.indexOf(w.key)) : i; };
  return out.sort((a, b) => r(a) - r(b));
}

// '2026-12-07T14:05:00+08:00' → '14:05' (홍콩 시각 그대로)
export function hkTime(iso){ const m = /T(\d{2}):(\d{2})/.exec(str(iso)); return m ? `${m[1]}:${m[2]}` : ''; }

// 그날이 홍콩인지 선전인지: 그날 가는 곳의 동네 도시가 많은 쪽, 같으면(빈 날 포함) 출발 숙소의 도시. 모르면 홍콩
export function dayCity(d, areas){
  const A = areas || {}; const cnt = { hk:0, sz:0 };
  const add = k => { const c = (A[k] || {}).city; if(c === 'hk' || c === 'sz') cnt[c]++; };
  ((d && d.items) || []).forEach(p => add(p && p.area)); if(d && d.full) add(d.full.area);
  if(cnt.hk !== cnt.sz) return cnt.hk > cnt.sz ? 'hk' : 'sz';
  const f = d && d.from; const c = (A[f && (f.key || f.area)] || {}).city;
  return c === 'sz' ? 'sz' : 'hk';
}
// 일정(plan) → 홍콩에서 보내는 날짜 Set('YYYY-MM-DD')
export function hkDates(P, areas){ return new Set(((P && P.days) || []).filter(d => dayCity(d, areas) === 'hk').map(d => d.key)); }

// 무엇을 받을지. today: 홍콩 날짜 'YYYY-MM-DD', hkToday: 오늘이 홍콩 날짜인지
//   fnd: 여행 날짜가 오늘~9일 뒤와 겹칠 때, now(지금 날씨·경보): 여행 중이고 오늘이 홍콩 날짜일 때
export function hkoWant(s, today, hkToday){
  if(!s || s.city !== 'hksz' || !s.start || !s.end || !today || s.start > s.end) return { fnd:false, now:false };
  const t = new Date(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)); t.setDate(t.getDate() + FND_DAYS);
  const fnd = s.end > today && s.start <= ymd(t);   // 9일 예보는 내일부터라 마지막 날이 오늘이면 받을 게 없음
  const now = s.start <= today && today <= s.end && !!hkToday;
  return { fnd, now };
}
// 다시 받을 때인지: 받을 게 있고, 마지막으로 부른 지 30분이 지났으면 (실패해도 30분 기다림)
export function hkoDue(hko, want, nowMs){
  if(!want || (!want.fnd && !want.now)) return false;
  return !hko || !(hko.at > 0) || nowMs - hko.at >= HKO_GAP || nowMs < hko.at;
}

// 새로 받은 것과 전에 받은 것 합치기: 이번에 못 받은 부분은 전 값을 그대로(받은 시각도 그대로 남아 오래되면 안 보임)
export function mergeHkoState(old, got){
  const o = old && typeof old === 'object' ? old : {};
  const out = { at:got.at };
  for(const k of ['days', 'warns', 'now']){
    if(got[k] !== undefined){ out[k] = got[k]; out[k + 'At'] = got.at; }
    else if(o[k] !== undefined){ out[k] = o[k]; out[k + 'At'] = o[k + 'At']; }
  }
  if(got.fndAt) out.fndAt = got.fndAt; else if(o.fndAt && out.days === o.days) out.fndAt = o.fndAt;
  if(got.err) out.err = true;
  return out;
}

// 화면에 보여 줄 경보: 받은 지 3시간 안일 때만. 없거나 오래됐으면 null
export function freshWarns(hko, nowMs){
  if(!hko || !Array.isArray(hko.warns) || !(hko.warnsAt > 0) || nowMs - hko.warnsAt > WARN_FRESH || nowMs < hko.warnsAt - 60000) return null;
  return hko.warns;
}
export function freshNow(hko, nowMs){
  if(!hko || !hko.now || !(hko.nowAt > 0) || nowMs - hko.nowAt > WARN_FRESH || nowMs < hko.nowAt - 60000) return null;
  return hko.now;
}

// Open-Meteo 날씨(s.wx)에 HKO 예보를 끼움: 홍콩 날짜(hk)이고 HKO 예보가 있는 날만 바꾸고 나머지(선전 날짜)는 그대로.
//   바꿀 게 없으면 wx를 그대로 돌려줌. 결과는 화면에서만 쓰고 저장하지 않음
export function mergeHko(wx, hko, hk){
  const days = hko && Array.isArray(hko.days) ? hko.days : [];
  const set = hk instanceof Set ? hk : new Set(hk || []);
  const use = new Map(days.filter(f => f && set.has(f.date)).map(f => [f.date, f]));
  if(!use.size) return wx;
  const base = ((wx && wx.forecast) || []).filter(f => !use.has(f.date));
  const forecast = base.concat([...use.values()]).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return { ...(wx || {}), forecast, hkoAt:hko.fndAt || '' };
}

// 받아오기. want: { fnd, now }. 부분마다 따로 받아 하나가 실패해도 나머지는 씀
export async function loadHko(want, nowMs){
  const out = { at:nowMs || Date.now() };
  const get = async t => { const r = await fetch(hkoUrl(t), { cache:'no-store' }); if(!r.ok) throw new Error(`${t} ${r.status}`); return r.json(); };
  const jobs = [];
  if(want.fnd) jobs.push(get('fnd').then(j => { const d = parseFnd(j); if(d.length){ out.days = d; out.fndAt = str(j.updateTime); } }));
  if(want.now){
    jobs.push(get('warnsum').then(j => { out.warns = parseWarnsum(j); }));
    jobs.push(get('rhrread').then(j => { const n = parseNow(j); if(n) out.now = n; }));
  }
  const r = await Promise.allSettled(jobs);
  if(r.some(x => x.status === 'rejected')) out.err = true;
  return out;
}
