// 구글 지도에서 찾아 담기: 한국어 구글 지도를 화면 위 시트로 띄움 (Maps JavaScript API + Places API New).
//   검색: 치는 동안 장소 후보(자동 완성) → 고르면 장소 카드
//   지도의 장소 아이콘 누르기 → 장소 카드
//   장소 카드: 평점·영업시간·주소 + '몇 일차에 담기' → 바로 일정에. 담은 곳·숙소 후보는 핀으로
//   '🏨 숙소 후보로 담기'(onHotel): 숙박 종류면 먼저 보임. 숙소 동네 단계에서 열면(mode:'hotel') 숙소 담기만
//   추천 지도(v0.89.0): 위 '추천 장소 테마'·'가족 식당'을 고르면 앱 추천 장소·식당을 핀으로 모으고 아래에 목록,
//   카드·목록에 구글 평점(★·매긴 사람 수, js/grating.js — 이 기기에 25일)
// 구글 지도는 이 시트를 처음 열 때만 불러옴(앱 첫 화면을 가볍게, 혼자 계획만 하는 사람은 구글에 아무것도 안 보냄).
// app.js가 상태·날짜를 넘기고(getState, getDays), 담기·빼기는 콜백(onPick, onToggle)으로 돌려줌.
// 계산(종류·영업시간·같은 장소 찾기)은 gplace.js. #view 밖(body 끝)에 붙어서 다시 그려도 지도가 남음.
import { hrText } from './flight.js';
import { mapsConfig } from './maps-config.js';
import { REGION, EATS, AREAS } from './data.js';
import { esc } from './ui.js';
import { matchKnown, closedDays, pinList, dayOf, findInputs, pickMsg, isLodging, latLngOf } from './gplace.js';
import { withTimeout } from './net.js';
import { THEMES, themeOf, themeCounts } from './themes.js';
import { allPlaces, dist, NEAR_MAIN_KM } from './logic.js';
import { eatIcon, priceText, eatMapUrl, eatAmapUrl } from './eats.js';
import { lookupOf, nearEnough, rateText, byRating, grCache, grPut, grOf } from './grating.js';
import { safeMapUrl } from './gimport.js';

const FIELDS = ['id', 'displayName', 'location', 'formattedAddress', 'types', 'rating', 'userRatingCount', 'regularOpeningHours', 'googleMapsURI', 'primaryTypeDisplayName'];
const WD = ['일', '월', '화', '수', '목', '금', '토'];
let G = null, map = null, sheet = null, cb = null, pins = [], temp = null, token = null, typing = null, cur = null, loading = null, script = null;
// want: 마지막으로 띄우려는 장소 카드 차례(늦게 온 옛 응답·닫은 뒤 응답은 버림), sugN: 자동 완성 차례, kp: 지금 카드로 보는 앱 추천 장소
let want = 0, sugN = 0, kp = null;
let showRec = true;   // 안 담은 추천 장소도 지도에 (범례의 '추천도 보기')
let transit = null, showTransit = true;   // 지하철·대중교통 노선 겹쳐 보기 (범례의 '지하철 노선')
// 추천 지도 (v0.89.0): curTheme ''(그냥 담기) | 'all'(추천 전체) | 테마 키 — 고르면 아래에 목록·평점. showEats: 가족 식당 핀
let curTheme = '', showEats = false, lastPins = [], grBusy = false;
let focusPt = null;   // 일정의 '메인 근처 지도'로 열면 메인 좌표: 목록을 메인 2.5km 안·가까운 순으로 (v0.91.0)
const MAPS_WAIT = 20000;   // 구글 지도 스크립트·라이브러리를 기다리는 시간

// 구글 지도 불러오기 (키가 없거나 틀리면 실패)
export function loadMaps(){
  if(window.google && window.google.maps && window.google.maps.importLibrary) return Promise.resolve(window.google.maps);
  if(!mapsConfig.apiKey) return Promise.reject(new Error('nokey'));
  if(loading) return loading;
  loading = new Promise((ok, fail) => {
    // 느린 연결·구글이 막힌 곳(중국 본토)에서 '불러오는 중'에 멈추지 않게 시간 제한. 다시 누르면 다시 기다림
    const t = setTimeout(() => { loading = null; fail(new Error('load')); }, MAPS_WAIT);
    window.__tnMapsReady = () => { clearTimeout(t); ok(window.google.maps); };
    const onErr = () => { clearTimeout(t); loading = null; if(script){ script.remove(); script = null; } fail(new Error('load')); };
    if(script){ script.onerror = onErr; return; }   // 앞서 넣은 스크립트가 아직 오는 중이면 또 넣지 않음(구글 지도는 두 번 넣으면 오류)
    const p = new URLSearchParams({ key:mapsConfig.apiKey, v:'weekly', language:'ko', region:(REGION.gl || 'jp').toUpperCase(), loading:'async', callback:'__tnMapsReady' });
    script = document.createElement('script'); script.src = `https://maps.googleapis.com/maps/api/js?${p}`; script.async = true;
    script.onerror = onErr;
    document.head.appendChild(script);
  });
  return loading;
}
// 키가 틀렸거나 이 주소에서 쓸 수 없게 막혀 있으면 구글이 부름
window.gm_authFailure = () => { if(sheet) info('<p class="warnline">구글 지도 키를 쓸 수 없어요. 키의 웹사이트 제한에 이 주소가 들어 있는지, Maps JavaScript API·Places API (New)가 켜져 있는지 확인해 주세요.</p>'); };

