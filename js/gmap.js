// 구글 지도에서 찾아 담기: 한국어 구글 지도를 화면 위 시트로 띄움 (Maps JavaScript API + Places API New).
//   검색: 치는 동안 장소 후보(자동 완성) → 고르면 장소 카드
//   지도의 장소 아이콘 누르기 → 장소 카드
//   장소 카드: 평점·영업시간·주소 + '몇 일차에 담기' → 바로 일정에. 담은 곳·숙소 후보는 핀으로
// 구글 지도는 이 시트를 처음 열 때만 불러옴(앱 첫 화면을 가볍게, 혼자 계획만 하는 사람은 구글에 아무것도 안 보냄).
// app.js가 상태·날짜를 넘기고(getState, getDays), 담기·빼기는 콜백(onPick, onToggle)으로 돌려줌.
// 계산(종류·영업시간·같은 장소 찾기)은 gplace.js. #view 밖(body 끝)에 붙어서 다시 그려도 지도가 남음.
import { mapsConfig } from './maps-config.js';
import { REGION } from './data.js';
import { allPlaces } from './logic.js';
import { esc } from './ui.js';
import { matchKnown, closedDays } from './gplace.js';
import { withTimeout } from './net.js';

const FIELDS = ['id', 'displayName', 'location', 'formattedAddress', 'types', 'rating', 'userRatingCount', 'regularOpeningHours', 'googleMapsURI', 'primaryTypeDisplayName'];
const WD = ['일', '월', '화', '수', '목', '금', '토'];
let G = null, map = null, sheet = null, cb = null, pins = [], temp = null, token = null, typing = null, cur = null, loading = null, script = null;
let showRec = true;   // 안 담은 추천 장소도 지도에 (범례의 '추천도 보기')
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
    <div class="mshead"><b>구글 지도에서 담기</b><button type="button" class="ghost small" data-gm="close">닫기</button></div>
    <div class="mssearch"><input type="search" id="gmq" placeholder="장소 이름 (예: 센소지, 이치란 시부야)" aria-label="장소 이름 검색" maxlength="60" autocomplete="off"></div>
    <ul class="gmsug" hidden></ul>
    <div class="mslegend" aria-label="지도 표시">
      <span><i class="lg-must"></i>꼭 갈 곳</span><span><i class="lg-on"></i>담은 곳</span><span><i class="lg-rec"></i>안 담은 추천</span><span><i class="lg-hotel"></i>숙소 후보</span><span><i class="lg-look"></i>지금 보는 곳</span>
      <label><input type="checkbox" data-gmrec checked> 추천도 보기</label>
    </div>
    <div class="msmap" id="gmmap"></div>
    <div class="msinfo" aria-live="polite"></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', onClick);
  sheet.addEventListener('change', e => { if(e.target.matches('[data-gmrec]')){ showRec = e.target.checked; drawPins(); } });
  sheet.addEventListener('input', e => { if(e.target.id === 'gmq'){ clearTimeout(typing); typing = setTimeout(() => suggest(e.target.value.trim()), 300); } });
}

function info(html){ sheet.querySelector('.msinfo').innerHTML = html; }
const defaultInfo = () => info('<p class="fine">이름으로 찾거나, 지도의 장소 아이콘을 눌러 담아요. 검색어와 고른 장소는 구글로 보내요.</p>');

// 핀: 꼭 갈 곳(빨강, 크게) · 담은 곳(주황) · 안 담은 추천(흰 바탕·회색 테두리, 작게) · 숙소 후보(초록). 앞에 올수록 위에 그림
//   색은 화면 토큰(styles.css --warn·--accent·--good)과 같은 값. 범례는 buildSheet .mslegend
const PIN = {
  must:{ background:'#B93226', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:1.1, z:4 },
  on:{ background:'#D96F00', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:0.95, z:3 },
  rec:{ background:'#FFFFFF', borderColor:'#5A6775', glyphColor:'#5A6775', scale:0.75, z:1 },
  hotel:{ background:'#1D7F47', borderColor:'#FFFFFF', glyphColor:'#FFFFFF', scale:0.95, z:2 }
};
export const pinKind = (s, p) => s.must[p.id] ? 'must' : s.picked[p.id] ? 'on' : 'rec';
function drawPins(){
  if(!map) return;
  pins.forEach(m => { m.map = null; }); pins = [];
  const s = cb.getState(); const { AdvancedMarkerElement, PinElement } = G.marker;
  const add = (pos, kind, title, onTap) => {
    const { z, ...o } = PIN[kind];
    const pin = new PinElement(o);
    const m = new AdvancedMarkerElement({ map, position:pos, title, content:pin.element, gmpClickable:true, zIndex:z });
    m.addListener('click', onTap); pins.push(m);
  };
  allPlaces(s).filter(p => p.lat != null && (showRec || s.picked[p.id])).forEach(p => {
    const k = pinKind(s, p); add({ lat:p.lat, lng:p.lng }, k, p.name, () => p.gid ? showPlace(p.gid) : showKnown(p));
  });
  (s.hotels || []).filter(h => h.lat != null).forEach(h => add({ lat:h.lat, lng:h.lng }, 'hotel', h.name, () => info(`<p><b>${esc(h.name)}</b> <span class="fine">숙소 후보</span></p>`)));
}

