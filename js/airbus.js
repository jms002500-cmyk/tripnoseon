// 공항버스: 우리 동네를 지나는 버스와 공항 출발 시간표 (공공데이터포털, 무료). 집 ↔ 공항을 🚌 공항버스로 갈 때 씀.
//   인천: 인천국제공항공사_버스정보 (15095045) B551177/BusInformation/getBusInfo — 지역(area 1~7)별 버스번호·요금·운수사·
//     정류장(routeinfo)·공항 타는 곳(t1ridelo/t2ridelo)·공항 출발 평일/주말 시간표(t1wdayt/t1wt, t2wdayt/t2wt, 'HHMM, HHMM')
//     '공항행 첫차·막차'(toawfirst/last)는 실제 자료를 보면 공항 출발 시간표의 처음·끝과 같아서(2026-11-03, 183개 중 159개) 쓰지 않음
//     → 동네 정류장에서 몇 시에 서는지는 이 자료에 없음. 공식 검색·운수사 전화로 확인하게 안내
//   김포·김해·제주 등: 한국공항공사_전국공항 버스노선_GW (15158690) B551178/airport-bus/info?schAirport=GMP — 노선·타는 곳·요금·
//     첫차·막차·안내 글(BUS_DATA_ETC_KOR, 시각이 적혀 있기도 하지만 '20년' 같은 옛 글이 섞여 있음). 한 번에 100개까지
// 인증키는 주차와 같은 공공데이터포털 키(parking.js PK_KEY). 답 읽기는 parking.js readApi. 순수 함수(테스트 대상)
import { cleanKey, readApi } from './parking.js';

export const BUS_PAGES = [
  { label:'인천국제공항공사_버스정보', url:'https://www.data.go.kr/data/15095045/openapi.do' },
  { label:'한국공항공사_전국공항 버스노선', url:'https://www.data.go.kr/data/15158690/openapi.do' }
];
export const BUS_AREAS = [
  { k:'1', label:'서울' }, { k:'2', label:'경기' }, { k:'3', label:'인천' }, { k:'4', label:'강원' },
  { k:'5', label:'충청' }, { k:'6', label:'경상' }, { k:'7', label:'전라' }
];
export const KAC_CODE = { GMP:'GMP', PUS:'PUS', CJU:'CJU', TAE:'TAE', CJJ:'CJJ', MWX:'MWX', KWJ:'KWJ', USN:'USN', RSU:'RSU', YNY:'YNY', HIN:'HIN', WJU:'WJU', KUV:'KUV' };

export function busUrl(ap, key, area, page){
  if(ap.src === 'icn'){
    const p = new URLSearchParams({ serviceKey:cleanKey(key), numOfRows:'300', pageNo:'1', type:'json' });
    if(BUS_AREAS.some(a => a.k === area)) p.set('area', area);
    return `https://apis.data.go.kr/B551177/BusInformation/getBusInfo?${p}`;
  }
  const p = new URLSearchParams({ serviceKey:cleanKey(key), numOfRows:'100', pageNo:String(page || 1), schAirport:KAC_CODE[ap.k] || ap.k, type:'json' });
  return `https://apis.data.go.kr/B551178/airport-bus/info?${p}`;
}

// '0549, 0614' · '8:00 / 8:40' → [349, 374] (분, 오름차순, 겹침 없음). 24:50처럼 자정 넘는 막차는 1490
export function timesOf(text){
  const out = []; const re = /(?:^|[^\d:])(\d{1,2}):?(\d{2})(?![\d:])/g; let m;
  const t = String(text || '');
  while((m = re.exec(t))){ const h = +m[1], mi = +m[2]; if(h <= 26 && mi < 60) out.push(h * 60 + mi); }
  return [...new Set(out)].sort((a, b) => a - b);
}
// '16,000' · '19700/19700' → 16000 · 19700 (첫 금액)
const money = n => { const m = String(n == null ? '' : n).match(/\d[\d,]*/); return m ? parseInt(m[0].replace(/,/g, ''), 10) : 0; };
const clean = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
// '대한공항리무진(02-2664-9898)' · 'KAL리무진 02)2667-0386' → '0226649898' (첫 번호)
export function phoneOf(text){
  const m = String(text || '').match(/0\d{1,2}[)\-\s]?\d{3,4}-?\d{4}|1\d{3}-?\d{4}/);
  return m ? m[0].replace(/\D/g, '') : '';
}

