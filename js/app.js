// 앱 진입점: 상태 저장/불러오기, 화면 그리기, 이벤트 처리
import { AREAS, STEPS, DEFAULT } from './data.js';
import { clone, buildDays, fullAssign, autoPickIds, allPlaces } from './logic.js';
import { VIEWS } from './views.js';
import { parseImport, toRow, rowToPlace, coordsFromUrl, nearTokyo, nearestArea, safeMapUrl, safeHttpsUrl } from './gimport.js';
import { geocode } from './geocode.js';
import { vacantSearch, partyNote } from './rakuten.js';
import { loadWeather, tripMonthDays, canForecast, ymd } from './weather.js';

const S_KEY = 'tripnoseon-v1';
const RK_KEY = 'tripnoseon-rakuten';   // 라쿠텐 키는 일정 상태와 따로 저장 (상태를 내보내거나 백업해도 키는 안 섞이게)
let state = load();
state.rkOn = !!rkKeys();
let resetArmed = false; let resetTimer = null;

function load(){
  try{ const raw = localStorage.getItem(S_KEY); if(raw) return Object.assign(clone(DEFAULT), JSON.parse(raw), { geoBusy:false, hotelBusy:false, rkBusy:false, wxBusy:false }); }catch(e){}
  return clone(DEFAULT);
}
function rkKeys(){ try{ const k = JSON.parse(localStorage.getItem(RK_KEY) || 'null'); return k && k.appId && k.key ? k : null; }catch(e){ return null; } }
function stamp(){ const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; }

// 고른 동네 중심에서 반경 3km 빈방 검색
async function rkSearch(areaKey){
  const s = state; const keys = rkKeys(); if(!keys || s.rkBusy || !AREAS[areaKey]) return;
  s.rkBusy = true; render();
  const res = await vacantSearch(keys, s, { pt:AREAS[areaKey] });
  if(state !== s) return;
  s.rkBusy = false;
  s.rk = { area:areaKey, start:s.start, end:s.end, party:partyNote(s), at:stamp(), items:res.items || [],
    msg: res.error || res.text || (res.items && !res.items.length ? '선택한 날짜·인원으로 이 주변에 빈방이 없어요.' : '') };
  save(); render();
}

// 담아 둔 라쿠텐 후보들의 가격을 지금 날짜·인원으로 다시 확인 (한 번에 15곳까지)
async function rkRefresh(){
  const s = state; const keys = rkKeys(); if(!keys || s.rkBusy) return;
  const targets = s.hotels.filter(h => h.hotelNo); if(!targets.length) return;
  s.rkBusy = true; render();
  const res = await vacantSearch(keys, s, { hotelNos:targets.map(h => h.hotelNo) });
  if(state !== s) return;
  s.rkBusy = false;
  if(res.error) s.hotelMsg = res.error;
  else {
    const by = new Map((res.items || []).map(it => [it.hotelNo, it])); const at = stamp();
    targets.slice(0, 15).forEach(h => { const it = by.get(h.hotelNo);
      if(it){ if(s.hotelCur === 'JPY') h.price = it.price; h.priceAt = at; h.soldOut = false; } else { h.soldOut = true; h.priceAt = at; } });
    s.hotelMsg = targets.length > 15 ? '라쿠텐 후보는 한 번에 15곳까지만 확인해요.' : '';
  }
  save(); render();
}

