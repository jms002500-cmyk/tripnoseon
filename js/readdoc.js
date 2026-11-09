// 예약 확인서 읽어서 보관함 칸 채우기 (2026-11-09, 사용자 요청: 비행기 예매 파일을 넣으면 내용을 정리해 주게)
//   AI 키가 있으면 그 폰에서 구글에 바로 묻고(js/askai.js와 같은 길), 없으면 확인서와 부탁 문장을 사용자의 AI 앱으로 보내고
//   답을 붙여 넣음. 받은 칸 → 보관함 입력 초안(vdraft). 비행기가 여러 편이면 한 편씩 차례로. 순수 함수(테스트 대상)
//   보내는 것은 사용자가 고른 확인서 한 장과 아래 문장뿐 — 보관함의 다른 예약은 보내지 않음
import { AIRPORTS } from './flight.js';
import { travellers } from './pax.js';

const STR = { type:'STRING' }, NUM = { type:'NUMBER' };
export const READ_SCHEMA = { type:'OBJECT', properties:{
  kind:{ type:'STRING', enum:['flight', 'hotel', 'ticket', 'transport', 'insurance', 'etc'] },
  items:{ type:'ARRAY', items:{ type:'OBJECT', properties:{
    title:STR, date:STR, time:STR, date2:STR, time2:STR, fno:STR, from:STR, to:STR, code:STR, addr:STR, tel:STR, amount:NUM, currency:STR,
    passengers:{ type:'ARRAY', items:{ type:'OBJECT', properties:{ name:STR, ticket:STR, seat:STR } } } } } },
  unclear:STR }, required:['kind', 'items'] };

export function readPrompt(s){
  return ['여행 예약 확인서(항공권 e-티켓·숙소 바우처·입장권·교통 예약 등)야. 내용을 아래 칸으로 정리해 줘.',
    'kind: flight(항공권) hotel(숙소) ticket(입장권·투어·식당 예약) transport(기차·배·버스·공항 픽업 차량) insurance(보험) etc 중 하나.',
    'items: 예약 하나(비행기는 한 편)마다 한 칸. 비행기가 가는 편·오는 편 두 편이면 두 칸, 출발 순서대로.',
    '- 비행기: date 출발 날짜, time 출발 시각, time2 도착 시각, fno 편명(예: CX411), from·to 출발·도착 공항 IATA 코드 세 글자, title 항공사 이름.',
    '- 숙소: title 숙소 이름, date 체크인 날짜, date2 체크아웃 날짜, time·time2 체크인·체크아웃 시각, addr 현지어(한자·현지 글자) 주소, tel 전화.',
    '- 그 밖: title 예약 이름(상품·장소), date·time 이용 날짜·시각.',
    'code: 예약번호(PNR·확인 번호). amount·currency: 결제 총액과 통화 코드(KRW·HKD·CNY·JPY·USD 등).',
    'passengers: 탑승객·이용자마다 name(확인서 그대로), ticket(그 사람의 티켓·e-티켓 번호), seat(좌석).',
    '날짜는 YYYY-MM-DD, 시각은 24시간 HH:MM(현지 시각 그대로).',
    '확인서에 없거나 확실하지 않은 칸은 지어내지 말고 비워 두고, 애매한 것은 unclear에 한국어로 적어 줘.'].join('\n');
}
// AI 앱으로 보낼 때(키가 없을 때): 같은 내용 + 답 모양
export const readAppPrompt = s => `${readPrompt(s)}\n답은 설명 없이 JSON 한 덩어리로만 줘. 모양: {"kind":"flight","items":[{"title":"","date":"","time":"","time2":"","fno":"","from":"","to":"","code":"","amount":0,"currency":"","passengers":[{"name":"","ticket":"","seat":""}]}],"unclear":""}`;

