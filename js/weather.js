// 여행 날짜의 날씨. Open-Meteo(무료, 키 없음)를 씀. 보내는 것은 도시 좌표와 날짜뿐.
//   이맘때 날씨: 지난 10년 같은 날짜(월·일)의 실제 관측값 평균 (archive API, 며칠 늦게 갱신됨)
//   예보: 출발이 16일 안이면 실제 예보 (forecast API)
// 위쪽은 순수 함수(테스트 대상), 맨 아래 loadWeather만 네트워크를 씀.
import { parseDate } from './logic.js';

export const CITY_PT = { tokyo:{ lat:35.6812, lng:139.7671 } };
export const YEARS = 10;
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const DAILY = 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,daylight_duration';

export const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const md = str => str.slice(5);   // 'YYYY-MM-DD' → 'MM-DD'

// 여행 날짜의 월·일 목록 (최대 10일)
export function tripMonthDays(start, end){
  let a = parseDate(start), b = parseDate(end); if(b < a){ const t = a; a = b; b = t; }
  const out = [];
  for(const d = new Date(a); d <= b && out.length < 10; d.setDate(d.getDate()+1)) out.push(md(ymd(d)));
  return out;
}

// 지난 YEARS년을 한 번에 받는 주소. today 기준으로 작년까지(올해 관측은 아직 덜 쌓임)
export function climateUrl(pt, today){
  const y = today.getFullYear() - 1;
  const p = new URLSearchParams({ latitude:String(pt.lat), longitude:String(pt.lng), start_date:`${y - YEARS + 1}-01-01`, end_date:`${y}-12-31`, daily:DAILY, timezone:'Asia/Tokyo' });
  return `${ARCHIVE}?${p}`;
}

const avg = xs => { const v = xs.filter(x => x != null && Number.isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const r1 = x => x == null ? null : Math.round(x * 10) / 10;

// 관측값 → 여행 날짜 평균. 비 온 날 = 하루 강수 1mm 이상
export function summarizeClimate(json, start, end){
  const d = json && json.daily; if(!d || !Array.isArray(d.time)) return null;
  const want = new Set(tripMonthDays(start, end));
  const idx = d.time.map((t, i) => want.has(md(t)) ? i : -1).filter(i => i >= 0);
  if(!idx.length) return null;
  const pick = k => idx.map(i => d[k] ? d[k][i] : null);
  const rain = pick('precipitation_sum').filter(x => x != null);
  const hi = avg(pick('temperature_2m_max')), lo = avg(pick('temperature_2m_min'));
  return { hi:r1(hi), lo:r1(lo), mean:r1(hi != null && lo != null ? (hi + lo) / 2 : null), hum:Math.round(avg(pick('relative_humidity_2m_mean')) || 0),
    rainPct: rain.length ? Math.round(rain.filter(x => x >= 1).length / rain.length * 100) : null,
    wind:r1(avg(pick('wind_speed_10m_max'))), daylight:r1((avg(pick('daylight_duration')) || 0) / 3600),
    days:idx.length, years:new Set(idx.map(i => d.time[i].slice(0, 4))).size };
}

// 평균 기온 → 옷차림 한 줄 (한국 기상청 옷차림표 느낌으로 단순화)
export function clothesTip(mean){
  if(mean == null) return '';
  if(mean <= 4) return '패딩·두꺼운 코트, 목도리·장갑이 필요해요.';
  if(mean <= 8) return '코트나 가벼운 패딩에 니트, 아침저녁엔 목도리가 있으면 좋아요.';
  if(mean <= 11) return '트렌치코트·점퍼에 니트나 기모 옷이 좋아요.';
  if(mean <= 16) return '가벼운 재킷이나 가디건을 챙기세요.';
  if(mean <= 19) return '얇은 긴팔에 가디건 하나면 돼요.';
  if(mean <= 22) return '긴팔이나 얇은 셔츠가 좋아요.';
  if(mean <= 27) return '반팔이 좋아요. 실내 냉방용 얇은 겉옷 하나.';
  return '한여름 날씨예요. 반팔·모자·물, 더위 조심하세요.';
}

// 출발까지 남은 날이 16일 안이면 예보를 받을 수 있음
export function canForecast(start, today){
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((parseDate(start) - t) / 86400000);
  return diff >= 0 && diff <= 15;
}

export function forecastUrl(pt, start, end){
  const p = new URLSearchParams({ latitude:String(pt.lat), longitude:String(pt.lng), start_date:start, end_date:end,
    daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone:'Asia/Tokyo' });
  return `${FORECAST}?${p}`;
}

// WMO 날씨 코드 → 한국어
export function wmoText(c){
  if(c === 0) return '맑음';
  if(c <= 2) return '구름 조금';
  if(c === 3) return '흐림';
  if(c === 45 || c === 48) return '안개';
  if(c >= 51 && c <= 57) return '이슬비';
  if(c >= 61 && c <= 67) return '비';
  if(c >= 71 && c <= 77) return '눈';
  if(c >= 80 && c <= 82) return '소나기';
  if(c >= 85 && c <= 86) return '눈 소나기';
  if(c >= 95) return '뇌우';
  return '';
}

export function parseForecast(json){
  const d = json && json.daily; if(!d || !Array.isArray(d.time)) return [];
  return d.time.map((t, i) => ({ date:t, text:wmoText(d.weather_code[i]), hi:r1(d.temperature_2m_max[i]), lo:r1(d.temperature_2m_min[i]),
    rain:d.precipitation_probability_max ? d.precipitation_probability_max[i] : null }));
}

// 날씨 받아오기. 이맘때 평균은 도시·월일별로 브라우저에 저장해 두고 다시 받지 않음 (과거 관측이라 바뀌지 않음)
const C_KEY = 'tripnoseon-weather';
export async function loadWeather(city, start, end){
  const pt = CITY_PT[city]; if(!pt) return { error:'이 도시는 아직 날씨를 준비하지 못했어요.' };
  const key = `${city}|${tripMonthDays(start, end).join(',')}`;
  let cache = {}; try{ cache = JSON.parse(localStorage.getItem(C_KEY) || '{}'); }catch(e){}
  const out = { key };
  try{
    if(cache[key]) out.climate = cache[key];
    else {
      const res = await fetch(climateUrl(pt, new Date())); if(!res.ok) throw new Error('climate ' + res.status);
      out.climate = summarizeClimate(await res.json(), start, end);
      try{ cache[key] = out.climate; localStorage.setItem(C_KEY, JSON.stringify(cache)); }catch(e){}
    }
    if(canForecast(start, new Date())){
      const last = new Date(); last.setDate(last.getDate() + 15);   // 예보는 오늘부터 16일까지만
      const res = await fetch(forecastUrl(pt, start, end < ymd(last) ? end : ymd(last)));
      if(res.ok){ out.forecast = parseForecast(await res.json()); out.forecastAt = ymd(new Date()); }
    }
  }catch(e){ out.error = '날씨를 못 불러왔어요. 인터넷 연결을 확인해 주세요.'; }
  return out;
}