function rkAdd(hotelNo){
  const s = state; const it = s.rk && s.rk.items.find(x => x.hotelNo === hotelNo);
  if(!it || s.hotels.some(h => h.hotelNo === hotelNo)) return;
  // 라쿠텐 요금은 엔화. 이미 원화로 가격을 넣어 둔 후보가 있으면 통화를 바꾸지 않고 메모에 남김
  const wonInUse = s.hotelCur === 'KRW' && s.hotels.some(h => h.price > 0);
  if(!wonInUse) s.hotelCur = 'JPY';
  const has = it.lat != null && nearTokyo(it);
  const memo = [it.station ? `${it.station}역` : '', it.breakfast ? '조식 포함 플랜' : '', wonInUse ? `라쿠텐 1박 ¥${it.price.toLocaleString('ko-KR')}` : ''].filter(Boolean).join(', ');
  s.hotels.push({ id:'h' + Date.now().toString(36), name:it.name, price:wonInUse ? 0 : it.price, mapUrl:'', bookUrl:safeHttpsUrl(it.url), memo,
    lat:has ? it.lat : null, lng:has ? it.lng : null, area:has ? nearestArea(it).key : '', st:has ? 'ok' : 'need', src:'rakuten', approx:false, label:'',
    hotelNo:it.hotelNo, priceAt:s.rk.at, soldOut:false });
  s.hotelMsg = wonInUse ? '가격 통화가 원이라 라쿠텐 엔화 요금은 메모에 넣었어요.' : '';
  if(!has) findHotelLocations();
}

// 여행지 단계에서 날짜가 있으면 날씨를 불러옴. 날짜가 바뀌었거나 예보가 하루 지났으면 다시
function ensureWeather(force){
  const s = state; if(s.step !== 1 || !s.start || !s.end || s.wxBusy) return;
  const key = `${s.city}|${tripMonthDays(s.start, s.end).join(',')}`;
  const today = ymd(new Date());
  const stale = !s.wx || s.wx.key !== key || (canForecast(s.start, new Date()) && s.wx.forecastAt !== today) || (s.wx.error && force);
  if(!stale) return;
  s.wxBusy = true;
  loadWeather(s.city, s.start, s.end).then(w => { if(state !== s) return; s.wxBusy = false; s.wx = w; save(); render(); });
}

function save(){ try{ localStorage.setItem(S_KEY, JSON.stringify(state)); }catch(e){} }

function render(){
  const s = state;
  document.getElementById('line').innerHTML =
    `<span class="fill" style="width:${(s.step / (STEPS.length-1)) * 83.4}%"></span>` +
    STEPS.map((l, i) => `<li class="stn${i < s.step ? ' done' : ''}${i === s.step ? ' now' : ''}"><button type="button" data-act="go" data-v="${i}"${i === s.step ? ' aria-current="step"' : ''}><span class="dot"></span><span class="lbl">${l}</span></button></li>`).join('');
  document.getElementById('view').innerHTML = VIEWS[s.step](s);
  document.getElementById('bar').innerHTML = s.step < STEPS.length-1
    ? `<button type="button" class="ghost" data-act="prev"${s.step === 0 ? ' disabled' : ''}>이전</button><button type="button" class="primary" data-act="next">다음 · ${STEPS[s.step+1]}</button>`
    : `<button type="button" class="ghost" data-act="prev">이전</button><button type="button" class="primary" data-act="replan">손댄 것 지우고 다시 짜기</button>`;
  const rb = document.getElementById('resetBtn');
  rb.textContent = resetArmed ? '한 번 더 누르면 지워져요' : '처음부터';
  rb.classList.toggle('armed', resetArmed);
  ensureWeather(false);
}

function unpick(s, id){ delete s.picked[id]; delete s.must[id]; delete s.assign[id]; delete s.fullDay[id]; }

// 구글 지도 가져오기: 대기 목록에 올리고, 좌표 없는 곳은 바로 이름으로 위치 찾기 시작
function addImports(list){
  const s = state; const base = Date.now().toString(36);
  const have = new Set(allPlaces(s).flatMap(p => [p.name, p.ja]).concat(s.imports.map(r => r.name)).filter(Boolean).map(n => n.toLowerCase()));
  list.forEach((x, i) => { const r = toRow(x, `i${base}${i}`); if(have.has(r.name.toLowerCase())){ r.dup = true; r.skip = true; } s.imports.push(r); });
  save(); render(); findLocations();
}