// 받은 글 → 칸 자료 (```json 감싸기·앞뒤 설명이 붙어도 첫 { ~ 마지막 } 을 읽음). 못 읽으면 null
export function readParse(t){
  const x = String(t || ''); const a = x.indexOf('{'), b = x.lastIndexOf('}'); if(a < 0 || b <= a) return null;
  try{ const j = JSON.parse(x.slice(a, b + 1)); return j && typeof j === 'object' && Array.isArray(j.items) && j.items.length ? j : null; }catch(e){ return null; }
}

const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const day = v => /^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : '';
const hm = v => { const m = /^(\d{1,2}):(\d{2})/.exec(str(v, 8)); return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
const iata = v => /^[A-Za-z]{3}$/.test(str(v, 3)) && str(v, 4).length === 3 ? str(v, 3).toUpperCase() : '';
const KINDS = ['flight', 'hotel', 'ticket', 'transport', 'insurance', 'etc'];

// 확인서 여러 장(가족 표를 따로 받았거나 한 사람이 일행 표를 다 올림) → 칸 자료 하나. list: [{ j, k(파일 번호) }]
//   비행기는 편명+날짜가 같으면 한 예약으로 합치고 탑승객을 이어 붙임(같은 티켓·이름은 한 번만). 금액은 같은 통화면 더함.
//   각 칸에 _files(그 예약이 나온 파일 번호들), 각 탑승객에 _file(나온 파일) → readDrafts가 사람별 번호·파일 주인(rwho)으로
export function mergeReads(list){
  const L = (Array.isArray(list) ? list : []).filter(x => x && x.j && Array.isArray(x.j.items) && x.j.items.length);
  if(!L.length) return null;
  const kind = (L.find(x => x.j.kind === 'flight') || L[0]).j.kind;
  const out = [], unclear = [];
  L.forEach(({ j, k }) => {
    if(str(j.unclear, 200)) unclear.push(str(j.unclear, 200));
    j.items.filter(x => x && typeof x === 'object').forEach(x0 => {
      const x = Object.assign({}, x0, { passengers:(Array.isArray(x0.passengers) ? x0.passengers : []).filter(p => p && typeof p === 'object').map(p => Object.assign({}, p, { _file:k })) });
      const fno = str(x.fno, 10).replace(/\s+/g, '').toUpperCase(), code = str(x.code, 40);
      const same = out.find(y => (j.kind === 'flight' && fno && y._fno === fno && (!day(y.date) || !day(x.date) || day(y.date) === day(x.date)))
        || (j.kind !== 'flight' && code && str(y.code, 40) === code && j.kind === y._kind));
      if(!same){ out.push(Object.assign(x, { _fno:fno, _kind:j.kind, _files:[k] })); return; }
      if(!same._files.includes(k)) same._files.push(k);
      ['title', 'date', 'time', 'date2', 'time2', 'from', 'to', 'addr', 'tel', 'code', 'currency'].forEach(f => { if(!str(same[f], 200) && str(x[f], 200)) same[f] = x[f]; });
      if(code && str(same.code, 40) && code !== str(same.code, 40)){ same._codes = (same._codes || []).concat(code); }
      if(typeof x.amount === 'number' && x.amount > 0){
        if(!(typeof same.amount === 'number' && same.amount > 0)){ same.amount = x.amount; same.currency = x.currency; }
        else if(str(x.currency, 3).toUpperCase() === str(same.currency, 3).toUpperCase()) same.amount = Math.round((same.amount + x.amount) * 100) / 100;
      }
      x.passengers.forEach(p => { const t = str(p.ticket, 40), n = str(p.name, 40);
        if(!same.passengers.some(q => (t && str(q.ticket, 40) === t) || (!t && n && str(q.name, 40) === n))) same.passengers.push(p); });
    });
  });
  return { kind, items:out, unclear:[...new Set(unclear)].join(' · ') };
}

// 칸 자료 → 보관함 입력 초안 목록 [{ kind, title, date, … }]. s: 여행(지역 공항·통화·인원)
export function readDrafts(s, j){
  if(!j || !Array.isArray(j.items)) return [];
  const kind = KINDS.includes(j.kind) ? j.kind : 'etc'; const city = (s && s.city) || 'tokyo';
  const aps = (AIRPORTS[city] || []).map(a => a.code); const curs = ['KRW'].concat(city === 'hksz' ? ['HKD', 'CNY'] : ['JPY']);
  const T = travellers(s); const unclear = str(j.unclear, 200);
  return j.items.slice(0, 6).filter(x => x && typeof x === 'object').map(x => {
    const d = { kind, title:str(x.title, 60), date:day(x.date), time:hm(x.time), code:str(x.code, 40), files:[] };
    const memo = [];
    if(kind === 'flight'){
      const from = iata(x.from), to = iata(x.to); const fno = str(x.fno, 10).replace(/\s+/g, '').toUpperCase();
      d.dir = aps.includes(to) ? 'out' : aps.includes(from) ? 'back' : '';
      d.ap = d.dir === 'out' ? to : d.dir === 'back' ? from : '';
      d.time2 = hm(x.time2); d.fno = fno; if(from) d.from = from; if(to) d.to = to;
      d.title = `${d.dir === 'back' ? '오는 편' : d.dir === 'out' ? '가는 편' : '비행기'}${from && to ? ` ${from} → ${to}` : ''}${d.title ? ` · ${d.title}` : ''}`.slice(0, 60);
    } else if(kind === 'hotel'){
      d.date2 = day(x.date2); d.time2 = hm(x.time2); d.addr = str(x.addr, 120); d.tel = str(x.tel, 30);
    }
    const amt = typeof x.amount === 'number' && x.amount > 0 ? Math.round(x.amount * 100) / 100 : 0; const cur = str(x.currency, 3).toUpperCase();
    if(amt && curs.includes(cur)){ d.amt = amt; d.cur = cur; } else if(amt && cur) memo.push(`결제 ${amt} ${cur}`);
    const pax = (Array.isArray(x.passengers) ? x.passengers : []).filter(p => p && typeof p === 'object' && (str(p.name, 40) || str(p.ticket, 40)));
    if(pax.length){
      memo.push(`${kind === 'flight' ? '탑승객' : '이용자'}: ${pax.map(p => [str(p.name, 40), str(p.seat, 6) ? `좌석 ${str(p.seat, 6)}` : ''].filter(Boolean).join(' ')).join(', ')}`);
      const pc = {}; pax.slice(0, T.length).forEach((p, i) => { const t = str(p.ticket, 40) || str(p.seat, 6); if(t) pc[T[i].key] = t; });   // 확인서 순서대로 인원에 (다르면 고쳐 주세요)
      if(Object.keys(pc).length) d.pcode = pc;
      // 여러 장을 합쳤으면: 한 사람 표인 파일은 그 사람 것으로 (일정 서류 창에서 사람별로 보임)
      const per = {}; pax.slice(0, T.length).forEach((p, i) => { if(Number.isInteger(p._file)) (per[p._file] = per[p._file] || []).push(T[i].key); });
      const rwho = {}; Object.keys(per).forEach(f => { if(per[f].length === 1) rwho[f] = per[f][0]; }); if(Object.keys(rwho).length) d.rwho = rwho;
      if(pax.length < T.length) d.paxShort = T.length - Math.min(pax.length, T.length);   // 일행 중 이 표에 없는 사람 (따로 예약했거나 아직)
    }
    if(Array.isArray(x._codes) && x._codes.length) memo.push(`다른 예약번호: ${x._codes.map(c => str(c, 40)).join(', ')}`);
    if(unclear) memo.push(`확인 필요: ${unclear}`);
    if(Array.isArray(x._files)) d.rf = x._files.filter(Number.isInteger);
    if(memo.length) d.memo = memo.join(' · ').slice(0, 300);
    if(!d.title) d.title = kind === 'hotel' ? '숙소' : '예약';
    return d;
  });
}
