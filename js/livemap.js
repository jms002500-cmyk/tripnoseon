// 지도에서 찾아 담기: OpenStreetMap 지도(Leaflet, js/vendor/leaflet)를 화면 위 시트로 띄움.
//   검색: 이름 → Nominatim 후보 여러 개를 지도에 표시 → 골라서 '담기'
//   지도 누르기: 그 위치의 이름을 Nominatim 역지오코딩으로 제안 → 이름 고쳐서 '담기'
//   담은 곳·안 담은 곳·숙소 후보를 점으로 표시, 점을 눌러 담기/빼기
// app.js가 상태를 넘기고(getState), 담기·빼기는 콜백(onAdd, onToggle)으로 돌려줌.
// #view를 다시 그려도 지도가 사라지지 않게 #view 밖(body 끝)에 붙임.
import { allPlaces } from './logic.js';
import { esc } from './ui.js';

const CENTER = [35.6812, 139.7671];
const NOMI = 'https://nominatim.openstreetmap.org';
let L = null, map = null, sheet = null, layers = null, found = null, temp = null, cb = null, lastCall = 0;

// Leaflet은 처음 열 때만 불러옴 (앱 첫 화면을 가볍게)
function loadLeaflet(){
  if(window.L) return Promise.resolve(window.L);
  return new Promise((ok, fail) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'js/vendor/leaflet/leaflet.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'js/vendor/leaflet/leaflet.js';
    js.onload = () => ok(window.L); js.onerror = () => fail(new Error('leaflet'));
    document.head.appendChild(js);
  });
}

// Nominatim은 1초에 1번까지
async function nomi(path, params){
  const gap = Date.now() - lastCall; if(gap < 1100) await new Promise(r => setTimeout(r, 1100 - gap)); lastCall = Date.now();
  const res = await fetch(`${NOMI}/${path}?${new URLSearchParams(Object.assign({ format:'jsonv2', 'accept-language':'ko' }, params))}`, { headers:{ Accept:'application/json' } });
  if(!res.ok) throw new Error('nominatim ' + res.status);
  return res.json();
}
const shortName = r => r.name || String(r.display_name || '').split(',')[0].trim();
const shortAddr = r => String(r.display_name || '').split(',').slice(1, 3).join(',').trim();

