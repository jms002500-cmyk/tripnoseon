// 앱 진입점: 상태 저장/불러오기, 화면 그리기, 이벤트 처리
import { AREAS, STEPS, DEFAULT, REGIONS, REGION, PLACES, loadRegion, cityOfArea } from './data.js';
import { clone, buildDays, setTripDate, fullAssign, autoPickIds, allPlaces, plan, lockDay, unlockDay, keepLockedAssign, nightHotel, suggestSplit, splitNights, onlyCity, placeCity } from './logic.js';
import { REPLIES, talkWords, pickVoice } from './asktalk.js';
import { VIEWS, SHEET, ASKSHEET, NEARSHEET, DOCSHEET, numSay, pickSearch, vToday, vSafety, vRecord, vHelp, recordHead, moveCtx, idWipeCard, askOrderBox, askCartBar, askBigHtml, askTalkCur } from './views.js';
import { DEST } from './guide.js';
import { recordOf, recordText, photoOf, newPhotoItem, MAX_DAY_PHOTOS } from './record.js';
import { installHint } from './install.js';
import { esc } from './ui.js';
import { askPrompt, askJsonPrompt, askSchema, askParse, receiptLine, composedPrompt, wrapText, planPrompt, parseAiPlaces, matchPlace, aiToPick, askOrder, askTransPrompt, hasHangul, askKeysOf, askCount, askStep, askSplit, askLastList, askLastSave, ASK_LAST, ASK_KEY, ASK_VKEY, ASK_USE, askKeys, askKeyNow, askKeyInfo, askTargets, askErrTag, b64url, pemToDer, jwtClaims, geminiBody, geminiRaw, geminiText, geminiError } from './askai.js';
import { PK_KEY, krAirport, moveKap, parkUrl, parseParking } from './parking.js';
import { busUrl, parseBuses, findBuses, busByNo } from './airbus.js';
import { MTR_STATIONS, mtrUrl, parseNextTrain } from './hktransit.js';
import { hkoWant, hkoDue, hkDates, loadHko, mergeHkoState } from './hko.js';
import { buildIcs } from './ics.js';
import { isEmptyMove, vaultDraft } from './moves.js';
import { travellers, PAX_KINDS } from './pax.js';
import { READ_SCHEMA, readPrompt, readAppPrompt, readParse, readDrafts, mergeReads } from './readdoc.js';
import { parseDocText } from './docparse.js';
import { AIRPORTS, aptOf, normHHMM, hm } from './flight.js';
import { flightDir } from './bookings.js';
import { pdfText, imageText } from './localread.js';
import { applyBooking, applyAll, applyPlace, applyMove, PLACE_KINDS, bookingSpend, bookingSpendOf } from './bookings.js';
import { planText } from './agenda.js';
import { whereOf, tzOffset, HOME_TZ, HERE_FRESH } from './clock.js';
import { catchUp, applyCatchUp } from './catchup.js';
import { phaseOf, shouldAutoOpen, doneKey, tripClock, entryDate } from './today.js';
import { suggestPacking, bulkSuggestions, seedItems, customItems, PACK_GO, KEY_ID, tickFrom } from './packing.js';
import { swapPlan, undoSwap } from './rain.js';
import { parseImport, toRow, rowToPlace, coordsFromUrl, nearTokyo, nearestArea, safeMapUrl, safeHttpsUrl, sharedPlace, stripShare, SHARE_KEYS, parseLines } from './gimport.js';
import { geocode } from './geocode.js';
import { openMap, closeMap, mapOpen, nearbyFood, refreshPlaces } from './gmap.js';
import { mealSlots, foodKey } from './food.js';
import { matchKnown, toCustom, staleGoogle, applyRefresh } from './gplace.js';
import { vacantSearch, partyNote } from './rakuten.js';
import { loadWeather, tripMonthDays, canForecast, ymd, wxStale, keepWeather } from './weather.js';
import { loadFx, convert, addKrw } from './prices.js';
import { isNewer } from './update.js';
import { planTripleImport, applyTripleImport } from './ledgerimport.js';
import { atPlace, parseLine, lineFromAi, previewText, ledgerHint, defaultPayer, defaultDay, dayLabel, partyOf, newSpendId, newPersonId, money, rateOf, ratesOf, mainCur, personUsed, catOf } from './ledger.js';
import { parseWon, setBudget } from './budget.js';
import { ledgerCsv, ledgerCsvName } from './ledgerexport.js';
import { missingBookings, bookings, receiptOf, newReceipt, idCopies, isIdCopy, newIdCopy } from './vault.js';
import { putFile, getFile, delFile, shrinkImage, keepStorage, usage, MAX_FILE } from './vaultdb.js';
import { makeBackup, backupName, parseBackup, summarizeBackup, restoreState, blobToB64, b64ToBlob, safeFileType } from './backup.js';
import { sizeText } from './vault.js';
import * as SH from './share.js';
import { netBanner, fetchTimed, withTimeout } from './net.js';
import { roundLoc, shouldSend, canShareLoc, locExpired, expiredLocs, locToday } from './loc.js';
import { sharedOf, syncedOf, diffShared, mergeRemote, afterPush, inviteLink, parseJoin, describeChange, voteSummary, stampBy, othersChanged } from './sharecore.js';

const S_KEY = 'tripnoseon-v1';
const RK_KEY = 'tripnoseon-rakuten';   // 라쿠텐 키는 일정 상태와 따로 저장 (상태를 내보내거나 백업해도 키는 안 섞이게)
const BK_KEY = 'tripnoseon-before-join';
const RS_KEY = 'tripnoseon-before-restore';   // 백업으로 바꾸기 직전 상태 (되돌리기 취소용)   // 공유 여행에 참여하기 직전 내 일정 (되돌리기용)
const VAULT_STEP = STEPS.indexOf('보관함'), LEDGER_STEP = STEPS.indexOf('가계부'), PACK_STEP = STEPS.indexOf('준비물'), PLAN_STEP = STEPS.indexOf('일정');
let state = load();
state.rkOn = !!rkKeys();
state.sh = freshSh();
let resetArmed = false; let resetTimer = null;
// AI 도우미에 고른 사진 (메모리에만, 저장 안 함) { file, url }
let askPhoto = null;
const ASK_BTN = '<button type="button" class="ghost askbtn" data-act="nearopen" aria-label="내 주변 가볼 만한 곳">📍</button><button type="button" class="ghost askbtn" data-act="askopen" aria-label="사진으로 AI에게 묻기">📷</button>';

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
      if(it){ if(s.hotelCur === 'JPY'){ h.price = it.price; h.pcur = 'JPY'; } h.priceAt = at; h.soldOut = false; if(!h.ko && it.ko) h.ko = it.ko; } else { h.soldOut = true; h.priceAt = at; } });
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
  s.hotels.push({ id:'h' + Date.now().toString(36), name:it.name, ko:it.ko || '', price:wonInUse ? 0 : it.price, pcur:'JPY', mapUrl:'', bookUrl:safeHttpsUrl(it.url), memo,
    lat:has ? it.lat : null, lng:has ? it.lng : null, area:has ? nearestArea(it).key : '', st:has ? 'ok' : 'need', src:'rakuten', approx:false, label:'',
    hotelNo:it.hotelNo, priceAt:s.rk.at, soldOut:false });
  s.hotelMsg = wonInUse ? '가격 통화가 원이라 라쿠텐 엔화 요금은 메모에 넣었어요.' : '';
  if(!has) findHotelLocations();
}

// 여행지 단계에서 날짜가 있으면 날씨를 불러옴. 날짜가 바뀌었거나 예보가 하루 지났으면 다시
function ensureWeather(force){
  const s = state; if((s.step !== 1 && s.step !== PACK_STEP && s.step !== PLAN_STEP && s.mode !== 'today') || !s.start || !s.end || s.wxBusy) return;
  const key = `${s.city}|${tripMonthDays(s.start, s.end).join(',')}`;
  const today = ymd(new Date());
  if(!wxStale(s.wx, key, today, canForecast(s.start, new Date()), force, Date.now())) return;
  s.wxBusy = true;
  loadWeather(s.city, s.start, s.end).then(w => { if(state !== s) return; s.wxBusy = false; s.wx = keepWeather(s.wx, w, Date.now()); save(); render(); });
}

// 홍콩 천문대 9일 예보·지금 날씨·경보 (js/hko.js). 홍콩·선전 여행이고 여행 날짜가 9일 예보 안일 때만, 많아야 30분에 한 번.
//   보내는 것은 자료 종류뿐. 결과 s.hko는 다시 받을 수 있는 칸(backup.js DROP, 공유 안 함)
let hkoBusy = false;
function ensureHko(){
  const s = state; if(hkoBusy || s.city !== 'hksz' || !s.start || !s.end) return;
  if(s.step !== 1 && s.step !== PLAN_STEP && s.mode !== 'today') return;
  const today = tripClock(new Date(), REGION.tz).date; const nowMs = Date.now();
  if(!hkoDue(s.hko, hkoWant(s, today, true), nowMs)) return;   // 30분 안이면 일정 계산도 하지 않음
  const want = hkoWant(s, today, hkDates(plan(s), AREAS).has(today));
  if(!hkoDue(s.hko, want, nowMs)) return;
  hkoBusy = true;
  loadHko(want, nowMs).then(got => { hkoBusy = false; if(state !== s) return; s.hko = mergeHkoState(s.hko, got); save(); render(); });
}

// 숙소 동네·가계부 단계에서 환율을 하루 한 번 받아 둠 (원·엔 가격 비교, 지출 합계)
let fxBusy = false, fxTried = 0;
function ensureFx(){
  const s = state; const today = ymd(new Date());
  if(fxBusy || Date.now() - fxTried < 600000 || (s.fx && s.fx.checked === today && s.fx.rates)) return;
  fxTried = Date.now();
  fxBusy = true;
  loadFx(today).then(fx => { fxBusy = false; if(fx && state === s){ s.fx = fx; save(); render(); } });
}

// 사이트 링크를 누르면 숙소 이름을 클립보드에 (그 사이트 검색창에 붙여넣기)
function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2500);
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-copy]'); if(!a) return;
  const name = a.dataset.copy;
  const ok = () => toast(`'${name}' 이름을 복사했어요. 검색창에 붙여넣어 주세요.`);
  const fail = () => toast(`숙소 이름: ${name} — 검색창에 이 이름을 넣어 주세요.`);
  const legacy = () => {   // 클립보드 API가 막힌 브라우저용
    const ta = document.createElement('textarea'); ta.value = name; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let done = false; try{ done = document.execCommand('copy'); }catch(err){}
    ta.remove(); (done ? ok : fail)();
  };
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(name).then(ok, legacy); else legacy();
});

// 함께 짜기 화면 상태(로그인, 참여자, 투표, 의견, 기록). 기기에 저장하지 않음
function freshSh(){ return { open:false, user:null, authReady:false, trip:null, votes:{}, comments:[], log:[], msg:'', busy:false, pendingJoin:null, cmPlace:null, delArmed:false, hasBackup:hasBackup(), hasRestoreUndo:hasKey(RS_KEY), restore:null, bkmsg:'', bkbusy:false, pkOn:hasKey(PK_KEY) }; }
function hasKey(k){ try{ return !!localStorage.getItem(k); }catch(e){ return false; } }
function hasBackup(){ try{ return !!localStorage.getItem(BK_KEY); }catch(e){ return false; } }

function saveLocal(){ try{ localStorage.setItem(S_KEY, JSON.stringify(state, (k, v) => k === 'sh' ? undefined : v)); }catch(e){} }
function save(){ saveLocal(); schedulePush(); }

/* ---------- 함께 짜기 (공유 여행) ---------- */
let unsubs = [], lastSynced = null, pushTimer = null, userWatching = false;

// Firebase를 불러오고 로그인 상태를 지켜봄 (함께 짜기를 열거나 공유 여행이 있을 때만)
async function startShare(){
  if(userWatching) return; userWatching = true;
  try{
    await SH.watchUser(u => {
      const sh = state.sh; sh.user = u; sh.authReady = true;
      try{ if(u) localStorage.setItem(SIGNED_KEY, '1'); else localStorage.removeItem(SIGNED_KEY); }catch(e){}
      if(u && state.shareId) watchTrip(); else if(!u){ unwatch(); sh.mine = null; } else loadMine(true);
      render();
    });
  }catch(e){ userWatching = false; state.sh.msg = '함께 짜기를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'; state.sh.authReady = true; render(); }
}

// 이 기기에서 구글 로그인을 한 적 있음 → 앱을 열 때 함께 짜기를 바로 이어 붙임 (함께 짜기 창을 안 열어도)
const SIGNED_KEY = 'tripnoseon-signed', NOAUTO_KEY = 'tripnoseon-noauto';
// 이 계정의 공유 여행 (이 기기에 공유 여행이 없을 때): 폰에서 만든 여행을 PC에서 같은 계정으로 로그인해 바로 열게
//   auto: 로그인하자마자·계정이 바뀌어 옛 여행에 못 들어갈 때는 묻지 않고 가장 최근 여행을 엶 (지금 일정은 백업, '함께 짜기'에서 되돌리기).
//   사용자가 이 기기에서 공유를 끊었으면(NOAUTO) 자동으로 다시 열지 않음
async function loadMine(auto){
  const sh = state.sh; if(!sh.user || state.shareId || sh.mineBusy) return;
  sh.mineBusy = true; sh.mineErr = false; render();
  try{ sh.mine = await SH.myTrips(sh.user.uid); }catch(e){ sh.mine = null; sh.mineErr = true; }
  sh.mineBusy = false; render();
  let off = false; try{ off = localStorage.getItem(NOAUTO_KEY) === '1'; }catch(e){}
  const first = (sh.mine || [])[0];
  if(auto && first && !off && !state.shareId && !sh.pendingJoin && !sh.busy){
    sh.pendingJoin = first.id; await shareAct('joinok');
    toast(`이 계정의 함께 짜는 여행 ‘${first.title}’을(를) 열었어요. 다른 기기와 같은 여행이라 어느 쪽에서 고쳐도 바로 보여요.${(sh.mine || []).length > 1 ? ' 다른 여행은 ‘함께 짜기’에서 고를 수 있어요.' : ''}`);
  }
}
function unwatch(){ unsubs.forEach(f => { try{ f(); }catch(e){} }); unsubs = []; }

// 서버가 받아 준 마지막 공유 일정을 이 기기에도 남김(BASE_KEY). 지하철처럼 끊긴 곳에서 고치고 앱을 닫았다가
// 다시 열어도, 그 기준과 지금 일정의 차이를 '아직 못 올린 내 변경'으로 보고 서버 일정 위에 다시 얹어 올림
const BASE_KEY = 'tripnoseon-synced';
function loadBase(id){ try{ const b = JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); return b && b.id === id ? b.p : null; }catch(e){ return null; } }
function saveBase(id, p){ try{ localStorage.setItem(BASE_KEY, JSON.stringify({ id, p })); }catch(e){} }
// 일정을 통째로 바꾸기 전에(백업 되돌리기·참여 전 일정으로) 새 일정의 여행 지역 데이터를 불러옴.
//   안 그러면 화면이 옛 지역의 동네·장소로 그려져서 숙소 동네 화면이 멈추고 장소가 안 보임. 못 불러오면 앱을 열 때처럼 도쿄로
async function useRegionOf(city, sh){
  if(REGION.key === city) return;
  if(!(await loadRegion(city))){ await loadRegion('tokyo'); sh.cityMsg = `${(REGIONS[city] || {}).name || '이 지역'} 데이터를 불러오지 못했어요. 인터넷을 확인하고 다시 열어 주세요.`; }
}
// 다음에 받는 서버 일정을 그대로 따름 (참여·백업 되돌리기·공유 끊기)
function forgetSync(){ lastSynced = null; try{ localStorage.removeItem(BASE_KEY); }catch(e){} }

function watchTrip(){
  unwatch(); const id = state.shareId; if(!id) return;
  unsubs.push(SH.watchTrip(id, (data, mine) => {
    if(state.shareId !== id) return;
    if(!data){ stopShare('공유 여행이 지워졌어요. 이 기기의 일정은 그대로 남아요.'); return; }
    const s = state;
    s.sh.trip = { title:data.title || '', ownerUid:data.ownerUid, members:data.members || {}, memberUids:data.memberUids || [], open:!!data.open, updatedBy:data.updatedBy || null };
    s.sh.votes = data.votes || {};
    if(s.sh.locs) clearExpiredLocs(id, s.sh.locs);   // 주인인지 알게 된 뒤에도 한 번 (위치 목록이 먼저 왔을 때)
    let regionWait = false;
    if(data.p){
      // 아직 서버에 못 올린 내 변경을 기억했다가, 서버 일정을 받은 뒤 그 위에 다시 얹음 (서로 덮어쓰지 않게, sharecore mergeRemote)
      //   앱을 막 열었으면 이 기기에 남긴 기준으로 (끊긴 동안 고친 것)
      const base = lastSynced || loadBase(id);
      const before = { picked:Object.assign({}, s.picked), assign:Object.assign({}, s.assign), fullDay:Object.assign({}, s.fullDay), by:JSON.parse(JSON.stringify(s.by || {})) }, beforePlaces = allPlaces(s);
      const pending = mergeRemote(s, data.p, base);
      if(!mine) whoNotice(before, beforePlaces, data.updatedBy);
      // 가족이 여행 지역을 바꿨거나 다른 지역 여행에 참여함: 그 지역 데이터를 불러온 뒤에 그림 (옛 지역 동네로 그리면 숙소 동네 화면이 멈춤)
      if(REGION.key !== s.city){ regionWait = true; loadRegion(s.city).then(() => renderRemote()); }
      lastSynced = syncedOf(data.p);        // 서버에 있는 모양 그대로 (옛 배열 모양 칸은 처음 고칠 때 통째로 새 모양으로)
      if(!mine) saveBase(id, lastSynced);   // 아직 서버가 안 받은 내 변경이 섞인 일정은 기준으로 남기지 않음
      saveLocal();
      if(pending) schedulePush();
    }
    if(!regionWait) renderRemote();
  }, code => {
    if(code === 'permission-denied') stopShare('이 계정으로는 이 기기에 있던 공유 여행에 들어갈 수 없어요(다른 계정의 여행이거나 여행에서 빠졌어요). 이 기기의 일정은 그대로 남아요.', true);
    else { state.sh.msg = '공유 연결이 끊겼어요. 잠시 후 다시 열어 주세요.'; render(); }
  }));
  unsubs.push(SH.watchComments(id, list => { state.sh.comments = list; renderRemote(); }));
  unsubs.push(SH.watchLog(id, list => { state.sh.log = list; renderRemote(); }));
  unsubs.push(SH.watchLocs(id, list => { state.sh.locs = list; clearExpiredLocs(id, list); if(state.mode === 'today') renderRemote(); }));
}

// 이 기기에서 공유를 끊음 (일정은 마지막 상태 그대로 남김)
function stopShare(msg, auto){
  { const id = state.shareId, u = state.sh.user; if(state.locOn && id && u) SH.clearLoc(id, u.uid).catch(() => {}); }
  state.locOn = false; stopGeo(); state.sh.locs = [];
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();
  const s = state; s.shareId = null; s.sh.trip = null; s.sh.votes = {}; s.sh.comments = []; s.sh.log = []; s.sh.cmPlace = null; s.sh.msg = msg || '';
  if(!auto) try{ localStorage.setItem(NOAUTO_KEY, '1'); }catch(e){}   // 사용자가 끊었으면 로그인해도 자동으로 다시 열지 않음
  s.sh.mine = null; saveLocal(); render(); loadMine(auto);   // 공유를 끊으면 이 계정의 다른 여행을 다시 보여 줌
}

// 남이 내 장소를 빼거나 날짜를 옮김 → 장소 담기·일정 위에 알림(되돌리기). 이 기기 화면에만, 최근 10개
function whoNotice(before, places, upd){
  const s = state, me = s.sh.user && s.sh.user.uid; if(!me || !upd) return;
  const list = othersChanged(before, s, me, upd.uid); if(!list.length) return;
  const day = v => v == null ? '날짜 자동' : v < 0 ? '빼 둠' : `${v + 1}일차`;
  const who = (upd.name || '함께 짜는 사람').slice(0, 20);
  const notes = s.sh.whoNotes = (s.sh.whoNotes || []).filter(x => !list.some(y => y.id === x.id));
  list.forEach(x => {
    const p = places.find(q => q.id === x.id) || allPlaces(s).find(q => q.id === x.id); const name = p ? p.name : '장소';
    notes.unshift(Object.assign(x, { name, full:!!(p && p.full), custom:p && p.custom ? JSON.parse(JSON.stringify(p)) : null,
      text:x.kind === 'gone' ? `${who}님이 내가 담은 '${name}'을(를) 뺐어요.` : `${who}님이 '${name}'을(를) ${day(x.from)} → ${day(x.to)}(으)로 옮겼어요.` }));
  });
  s.sh.whoNotes = notes.slice(0, 10);
  const top = s.sh.whoNotes[0]; toast(`${top.text}${list.length > 1 ? ` 외 ${list.length - 1}건` : ''} 장소 담기·일정 위 '누가 담았는지'에서 되돌릴 수 있어요.`);
}
function whoUndo(i){
  const s = state, x = (s.sh.whoNotes || [])[+i]; if(!x) return;
  s.sh.whoNotes.splice(+i, 1);
  const setDay = v => { delete s.assign[x.id]; delete s.fullDay[x.id]; if(v != null){ if(x.full) s.fullDay[x.id] = v; else s.assign[x.id] = v; } };
  if(x.kind === 'gone'){
    if(x.custom && !(s.custom || []).some(c => c.id === x.id))s.custom.push(Object.assign({}, x.custom));
    if(!allPlaces(s).some(p => p.id === x.id)){ toast('그 장소가 목록에서 지워져서 다시 담지 못했어요.'); save(); render(); return; }
    s.picked[x.id] = true; setDay(x.from); toast(`'${x.name}'을(를) 다시 담았어요.`);
  } else { setDay(x.from); toast(`'${x.name}'을(를) ${x.from == null ? '자동 날짜' : x.from < 0 ? '빼 둠' : `${x.from + 1}일차`}(으)로 되돌렸어요.`); }
  save(); render();
}

