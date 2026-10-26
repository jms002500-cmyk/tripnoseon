// 숙소 사이트별 가격 비교. 아고다·한국 플랫폼은 개인에게 가격 API를 주지 않아서
// '날짜·인원을 채운 검색 화면 열기 + 숙소 이름 복사 + 본 가격 적기'로 비교함.
// 사이트마다 주소에 넣을 수 있는 값이 달라서(2026-10-26 직접 확인) 아래 표에 정리.
// 위쪽은 순수 함수(테스트 대상), 맨 아래 loadFx만 네트워크를 씀.

// 도시별 사이트 내부 번호 (지금은 도쿄만)
export const SITE_CITY = { tokyo:{ agoda:'5085', trip:'228', rakutenKr:'cnt_japan/sub_tokyo' } };

// 박 수 (logic.js의 nights와 같은 값. logic.js가 이 파일을 불러오므로 고리를 만들지 않으려고 여기서 셈)
const parseDate = str => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m-1, d); };
const nights = s => s.start && s.end ? Math.max(0, Math.round((parseDate(s.end) - parseDate(s.start)) / 86400000)) : 0;
const kidsOf = s => s.who === 'family' ? s.kids : [];
const adultsOf = s => s.who === 'solo' ? 1 : Math.max(1, s.adults || 1);

// cur: 그 사이트에서 보통 보이는 통화(가격 칸 기본값). byName: 주소에 숙소 이름이 들어가는지
export const SITES = [
  { key:'rakutenKr', label:'라쿠텐 트래블 (한국어)', cur:'KRW', byName:false,
    url:(h, s, c) => { const q = new URLSearchParams({ numberOfUnits:'1', numberOfAdults_1:String(adultsOf(s) + kidsOf(s).length) });
      if(nights(s)){ q.set('startServiceDate', s.start); q.set('endServiceDate', s.end); }
      return `https://travel.rakuten.com/kor/ko-kr/hotel_list/${c.rakutenKr}/?${q}`; } },
  { key:'agoda', label:'아고다', cur:'KRW', byName:false,
    url:(h, s, c) => { const k = kidsOf(s); const q = new URLSearchParams({ city:c.agoda, rooms:'1', adults:String(adultsOf(s)), children:String(k.length), currency:'KRW' });
      if(k.length) q.set('childAges', k.join(','));
      if(nights(s)){ q.set('checkIn', s.start); q.set('checkOut', s.end); q.set('los', String(nights(s))); }
      return `https://www.agoda.com/ko-kr/search?${q}`; } },
  { key:'booking', label:'Booking.com', cur:'KRW', byName:true,
    url:(h, s) => { const k = kidsOf(s); const q = new URLSearchParams({ ss:h.name, no_rooms:'1', group_adults:String(adultsOf(s)), group_children:String(k.length), selected_currency:'KRW' });
      k.forEach(a => q.append('age', String(a)));
      if(nights(s)){ q.set('checkin', s.start); q.set('checkout', s.end); }
      return `https://www.booking.com/searchresults.ko.html?${q}`; } },
  { key:'trip', label:'트립닷컴', cur:'KRW', byName:false,
    url:(h, s, c) => { const k = kidsOf(s); const q = new URLSearchParams({ city:c.trip, crn:'1', adult:String(adultsOf(s)), children:String(k.length) });
      if(k.length) q.set('ages', k.join(','));
      if(nights(s)){ q.set('checkin', s.start); q.set('checkout', s.end); }
      return `https://kr.trip.com/hotels/list?${q}`; } },
  { key:'myrealtrip', label:'마이리얼트립', cur:'KRW', byName:false, home:true, url:() => 'https://www.myrealtrip.com/' },
  { key:'nol', label:'놀(야놀자)', cur:'KRW', byName:false, home:true, url:() => 'https://nol.yanolja.com/' },
  { key:'yeogi', label:'여기어때', cur:'KRW', byName:false, home:true, url:() => 'https://www.yeogi.com/' }
];

export function siteUrl(site, h, s){ const c = SITE_CITY[s.city] || SITE_CITY.tokyo; return site.url(h, s, c); }

// 통화 바꾸기. rate = 1엔당 원. 같은 통화면 그대로, 환율이 없으면 null
export function convert(v, from, to, rate){
  if(!(v > 0)) return null;
  if(from === to) return v;
  if(!(rate > 0)) return null;
  return from === 'JPY' && to === 'KRW' ? v * rate : from === 'KRW' && to === 'JPY' ? v / rate : null;
}

// 숙소 하나의 가격 후보들 → 기준 통화(cur)로 바꿔 가장 싼 것
//   base: 카드에 넣은 가격(라쿠텐 자동 또는 직접 입력, s.hotelCur 기준)
//   prices: 사이트별로 적은 가격 { site: { v, cur, at } }
export function priceOptions(h, cur, rate){
  const out = [];
  if(h.price > 0) out.push({ key:'base', label:h.src === 'rakuten' ? '라쿠텐 (일본어 사이트·자동)' : '직접 넣은 가격', v:h.price, cur, value:h.price });
  Object.entries(h.prices || {}).forEach(([key, p]) => {
    const site = SITES.find(x => x.key === key); if(!site || !(p.v > 0)) return;
    out.push({ key, label:site.label, v:p.v, cur:p.cur, value:convert(p.v, p.cur, cur, rate), at:p.at });
  });
  return out;
}
export function bestPrice(h, cur, rate){
  return priceOptions(h, cur, rate).filter(o => o.value != null).reduce((m, o) => (!m || o.value < m.value) ? o : m, null);
}

// 환율 받아오기: 유럽중앙은행 기준(frankfurter) → 안 되면 exchangerate-api. 하루 한 번
const FX_KEY = 'tripnoseon-fx';
export async function loadFx(today){
  try{ const c = JSON.parse(localStorage.getItem(FX_KEY) || 'null'); if(c && c.checked === today) return c; }catch(e){}
  let fx = null;
  try{
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW'); const j = await r.json();
    if(j.rates && j.rates.KRW > 0) fx = { rate:j.rates.KRW, date:j.date, src:'유럽중앙은행 기준' };
  }catch(e){}
  if(!fx) try{
    const r = await fetch('https://open.er-api.com/v6/latest/JPY'); const j = await r.json();
    if(j.rates && j.rates.KRW > 0) fx = { rate:j.rates.KRW, date:String(j.time_last_update_utc || '').slice(5, 16), src:'ExchangeRate-API' };
  }catch(e){}
  if(fx){ fx.checked = today; try{ localStorage.setItem(FX_KEY, JSON.stringify(fx)); }catch(e){} }
  return fx;
}