function buildSheet(){
  sheet = document.createElement('div');
  sheet.className = 'mapsheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', '구글 지도에서 찾아 담기');
  sheet.innerHTML = `
    <div class="mshead"><b class="mstitle">구글 지도에서 담기</b><button type="button" class="ghost small" data-gm="close">닫기</button></div>
    <div class="mssearch"><input type="search" id="gmq" placeholder="장소 이름" aria-label="장소 이름 검색" maxlength="60" autocomplete="off"></div>
    <ul class="gmsug" hidden></ul>
    <div class="mslegend" aria-label="지도 표시">
      <span><i class="lg-must"></i>꼭 갈 곳</span><span><i class="lg-on"></i>담은 곳</span><span><i class="lg-rec"></i>안 담은 추천</span><span><i class="lg-hotel"></i>숙소 후보</span><span class="lgeat" hidden><i class="lg-eat"></i>가족 식당</span><span><i class="lg-look"></i>지금 보는 곳</span>
      <label><input type="checkbox" data-gmrec checked> 추천도 보기</label>
      <label><input type="checkbox" data-gmtransit checked> 🚇 지하철 노선</label>
    </div>
    <div class="msfilter"><select data-gmtheme aria-label="추천 장소 테마"></select><label class="gmeatsw" hidden><input type="checkbox" data-gmeats> 🍜 가족 식당</label></div>
    <div class="msmap" id="gmmap"></div>
    <div class="msinfo" aria-live="polite"></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', onClick);
  sheet.addEventListener('change', e => {
    if(e.target.matches('[data-gmrec]')){ showRec = e.target.checked; drawPins(); if(!cur && !kp) idleInfo(); }
    if(e.target.matches('[data-gmtransit]')){ showTransit = e.target.checked; if(transit) transit.setMap(showTransit ? map : null); }
    if(e.target.matches('[data-gmtheme]')){ curTheme = e.target.value; if(curTheme) showRec = true; want++; clearTemp(); kp = null; syncControls(); drawPins(); idleInfo(); fitShown(); }
    if(e.target.matches('[data-gmeats]')){ showEats = e.target.checked; want++; clearTemp(); kp = null; drawPins(); idleInfo(); fitShown(); }
  });
  sheet.addEventListener('input', e => { if(e.target.id === 'gmq'){ clearTimeout(typing); typing = setTimeout(() => suggest(e.target.value.trim()), 300); } });
}

function info(html){ sheet.querySelector('.msinfo').innerHTML = html; }
const hotelMode = () => !!cb && cb.mode === 'hotel';   // 숙소 동네 단계의 '구글 지도에서 숙소 찾기'로 연 지도
const defaultInfo = () => info(hotelMode()
  ? '<p class="fine">숙소 이름으로 찾거나, 지도의 숙소 아이콘을 눌러 숙소 후보로 담아요. 검색어와 고른 숙소는 구글로 보내요.</p>'
  : '<p class="fine">이름으로 찾거나, 지도의 장소 아이콘을 눌러 담아요. 숙소는 카드의 \'숙소 후보로\'를 눌러요. 위 \'추천 장소 테마\'를 고르면 앱이 추천한 곳을 지도에 모아 구글 평점과 같이 보여 드려요. 검색어와 고른 장소는 구글로 보내요.</p>');
// 추천 지도: 테마나 가족 식당을 골랐으면 아래에 목록(평점 높은 순), 아니면 안내
const listMode = () => !hotelMode() && (!!curTheme || showEats);
const idleInfo = () => listMode() ? listInfo() : defaultInfo();
const backBtn = () => listMode() ? '<button type="button" class="link" data-gm="back">← 목록</button>' : '';
// 시트 제목·검색칸 안내: 숙소 찾기인지, 여행 지역이 어디인지에 맞춤
function setHead(){
  const t = sheet.querySelector('.mstitle'), q = sheet.querySelector('#gmq');
  t.textContent = hotelMode() ? '구글 지도에서 숙소 찾기' : '구글 지도에서 담기';
  const ex = hotelMode() ? (REGION.key === 'hksz' ? '예: 예약한 호텔 이름, 침사추이 호텔' : '예: 예약한 호텔 이름, 신주쿠 호텔')
    : (REGION.key === 'hksz' ? '예: 빅토리아 피크, 침사추이 딤섬' : '예: 센소지, 이치란 시부야');
  q.placeholder = `${hotelMode() ? '숙소' : '장소'} 이름 (${ex})`;
  q.setAttribute('aria-label', hotelMode() ? '숙소 이름 검색' : '장소 이름 검색');
  syncControls();
}
// 테마 고르기·가족 식당 칸을 지금 상태에 맞춤 (테마별 수는 지금 장소 목록 기준, 식당은 그 지역에 있을 때만)
function syncControls(){
  const s = cb.getState(); const all = allPlaces(s); const n = themeCounts(all);
  const sel = sheet.querySelector('[data-gmtheme]');
  sel.innerHTML = `<option value="">추천 장소 테마 고르기</option><option value="all">추천 전체 ${all.length}곳</option>`
    + THEMES.filter(t => n[t.key]).map(t => `<option value="${t.key}">${t.icon} ${esc(t.label)} ${n[t.key]}곳</option>`).join('');
  if(curTheme && curTheme !== 'all' && !n[curTheme]) curTheme = '';
  sel.value = curTheme;
  if(!EATS.length) showEats = false;
  const sw = sheet.querySelector('.gmeatsw'); sw.hidden = !EATS.length;
  sw.lastChild.textContent = ` 🍜 가족 식당 ${EATS.length}곳`;
  sheet.querySelector('[data-gmeats]').checked = showEats;
  sheet.querySelector('[data-gmrec]').checked = showRec;
  sheet.querySelector('.lgeat').hidden = !showEats;
  sheet.querySelector('.msfilter').hidden = hotelMode();
}

// 핀: 꼭 갈 곳(빨강, 크게) · 담은 곳(주황) · 안 담은 추천(흰 바탕·회색 테두리, 작게) · 숙소 후보(초록). 앞에 올수록 위에 그림
//   색은 화면 토큰(styles.css --warn·--accent·--good)과 같은 값. 범례는 buildSheet .mslegend
const PIN = {
  must:{ background:'#B93226', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:1.1, z:4 },
  on:{ background:'#D96F00', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:0.95, z:3 },
  rec:{ background:'#FFFFFF', borderColor:'#5A6775', glyphColor:'#5A6775', scale:0.75, z:1 },
  hotel:{ background:'#1D7F47', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:0.95, z:2 },
  eat:{ background:'#0F7C8C', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:0.8, z:2 }   // 가족 식당 (--pin-eat)
};
//   어떤 핀을 그릴지(종류·좌표 거르기)는 gplace.js pinList
function drawPins(){
  if(!map) return;
  pins.forEach(m => { m.map = null; }); pins = [];
  const { AdvancedMarkerElement, PinElement } = G.marker;
  lastPins = pinList(cb.getState(), { rec:showRec, theme:curTheme, eats:showEats ? EATS : null });
  lastPins.forEach(x => {
    const { z, ...o } = PIN[x.kind];
    try{
      const m = new AdvancedMarkerElement({ map, position:x.pos, title:x.title, content:new PinElement(o).element, gmpClickable:true, zIndex:z });
      m.addListener('click', () => openPin(x));
      pins.push(m);
    }catch(e){ /* 핀 하나가 안 그려져도 나머지는 그림 */ }
  });
  sheet.querySelector('.lgeat').hidden = !showEats;
}
// 핀(또는 목록 줄)을 누르면: 구글에서 담은 곳·장소 ID가 있는 추천은 구글 카드, 앱 추천은 앱 카드, 식당은 식당 카드
function openPin(x){
  if(x.place) return x.place.gid ? showPlace(x.place.gid) : showKnown(x.place);
  if(x.eat) return showEat(x.eat);
  info(`<p><b>${esc(x.hotel.name)}</b> <span class="fine">숙소 후보</span></p>`);
}
// 목록에 올릴 것: 고른 테마에 드는 장소(담은 곳·꼭 갈 곳 포함) + 가족 식당 → [{ id, x(핀) }]
function listItems(){
  const th = curTheme && curTheme !== 'all' ? themeOf(curTheme) : null;
  return lastPins.filter(x => x.eat || (x.place && curTheme && (!th || th.test(x.place)))).map(x => ({ id:(x.place || x.eat).id, x }));
}
// 지금 목록: 메인 근처 지도면 메인 2.5km 안만 가까운 순(km 붙임), 아니면 전부
function shownItems(){
  const items = listItems(); if(!focusPt) return items;
  return items.map(o => Object.assign(o, { km:dist(focusPt, o.x.pos) })).filter(o => o.km <= NEAR_MAIN_KM).sort((a, b) => a.km - b.km);
}
const kmText = km => km < 1 ? `약 ${Math.max(50, Math.round(km * 20) * 50)}m` : `약 ${Math.round(km * 10) / 10}km`;
const kindTag = x => x.kind === 'must' ? '꼭 갈 곳' : x.kind === 'on' ? '담은 곳' : (x.place.kind || '추천');
const GR_BATCH = 40;   // '구글 평점 받기' 한 번에 (하루 사용량·요금이 한꺼번에 나가지 않게)
function listInfo(){
  const items = shownItems(); const now = Date.now();
  const what = (focusPt ? `메인 근처 ${NEAR_MAIN_KM}km · ` : '') + [curTheme === 'all' ? '추천 전체' : curTheme ? (themeOf(curTheme) || {}).label : '', showEats ? '가족 식당' : ''].filter(Boolean).join(' · ');
  const miss = items.filter(o => !grOf(o.id)).length;
  const row = o => {
    const t = o.x.place || o.x.eat; const v = grOf(o.id); const rt = rateText(v);
    const sub = [o.x.eat ? t.kind : kindTag(o.x), (AREAS[t.area] || {}).name, o.km != null ? kmText(o.km) : ''].filter(Boolean).join(' · ');
    const pk = !o.x.place ? '' : o.x.kind === 'must' ? '<span class="pickbtn" aria-disabled="true">꼭 갈 곳</span>'
      : `<button type="button" class="pickbtn" data-gm="lpick" data-id="${esc(o.id)}" aria-pressed="${o.x.kind === 'on'}" aria-label="${esc(t.name)} ${o.x.kind === 'on' ? '빼기' : '담기'}">${o.x.kind === 'on' ? '담음 ✓' : '담기'}</button>`;
    return `<li><button type="button" data-gm="focus" data-id="${esc(o.id)}"><b>${o.x.eat ? eatIcon(t) + ' ' : ''}${esc(t.name)}</b><span>${esc(sub)}${rt ? ` · <em class="gr">${esc(rt)}</em>` : ''}</span></button>${pk}</li>`;
  };
  info(`<p class="fine"><b>${esc(what)}</b> ${items.length}곳을 지도에 올렸어요. 이름을 누르면 지도에서 보여 주고, 마음에 들면 '담기'만 눌러 두세요. 날짜는 나중에 일정 단계에서 정해요.</p>
    ${miss ? `<div class="pfoot"><button type="button" class="primary small" data-gm="grall"${grBusy ? ' disabled' : ''}>${grBusy ? '구글 평점 받는 중…' : `⭐ 구글 평점 받기 ${Math.min(miss, GR_BATCH)}곳`}</button></div>
      <p class="fine">이름·주소로 구글에서 찾아 별점과 매긴 사람 수를 받아요(이 폰에 25일 보관, 이름·주소를 구글로 보내요).${miss > GR_BATCH ? ` 아직 ${miss}곳이 남아 ${GR_BATCH}곳씩 받아요.` : ''}</p>`
      : `<p class="fine">${focusPt ? '메인에서 가까운 순이에요.' : '구글 평점 높은 순이에요(구글 지도 기준, 25일마다 새로 받아요).'}</p>`}
    <ul class="gmnear">${(focusPt ? items : byRating(items, grCache(), now)).map(row).join('')}</ul>`);
}
// 지금 목록의 곳이 다 보이게 지도를 맞춤
function fitShown(){
  if(!map || !listMode() || !window.google || !window.google.maps.LatLngBounds) return;
  const pts = shownItems().map(o => o.x.pos); if(pts.length < 2) return;
  const b = new window.google.maps.LatLngBounds(); pts.forEach(p => b.extend(p)); map.fitBounds(b, 40);
}

// ── 구글 평점 (js/grating.js): 장소 ID가 있으면 바로, 없으면 찾을 말로 그 좌표 근처 한 곳 → 평점·평가 수·지도 주소 ──
//   600m 넘게 떨어진 곳이 나오면 못 찾음으로(엉뚱한 가게 평점을 보이지 않게). 장소 담기 검색칸과 같은 자동 완성만 씀(글 검색은 막아 둠)
const GR_FIELDS = ['id', 'location', 'rating', 'userRatingCount', 'googleMapsURI'];
async function fetchRating(x){
  await libs();
  const L = lookupOf(x); if(!L || (!L.gid && !L.q)) return { none:true, at:Date.now() };
  let place;
  if(L.gid) place = new G.places.Place({ id:L.gid, requestedLanguage:'ko' });
  else {
    const pos = latLngOf(x);
    const { suggestions } = await withTimeout(G.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input:L.q, sessionToken:new G.places.AutocompleteSessionToken(),
      language:'ko', region:REGION.gl, includedRegionCodes:REGION.codes, locationBias:pos ? { center:pos, radius:800 } : REGION.center }), MAPS_WAIT);
    const p = (suggestions || []).map(s => s.placePrediction).find(Boolean);
    if(!p) return { none:true, at:Date.now() };
    place = p.toPlace();
  }
  await withTimeout(place.fetchFields({ fields:GR_FIELDS }), MAPS_WAIT);
  const g = place.location ? { lat:place.location.lat(), lng:place.location.lng() } : null;
  if(!nearEnough(x, g)) return { none:true, at:Date.now() };
  return { gid:place.id, r:place.rating || 0, n:place.userRatingCount || 0, u:safeMapUrl(place.googleMapsURI || ''), at:Date.now() };
}
// 카드의 평점 줄 채우기: 저장해 둔 게 있으면 그대로, 없으면 받아 옴(그사이 다른 카드를 열면 화면은 안 바꿈, 받은 값은 저장)
async function rateInto(x){
  const n = want; let v = grOf(x.id);
  if(!v){ try{ v = await fetchRating(x); if(v){ grPut(x.id, v); if(cb.onRated) cb.onRated(); } }catch(e){ v = null; } }
  if(n !== want || sheet.hidden) return;
  const el = sheet.querySelector('[data-grline]'); if(el) el.textContent = rateText(v) || (v && v.none ? '구글 지도에서 이곳을 찾지 못했어요.' : '구글 평점을 못 받았어요. 인터넷을 확인해 주세요.');
  const a = sheet.querySelector('[data-grlink]'); if(a && v && v.u){ a.href = v.u; a.hidden = false; }
}
// 목록의 곳 평점을 한꺼번에 (GR_BATCH곳씩, 하나씩 차례로)
async function rateAll(){
  if(grBusy) return; grBusy = true; idleInfo();
  const todo = shownItems().filter(o => !grOf(o.id)).slice(0, GR_BATCH);
  let done = 0, fail = 0;
  for(const o of todo){
    if(sheet.hidden) break;
    try{ const v = await fetchRating(o.x.place || o.x.eat); if(v) grPut(o.id, v); }catch(e){ fail++; }
    done++;
    const b = sheet.querySelector('[data-gm="grall"]'); if(b) b.textContent = `구글 평점 받는 중… ${done}/${todo.length}`;
  }
  grBusy = false; if(cb.onRated) cb.onRated();
  if(sheet.hidden || cur || kp || !listMode()) return;
  idleInfo();
  if(fail && fail === done) sheet.querySelector('.msinfo').insertAdjacentHTML('afterbegin', '<p class="warnline">구글 평점을 못 받았어요. 인터넷이 안 되거나 오늘 쓸 수 있는 양을 넘었을 수 있어요. 잠시 뒤 다시 눌러 주세요.</p>');
}

// 가족 식당 카드 (앱이 고른 식당: 일정에는 안 들어감)
function showEat(e){
  want++; clearTemp(); kp = null;
  const pr = priceText(e.price); const area = AREAS[e.area] || {}; const v = grOf(e.id);
  info(`<div class="gmcard"><b>${eatIcon(e)} ${esc(e.name)}</b>
    <span class="fine">${esc([e.local, e.kind, pr ? `1인 약 ${pr}(대략값)` : '', area.name].filter(Boolean).join(' · '))}</span>
    <span class="fine gr" data-grline>${esc(rateText(v) || (v && v.none ? '구글 지도에서 이곳을 찾지 못했어요.' : '구글 평점 확인 중…'))}</span>
    ${e.menu ? `<span class="fine">🍽 ${esc(e.menu)}</span>` : ''}${e.kid ? `<span class="fine">👨‍👩‍👧 ${esc(e.kid)}</span>` : ''}
    <span class="fine">앱이 고른 가족 식당이에요. 일정 시간에는 안 들어가고, 여행 중 '오늘 하루'의 점심·저녁 자리 근처로 다시 보여 드려요.</span>
    <div class="pfoot"><a class="link" href="${esc((v && v.u) || eatMapUrl(e))}" target="_blank" rel="noopener" data-grlink>구글 지도 ↗</a>${area.city === 'sz' ? `<a class="link" href="${esc(eatAmapUrl(e))}" target="_blank" rel="noopener">가오더 지도 ↗</a>` : ''}${backBtn()}</div></div>`);
  if(!v) rateInto(e);
}

// 날짜는 정하고 싶을 때만: 접어 둔 칸 (먼저 어떤 곳이 있는지 보고 담는 게 우선 — 사용자 요청 11/16)
//   sel: 지금 정해 둔 날(dayOf) | null, btn: '이 날로' 버튼 속성
const dayBox = (sel, btn) => `<details class="gmdays"><summary>📅 ${sel != null ? `${sel + 1}일차로 정해 둠 · 바꾸기` : '날짜도 정하기 (나중에 해도 돼요)'}</summary>
    <div class="pfoot"><select data-gmday aria-label="갈 날">${dayOptions(sel)}</select><button type="button" class="ghost small" ${btn}>이 날로</button></div></details>`;
function dayOptions(sel){
  return `<option value="">날짜는 자동으로</option>` + cb.getDays().map(d => `<option value="${d.i}"${sel === d.i ? ' selected' : ''}>${esc(d.label)}</option>`).join('');
}

// 앱 추천 장소(구글 정보 없이): 담은 곳은 날 옮기기·빼기, 안 담은 곳은 담기
function showKnown(p){
  want++; clearTemp(); kp = p;   // 앞서 보던 구글 장소 카드·파란 핀은 치움
  const s = cb.getState(); const on = !!s.picked[p.id];
  const tag = s.must[p.id] ? '꼭 갈 곳' : on ? '담은 곳' : '아직 안 담은 추천';
  const meta = [p.kind, p.full ? '하루 종일' : p.hours ? `약 ${hrText(p.hours)}` : ''].filter(Boolean).join(' · ');
  const v = hotelMode() ? null : grOf(p.id);
  info(`<div class="gmcard"><b>${esc(p.name)}</b><span class="fine">${esc(tag)}${meta ? ' · ' + esc(meta) : ''}${(AREAS[p.area] || {}).name ? ' · ' + esc(AREAS[p.area].name) : ''}</span>
    ${hotelMode() ? '' : `<span class="fine gr" data-grline>${esc(rateText(v) || (v && v.none ? '구글 지도에서 이곳을 찾지 못했어요.' : '구글 평점 확인 중…'))}</span>`}
    ${p.note ? `<p class="fine">${esc(p.note)}</p>` : ''}
    <div class="pfoot">${s.must[p.id] ? '<span class="fine">✓ 꼭 갈 곳으로 담겨 있어요</span>'
        : `<button type="button" class="pickbtn" data-gm="ktoggle" data-v="${esc(p.id)}" aria-pressed="${on}">${on ? '담음 ✓' : '담기'}</button>`}
      <a class="link" href="${esc((v && v.u) || '#')}" target="_blank" rel="noopener" data-grlink${v && v.u ? '' : ' hidden'}>구글 지도 ↗</a>${backBtn()}</div>
    ${on ? '<p class="fine">담은 곳은 일정 단계에서 날짜·동선을 정해요. 정하기 전엔 앱이 가까운 곳끼리 묶어 자동으로 짜 둬요.</p>' : ''}
    ${dayBox(dayOf(s, p), `data-gm="move" data-v="${esc(p.id)}"`)}</div>`);
  if(!hotelMode() && !v) rateInto(p);
}

// 구글 장소 카드
async function showPlace(placeOrId){
  const n = ++want;
  info('<p class="fine">장소 정보를 불러오는 중…</p>');
  let place = placeOrId;
  try{
    if(typeof placeOrId === 'string') place = new G.places.Place({ id:placeOrId, requestedLanguage:'ko' });
    await place.fetchFields({ fields:FIELDS });
  }catch(e){ if(n === want && !sheet.hidden) info('<p class="warnline">장소 정보를 못 불러왔어요. 잠시 후 다시 눌러 주세요.</p>'); return; }
  if(n !== want || sheet.hidden) return;   // 그사이 다른 곳을 눌렀거나 시트를 닫았으면(파란 핀이 남지 않게)
  const loc = place.location;
  if(!loc){ info('<p class="warnline">이 장소는 위치 정보가 없어요. 다른 장소를 골라 주세요.</p>'); return; }
  const oh = place.regularOpeningHours;
  const periods = oh && oh.periods ? oh.periods.map(p => ({ open:p.open && { day:p.open.day, hour:p.open.hour, minute:p.open.minute }, close:p.close && { day:p.close.day, hour:p.close.hour, minute:p.close.minute } })) : null;
  cur = { id:place.id, name:place.displayName || '', lat:loc.lat(), lng:loc.lng(), types:place.types || [], addr:place.formattedAddress || '', periods, mapsUrl:place.googleMapsURI || '' };
  if(temp) temp.map = null;
  // 지금 보는 곳(검색·공유·지도에서 고른 곳): 파랑, 크게 (기본 빨강 핀은 '꼭 갈 곳'과 헷갈려서)
  const look = new G.marker.PinElement({ background:'#1A73E8', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:1.2 });
  temp = new G.marker.AdvancedMarkerElement({ map, position:loc, title:cur.name, content:look.element, zIndex:5 });
  map.panTo(loc); if(map.getZoom() < 15) map.setZoom(16);
  const s = cb.getState(); const known = matchKnown(cur);
  const mine = known ? known : (s.custom || []).find(c => c.gid === cur.id);
  const on = mine && s.picked[mine.id];
  const off = closedDays(periods);
  // 숙소(구글 종류가 숙박)거나 숙소 찾기로 연 지도면 '숙소 후보로 담기'가 먼저. 숙소 찾기에서는 일정 담기를 감춤
  const hm = hotelMode(), lodge = isLodging(cur.types), inHotels = cb.findHotel ? cb.findHotel(cur) : null;
  const hotelFirst = hm || lodge;
  const hotelBtn = inHotels ? `<span class="fine">🏨 숙소 후보에 있어요${inHotels.name !== cur.name ? ` (${esc(inHotels.name)})` : ''}</span>`
    : `<button type="button" class="${hotelFirst ? 'primary' : 'ghost'} small" data-gm="hotel">🏨 숙소 후보로${hotelFirst ? ' 담기' : ''}</button>`;
  const planPart = on ? `<span class="fine">✓ 담은 곳</span><button type="button" class="ghost small" data-gm="toggle" data-v="${esc(mine.id)}">빼기</button>`
    : `<button type="button" class="${hotelFirst ? 'ghost' : 'primary'} small" data-gm="pick" data-nodate>담기</button>`;
  const actions = hm ? hotelBtn : lodge ? hotelBtn + planPart : planPart + hotelBtn;
  info(`<div class="gmcard"><b>${esc(cur.name)}</b>
    <span class="fine">${esc(place.primaryTypeDisplayName || '')}${place.rating ? ` · ★ ${place.rating.toFixed(1)}${place.userRatingCount ? ` (${place.userRatingCount.toLocaleString('ko-KR')})` : ''}` : ''}</span>
    ${cur.addr ? `<span class="fine">${esc(cur.addr)}</span>` : ''}
    ${off.length ? `<span class="warnline">${off.map(d => WD[d]).join('·')}요일 휴무</span>` : ''}
    ${oh && oh.weekdayDescriptions ? `<details class="more"><summary>영업시간</summary><p class="fine">${oh.weekdayDescriptions.map(esc).join('<br>')}</p></details>` : ''}
    ${known && !hm ? `<span class="fine">트립노선 추천 장소 '${esc(known.name)}'(으)로 담아요.</span>` : ''}
    <div class="pfoot">${actions}
      ${cur.mapsUrl ? `<a class="link" href="${esc(cur.mapsUrl)}" target="_blank" rel="noopener">구글 지도 ↗</a>` : ''}${backBtn()}</div>
    ${hm ? '' : dayBox(dayOf(s, mine), 'data-gm="pick"')}</div>`);
}

// 자동 완성 (같은 검색 흐름은 한 세션으로 묶음: 고르기 전까지 후보 요청은 따로 돈을 받지 않는 방식)
async function suggest(q){
  const ul = sheet.querySelector('.gmsug');
  const n = ++sugN;
  if(q.length < 2){ ul.hidden = true; ul.innerHTML = ''; return; }
  try{
    if(!token) token = new G.places.AutocompleteSessionToken();
    const { suggestions } = await G.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input:q, sessionToken:token, language:'ko', region:REGION.gl,
      includedRegionCodes:REGION.codes, locationBias:map ? map.getBounds() || undefined : undefined });
    if(n !== sugN) return;   // 더 친 글자의 후보가 먼저 왔으면 옛 후보로 덮지 않음
    const list = (suggestions || []).map(x => x.placePrediction).filter(Boolean).slice(0, 6);
    sheet.__sug = list;
    ul.innerHTML = list.map((p, i) => `<li><button type="button" data-gm="sug" data-i="${i}"><b>${esc(p.mainText ? p.mainText.toString() : p.text.toString())}</b><span>${esc(p.secondaryText ? p.secondaryText.toString() : '')}</span></button></li>`).join('');
    ul.hidden = !list.length;
  }catch(e){ if(n === sugN) ul.hidden = true; }
}

function onClick(e){
  const b = e.target.closest('[data-gm]'); if(!b) return;
  const a = b.dataset.gm; const daySel = sheet.querySelector('[data-gmday]');
  const day = b.hasAttribute('data-nodate') || !daySel || daySel.value === '' ? null : +daySel.value;   // '담기'는 날짜 없이, '이 날로'만 고른 날
  if(a === 'close') closeMap();
  else if(a === 'sug'){
    const p = (sheet.__sug || [])[+b.dataset.i]; sheet.querySelector('.gmsug').hidden = true;
    if(!p) return;   // 후보가 그사이 바뀜
    const place = p.toPlace(); token = null; showPlace(place);
  } else if(a === 'pick' && cur){
    const s = cb.getState(); const mine = matchKnown(cur) || (s.custom || []).find(c => c.gid === cur.id);
    const wasOn = !!(mine && s.picked[mine.id]), wasDay = dayOf(s, mine);
    picked(cb.onPick(cur, day), day, wasOn, wasDay, ' 계속 찾거나 닫기를 눌러 주세요.');
  } else if(a === 'move'){
    const s = cb.getState(); const p = kp && kp.id === b.dataset.v ? kp : { id:b.dataset.v };
    const wasOn = !!s.picked[p.id], wasDay = dayOf(s, p);   // 담기 전에 (onPick이 상태를 바꿈)
    picked(cb.onPick(null, day, p.id), day, wasOn, wasDay, '');
  }
  else if(a === 'toggle'){ cb.onToggle(b.dataset.v); clearTemp(); kp = null; drawPins(); idleInfo(); }
  else if(a === 'focus'){
    const x = lastPins.find(o => (o.place || o.eat || {}).id === b.dataset.id); if(!x) return;
    map.panTo(x.pos); if(map.getZoom() < 15) map.setZoom(15); openPin(x);
  }
  else if(a === 'back'){ want++; clearTemp(); kp = null; idleInfo(); }
  else if(a === 'ktoggle'){ const p = kp && kp.id === b.dataset.v ? kp : null; cb.onToggle(b.dataset.v); drawPins(); if(p) showKnown(p); }
  else if(a === 'lpick'){   // 목록에서 바로 담기·빼기 (보던 자리 그대로)
    const el = sheet.querySelector('.msinfo'); const top = el.scrollTop;
    cb.onToggle(b.dataset.id); drawPins(); listInfo(); el.scrollTop = top;
  }
  else if(a === 'grall') rateAll();
  else if(a === 'hotel' && cur){
    // 숙소 후보로: app.js onHotel → { name, dup } | { name:'', msg }(지역 밖 등)
    const r = cb.onHotel ? cb.onHotel(cur) : null; drawPins();
    if(!r || !r.name){ info(`<p class="warnline">${esc((r && r.msg) || '숙소 후보에 담지 못했어요. 닫았다가 다시 눌러 주세요.')}</p>`); return; }
    info(`<p class="lmsg">${esc(r.dup ? `'${r.name}'은(는) 이미 숙소 후보에 있어요.` : `'${r.name}'을(를) 숙소 후보에 담았어요. 가격·예약 링크는 숙소 동네 단계에서 적어요.`)}</p>
      <div class="pfoot"><button type="button" class="primary small" data-gm="gohotel">숙소 후보 보러 가기</button><span class="fine">계속 찾거나 닫기를 눌러도 돼요.</span></div>`);
  }
  else if(a === 'gohotel'){ const go = cb.onGoHotel; closeMap(); if(go) go(); }
}
// onPick이 돌려준 이름으로 알림 ('' = 못 담음 → 경고). 담은 뒤 핀 다시 그림
function picked(name, day, wasOn, wasDay, more){
  const m = pickMsg(name, day, wasOn, wasDay); drawPins();
  info((m.ok ? `<p class="lmsg">${esc(m.text)}${more}</p>` : `<p class="warnline">${esc(m.text)}</p>`) + (listMode() ? `<div class="pfoot">${backBtn()}</div>` : ''));
}
function clearTemp(){ if(temp){ temp.map = null; temp = null; } cur = null; }

async function libs(){
  await loadMaps();
  if(!G){ const gm = window.google.maps; G = await withTimeout((async () => ({ maps:await gm.importLibrary('maps'), places:await gm.importLibrary('places'), marker:await gm.importLibrary('marker') }))(), MAPS_WAIT); }
  return G;
}

// 그 자리 근처 식당 (구글 근처 검색, 인기순 최대 15곳). 결과는 화면에서만 쓰고 저장하지 않음(구글 약관)
//   → [{ id, name, lat, lng, km, cuisine, rating, ratingN, periods, mapsUrl }]
export async function nearbyFood(pt, radius){
  const g = await libs();
  const { places } = await g.places.Place.searchNearby({
    fields:['id', 'displayName', 'location', 'rating', 'userRatingCount', 'regularOpeningHours', 'primaryTypeDisplayName', 'googleMapsURI'],
    locationRestriction:{ center:{ lat:+pt.lat, lng:+pt.lng }, radius:radius || 500 },
    includedPrimaryTypes:['restaurant'], maxResultCount:15, rankPreference:g.places.SearchNearbyRankPreference.POPULARITY, language:'ko', region:REGION.gl });
  const R = 6371, rad = Math.PI / 180;
  const km = (a, b) => { const x = (b.lng - a.lng) * rad * Math.cos((a.lat + b.lat) / 2 * rad), y = (b.lat - a.lat) * rad; return Math.sqrt(x * x + y * y) * R; };
  return (places || []).filter(p => p.location).map(p => {
    const loc = { lat:p.location.lat(), lng:p.location.lng() }; const oh = p.regularOpeningHours;
    return { id:p.id, name:p.displayName || '', lat:loc.lat, lng:loc.lng, km:km(pt, loc), cuisine:p.primaryTypeDisplayName || '식당',
      rating:p.rating || 0, ratingN:p.userRatingCount || 0, mapsUrl:p.googleMapsURI || '',
      periods:oh && oh.periods ? oh.periods.map(x => ({ open:x.open && { day:x.open.day, hour:x.open.hour, minute:x.open.minute }, close:x.close && { day:x.close.day, hour:x.close.hour, minute:x.close.minute } })) : null };
  });
}

// 담아 둔 구글 장소를 장소 ID로 새로 받기 (약관상 좌표 등은 30일 넘게 두지 않음). 지도 없이 장소 라이브러리만 씀
//   → [{ id, lat, lng, addr, periods }] (못 받은 곳은 빠짐)
export async function refreshPlaces(gids){
  await loadMaps(); const { Place } = await window.google.maps.importLibrary('places');
  const out = [];
  for(const id of gids){
    try{
      const p = new Place({ id, requestedLanguage:'ko' });
      await p.fetchFields({ fields:['id', 'location', 'formattedAddress', 'regularOpeningHours'] });
      if(!p.location) continue; const oh = p.regularOpeningHours;
      out.push({ id, lat:p.location.lat(), lng:p.location.lng(), addr:p.formattedAddress || '',
        periods:oh && oh.periods ? oh.periods.map(x => ({ open:x.open && { day:x.open.day, hour:x.open.hour, minute:x.open.minute }, close:x.close && { day:x.close.day, hour:x.close.hour, minute:x.close.minute } })) : null });
    }catch(e){ /* 닫았거나 없어진 곳: 다음에 다시 */ }
  }
  return out;
}

// query: 구글 지도 앱에서 공유받은 장소 — 문자열(찾을 말) | { q, name } (gimport.js sharedPlace). 지도를 연 뒤 그 장소 카드를 띄움
//   → true(지도를 염) | false(키·인터넷·지도 오류: 시트에 까닭을 적어 둠. 공유는 app.js가 가져온 곳 목록으로 돌림)
//   callbacks.view: { theme:''|'all'|테마 키, eats:true|false, rec, center } — 테마 상자·식당 상자의 '지도로 보기'(추천 지도), 일정의 '메인 근처 지도'(center)
export async function openMap(callbacks, query){
  cb = callbacks;
  const v = cb.view || null;
  if(hotelMode() || !v){ curTheme = ''; showEats = false; }
  else { curTheme = v.theme || ''; showEats = !!v.eats; if(v.rec != null) showRec = !!v.rec; }
  focusPt = !hotelMode() && v && v.center ? v.center : null;
  if(!sheet) buildSheet();
  setHead();
  sheet.hidden = false; document.body.classList.add('noscroll');
  try{ await libs(); }
  catch(e){
    info(e.message === 'nokey'
      ? '<p class="warnline">구글 지도 키를 아직 넣지 않았어요. js/maps-config.js에 키를 넣으면 여기에 구글 지도가 떠요.</p>'
      : '<p class="warnline">구글 지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>');
    return false;
  }
  try{
    if(!map){
      map = new G.maps.Map(sheet.querySelector('#gmmap'), { center:REGION.center, zoom:REGION.key === 'hksz' ? 11 : 12, mapId:mapsConfig.mapId || 'DEMO_MAP_ID',
        clickableIcons:true, gestureHandling:'greedy', mapTypeControl:false, streetViewControl:false, fullscreenControl:false });
      map.addListener('click', ev => { if(ev.placeId){ ev.stop(); showPlace(ev.placeId); } });
      try{ transit = new G.maps.TransitLayer(); if(showTransit) transit.setMap(map); }catch(e){ transit = null; }   // 노선을 못 그려도 지도는 그대로
    }
    drawPins(); idleInfo();
    if(v && v.center){ map.setCenter(v.center); map.setZoom(15); } else if(v) fitShown();   // 메인 근처 지도는 메인 가운데로
  }catch(e){ map = null; info('<p class="warnline">구글 지도를 그리지 못했어요. 닫았다가 다시 열어 주세요.</p>'); return false; }
  if(query){
    const sh = typeof query === 'string' ? { q:query, name:'' } : query;
    if(sh.q) findPlace(sh);
    else info('<p class="warnline">공유한 링크에 장소 이름이 없어서 찾지 못했어요. 위 검색칸에 이름을 쳐 주세요.</p>');
  }
  return true;
}

// 이름(·주소)으로 구글 장소 하나 찾기 → 카드. 검색칸과 같은 자동 완성으로 찾음(이름+주소 → 이름만 → 앞 세 낱말, gplace.js findInputs)
//   (글 검색 searchByText는 이 프로젝트에서 하루 한도를 0으로 막아 둠 — 돈이 나가지 않게, 2026-11-04 확인. 쓰지 않음)
async function findPlace({ q, name }){
  const n = want;   // 찾는 사이 다른 장소를 눌렀거나 닫으면 그만둠
  const live = () => n === want && !sheet.hidden;
  info('<p class="fine">공유한 장소를 찾고 있어요…</p>');
  const box = sheet.querySelector('#gmq'); if(box) box.value = (name || q).slice(0, 60);
  for(const input of findInputs(q, name)){
    try{
      if(!token) token = new G.places.AutocompleteSessionToken();
      const { suggestions } = await withTimeout(G.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken:token, language:'ko', region:REGION.gl,
        includedRegionCodes:REGION.codes, locationBias:REGION.center }), MAPS_WAIT);
      if(!live()) return;
      const p = (suggestions || []).map(x => x.placePrediction).find(Boolean);
      if(p){ const place = p.toPlace(); token = null; showPlace(place); return; }
    }catch(e){ if(!live()) return; }
  }
  const nm = name || q;
  if(live()) info(`<p class="warnline">공유한 장소${nm ? ` '${esc(nm)}'` : ''}을(를) 못 찾았어요. 위 검색칸에서 이름을 고쳐 찾아 보세요.</p>`);
}

export const mapOpen = () => !!sheet && !sheet.hidden;
export function closeMap(){
  if(!sheet) return;
  sheet.hidden = true; document.body.classList.remove('noscroll');
  want++; clearTemp(); kp = null;   // 아직 오는 장소 응답은 버림(닫은 뒤 파란 핀이 남지 않게)
  if(cb && cb.onClose) cb.onClose();
}