function schedulePush(){
  if(!state.shareId || !state.sh || !state.sh.user || !lastSynced) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 500);
}
async function pushNow(){
  pushTimer = null;
  const s = state, id = s.shareId, u = s.sh.user; if(!id || !u || !lastSynced) return;
  if(stampBy(s, lastSynced, u.uid, Date.now())){ saveLocal(); renderRemote(); }   // 누가 담았는지·날짜를 바꿨는지
  const next = sharedOf(s); const changes = diffShared(lastSynced, next); if(!changes.length) return;
  const prev = lastSynced; const text = describeChange(prev, next); lastSynced = afterPush(prev, changes);
  try{
    await SH.pushChanges(id, u, changes);   // 끊긴 동안은 다시 연결돼 서버가 받을 때까지 기다림
    if(state.shareId === id){ const b = loadBase(id); if(b) saveBase(id, afterPush(b, changes)); }
    if(text) SH.addLog(id, u, text).catch(() => {});
  }
  catch(e){ if(state.shareId === id){ lastSynced = prev; s.sh.msg = '바뀐 내용을 공유 여행에 올리지 못했어요. 잠시 후 다시 고쳐 보세요.'; render(); } }
}

async function shareAct(a, v){
  const s = state, sh = s.sh, u = sh.user, id = s.shareId;
  sh.msg = '';
  try{
    switch(a){
      case 'login': await SH.signIn(); break;
      case 'logout': if(s.locOn && id && u){ s.locOn = false; stopGeo(); saveLocal(); SH.clearLoc(id, u.uid).catch(() => {}); } unwatch(); await SH.signOut(); break;
      case 'sharestart': {
        if(!u || sh.busy) return;
        const title = (document.getElementById('sharetitle')?.value || '').trim().slice(0, 40) || '함께 짜는 여행';
        sh.busy = true; render();
        stampBy(s, { picked:{} }, u.uid, Date.now());   // 공유 전에 담은 곳은 만든 사람이 담은 것
        const newId = await SH.createTrip(u, title, sharedOf(s));
        s.shareId = newId; lastSynced = sharedOf(s); saveBase(newId, lastSynced); sh.busy = false; saveLocal(); watchTrip();
        SH.addLog(newId, u, '공유 여행을 만듦').catch(() => {});
        break;
      }
      case 'joinok': {
        const jid = sh.pendingJoin; if(!u || !jid || sh.busy) return;
        sh.busy = true; render();
        try{ localStorage.setItem(BK_KEY, JSON.stringify(s, (k, val) => k === 'sh' ? undefined : val)); }catch(e){}
        try{ await SH.joinTrip(jid, u); }catch(e){ /* 이미 참여한 여행이면 규칙상 거절됨 → 그대로 열어 봄 */ }
        unwatch(); clearTimeout(pushTimer); forgetSync();   // 첫 일정은 서버 것을 그대로 받음
        s.shareId = jid; sh.pendingJoin = null; sh.busy = false; sh.hasBackup = true; saveLocal(); watchTrip();
        try{ localStorage.removeItem(NOAUTO_KEY); }catch(e){}
        SH.addLog(jid, u, (sh.mine || []).some(x => x.id === jid) ? '다른 기기에서 열었음' : '여행에 참여함').catch(() => {});
        break;
      }
      case 'joincancel': sh.pendingJoin = null; break;
      case 'restore': {
        let bk = null; try{ bk = JSON.parse(localStorage.getItem(BK_KEY) || 'null'); }catch(e){}
        if(!bk) return;
        const keepSh = sh; const next = Object.assign(clone(DEFAULT), bk, { shareId:null }); await useRegionOf(next.city, keepSh);
        state = next; state.rkOn = !!rkKeys(); state.sh = keepSh;
        try{ localStorage.removeItem(BK_KEY); }catch(e){} keepSh.hasBackup = false; saveLocal(); break;
      }
      case 'copylink': copyText(inviteLink(location.href, id), '초대 링크를 복사했어요. 카톡이나 문자로 보내 주세요.'); return;
      case 'sendlink': {
        const url = inviteLink(location.href, id);
        if(navigator.share){ try{ await navigator.share({ title:'트립노선', text:`'${sh.trip ? sh.trip.title : '여행'}' 일정을 함께 짜요`, url }); }catch(e){} }
        else copyText(url, '초대 링크를 복사했어요. 카톡이나 문자로 보내 주세요.');
        return;
      }
      case 'linkopen': if(sh.trip) await SH.setOpen(id, !sh.trip.open); break;
      case 'kick': await SH.removeMember(id, v); break;
      case 'leave': await SH.removeMember(id, u.uid); stopShare('공유 여행에서 나왔어요. 이 기기의 일정은 그대로 남아요.'); return;
      case 'unlink': stopShare('이 기기에서 공유를 끊었어요. 일정은 그대로 남아 있고, 초대 링크로 다시 들어갈 수 있어요.'); return;
      case 'sharedel':
        if(!sh.delArmed){ sh.delArmed = true; setTimeout(() => { state.sh.delArmed = false; render(); }, 4000); break; }
        sh.delArmed = false; await SH.deleteTrip(id); stopShare('공유 여행을 지웠어요. 이 기기의 일정은 그대로 남아요.'); return;
      case 'vote': {
        if(!u || !id) return;
        const [pid, val] = v.split('|'); const mine = voteSummary(sh.votes, pid, u.uid).mine; const nv = mine === +val ? 0 : +val;
        sh.votes = Object.assign({}, sh.votes, { [pid]:Object.assign({}, sh.votes[pid], { [u.uid]:nv || undefined }) });   // 화면에 바로
        render(); await SH.setVote(id, u, pid, nv); return;
      }
      case 'cmopen': sh.cmPlace = sh.cmPlace === v ? null : v; break;
      case 'cmdel': await SH.deleteComment(id, v); return;
    }
  }catch(e){ sh.busy = false; sh.msg = shareError(e); }
  render();
}

function shareError(e){
  const c = (e && e.code) || '';
  if(/unauthorized-domain/.test(c)) return '이 주소에서는 구글 로그인을 쓸 수 없어요. Firebase의 승인된 도메인을 확인해 주세요.';
  if(/permission-denied/.test(c)) return '권한이 없어요. 초대 링크가 닫혔거나, 여행 주인만 할 수 있는 일이에요.';
  if(/network|unavailable/.test(c)) return '인터넷 연결을 확인하고 다시 해 주세요.';
  return `함께 짜기에서 문제가 생겼어요 (${c || '알 수 없음'}). 잠시 후 다시 해 주세요.`;
}

function copyText(text, okMsg){
  const ok = () => toast(okMsg);
  const fail = () => toast(/^https?:/.test(text) ? `이 링크를 보내 주세요: ${text}` : `복사가 안 돼요. 직접 적어 주세요: ${text}`);   // 링크가 아닌 것(예약번호 등)은 링크라고 하지 않음
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fail); else fail();
}

function onShareSubmit(f){
  const s = state, u = s.sh.user;
  if(!u || !s.shareId) return;
  const ta = f.querySelector('textarea'); const text = (ta.value || '').trim(); if(!text) return;
  const placeId = f.dataset.place || null; ta.value = '';
  SH.addComment(s.shareId, u, placeId, text).catch(e => { s.sh.msg = shareError(e); render(); });
}

// 다른 사람의 변경(실시간)으로 다시 그릴 때: 글자를 입력하는 중이면 미뤘다가 입력칸을 벗어나면 그림
let renderLater = false;
function typing(){ const a = document.activeElement; return !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(button|checkbox|radio|file)$/.test(a.type))); }
// 화면의 현지 금액 뒤에 원화 참고 금액을 붙임. 데이터·저장값은 그대로 두고 그려진 글자만 바꿈.
//   가계부는 원화 합계를 따로 보여 줘서 뺌. 고르기 칸·입력 칸은 글자가 값이라 건드리지 않음
function showKrw(s){
  const v = document.getElementById('view'); if(!v || (s.step === LEDGER_STEP && !s.mode)) return;
  const rates = ratesOf(s); if(!Object.keys(rates).length) return;
  const yen = s.city === 'tokyo' ? 'JPY' : 'CNY';
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT);
  for(let n = w.nextNode(); n; n = w.nextNode()){
    if(n.parentElement.closest('select,option,textarea,script,style')) continue;
    const t = addKrw(n.nodeValue, rates, yen); if(t !== n.nodeValue) n.nodeValue = t;
  }
}
function renderRemote(){ if(typing()){ renderLater = true; return; } render(); }
document.addEventListener('focusout', () => { if(renderLater){ renderLater = false; setTimeout(() => { if(!typing()) render(); else renderLater = true; }, 0); } });

function render(){
  const s = state;
  if(s.sh && s.sh.pq && (s.mode || STEPS[s.step] !== '장소 담기')) s.sh.pq = '';   // 다른 화면으로 가면 검색을 풂
  document.documentElement.dataset.size = s.textSize || '';   // 큰 글씨 모드 (css html[data-size])
  renderNet(); locSync();
  document.getElementById('line').innerHTML =
    `<span class="fill" style="width:${(s.step / (STEPS.length-1)) * (100 - 100 / STEPS.length)}%"></span>` +
    STEPS.map((l, i) => `<li class="stn${i < s.step ? ' done' : ''}${i === s.step ? ' now' : ''}"><button type="button" data-act="go" data-v="${i}"${i === s.step ? ' aria-current="step"' : ''}><span class="dot"></span><span class="lbl">${l}</span></button></li>`).join('');
  { const c = tripClock(new Date(), REGION.tz); s.sh.today = c.date; s.sh.nowMin = c.min; s.sh.devOff = -new Date().getTimezoneOffset(); s.sh.homeOff = tzOffset(HOME_TZ); }   // 여행지 시각 (폰 시간대가 한국 그대로여도)
  const todayMode = s.mode === 'today', sosMode = s.mode === 'sos', recMode = s.mode === 'record', helpMode = s.mode === 'help';
  if(todayMode || sosMode || recMode || helpMode) document.querySelectorAll('#line .stn.now').forEach(li => { li.classList.remove('now'); li.querySelector('button').removeAttribute('aria-current'); });
  document.getElementById('view').innerHTML = (sosMode || recMode || helpMode ? '' : installCard(s) + idWipeCard(s)) + (sosMode ? vSafety(s) : todayMode ? vToday(s) : recMode ? vRecord(s) : helpMode ? vHelp(s) : VIEWS[s.step](s));
  document.getElementById('line').style.setProperty('--n', STEPS.length);
  document.getElementById('bar').innerHTML = (helpMode
    ? `<button type="button" class="ghost" data-act="tclose">돌아가기</button><button type="button" class="primary" data-act="helpgo" data-v="today">오늘 하루 보기</button>`
    : sosMode
    ? `<button type="button" class="ghost" data-act="tclose">돌아가기</button><button type="button" class="primary" data-act="sbig" data-v="hotel">🏨 숙소 카드</button>`
    : todayMode
    ? `<button type="button" class="ghost" data-act="tclose">계획으로</button><button type="button" class="primary" data-act="lfocus">지출 적기</button>`
    : recMode
    ? `<button type="button" class="ghost" data-act="tclose">계획으로</button><button type="button" class="primary" data-act="rshare">글로 보내기</button>`
    : s.step < STEPS.length-1
    ? `<button type="button" class="ghost prevbtn" data-act="prev" aria-label="이전"${s.step === 0 ? ' disabled' : ''}><span class="pvi" aria-hidden="true">‹</span><span class="pvt">이전</span></button><button type="button" class="primary nextbtn" data-act="next" aria-label="다음 · ${STEPS[s.step+1]}"><small>다음</small><b>${STEPS[s.step+1]}</b></button>`
    : `<button type="button" class="ghost prevbtn" data-act="prev" aria-label="이전"><span class="pvi" aria-hidden="true">‹</span><span class="pvt">이전</span></button><button type="button" class="primary" data-act="lfocus">지출 적기</button>`) + ASK_BTN;
  devBar();
  const rb = document.getElementById('resetBtn');   // '처음부터'는 도움 화면 맨 아래에만
  if(rb){ rb.textContent = resetArmed ? '한 번 더 누르면 지워져요' : '처음부터'; rb.classList.toggle('armed', resetArmed); }
  const hb = document.getElementById('helpBtn'); hb.classList.toggle('on', helpMode); hb.setAttribute('aria-pressed', String(helpMode));
  const tb = document.getElementById('todayBtn');
  tb.hidden = phaseOf(s, s.sh.today).phase === 'none';
  tb.classList.toggle('on', todayMode); tb.setAttribute('aria-pressed', String(todayMode));
  const xb = document.getElementById('sosBtn'); xb.classList.toggle('on', sosMode); xb.setAttribute('aria-pressed', String(sosMode));
  const anySheet = !!s.sh.open || !!(s.sh.ask && s.sh.ask.open) || !!(s.sh.near && s.sh.near.open) || !!s.sh.vdoc;
  document.body.classList.toggle('noscroll', anySheet || (sosMode && !!s.sh.sbig));
  const sb = document.getElementById('shareBtn');
  sb.textContent = s.shareId && s.sh.trip ? `함께 · ${s.sh.trip.memberUids.length}명` : '함께 짜기';
  sb.classList.toggle('on', !!s.shareId);
  const sheet = document.getElementById('sheet');
  const keepScroll = sheet.querySelector('.shbody') ? sheet.querySelector('.shbody').scrollTop : 0;
  if(s.sh.vdoc){ sheet.innerHTML = DOCSHEET(s); }
  else if(s.sh.ask && s.sh.ask.open){ sheet.innerHTML = ASKSHEET(s, askPhoto); const b = sheet.querySelector('.shbody'); if(b) b.scrollTop = keepScroll; }
  else if(s.sh.near && s.sh.near.open){ sheet.innerHTML = NEARSHEET(s); const b = sheet.querySelector('.shbody'); if(b) b.scrollTop = keepScroll; }
  else if(s.sh.open){ sheet.innerHTML = SHEET(s); const b = sheet.querySelector('.shbody'); if(b) b.scrollTop = keepScroll; }
  else sheet.innerHTML = '';
  if(!(sosMode && s.sh.sbig)) document.body.classList.toggle('noscroll', anySheet);
  ensureWeather(false);
  ensureHko();
  ensureFx();
  showKrw(s);
  hydrateThumbs();
  layersSync();
}

/* ---------- 보관함 (예약·티켓, 이 기기에만) ---------- */
const urls = new Map();   // 첨부 id → 화면에 띄울 주소 (한 번 만들면 다시 씀)
async function fileUrl(fid){
  if(urls.has(fid)) return urls.get(fid);
  const rec = await getFile(fid); if(!rec) return null;
  const u = URL.createObjectURL(rec.blob); urls.set(fid, u); return u;
}
function hydrateThumbs(){
  document.querySelectorAll('img[data-fid]:not([src])').forEach(img => { fileUrl(img.dataset.fid).then(u => { if(u) img.src = u; }); });
}
async function refreshUsage(){ const u = await usage(); if(state.sh.vusage !== u){ state.sh.vusage = u; if(state.step === VAULT_STEP) render(); } }

// 고른 파일을 줄여서 IndexedDB에 넣고 항목 첨부 목록에 더함 → 못 넣은 파일 이름들
async function storeFiles(it, list){
  const skipped = [];
  for(const f of list){
    const blob = await shrinkImage(f);
    if(blob.size > MAX_FILE){ skipped.push(f.name); continue; }
    const fid = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try{ await putFile(fid, { blob, name:f.name.slice(0, 80), type:blob.type || f.type, size:blob.size }); it.files.push({ fid, name:f.name.slice(0, 80), type:blob.type || f.type, size:blob.size }); }
    catch(e){ skipped.push(f.name); }
  }
  return skipped;
}

// 지출에 영수증 사진 붙이기 (보관함 항목 kind 'receipt'로, 이 기기에만)
async function addReceipt(spendId, list){
  const s = state; const e = (s.spend || {})[spendId]; if(!e || !list.length) return;
  let it = receiptOf(s.vault, spendId);
  if(!it){ it = newReceipt(spendId, e, 'v' + Date.now().toString(36)); s.vault.push(it); }
  const skipped = await storeFiles(it, list);
  keepStorage(); save(); render(); refreshUsage();
  toast(skipped.length ? '사진이 너무 크거나 저장 공간이 모자라 넣지 못했어요 (파일 하나 15MB까지).'
    : `영수증을 붙였어요.${s.shareId ? ' 사진은 이 기기에만 있어요.' : ''}`);
}

async function saveVault(){
  const s = state, g = id => document.getElementById(id);
  const kind0 = g('vkind').value; let title = g('vtitle').value.trim();
  if(!title && kind0 !== 'flight'){ g('vtitle').focus(); toast('이름을 넣어 주세요.'); return; }
  const picked = Array.from(g('vfiles').files || []);
  const fromRead = !s.vedit && s.vdraft && s.vdraft.fromRead;   // 확인서로 채운 예약이면 그 확인서도 첨부
  // 확인서로 채운 예약: 그 예약이 나온 확인서들(rf)을 따로 붙이고, 한 사람 표인 파일은 그 사람 것으로(rwho)
  const readAtt = fromRead ? (Array.isArray(s.vdraft.rf) ? s.vdraft.rf : vreadFiles.map((f, k) => k)).map(k => ({ f:vreadFiles[k], who:(s.vdraft.rwho || {})[k] || '' })).filter(x => x.f && !picked.some(g => g.name === x.f.name && g.size === x.f.size)) : [];
  const editing = s.vedit ? s.vault.find(x => x.id === s.vedit) : null;
  const it = editing || { id:'v' + Date.now().toString(36), files:[] };
  const kind = g('vkind').value;
  Object.assign(it, { kind, title:title.slice(0, 60), date:g('vdate').value, time:g('vtime').value,
    code:g('vcode').value.trim().slice(0, 40), code2:g('vcode2') ? g('vcode2').value.trim().slice(0, 40) : '', link:safeHttpsUrl(g('vlink').value), memo:g('vmemo').value.trim().slice(0, 300),
    placeId:PLACE_KINDS.includes(kind) ? g('vplace').value || null : null });
  if(kind === 'flight'){
    // 출발·도착 공항(고르거나 쳐서) → 가는 편·오는 편과 여행지 공항을 알아서, 이름은 '가는 편 ICN → HKG'
    const fr = aptOf(g('vfrom').value), to = aptOf(g('vto').value); const aps = (AIRPORTS[s.city] || []).map(a => a.code);
    let dir = g('vdir').value; if(!dir) dir = aps.includes(to.code) ? 'out' : aps.includes(fr.code) ? 'back' : '';
    Object.assign(it, { dir, time2:g('vtime2').value, fno:g('vfno').value.trim().toUpperCase().slice(0, 10), from:fr.code, to:to.code, fromT:fr.code ? '' : fr.text, toT:to.code ? '' : to.text });
    const d2 = flightDir(s, it); it.ap = d2 === 'back' ? (aps.includes(fr.code) ? fr.code : '') : (aps.includes(to.code) ? to.code : '');
    const air = (title.split(' · ')[1] || '').trim();
    it.title = `${d2 === 'back' ? '오는 편' : '가는 편'}${fr.code || fr.text || to.code || to.text ? ` ${fr.code || fr.text || '?'} → ${to.code || to.text || '?'}` : ''}${air ? ` · ${air}` : ''}`.slice(0, 60);
  }
  if(kind === 'hotel') Object.assign(it, { date2:g('vdate2').value, time2:g('vtime2h').value, addr:g('vaddr').value.trim().slice(0, 120), tel:g('vtel').value.trim().slice(0, 30) });
  Object.assign(it, { amt:+g('vamt').value > 0 ? Math.round(+g('vamt').value * 100) / 100 : 0, cur:g('vcur').value || 'KRW' });
  if(!editing && s.vdraft && s.vdraft.moveId) it.moveId = s.vdraft.moveId;
  // 교통 예약 → 어느 이동인지 (공항 픽업·샌딩 등, js/bookings.js applyMove)
  const mvSel = kind === 'transport' && g('vmove') ? g('vmove').value : ''; let mvMsgs = [];
  if(mvSel){ const rm = applyMove(s, it, mvSel); Object.assign(s, rm.patch); mvMsgs = rm.msgs; if(rm.moveId) it.moveId = rm.moveId; }
  else if(kind !== 'transport' || (editing && g('vmove'))) delete it.moveId;
  const mapRaw = kind === 'hotel' ? g('vmap').value.trim() : '';
  const skipped = await storeFiles(it, picked);
  for(const x of readAtt){ const before = it.files.length; skipped.push(...await storeFiles(it, [x.f])); if(x.who && it.files.length > before) it.files[before].who = x.who; }
  // 인원별 티켓 (js/pax.js): 사람마다 번호·사진. 숙소 확인서는 한 장이라 안 받음
  if(PAX_KINDS.includes(kind)){
    const pc = Object.assign({}, it.pcode);
    for(const [i, t] of travellers(s).entries()){
      const c = g('vpc-' + i); if(c){ const val = c.value.trim().slice(0, 40); if(val) pc[t.key] = val; else delete pc[t.key]; }
      const fl = g('vpf-' + i); const L = fl ? Array.from(fl.files || []) : [];
      if(L.length){ const before = it.files.length; skipped.push(...await storeFiles(it, L)); it.files.slice(before).forEach(f => { f.who = t.key; }); }
    }
    if(Object.keys(pc).length) it.pcode = pc; else delete it.pcode;
  }
  if(!editing) s.vault.push(it);
  s.vedit = null; s.vdraft = null;
  const r = applyBooking(s, it, Object.assign({ newId:'h' + Date.now().toString(36) }, hotelPt(mapRaw || it.link)));   // 예약을 일정에 반영 (js/bookings.js)
  Object.assign(s, r.patch); r.msgs.unshift(...mvMsgs);
  if(kind === 'flight' || kind === 'hotel') packTick('tickets');
  // 예약 금액 → 가계부 (js/bookings.js bookingSpend). 여행 전이면 '여행 전'으로
  const sp = bookingSpend(s, it, { by:defaultPayer(s), now:Date.now(), day:cat => defaultDay(s, tripClock(new Date(), REGION.tz).date, cat) });
  if(sp && sp.del) delete s.spend[sp.id]; else if(sp){ s.spend[sp.id] = sp.e; r.msgs.push(`가계부에 ${money(sp.e.amt, sp.e.cur)}`); }
  keepStorage(); save(); render(); refreshUsage();
  if(r.locate) findHotelLocations();
  if(r.msgs.length) toast(`일정에 반영했어요: ${r.msgs.join(' · ')}`);
  if(skipped.length) toast(`${skipped.join(', ')}은(는) 너무 크거나 저장 공간이 모자라 넣지 못했어요 (파일 하나 15MB까지).`);
  if(fromRead && kind === 'flight' && s.sh.vread) s.sh.vread.flown = true;
  if(fromRead) nextDraft();
  else { const card = document.getElementById('v-' + it.id); if(card) card.scrollIntoView({ block:'center' }); }
}

