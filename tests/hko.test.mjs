// 실행: npm test  (네트워크는 쓰지 않음. 응답은 HKO Open Data API 문서의 모양을 따른 지어낸 값)
import test from 'node:test';
import assert from 'node:assert/strict';
import { hkoUrl, iconText, psrKo, psrPct, fndDate, parseFnd, parseNow, parseWarnsum, warnKo, hkTime, dayCity, hkDates,
  hkoWant, hkoDue, mergeHkoState, freshWarns, freshNow, mergeHko, HKO_GAP, WARN_FRESH } from '../js/hko.js';
import { dayRain } from '../js/rain.js';
import { dayWeather } from '../js/today.js';

// dataType=fnd&lang=en 응답 모양 (앞 3일만)
const FND = {
  generalSituation:'An intense winter monsoon will bring cold weather to the coast of southern China in the next couple of days.',
  weatherForecast:[
    { forecastDate:'20261206', week:'Sunday', forecastWind:'North force 4 to 5.', forecastWeather:'Fine and dry. Cold in the morning.',
      forecastMaxtemp:{ value:17, unit:'C' }, forecastMintemp:{ value:11, unit:'C' }, forecastMaxrh:{ value:65, unit:'percent' }, forecastMinrh:{ value:35, unit:'percent' },
      ForecastIcon:50, PSR:'Low' },
    { forecastDate:'20261207', week:'Monday', forecastWind:'East force 3.', forecastWeather:'Cloudy with a few rain patches.',
      forecastMaxtemp:{ value:20, unit:'C' }, forecastMintemp:{ value:15, unit:'C' }, forecastMaxrh:{ value:90, unit:'percent' }, forecastMinrh:{ value:70, unit:'percent' },
      ForecastIcon:62, PSR:'Medium Low' },
    { forecastDate:'20261208', week:'Tuesday', forecastWind:'East force 4.', forecastWeather:'Mainly cloudy.',
      forecastMaxtemp:{ value:22, unit:'C' }, forecastMintemp:{ value:17, unit:'C' }, forecastMaxrh:{ value:90, unit:'percent' }, forecastMinrh:{ value:65, unit:'percent' },
      ForecastIcon:60, PSR:'High' },
  ],
  updateTime:'2026-12-05T11:30:00+08:00',
  seaTemp:{ place:'North Point', value:22, unit:'C', recordTime:'2026-12-05T07:00:00+08:00' },
  soilTemp:[{ place:'Hong Kong Observatory', value:21.4, unit:'C', recordTime:'2026-12-05T07:00:00+08:00', depth:{ unit:'metre', value:0.5 } }],
};

// dataType=rhrread&lang=en 응답 모양 (줄임)
const NOW = {
  rainfall:{ data:[{ unit:'mm', place:'Central & Western District', max:0, main:'FALSE' }], startTime:'2026-12-06T13:45:00+08:00', endTime:'2026-12-06T14:45:00+08:00' },
  icon:[61], iconUpdateTime:'2026-12-06T12:00:00+08:00',
  uvindex:{ data:[{ place:"King's Park", value:2, desc:'low' }], recordDesc:'During the past hour' },
  updateTime:'2026-12-06T15:02:00+08:00', warningMessage:['The Cold Weather Warning is now in force.'],
  temperature:{ data:[{ place:"King's Park", value:13, unit:'C' }, { place:'Hong Kong Observatory', value:12.6, unit:'C' }], recordTime:'2026-12-06T15:00:00+08:00' },
  humidity:{ recordTime:'2026-12-06T15:00:00+08:00', data:[{ unit:'percent', value:58, place:'Hong Kong Observatory' }] },
};

// dataType=warnsum&lang=en 응답 모양
const WARN = {
  WCOLD:{ name:'Cold Weather Warning', code:'WCOLD', actionCode:'ISSUE', issueTime:'2026-12-06T07:45:00+08:00', updateTime:'2026-12-06T07:45:00+08:00' },
  WTCSGNL:{ name:'Tropical Cyclone Warning Signal', code:'TC8NE', type:'No. 8 Northeast Gale or Storm Signal', actionCode:'ISSUE', issueTime:'2026-12-06T09:40:00+08:00', updateTime:'2026-12-06T09:40:00+08:00' },
  WRAIN:{ name:'Rainstorm Warning Signal', code:'WRAINA', type:'Amber', actionCode:'CANCEL', issueTime:'2026-12-06T05:00:00+08:00', updateTime:'2026-12-06T08:10:00+08:00' },
};

