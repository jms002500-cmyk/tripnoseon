// 🛂 홍콩 ↔ 선전 국경(육로 검문소) 대기 시간 — 홍콩 출입국관리처(Immigration Department) 공개 자료, DATA.GOV.HK
//   데이터셋: 'Land Boundary Control Points Waiting Time' (hk-immd-set28, 15분마다 갱신, 무료·키 없음)
//   주소: https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json (방문객 visitor 줄)
//         …/CPQueueTimeR.json 은 홍콩 주민 줄 — 한국인 여행자는 방문객 줄이라 V만 부름
//   응답: { "LWS":{ "arrQueue":0, "depQueue":1 }, … } — 검문소 코드마다 arrQueue(홍콩으로 들어옴)·depQueue(홍콩에서 나감).
//         시각 칸은 없음 → 응답의 Last-Modified(CORS에서도 읽히는 기본 헤더)를 자료 시각으로, 없으면 받은 시각.
//   코드 뜻(자료 사전 5쪽 표, 방문객 기준): 0 보통(대개 30분 안쪽) · 1 붐빔(대개 45분 안쪽) · 2 아주 붐빔(대개 45분 이상)
//         · 4 시스템 점검 중 · 99 운영 시간 아님. (홍콩 주민 줄은 15·30분 기준)
//   확인 2026-11-03: 이 작업 환경에서 secure1.info.gov.hk·data.gov.hk·immd.gov.hk 접속이 막혀 직접 받지 못했고,
//         같은 주소를 쓰는 공개 저장소 여럿(자료 사전 표를 옮겨 적은 것 포함)으로 주소·모양·코드 뜻·검문소 코드를 대조했어요.
//   CORS: 2026-11-03 PC에서 확인 — 응답에 Access-Control-Allow-Origin이 없어 브라우저에서 못 부름. 그래서 앱은 지금 이 자료를 부르지 않고
//         홍콩 보안국 대기 시간 페이지(같은 자료)로 연결만 함(views.js borderBox). 읽기 함수(parseQueue 등)는 출시 때 서버를 두면 쓰려고 남겨 둠.
//   본토(선전) 쪽 심사 대기 시간은 공개 자료가 없어 범위 밖.
// 누를 때만 부르고(보내는 정보 없음) 결과는 화면 전용(s.sh.border). 여기는 순수 함수만 (부르기는 app.js borderWait).
export const BORDER_CHECKED = '2026-11-03';
export const BORDER_URL = 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json';
export const BORDER_SOURCE = 'https://data.gov.hk/en-data/dataset/hk-immd-set28-land-boundary-control-points-waiting-time';
export const BORDER_ALT = 'https://www.sb.gov.hk/eng/bwt/status.html?type=outbound';   // 홍콩 보안국 대기 시간 페이지(영어, 들어올 때는 type=inbound). 2026-11-03 열림 확인

// 검문소 코드 → 이름. border: 앱 지역 데이터 BORDER(hksz-data.js)의 key. main: 선전 오갈 때 주로 쓰는 곳(먼저 보여 줌)
// hours: 홍콩 출입국관리처 '출입국 검문소 위치' 쪽(2026-06-26 갱신본, 2026-08 옮겨 적은 것)의 여객 통관 시간 — 대략, 가기 전에 확인
export const CPS = {
  LWS:{ ko:'뤄후 (로우)', zh:'羅湖', border:'luohu', main:true, hours:'06:30~24:00' },
  LSC:{ ko:'푸톈 (록마차우 지선)', zh:'落馬洲支線', border:'lokmachau', main:true, hours:'06:30~22:30' },
  LMC:{ ko:'황강 (록마차우)', zh:'落馬洲', border:'huanggang', main:true, hours:'24시간' },
  SBC:{ ko:'선전베이', zh:'深圳灣', border:'shenzhenbay', main:true, hours:'06:30~24:00' },
  HYW:{ ko:'롄탕 (헝윈와이)', zh:'香園圍', main:true, hours:'07:00~22:00' },
  HZM:{ ko:'강주아오 대교 (마카오·주하이)', zh:'港珠澳大橋', hours:'24시간' },
  MKT:{ ko:'원진두 (만깜토)', zh:'文錦渡', hours:'07:00~22:00' },
  STK:{ ko:'사터우자오 (사타우꼭)', zh:'沙頭角', hours:'여객 통관 멈춤' }
};
const ORDER = Object.keys(CPS);
export const cpOfBorder = key => ORDER.find(c => CPS[c].border === key) || '';

// 상태 코드 → { k: 화면 색 이름, ko: 한국어 }
export const QUEUE = {
  0:{ k:'ok', ko:'보통 · 30분 안쪽' },
  1:{ k:'busy', ko:'붐빔 · 45분 안쪽' },
  2:{ k:'very', ko:'아주 붐빔 · 45분 넘음' },
  4:{ k:'off', ko:'자료 점검 중' },
  99:{ k:'off', ko:'닫힘 · 운영 시간 아님' }
};
export const queueOf = c => QUEUE[c] || { k:'off', ko:'모름' };