async function deleteVault(id){
  const s = state; const it = s.vault.find(x => x.id === id); if(!it) return;
  for(const f of it.files || []){ try{ await delFile(f.fid); }catch(e){} if(urls.has(f.fid)){ URL.revokeObjectURL(urls.get(f.fid)); urls.delete(f.fid); } }
  s.vault = s.vault.filter(x => x.id !== id); if(s.vedit === id) s.vedit = null;
  save(); render(); refreshUsage();
}

// 첨부 크게 보기: 사진은 화면 가득(QR을 보여 주기 좋게), PDF는 새 창으로. 보내기·이 첨부 지우기
let viewerClose = null;   // 열려 있는 사진 보기 닫기 (뒤로 가기가 씀)
async function openViewer(itemId, fid){
  const it = state.vault.find(x => x.id === itemId); const f = it && (it.files || []).find(x => x.fid === fid); if(!f) return;
  const u = await fileUrl(fid);
  if(!u){ toast('이 첨부를 찾지 못했어요. 이 기기에서 지워졌을 수 있어요.'); return; }
  if(!/^image\//.test(f.type)){
    // PDF만 새 창으로. 다른 종류(HTML·SVG 등)는 이 앱 주소에서 열리면 스크립트가 돌 수 있어서 열지 않음
    const rec = await getFile(fid);
    if(!rec || !rec.blob || rec.blob.type !== 'application/pdf'){ toast('이 첨부는 여기서 열 수 없어요. 사진이나 PDF만 열려요.'); return; }
    window.open(u, '_blank', 'noopener'); return;
  }
  const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', f.name);
  v.innerHTML = `<img src="${u}" alt="">
    <div class="vbar"><button type="button" class="ghost small" data-v="close">닫기</button>
      <button type="button" class="ghost small" data-v="share">보내기</button>
      <button type="button" class="ghost small" data-v="del">이 첨부 지우기</button></div>`;
  if(viewerClose) viewerClose();
  document.body.appendChild(v); document.body.classList.add('noscroll');
  const close = () => { v.remove(); if(viewerClose === close) viewerClose = null; if(!state.sh.open) document.body.classList.remove('noscroll'); layersSync(); };
  viewerClose = close; layersSync();
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-v]'); if(!b){ if(e.target === v) close(); return; }
    if(b.dataset.v === 'close') close();
    else if(b.dataset.v === 'share'){
      const rec = await getFile(fid); const file = new File([rec.blob], rec.name, { type:rec.type });
      if(navigator.canShare && navigator.canShare({ files:[file] })){ try{ await navigator.share({ files:[file], title:it.title }); }catch(err){} }
      else toast('이 브라우저에서는 바로 보내기가 안 돼요. 사진을 길게 눌러 저장한 뒤 보내 주세요.');
    } else if(b.dataset.v === 'del'){
      if(b.dataset.armed !== '1'){ b.dataset.armed = '1'; b.textContent = '한 번 더 누르면 지워져요'; return; }
      try{ await delFile(fid); }catch(err){} URL.revokeObjectURL(u); urls.delete(fid);
      it.files = it.files.filter(x => x.fid !== fid); save(); close(); render(); refreshUsage();
    }
  });
}

function vaultAct(a, v){
  const s = state;
  switch(a){
    case 'vnew': s.vedit = null; s.vdraft = null; render(); focusVaultForm(); return;
    case 'vaddq': { const m = missingBookings(s, bookings(s.vault))[+v]; if(!m) return; s.vedit = null; s.vdraft = m; render(); focusVaultForm(); return; }
    case 'vedit': s.vedit = v; s.vdraft = null; render(); focusVaultForm(); return;
    case 'vcancel': s.vedit = null; s.vdraft = null; s.sh.vread = null; vreadFiles = []; render(); return;
    case 'vreadsend': sendRead(); return;
    case 'fsegdel': { const o = Object.assign({}, s.fsegs); delete o[v]; s.fsegs = o; save(); render(); return; }   // 누가 어느 편에서 한 편 지우기 (보관함 예약은 그대로)
    case 'vreadback': s.sh.vread = null; s.mode = null; s.step = STEPS.indexOf('여행지'); save(); render(); { const b = document.getElementById('flreadfile'); if(b) b.closest('.box').scrollIntoView({ block:'start' }); } return;
    case 'vreadai': aiRead(); return;
    case 'vreadgo': { const j = readParse((document.getElementById('vreadpaste') || {}).value); if(!j){ s.sh.vread = Object.assign({}, s.sh.vread, { err:'답에서 예약 내용을 찾지 못했어요. AI 답 전체를 복사해 붙여 넣어 주세요.' }); render(); return; } useDrafts(readDrafts(s, j)); return; }
    case 'vcopy': { const [vid, w] = String(v).split('|'); const it = s.vault.find(x => x.id === vid); const c = it ? (w === '2' ? it.code2 : it.code) : ''; if(c) copyText(c, `${w === '2' ? '예약 사이트 번호' : '예약번호'} ${c}을(를) 복사했어요.`); return; }
    case 'vpcopy': { const [id, k] = v.split('|'); const it = s.vault.find(x => x.id === id); const c = it && it.pcode && it.pcode[k]; if(c) copyText(c, `번호 ${c}을(를) 복사했어요.`); return; }
    case 'vview': { const [id, fid] = v.split('|'); openViewer(id, fid); return; }
    case 'vdel': {
      // 이 예약 금액으로 만든 가계부 줄이 있으면 두 번째 누름 대신 '같이 지우기 / 예약만 지우기'를 고르게 (vdel2). 그때 이 버튼은 '취소'
      const linked = bookingSpendOf(s, s.vault.find(x => x.id === v));
      if(s.sh.vdel !== v){ s.sh.vdel = v; render(); setTimeout(() => { if(state.sh.vdel === v){ state.sh.vdel = null; render(); } }, linked ? 12000 : 4000); return; }
      s.sh.vdel = null; if(linked){ render(); return; }
      deleteVault(v); return;
    }
    case 'vdel2': { const [id, how] = v.split('|'); if(s.sh.vdel !== id) return; s.sh.vdel = null; deleteBooking(id, how === 'all'); return; }
  }
}
// 예약 지우기 + (고르면) 그 예약 금액으로 만든 가계부 줄과 그 줄의 영수증 사진도
async function deleteBooking(id, withSpend){
  const s = state, sh = s.sh; const linked = bookingSpendOf(s, s.vault.find(x => x.id === id));
  if(withSpend && linked){
    delete s.spend[linked.id]; if(sh.ledit === linked.id) sh.ledit = null; if(sh.lundo === linked.id) sh.lundo = null;
    const rc = receiptOf(s.vault, linked.id); if(rc) await deleteVault(rc.id);
  }
  await deleteVault(id);
  if(linked) toast(withSpend ? `예약과 가계부 지출(${money(linked.e.amt, linked.e.cur)})을 같이 지웠어요.` : '예약만 지웠어요. 가계부 지출은 그대로 있어요.');
}
/* ---------- 백업 · 되돌리기 ---------- */
function downloadBlob(blob, name){
  const u = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}

async function exportBackup(){
  const s = state; const sh = s.sh; if(sh.bkbusy) return;
  const withKeys = !!(document.getElementById('bkkeys') || {}).checked;
  const withId = !!(document.getElementById('bkid') || {}).checked;   // 여권 사본은 고를 때만 백업에
  sh.bkbusy = true; sh.bkmsg = ''; render();
  try{
    const files = []; const vault = (s.vault || []).filter(it => withId || !isIdCopy(it));
    for(const it of vault) for(const f of it.files || []){
      const rec = await getFile(f.fid);
      if(rec) files.push({ fid:f.fid, name:rec.name, type:rec.type, size:rec.size, data:await blobToB64(rec.blob) });
    }
    const now = new Date(); const b = makeBackup(Object.assign({}, s, { vault }), files, withKeys ? rkKeys() : null, now);
    const blob = new Blob([JSON.stringify(b)], { type:'application/json' }); const name = backupName(now);
    const file = new File([blob], name, { type:'application/json' });
    // 폰에서는 공유 창(파일 앱·메일·카톡으로 저장), PC에서는 내려받기
    if(matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files:[file] })){
      try{ await navigator.share({ files:[file], title:'트립노선 백업' }); }
      catch(e){ if(e && e.name === 'AbortError'){ sh.bkbusy = false; render(); return; } downloadBlob(blob, name); }
    } else downloadBlob(blob, name);
    s.lastBackup = stamp(); sh.bkmsg = `백업 파일 ${name}을(를) 만들었어요 (${sizeText(blob.size)}).${withKeys || withId ? ` ${[withKeys ? '라쿠텐 키' : '', withId ? '여권 사본' : ''].filter(Boolean).join('·')}이(가) 들어 있으니 남에게 보내지 마세요.` : ''}`;
    saveLocal();
  }catch(e){ sh.bkmsg = '백업 파일을 만들지 못했어요. 저장 공간을 확인하고 다시 해 주세요.'; }
  sh.bkbusy = false; render();
}

async function readBackupFile(file){
  const sh = state.sh; sh.bkmsg = ''; sh.restore = null;
  let text = ''; try{ text = await file.text(); }catch(e){}
  const r = parseBackup(text);
  if(!r.ok){ sh.bkmsg = r.error; render(); return; }
  sh.restore = { data:r.data, sum:summarizeBackup(r.data), name:file.name }; render();
  const box = document.getElementById('backupbox'); if(box) box.scrollIntoView({ block:'start' });
}

// 백업으로 바꾸기: 첨부를 기기에 다시 넣고, 일정·보관함 목록을 바꿈. 공유 여행이면 일정은 서버 최신 내용을 따름
async function doRestore(){
  const s = state; const sh = s.sh; const rs = sh.restore; if(!rs || sh.bkbusy) return;
  sh.bkbusy = true; render();
  try{ localStorage.setItem(RS_KEY, JSON.stringify(s, (k, v) => k === 'sh' ? undefined : v)); }catch(e){}
  let failed = 0;
  for(const f of rs.data.files || []){
    try{ await putFile(f.fid, { blob:b64ToBlob(f.data, f.type), name:f.name, type:safeFileType(f.type), size:f.size }); }catch(e){ failed++; }
  }
  if(rs.data.rakuten && rs.data.rakuten.key){ try{ localStorage.setItem(RK_KEY, JSON.stringify(rs.data.rakuten)); }catch(e){} }
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();   // 공유 여행이면 서버 일정을 그대로 받음
  const keepIds = idCopies(s.vault).filter(it => !(rs.data.state.vault || []).some(x => x.id === it.id));
  const next = restoreState(rs.data); await useRegionOf(next.city, sh);
  state = next; state.rkOn = !!rkKeys(); state.sh = sh;
  if(keepIds.length) state.vault = (state.vault || []).concat(keepIds);   // 여권 사본은 백업에 고를 때만 들어가서, 없으면 이 기기 것을 남김
  sh.restore = null; sh.bkbusy = false; sh.hasRestoreUndo = true;
  sh.bkmsg = failed ? `백업으로 바꿨지만 첨부 ${failed}개는 저장 공간이 모자라 넣지 못했어요.` : '백업으로 바꿨어요.';
  saveLocal();
  if(state.shareId){ if(sh.user) watchTrip(); else startShare(); }
  render(); refreshUsage();
}

async function undoRestore(){
  let prev = null; try{ prev = JSON.parse(localStorage.getItem(RS_KEY) || 'null'); }catch(e){}
  if(!prev) return;
  const sh = state.sh;
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();
  const next = restoreState({ state:prev }); await useRegionOf(next.city, sh);
  state = next; state.rkOn = !!rkKeys(); state.sh = sh;
  try{ localStorage.removeItem(RS_KEY); }catch(e){}
  sh.hasRestoreUndo = false; sh.bkmsg = '백업으로 바꾸기 전 상태로 돌아왔어요.';
  saveLocal();
  if(state.shareId){ if(sh.user) watchTrip(); else startShare(); }
  render(); refreshUsage();
}

/* ---------- 가계부 (함께 짜기 여행이면 참여자 모두와 공유) ---------- */
// 오늘 하루 화면에서 적으면 그 화면에서 보고 있는 날짜가 기준(날짜를 안 쓰면 그날, '어제'는 그 전날)
function ledgerCtx(){
  const s = state; const today = entryDate(s, new Date(), REGION.tz);   // 여행지 날짜 (폰 시계가 아직 한국 시간이어도)
  return { today, cur:dayCur(s, today), by:defaultPayer(s) };
}
// 통화를 안 썼을 때 기본값: 지역 기본 통화. 홍콩·선전이면 그날(또는 '여기서 쓴 돈' 장소)이 선전 쪽이면 위안
function dayCur(s, date){
  const main = mainCur(s); if(s.city !== 'hksz') return main;
  const lp = s.sh.lplace && allPlaces(s).find(p => p.id === s.sh.lplace);
  if(lp) return cityOfArea(lp.area) === 'sz' ? 'CNY' : 'HKD';
  const d = plan(s).days.find(x => x.key === date); if(!d) return main;
  const pts = d.full ? [d.full] : d.items; const sz = pts.filter(p => cityOfArea(p.area) === 'sz').length;
  return pts.length && sz * 2 > pts.length ? 'CNY' : main;
}
function spentText(e){
  const w = e.cur !== 'KRW' ? convert(e.amt, e.cur, 'KRW', ratesOf(state)) : null;
  return `${e.what} ${money(e.amt, e.cur)}${w ? ` (≈ ${money(w, 'KRW')})` : ''} · ${dayLabel(state, e.d)}`;
}
function focusLine(){ const i = document.getElementById('lline'); if(i) i.focus(); }

// 한 줄 칸 아래에 '이렇게 적혀요' 미리보기 (다시 그리지 않고 글자만 바꿈)
function updatePreview(){
  const i = document.getElementById('lline'), p = document.getElementById('lprev'); if(!i || !p) return;
  const s = state; const ctx = ledgerCtx();
  if(!i.value.trim()){ p.textContent = ledgerHint(s, ctx); p.classList.remove('bad'); return; }
  const r = withPlace(parseLine(i.value, s, ctx));
  p.textContent = r.ok ? `→ ${previewText(s, r.e)}` : r.error; p.classList.toggle('bad', !r.ok);
}
// 가족 식당 상자를 펼치고 접은 것을 기억 (다시 그려도 그대로, views.js eatsBox)
document.addEventListener('toggle', e => { const t = e.target; if(t && t.classList && t.classList.contains('eatbox')) state.sh.eatsOpen = t.open; }, true);
document.addEventListener('input', e => {
  if(e.target.id === 'psearch'){   // 검색 결과만 다시 그림 (입력 칸을 그대로 둬서 한글 조합이 안 끊기게)
    const s = state; s.sh.pq = e.target.value;
    const r = document.getElementById('psres'), b = document.getElementById('pickbody');
    if(r) r.innerHTML = pickSearch(s);
    if(b) b.hidden = !!s.sh.pq.trim();
    showKrw(s); return;
  }
  if(e.target.id === 'lline') updatePreview();
  if(e.target.id === 'aiwant') (state.sh.aiPlan = state.sh.aiPlan || {}).want = e.target.value.slice(0, 100); });

// 오늘 하루 화면에서 장소의 '여기서 쓴 돈'을 눌렀으면 그 장소를 단 지출로
function withPlace(r){
  const id = state.sh.lplace; if(!r.ok || !id) return r;
  const p = allPlaces(state).find(x => x.id === id); return p ? Object.assign({}, r, { e:atPlace(r.e, p) }) : r;
}

function addFromLine(){
  const s = state, sh = s.sh; const inp = document.getElementById('lline');
  const r = withPlace(parseLine(inp ? inp.value : '', s, ledgerCtx()));
  if(!r.ok){ updatePreview(); focusLine(); return; }
  sh.lplace = null;   // 장소는 한 번 적을 때만
  const id = newSpendId(); s.spend[id] = Object.assign(r.e, { at:Date.now() });   // 한 줄에 쓴 이름은 그 지출에만 (기본 낸 사람은 자세히 적기에서 고를 때만 바뀜)
  sh.lmsg = `적었어요 · ${spentText(r.e)}`; sh.lerr = false; sh.lundo = id;
  save(); render(); focusLine();   // 이어서 다음 지출을 적을 수 있게
}

function saveDetail(){
  const s = state, sh = s.sh, g = id => document.getElementById(id);
  const amt = Math.round(+g('lamt').value || 0); if(!(amt > 0) || amt >= 1e9) return;
  const ids = partyOf(s).map(p => p.id); const cat = g('lcat').value;
  const boxes = Array.from(document.querySelectorAll('input[name="lsplit"]'));
  const on = boxes.filter(b => b.checked).map(b => b.value).filter(id => ids.includes(id));
  const editing = sh.ledit && s.spend[sh.ledit] ? s.spend[sh.ledit] : null;
  const e = { d:g('ldate').value, amt, cur:['KRW', 'JPY', 'HKD', 'CNY'].includes(g('lcur').value) ? g('lcur').value : mainCur(s), what:g('lwhat').value.trim().slice(0, 40) || catOf(cat).label, cat,
    pay:g('lpay').value, by:ids.includes(g('lby').value) ? g('lby').value : ids[0],
    split:on.length && on.length < ids.length ? on : null, at:editing ? (editing.at || Date.now()) : Date.now() };
  if(editing && editing.pl) e.pl = editing.pl;   // 장소에서 적은 지출은 고쳐도 장소를 그대로
  const id = editing ? sh.ledit : newSpendId();
  s.spend[id] = e; s.lby = e.by;
  sh.lmsg = `${editing ? '고쳤어요' : '적었어요'} · ${spentText(e)}`; sh.lerr = false; sh.lundo = editing ? null : id; sh.ledit = null; sh.lmore = false;
  save(); render();
}

