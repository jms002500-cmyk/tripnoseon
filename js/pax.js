// 인원별 티켓 (2026-11-09, 사용자 요청: 여행 인원에 맞게 티켓을 넣게): 같이 가는 사람마다 티켓·QR·탑승권·번호를 따로.
//   보관함 항목에 it.pcode { 사람 키: 번호 }, 첨부마다 f.who(사람 키). 사람 키는 가계부 참여자(이름을 정했고 인원과 수가 같을 때)
//   또는 동행 인원(어른 a1·a2…, 아이 k1…). 보관함은 이 기기에만이라 이것도 이 기기에만. 순수 함수(테스트 대상)
export const PAX_KINDS = ['flight', 'ticket', 'transport', 'entry', 'insurance', 'etc'];   // 숙소 확인서는 한 장이라 뺌

// 같이 가는 사람 [{ key, name }]
export function travellers(s){
  const st = s || {}; const kids = Array.isArray(st.kids) ? st.kids : [];
  const adults = Math.max(1, Math.round(+st.adults) || (st.who === 'solo' ? 1 : 2));
  const party = (Array.isArray(st.party) ? st.party : []).filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim());
  if(party.length >= 2 && party.length === adults + kids.length) return party.map(p => ({ key:'p:' + p.id, name:p.name.trim().slice(0, 20) }));
  const L = [];
  for(let i = 1; i <= adults; i++) L.push({ key:'a' + i, name:adults === 1 ? '어른' : `어른 ${i}` });
  kids.forEach((age, i) => L.push({ key:'k' + (i + 1), name:`아이${kids.length > 1 ? ` ${i + 1}` : ''}${Number.isFinite(+age) && age !== '' ? ` (${+age}살)` : ''}` }));
  return L;
}

// 항목 하나를 사람별로: { list:[{ key, name, code, files }], common:[사람 안 정한 첨부], used, missing:[아직 없는 사람 이름] }
export function paxOf(s, it){
  const T = travellers(s); const keys = new Set(T.map(t => t.key)); const files = (it && it.files) || []; const pc = (it && it.pcode) || {};
  const list = T.map(t => ({ key:t.key, name:t.name, code:typeof pc[t.key] === 'string' ? pc[t.key] : '', files:files.filter(f => f && f.who === t.key) }));
  const common = files.filter(f => f && !(f.who && keys.has(f.who)));
  const used = list.some(x => x.code || x.files.length);
  return { list, common, used, missing:used ? list.filter(x => !x.code && !x.files.length).map(x => x.name) : [] };
}

// 백업 파일에서 온 모양 바로잡기
export function cleanPax(it){
  if(!it || typeof it !== 'object') return it;
  if(it.pcode !== undefined){
    const o = {}; if(it.pcode && typeof it.pcode === 'object' && !Array.isArray(it.pcode))
      Object.keys(it.pcode).forEach(k => { const v = it.pcode[k]; if(k !== '__proto__' && k.length <= 40 && typeof v === 'string' && v.trim()) o[k] = v.trim().slice(0, 40); });
    if(Object.keys(o).length) it.pcode = o; else delete it.pcode;
  }
  (it.files || []).forEach(f => { if(f && f.who !== undefined && !(typeof f.who === 'string' && f.who.length <= 40)) delete f.who; });
  return it;
}