function dayOptions(sel){
  return `<option value="">날짜는 자동으로</option>` + cb.getDays().map(d => `<option value="${d.i}"${sel === d.i ? ' selected' : ''}>${esc(d.label)}</option>`).join('');
}

// 앱 추천 장소(구글 정보 없이): 담은 곳은 날 옮기기·빼기, 안 담은 곳은 담기
function showKnown(p){
  const s = cb.getState(); const on = !!s.picked[p.id];
  const tag = s.must[p.id] ? '꼭 갈 곳' : on ? '담은 곳' : '아직 안 담은 추천';
  const meta = [p.kind, p.full ? '하루 종일' : p.hours ? `약 ${p.hours}시간` : ''].filter(Boolean).join(' · ');
  info(`<div class="gmcard"><b>${esc(p.name)}</b><span class="fine">${esc(tag)}${meta ? ' · ' + esc(meta) : ''}</span>${p.note ? `<p class="fine">${esc(p.note)}</p>` : ''}
    <div class="pfoot"><select data-gmday aria-label="담을 날">${dayOptions(s.assign[p.id] != null && s.assign[p.id] >= 0 ? s.assign[p.id] : null)}</select>
      <button type="button" class="primary small" data-gm="move" data-v="${esc(p.id)}">${on ? '이 날로' : '일정에 담기'}</button>
      ${on ? `<button type="button" class="ghost small" data-gm="toggle" data-v="${esc(p.id)}">빼기</button>` : ''}</div></div>`);
}

// 구글 장소 카드
async function showPlace(placeOrId){
  info('<p class="fine">장소 정보를 불러오는 중…</p>');
  let place = placeOrId;
  try{
    if(typeof placeOrId === 'string') place = new G.places.Place({ id:placeOrId, requestedLanguage:'ko' });
    await place.fetchFields({ fields:FIELDS });
  }catch(e){ info('<p class="warnline">장소 정보를 못 불러왔어요. 잠시 후 다시 눌러 주세요.</p>'); return; }
  const loc = place.location; if(!loc) return;
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
  info(`<div class="gmcard"><b>${esc(cur.name)}</b>
    <span class="fine">${esc(place.primaryTypeDisplayName || '')}${place.rating ? ` · ★ ${place.rating.toFixed(1)}${place.userRatingCount ? ` (${place.userRatingCount.toLocaleString('ko-KR')})` : ''}` : ''}</span>
    ${cur.addr ? `<span class="fine">${esc(cur.addr)}</span>` : ''}
    ${off.length ? `<span class="warnline">${off.map(d => WD[d]).join('·')}요일 휴무</span>` : ''}
    ${oh && oh.weekdayDescriptions ? `<details class="more"><summary>영업시간</summary><p class="fine">${oh.weekdayDescriptions.map(esc).join('<br>')}</p></details>` : ''}
    ${known ? `<span class="fine">트립노선 추천 장소 '${esc(known.name)}'(으)로 담아요.</span>` : ''}
    <div class="pfoot"><select data-gmday aria-label="담을 날">${dayOptions(mine && s.assign[mine.id] >= 0 ? s.assign[mine.id] : null)}</select>
      <button type="button" class="primary small" data-gm="pick">${on ? '이 날로 옮기기' : '일정에 담기'}</button>
      ${on ? `<button type="button" class="ghost small" data-gm="toggle" data-v="${esc(mine.id)}">빼기</button>` : ''}
      ${cur.mapsUrl ? `<a class="link" href="${esc(cur.mapsUrl)}" target="_blank" rel="noopener">구글 지도 ↗</a>` : ''}</div></div>`);
}