function ledgerAct(a, v){
  const s = state, sh = s.sh;
  switch(a){
    case 'lfocus': focusLine(); return;
    case 'lex': { const i = document.getElementById('lline'); if(i){ i.value = v; updatePreview(); i.focus(); } return; }
    case 'aipaste': {   // AI 영수증 답에서 가계부 한 줄을 찾아 칸에 채움 (적기는 사용자가 확인하고 누름)
      const t = document.getElementById('aipaste'), i = document.getElementById('lline'); if(!t || !i) return;
      const line = lineFromAi(t.value, state, ledgerCtx());
      if(!line){ toast('금액이 있는 줄을 못 찾았어요. 영수증 합계를 직접 적어 주세요.'); return; }
      i.value = line; updatePreview(); i.focus(); i.scrollIntoView({ block:'center' }); toast('찾은 줄을 채웠어요. 맞으면 \'적기\'를 누르세요.'); return;
    }
    case 'lmore': sh.lmore = true; sh.ledit = null; render(); { const f = document.getElementById('ledgerdetail'); if(f){ f.scrollIntoView({ block:'start' }); document.getElementById('lamt').focus({ preventScroll:true }); } } return;
    case 'ledit': sh.ledit = v; sh.lmore = false; render(); { const f = document.getElementById('ledgerdetail'); if(f) f.scrollIntoView({ block:'start' }); } return;
    case 'lcancel': sh.ledit = null; sh.lmore = false; render(); return;
    case 'lbedit': sh.lbedit = true; render(); { const i = document.getElementById('lbtotal'); if(i) i.focus(); } return;
    case 'lbcats': sh.lbcats = true; render(); return;
    case 'lbdone': sh.lbedit = false; sh.lbcats = false; render(); return;
    case 'lexport': exportLedger(); return;
    case 'lundo': if(sh.lundo && s.spend[sh.lundo]){ delete s.spend[sh.lundo]; sh.lmsg = '방금 적은 지출을 지웠어요.'; } sh.lundo = null; break;
    case 'ldel':
      if(sh.ldel !== v){ sh.ldel = v; render(); setTimeout(() => { if(state.sh.ldel === v){ state.sh.ldel = null; render(); } }, 4000); return; }
      sh.ldel = null; delete s.spend[v]; if(sh.ledit === v) sh.ledit = null; if(sh.lundo === v) sh.lundo = null;
      { const rc = receiptOf(s.vault, v); if(rc) deleteVault(rc.id); }   // 붙인 영수증 사진도 같이
      break;
    case 'lpadd': { const p = partyOf(s).map(x => Object.assign({}, x)); if(p.length >= 12) return;
      p.push({ id:newPersonId(), name:`사람 ${p.length + 1}` }); s.party = p; break; }
    case 'lpdel': if(personUsed(s, v) || partyOf(s).length < 2) return; s.party = partyOf(s).filter(p => p.id !== v); if(s.lby === v) s.lby = null; break;
    case 'limpok': {
      const p = sh.limp; if(!p || !p.items.length) return;
      const out = applyTripleImport(s, p, k => k === 'x' ? newSpendId() : newPersonId(), Date.now());
      s.party = out.party; Object.assign(s.spend, out.spend);
      sh.limp = null; sh.limpBad = false; sh.limpMsg = `트리플 가계부에서 지출 ${p.items.length}건을 가져왔어요.`;
      break;
    }
    case 'limpcancel': sh.limp = null; sh.limpMsg = ''; break;
    case 'lpmembers': {
      // 기본 '나'만 있고 아직 쓰인 데가 없으면 '나' 대신 참여자 이름으로
      let p = partyOf(s).map(x => Object.assign({}, x));
      if(!s.party.length && !personUsed(s, 'me')) p = [];
      Object.values((sh.trip && sh.trip.members) || {}).forEach((m, i) => {
        const n = String(m.name || '').slice(0, 12); if(n && !p.some(x => x.name === n) && p.length < 12) p.push({ id:newPersonId(), name:n });
      });
      if(p.length) s.party = p; break;
    }
  }
  save(); render();
}

// 엑셀 내보내기: 폰에서는 공유 창(카톡·메일·파일 앱), 안 되면·PC에서는 내려받기
async function exportLedger(){
  const sh = state.sh; const now = new Date(); const name = ledgerCsvName(now);
  try{
    const blob = new Blob([ledgerCsv(state)], { type:'text/csv;charset=utf-8' });
    const file = new File([blob], name, { type:'text/csv' });
    if(matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files:[file] })){
      try{ await navigator.share({ files:[file], title:'트립노선 가계부' }); }
      catch(e){ if(e && e.name === 'AbortError') return; downloadBlob(blob, name); }
    } else downloadBlob(blob, name);
    sh.lxmsg = `${name} 파일을 만들었어요. 엑셀에서 열면 돼요.`; sh.lxbad = false;
  }catch(e){ sh.lxmsg = '파일을 만들지 못했어요. 잠시 후 다시 눌러 주세요.'; sh.lxbad = true; }
  render();
}

// 확인서로 채운 칸은 읽은 결과 글부터 보이게(자판 안 올림)
function showReadResult(){ const b = document.getElementById('vread'); if(b) b.scrollIntoView({ block:'start' }); }
function focusVaultForm(){ const f = document.getElementById('vaultform'); if(f){ f.scrollIntoView({ block:'start' }); document.getElementById('vtitle').focus({ preventScroll:true }); } }

function unpick(s, id){ delete s.picked[id]; delete s.must[id]; delete s.assign[id]; delete s.fullDay[id]; }

// 구글 지도 가져오기: 대기 목록에 올리고, 좌표 없는 곳은 바로 이름으로 위치 찾기 시작
function addImports(list){
  const s = state; const base = Date.now().toString(36);
  const have = new Set(allPlaces(s).flatMap(p => [p.name, p.ja]).concat(s.imports.map(r => r.name)).filter(Boolean).map(n => n.toLowerCase()));
  list.forEach((x, i) => { const r = toRow(x, `i${base}${i}`); if(x.q) r.q = x.q; if(have.has(r.name.toLowerCase())){ r.dup = true; r.skip = true; } s.imports.push(r); });
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
      // q: AI 추천의 현지 이름(영어·한자). 그걸로 먼저 찾고, 못 찾으면 한국어 이름으로 (1초에 1번은 geocode.js가 지킴)
      const hit = (r.q && await geocode(r.q)) || await geocode(r.name);
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
  s.hotels.push({ id:'h' + Date.now().toString(36), name:name.slice(0, 60), price:Math.max(0, Math.round(+val('hprice') || 0)), pcur:s.hotelCur,
    mapUrl:safeMapUrl(mapRaw), bookUrl:safeHttpsUrl(bookRaw), memo:val('hmemo').slice(0, 80),
    lat:has ? pt.lat : null, lng:has ? pt.lng : null, area:has ? nearestArea(pt).key : '', st:has ? 'ok' : 'need', src:has ? 'link' : '', approx:false, label:'' });
  save(); render();
  if(!has) findHotelLocations();
}

// 구글 지도 시트: 담은 곳 핀, 장소 카드에서 '몇 일차에 담기'로 바로 일정에
//   g: 구글 장소(gplace.toCustom이 받는 모양) | null(이미 담은 곳 날짜만 옮길 때, knownId)
//   이미 있는 도쿄 장소(65곳)와 같은 곳이면 그 장소를, 전에 담은 구글 장소면 그것을 다시 씀
function openLiveMap(query){
  const opened = openMap({
    getState: () => state,
    getDays: () => buildDays(state).map(d => ({ i:d.i, label:`${d.i + 1}일차 · ${d.label}` })),
    onToggle: id => { const s = state; if(s.picked[id]) unpick(s, id); else s.picked[id] = true; save(); render(); },
    onPick: (g, day, knownId) => {
      const s = state; let p = knownId ? allPlaces(s).find(x => x.id === knownId) : g && (matchKnown(g) || (s.custom || []).find(c => c.gid && c.gid === g.id));
      if(!p && g){ p = toCustom(g, 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), Date.now()); s.custom.push(p); }
      if(!p) return '';
      s.picked[p.id] = true;
      if(day != null){ if(p.full) s.fullDay[p.id] = day; else s.assign[p.id] = day; }
      else { delete s.assign[p.id]; delete s.fullDay[p.id]; }   // '날짜는 자동으로'를 고르면 정해 둔 날·빼 둠(-1)을 풀고 일정 짜기에 맡김
      save(); render(); return p.name;
    },
    onClose: () => render()
  }, query);
  layersSync(); return opened;
}

function importRowOf(k){ return state.imports.find(r => r.k === k); }

