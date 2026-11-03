// 한국 공항 주차장 남은 자리 (공공데이터포털 data.go.kr, 무료, 실시간). 자가용으로 공항 가는 '집 → 공항' 이동에서 씀.
//   인천: 인천국제공항공사_주차 정보 (15095047) B551177/StatusOfParking/getTrackingParking — 주차구역별 주차한 차량 수·총 면수
//   김포·김해·제주 등 14곳: 한국공항공사_전국공항 실시간 주차정보_GW (15158681) B551178/parking-realtime-status/info
//   두 곳 모두 우리 배포 주소에서 브라우저로 바로 부를 수 있음(CORS 허용, 2026-11-03 확인).
// 키는 사용자가 data.go.kr에서 받은 인증키를 이 기기에만 저장(PK_KEY, 일정 상태·백업과 따로). 보내는 것은 키뿐.
// 응답 → 주차장 목록은 순수 함수(테스트 대상). 한공 필드 뜻은 문서 설명이 깨져 있어 이름으로 짐작:
//   parkingFullSpace 전체 면수, parkingIstay 지금 서 있는 차 — 실제 값으로 다시 확인할 것.
export const PK_KEY = 'tripnoseon-datagokr';
export const PK_PAGES = [
  { label:'인천국제공항공사_주차 정보', url:'https://www.data.go.kr/data/15095047/openapi.do' },
  { label:'한국공항공사_전국공항 실시간 주차정보', url:'https://www.data.go.kr/data/15158681/openapi.do' }
];
export const KR_AIRPORTS = [
  { k:'ICN1', label:'인천 1터미널', src:'icn', t:'1' }, { k:'ICN2', label:'인천 2터미널', src:'icn', t:'2' },
  { k:'GMP', label:'김포', src:'kac', q:'김포' }, { k:'PUS', label:'김해', src:'kac', q:'김해' }, { k:'CJU', label:'제주', src:'kac', q:'제주' },
  { k:'TAE', label:'대구', src:'kac', q:'대구' }, { k:'CJJ', label:'청주', src:'kac', q:'청주' }, { k:'MWX', label:'무안', src:'kac', q:'무안' },
  { k:'KWJ', label:'광주', src:'kac', q:'광주' }, { k:'USN', label:'울산', src:'kac', q:'울산' }, { k:'RSU', label:'여수', src:'kac', q:'여수' },
  { k:'YNY', label:'양양', src:'kac', q:'양양' }, { k:'KPO', label:'포항경주', src:'kac', q:'포항' }, { k:'HIN', label:'사천', src:'kac', q:'사천' },
  { k:'WJU', label:'원주', src:'kac', q:'원주' }, { k:'KUV', label:'군산', src:'kac', q:'군산' }
];
export const krAirport = k => KR_AIRPORTS.find(a => a.k === k) || null;

// '집 → 공항'의 도착 이름으로 공항 짐작 ('인천공항 2터미널' → ICN2). 모르면 ''
export function guessKap(text){
  const t = String(text || '').replace(/\s+/g, '');
  if(/인천|ICN/i.test(t)) return /(2|제2|T2)터미널|T2/i.test(t) ? 'ICN2' : /(1|제1|T1)터미널|T1/i.test(t) ? 'ICN1' : '';
  const a = KR_AIRPORTS.find(x => x.q && t.includes(x.q)); return a ? a.k : '';
}

// data.go.kr '인코딩' 키를 붙여 넣었으면 풀어서 씀 (URLSearchParams가 다시 인코딩함)
export function cleanKey(k){
  const t = String(k || '').trim();
  if(!/%[0-9A-F]{2}/i.test(t)) return t;
  try{ return decodeURIComponent(t); }catch(e){ return t; }
}

export function parkUrl(ap, key){
  const p = new URLSearchParams({ serviceKey:cleanKey(key), numOfRows:'100', pageNo:'1', type:'json' });
  return ap.src === 'icn' ? `https://apis.data.go.kr/B551177/StatusOfParking/getTrackingParking?${p}`
    : `https://apis.data.go.kr/B551178/parking-realtime-status/info?${p}`;
}

