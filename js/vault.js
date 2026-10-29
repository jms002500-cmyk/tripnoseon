// 예약 보관함: 항공권·숙소·입장권·교통·입국 QR·보험 예약을 한곳에. 순수 함수(테스트 대상).
// 예약번호·여권·QR은 민감한 정보라 보관함은 그 기기에만 둠 — 함께 짜기(SHARED_KEYS)에 넣지 않음.
// 첨부 파일(사진·PDF)은 vaultdb.js가 IndexedDB에 저장 (인터넷 없이 열림).
import { allPlaces, pickedPlaces } from './logic.js';

export const VAULT_KINDS = [
  { key:'flight', label:'항공권', icon:'✈️' },
  { key:'hotel', label:'숙소', icon:'🏨' },
  { key:'ticket', label:'입장권·예약', icon:'🎟️' },
  { key:'transport', label:'교통', icon:'🚆' },
  { key:'entry', label:'입국 (Visit Japan Web 등)', icon:'🛂' },
  { key:'insurance', label:'여행자 보험', icon:'🛡️' },
  { key:'etc', label:'기타', icon:'📎' }
];
export const kindOf = k => VAULT_KINDS.find(x => x.key === k) || VAULT_KINDS[VAULT_KINDS.length - 1];

// 가계부 영수증 사진도 보관함 항목으로 둠(kind 'receipt', spendId: 지출 id) → 첨부 저장·크게 보기·백업을 그대로 씀.
// 이 기기에만(보관함과 같음). 보관함 목록·예약 제안·오늘 꺼낼 예약에는 안 보임
export const isReceipt = it => !!it && it.kind === 'receipt';
export const bookings = vault => (vault || []).filter(it => !isReceipt(it));
export const receiptOf = (vault, spendId) => (vault || []).find(it => isReceipt(it) && it.spendId === spendId) || null;
export function newReceipt(spendId, e, id){
  return { id, kind:'receipt', spendId, title:`영수증 · ${(e && e.what) || ''}`.trim().slice(0, 60), date:e && /^\d{4}-\d{2}-\d{2}$/.test(e.d) ? e.d : '',
    time:'', code:'', link:'', memo:'', placeId:(e && e.pl) || null, files:[] };
}

// 날짜·시간순, 날짜 없는 것은 맨 뒤(종류 순서대로)
export function sortVault(items){
  const ord = k => VAULT_KINDS.findIndex(x => x.key === k);
  return (items || []).slice().sort((a, b) =>
    (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date || '').localeCompare(String(b.date || '')) ||
    String(a.time || '99:99').localeCompare(String(b.time || '99:99')) || ord(a.kind) - ord(b.kind));
}

// 날짜별로 묶기: [{ date:'2027-03-07' | '', items:[...] }]
export function groupVault(items){
  const out = [];
  sortVault(items).forEach(it => { const d = it.date || ''; const g = out.find(x => x.date === d); if(g) g.items.push(it); else out.push({ date:d, items:[it] }); });
  return out;
}

// 아직 보관함에 없는 예약 제안: 항공권·입국 QR, 정한 숙소, 담은 곳 중 예약이 필요한 곳
export function missingBookings(s, items){
  const v = items || [];
  const has = k => v.some(x => x.kind === k);
  const linked = new Set(v.map(x => x.placeId).filter(Boolean));
  const out = [];
  if(!has('flight')) out.push({ kind:'flight', title:'왕복 항공권', why:'탑승권·예약번호를 넣어 두면 공항에서 바로 꺼내 볼 수 있어요.' });
  const h = (s.hotels || []).find(x => x.id === s.hotelPick);
  if(!has('hotel')) out.push({ kind:'hotel', title:h ? h.name : '숙소', date:s.start || '', why:h ? '정한 숙소의 예약 확인서를 넣어 두세요.' : '숙소 예약 확인서를 넣어 두세요.' });
  pickedPlaces(s).filter(p => p.book && !linked.has(p.id)).forEach(p =>
    out.push({ kind:'ticket', title:`${p.name} ${p.full ? '입장권' : '예약'}`, placeId:p.id, why:p.note || '날짜·시간 지정 예약이 필요한 곳이에요.' }));
  if(!has('entry')) out.push({ kind:'entry', title:'Visit Japan Web 입국 QR', why:'입국 심사·세관 QR이에요. 가족 각자 화면을 캡처해 넣어 두면 줄 서서 바로 보여 줄 수 있어요.' });
  return out;
}

// 보관함 항목에 연결된 장소 이름
export function placeName(s, placeId){ const p = allPlaces(s).find(x => x.id === placeId); return p ? p.name : ''; }

// 사진 줄이기 크기: 긴 쪽이 max를 넘으면 비율대로 줄임
export function fitSize(w, h, max){
  if(!(w > 0 && h > 0)) return { w:0, h:0 };
  const k = Math.min(1, max / Math.max(w, h));
  return { w:Math.round(w * k), h:Math.round(h * k) };
}

export function sizeText(bytes){
  if(!(bytes > 0)) return '0KB';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