function act(a, v){
  const s = state; let scroll = false;
  if(s.sh.cuMsg && !/^cu/.test(a)){ s.sh.cuMsg = ''; s.sh.cuUndo = null; }   // 남은 일정 옮기기 알림은 다른 걸 누르면 닫음
  switch(a){
    case 'go': s.step = +v; s.mode = null; scroll = true; break;
    case 'prev': s.step = Math.max(0, s.step-1); scroll = true; break;
    case 'next': s.step = Math.min(STEPS.length-1, s.step+1); scroll = true; break;
    case 'topen': s.mode = s.mode === 'today' ? null : 'today'; s.tday = null; scroll = true; break;
    case 'tclose': s.mode = null; s.sh.sbig = null; scroll = true; break;
    case 'sos': packTick('appsos'); s.mode = s.mode === 'sos' ? null : 'sos'; s.sh.sbig = null; scroll = true; break;
    case 'helpopen': s.mode = s.mode === 'help' ? null : 'help'; scroll = true; break;
    case 'helpgo': goTo(v); return;
    case 'nearopen': s.sh.near = Object.assign({}, s.sh.near, { open:true }); if(s.sh.ask) s.sh.ask.open = false; s.sh.open = false;
      if(!s.sh.near.pt || Date.now() - (s.sh.near.at || 0) > 3 * 60000) nearLocate(); else render(); return;   // 3분 안에 찾은 위치는 다시 씀
    case 'nearagain': nearLocate(true); return;
    case 'nearclose': if(s.sh.near) s.sh.near.open = false; render(); return;
    case 'vdoc': s.sh.vdoc = v; render(); return;   // 일정 줄의 서류 바로가기 (js/docs.js)
    case 'vdocclose': s.sh.vdoc = null; render(); return;
    case 'vdocedit': s.sh.vdoc = null; s.mode = null; s.step = VAULT_STEP; s.vedit = v; s.vdraft = null; save(); render(); focusVaultForm(); return;
    case 'nearpick': { const p = allPlaces(s).concat(PLACES).find(x => x.id === v); if(!p) return; s.picked[p.id] = true; toast(`'${p.name}'을(를) 담았어요.`); break; }
    case 'neartoday': {   // 오늘 일정에 넣기 (하루 종일 장소는 그날을 통째로)
      const p = allPlaces(s).concat(PLACES).find(x => x.id === v); const d = buildDays(s).find(x => x.key === s.sh.today); if(!p || !d) return;
      s.picked[p.id] = true; if(p.full){ s.fullDay[p.id] = d.i; delete s.assign[p.id]; } else { s.assign[p.id] = d.i; delete s.fullDay[p.id]; }
      toast(`'${p.name}'을(를) 오늘(${d.i + 1}일차) 일정에 넣었어요.`); break;
    }
    case 'whofocus': s.sh.whoFocus = v || null; render(); return;
    case 'whoundo': whoUndo(v); return;
    case 'whook': (s.sh.whoNotes || []).splice(+v, 1); render(); return;
    case 'helpjump': { const b = document.getElementById('help-' + v); if(b) b.scrollIntoView({ block:'start' }); return; }
    case 'sbig': s.sh.sbig = v || null; s.sh.sreply = null; s.sh.snum = ''; if(v && s.mode !== 'sos') s.mode = 'sos'; break;
    case 'sreply': s.sh.sreply = s.sh.sreply === v ? null : v; render(); { const o = document.querySelector('.sosover'); if(o) o.scrollTop = 0; } return;
    case 'snum': s.sh.snum = (document.getElementById('snumin') || {}).value || ''; render(); { const o = document.querySelector('.sosover'); if(o) o.scrollTop = 0; } return;
    case 'sbigspeak': { const o = document.querySelector('.sosover'), x = o && o.querySelector('[data-say]'); if(x) speakIn(o.lang, x.dataset.say); return; }   // 크게 보여 주기 (직원·택시 기사에게)
    case 'tday': s.tday = +v; s.sh.lplace = null; break;
    case 'locask': s.sh.locAsk = true; s.sh.locMsg = ''; break;
    case 'loccancel': s.sh.locAsk = false; break;
    case 'locon': s.sh.locAsk = false; s.sh.locMsg = ''; s.locOn = true; locLast = null; saveLocal(); render(); return;
    case 'locoff': locOff('위치 보여 주기를 껐어요. 서버에 있던 내 위치도 지웠어요.'); return;
    case 'tspend': {   // 장소에서 바로 비용 적기: 아래 '이날 쓴 돈' 칸에 그 장소를 달아 둠
      s.sh.lplace = v; render();
      const f = document.getElementById('ledgerform'); if(f) f.scrollIntoView({ block:'center' }); focusLine(); updatePreview(); return;
    }
    case 'lplacex': s.sh.lplace = null; render(); focusLine(); return;
    case 'tdone': {   // 다녀옴 표시: 오늘 화면에서 보고 있는 날짜 기준
      const k = doneKey(entryDate(s, new Date(), REGION.tz), v); s.tdone = Object.assign({}, s.tdone);   // 화면(vToday)과 같은 여행지 날짜
      if(s.tdone[k]) delete s.tdone[k]; else s.tdone[k] = true; break;
    }
    case 'who': s.who = v; if(v === 'solo') s.adults = 1; else if(v === 'couple') s.adults = 2; break;
    case 'adults': s.adults = Math.min(10, Math.max(1, s.adults + (+v))); break;
    case 'kidadd': if(s.kids.length < 5) s.kids.push(8); break;
    case 'kiddel': s.kids.splice(+v, 1); break;
    case 'style': s.styles = s.styles.includes(v) ? s.styles.filter(x => x !== v) : s.styles.concat(v); break;
    case 'pace': s.pace = v; break;
    case 'city': {   // 여행 지역 바꾸기: 그 지역 데이터를 불러온 뒤 바꿈 (전에 담은 다른 지역 장소·숙소 후보는 숨김)
      if(v === s.city) return;
      s.sh.cityMsg = '';
      loadRegion(v).then(ok => {
        if(!ok){ state.sh.cityMsg = `${(REGIONS[v] || {}).name || '이 지역'} 데이터를 아직 준비 중이에요. 조금 뒤에 다시 눌러 주세요.`; loadRegion(state.city); render(); return; }
        const t = state; t.city = v; t.country = REGIONS[v].country; t.hotelArea = null; t.hotelCur = REGIONS[v].cur; t.wx = null; t.hko = null;
        save(); render();
      });
      return;
    }
    case 'cityonly': {   // 홍콩만·선전만·둘 다. 다른 도시에 정해 둔 숙소 동네·숙소·밤은 풀어 둠 (담은 장소는 숨기기만)
      s.cityOnly = v === 'hk' || v === 'sz' ? v : '';
      const c = onlyCity(s); if(!c) break;
      if(s.hotelArea && cityOfArea(s.hotelArea) !== c) s.hotelArea = null;
      const hp = (s.hotels || []).find(h => h.id === s.hotelPick); if(hp && hp.lat != null && placeCity(hp) !== c) s.hotelPick = null;
      Object.keys(s.nights || {}).forEach(k => { const id = s.nights[k]; const h = String(id).startsWith('area:') ? { area:id.slice(5) } : (s.hotels || []).find(x => x.id === id);
        if(!h || (h.area ? cityOfArea(h.area) : h.lat != null ? placeCity(h) : c) !== c) delete s.nights[k]; });
      s.areaFilter = 'all';
      break;
    }
    case 'anchor': if(s.must[v]) unpick(s, v); else { s.must[v] = true; s.picked[v] = true; } break;
    case 'pick': if(s.picked[v]) unpick(s, v); else s.picked[v] = true; break;
    case 'gsave':   // ⭐ 내 구글 지도에 저장: 링크(구글 지도 앱 열기)는 그대로 가고 '저장함' 표시만 (이 기기에만). 지금 다시 그리면 누른 링크가 사라져서 조금 뒤에
      s.gsaved = Object.assign({}, s.gsaved, { [v]:Date.now() }); s.sh.gsLast = v; saveLocal(); setTimeout(render, 400); return;
    case 'gunsave': s.gsaved = Object.assign({}, s.gsaved); delete s.gsaved[v]; if(s.sh.gsLast === v) s.sh.gsLast = null; saveLocal(); render(); return;
    case 'must': if(s.must[v]) delete s.must[v]; else { s.must[v] = true; s.picked[v] = true; } break;
    case 'filter': s.areaFilter = v; break;
    case 'kfilter': s.kindFilter = v; break;
    case 'theme': s.themeFilter = v === 'all' || s.themeFilter === v ? 'all' : v; break;   // 같은 테마를 다시 누르면 풀림
    // 목록 끝의 테마 버튼: 동네·종류 거르기를 풀고 새 목록의 맨 위로
    case 'themenext': s.themeFilter = v; s.areaFilter = 'all'; s.kindFilter = 'all'; save(); render(); goTo('picklist'); return;
    case 'refresh': applyUpdate(); return;
    case 'akind': s.anchorKind = v; break;
    case 'autopick': autoPickIds(s).forEach(id => { s.picked[id] = true; }); break;
    case 'customdel': s.custom = s.custom.filter(c => c.id !== v); unpick(s, v); break;
    case 'hotel': s.hotelArea = s.hotelArea === v ? null : v; break;
    // 홍콩·선전 나눠 자기: 추천대로 밤마다 동네 정하기 / 한 도시의 동네만 바꾸기 (다른 도시 밤은 그대로)
    case 'splitstay': { const sp = suggestSplit(s); if(sp) s.nights = splitNights(s, sp); break; }
    case 'splitarea': { const c = cityOfArea(v); const sp = suggestSplit(s); const o = {}; let hit = false;
      buildDays(s).slice(0, -1).forEach(d => { const cur = nightHotel(s, d.key);
        if(cityOfArea(cur.key) === c){ o[d.key] = 'area:' + v; hit = true; } else o[d.key] = (s.nights || {})[d.key] || 'area:' + cur.key; });
      if(!hit && sp) Object.entries(splitNights(s, sp)).forEach(([k, x]) => { if(cityOfArea(x.slice(5)) === c) o[k] = 'area:' + v; });
      s.nights = o; break; }
    case 'replan': {   // 확정한 날과 예약한 표로 정한 날(js/bookings.js applyPlace)은 남김
      s.assign = keepLockedAssign(s);
      bookings(s.vault).filter(it => PLACE_KINDS.includes(it.kind) && it.placeId).forEach(it => Object.assign(s, applyPlace(s, it).patch));
      break;
    }
    case 'dlock': lockDay(s, +v); toast(`${+v + 1}일차를 확정했어요. 이날 장소는 자동으로 바뀌지 않아요.`); break;
    case 'dunlock': unlockDay(s, +v); break;
    case 'impfind': findLocations(); return;
    case 'aiplansend': sendPlanAsk(); return;
    case 'pkcheck': checkParking(v); return;
    case 'busfind': findAirBus(v, ''); return;
    case 'mtrnext': { const i = v.indexOf('|'); mtrNext(v.slice(0, i), v.slice(i + 1)); return; }
    case 'buspick': setMove(s.sh.mvEdit, () => ({ bus:v })); break;
    case 'pkforget': try{ localStorage.removeItem(PK_KEY); }catch(e){} s.sh.pkOn = false; s.sh.park = null; render(); return;
    case 'aiplanread': {   // AI 답에서 장소 이름을 읽어 우리 목록과 맞춰 봄
      const t = document.getElementById('aiplanpaste'); const ap = s.sh.aiPlan = s.sh.aiPlan || {};
      const list = parseAiPlaces(t ? t.value : ''); const places = allPlaces(s);
      ap.found = list.map(x => Object.assign(x, { id:matchPlace(x, places) }));
      ap.msg = list.length ? '' : (t && t.value.trim() ? '답에서 장소 이름을 못 찾았어요. 답 끝의 [담기 목록]까지 통째로 복사했는지 봐 주세요.' : 'AI 답을 먼저 붙여 넣어 주세요.');
      render(); return;
    }
    case 'aiplanpick': { const n = aiToPick((s.sh.aiPlan || {}).found, allPlaces(s), s.picked);
      n.forEach(id => { s.picked[id] = true; }); if(n.length) toast(`${n.length}곳을 담았어요.`); break; }
    case 'aiplanimport': {   // 목록에 없는 곳 → 구글 지도 가져오기의 대기 목록(이름으로 위치 찾기 → 확인 → 담기)
      const ap = s.sh.aiPlan || {}; const places = allPlaces(s);
      const rest = (ap.found || []).filter(x => !(x.id && places.some(p => p.id === x.id)) && !x.sent);
      if(!rest.length) return;
      rest.forEach(x => { x.sent = true; });
      addImports(rest.map(x => ({ name:x.name, url:'', note:x.local ? `AI 추천 · ${x.local}` : 'AI 추천', lat:null, lng:null, q:x.local })));
      toast(`${rest.length}곳의 위치를 찾고 있어요. 아래 '가져온 곳'에서 확인하고 담아 주세요.`);
      return;
    }
    case 'aiplanclear': s.sh.aiPlan = { want:(s.sh.aiPlan || {}).want || '' }; break;
    case 'hfind': findHotelLocations(); return;
    case 'mapopen': openLiveMap(); return;
    case 'wxretry': ensureWeather(true); return;
    case 'hpick': s.hotelPick = s.hotelPick === v ? null : v; break;
    case 'hdel': s.hotels = s.hotels.filter(h => h.id !== v); if(s.hotelPick === v) s.hotelPick = null;
      s.nights = Object.fromEntries(Object.entries(s.nights || {}).filter(([, id]) => id !== v)); break;
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
    case 'vnew': case 'vaddq': case 'vedit': case 'vcancel': case 'vcopy': case 'vpcopy': case 'vview': case 'vreadsend': case 'vreadai': case 'vreadback': case 'vreadgo': case 'fsegdel': case 'vdel': case 'vdel2': vaultAct(a, v); return;
    case 'vapply': applyVaultAll(); return;
    case 'idwipe':
      if(!s.sh.idwipe){ s.sh.idwipe = true; render(); setTimeout(() => { if(state.sh.idwipe){ state.sh.idwipe = false; render(); } }, 4000); return; }
      s.sh.idwipe = false; wipeIdCopies(); return;
    case 'idlater': { const d = new Date(); d.setDate(d.getDate() + 3); s.idLater = ymd(d); toast('3일 뒤에 다시 알려 드릴게요.'); break; }
    case 'tfood': s.mode = 'today'; s.tday = +v; save(); render(); { const b = document.getElementById('foodbox'); if(b) b.scrollIntoView({ block:'start' }); } return;
    case 'ffind': {   // 끼니 자리 근처 식당 (구글)
      const [di, k] = v.split('|').map(Number); const P = plan(s); const d = P.days[di]; const m = d && mealSlots(d, d.from, d.to)[k]; if(!m) return;
      const key = foodKey(m.at); s.sh.food = Object.assign({}, s.sh.food, { [key]:{ busy:true } }); render();
      withTimeout(nearbyFood(m.at), 20000).then(items => { state.sh.food[key] = { items }; render(); })
        .catch(e => { console.warn('식당 찾기 실패', e); state.sh.food[key] = { err:e && e.message === 'nokey' ? '구글 지도 키를 넣으면 근처 식당을 찾을 수 있어요. 지금은 아래 \'구글 지도에서 더 보기\'를 써 주세요.' : '식당을 못 불러왔어요. 인터넷 연결을 확인하고 다시 눌러 주세요.' }; render(); });
      return;
    }
    case 'fadd': {   // 찾은 식당을 그날 일정에
      const [di, k, rid] = v.split('|'); const P = plan(s); const d = P.days[+di]; const m = d && mealSlots(d, d.from, d.to)[+k];
      const r = m && ((s.sh.food || {})[foodKey(m.at)] || {}).items; const g = r && r.find(x => x.id === rid); if(!g) return;
      let p = (s.custom || []).find(c => c.gid === g.id);
      if(!p){ p = toCustom({ id:g.id, name:g.name, lat:g.lat, lng:g.lng, types:['restaurant'], periods:g.periods }, 'g' + Date.now().toString(36), Date.now()); s.custom.push(p); }
      s.picked[p.id] = true; s.assign[p.id] = +di; toast(`'${p.name}'을(를) ${+di + 1}일차에 넣었어요.`); break;
    }
    case 'ropen': s.sh.ropen = s.sh.ropen === +v ? null : +v; break;
    case 'tpass': s.sh.tpass = !s.sh.tpass; break;
    case 'rswap': {   // 비 오는 날: 실외 장소는 빼두고 실내 장소를 그날에 (함께 짜기 여행이면 가족 일정도 바뀜)
      const [outId, inId, di] = v.split('|'); const all = allPlaces(s); const name = id => (all.find(p => p.id === id) || {}).name || '';
      const keep = ((plan(s).days[+di] || {}).items || []).map(p => p.id);
      s.sh.rundo = Object.assign(swapPlan(s, outId, inId, +di, keep), { day:+di, outName:name(outId), inName:name(inId) }); break;
    }
    case 'rundo': if(s.sh.rundo){ undoSwap(s, s.sh.rundo); s.sh.rundo = null; } break;
    case 'rfull': {   // 하루 종일 장소를 비 안 오는 날로 (겹치는 다른 하루 종일 장소와는 날을 맞바꿈)
      const [id, to] = v.split('|'); const fa = fullAssign(s, buildDays(s)); const prev = fa[id];
      Object.keys(fa).forEach(k => { if(k !== id && fa[k] === +to) s.fullDay[k] = prev; }); s.fullDay[id] = +to; break;
    }
    case 'pkseed': Object.assign(s.pack, seedItems(bulkSuggestions(s.pack, suggestPacking(s, s.wx)), Date.now())); packDone(); break;   // 앱에 챙겨 두기는 하나씩 골라 담기
    case 'pkone': { const x = suggestPacking(s, s.wx).find(y => y.key === v); if(x) Object.assign(s.pack, seedItems([x], Date.now())); packDone(); break; }
    case 'pkchk': { const it = s.pack[v]; if(!it) return; it.done = !it.done; it.doneBy = it.done && s.shareId && s.sh.user ? s.sh.user.name : ''; break; }
    case 'pkdel': { const it = s.pack[v]; if(!it) return; if(it.src){ it.hide = true; it.done = false; } else delete s.pack[v]; break; }   // 추천에서 온 건 숨겨서 다시 추천하지 않음
    case 'pkfilter': s.pfilter = v; break;
    case 'pkgo': goTo(PACK_GO[v]); return;   // 앱 안에서 하는 준비물 → 그 화면으로
    case 'prepgo': goTo(v); return;
    case 'prepchk': s.prep = Object.assign({}, s.prep, { [v]:!(s.prep || {})[v] }); break;
    case 'itc': s.flight = Object.assign({ ap:'', arr:'', dep:'' }, s.flight, { itc:!(s.flight || {}).itc }); break;
    case 'whereami': checkWhere(true); return;
    case 'mapgo': { const c = document.getElementById('pc-' + v); if(c){ c.scrollIntoView({ block:'start' }); flash(c); } return; }   // 약도 번호 → 그 카드
    case 'mapback': { const m = document.querySelector('#view .map') || document.querySelector('.map'); if(m){ m.scrollIntoView({ block:'start' }); const k = document.getElementById('mk-' + v); if(k) flash(k); } return; }   // 카드 → 약도의 그 번호
    case 'plansend': {   // 가족 단톡용 일정표 (js/agenda.js planText). 공유 창이 없으면 복사
      const P = plan(s); const text = planText(s, P, moveCtx(s, P), recordHead(s));
      if(navigator.share) navigator.share({ text }).catch(() => {});
      else clipText(text).then(ok => toast(ok ? '일정을 복사했어요. 단톡방에 붙여 넣으세요.' : '복사가 안 됐어요.'));
      return;
    }
    case 'lfocus': case 'lex': case 'aipaste': case 'lmore': case 'ledit': case 'lcancel': case 'lundo': case 'ldel': case 'lpadd': case 'lpdel': case 'lpmembers': case 'limpok': case 'limpcancel':
    case 'lbedit': case 'lbcats': case 'lbdone': case 'lexport':
      ledgerAct(a, v); return;
    case 'bkexport': exportBackup(); return;
    case 'bkrestore': doRestore(); return;
    case 'bkcancel': s.sh.restore = null; render(); return;
    case 'bkundo': undoRestore(); return;
    case 'shareopen': s.sh.open = true; startShare(); if(s.sh.user && !s.shareId) loadMine(); render(); return;
    case 'mineopen': s.sh.pendingJoin = v; render(); return;   // 내 계정의 여행을 이 기기에서 열기 → 참여 확인(지금 일정은 백업)과 같은 길
    case 'mineagain': loadMine(); return;
    case 'shareclose': s.sh.open = false; render(); return;
    case 'cumove': case 'cuall': {   // 늦었을 때 남은 일정 옮기기 (오늘 남기는 곳은 오늘에 고정)
      const P = plan(s); const di = P.days.findIndex(d => d.key === s.sh.today); if(di < 0) return;
      let moves = {};
      if(a === 'cumove'){ const [id, j] = String(v).split('|'); moves[id] = +j; }
      else { const c = catchUp(s, P, di, s.sh.today, s.sh.nowMin); if(!c) return; c.drop.forEach(x => { moves[x.p.id] = x.to != null ? x.to : -1; }); }
      s.sh.cuUndo = { assign:clone(s.assign), dlock:clone(s.dlock || {}) }; Object.assign(s, applyCatchUp(s, P, di, moves));
      const n = Object.values(moves).length, out = Object.values(moves).filter(j => j < 0).length;
      s.sh.cuMsg = `${out === n ? `${n}곳을 오늘 일정에서 뺐어요` : `${n}곳을 ${out ? '옮기거나 뺐어요' : '뒷날로 옮겼어요'}`}. 오늘은 확정해서 다른 곳이 끼어들지 않아요.`;
      break;
    }
    case 'cuundo': if(s.sh.cuUndo){ s.assign = s.sh.cuUndo.assign; s.dlock = s.sh.cuUndo.dlock; s.sh.cuUndo = null; s.sh.cuMsg = '되돌렸어요.'; } break;
    case 'recopen': s.mode = 'record'; scroll = true; break;
    case 'rprint': window.print(); return;
    case 'rshare': {   // 여행 기록을 글로 (가족 단톡 등). 공유 창이 없으면 복사
      const text = recordText(recordOf(s, plan(s)), recordHead(s));
      if(navigator.share){ navigator.share({ text }).catch(() => {}); }
      else clipText(text).then(ok => toast(ok ? '여행 기록을 복사했어요. 원하는 곳에 붙여 넣으세요.' : '복사가 안 됐어요.'));
      return;
    }
    case 'install': if(installEvt){ const e = installEvt; installEvt = null; e.prompt(); e.userChoice.then(c => { if(c && c.outcome === 'accepted'){ state.installHide = true; save(); } render(); }).catch(() => {}); } return;
    case 'installhide': s.installHide = true; break;
    case 'tsize': s.textSize = v === 'big' || v === 'bigger' ? v : ''; break;
    // 오가는 길 (js/moves.js). 고칠 때마다 새 객체로 바꿔 함께 짜기가 바뀐 걸 알게
    case 'mvset': case 'mvadd': {
      const P = plan(s); const tidy = (s.moves || []).filter(m => !isEmptyMove(m));
      const ex = a === 'mvset' && tidy.find(m => m.k === v);
      const m = ex || { id:a === 'mvset' ? v : 'm' + Date.now().toString(36), k:a === 'mvset' ? v : 'etc', date:a === 'mvadd' && P.days.length ? P.days[Math.min(1, P.days.length - 1)].key : '',
        time:'', how:'', min:null, from:'', to:'', booked:false, note:'' };
      s.moves = ex ? tidy : tidy.concat(m); s.sh.mvEdit = m.id; break;
    }
    case 'mvedit': s.moves = (s.moves || []).filter(m => m.id === v || !isEmptyMove(m)); s.sh.mvEdit = v; break;
    case 'mvdone': s.moves = (s.moves || []).filter(m => !isEmptyMove(m)); s.sh.mvEdit = null; if(s.moves.length) packTick('appmove'); break;
    case 'mvdel': s.moves = (s.moves || []).filter(m => m.id !== v); s.sh.mvEdit = null; toast('이동을 지웠어요.'); break;
    case 'mvhow': setMove(s.sh.mvEdit, m => ({ how:m.how === v ? '' : v })); break;
    case 'mvvault': {   // 예약한 이동의 바우처·예약번호는 보관함(이 기기에만)에
      const m = (s.moves || []).find(x => x.id === v); if(!m) return;
      s.moves = s.moves.filter(x => !isEmptyMove(x)); s.sh.mvEdit = null;
      s.vedit = null; s.vdraft = vaultDraft(s, m, moveCtx(s, plan(s))); s.step = VAULT_STEP; s.mode = null; save(); render(); focusVaultForm(); return;
    }
    case 'flightclear': s.flight = Object.assign({}, s.flight, { arr:'', dep:'' }); break;
    case 'flway': s.flight = Object.assign({ ap:'', arr:'', dep:'' }, s.flight, { way:['out', 'back'].includes(v) ? v : '' }); break;   // 왕복·편도
    case 'icsshare': case 'icsfile': sendIcs(a === 'icsshare'); if(packTick('appcal')) save(); return;
    case 'askopen': s.sh.ask = { open:true, kind:(s.sh.ask && s.sh.ask.kind) || 'menu' }; render(); return;
    case 'askclose': askSheetClose(); return;
    case 'askkind': s.sh.ask.kind = v; s.sh.ask.res = null; render(); return;
    case 'askclear': setAskPhoto(null); s.sh.ask.res = null; render(); return;
    case 'asknow': askNow(); return;
    case 'askadd': askPick(v, 1); return;
    case 'askreqfor': { const r = s.sh.ask.res; if(r){ r.reqFor = v; askPick('', 0, true); } return; }
    case 'askreq': { const r = s.sh.ask.res; if(!r) return; const to = r.reqFor && r.cart && r.cart[r.reqFor] ? r.reqFor : '*', a = ((r.reqs || {})[to] || []);
      r.reqs = Object.assign({}, r.reqs, { [to]:a.includes(v) ? a.filter(x => x !== v) : [...a, v] }); askPick('', 0, true); return; }
    case 'asktalkcur': s.sh.ask.cur = v; render(); return;
    case 'askbig': { const [type, key] = v.split(':'); askBigShow({ type, key, hasKey:askHasKey() }); return; }
    case 'askbigclose': askBigClose(); return;
    case 'askspeak': askSpeak(); return;
    case 'asksplit': { const r = s.sh.ask.res, x = r && askSplit(r.cart, v); if(x){ r.cart = x.cart; r.reqFor = x.key; askPick('', 0, true); } return; }
    case 'asklast': { let e = null; try{ e = askLastList(localStorage).find(x => String(x.id) === v); }catch(err){} if(e){ setAskPhoto(null); s.sh.ask.kind = 'menu'; s.sh.ask.res = { ...e, kind:'menu', restored:true }; render(); } return; }
    case 'asklastclear': try{ localStorage.removeItem(ASK_LAST); }catch(e){} toast('읽어 둔 메뉴판을 지웠어요.'); render(); return;
    case 'askreply': { const x = REPLIES.find(y => y.key === v); if(x && askBigView){ askBigView.msg = `👉 직원 답: ${x.ko}`; askBigShow(askBigView); } return; }
    case 'askgone': { const r = s.sh.ask.res, l = askOrder(r.data, r.cart, r).lines.find(y => y.k === v); if(!l) return;
      const base = v.split(':').slice(0, 2).join(':'); askKeysOf(r.cart, base).forEach(k => { delete r.cart[k]; if(r.reqs) delete r.reqs[k]; }); askPick('', 0, true);   // 품절이면 나눈 줄까지 모두 뺌
      toast(`${l.ko}은(는) 없다고 해서 주문에서 뺐어요.`); if(askOrder(r.data, r.cart, r).count && askBigView){ askBigView.msg = `👉 직원 답: ${l.ko}은(는) 없어요. 주문에서 뺐어요.`; askBigShow(askBigView); } else askBigClose(); return; }
    case 'asktrans': { const t = (document.getElementById('asktr') || {}).value || ''; if(t.trim()) askTrans(t.trim()); else toast('옮길 말을 먼저 써 주세요.'); return; }
    case 'asknum': { const m = numSay(s, (document.getElementById('asknumin') || {}).value, askBigView && (askBigView.cur || askTalkCur(s))); if(m && askBigView){ askBigView.msg = m; askBigShow(askBigView); } return; }
    case 'asktalkgo': s.sh.ask = { open:true, kind:(s.sh.ask && s.sh.ask.kind) || 'menu', talk:true }; render(); { const d = document.getElementById('asktalk'); if(d) d.scrollIntoView({ block:'start' }); } return;
    case 'askstaff': { const t = (document.getElementById('askstaff') || {}).value || ''; if(t.trim()) askTrans(t.trim()); return; }
    case 'askfreeadd': { const r = s.sh.ask.res, v2 = askBigView; if(r && r.data && v2 && v2.out){ r.free = [...(r.free || []), { ko:v2.src, local:v2.out }]; askPick('', 0, true); toast('주문 문장에 넣었어요.'); } askBigClose(); return; }
    case 'askdel': askPick(v, -1); return;
    case 'askcartclear': askPick(); return;
    case 'askcartgo': { const b = document.getElementById('askorderbox'); if(b) b.scrollIntoView({ block:'start', behavior:'smooth' }); return; }
    case 'askline': { const res = s.sh.ask.res || {}, d = res.data || {}, o = res.cart ? askOrder(d, res.cart, res) : null; clipText(o && o.count ? o.local : (d.order || d.pharmacist || {}).local || '').then(ok => toast(ok ? '문장을 복사했어요.' : '복사가 안 됐어요.')); return; }
    case 'askledger': {
      const res = s.sh.ask.res; const r = res && !res.saved ? parseLine(receiptLine(res.data), s, ledgerCtx()) : null;
      if(!r || !r.ok){ toast('가계부에 넣지 못했어요. 가계부에서 직접 적어 주세요.'); return; }
      s.spend[newSpendId()] = Object.assign(r.e, { at:Date.now() }); res.saved = true; toast(`가계부에 적었어요 · ${spentText(r.e)}`); save(); render(); return;
    }
    case 'askresult': clipText((s.sh.ask.res || {}).text || '').then(ok => toast(ok ? '답을 복사했어요.' : '복사가 안 됐어요.')); return;
    case 'askkeysave': { const vx = v === 'v', k = (document.getElementById(vx ? 'askvkey' : 'askkey') || {}).value || ''; if(!askKeyInfo(k, vx)){ toast(!k.trim() ? '키를 붙여 넣어 주세요.' : !vx && k.trim()[0] === '{' ? '이 키는 버텍스 칸에 넣어 주세요.' : '키 모양이 맞지 않아요. 다시 복사해 주세요.'); return; } try{ localStorage.setItem(vx ? ASK_VKEY : ASK_KEY, k.trim()); localStorage.setItem(ASK_USE, vx ? 'v' : 'g'); }catch(e){} s.sh.ask.res = null; toast('저장했어요. 이제 사진을 고르면 바로 답이 나와요.'); render(); if(askPhoto) askNow(); return; }
    case 'askkeydel': try{ localStorage.removeItem(v === 'v' ? ASK_VKEY : ASK_KEY); }catch(e){} s.sh.ask.res = null; toast('이 폰에서 키를 지웠어요.'); render(); return;
    case 'askkeyuse': try{ localStorage.setItem(ASK_USE, v); }catch(e){} s.sh.ask.res = null; render(); if(askPhoto) askNow(); return;
    case 'askcopy': clipText(askPrompt(s, s.sh.ask.kind, s.askNote)).then(ok => toast(ok ? '부탁 문장을 복사했어요. AI 입력칸에 붙여 넣으세요.' : '복사가 안 됐어요. 문장을 길게 눌러 복사해 주세요.')); return;
    case 'asksend': sendAsk(); return;
    case 'login': case 'logout': case 'sharestart': case 'joinok': case 'joincancel': case 'restore': case 'copylink': case 'sendlink':
    case 'linkopen': case 'kick': case 'leave': case 'unlink': case 'sharedel': case 'vote': case 'cmopen': case 'cmdel':
      shareAct(a, v); return;
    case 'reset':
      if(!resetArmed){ resetArmed = true; clearTimeout(resetTimer); resetTimer = setTimeout(() => { resetArmed = false; render(); }, 4000); render(); return; }
      resetArmed = false; clearTimeout(resetTimer);
      if(state.shareId) stopShare('');   // 처음부터 = 이 기기에서 공유도 끊음 (공유 여행 자체는 남음)
      { const keepSh = state.sh; state = clone(DEFAULT); state.rkOn = !!rkKeys(); state.sh = keepSh; }
      scroll = true; break;
  }
  save(); render(); if(scroll) window.scrollTo({ top:0 });
}

/* ---------- 홈 화면 설치 안내 (js/install.js) ---------- */
let installEvt = null;   // 크롬이 준 설치 창 (있으면 버튼 하나로 설치)
// 첫 화면을 그리기 전(지역 데이터를 불러오는 중)에 오면 그때는 다시 그리지 않음 — 첫 render가 버튼을 같이 그림
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if(document.getElementById('view').innerHTML) render(); });
window.addEventListener('appinstalled', () => { installEvt = null; state.installHide = true; saveLocal(); render(); toast('홈 화면에 설치했어요. 이제 아이콘으로 여세요.'); });
function installCard(s){
  if(s.installHide) return '';
  const h = installHint(navigator.userAgent, { standalone:matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    canPrompt:!!installEvt, mobile:matchMedia('(pointer: coarse)').matches });
  if(!h) return '';
  return `<div class="box installbox"><div class="row"><h2>📲 홈 화면에 설치하기</h2><button type="button" class="link" data-act="installhide">닫기</button></div>
    ${h.steps.map(t => `<p class="fine">${esc(t)}</p>`).join('')}
    ${h.kind === 'prompt' ? '<div><button type="button" class="primary small" data-act="install">홈 화면에 설치</button></div>' : ''}</div>`;
}