// 답 글 → { ok:true, cps:[{ code, arr, dep }] (알려진 검문소 순서, 모르는 코드는 뒤에) } | { ok:false, err:'bad' | 'none' }
export function parseQueue(text){
  let j; try{ j = JSON.parse(String(text || '')); }catch(e){ return { ok:false, err:'bad' }; }
  if(!j || typeof j !== 'object' || Array.isArray(j)) return { ok:false, err:'bad' };
  const num = v => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof n === 'number' && Number.isInteger(n) ? n : null; };
  const cps = Object.keys(j).filter(c => /^[A-Z]{2,4}$/.test(c) && j[c] && typeof j[c] === 'object')
    .map(c => ({ code:c, arr:num(j[c].arrQueue), dep:num(j[c].depQueue) }))
    .filter(x => x.arr != null || x.dep != null)
    .sort((a, b) => (ORDER.indexOf(a.code) + 1 || 99) - (ORDER.indexOf(b.code) + 1 || 99) || a.code.localeCompare(b.code))
    .slice(0, 16);
  return cps.length ? { ok:true, cps } : { ok:false, err:'none' };
}

// 홍콩 시각(UTC+8) 'HH:MM'
export function hkClock(ms){
  if(!Number.isFinite(ms)) return '';
  const d = new Date(ms + 8 * 3600 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
// 자료 시각: Last-Modified가 있으면 그 시각(lm:true, 1시간 넘게 지났으면 old), 없으면 받은 시각
export function dataTime(lastModified, gotAt){
  const t = Date.parse(String(lastModified || ''));
  if(Number.isFinite(t) && t <= gotAt + 5 * 60 * 1000) return { time:hkClock(t), lm:true, old:gotAt - t > 60 * 60 * 1000 };
  return { time:hkClock(gotAt), lm:false, old:false };
}

// 그날 국경을 넘는 방향: pairs [[출발 도시, 도착 도시]] ('hk' | 'sz') → 'out'(홍콩 → 선전) · 'in'(선전 → 홍콩) · 'both' · ''
export function crossDir(pairs){
  const p = (pairs || []).filter(x => x && x[0] && x[1] && x[0] !== x[1]);
  const out = p.some(x => x[0] === 'hk' && x[1] === 'sz'), back = p.some(x => x[0] === 'sz' && x[1] === 'hk');
  return out && back ? 'both' : out ? 'out' : back ? 'in' : '';
}

// 여행 중 이동(오가는 길)에 적은 말로 국경 넘는 이동인지·방향 짐작
const SZ = ['선전', '심천', '深圳', '푸톈', '福田', '뤄후', '罗湖', '羅湖', '황강', '皇岗', '셔커우', '蛇口', '난산', '南山', '룽강', '龙岗', '바오안', '宝安', '화창베이', '华强北', '광저우', '广州'];
const BX = ['국경', '출입국', '검문소', '口岸', '록마차우', '落馬洲', '로우역', '스폭', '선전베이'];
const has = (t, words) => words.some(w => t.includes(w));
export function moveCross(from, to, note){
  const f = String(from || ''), t = String(to || ''), all = `${f} ${t} ${String(note || '')}`;
  if(!has(all, SZ) && !has(all, BX)) return null;
  return { dir:has(t, SZ) && !has(f, SZ) ? 'out' : has(f, SZ) && !has(t, SZ) ? 'in' : '' };
}

// 화면에 보여 줄 줄: 선전 오가는 곳(main)과 그 밖으로 나눔. prefer(검문소 코드)는 맨 앞
export function borderRows(res, prefer){
  const cps = res && res.ok ? res.cps.slice() : [];
  if(prefer){ const i = cps.findIndex(x => x.code === prefer); if(i > 0) cps.unshift(cps.splice(i, 1)[0]); }
  const isMain = x => !!(CPS[x.code] && CPS[x.code].main);
  return { main:cps.filter(isMain), more:cps.filter(x => !isMain(x)) };
}

// 방향 이름 (자료는 홍콩 쪽 심사 줄만)
export const DIR_KO = { dep:'홍콩에서 나감 (선전 가는 길)', arr:'홍콩으로 들어옴 (선전에서 오는 길)' };

export const BORDER_ERR = {
  none:'지금은 대기 시간 자료가 비어 있어요. 잠시 후 다시 눌러 주세요.',
  server:'국경 대기 시간을 지금 못 받아요. 잠시 후 다시 눌러 주세요.',
  bad:'대기 시간 자료를 못 읽었어요. 잠시 후 다시 눌러 주세요.',
  net:'국경 대기 시간을 못 불러왔어요. 인터넷 연결을 확인하거나 아래 홍콩 보안국 페이지에서 보세요.'
};

// 통관 시간 '06:30~22:30' → 닫는 시각(분, 24:00 = 1440). 24시간·멈춤·모름이면 null
export function closeMin(cp){ const m = /~\s*(\d{1,2}):(\d{2})/.exec((CPS[cp] || {}).hours || ''); return m ? +m[1] * 60 + +m[2] : null; }
export const LATE_GAP = 60;   // 닫기 이만큼(분) 전부터 알림
// 국경을 넘는 어림 시각 when(분)이 검문소 닫는 시각에 가까우면 { cp(일정에서 지나는 곳, 모르면 ''), close, past, alt:[늦게까지 여는 주요 검문소] }
//   지나는 곳을 모르면 주요 검문소 중 가장 일찍 닫는 시각으로 봄
export function lateCross(when, borderKey){
  if(when == null || !Number.isFinite(when)) return null;
  const cp = cpOfBorder(borderKey); const main = Object.keys(CPS).filter(c => CPS[c].main);
  const close = cp ? closeMin(cp) : Math.min(...main.map(closeMin).filter(x => x != null));
  if(close == null || !Number.isFinite(close) || when < close - LATE_GAP) return null;
  const alt = main.filter(c => c !== cp && (CPS[c].hours === '24시간' || (closeMin(c) != null && closeMin(c) >= when + LATE_GAP)));   // 닫기까지 1시간 넘게 남은 곳만 권함
  return { cp, close, past:when >= close, alt };
}
