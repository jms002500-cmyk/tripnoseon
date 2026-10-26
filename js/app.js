// 앱 진입점: 상태 저장/불러오기, 화면 그리기, 이벤트 처리
import { AREAS, STEPS, DEFAULT } from './data.js';
import { clone, buildDays, fullAssign, autoPickIds, allPlaces } from './logic.js';
import { VIEWS } from './views.js';
import { parseImport, toRow, rowToPlace, coordsFromUrl, nearTokyo, nearestArea } from './gimport.js';
import { geocode } from './geocode.js';

const S_KEY = 'tripnoseon-v1';
let state = load();
let resetArmed = false; let resetTimer = null;

function load(){
  try{ const raw = localStorage.getItem(S_KEY); if(raw) return Object.assign(clone(DEFAULT), JSON.parse(raw), { geoBusy:false }); }catch(e){}
  return clone(DEFAULT);
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
}

function unpick(s, id){ delete s.picked[id]; delete s.must[id]; delete s.assign[id]; delete s.fullDay[id]; }

// 구글 지도 가져오기: 대기 목록에 올리고, 좌표 없는 곳은 바로 이름으로 위치 찾기 시작
function addImports(list){
  const s = state; const base = Date.now().toString(36);
  const have = new Set(allPlaces(s).flatMap(p => [p.name, p.ja]).concat(s.imports.map(r => r.name)).filter(Boolean).map(n => n.toLowerCase()));
  list.forEach((x, i) => { const r = toRow(x, `i${base}${i}`); if(have.has(r.name.toLowerCase())){ r.dup = true; r.skip = true; } s.imports.push(r); });
  save(); render(); findLocations();
}

async function findLocations(){
  const s = state; if(s.geoBusy) return;
  s.geoBusy = true; s.geoErr = false; render();
  for(;;){
    const r = s.imports.find(x => x.st === 'need' && !x.skip); if(!r) break;
    try{
      const hit = await geocode(r.name);
      if(hit){ Object.assign(r, { lat:hit.lat, lng:hit.lng, label:hit.label, st:'ok', src:'geo' }); if(!r.area) r.area = nearestArea(hit).key; }
      else r.st = 'fail';
    }catch(e){ s.geoErr = true; break; }
    if(state !== s) return;   // 그사이 '처음부터'를 눌렀으면 그만
    save(); render();
  }
  s.geoBusy = false; save(); render();
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
      resetArmed = false; clearTimeout(resetTimer); state = clone(DEFAULT); scroll = true; break;
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