/* ---------- 여행 기록 사진 (js/record.js) ---------- */
// 그날 사진을 줄여서 보관함 사진 항목에 붙임 (하루 최대 MAX_DAY_PHOTOS장)
async function addDayPhotos(date, files){
  const s = state; let it = photoOf(s.vault, date);
  if(!it){ it = newPhotoItem(date, 'v' + Date.now().toString(36)); s.vault = (s.vault || []).concat(it); }
  const room = MAX_DAY_PHOTOS - it.files.length; if(room <= 0) return;
  toast('사진을 줄여서 넣고 있어요…');
  const skipped = await storeFiles(it, files.filter(f => /^image\//.test(f.type)).slice(0, room));
  keepStorage(); save(); render(); refreshUsage();
  if(files.length > room) toast(`하루 ${MAX_DAY_PHOTOS}장까지 넣을 수 있어요.`); else if(skipped && skipped.length) toast(`너무 큰 사진은 빼고 넣었어요: ${skipped.join(', ')}`);
}

// 준비물·출발 전 할 일 → 그 화면·칸으로 (vault·idbox·movebox·icsbox·pack·where·sos)
function goTo(to){
  const s = state; if(!to) return;
  if(to === 'sos'){ s.mode = 'sos'; packTick('appsos'); save(); render(); window.scrollTo(0, 0); return; }
  // 도움 화면·출발 전 할 일의 목적지 (js/guide.js DEST): 단계·화면을 바꾸고 그 칸으로, 접힌 칸이면 펼침
  const d = DEST[to] && !['movebox', 'icsbox', 'pack', 'where', 'vault', 'idbox'].includes(to) ? DEST[to] : null;
  if(d){
    if(d.act){ act(d.act, ''); return; }
    if(d.mode){ s.mode = d.mode; if(d.mode === 'today') s.tday = null; } else { s.mode = null; s.step = Math.max(0, STEPS.indexOf(d.step)); }
    if(d.open) s.sh[d.open] = true;   // 펼친 채로 (가족 일정이 실시간으로 와서 다시 그려도)
    save(); render();
    const el = d.el ? document.querySelector(d.el) : null;
    if(el){ scrollBelowTop(el); flash(el); } else window.scrollTo(0, 0);
    return;
  }
  s.mode = null; s.step = to === 'movebox' || to === 'icsbox' ? PLAN_STEP : to === 'pack' ? PACK_STEP : to === 'where' ? STEPS.indexOf('여행지') : VAULT_STEP; save(); render();
  const el = document.getElementById(to === 'vault' ? 'vaultform' : to); if(el) scrollBelowTop(el); else window.scrollTo(0, 0);
}
// 위에 붙어 있는 머리(단계 줄·끊김 띠) 아래에 그 칸이 오게
function scrollBelowTop(el){ const top = document.querySelector('.top'); const h = top ? top.getBoundingClientRect().bottom : 0; window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - h - 12)); }

/* ---------- 약도 번호 ↔ 목록 카드 ---------- */
function flash(el){ el.classList.remove('flash'); void el.getBoundingClientRect(); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800); }
// 약도 번호(svg g)는 버튼이 아니라서 키보드 Enter·Space도 누른 것으로
document.addEventListener('keydown', e => { if(e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest && e.target.closest('.m-go'); if(!g) return; e.preventDefault(); act(g.dataset.act, g.dataset.v); });

/* ---------- 📍 내 주변 (js/nearby.js) ---------- */
// 버튼을 눌렀을 때만 위치를 한 번 받음. 좌표는 화면(s.sh.near, 저장 안 함)에서만 씀
function nearLocate(fresh){   // fresh: '다시 찾기'는 1분 안에 받은 위치도 다시 쓰지 않음 (걸어서 옮긴 뒤)
  const s = state; s.sh.near = Object.assign({}, s.sh.near, { open:true, busy:true, err:'' }); render();
  if(!('geolocation' in navigator)){ s.sh.near.busy = false; s.sh.near.err = 'none'; render(); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const n = state.sh.near || {}; Object.assign(n, { busy:false, err:'', at:Date.now(), pt:{ lat:pos.coords.latitude, lng:pos.coords.longitude, acc:Math.round(pos.coords.accuracy || 0) } });
    state.sh.near = n; render();
  }, err => {
    const n = state.sh.near || {}; n.busy = false; n.err = err && err.code === 1 ? 'deny' : 'fail'; state.sh.near = n; render();
  }, { enableHighAccuracy:true, timeout:20000, maximumAge:fresh ? 0 : 60000 });
}