// 위치가 없는 항목(st:'need')을 하나씩 이름으로 찾기. 가져온 장소와 숙소 후보가 같이 씀
//   listKey: 'imports' | 'hotels', busy/err: 상태에 진행 중·오류 표시를 남길 키
async function locate(listKey, busy, err){
  const s = state; if(s[busy]) return;
  s[busy] = true; s[err] = false; render();
  for(;;){
    const r = s[listKey].find(x => x.st === 'need' && !x.skip); if(!r) break;
    try{
      const hit = await geocode(r.name);
      if(state !== s) return;   // 그사이 '처음부터'를 눌렀으면 그만
      if(!s[listKey].includes(r)) continue;   // 그사이 지웠으면 다음으로
      if(hit){ Object.assign(r, { lat:hit.lat, lng:hit.lng, label:hit.label, st:'ok', src:'geo' }); if(!r.area) r.area = nearestArea(hit).key; }
      else r.st = 'fail';
    }catch(e){ s[err] = true; break; }
    save(); render();
  }
  s[busy] = false; save(); render();
}
const findLocations = () => locate('imports', 'geoBusy', 'geoErr');
const findHotelLocations = () => locate('hotels', 'hotelBusy', 'hotelErr');

// 동네만 고른 곳: 그 동네 중심 근처에 흩뿌려 대략 위치로 둠 (같은 동네끼리 겹치지 않게)
function roughPoint(area, n){ const a = AREAS[area]; const ang = n * 2.4, r = 0.004; return { lat:a.lat + Math.sin(ang)*r, lng:a.lng + Math.cos(ang)*r }; }

function hotelOfId(id){ return state.hotels.find(h => h.id === id); }

// 숙소 후보 담기: 구글 지도 주소에 좌표가 있으면 그 위치, 없으면 이름으로 찾기
function addHotel(){
  const s = state; const val = id => document.getElementById(id).value.trim();
  const name = val('hname'); if(!name) return;
  const mapRaw = val('hmap'), bookRaw = val('hbook');
  const pt = coordsFromUrl(mapRaw); const has = pt && nearTokyo(pt);
  const msgs = [];
  if(mapRaw && !has) msgs.push('구글 지도 주소에서 위치를 못 읽어서 이름으로 찾을게요.');
  if(bookRaw && !safeHttpsUrl(bookRaw)) msgs.push('예약 페이지 주소는 https:// 로 시작하는 주소만 저장해요.');
  s.hotelMsg = msgs.join(' ');
  s.hotels.push({ id:'h' + Date.now().toString(36), name:name.slice(0, 60), price:Math.max(0, Math.round(+val('hprice') || 0)),
    mapUrl:safeMapUrl(mapRaw), bookUrl:safeHttpsUrl(bookRaw), memo:val('hmemo').slice(0, 80),
    lat:has ? pt.lat : null, lng:has ? pt.lng : null, area:has ? nearestArea(pt).key : '', st:has ? 'ok' : 'need', src:has ? 'link' : '', approx:false, label:'' });
  save(); render();
  if(!has) findHotelLocations();
}

function importRowOf(k){ return state.imports.find(r => r.k === k); }