// 자동 완성 (같은 검색 흐름은 한 세션으로 묶음: 고르기 전까지 후보 요청은 따로 돈을 받지 않는 방식)
async function suggest(q){
  const ul = sheet.querySelector('.gmsug');
  if(q.length < 2){ ul.hidden = true; ul.innerHTML = ''; return; }
  try{
    if(!token) token = new G.places.AutocompleteSessionToken();
    const { suggestions } = await G.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input:q, sessionToken:token, language:'ko', region:REGION.gl,
      includedRegionCodes:REGION.codes, locationBias:map ? map.getBounds() || undefined : undefined });
    const list = (suggestions || []).map(x => x.placePrediction).filter(Boolean).slice(0, 6);
    sheet.__sug = list;
    ul.innerHTML = list.map((p, i) => `<li><button type="button" data-gm="sug" data-i="${i}"><b>${esc(p.mainText ? p.mainText.toString() : p.text.toString())}</b><span>${esc(p.secondaryText ? p.secondaryText.toString() : '')}</span></button></li>`).join('');
    ul.hidden = !list.length;
  }catch(e){ ul.hidden = true; }
}

function onClick(e){
  const b = e.target.closest('[data-gm]'); if(!b) return;
  const a = b.dataset.gm; const daySel = sheet.querySelector('[data-gmday]'); const day = daySel && daySel.value !== '' ? +daySel.value : null;
  if(a === 'close') closeMap();
  else if(a === 'sug'){
    const p = sheet.__sug[+b.dataset.i]; sheet.querySelector('.gmsug').hidden = true;
    const place = p.toPlace(); token = null; showPlace(place);
  } else if(a === 'pick' && cur){
    const name = cb.onPick(cur, day); drawPins();
    info(`<p class="lmsg">'${esc(name)}'을(를) ${day == null ? '일정에' : `${day + 1}일차에`} 담았어요. 계속 찾거나 닫기를 눌러 주세요.</p>`);
  } else if(a === 'move'){ const name = cb.onPick(null, day, b.dataset.v); drawPins(); info(`<p class="lmsg">'${esc(name)}'을(를) ${day == null ? '일정에' : `${day + 1}일차에`} 담았어요.</p>`); }
  else if(a === 'toggle'){ cb.onToggle(b.dataset.v); drawPins(); defaultInfo(); }
}

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

// query: 구글 지도 앱에서 공유받은 장소(이름·주소) — 지도를 연 뒤 그 장소 카드를 띄움. 지도를 못 열면 false
export async function openMap(callbacks, query){
  cb = callbacks;
  if(!sheet) buildSheet();
  sheet.hidden = false; document.body.classList.add('noscroll');
  try{ await libs(); }
  catch(e){
    info(e.message === 'nokey'
      ? '<p class="warnline">구글 지도 키를 아직 넣지 않았어요. js/maps-config.js에 키를 넣으면 여기에 구글 지도가 떠요.</p>'
      : '<p class="warnline">구글 지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>');
    return false;
  }
  if(!map){
    map = new G.maps.Map(sheet.querySelector('#gmmap'), { center:REGION.center, zoom:REGION.key === 'hksz' ? 11 : 12, mapId:mapsConfig.mapId || 'DEMO_MAP_ID',
      clickableIcons:true, gestureHandling:'greedy', mapTypeControl:false, streetViewControl:false, fullscreenControl:false });
    map.addListener('click', ev => { if(ev.placeId){ ev.stop(); showPlace(ev.placeId); } });
  }
  drawPins(); defaultInfo();
  if(query) findPlace(query);
  return true;
}

// 이름(·주소)으로 구글 장소 하나 찾기 → 카드. 검색칸과 같은 자동 완성으로 찾음
//   (글 검색 searchByText는 이 프로젝트에서 하루 한도를 0으로 막아 둠 — 돈이 나가지 않게, 2026-11-04 확인)
async function findPlace(q){
  info('<p class="fine">공유한 장소를 찾고 있어요…</p>');
  const box = sheet.querySelector('#gmq'); if(box) box.value = q.slice(0, 60);
  const name = q.split(/\s{2,}|\n/)[0];
  for(const input of [q, q.split(' ').slice(0, 3).join(' ')].filter((x, i, a) => x && a.indexOf(x) === i)){
    try{
      if(!token) token = new G.places.AutocompleteSessionToken();
      const { suggestions } = await withTimeout(G.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input:input.slice(0, 100), sessionToken:token, language:'ko', region:REGION.gl,
        includedRegionCodes:REGION.codes, locationBias:REGION.center }), MAPS_WAIT);
      const p = (suggestions || []).map(x => x.placePrediction).find(Boolean);
      if(p){ const place = p.toPlace(); token = null; showPlace(place); return; }
    }catch(e){}
  }
  info(`<p class="warnline">공유한 장소${name ? ` '${esc(name)}'` : ''}을(를) 못 찾았어요. 위 검색칸에서 이름을 고쳐 찾아 보세요.</p>`);
}

export function closeMap(){
  if(!sheet) return;
  sheet.hidden = true; document.body.classList.remove('noscroll');
  if(temp){ temp.map = null; temp = null; } cur = null;
  if(cb && cb.onClose) cb.onClose();
}