// 답 글 → { ok, buses:[…], total, err }. 인천은 고른 터미널(ap.t)의 시간표만 꺼냄
//   bus: { no, cls, fare, card, co, tel, stops:[…], ride, wd:[분], we:[분], first, last, etc }
export function parseBuses(ap, text){
  const a = readApi(text); if(!a.ok) return a;
  let buses;
  if(ap.src === 'icn'){
    const T = ap.t === '2' ? 't2' : 't1';
    buses = a.items.filter(x => x.busnumber || x.routeinfo).map(x => {
      const wd = timesOf(x[T + 'wdayt']), we = timesOf(x[T + 'wt']);
      return { no:clean(x.busnumber) || '번호 없음', cls:clean(x.busclass), fare:money(x.adultfare), card:0,
        co:clean(x.cpname), tel:phoneOf(x.cpname), stops:clean(x.routeinfo).split(/\s*,\s*/).filter(Boolean),
        ride:clean(x[T + 'ridelo']).replace(/\s*\|\s*/g, ' · '), wd, we:we.length ? we : wd, first:'', last:'', etc:'' };
    }).filter(b => b.wd.length || b.we.length);   // 이 터미널에 안 서는 버스는 뺌
  } else {
    buses = a.items.map(x => {
      return { no:clean(x.BUS_DATA_BUS_NUM) || clean(x.BUS_CATEGORY_KOR_NAME) || '버스', cls:clean(x.BUS_CATEGORY_KOR_NAME), fare:money(x.BUS_DATA_MONEY), card:money(x.BUS_DATA_CARD),
        co:clean(x.BUS_DATA_COMNAME_KOR), tel:phoneOf(x.BUS_DATA_COMNAME_KOR), stops:clean(x.BUS_DATA_ROUTE_KOR).replace(/^`?\d{2}\.\d{1,2}\.\d{1,2}[^\-]*?(?=\S+\s*-)/, '').split(/\s*[-→]\s*/).map(clean).filter(Boolean),
        ride:clean(x.BUS_DATA_GETON_KOR), wd:[], we:[], first:clean(x.BUS_DATA_FIRST_TIME), last:clean(x.BUS_DATA_END_TIME), etc:clean(x.BUS_DATA_ETC_KOR).slice(0, 300) };
    });
  }
  return { ok:true, buses, total:a.total == null ? a.items.length : a.total };
}

const norm = x => String(x || '').normalize('NFKC').toLowerCase().replace(/[\s·.,()\[\]\-]/g, '');
// 검색어(여러 단어면 모두)가 버스 번호나 정류장에 들어 있는 버스. 번호가 똑같으면 맨 앞. hits: 맞은 정류장
export function findBuses(buses, q){
  const words = String(q || '').split(/[\s,]+/).map(norm).filter(w => w.length >= 1);
  if(!words.length) return [];
  const out = [];
  for(const b of buses){
    const no = norm(b.no); const hits = [];
    const ok = words.every(w => { if(no.includes(w)) return true; const s = b.stops.filter(x => norm(x).includes(w)); hits.push(...s); return s.length > 0; });
    const raw = b.no.replace(/\s+/g, '').toLowerCase(), q1 = String(q).trim().toLowerCase();   // '6003' → '6003(대림역)'
    if(ok) out.push(Object.assign({}, b, { hits:[...new Set(hits)], exact:words.length === 1 && (raw === q1 || raw.startsWith(q1 + '(')) }));
  }
  return out.sort((a, b) => (b.exact - a.exact) || a.no.localeCompare(b.no, 'ko', { numeric:true }));
}
// 저장해 둔 버스 번호로 그 버스 하나
export const busByNo = (buses, no) => buses.find(b => b.no === no) || null;

// 주말(토·일)인지: 'YYYY-MM-DD'. 공휴일은 모름 → 화면에 안내
export const isWeekend = key => { const [y, m, d] = String(key || '').split('-').map(Number); if(!y) return false; const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 || w === 6; };
// 그 시각 뒤로 탈 수 있는 차 (n대)
export const nextTimes = (times, from, n) => times.filter(t => t >= from).slice(0, n || 4);
// 보통 몇 분마다 (가운데 값). 차가 3대보다 적으면 null
export function gapOf(times){
  if(!times || times.length < 3) return null;
  const g = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b); return g[Math.floor(g.length / 2)];
}
export const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const BUS_ERR = {
  key:'공항버스 자료를 못 열었어요. data.go.kr에서 공항버스 정보(인천·한국공항공사)도 활용신청했는지 봐 주세요. 신청하고 1~2시간 지나야 열려요.',
  limit:'오늘 조회 한도를 다 썼어요. 내일 다시 볼 수 있어요.',
  bad:'공항버스 정보를 못 읽었어요. 잠시 후 다시 눌러 주세요.',
  net:'공항버스 정보를 못 불러왔어요. 인터넷 연결을 확인하고 다시 눌러 주세요.',
  empty:'동네나 정류장 이름(예: 노원역), 또는 버스 번호를 넣어 주세요.',
  none:'그 이름으로 지나는 버스를 못 찾았어요. 역 이름처럼 짧게 넣어 보거나 지역을 바꿔 보세요.'
};