function buildSheet(){
  sheet = document.createElement('div');
  sheet.className = 'mapsheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', '지도에서 찾아 담기');
  sheet.innerHTML = `
    <div class="mshead"><b>지도에서 찾아 담기</b><button type="button" class="ghost small" data-map="close">닫기</button></div>
    <form class="mssearch" data-map="search"><input type="search" name="q" placeholder="장소 이름 (예: 이치란 시부야, 東京タワー)" aria-label="장소 이름 검색" maxlength="60"><button type="submit" class="primary small">찾기</button></form>
    <div class="msmap" id="msmap"></div>
    <div class="msinfo" aria-live="polite"></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', onClick, true);   // 캡처: Leaflet 말풍선은 클릭이 위로 안 올라와서
  sheet.addEventListener('submit', onSubmit);
}

function info(html){ sheet.querySelector('.msinfo').innerHTML = html; }
const defaultInfo = () => info('<p class="fine">이름으로 찾거나, 지도를 눌러 그 자리를 담을 수 있어요. 검색어와 누른 위치는 OpenStreetMap으로 보내요. 지도 그림도 OpenStreetMap에서 받아 와요.</p>');

// 담은 곳(주황)·안 담은 곳(회색)·숙소 후보(초록) 점 다시 그리기
function drawPlaces(){
  if(!map) return;
  layers.clearLayers();
  const s = cb.getState();
  allPlaces(s).forEach(p => {
    const on = !!s.picked[p.id];
    L.circleMarker([p.lat, p.lng], { radius:on ? 8 : 5, weight:2, color:on ? '#FFFFFF' : '#5A6775', fillColor:on ? '#D96F00' : '#FFFFFF', fillOpacity:1 })
      .bindPopup(`<b>${esc(p.name)}</b><br><button type="button" class="${on ? 'ghost' : 'primary'} small" data-map="toggle" data-v="${esc(p.id)}">${on ? '빼기' : '담기'}</button>`)
      .addTo(layers);
  });
  (s.hotels || []).filter(h => h.lat != null).forEach(h => {
    L.circleMarker([h.lat, h.lng], { radius:7, weight:3, color:'#1D7F47', fillColor:s.hotelPick === h.id ? '#1D7F47' : '#FFFFFF', fillOpacity:1 })
      .bindPopup(`<b>${esc(h.name)}</b><br><span class="fine">숙소 후보</span>`).addTo(layers);
  });
}

// 새 위치 하나를 임시 핀으로: 이름을 고쳐서 담기
function offer(lat, lng, name, addr){
  if(temp) temp.remove();
  temp = L.marker([lat, lng], { icon:L.divIcon({ className:'mspin', iconSize:[22, 22], iconAnchor:[11, 22] }) }).addTo(map);
  info(`<form class="msadd" data-map="add" data-lat="${lat}" data-lng="${lng}">
      <label>이름<input name="name" value="${esc(name)}" maxlength="60" required></label>
      ${addr ? `<p class="fine">${esc(addr)}</p>` : ''}
      <div class="row2"><label>머무는 시간<select name="hours">${[0.5,1,1.5,2,3,4].map(h => `<option value="${h}"${h === 1.5 ? ' selected' : ''}>${h}시간</option>`).join('')}</select></label>
      <div class="msbtn"><button type="submit" class="primary small">이 자리 담기</button></div></div>
    </form>`);
}

async function search(q){
  info('<p class="fine">찾는 중…</p>');
  let list = [];
  try{ list = await nomi('search', { q, limit:'8', countrycodes:'jp', viewbox:'139.40,35.90,140.05,35.45', bounded:'0' }); }
  catch(e){ info('<p class="warnline">검색이 안 됐어요. 인터넷 연결을 확인하고 다시 찾아 주세요.</p>'); return; }
  if(!list.length){ info('<p class="warnline">찾지 못했어요. 일본어 이름이나 영어 이름으로 찾아보거나, 지도를 직접 눌러 담아 주세요.</p>'); return; }
  if(found) found.remove();
  found = L.featureGroup();
  list.forEach((r, i) => L.circleMarker([+r.lat, +r.lon], { radius:9, weight:3, color:'#142030', fillColor:'#FFC57A', fillOpacity:1 })
    .on('click', () => offer(+r.lat, +r.lon, shortName(r), shortAddr(r))).addTo(found));
  if(temp){ temp.remove(); temp = null; }
  found.addTo(map);
  map.fitBounds(found.getBounds().pad(0.3), { maxZoom:16 });
  info(`<ul class="implist">${list.map((r, i) => `<li class="imp"><div class="sbody"><b>${esc(shortName(r))}</b><span>${esc(shortAddr(r))}</span></div>
      <button type="button" class="ghost small" data-map="pick" data-i="${i}">고르기</button></li>`).join('')}</ul>`);
  sheet.__list = list;
}

async function onClick(e){
  const b = e.target.closest('[data-map]'); if(!b) return;
  const a = b.dataset.map;
  if(a === 'close') closeMap();
  else if(a === 'toggle'){ cb.onToggle(b.dataset.v); map.closePopup(); drawPlaces(); }
  else if(a === 'pick'){ const r = sheet.__list[+b.dataset.i]; map.setView([+r.lat, +r.lon], 16); offer(+r.lat, +r.lon, shortName(r), shortAddr(r)); }
}

function onSubmit(e){
  e.preventDefault();
  const f = e.target;
  if(f.dataset.map === 'search'){ const q = f.q.value.trim(); if(q) search(q); }
  else if(f.dataset.map === 'add'){
    cb.onAdd({ name:f.name.value.trim(), lat:+f.dataset.lat, lng:+f.dataset.lng, hours:+f.hours.value });
    if(temp){ temp.remove(); temp = null; }
    drawPlaces();
    info(`<p class="fine"><b>${esc(f.name.value.trim())}</b>을(를) 담았어요. 계속 찾거나 닫기를 눌러 주세요.</p>`);
  }
}

// 지도 누르기 → 그 자리 이름 제안
async function onMapClick(ev){
  const { lat, lng } = ev.latlng;
  offer(lat, lng, '지도에서 고른 곳', '');
  try{
    const r = await nomi('reverse', { lat:String(lat), lon:String(lng), zoom:'18' });
    const f = sheet.querySelector('.msadd');
    if(r && f && +f.dataset.lat === lat && f.name.value === '지도에서 고른 곳') f.name.value = shortName(r) || f.name.value;
  }catch(e){}
}

export async function openMap(callbacks){
  cb = callbacks;
  if(!sheet) buildSheet();
  sheet.hidden = false; document.body.classList.add('noscroll');
  try{ L = await loadLeaflet(); }
  catch(e){ info('<p class="warnline">지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'); return; }
  if(!map){
    map = L.map('msmap', { zoomControl:true }).setView(CENTER, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    layers = L.layerGroup().addTo(map);
    map.on('click', onMapClick);
  }
  setTimeout(() => map.invalidateSize(), 50);   // 숨겨져 있던 칸이라 크기를 다시 재야 함
  drawPlaces(); defaultInfo();
}

export function closeMap(){
  if(!sheet) return;
  sheet.hidden = true; document.body.classList.remove('noscroll');
  if(cb && cb.onClose) cb.onClose();
}
