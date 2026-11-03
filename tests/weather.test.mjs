// 실행: npm test  (네트워크는 쓰지 않음. 관측값은 지어낸 예시)
import test from 'node:test';
import assert from 'node:assert/strict';
import { tripMonthDays, climateUrl, summarizeClimate, clothesTip, canForecast, wmoText, parseForecast, CITY_PT, wxStale, keepWeather, WX_RETRY_MS } from '../js/weather.js';

test('여행 날짜 → 월·일 목록 (연말연초도)', () => {
  assert.deepEqual(tripMonthDays('2027-03-07', '2027-03-09'), ['03-07', '03-08', '03-09']);
  assert.deepEqual(tripMonthDays('2027-12-30', '2028-01-02'), ['12-30', '12-31', '01-01', '01-02']);
});

test('지난 10년을 작년까지 한 번에 요청', () => {
  const u = new URL(climateUrl(CITY_PT.tokyo, new Date(2026, 9, 26)));
  assert.equal(u.searchParams.get('start_date'), '2016-01-01');
  assert.equal(u.searchParams.get('end_date'), '2025-12-31');
});

test('여행 날짜에 해당하는 날만 평균, 비 온 날은 1mm 이상', () => {
  const json = { daily:{
    time:['2024-03-06', '2024-03-07', '2024-03-08', '2025-03-07', '2025-03-08'],
    temperature_2m_max:[30, 12, 14, 10, 16], temperature_2m_min:[20, 4, 6, 2, 8],
    precipitation_sum:[9, 0, 3.2, 0.4, 0], relative_humidity_2m_mean:[90, 60, 70, 50, 60],
    wind_speed_10m_max:[10, 20, 20, 20, 20], daylight_duration:[0, 41400, 41400, 41400, 41400] } };
  const c = summarizeClimate(json, '2027-03-07', '2027-03-08');
  assert.equal(c.days, 4); assert.equal(c.years, 2);
  assert.equal(c.hi, 13); assert.equal(c.lo, 5); assert.equal(c.mean, 9);
  assert.equal(c.hum, 60); assert.equal(c.rainPct, 25); assert.equal(c.daylight, 11.5);
  assert.equal(summarizeClimate({}, '2027-03-07', '2027-03-08'), null);
});

test('옷차림 안내와 날씨 코드', () => {
  assert.match(clothesTip(3), /패딩/); assert.match(clothesTip(25), /반팔/); assert.equal(clothesTip(null), '');
  assert.equal(wmoText(0), '맑음'); assert.equal(wmoText(63), '비'); assert.equal(wmoText(73), '눈');
});

test('예보는 출발 16일 안일 때만', () => {
  const today = new Date(2027, 1, 25);   // 2027-02-25
  assert.ok(canForecast('2027-03-07', today));
  assert.ok(!canForecast('2027-03-30', today));
  assert.ok(!canForecast('2027-02-01', today));
  const f = parseForecast({ daily:{ time:['2027-03-07'], weather_code:[3], temperature_2m_max:[12.3], temperature_2m_min:[5.1], precipitation_probability_max:[20] } });
  assert.deepEqual(f, [{ date:'2027-03-07', text:'흐림', hi:12.3, lo:5.1, rain:20 }]);
});

test('끊긴 곳에서 날씨를 끝없이 다시 묻지 않음, 받아 둔 예보는 남김', () => {
  const now = 1e12, key = 'hksz|12-06,12-07', today = '2027-12-05';
  const good = { key, climate:{ hi:22 }, forecast:[{ date:'2027-12-06', text:'맑음' }], forecastAt:'2027-12-04' };
  assert.equal(wxStale(null, key, today, true, false, now), true);
  assert.equal(wxStale(good, 'tokyo|1', today, true, false, now), true, '날짜·지역이 바뀌면');
  assert.equal(wxStale(good, key, today, true, false, now), true, '예보가 하루 지났으면');
  assert.equal(wxStale(Object.assign({}, good, { forecastAt:today }), key, today, true, false, now), false);
  assert.equal(wxStale(good, key, today, false, false, now), false, '예보 기간이 아니면 평균만');
  // 끊겨서 못 받음 → 받아 둔 것 유지 + 실패 표시
  const failed = keepWeather(good, { key, climate:{ hi:22 }, error:'날씨를 못 불러왔어요.' }, now);
  assert.deepEqual(failed.forecast, good.forecast); assert.equal(failed.forecastAt, '2027-12-04'); assert.equal(failed.failedAt, now);
  assert.equal(wxStale(failed, key, today, true, false, now + 1000), false, '실패 직후 다시 그려도 또 묻지 않음');
  assert.equal(wxStale(failed, key, today, true, true, now + 1000), true, '다시 불러오기를 누르면');
  assert.equal(wxStale(failed, key, today, true, false, now + WX_RETRY_MS), true, '10분 지나면 다시');
  // 처음부터 못 받음(평균도 없음) → 실패만
  const none = keepWeather(null, { key, error:'x' }, now);
  assert.equal(none.climate, undefined); assert.equal(none.error, 'x');
  assert.equal(wxStale(none, key, today, true, false, now + 5), false);
  // 다른 여행 날짜의 옛 예보는 섞지 않음
  assert.equal(keepWeather(good, { key:'hksz|01-01', error:'x' }, now).forecast, undefined);
  // 성공은 그대로
  const ok = { key, climate:{ hi:20 } }; assert.equal(keepWeather(good, ok, now), ok);
});