function act(a, v){
  const s = state; let scroll = false;
  switch(a){
    case 'go': s.step = +v; scroll = true; break;
    case 'prev': s.step = Math.max(0, s.step-1); scroll = true; break;
    case 'next': s.step = Math.min(STEPS.length-1, s.step+1); scroll = true; break;
    case 'who': s.who = v; if(v === 'solo') s.adults = 1; else if(v === 'couple') s.adults = 2; break;
    case 'adults': s.adults = Math.min(10, Math.max(1, s.adults + (+v))); break;
    case 'kidadd': if(s.kids.length < 5) s.kids.push(8); break;
    case 'kiddel': s.kids.splice(+v, 1); break;
    case 'style': s.styles = s.styles.includes(v) ? s.styles.filter(x => x !== v) : s.styles.concat(v); break;
    case 'pace': s.pace = v; break;
    case 'country': s.country = v; break;
    case 'city': s.city = v; break;
    case 'anchor': if(s.must[v]) unpick(s, v); else { s.must[v] = true; s.picked[v] = true; } break;
    case 'pick': if(s.picked[v]) unpick(s, v); else s.picked[v] = true; break;
    case 'must': if(s.must[v]) delete s.must[v]; else { s.must[v] = true; s.picked[v] = true; } break;
    case 'filter': s.areaFilter = v; break;
    case 'autopick': autoPickIds(s).forEach(id => { s.picked[id] = true; }); break;
    case 'customdel': s.custom = s.custom.filter(c => c.id !== v); unpick(s, v); break;
    case 'hotel': s.hotelArea = s.hotelArea === v ? null : v; break;
    case 'replan': s.assign = {}; break;
    case 'impfind': findLocations(); return;
    case 'hfind': findHotelLocations(); return;
    case 'wxretry': ensureWeather(true); return;
    case 'hpick': s.hotelPick = s.hotelPick === v ? null : v; break;
    case 'hdel': s.hotels = s.hotels.filter(h => h.id !== v); if(s.hotelPick === v) s.hotelPick = null; break;
    case 'hsort': s.hotelSort = v; break;
    case 'rksearch': rkSearch(v); return;
    case 'rkrefresh': rkRefresh(); return;
    case 'rkadd': rkAdd(v); break;
    case 'rkforget': try{ localStorage.removeItem(RK_KEY); }catch(e){} s.rkOn = false; s.rk = null; break;
    case 'impclear': s.imports = []; s.geoErr = false; s.impMsg = ''; break;
    case 'impskip': { const r = importRowOf(v); if(r) r.skip = !r.skip; break; }
    case 'impadd': {
      const base = Date.now().toString(36);
      const ready = s.imports.filter(r => !r.skip && (r.lat != null || r.area));
      ready.forEach((r, i) => { const id = `g${base}${i}`; s.custom.push(rowToPlace(r, id, s.custom.length + 1)); s.picked[id] = true; });
      s.imports = s.imports.filter(r => !r.skip && !ready.includes(r));
      break;
    }
    case 'reset':
      if(!resetArmed){ resetArmed = true; clearTimeout(resetTimer); resetTimer = setTimeout(() => { resetArmed = false; render(); }, 4000); render(); return; }
      resetArmed = false; clearTimeout(resetTimer); state = clone(DEFAULT); state.rkOn = !!rkKeys(); scroll = true; break;
  }
  save(); render(); if(scroll) window.scrollTo({ top:0 });
}