/* ---------- 시차·내 위치 (js/clock.js) ---------- */
// 지금 한국인지 여행지인지만 s.here에 (좌표는 안 남김). ask: 버튼으로 눌렀을 때만 허락 창이 뜰 수 있음
function checkWhere(ask){
  const s = state; if(!('geolocation' in navigator) || s.sh.geoAsk === 'busy') return;
  s.sh.geoAsk = 'busy'; if(ask) render();
  navigator.geolocation.getCurrentPosition(pos => {
    const where = whereOf({ lat:pos.coords.latitude, lng:pos.coords.longitude }, REGION);
    state.here = { where, at:Date.now() }; state.sh.geoAsk = ''; saveLocal(); render();
    if(ask) toast(where === 'trip' ? '현지에 있어요. 현지 시각으로 보여 드려요.' : where === 'home' ? '한국에 있어요. 한국 시각도 같이 보여 드려요.' : '위치를 확인했어요.');
  }, err => {
    state.sh.geoAsk = ''; render();
    if(ask) toast(err && err.code === 1 ? '위치 허락이 꺼져 있어요. 브라우저(또는 폰) 설정에서 이 사이트의 위치를 허용해 주세요.' : '위치를 못 받았어요. 잠시 뒤 다시 눌러 주세요.');
  }, { enableHighAccuracy:false, timeout:15000, maximumAge:10 * 60000 });
}
// 이미 허락했으면 앱을 열 때 30분마다 조용히 다시 확인 (허락 창은 안 띄움)
function autoWhere(){
  const s = state; if(!navigator.permissions || !navigator.permissions.query) return;
  if(s.here && s.here.at && Date.now() - s.here.at < HERE_FRESH) return;
  navigator.permissions.query({ name:'geolocation' }).then(p => { if(p.state === 'granted') checkWhere(false); }).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') autoWhere(); });
setTimeout(autoWhere, 1500);

/* ---------- 앱에서 해 두면 준비물 저절로 체크 (js/packing.js tickFrom) ---------- */
function packTick(key){
  const s = state; const it = tickFrom(s.pack, key, s.shareId && s.sh.user ? s.sh.user.name : ''); if(!it) return false;
  s.pack[KEY_ID(key)] = it; return true;
}
// 담을 때 이미 해 둔 것은 바로 체크 (여권 사본·오가는 길·항공권/숙소 예약)
function packDone(){
  const s = state;
  if(idCopies(s.vault).some(x => (x.files || []).length)) packTick('appid');
  if((s.moves || []).some(m => !isEmptyMove(m))) packTick('appmove');
  if(bookings(s.vault).some(x => x.kind === 'flight' || x.kind === 'hotel')) packTick('tickets');
}

/* ---------- 여권·사진 사본 (js/vault.js idcopy) ---------- */
async function addIdFiles(it, files){
  toast('사진을 넣고 있어요…');
  const skipped = await storeFiles(it, files);
  if(it.files.length) packTick('appid');
  keepStorage(); save(); render(); refreshUsage();
  toast(skipped.length ? '너무 크거나 저장 공간이 모자라 넣지 못한 사진이 있어요.' : `${it.title}에 사진을 넣었어요. 이 기기에만 있어요.`);
}
async function wipeIdCopies(){
  const ids = idCopies(state.vault).map(x => x.id);
  for(const id of ids) await deleteVault(id);
  state.idLater = ''; save(); render(); toast('여권 사본을 모두 지웠어요.');
}

/* ---------- 보관함 예약 → 일정 (js/bookings.js) ---------- */
// 숙소 위치: 구글 지도 주소에서 좌표를 읽고 여행 지역 안이면 { pt:{ lat, lng, area }, mapUrl }
function hotelPt(raw){
  const pt = raw && coordsFromUrl(raw);
  return pt && nearTokyo(pt) ? { pt:{ lat:pt.lat, lng:pt.lng, area:nearestArea(pt).key }, mapUrl:safeMapUrl(raw) } : {};
}
function applyVaultAll(){
  const s = state; const base = Date.now().toString(36);
  const r = applyAll(s, bookings(s.vault), { newId:i => 'h' + base + i, ptOf:it => hotelPt(it.link) });
  Object.assign(s, r.patch); save(); render();
  if(r.locate) findHotelLocations();
  toast(r.msgs.length ? `일정에 반영했어요: ${r.msgs.join(' · ')}` : '이미 일정에 다 반영돼 있어요.');
}

/* ---------- 오가는 길 (js/moves.js) ---------- */
function setMove(id, fn){ state.moves = (state.moves || []).map(m => m.id === id ? Object.assign({}, m, fn(m)) : m); }

/* ---------- 폰 캘린더에 넣기 (js/ics.js) ---------- */
async function sendIcs(share){
  const s = state; const P = plan(s); const text = buildIcs(s, P, bookings(s.vault), new Date(), moveCtx(s, P));
  const name = `tripnoseon-${s.start || 'trip'}.ics`; const file = new File([text], name, { type:'text/calendar' });
  if(share && navigator.canShare && navigator.canShare({ files:[file] })){
    try{ await navigator.share({ files:[file], title:'트립노선 여행 일정' }); return; }catch(e){ if(e && e.name === 'AbortError') return; }
  }
  const u = URL.createObjectURL(file); const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toast(share ? '바로 보내기가 안 돼서 파일로 받았어요. 받은 파일을 열어 캘린더에 저장하세요.' : '캘린더 파일을 받았어요. 파일을 열어 캘린더에 저장하세요.');
}

/* ---------- AI 도우미 (js/askai.js) ---------- */
function setAskPhoto(f){
  if(askPhoto) URL.revokeObjectURL(askPhoto.url);
  askPhoto = f ? { file:f, url:URL.createObjectURL(f) } : null;
}
async function clipText(t){ try{ await navigator.clipboard.writeText(t); return true; }catch(e){ return false; } }
// 🅿️ 공항 주차장 남은 자리: 누를 때만 공공데이터포털에 물어봄(보내는 것은 인증키뿐). 결과는 화면 전용
async function checkParking(id){
  const s = state; const m = (s.moves || []).find(x => x.id === id); if(!m) return;
  const ap = krAirport(moveKap(m)); let key = ''; try{ key = localStorage.getItem(PK_KEY) || ''; }catch(e){}
  if(!ap || !key || (s.sh.park && s.sh.park.busy)) return;
  s.sh.park = { id, kap:ap.k, busy:true }; render();
  let res;
  try{ const r = await fetchTimed(parkUrl(ap, key), { headers:{ Accept:'application/json' } }); res = parseParking(ap, await r.text()); }
  catch(e){ res = { ok:false, err:'net' }; }
  if(state !== s) return;
  const d = new Date(); s.sh.park = { id, kap:ap.k, res, when:`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }; render();
}
// 🚇 홍콩 MTR 다음 열차: 누를 때만 그 역의 노선마다 물어봄(보내는 것은 노선·역 코드뿐). 결과는 화면 전용 s.sh.mtr
//   같은 역은 10초 동안 다시 안 물어봄(자료가 10초마다 바뀜, 너무 자주 물으면 429)
const mtrCache = new Map();
async function mtrNext(sta, key){
  const s = state; const st = MTR_STATIONS[sta]; if(!st || (s.sh.mtr && s.sh.mtr.busy)) return;
  s.sh.mtr = { key, sta, busy:true }; render();
  const c = mtrCache.get(sta); let res;
  if(c && Date.now() - c.at < 10 * 1000) res = c.res;
  else {
    res = await Promise.all(st.lines.map(async line => {
      try{
        const r = await fetchTimed(mtrUrl(line, sta), { cache:'no-store' }, 10000);
        if(r.status === 429) return { ok:false, line, sta, err:'busy' };
        if(!r.ok) return { ok:false, line, sta, err:'server' };
        return parseNextTrain(await r.text(), line, sta);
      }catch(e){ return { ok:false, line, sta, err:'net' }; }
    }));
    if(res.some(r => r.ok)) mtrCache.set(sta, { at:Date.now(), res });
  }
  if(state !== s) return;
  s.sh.mtr = { key, sta, res }; render();
}
// 🚌 공항버스: 공항(·지역)별 목록을 받아 이 기기에서 동네 이름·번호로 찾음. 같은 목록은 30분 동안 다시 안 받음(하루 호출 한도)
const busCache = new Map();
async function busList(ap, area, key){
  const ck = `${ap.k}|${ap.src === 'icn' ? area || '' : ''}`; const c = busCache.get(ck);
  if(c && Date.now() - c.at < 30 * 60 * 1000) return c.res;
  let res = parseBuses(ap, await (await fetchTimed(busUrl(ap, key, area, 1), { headers:{ Accept:'application/json' } })).text());
  // 한국공항공사는 한 번에 100개까지: 남은 쪽도 (최대 3쪽)
  for(let p = 2; res.ok && ap.src !== 'icn' && res.buses.length < res.total && p <= 3; p++){
    const r = parseBuses(ap, await (await fetchTimed(busUrl(ap, key, area, p), { headers:{ Accept:'application/json' } })).text());
    if(!r.ok) break; res = Object.assign({}, res, { buses:res.buses.concat(r.buses) });
  }
  if(res.ok) busCache.set(ck, { at:Date.now(), res });
  return res;
}
async function findAirBus(id, q){
  const s = state; const m = (s.moves || []).find(x => x.id === id); if(!m) return;
  const ap = krAirport(moveKap(m)); let key = ''; try{ key = localStorage.getItem(PK_KEY) || ''; }catch(e){}
  if(!ap || !key || (s.sh.bus && s.sh.bus.busy)) return;
  q = String(q || '').trim().slice(0, 30);
  if(!q && !m.bus){ s.sh.bus = { id, kap:ap.k, q, err:'empty' }; render(); return; }
  s.sh.bus = { id, kap:ap.k, q, busy:true }; render();
  let out;
  try{
    const res = await busList(ap, m.barea, key);
    if(!res.ok) out = { err:res.err };
    else { const list = q ? findBuses(res.buses, q) : [busByNo(res.buses, m.bus)].filter(Boolean); out = list.length ? { list } : { err:'none' }; }
  }catch(e){ out = { err:'net' }; }
  if(state !== s) return;
  s.sh.bus = Object.assign({ id, kap:ap.k, q }, out); render();
}
// 장소 추천 질문을 공유 창으로 (사용자가 AI 앱을 고름). 공유 창이 없거나 글을 빠뜨리는 앱이 있어서 복사도 해 둠
async function sendPlanAsk(){
  const text = planPrompt(state, (state.sh.aiPlan || {}).want); const copied = clipText(text);
  if(navigator.share){
    try{ await navigator.share({ text }); return; }
    catch(e){ if(e && e.name === 'AbortError') return; }
  }
  toast(await copied ? '질문을 복사했어요. 아래에서 AI를 열고 입력칸에 붙여 넣으세요.' : '복사가 안 됐어요. \'보낼 질문 보기\'에서 길게 눌러 복사해 주세요.');
}
// 큰 사진을 줄여서 보냄 (무료 한도·로밍 데이터 아끼기). 줄이기가 안 되면 원본
async function askImage(f){
  try{
    const bmp = await createImageBitmap(f); const r = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    const u = c.toDataURL('image/jpeg', 0.85); return { mime:'image/jpeg', data:u.slice(u.indexOf(',') + 1) };
  }catch(e){
    const u = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(f); });
    return { mime:f.type || 'image/jpeg', data:u.slice(u.indexOf(',') + 1) };
  }
}
// 버텍스 서비스 계정 → 1시간짜리 출입증. 폰 안에서 서명해 구글에서 바로 받음 (askai.js 개발자 본인용, 받은 값은 메모리에만)
let vToken = null;
async function vertexToken(sa){
  if(vToken && vToken.who === sa.client_email && vToken.until > Date.now() + 60000) return vToken.t;
  const body = `${b64url(JSON.stringify({ alg:'RS256', typ:'JWT' }))}.${b64url(JSON.stringify(jwtClaims(sa, Math.floor(Date.now() / 1000))))}`;
  const algo = { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' };
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), algo, false, ['sign']);
  const sig = await crypto.subtle.sign(algo, key, new TextEncoder().encode(body));
  const r = await fetchTimed('https://oauth2.googleapis.com/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:`grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${body}.${b64url(sig)}` }, 20000);
  const j = await r.json().catch(() => null);
  if(!r.ok || !j || !j.access_token) return null;
  vToken = { who:sa.client_email, t:j.access_token, until:Date.now() + (j.expires_in || 3600) * 1000 };
  return vToken.t;
}
// 앱 안에서 바로 답 받기: 이 폰에 넣어 둔 키로 구글에 직접 물음 (키가 없으면 아무것도 안 함)
// 메뉴 고르기: 화면 전체를 다시 그리면 펼친 분류가 접히고 스크롤이 튀어서 숫자와 주문 칸만 바꿈 (인자 없으면 다 지움)
function askPick(k, d, same){
  const r = state.sh.ask && state.sh.ask.res; if(!r || !r.data) return;
  if(same) r.cart = r.cart || {};
  else if(!k){ r.cart = {}; r.reqs = {}; r.free = []; r.reqFor = ''; }
  else{ r.cart = askStep(r.cart, k, d); if(r.reqs) Object.keys(r.reqs).forEach(x => { if(x !== '*' && !r.cart[x]) delete r.reqs[x]; }); }
  document.querySelectorAll('.askqty').forEach(q => { const n = askCount(r.cart, q.dataset.k); q.classList.toggle('on', n > 0); q.querySelector('b').textContent = n; });
  const box = document.getElementById('askorderbox'), bar = document.getElementById('askcartbar');
  if(box) box.innerHTML = askOrderBox(state, r);
  if(bar) bar.innerHTML = askCartBar(state, r);
  askRemember(r);
}
// 크게 보여 주기: 시트 밖에 띄워서 화면을 다시 그려도 사라지지 않음
let askBigView = null;
const askHasKey = () => { try{ return !!askKeys(localStorage).use; }catch(e){ return false; } };
// 직원·기사에게 보여 주는 동안(크게 보기·긴급 카드·티켓 사진) 화면이 꺼지지 않게
let wakeLock = null, wakeAsking = false;
const wantAwake = () => !!askBigView || !!state.sh.sbig || !!viewerClose;
function wakeSync(){
  try{
    if(wantAwake()){
      if(wakeLock || wakeAsking || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      wakeAsking = true;
      navigator.wakeLock.request('screen').then(l => { wakeAsking = false; wakeLock = l; l.addEventListener('release', () => { if(wakeLock === l) wakeLock = null; }); if(!wantAwake()) wakeSync(); }).catch(() => { wakeAsking = false; });
    } else if(wakeLock){ const l = wakeLock; wakeLock = null; l.release().catch(() => {}); }
  }catch(e){}
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') wakeSync(); });
function askBigShow(v){
  askBigView = v; let el = document.getElementById('askbig');
  if(!el){ el = document.createElement('div'); el.id = 'askbig'; el.className = 'askbig'; el.setAttribute('role', 'dialog'); document.body.appendChild(el); }
  el.lang = talkWords(v.cur || askTalkCur(state)).html; el.hidden = false; el.innerHTML = askBigHtml(state, v); el.scrollTop = 0;
  layersSync();
}
function askBigHide(){ askBigView = null; const el = document.getElementById('askbig'); if(el){ el.hidden = true; el.innerHTML = ''; } try{ speechSynthesis.cancel(); }catch(e){} layersSync(); }
function askBigClose(){ askBigHide(); }
function askSheetClose(){ if(state.sh.ask) state.sh.ask.open = false; setAskPhoto(null); render(); }
// 폰의 뒤로 가기(아이폰은 밀어서 뒤로): 앱이 닫히지 않고 위에 열린 것부터 하나씩 닫힘
//   열린 창 수만큼 방문 기록을 쌓아 두고(tnl), 버튼으로 닫으면 그만큼 되돌림. 맨 아래(계획 화면)에서 누르면 그때 앱을 나감
const LAYERS = [
  [() => !!viewerClose, () => viewerClose()],
  [() => !!askBigView, () => askBigHide()],
  [() => mapOpen(), () => closeMap()],
  [() => !!state.sh.vdoc, () => { state.sh.vdoc = null; render(); }],
  [() => !!(state.sh.ask && state.sh.ask.open), () => askSheetClose()],
  [() => !!(state.sh.near && state.sh.near.open), () => { state.sh.near.open = false; render(); }],
  [() => !!state.sh.open, () => { state.sh.open = false; render(); }],
  [() => !!state.sh.sbig, () => { state.sh.sbig = null; state.sh.sreply = null; try{ speechSynthesis.cancel(); }catch(e){} render(); }],
  [() => !!state.mode, () => { state.mode = null; save(); render(); window.scrollTo({ top:0 }); }]
];
const layerCount = () => LAYERS.filter(l => l[0]()).length;
const histDepth = () => (history.state && history.state.tnl) || 0;
let histWait = 0, histTimer = null, histPopping = false;
function syncHistory(){
  if(histWait || histPopping) return;
  const want = layerCount(), have = histDepth();
  try{
    if(want > have){ for(let k = have + 1; k <= want; k++) history.pushState({ tnl:k }, ''); }
    else if(want < have){ histWait++; history.go(want - have); clearTimeout(histTimer); histTimer = setTimeout(() => { if(histWait){ histWait = 0; syncHistory(); } }, 1000); }
  }catch(e){ histWait = 0; }
}
function layersSync(){ syncHistory(); wakeSync(); }
addEventListener('popstate', () => {
  if(histWait){ histWait--; syncHistory(); wakeSync(); return; }   // 버튼으로 닫아서 앱이 되돌린 것
  histPopping = true;
  try{ for(let n = layerCount() - histDepth(); n > 0; n--){ const top = LAYERS.find(l => l[0]()); if(!top) break; top[1](); } }
  finally{ histPopping = false; }
  layersSync();
});
// 고른 주문까지 이 폰에 보관 (창을 닫거나 앱이 다시 열려도 그대로, 일정·공유·백업에는 들어가지 않음)
function askRemember(r){
  if(!r || !r.data || r.kind !== 'menu') return;
  r.id = r.id || Date.now();
  try{ askLastSave(localStorage, { id:r.id, note:r.note || '', data:r.data, cart:r.cart || {}, reqs:r.reqs || {}, free:r.free || [], reqFor:r.reqFor || '' }); }catch(e){}
}
// 소리로 들려주기: 폰에 그 말 음성이 있을 때만
function askSpeak(){
  const el = document.getElementById('askbig'); if(!el) return;
  speakIn(el.lang, [...el.querySelectorAll('.askbigtext,.askgone button,.askbigsub')].map(x => x.textContent.replace(/ × (\d+)/g, ' $1')).join('。'));
}
// 폰 음성 목록은 처음 부를 때 비어 있다가 나중에 채워짐 → 앱을 열 때 미리 불러 둠 (첫 🔊부터 맞는 음성으로)
try{ if(globalThis.speechSynthesis){ speechSynthesis.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices()); } }catch(e){}
function speakIn(lang, text){
  if(!globalThis.speechSynthesis || !text) return;
  const vs = speechSynthesis.getVoices(), v = pickVoice(vs, lang);   // 음성 목록이 아직 비었으면 폰 기본 음성에 말만 맞춰 읽음
  if(vs.length && !v){ toast('이 폰에는 이 말 음성이 없어요. 화면을 보여 주세요.'); return; }
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = v ? v.lang.replace(/_#\w+$/, '').replace(/_/g, '-') : lang; u.rate = 0.9; if(v) u.voice = v; speechSynthesis.speak(u);
}

// 직접 쓴 말 번역: 한국어면 현지어로(주문에 넣을 수 있음), 직원이 쓴 말이면 한국어로
async function askTrans(text){
  const cur = askTalkCur(state), toKo = !hasHangul(text), base = { type:'text', cur, src:text, toKo, hasKey:true };
  let info = null; try{ info = askKeyNow(askKeys(localStorage)); }catch(e){}
  if(!info){ toast('키를 넣어야 쓸 수 있어요.'); return; }
  if(!navigator.onLine){ askBigShow({ ...base, msg:'인터넷이 끊겨 있어요. 위의 준비된 문구를 써 주세요.' }); return; }
  askBigShow({ ...base, msg:'옮기는 중이에요…' });
  try{
    const token = info.kind === 'sa' ? await vertexToken(info.sa) : '';
    if(info.kind === 'sa' && !token){ askBigShow({ ...base, msg:'키가 맞지 않아요.' }); return; }
    const headers = Object.assign({ 'Content-Type':'application/json' }, token ? { Authorization:`Bearer ${token}` } : { 'x-goog-api-key':info.key });
    const body = JSON.stringify({ contents:[{ role:'user', parts:[{ text:askTransPrompt(text, cur) }] }] });
    let r; for(const u of askTargets(info)){ r = await fetchTimed(u, { method:'POST', headers, body }, 30000); if(r.status !== 404) break; }
    const j = await r.json().catch(() => null), out = r.ok ? geminiRaw(j) : '';
    const res = state.sh.ask && state.sh.ask.res;
    askBigShow(out ? { ...base, out, add:!toKo && !!(res && res.data) } : { ...base, msg:`${r.ok ? '답을 받지 못했어요.' : geminiError(r.status, j)}` });
  }catch(e){ askBigShow({ ...base, msg:'답이 늦어요. 위의 준비된 문구를 써 주세요.' }); }
}
async function askNow(){
  const s = state, ask = s.sh.ask; let info = null; try{ info = askKeyNow(askKeys(localStorage)); }catch(e){}
  const photo = askPhoto; if(!info || !photo || !ask || (ask.res && ask.res.busy)) return;
  if(!navigator.onLine){ ask.res = { err:'인터넷이 끊겨 있어요. 연결되면 다시 눌러 주세요.' }; render(); return; }
  ask.res = { busy:true }; render();
  let res;
  try{
    const img = await askImage(photo.file);
    const token = info.kind === 'sa' ? await vertexToken(info.sa) : '';
    if(info.kind === 'sa' && !token){ ask.res = { err:'키가 맞지 않아요. 키를 다시 넣어 주세요.' }; render(); return; }
    const body = JSON.stringify(geminiBody(askJsonPrompt(s, ask.kind, s.askNote), img.mime, img.data, askSchema(ask.kind)));
    const headers = Object.assign({ 'Content-Type':'application/json' }, token ? { Authorization:`Bearer ${token}` } : { 'x-goog-api-key':info.key });
    let r;
    for(const u of askTargets(info)){ r = await fetchTimed(u, { method:'POST', headers, body }, 90000); if(r.status !== 404) break; }
    const j = await r.json().catch(() => null); const data = r.ok ? askParse(ask.kind, geminiRaw(j)) : null; const raw = r.ok && !data ? geminiText(j) : '', text = raw[0] === '{' ? '' : raw;   // 칸이 깨진 답을 그대로 보이지 않음
    res = data ? { data, kind:ask.kind, note:s.askNote || '' } : text ? { text } : { err:r.ok ? '답을 받지 못했어요. 사진을 다시 찍어 주세요.' : `${geminiError(r.status, j)} (구글 응답 ${askErrTag(r.status, j)})` };
  }catch(e){ res = { err:'답이 늦어요. 다시 누르거나 아래 AI 앱으로 보내기를 써 주세요.' }; }
  if(askPhoto !== photo || s.sh.ask !== ask) return;   // 기다리는 동안 사진을 바꿨거나 창을 닫음
  ask.res = res; askRemember(res); render(); { const a = document.getElementById('askres'); if(a) a.scrollIntoView({ block:'start' }); }
}
// 부탁 문장을 사진 위에 얹은 그림 한 장 (AI 앱이 공유 글을 빠뜨려도 그림 속 글자를 읽게). 안 되면 null → 원본 사진
async function askComposite(f, text){
  try{
    const bmp = await createImageBitmap(f); const W = Math.max(1000, Math.min(1600, bmp.width)), H = Math.round(bmp.height * W / bmp.width);
    const c = document.createElement('canvas'), g = c.getContext('2d'); const fs = Math.round(W / 42), lh = Math.round(fs * 1.4), pad = Math.round(fs * 1.2);
    const font = `${fs}px "IBM Plex Sans KR","Noto Sans KR",sans-serif`; g.font = font;
    const lines = wrapText(text, W - pad * 2, t => g.measureText(t).width), top = pad * 2 + lines.length * lh;
    c.width = W; c.height = top + H;   // 크기를 정하면 설정이 지워져서 글꼴을 다시 넣음
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, top); g.fillStyle = '#111'; g.font = font; g.textBaseline = 'top';
    lines.forEach((t, i) => g.fillText(t, pad, pad + i * lh));
    g.drawImage(bmp, 0, top, W, H); bmp.close();
    const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.88));
    return b ? new File([b], 'tripnoseon-ask.jpg', { type:'image/jpeg' }) : null;
  }catch(e){ return null; }
}
// 사진 + 부탁 문장을 공유 창으로 (사용자가 AI 앱을 고름). 일부 AI 앱은 같이 보낸 글을 빠뜨려서 문장은 복사도 해 둠
async function sendAsk(){
  const s = state; const text = askPrompt(s, s.sh.ask.kind, s.askNote); const f = askPhoto && askPhoto.file;
  const copied = clipText(text);
  const img = f ? (await askComposite(f, composedPrompt(s, s.sh.ask.kind, s.askNote))) || f : null;
  if(img && navigator.canShare && navigator.canShare({ files:[img] })){
    try{ await navigator.share({ files:[img], text }); }
    catch(e){ if(!e || e.name !== 'AbortError') toast('보내기가 안 됐어요. 아래 \'보내기가 안 될 때\'를 봐 주세요.'); }
  } else { await copied; toast('이 브라우저에서는 사진을 바로 보낼 수 없어요. 부탁 문장을 복사해 뒀으니 AI를 열고 사진을 붙여 주세요.'); }
}

/* ---------- 📄 확인서로 보관함 칸 채우기 (js/readdoc.js) ---------- */
// 여러 장을 한 번에 골라도 됨(가족 표를 한 사람이 다 올리거나 사람마다 따로 받은 e-티켓): 같은 편끼리 합쳐 사람별 번호·파일로
let vreadFiles = [];   // 고른 확인서들 (메모리에만, 저장할 때 그 예약에 첨부)
const READ_MAX = 8;
const fileB64 = f => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => { const u = String(fr.result); ok({ mime:f.type || 'application/pdf', data:u.slice(u.indexOf(',') + 1) }); }; fr.onerror = no; fr.readAsDataURL(f); });
const readName = L => L.length > 1 ? `${L[0].name.slice(0, 40)} 외 ${L.length - 1}개` : L.length ? L[0].name.slice(0, 60) : '';
async function readDoc(input, from){
  const s = state; const all = Array.from(input && typeof input.length === 'number' ? input : [input]).filter(Boolean);
  const files = all.filter(f => (/^image\//.test(f.type) || f.type === 'application/pdf') && f.size <= 15 * 1048576).slice(0, READ_MAX);
  vreadFiles = files; s.sh.vread = { name:readName(files.length ? files : all), from:from || '', n:files.length };
  if(!files.length){ s.sh.vread.err = all.length ? '사진이나 PDF(한 장 15MB까지)만 읽을 수 있어요.' : ''; render(); return; }
  const left = all.length - files.length;
  // 먼저 이 기기 안에서: 글자를 꺼내(PDF는 pdf.js, 사진은 글자 인식) 규칙으로 칸을 찾음 (js/localread.js·docparse.js). 확인서는 밖으로 안 나감
  const mine = s.sh.vread; Object.assign(mine, { busy:true, local:true }); render();
  const year = s.start ? +s.start.slice(0, 4) : new Date().getFullYear(); const got = []; let anyText = false;
  try{
    for(const [k, f] of files.entries()){
      if(state.sh.vread !== mine) return;
      mine.part = files.length > 1 ? `${k + 1}/${files.length}장` : ''; mine.prog = 0; render();
      let lastPct = 0;
      const text = f.type === 'application/pdf' ? await pdfText(f)
        : await imageText(f, p => { const pct = Math.round(p * 100); if(pct - lastPct >= 10 && state.sh.vread === mine){ lastPct = pct; mine.prog = pct; render(); } });
      if(text.trim()) anyText = true;
      const j = parseDocText(text, { year });
      if(j.items.some(x => x.date || x.fno || x.code)) got.push({ j, k });
    }
    if(state.sh.vread !== mine) return;
    const merged = mergeReads(got);
    const miss = files.length - got.length;
    if(merged){ useDrafts(readDrafts(s, merged), `이 기기 안에서 읽었어요 (확인서는 밖으로 보내지 않았어요).${files.length > 1 ? ` ${files.length}장을 합쳤어요.` : ''}${miss ? ` ${miss}장은 못 읽었어요 — 그 사람 번호는 직접 넣어 주세요.` : ''}${left ? ` ${left}개는 너무 크거나 사진·PDF가 아니라 뺐어요.` : ''}`); return; }
    Object.assign(mine, { busy:false, local:false, localFail:true, err:anyText ? '이 기기 안에서는 예약 내용을 다 찾지 못했어요. 칸을 직접 채우거나 아래 AI로 읽기를 써 주세요.' : '이 파일에서 글자를 꺼내지 못했어요(스캔한 사진 PDF일 수 있어요). 칸을 직접 채우거나 아래 AI로 읽기를 써 주세요.' });
  }catch(e){ if(state.sh.vread !== mine) return; Object.assign(mine, { busy:false, local:false, localFail:true, err:navigator.onLine ? '이 기기에서 읽기 도구를 쓰지 못했어요. 칸을 직접 채우거나 아래 AI로 읽기를 써 주세요.' : '처음 한 번은 읽기 도구를 받아야 해서 인터넷이 필요해요. 연결되면 다시 골라 주세요.' }); }
  render();
}
// AI로 읽기 (사용자가 누를 때만): 키가 있으면 그 기기에서 구글에 바로. 여러 장이면 한 장씩 물어 합침
async function aiRead(){
  const s = state; const files = vreadFiles.slice(); if(!files.length) return;
  let info = null; try{ info = askKeyNow(askKeys(localStorage)); }catch(e){}
  if(!info) return;
  if(!navigator.onLine){ s.sh.vread = Object.assign({}, s.sh.vread, { err:'인터넷이 끊겨 있어요. 연결되면 다시 눌러 주세요.' }); render(); return; }
  const mine = s.sh.vread = Object.assign({}, s.sh.vread, { busy:true, local:false, err:'', part:'' }); render();
  try{
    const token = info.kind === 'sa' ? await vertexToken(info.sa) : '';
    if(info.kind === 'sa' && !token){ Object.assign(mine, { busy:false, err:'키가 맞지 않아요. 키를 다시 넣어 주세요.' }); render(); return; }
    const headers = Object.assign({ 'Content-Type':'application/json' }, token ? { Authorization:`Bearer ${token}` } : { 'x-goog-api-key':info.key });
    const got = []; let lastErr = '';
    for(const [k, f] of files.entries()){
      if(state.sh.vread !== mine) return;
      if(files.length > 1){ mine.part = `${k + 1}/${files.length}장`; render(); }
      const doc = f.type === 'application/pdf' ? await fileB64(f) : await askImage(f);
      const body = JSON.stringify(geminiBody(readPrompt(s), doc.mime, doc.data, READ_SCHEMA));
      let r; for(const u of askTargets(info)){ r = await fetchTimed(u, { method:'POST', headers, body }, 90000); if(r.status !== 404) break; }
      const j = await r.json().catch(() => null); const data = r.ok ? readParse(geminiRaw(j)) : null;
      if(data) got.push({ j:data, k }); else lastErr = r.ok ? '' : `${geminiError(r.status, j)} (구글 응답 ${askErrTag(r.status, j)})`;
    }
    if(state.sh.vread !== mine) return;   // 기다리는 동안 다른 파일을 고름
    const merged = mergeReads(got);
    if(!merged){ Object.assign(mine, { busy:false, err:lastErr || '확인서에서 예약 내용을 찾지 못했어요. 더 선명한 사진이나 PDF로 다시 해 주세요.' }); render(); return; }
    useDrafts(readDrafts(s, merged), files.length - got.length ? `${files.length - got.length}장은 못 읽었어요.` : '');
  }catch(e){ if(state.sh.vread === mine){ Object.assign(mine, { busy:false, err:'답이 늦어요. 다시 골라 주세요.' }); render(); } }
}
function useDrafts(list, how){
  const s = state; const r0 = s.sh.vread || {}; const name = r0.name || '', from = r0.from || '';
  if(!list.length){ s.sh.vread = { name, from, err:'확인서에서 예약 내용을 찾지 못했어요.' }; render(); return; }
  const [first, ...rest] = list.map(d => Object.assign(d, { fromRead:true }));
  s.vedit = null; s.vdraft = first;
  const short = first.kind === 'flight' && first.paxShort ? ` 이 표에는 일행 중 ${first.paxShort}명이 없어요 — 아래 ‘인원별로 넣기’에서 누구 표인지 맞는지 봐 주세요(따로 예약한 사람은 그 사람이 자기 폰에서 넣으면 돼요).` : '';
  s.sh.vread = { name, from, queue:rest, msg:`${how ? how + ' ' : ''}확인서를 읽어 아래 칸을 채웠어요. 맞는지 보고 '보관함에 넣기'를 눌러 주세요.${list.some(d => d.kind === 'flight') ? ' 넣으면 여행지의 비행기 편·시간도 채워져요.' : ''}${short}${list.length > 1 ? ` 예약이 ${list.length}개 있어요 — 저장하면 다음 것을 이어서 채워요.` : ''}` };
  render(); showReadResult();
}
// 저장한 뒤: 같은 확인서의 다음 편(오는 편 등)을 이어서
function nextDraft(){
  const s = state; const r = s.sh.vread; if(!r || !r.queue) return;
  if(r.queue.length){ s.vdraft = r.queue.shift(); r.msg = `다음 예약을 채웠어요. 맞는지 보고 저장해 주세요.${r.queue.length ? ` (${r.queue.length}개 더)` : ''}`; render(); showReadResult(); }
  else { vreadFiles = []; const back = r.from === 'where' && r.flown; s.sh.vread = back ? { back:'항공권을 보관함에 넣고 여행지의 비행기 편·시간에도 반영했어요.' } : null; if(back){ render(); showReadResult(); } }
}
// 여행지 단계 비행기 시간 칸에 넣은 확인서: 보관함으로 옮겨 바로 읽음. 저장하면 날짜·비행기 편·시간이 채워짐(bookings.js applyFlight)
function readFromWhere(files){
  const s = state; s.mode = null; s.step = VAULT_STEP; s.vedit = null; s.vdraft = null; save();
  readDoc(files, 'where');
  const b = document.getElementById('vread'); if(b) b.scrollIntoView({ block:'start' });
}
async function sendRead(){
  const s = state; const files = vreadFiles.slice(); if(!files.length) return; const text = readAppPrompt(s); const copied = clipText(text);
  if(navigator.canShare && navigator.canShare({ files })){
    try{ await navigator.share({ files, text }); }catch(e){ if(!e || e.name !== 'AbortError') toast('보내기가 안 됐어요. 부탁 문장을 복사해 뒀으니 AI 앱에 확인서와 함께 붙여 주세요.'); }
  } else { await copied; toast('이 브라우저에서는 파일을 바로 보낼 수 없어요. 부탁 문장을 복사해 뒀으니 AI 앱에 확인서와 함께 붙여 주세요.'); }
}

function onChange(e){
  const t = e.target; const s = state;
  if(t.id === 'vreadfile'){ const L = Array.from(t.files || []); if(L.length) readDoc(L); return; }
  if(t.id === 'flreadfile'){ const L = Array.from(t.files || []); if(L.length) readFromWhere(L); return; }
  if(t.dataset.kid != null){ s.kids[+t.dataset.kid] = Math.min(17, Math.max(0, parseInt(t.value, 10) || 0)); }
  else if(t.dataset.date){ if(!t.value) return; setTripDate(s, t.dataset.date, t.value); s.fullDay = {}; s.assign = {}; s.dlock = {}; s.nights = {}; }
  else if(t.dataset.full){
    // 다른 '하루 종일' 장소와 날짜가 겹치면 서로 맞바꿈
    const id = t.dataset.full; const nv = +t.value; const fa = fullAssign(s, buildDays(s)); const prev = fa[id];
    Object.keys(fa).forEach(k => { if(k !== id && fa[k] === nv) s.fullDay[k] = prev; });
    s.fullDay[id] = nv;
  }
  else if(t.dataset.night){ const k = t.dataset.night; const o = Object.assign({}, s.nights); if(t.value) o[k] = t.value; else delete o[k]; s.nights = o; }
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
  else if(t.dataset.rphoto){ const f = Array.from(t.files || []); t.value = ''; if(f.length) addDayPhotos(t.dataset.rphoto, f); return; }
  else if(t.dataset.rnote){
    const k = t.dataset.rnote; let it = photoOf(s.vault, k);
    if(!it){ if(!t.value.trim()) return; it = newPhotoItem(k, 'v' + Date.now().toString(36)); s.vault = (s.vault || []).concat(it); }
    it.memo = t.value.trim().slice(0, 100);
  }
  else if(t.dataset.idnew != null || t.dataset.idadd){   // 여권·사진 사본 (js/vault.js idcopy)
    const f = Array.from(t.files || []).filter(x => /^image\//.test(x.type)); t.value = ''; if(!f.length) return;
    let it = t.dataset.idadd ? s.vault.find(x => x.id === t.dataset.idadd) : null;
    if(!it){ const w = document.getElementById('idwho'); it = newIdCopy('v' + Date.now().toString(36), w && w.value); s.vault.push(it); }
    addIdFiles(it, f); return;
  }
  else if(t.dataset.mtrsta != null){ s.sh.mtr = MTR_STATIONS[t.value] ? { key:t.dataset.mtrsta, sta:t.value } : null; render(); return; }   // 역만 바꾸고, 부르기는 버튼을 누를 때
  else if(t.id === 'vkind'){ const f = document.getElementById('vaultform'); if(f) f.dataset.kind = t.value; return; }   // 종류마다 다른 칸 (다시 그리면 적던 게 지워짐)
  else if(t.dataset.mv){
    const f = t.dataset.mv; const val = f === 'booked' ? t.checked : f === 'min' ? (+t.value > 0 ? Math.min(1440, Math.round(+t.value)) : null)
      : f === 'from' || f === 'to' ? t.value.trim().slice(0, 40) : f === 'note' ? t.value.trim().slice(0, 80) : t.value;
    // 공항·지역을 바꾸면 정해 둔 공항버스는 그 목록에 없을 수 있어서 풀고, 찾은 결과도 지움
    if(f === 'kap' || f === 'barea'){ setMove(s.sh.mvEdit, () => ({ [f]:val, bus:'' })); s.sh.bus = null; s.sh.park = null; }
    else setMove(s.sh.mvEdit, () => ({ [f]:val }));
    save();
    setTimeout(() => { const a = document.activeElement; const id = a && a.id; render(); const el = id && document.getElementById(id); if(el) el.focus({ preventScroll:true }); });   // 다음 칸으로 넘어가도 입력이 안 끊기게
    return;
  }
  else if(t.dataset.flight){ s.flight = Object.assign({ ap:'', arr:'', dep:'' }, s.flight, { [t.dataset.flight]:t.value }); }
  else if(t.dataset.askphoto != null){ const f = t.files && t.files[0]; t.value = ''; if(f){ setAskPhoto(f); s.sh.ask.res = null; render(); askNow(); } return; }
  else if(t.dataset.asknote != null){ s.askNote = t.value.trim().slice(0, 200); }
  else if(t.dataset.bkimport != null){ const f = t.files && t.files[0]; t.value = ''; if(f) readBackupFile(f); return; }
  else if(t.dataset.lname != null){
    const p = partyOf(s).map(x => Object.assign({}, x)); const it = p.find(x => x.id === t.dataset.lname); if(!it) return;
    it.name = t.value.trim().slice(0, 12) || it.name; s.party = p;
  }
  else if(t.dataset.sf != null){ s.safety = Object.assign({ hname:'', addr:'', tel:'', meet:'' }, s.safety, { [t.dataset.sf]:t.value.trim().slice(0, 120) }); }
  else if(t.dataset.sphone != null){ s.sphone = t.value.trim().slice(0, 30); }
  else if(t.dataset.pkwho != null){ const it = s.pack[t.dataset.pkwho]; if(!it) return; it.who = t.value; }
  else if(t.dataset.bud != null){
    // 못 읽는 글이면 그대로 두고 칸만 원래 값으로. 고치는 동안은 칸을 열어 둠('다 정했어요'로 닫기)
    const v = parseWon(t.value); if(t.value.trim() && !v){ render(); return; }
    s.budget = setBudget(s, t.dataset.bud, v); s.sh.lbedit = true; save();
    // 다음 칸으로 넘어가며 바뀐 것이면 다시 그린 뒤 그 칸에 그대로 (분류별 예산을 이어서 적을 수 있게)
    setTimeout(() => { const a = document.activeElement; const id = a && a.id; render(); const el = id && document.getElementById(id); if(el) el.focus({ preventScroll:true }); });
    return;
  }
  else if(t.dataset.lrate != null){ s.lrate = Math.max(0, Math.round((+t.value || 0) * 100) / 100); }
  else if(t.dataset.rcpt != null){ const list = Array.from(t.files || []); const id = t.dataset.rcpt; t.value = ''; addReceipt(id, list); return; }
  else if(t.dataset.limport != null){
    const f = t.files && t.files[0]; t.value = ''; if(!f) return;
    f.text().then(text => {
      const sh = state.sh; const p = planTripleImport(text, state);
      sh.limp = p.ok && p.items.length ? p : null; sh.limpName = f.name; sh.limpMsg = p.ok ? '' : p.error; sh.limpBad = !p.ok;
      if(p.ok && !p.items.length) sh.limpMsg = p.dup ? '이 파일의 지출은 이미 모두 가져왔어요.' : '';
      render(); const b = document.getElementById('limpbox'); if(b) b.scrollIntoView({ block:'start' });
    });
    return;
  }
  else if(t.dataset.hcur != null){ s.hotelCur = t.value; }
  else if(t.dataset.hprice != null || t.dataset.hpcur != null){
    // 사이트별 가격: 'hotelId|siteKey'
    const [id, key] = (t.dataset.hprice || t.dataset.hpcur).split('|'); const h = hotelOfId(id); if(!h) return;
    h.prices = h.prices || {}; const p = h.prices[key] || { v:0, cur:'KRW' };
    if(t.dataset.hprice != null){ p.v = Math.max(0, Math.round(+t.value || 0)); const d = new Date(); p.at = `${d.getMonth()+1}/${d.getDate()}`; }
    else p.cur = t.value;
    if(!p.cur){ p.cur = 'KRW'; }
    h.prices[key] = p;
  }
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
  if(e.target.classList.contains('cmform')){ e.preventDefault(); onShareSubmit(e.target); return; }
  if(e.target.id === 'vaultform'){ e.preventDefault(); saveVault(); return; }
  if(e.target.id === 'ledgerform'){ e.preventDefault(); addFromLine(); return; }
  if(e.target.id === 'packform'){
    e.preventDefault(); const inp = document.getElementById('pkin');
    const add = customItems(inp.value, () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), Date.now());
    if(!Object.keys(add).length) return;
    Object.assign(state.pack, add); save(); render(); const i = document.getElementById('pkin'); if(i) i.focus(); return;
  }
  if(e.target.id === 'ledgerdetail'){ e.preventDefault(); saveDetail(); return; }
  if(e.target.id === 'busform'){ e.preventDefault(); findAirBus(e.target.dataset.v, document.getElementById('busq').value); return; }
  if(e.target.id === 'pkform'){   // 공공데이터포털 인증키: 이 기기에만 (일정 상태·백업과 따로)
    e.preventDefault(); const k = document.getElementById('pkkey').value.trim(); if(!k) return;
    try{ localStorage.setItem(PK_KEY, k); }catch(e){ return; }
    state.sh.pkOn = true; render(); return;
  }
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
// 시각 칸(24시간): 바뀌거나 저장하기 전에 '1430' → '14:30'으로 (다른 처리보다 먼저, capture)
{ const dl = document.createElement('datalist'); dl.id = 'hhmm'; for(let m = 0; m < 1440; m += 30) dl.appendChild(Object.assign(document.createElement('option'), { value:hm(m) })); document.body.appendChild(dl); }
const fixHHMM = el => { if(el && el.matches && el.matches('input[data-hhmm]')){ const v = normHHMM(el.value); if(el.value && !v) toast('시각은 14:30처럼 24시간으로 넣어 주세요.'); el.value = v; } };
document.addEventListener('change', e => fixHHMM(e.target), true);
document.addEventListener('submit', e => { (e.target.querySelectorAll ? e.target.querySelectorAll('input[data-hhmm]') : []).forEach(fixHHMM); }, true);
document.addEventListener('change', onChange);
// 확인서를 끌어다 놓기 (PC): 여행지 비행기 칸·보관함 확인서 칸
document.addEventListener('dragover', e => { if(e.target.closest && e.target.closest('[data-dropread]')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const z = e.target.closest && e.target.closest('[data-dropread]'); if(!z) return;
  e.preventDefault(); const L = Array.from((e.dataTransfer && e.dataTransfer.files) || []); if(!L.length) return;
  if(z.dataset.dropread === 'where') readFromWhere(L); else readDoc(L);
});
document.addEventListener('submit', onSubmit);
{
  const j = parseJoin(location.hash);
  if(j){
    history.replaceState(history.state, '', location.pathname + location.search);
    if(j !== state.shareId){ state.sh.pendingJoin = j; state.sh.open = true; }
    startShare();
  } else if(state.shareId) startShare();
  else { let signed = false; try{ signed = localStorage.getItem(SIGNED_KEY) === '1'; }catch(e){} if(signed) startShare(); }   // 로그인한 적 있는 기기: 앱만 열어도 내 계정 여행으로
}
/* ---------- 위치 공유 (켜는 사람만, js/loc.js) ---------- */
// 앱을 열어 둔 동안만 위치를 받아(watchPosition) 움직이거나 2분마다 올림. 여행 마지막 날이 지나면 끄고 서버 위치도 지움
let geoWatch = null, locLast = null;
// 끝난 여행의 위치가 서버에 남아 있으면 지움 (주인은 모두, 다른 사람은 자기 것). 같은 위치는 한 번만 시도
const locCleared = new Set();
function clearExpiredLocs(id, list){
  const sh = state.sh, u = sh.user; if(!u || state.shareId !== id) return;
  expiredLocs(list, { today:locToday(new Date(), REGION.tz), myUid:u.uid, isOwner:!!(sh.trip && sh.trip.ownerUid === u.uid) })
    .filter(uid => !locCleared.has(id + '/' + uid))
    .forEach(uid => { locCleared.add(id + '/' + uid); SH.clearLoc(id, uid).catch(() => {}); });
}
function stopGeo(){ if(geoWatch != null){ try{ navigator.geolocation.clearWatch(geoWatch); }catch(e){} geoWatch = null; } locLast = null; }
function locSync(){
  const s = state, today = locToday(new Date(), REGION.tz);   // 여행지 날짜 (화면의 sh.today와 같게)
  if(locExpired(s, today)){ locOff('여행이 끝나서 위치 보여 주기를 껐어요. 서버에 있던 위치도 지웠어요.'); return; }
  const want = s.locOn && canShareLoc(s, today) && !!s.sh.user && 'geolocation' in navigator;
  if(want && geoWatch == null) geoWatch = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy:true, maximumAge:30000, timeout:60000 });
  else if(!want && geoWatch != null) stopGeo();
}
function onPos(p){
  const s = state; const l = roundLoc(p.coords); if(!l || !s.locOn || !s.shareId || !s.sh.user) return;
  const first = !s.sh.locMe; s.sh.locMe = l;
  const now = Date.now(); if(!shouldSend(locLast, l, now)){ if(first && s.mode === 'today') renderRemote(); return; }
  locLast = Object.assign({ t:now }, l);
  SH.setLoc(s.shareId, s.sh.user, l, s.end).catch(() => { locLast = null; });
}
function onPosErr(e){
  if(e && e.code === 1){ stopGeo(); state.locOn = false; saveLocal(); state.sh.locMsg = '위치 권한이 꺼져 있어요. 휴대폰 설정에서 브라우저(또는 트립노선 앱)의 위치를 허용한 뒤 다시 켜 주세요.'; render(); }
}
function locOff(msg){
  const s = state, id = s.shareId, u = s.sh.user;
  s.locOn = false; stopGeo(); s.sh.locMe = null; saveLocal(); s.sh.locMsg = msg || '';
  if(id && u) SH.clearLoc(id, u.uid).catch(() => {});
  render();
}

/* ---------- 인터넷 연결 안내 띠 (js/net.js) ---------- */
const NET_KEY = 'tripnoseon-online-at';   // 마지막으로 연결돼 있던 때 (이 기기에만)
let netBack = false, netBackTimer = null;
function markOnline(){ try{ localStorage.setItem(NET_KEY, String(Date.now())); }catch(e){} }
function renderNet(){
  const el = document.getElementById('net'); if(!el) return;
  if(navigator.onLine) markOnline();
  let at = null; try{ at = +localStorage.getItem(NET_KEY) || null; }catch(e){}
  const b = netBanner({ online:navigator.onLine, back:netBack, at, now:Date.now(), shared:!!state.shareId });
  el.hidden = !b; if(!b){ el.innerHTML = ''; return; }
  el.className = 'net ' + b.kind;
  const head = `<b>${b.title}</b>${b.text ? ` <span>${b.text}</span>` : ''}`;
  const open = !!el.querySelector('details[open]');   // 펼쳐 둔 채로 다시 그려도 접히지 않게
  el.innerHTML = b.more ? `<details${open ? ' open' : ''}><summary>${head}</summary><p>${b.more}</p></details>` : head;
}
window.addEventListener('offline', () => { netBack = false; clearTimeout(netBackTimer); renderNet(); });
window.addEventListener('online', () => {
  netBack = true; renderNet(); clearTimeout(netBackTimer);
  netBackTimer = setTimeout(() => { netBack = false; renderNet(); }, 4000);
  if(state.shareId && !userWatching) startShare();   // 끊긴 채로 앱을 열어 함께 짜기를 못 불러왔으면 다시
});

/* ---------- 구글에서 담은 곳 새로 받기 (약관: 좌표 등은 30일 넘게 두지 않음, js/gplace.js) ---------- */
// 앱을 열고 인터넷이 될 때 한 번, 받은 지 25일 지난 곳만 조용히. 함께 짜기 여행이면 고친 값이 가족에게도 감
let gRefreshing = false;
async function refreshGoogle(){
  if(gRefreshing || !navigator.onLine) return;
  const stale = staleGoogle(state.custom, Date.now()).slice(0, 30); if(!stale.length) return;
  gRefreshing = true;
  try{
    const got = await refreshPlaces(stale.map(p => p.gid)); if(!got.length) return;
    const now = Date.now(); const by = new Map(got.map(g => [g.id, g]));
    state.custom = state.custom.map(p => p.src === 'google' && by.has(p.gid) ? applyRefresh(p, by.get(p.gid), now) : p);
    save(); renderRemote();
  }catch(e){ console.warn('구글 장소 새로 받기 실패', e); }
  finally{ gRefreshing = false; }
}
window.addEventListener('online', () => setTimeout(refreshGoogle, 3000));

// 여행 중 그날 처음 열면 오늘 하루 화면부터 (계획으로 돌아가면 그날은 다시 안 띄움)
// 고른 여행 지역의 데이터를 먼저 불러옴 (홍콩·선전은 따로 받는 파일). 못 불러오면 도쿄로 보여 주고 지역 단계에서 알림
if(!(await loadRegion(state.city))){ await loadRegion('tokyo'); state.sh.cityMsg = `${(REGIONS[state.city] || {}).name || '이 지역'} 데이터를 불러오지 못했어요. 인터넷을 확인하고 다시 열어 주세요.`; }
{ const td = tripClock(new Date(), REGION.tz).date; if(shouldAutoOpen(state, td)){ state.mode = 'today'; state.tday = null; state.todayOpened = td; saveLocal(); } }
// 구글 지도 앱에서 장소를 '공유 → 트립노선'으로 보냈으면(설치한 앱, manifest share_target): 장소 담기에서 구글 지도로 그 장소를 띄움
//   쓸 게 없는 공유(이름도 구글 지도 주소도 없음)여도 주소의 st·sx·su는 지움(새로 고쳐도 또 열리지 않게, 다른 칸은 남김)
const shareQ = new URLSearchParams(location.search);
const sharedIn = sharedPlace(shareQ);
if(SHARE_KEYS.some(k => shareQ.has(k))) history.replaceState(history.state, '', location.pathname + stripShare(location.search) + location.hash);
if(sharedIn){ state.mode = null; state.step = STEPS.indexOf('장소 담기'); saveLocal(); }
render();
if(sharedIn) openLiveMap(sharedIn).catch(() => false).then(ok => {
  if(ok) return;   // 지도를 못 열면(키·인터넷·지도 오류) 가져온 곳 목록에 올려 두고 이름으로 위치 찾기
  closeMap(); const list = parseLines(`${sharedIn.name} ${sharedIn.url}`.trim());
  if(!list.length){ toast('공유한 링크에 장소 이름이 없어요. 장소 담기에서 이름으로 찾아 주세요.'); return; }
  addImports(list); const r = state.imports[state.imports.length - 1];
  toast(r.dup ? `'${r.name}'은(는) 이미 장소 목록에 있어요.` : `'${r.name}'을(를) 가져온 곳 목록에 올렸어요.`);
});
if(state.step === VAULT_STEP) refreshUsage();
setTimeout(refreshGoogle, 4000);   // 첫 화면을 먼저 그린 뒤

// 개발 중에만: 폰에서 쓰다가 버튼 하나로 PC의 Claude 대화(원격 조종)로 넘어가 질문·수정 요청.
// 주소 뒤에 ?dev=1 을 붙여 한 번 열면 이 기기에서만 켜지고 ?dev=0 으로 꺼짐.
// 주소를 칠 수 없는 홈 화면 앱에서는 맨 위 '트립노선' 글자를 5번 빨리 누르면 켜고 끔(폰에서는 '가칭 · 시제품'이 숨겨짐). 상용화 때 이 묶음과 .devchat 스타일을 지움
const DEV_KEY = 'tripnoseon-dev';
function setDev(on){ try{ if(on) localStorage.setItem(DEV_KEY, '1'); else localStorage.removeItem(DEV_KEY); }catch(e){} }
{
  const q = new URLSearchParams(location.search).get('dev');
  if(q === '1' || q === '0'){ setDev(q === '1'); history.replaceState(history.state, '', location.pathname + location.hash); }
  let taps = [];
  document.querySelector('.brand')?.addEventListener('click', () => {
    const now = Date.now(); taps = taps.filter(t => now - t < 2500).concat(now);
    if(taps.length >= 5){ taps = []; const on = !hasKey(DEV_KEY); setDev(on); toast(on ? 'Claude 대화 버튼을 켰어요.' : 'Claude 대화 버튼을 껐어요.'); setTimeout(() => location.reload(), 900); }
  });
}
if(hasKey(DEV_KEY)){
  let ver = '';
  if('caches' in window) caches.keys().then(k => { ver = (k.find(x => x.startsWith('tripnoseon-')) || '').slice(11); }).catch(() => {});
  const a = document.createElement('a');
  a.className = 'ghost devchat'; a.href = 'https://claude.ai/code'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '💬';
  a.setAttribute('aria-label', 'Claude와 이야기하기');
  // 누르면 지금 화면 정보를 복사해 두고 Claude를 엶 → 대화창에 붙여 넣으면 어느 화면 얘기인지 바로 앎
  a.addEventListener('click', () => {
    const s = state, where = s.mode === 'sos' ? '긴급' : s.mode === 'today' ? '오늘' : STEPS[s.step];
    const txt = `[트립노선 ${ver || '?'} · ${where} 화면 · ${(REGIONS[s.city] || {}).name || s.city}] `;
    try{ navigator.clipboard.writeText(txt).catch(() => {}); }catch(e){}
    toast('지금 화면 정보를 복사했어요. Claude 대화창에 붙여 넣고 말씀해 주세요.');
  });
  devBar.el = a; devBar();
}
// 화면을 가리지 않게 아래 막대(이전·다음) 오른쪽 끝에 둠. 막대는 render()가 매번 새로 그려서 그때마다 다시 붙임
function devBar(){ if(devBar.el) document.getElementById('bar').appendChild(devBar.el); }

// 오프라인 사용(홈 화면 앱). localhost 개발 중에는 캐시 때문에 헷갈리지 않게 등록하지 않음
if('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)){
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// 새 버전 알림: 앱을 켜 둔 채로는 새 버전을 알 길이 없어서, 서버의 sw.js 번호를 가끔 봄 (열 때·앱으로 돌아올 때·15분마다, 5분에 한 번까지)
//   주고받는 것은 앱 파일뿐이라 일정·개인정보는 나가지 않음. 새 버전이 있으면 새로고침 버튼이 깜빡임
const UP_GAP = 300000;
let upLast = 0, upBusy = false;
async function checkUpdate(){
  const b = document.getElementById('refreshBtn');
  if(!b || b.classList.contains('new') || upBusy || !navigator.onLine || Date.now() - upLast < UP_GAP) return;
  upBusy = true; upLast = Date.now();
  try{
    const r = await fetch('sw.js', { cache:'no-store' });
    if(r.ok && isNewer(await r.text())){ b.classList.add('new'); b.textContent = '↻ 새 버전 적용'; b.setAttribute('aria-label', '새 버전이 있어요. 눌러서 적용하기'); }
  }catch(e){}
  upBusy = false;
}
// 새로고침: 아직 안 올린 공유 변경을 올리고, 새 버전을 받아 둔 뒤 다시 엶 (느린 연결에서도 새 파일이 열리게)
async function applyUpdate(){
  const b = document.getElementById('refreshBtn'); b.disabled = true; b.textContent = '↻ 적용 중…';
  const wait = ms => new Promise(ok => setTimeout(ok, ms));
  try{
    if(pushTimer){ clearTimeout(pushTimer); await Promise.race([pushNow(), wait(1500)]); }
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if(reg){
      await Promise.race([reg.update(), wait(4000)]);
      const w = reg.installing || reg.waiting;
      if(w) await Promise.race([new Promise(ok => w.addEventListener('statechange', () => { if(w.state === 'activated' || w.state === 'redundant') ok(); })), wait(8000)]);
    }
  }catch(e){}
  location.reload();
}
setTimeout(checkUpdate, 3000);
setInterval(() => { if(document.visibilityState === 'visible') checkUpdate(); }, 900000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') checkUpdate(); });