// XML 답(JSON을 못 주는 경우)에서 <item> 안의 칸들 꺼내기
export function xmlItems(text){
  const out = []; const re = /<item>([\s\S]*?)<\/item>/g; let m;
  while((m = re.exec(String(text || '')))){
    const o = {}; const f = /<([A-Za-z]\w*)>([^<]*)<\/\1>/g; let g;
    while((g = f.exec(m[1]))) o[g[1]] = g[2].trim();
    out.push(o);
  }
  return out;
}

const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : null; };
// '20261206071530.000' · '2026-12-06' + '07:15:30' → '12/6 07:15'
function stamp(d, t){
  const s = String(d || '') + String(t || ''); const m = s.replace(/\D/g, '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  return m ? `${+m[2]}/${+m[3]} ${m[4]}:${m[5]}` : '';
}

// 답 글 → { ok, rows:[{ name, used, total, free }], at, err }
//   err: 'key' 키가 아직 안 열림·틀림 | 'limit' 하루 한도 | 'none' 이 공항 자료 없음 | 'bad' 알 수 없는 답
export function parseParking(ap, text){
  const t = String(text || '').trim(); let items = null, code = '';
  if(t.startsWith('{')){
    let j; try{ j = JSON.parse(t); }catch(e){ return { ok:false, err:'bad' }; }
    const auth = j.OpenAPI_ServiceResponse && j.OpenAPI_ServiceResponse.cmmMsgHeader;
    if(auth) return { ok:false, err:/LIMIT/i.test(auth.errMsg || '') || auth.returnReasonCode === '22' ? 'limit' : 'key' };
    const r = j.response || j; code = String(((r.header || {}).resultCode) || '');
    const it = r.body && r.body.items; items = Array.isArray(it) ? it : it && it.item ? [].concat(it.item) : [];
  } else if(t.startsWith('<')){
    if(/SERVICE_KEY|SERVICE KEY/i.test(t)) return { ok:false, err:/LIMIT/i.test(t) ? 'limit' : 'key' };
    code = ((t.match(/<resultCode>([^<]*)</) || [])[1] || '').trim(); items = xmlItems(t);
  } else return { ok:false, err:'bad' };
  if(code && !/^0+$/.test(code)) return { ok:false, err:code === '22' ? 'limit' : code === '30' || code === '31' ? 'key' : 'bad' };
  let rows, at = '';
  if(ap.src === 'icn'){
    const mine = items.filter(x => { const f = String(x.floor || ''); return ap.t === '2' ? /T2|제2/.test(f) : /T1|제1/.test(f) || !/T2|제2/.test(f); });
    rows = mine.map(x => ({ name:String(x.floor || '').replace(/^(T[12]|제[12]터미널)\s*/, '').trim() || '주차장', used:num(x.parking), total:num(x.parkingarea) }));
    at = mine.length ? stamp(mine[0].datetm) : '';
  } else {
    const mine = items.filter(x => String(x.aprKor || '').includes(ap.q));
    rows = mine.map(x => ({ name:String(x.parkingAirportCodeName || '주차장').trim(), used:num(x.parkingIstay), total:num(x.parkingFullSpace) }));
    at = mine.length ? stamp(mine[0].parkingGetdate, mine[0].parkingGettime) : '';
  }
  rows = rows.filter(r => r.total > 0 && r.used != null).map(r => Object.assign(r, { free:Math.max(0, r.total - r.used) }));
  if(!rows.length) return { ok:false, err:'none' };
  return { ok:true, rows, at };
}

// 남은 비율로 한마디: 여유 · 보통 · 붐빔 · 거의 참
export function crowdOf(r){
  const p = r.total ? r.free / r.total : 0;
  return p <= 0.03 ? { k:'full', text:'거의 참' } : p < 0.15 ? { k:'busy', text:'붐빔' } : p < 0.4 ? { k:'mid', text:'보통' } : { k:'ok', text:'여유' };
}
export const ERR_TEXT = {
  key:'인증키가 아직 안 열렸거나 틀렸어요. data.go.kr에서 활용신청한 뒤 1~2시간 지나야 열려요. 두 주차 정보 모두 활용신청했는지도 봐 주세요.',
  limit:'오늘 조회 한도를 다 썼어요. 내일 다시 볼 수 있어요.',
  none:'이 공항 주차장 자료가 지금 안 들어와요. 공항 누리집에서 확인해 주세요.',
  bad:'주차 정보를 못 읽었어요. 잠시 후 다시 눌러 주세요.',
  net:'주차 정보를 못 불러왔어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'
};