function onChange(e){
  const t = e.target; const s = state;
  if(t.dataset.kid != null){ s.kids[+t.dataset.kid] = Math.min(17, Math.max(0, parseInt(t.value, 10) || 0)); }
  else if(t.dataset.date){ if(!t.value) return; s[t.dataset.date] = t.value; s.fullDay = {}; s.assign = {}; }
  else if(t.dataset.full){
    // 다른 '하루 종일' 장소와 날짜가 겹치면 서로 맞바꿈
    const id = t.dataset.full; const nv = +t.value; const fa = fullAssign(s, buildDays(s)); const prev = fa[id];
    Object.keys(fa).forEach(k => { if(k !== id && fa[k] === nv) s.fullDay[k] = prev; });
    s.fullDay[id] = nv;
  }
  else if(t.dataset.move){ const id = t.dataset.move; if(t.value === '') delete s.assign[id]; else s.assign[id] = +t.value; }
  else if(t.dataset.import != null){
    const f = t.files && t.files[0]; if(!f) return;
    f.text().then(txt => {
      const list = parseImport(txt, f.name);
      if(list.length){ state.impMsg = ''; addImports(list); }
      else { state.impMsg = '이 파일에서 장소를 찾지 못했어요. 구글 테이크아웃의 CSV나 JSON 파일인지 확인해 주세요.'; render(); }
    });
    t.value = ''; return;
  }
  else if(t.dataset.hcur != null){ s.hotelCur = t.value; }
  else if(t.dataset.harea != null){
    const h = hotelOfId(t.dataset.harea); if(!h || !t.value) return;
    Object.assign(h, roughPoint(t.value, s.hotels.indexOf(h) + 1), { area:t.value, st:'ok', src:'area', approx:true });
  }
  else if(t.dataset.hlink != null){
    const h = hotelOfId(t.dataset.hlink); const pt = coordsFromUrl(t.value); if(!h) return;
    if(pt && nearTokyo(pt)){ s.hotelMsg = ''; Object.assign(h, pt, { mapUrl:safeMapUrl(t.value), area:nearestArea(pt).key, st:'ok', src:'link', approx:false }); }
    else { s.hotelMsg = `'${h.name}' 주소에서 위치를 못 읽었어요. 구글 지도에서 숙소를 연 뒤 주소창의 긴 주소를 통째로 복사해 주세요.`; render(); return; }
  }
  else if(t.dataset.imparea != null){ const r = importRowOf(t.dataset.imparea); if(r) r.area = t.value; }
  else if(t.dataset.imphours != null){ const r = importRowOf(t.dataset.imphours); if(r) r.hours = +t.value; }
  else if(t.dataset.implink != null){
    const r = importRowOf(t.dataset.implink); const pt = coordsFromUrl(t.value);
    if(!r) return;
    if(pt && nearTokyo(pt)){ s.impMsg = ''; Object.assign(r, { lat:pt.lat, lng:pt.lng, st:'ok', src:'link', area:nearestArea(pt).key }); }
    else { s.impMsg = `'${r.name}' 주소에서 위치를 못 읽었어요. 구글 지도에서 장소를 연 뒤 주소창의 긴 주소를 통째로 복사해 주세요.`; render(); return; }
  }
  else return;
  save(); render();
}

function onSubmit(e){
  if(e.target.id === 'pasteform'){
    e.preventDefault();
    const list = parseImport(document.getElementById('gpaste').value, '');
    if(list.length) addImports(list);
    return;
  }
  if(e.target.id === 'hotelform'){ e.preventDefault(); addHotel(); return; }
  if(e.target.id === 'rkform'){
    e.preventDefault();
    const appId = document.getElementById('rkapp').value.trim(), key = document.getElementById('rkkey').value.trim();
    if(!appId || !key) return;
    try{ localStorage.setItem(RK_KEY, JSON.stringify({ appId, key })); }catch(e){ return; }
    state.rkOn = true; save(); render(); return;
  }
  if(e.target.id !== 'customform') return;
  e.preventDefault();
  const s = state; const name = document.getElementById('cname').value.trim(); if(!name) return;
  const area = document.getElementById('carea').value; const hours = +document.getElementById('chours').value; const a = AREAS[area];
  const n = s.custom.length + 1; const ang = n * 2.4, r = 0.004;   // 같은 동네에 겹치지 않게 살짝 흩뿌림
  const id = 'c' + Date.now().toString(36);
  s.custom.push({ id, name, ja:'', area, lat:a.lat + Math.sin(ang)*r, lng:a.lng + Math.cos(ang)*r, hours, tags:[], kid:'all', custom:true });
  s.picked[id] = true; save(); render();
}

document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if(!b || b.disabled) return; act(b.dataset.act, b.dataset.v); });
document.addEventListener('change', onChange);
document.addEventListener('submit', onSubmit);
render();

// 오프라인 사용(홈 화면 앱). localhost 개발 중에는 캐시 때문에 헷갈리지 않게 등록하지 않음
if('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)){
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