test('주소에는 자료 종류와 언어만', () => {
  const u = new URL(hkoUrl('fnd'));
  assert.equal(u.origin + u.pathname, 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php');
  assert.deepEqual([...u.searchParams.keys()], ['dataType', 'lang']);
  assert.equal(u.searchParams.get('lang'), 'en');
});

test('날씨 그림 번호·큰비 가능성 → 한국어', () => {
  assert.equal(iconText(50), '맑음'); assert.equal(iconText('65'), '뇌우'); assert.equal(iconText(72), '맑음'); assert.equal(iconText(999), '');
  assert.equal(psrKo('Medium High'), '조금 높음'); assert.equal(psrKo('nope'), '');
  assert.equal(psrPct('High'), 80); assert.equal(psrPct('Low'), 20); assert.equal(psrPct(undefined), null);
  assert.equal(fndDate('20261206'), '2026-12-06'); assert.equal(fndDate('2026-12-06'), '');
});

test('9일 예보 → 날짜별 예보 (비 그림이면 비 오는 날로)', () => {
  const d = parseFnd(FND);
  assert.equal(d.length, 3);
  assert.deepEqual(d[0], { date:'2026-12-06', text:'맑음', hi:17, lo:11, rain:20, psr:'낮음', hum:[35, 65], src:'hko' });
  assert.equal(d[1].text, '약한 비'); assert.equal(d[1].rain, 60);   // 큰비 가능성은 조금 낮음이어도 비 그림이라 60
  assert.equal(d[2].rain, 80); assert.equal(d[2].psr, '높음');
  assert.deepEqual(parseFnd(null), []); assert.deepEqual(parseFnd({ weatherForecast:[null, { forecastDate:'bad' }] }), []);
});

test('지금 날씨: 천문대 본부 관측값', () => {
  assert.deepEqual(parseNow(NOW), { temp:12.6, hum:58, text:'흐림', at:'2026-12-06T15:00:00+08:00' });
  assert.equal(parseNow({}), null); assert.equal(parseNow(null), null);
  assert.equal(parseNow({ temperature:{ data:[{ place:'Sha Tin', value:14 }] } }).temp, 14);   // 본부가 없으면 첫 관측소
});

test('경보: 해제된 것은 빼고 심한 순, 한국어 한 줄', () => {
  const w = parseWarnsum(WARN);
  assert.deepEqual(w.map(x => x.code), ['TC8', 'WCOLD']);
  assert.equal(w[0].level, 'high'); assert.match(w[0].line, /태풍 8호/);
  assert.equal(w[1].line, '🥶 추위 경보 — 따뜻하게 입고 실외 일정은 줄이세요');
  assert.equal(w[1].at, '2026-12-06T07:45:00+08:00');
  assert.deepEqual(parseWarnsum({}), []); assert.deepEqual(parseWarnsum(null), []); assert.deepEqual(parseWarnsum([]), []);
  assert.equal(warnKo('WRAIN', 'WRAINB').name, '흑색 폭우 경보');
  assert.equal(warnKo('WXYZ', 'WXYZ').name, '홍콩 천문대 경보');   // 모르는 경보도 빠뜨리지 않음
  assert.equal(hkTime('2026-12-06T07:45:00+08:00'), '07:45'); assert.equal(hkTime(''), '');
});

const AREAS = { tst:{ city:'hk' }, cwb:{ city:'hk' }, ft:{ city:'sz' } };
const P = { days:[
  { key:'2026-12-06', items:[{ area:'tst' }], from:{ key:'tst' } },
  { key:'2026-12-07', items:[{ area:'ft' }, { area:'ft' }, { area:'tst' }], from:{ area:'tst' } },
  { key:'2026-12-08', items:[], from:{ key:'ft' } },
  { key:'2026-12-09', items:[], full:{ area:'cwb' }, from:{ key:'ft' } },
] };

test('그날이 홍콩인지 선전인지', () => {
  assert.equal(dayCity(P.days[0], AREAS), 'hk');
  assert.equal(dayCity(P.days[1], AREAS), 'sz');   // 선전 장소가 더 많음
  assert.equal(dayCity(P.days[2], AREAS), 'sz');   // 빈 날은 숙소 도시
  assert.equal(dayCity(P.days[3], AREAS), 'hk');   // 하루 종일 장소
  assert.deepEqual([...hkDates(P, AREAS)], ['2026-12-06', '2026-12-09']);
});

test('받을 때: 홍콩·선전, 9일 예보 안, 지금 날씨·경보는 여행 중 홍콩 날짜만', () => {
  const s = { city:'hksz', start:'2026-12-06', end:'2026-12-10' };
  assert.deepEqual(hkoWant(s, '2026-11-20', false), { fnd:false, now:false });   // 아직 멀었음
  assert.deepEqual(hkoWant(s, '2026-11-27', false), { fnd:true, now:false });    // 9일 뒤가 첫날
  assert.deepEqual(hkoWant(s, '2026-12-07', true), { fnd:true, now:true });
  assert.deepEqual(hkoWant(s, '2026-12-07', false), { fnd:true, now:false });    // 오늘은 선전
  assert.deepEqual(hkoWant(s, '2026-12-10', true), { fnd:false, now:true });     // 마지막 날: 내일부터인 예보는 필요 없음
  assert.deepEqual(hkoWant(s, '2026-12-11', true), { fnd:false, now:false });
  assert.deepEqual(hkoWant({ ...s, city:'tokyo' }, '2026-12-07', true), { fnd:false, now:false });
});

test('많아야 30분에 한 번 (실패해도)', () => {
  const t = 1_800_000_000_000; const want = { fnd:true, now:false };
  assert.equal(hkoDue(null, want, t), true);
  assert.equal(hkoDue({ at:t - HKO_GAP + 1000, err:true }, want, t), false);
  assert.equal(hkoDue({ at:t - HKO_GAP }, want, t), true);
  assert.equal(hkoDue(null, { fnd:false, now:false }, t), false);
  assert.equal(hkoDue({ at:t + 3600000 }, want, t), true);   // 폰 시계를 되돌렸으면 다시
});

test('못 받은 부분은 전 값 그대로, 오래된 경보·지금 날씨는 안 보여 줌', () => {
  const t0 = 1_800_000_000_000, t1 = t0 + HKO_GAP;
  const a = mergeHkoState(null, { at:t0, days:parseFnd(FND), fndAt:FND.updateTime, warns:parseWarnsum(WARN), now:parseNow(NOW) });
  assert.equal(a.daysAt, t0); assert.equal(a.warnsAt, t0); assert.equal(a.fndAt, FND.updateTime);
  const b = mergeHkoState(a, { at:t1, err:true });   // 끊겨서 하나도 못 받음
  assert.equal(b.at, t1); assert.equal(b.days, a.days); assert.equal(b.warnsAt, t0); assert.equal(b.fndAt, FND.updateTime); assert.equal(b.err, true);
  assert.equal(freshWarns(b, t1).length, 2);
  assert.equal(freshWarns(b, t0 + WARN_FRESH + 1), null);
  assert.equal(freshNow(b, t0 + WARN_FRESH + 1), null);
  assert.equal(freshNow(b, t1).temp, 12.6);
  const c = mergeHkoState(b, { at:t1 + HKO_GAP, warns:[] });   // 경보가 모두 풀림
  assert.deepEqual(freshWarns(c, t1 + HKO_GAP), []);
  assert.equal(freshWarns(null, t0), null);
});

test('홍콩 날짜만 천문대 예보로, 선전 날짜는 Open-Meteo 그대로', () => {
  const wx = { climate:{ hi:20, lo:14 }, forecast:[
    { date:'2026-12-06', text:'흐림', hi:19, lo:13, rain:30 },
    { date:'2026-12-07', text:'구름 조금', hi:21, lo:15, rain:10 },
    { date:'2026-12-08', text:'맑음', hi:22, lo:16, rain:0 },
  ] };
  const hko = mergeHkoState(null, { at:1, days:parseFnd(FND), fndAt:FND.updateTime });
  const m = mergeHko(wx, hko, new Set(['2026-12-06', '2026-12-08']));
  assert.deepEqual(m.forecast.map(f => [f.date, f.src || 'om']), [['2026-12-06', 'hko'], ['2026-12-07', 'om'], ['2026-12-08', 'hko']]);
  assert.equal(m.climate, wx.climate); assert.equal(m.hkoAt, FND.updateTime);
  assert.equal(wx.forecast[0].text, '흐림');   // 원래 값은 안 바꿈
  assert.equal(mergeHko(wx, hko, new Set()), wx);   // 홍콩 날짜가 없으면 그대로
  assert.equal(mergeHko(wx, null, new Set(['2026-12-06'])), wx);
  assert.equal(mergeHko(null, hko, ['2026-12-07']).forecast[0].text, '약한 비');   // Open-Meteo를 못 받았어도
  // 화면 쪽 함수들이 천문대 예보를 알아봄
  assert.deepEqual(dayRain(m, '2026-12-08'), { rainy:true, prob:80, text:'구름 많음', psr:'높음' });
  assert.deepEqual(dayRain(m, '2026-12-07'), { rainy:false, prob:10, text:'구름 조금' });
  assert.equal(dayWeather(m, '2026-12-06').src, 'hko'); assert.equal(dayWeather(m, '2026-12-06').psr, '낮음');
  assert.equal(dayWeather(m, '2026-12-07').src, undefined);
});
