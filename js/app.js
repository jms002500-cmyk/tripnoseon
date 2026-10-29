// 앱 진입점: 상태 저장/불러오기, 화면 그리기, 이벤트 처리
import { AREAS, STEPS, DEFAULT } from './data.js';
import { clone, buildDays, fullAssign, autoPickIds, allPlaces, plan, lockDay, unlockDay, keepLockedAssign } from './logic.js';
import { VIEWS, SHEET, vToday, vSafety } from './views.js';
import { phaseOf, shownDate, shouldAutoOpen, doneKey } from './today.js';
import { suggestPacking, missingSuggestions, seedItems, customItems } from './packing.js';
import { swapPlan, undoSwap } from './rain.js';
import { parseImport, toRow, rowToPlace, coordsFromUrl, nearTokyo, nearestArea, safeMapUrl, safeHttpsUrl } from './gimport.js';
import { geocode } from './geocode.js';
import { openMap, nearbyFood } from './gmap.js';
import { mealSlots, foodKey } from './food.js';
import { matchKnown, toCustom } from './gplace.js';
import { vacantSearch, partyNote } from './rakuten.js';
import { loadWeather, tripMonthDays, canForecast, ymd } from './weather.js';
import { loadFx, convert } from './prices.js';
import { planTripleImport, applyTripleImport } from './ledgerimport.js';
import { atPlace, parseLine, previewText, ledgerHint, defaultPayer, dayLabel, partyOf, newSpendId, newPersonId, money, rateOf, personUsed, catOf } from './ledger.js';
import { parseWon, setBudget } from './budget.js';
import { ledgerCsv, ledgerCsvName } from './ledgerexport.js';
import { missingBookings, bookings, receiptOf, newReceipt } from './vault.js';
import { putFile, getFile, delFile, shrinkImage, keepStorage, usage, MAX_FILE } from './vaultdb.js';
import { makeBackup, backupName, parseBackup, summarizeBackup, restoreState, blobToB64, b64ToBlob } from './backup.js';
import { sizeText } from './vault.js';
import * as SH from './share.js';
import { netBanner } from './net.js';
import { sharedOf, diffShared, applyRemote, inviteLink, parseJoin, describeChange, voteSummary, DELETE } from './sharecore.js';

const S_KEY = 'tripnoseon-v1';
const RK_KEY = 'tripnoseon-rakuten';   // 라쿠텐 키는 일정 상태와 따로 저장 (상태를 내보내거나 백업해도 키는 안 섞이게)
const BK_KEY = 'tripnoseon-before-join';
const RS_KEY = 'tripnoseon-before-restore';   // 백업으로 바꾸기 직전 상태 (되돌리기 취소용)   // 공유 여행에 참여하기 직전 내 일정 (되돌리기용)
const VAULT_STEP = STEPS.indexOf('보관함'), LEDGER_STEP = STEPS.indexOf('가계부'), PACK_STEP = STEPS.indexOf('준비물'), PLAN_STEP = STEPS.indexOf('일정');
let state = load();
state.rkOn = !!rkKeys();
state.sh = freshSh();
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
      if(it){ if(s.hotelCur === 'JPY') h.price = it.price; h.priceAt = at; h.soldOut = false; if(!h.ko && it.ko) h.ko = it.ko; } else { h.soldOut = true; h.priceAt = at; } });
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
  s.hotels.push({ id:'h' + Date.now().toString(36), name:it.name, ko:it.ko || '', price:wonInUse ? 0 : it.price, mapUrl:'', bookUrl:safeHttpsUrl(it.url), memo,
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
  const stale = !s.wx || s.wx.key !== key || (canForecast(s.start, new Date()) && s.wx.forecastAt !== today) || (s.wx.error && force);
  if(!stale) return;
  s.wxBusy = true;
  loadWeather(s.city, s.start, s.end).then(w => { if(state !== s) return; s.wxBusy = false; s.wx = w; save(); render(); });
}

// 숙소 동네·가계부 단계에서 환율을 하루 한 번 받아 둠 (원·엔 가격 비교, 지출 합계)
let fxBusy = false;
function ensureFx(){
  const s = state; const today = ymd(new Date());
  if((s.step !== 4 && s.step !== LEDGER_STEP) || fxBusy || (s.fx && s.fx.checked === today)) return;
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
function freshSh(){ return { open:false, user:null, authReady:false, trip:null, votes:{}, comments:[], log:[], msg:'', busy:false, pendingJoin:null, cmPlace:null, delArmed:false, hasBackup:hasBackup(), hasRestoreUndo:hasKey(RS_KEY), restore:null, bkmsg:'', bkbusy:false }; }
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
      if(u && state.shareId) watchTrip(); else if(!u) unwatch();
      render();
    });
  }catch(e){ userWatching = false; state.sh.msg = '함께 짜기를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'; state.sh.authReady = true; render(); }
}

function unwatch(){ unsubs.forEach(f => { try{ f(); }catch(e){} }); unsubs = []; }

// 서버가 받아 준 마지막 공유 일정을 이 기기에도 남김(BASE_KEY). 지하철처럼 끊긴 곳에서 고치고 앱을 닫았다가
// 다시 열어도, 그 기준과 지금 일정의 차이를 '아직 못 올린 내 변경'으로 보고 서버 일정 위에 다시 얹어 올림
const BASE_KEY = 'tripnoseon-synced';
function loadBase(id){ try{ const b = JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); return b && b.id === id ? b.p : null; }catch(e){ return null; } }
function saveBase(id, p){ try{ localStorage.setItem(BASE_KEY, JSON.stringify({ id, p })); }catch(e){} }
// 다음에 받는 서버 일정을 그대로 따름 (참여·백업 되돌리기·공유 끊기)
function forgetSync(){ lastSynced = null; try{ localStorage.removeItem(BASE_KEY); }catch(e){} }

// 'p.key' / 'p.key.id' 경로의 값을 상태에 직접 넣기 (아직 못 올린 내 변경을 서버 일정 위에 다시 얹을 때)
function setPath(s, path, v){
  const [, key, sub] = path.split('.');
  if(sub == null){ s[key] = v; return; }
  s[key] = s[key] && typeof s[key] === 'object' ? s[key] : {};
  if(v === DELETE) delete s[key][sub]; else s[key][sub] = v;
}

function watchTrip(){
  unwatch(); const id = state.shareId; if(!id) return;
  unsubs.push(SH.watchTrip(id, (data, mine) => {
    if(state.shareId !== id) return;
    if(!data){ stopShare('공유 여행이 지워졌어요. 이 기기의 일정은 그대로 남아요.'); return; }
    const s = state;
    s.sh.trip = { title:data.title || '', ownerUid:data.ownerUid, members:data.members || {}, memberUids:data.memberUids || [], open:!!data.open, updatedBy:data.updatedBy || null };
    s.sh.votes = data.votes || {};
    if(data.p){
      // 아직 서버에 못 올린 내 변경을 기억했다가, 서버 일정을 받은 뒤 그 위에 다시 얹음 (서로 덮어쓰지 않게)
      //   앱을 막 열었으면 이 기기에 남긴 기준으로 (끊긴 동안 고친 것)
      const base = lastSynced || loadBase(id);
      const pending = base ? diffShared(base, sharedOf(s)) : [];
      applyRemote(s, data.p);
      lastSynced = sharedOf(s);
      if(!mine) saveBase(id, lastSynced);   // 아직 서버가 안 받은 내 변경이 섞인 일정은 기준으로 남기지 않음
      pending.forEach(([path, v]) => setPath(s, path, v));
      saveLocal();
      if(pending.length) schedulePush();
    }
    renderRemote();
  }, code => {
    if(code === 'permission-denied') stopShare('이 공유 여행에 들어갈 수 없어요. 초대 링크가 닫혔거나 여행에서 빠졌어요. 이 기기의 일정은 그대로 남아요.');
    else { state.sh.msg = '공유 연결이 끊겼어요. 잠시 후 다시 열어 주세요.'; render(); }
  }));
  unsubs.push(SH.watchComments(id, list => { state.sh.comments = list; renderRemote(); }));
  unsubs.push(SH.watchLog(id, list => { state.sh.log = list; renderRemote(); }));
}

// 이 기기에서 공유를 끊음 (일정은 마지막 상태 그대로 남김)
function stopShare(msg){
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();
  const s = state; s.shareId = null; s.sh.trip = null; s.sh.votes = {}; s.sh.comments = []; s.sh.log = []; s.sh.cmPlace = null; s.sh.msg = msg || '';
  saveLocal(); render();
}

function schedulePush(){
  if(!state.shareId || !state.sh || !state.sh.user || !lastSynced) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 500);
}
async function pushNow(){
  pushTimer = null;
  const s = state, id = s.shareId, u = s.sh.user; if(!id || !u || !lastSynced) return;
  const next = sharedOf(s); const changes = diffShared(lastSynced, next); if(!changes.length) return;
  const prev = lastSynced; const text = describeChange(prev, next); lastSynced = next;
  try{
    await SH.pushChanges(id, u, changes);   // 끊긴 동안은 다시 연결돼 서버가 받을 때까지 기다림
    if(state.shareId === id){ const b = loadBase(id); if(b){ changes.forEach(([path, v]) => setPath(b, path, v)); saveBase(id, b); } }
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
      case 'logout': unwatch(); await SH.signOut(); break;
      case 'sharestart': {
        if(!u || sh.busy) return;
        const title = (document.getElementById('sharetitle')?.value || '').trim().slice(0, 40) || '함께 짜는 여행';
        sh.busy = true; render();
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
        SH.addLog(jid, u, '여행에 참여함').catch(() => {});
        break;
      }
      case 'joincancel': sh.pendingJoin = null; break;
      case 'restore': {
        let bk = null; try{ bk = JSON.parse(localStorage.getItem(BK_KEY) || 'null'); }catch(e){}
        if(!bk) return;
        const keepSh = sh; state = Object.assign(clone(DEFAULT), bk, { shareId:null }); state.rkOn = !!rkKeys(); state.sh = keepSh;
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
  const fail = () => toast(`이 링크를 보내 주세요: ${text}`);
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
function renderRemote(){ if(typing()){ renderLater = true; return; } render(); }
document.addEventListener('focusout', () => { if(renderLater){ renderLater = false; setTimeout(() => { if(!typing()) render(); else renderLater = true; }, 0); } });

function render(){
  const s = state;
  renderNet();
  document.getElementById('line').innerHTML =
    `<span class="fill" style="width:${(s.step / (STEPS.length-1)) * (100 - 100 / STEPS.length)}%"></span>` +
    STEPS.map((l, i) => `<li class="stn${i < s.step ? ' done' : ''}${i === s.step ? ' now' : ''}"><button type="button" data-act="go" data-v="${i}"${i === s.step ? ' aria-current="step"' : ''}><span class="dot"></span><span class="lbl">${l}</span></button></li>`).join('');
  s.sh.today = ymd(new Date());
  const todayMode = s.mode === 'today', sosMode = s.mode === 'sos';
  if(todayMode || sosMode) document.querySelectorAll('#line .stn.now').forEach(li => { li.classList.remove('now'); li.querySelector('button').removeAttribute('aria-current'); });
  document.getElementById('view').innerHTML = sosMode ? vSafety(s) : todayMode ? vToday(s) : VIEWS[s.step](s);
  document.getElementById('line').style.setProperty('--n', STEPS.length);
  document.getElementById('bar').innerHTML = sosMode
    ? `<button type="button" class="ghost" data-act="tclose">돌아가기</button><button type="button" class="primary" data-act="sbig" data-v="hotel">숙소 카드 보여 주기</button>`
    : todayMode
    ? `<button type="button" class="ghost" data-act="tclose">계획으로</button><button type="button" class="primary" data-act="lfocus">지출 적기</button>`
    : s.step < STEPS.length-1
    ? `<button type="button" class="ghost" data-act="prev"${s.step === 0 ? ' disabled' : ''}>이전</button><button type="button" class="primary" data-act="next">다음 · ${STEPS[s.step+1]}</button>`
    : `<button type="button" class="ghost" data-act="prev">이전</button><button type="button" class="primary" data-act="lfocus">지출 적기</button>`;
  const rb = document.getElementById('resetBtn');
  rb.textContent = resetArmed ? '한 번 더 누르면 지워져요' : '처음부터';
  rb.classList.toggle('armed', resetArmed);
  const tb = document.getElementById('todayBtn');
  tb.hidden = phaseOf(s, s.sh.today).phase === 'none';
  tb.classList.toggle('on', todayMode); tb.setAttribute('aria-pressed', String(todayMode));
  const xb = document.getElementById('sosBtn'); xb.classList.toggle('on', sosMode); xb.setAttribute('aria-pressed', String(sosMode));
  document.body.classList.toggle('noscroll', !!s.sh.open || (sosMode && !!s.sh.sbig));
  const sb = document.getElementById('shareBtn');
  sb.textContent = s.shareId && s.sh.trip ? `함께 · ${s.sh.trip.memberUids.length}명` : '함께 짜기';
  sb.classList.toggle('on', !!s.shareId);
  const sheet = document.getElementById('sheet');
  const keepScroll = sheet.querySelector('.shbody') ? sheet.querySelector('.shbody').scrollTop : 0;
  if(s.sh.open){ sheet.innerHTML = SHEET(s); const b = sheet.querySelector('.shbody'); if(b) b.scrollTop = keepScroll; }
  else sheet.innerHTML = '';
  if(!(sosMode && s.sh.sbig)) document.body.classList.toggle('noscroll', !!s.sh.open);
  ensureWeather(false);
  ensureFx();
  hydrateThumbs();
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
  const title = g('vtitle').value.trim(); if(!title) return;
  const picked = Array.from(g('vfiles').files || []);
  const editing = s.vedit ? s.vault.find(x => x.id === s.vedit) : null;
  const it = editing || { id:'v' + Date.now().toString(36), files:[] };
  Object.assign(it, { kind:g('vkind').value, title:title.slice(0, 60), date:g('vdate').value, time:g('vtime').value,
    code:g('vcode').value.trim().slice(0, 40), link:safeHttpsUrl(g('vlink').value), memo:g('vmemo').value.trim().slice(0, 300),
    placeId:g('vplace').value || it.placeId || null });
  const skipped = await storeFiles(it, picked);
  if(!editing) s.vault.push(it);
  s.vedit = null; s.vdraft = null;
  keepStorage(); save(); render(); refreshUsage();
  if(skipped.length) toast(`${skipped.join(', ')}은(는) 너무 크거나 저장 공간이 모자라 넣지 못했어요 (파일 하나 15MB까지).`);
  const card = document.getElementById('v-' + it.id); if(card) card.scrollIntoView({ block:'center' });
}

async function deleteVault(id){
  const s = state; const it = s.vault.find(x => x.id === id); if(!it) return;
  for(const f of it.files || []){ try{ await delFile(f.fid); }catch(e){} if(urls.has(f.fid)){ URL.revokeObjectURL(urls.get(f.fid)); urls.delete(f.fid); } }
  s.vault = s.vault.filter(x => x.id !== id); if(s.vedit === id) s.vedit = null;
  save(); render(); refreshUsage();
}

// 첨부 크게 보기: 사진은 화면 가득(QR을 보여 주기 좋게), PDF는 새 창으로. 보내기·이 첨부 지우기
async function openViewer(itemId, fid){
  const it = state.vault.find(x => x.id === itemId); const f = it && (it.files || []).find(x => x.fid === fid); if(!f) return;
  const u = await fileUrl(fid);
  if(!u){ toast('이 첨부를 찾지 못했어요. 이 기기에서 지워졌을 수 있어요.'); return; }
  if(!/^image\//.test(f.type)){ window.open(u, '_blank', 'noopener'); return; }
  const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', f.name);
  v.innerHTML = `<img src="${u}" alt="">
    <div class="vbar"><button type="button" class="ghost small" data-v="close">닫기</button>
      <button type="button" class="ghost small" data-v="share">보내기</button>
      <button type="button" class="ghost small" data-v="del">이 첨부 지우기</button></div>`;
  document.body.appendChild(v); document.body.classList.add('noscroll');
  const close = () => { v.remove(); if(!state.sh.open) document.body.classList.remove('noscroll'); };
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
    case 'vcancel': s.vedit = null; s.vdraft = null; render(); return;
    case 'vcopy': { const it = s.vault.find(x => x.id === v); if(it && it.code) copyText(it.code, `예약번호 ${it.code}을(를) 복사했어요.`); return; }
    case 'vview': { const [id, fid] = v.split('|'); openViewer(id, fid); return; }
    case 'vdel':
      if(s.sh.vdel !== v){ s.sh.vdel = v; render(); setTimeout(() => { if(state.sh.vdel === v){ state.sh.vdel = null; render(); } }, 4000); return; }
      s.sh.vdel = null; deleteVault(v); return;
  }
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
  sh.bkbusy = true; sh.bkmsg = ''; render();
  try{
    const files = [];
    for(const it of s.vault || []) for(const f of it.files || []){
      const rec = await getFile(f.fid);
      if(rec) files.push({ fid:f.fid, name:rec.name, type:rec.type, size:rec.size, data:await blobToB64(rec.blob) });
    }
    const now = new Date(); const b = makeBackup(s, files, withKeys ? rkKeys() : null, now);
    const blob = new Blob([JSON.stringify(b)], { type:'application/json' }); const name = backupName(now);
    const file = new File([blob], name, { type:'application/json' });
    // 폰에서는 공유 창(파일 앱·메일·카톡으로 저장), PC에서는 내려받기
    if(matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files:[file] })){
      try{ await navigator.share({ files:[file], title:'트립노선 백업' }); }
      catch(e){ if(e && e.name === 'AbortError'){ sh.bkbusy = false; render(); return; } downloadBlob(blob, name); }
    } else downloadBlob(blob, name);
    s.lastBackup = stamp(); sh.bkmsg = `백업 파일 ${name}을(를) 만들었어요 (${sizeText(blob.size)}).${withKeys ? ' 라쿠텐 키가 들어 있으니 남에게 보내지 마세요.' : ''}`;
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
    try{ await putFile(f.fid, { blob:b64ToBlob(f.data, f.type), name:f.name, type:f.type, size:f.size }); }catch(e){ failed++; }
  }
  if(rs.data.rakuten && rs.data.rakuten.key){ try{ localStorage.setItem(RK_KEY, JSON.stringify(rs.data.rakuten)); }catch(e){} }
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();   // 공유 여행이면 서버 일정을 그대로 받음
  state = restoreState(rs.data); state.rkOn = !!rkKeys(); state.sh = sh;
  sh.restore = null; sh.bkbusy = false; sh.hasRestoreUndo = true;
  sh.bkmsg = failed ? `백업으로 바꿨지만 첨부 ${failed}개는 저장 공간이 모자라 넣지 못했어요.` : '백업으로 바꿨어요.';
  saveLocal();
  if(state.shareId){ if(sh.user) watchTrip(); else startShare(); }
  render(); refreshUsage();
}

function undoRestore(){
  let prev = null; try{ prev = JSON.parse(localStorage.getItem(RS_KEY) || 'null'); }catch(e){}
  if(!prev) return;
  const sh = state.sh;
  unwatch(); clearTimeout(pushTimer); pushTimer = null; forgetSync();
  state = restoreState({ state:prev }); state.rkOn = !!rkKeys(); state.sh = sh;
  try{ localStorage.removeItem(RS_KEY); }catch(e){}
  sh.hasRestoreUndo = false; sh.bkmsg = '백업으로 바꾸기 전 상태로 돌아왔어요.';
  saveLocal();
  if(state.shareId){ if(sh.user) watchTrip(); else startShare(); }
  render(); refreshUsage();
}

/* ---------- 가계부 (함께 짜기 여행이면 참여자 모두와 공유) ---------- */
// 오늘 하루 화면에서 적으면 그 화면에서 보고 있는 날짜가 기준(날짜를 안 쓰면 그날, '어제'는 그 전날)
function ledgerCtx(){
  const s = state; const real = ymd(new Date());
  return { today:s.mode === 'today' ? (shownDate(s, real) || real) : real, cur:s.country === 'jp' ? 'JPY' : 'KRW', by:defaultPayer(s) };
}
function spentText(e){
  const w = e.cur === 'JPY' ? convert(e.amt, 'JPY', 'KRW', rateOf(state)) : null;
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
document.addEventListener('input', e => { if(e.target.id === 'lline') updatePreview(); });

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
  const e = { d:g('ldate').value, amt, cur:g('lcur').value === 'KRW' ? 'KRW' : 'JPY', what:g('lwhat').value.trim().slice(0, 40) || catOf(cat).label, cat,
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

function focusVaultForm(){ const f = document.getElementById('vaultform'); if(f){ f.scrollIntoView({ block:'start' }); document.getElementById('vtitle').focus({ preventScroll:true }); } }

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

// 구글 지도 시트: 담은 곳 핀, 장소 카드에서 '몇 일차에 담기'로 바로 일정에
//   g: 구글 장소(gplace.toCustom이 받는 모양) | null(이미 담은 곳 날짜만 옮길 때, knownId)
//   이미 있는 도쿄 장소(65곳)와 같은 곳이면 그 장소를, 전에 담은 구글 장소면 그것을 다시 씀
function openLiveMap(){
  openMap({
    getState: () => state,
    getDays: () => buildDays(state).map(d => ({ i:d.i, label:`${d.i + 1}일차 · ${d.label}` })),
    onToggle: id => { const s = state; if(s.picked[id]) unpick(s, id); else s.picked[id] = true; save(); render(); },
    onPick: (g, day, knownId) => {
      const s = state; let p = knownId ? allPlaces(s).find(x => x.id === knownId) : g && (matchKnown(g) || (s.custom || []).find(c => c.gid && c.gid === g.id));
      if(!p && g){ p = toCustom(g, 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), Date.now()); s.custom.push(p); }
      if(!p) return '';
      s.picked[p.id] = true;
      if(day != null){ if(p.full) s.fullDay[p.id] = day; else s.assign[p.id] = day; }
      save(); render(); return p.name;
    },
    onClose: () => render()
  });
}

function importRowOf(k){ return state.imports.find(r => r.k === k); }

function act(a, v){
  const s = state; let scroll = false;
  switch(a){
    case 'go': s.step = +v; s.mode = null; scroll = true; break;
    case 'prev': s.step = Math.max(0, s.step-1); scroll = true; break;
    case 'next': s.step = Math.min(STEPS.length-1, s.step+1); scroll = true; break;
    case 'topen': s.mode = s.mode === 'today' ? null : 'today'; s.tday = null; scroll = true; break;
    case 'tclose': s.mode = null; s.sh.sbig = null; scroll = true; break;
    case 'sos': s.mode = s.mode === 'sos' ? null : 'sos'; s.sh.sbig = null; scroll = true; break;
    case 'sbig': s.sh.sbig = v || null; if(v && s.mode !== 'sos') s.mode = 'sos'; break;   // 크게 보여 주기 (직원·택시 기사에게)
    case 'tday': s.tday = +v; s.sh.lplace = null; break;
    case 'tspend': {   // 장소에서 바로 비용 적기: 아래 '이날 쓴 돈' 칸에 그 장소를 달아 둠
      s.sh.lplace = v; render();
      const f = document.getElementById('ledgerform'); if(f) f.scrollIntoView({ block:'center' }); focusLine(); updatePreview(); return;
    }
    case 'lplacex': s.sh.lplace = null; render(); focusLine(); return;
    case 'tdone': {   // 다녀옴 표시: 오늘 화면에서 보고 있는 날짜 기준
      const k = doneKey(shownDate(s, ymd(new Date())), v); s.tdone = Object.assign({}, s.tdone);
      if(s.tdone[k]) delete s.tdone[k]; else s.tdone[k] = true; break;
    }
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
    case 'kfilter': s.kindFilter = v; break;
    case 'akind': s.anchorKind = v; break;
    case 'autopick': autoPickIds(s).forEach(id => { s.picked[id] = true; }); break;
    case 'customdel': s.custom = s.custom.filter(c => c.id !== v); unpick(s, v); break;
    case 'hotel': s.hotelArea = s.hotelArea === v ? null : v; break;
    case 'replan': s.assign = keepLockedAssign(s); break;
    case 'dlock': lockDay(s, +v); toast(`${+v + 1}일차를 확정했어요. 이날 장소는 자동으로 바뀌지 않아요.`); break;
    case 'dunlock': unlockDay(s, +v); break;
    case 'impfind': findLocations(); return;
    case 'hfind': findHotelLocations(); return;
    case 'mapopen': openLiveMap(); return;
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
    case 'vnew': case 'vaddq': case 'vedit': case 'vcancel': case 'vcopy': case 'vview': case 'vdel': vaultAct(a, v); return;
    case 'tfood': s.mode = 'today'; s.tday = +v; save(); render(); { const b = document.getElementById('foodbox'); if(b) b.scrollIntoView({ block:'start' }); } return;
    case 'ffind': {   // 끼니 자리 근처 식당 (구글)
      const [di, k] = v.split('|').map(Number); const P = plan(s); const d = P.days[di]; const m = d && mealSlots(d, P.hotel)[k]; if(!m) return;
      const key = foodKey(m.at); s.sh.food = Object.assign({}, s.sh.food, { [key]:{ busy:true } }); render();
      nearbyFood(m.at).then(items => { state.sh.food[key] = { items }; render(); })
        .catch(e => { console.warn('식당 찾기 실패', e); state.sh.food[key] = { err:e && e.message === 'nokey' ? '구글 지도 키를 넣으면 근처 식당을 찾을 수 있어요. 지금은 아래 \'구글 지도에서 더 보기\'를 써 주세요.' : '식당을 못 불러왔어요. 인터넷 연결을 확인하고 다시 눌러 주세요.' }; render(); });
      return;
    }
    case 'fadd': {   // 찾은 식당을 그날 일정에
      const [di, k, rid] = v.split('|'); const P = plan(s); const d = P.days[+di]; const m = d && mealSlots(d, P.hotel)[+k];
      const r = m && ((s.sh.food || {})[foodKey(m.at)] || {}).items; const g = r && r.find(x => x.id === rid); if(!g) return;
      let p = (s.custom || []).find(c => c.gid === g.id);
      if(!p){ p = toCustom({ id:g.id, name:g.name, lat:g.lat, lng:g.lng, types:['restaurant'], periods:g.periods }, 'g' + Date.now().toString(36), Date.now()); s.custom.push(p); }
      s.picked[p.id] = true; s.assign[p.id] = +di; toast(`'${p.name}'을(를) ${+di + 1}일차에 넣었어요.`); break;
    }
    case 'ropen': s.sh.ropen = s.sh.ropen === +v ? null : +v; break;
    case 'tpass': s.sh.tpass = !s.sh.tpass; break;
    case 'rswap': {   // 비 오는 날: 실외 장소는 빼두고 실내 장소를 그날에 (함께 짜기 여행이면 가족 일정도 바뀜)
      const [outId, inId, di] = v.split('|'); const all = allPlaces(s); const name = id => (all.find(p => p.id === id) || {}).name || '';
      s.sh.rundo = Object.assign(swapPlan(s, outId, inId, +di), { day:+di, outName:name(outId), inName:name(inId) }); break;
    }
    case 'rundo': if(s.sh.rundo){ undoSwap(s, s.sh.rundo); s.sh.rundo = null; } break;
    case 'rfull': {   // 하루 종일 장소를 비 안 오는 날로 (겹치는 다른 하루 종일 장소와는 날을 맞바꿈)
      const [id, to] = v.split('|'); const fa = fullAssign(s, buildDays(s)); const prev = fa[id];
      Object.keys(fa).forEach(k => { if(k !== id && fa[k] === +to) s.fullDay[k] = prev; }); s.fullDay[id] = +to; break;
    }
    case 'pkseed': Object.assign(s.pack, seedItems(missingSuggestions(s.pack, suggestPacking(s, s.wx)), Date.now())); break;
    case 'pkone': { const x = suggestPacking(s, s.wx).find(y => y.key === v); if(x) Object.assign(s.pack, seedItems([x], Date.now())); break; }
    case 'pkchk': { const it = s.pack[v]; if(!it) return; it.done = !it.done; it.doneBy = it.done && s.shareId && s.sh.user ? s.sh.user.name : ''; break; }
    case 'pkdel': { const it = s.pack[v]; if(!it) return; if(it.src){ it.hide = true; it.done = false; } else delete s.pack[v]; break; }   // 추천에서 온 건 숨겨서 다시 추천하지 않음
    case 'pkfilter': s.pfilter = v; break;
    case 'lfocus': case 'lex': case 'lmore': case 'ledit': case 'lcancel': case 'lundo': case 'ldel': case 'lpadd': case 'lpdel': case 'lpmembers': case 'limpok': case 'limpcancel':
    case 'lbedit': case 'lbcats': case 'lbdone': case 'lexport':
      ledgerAct(a, v); return;
    case 'bkexport': exportBackup(); return;
    case 'bkrestore': doRestore(); return;
    case 'bkcancel': s.sh.restore = null; render(); return;
    case 'bkundo': undoRestore(); return;
    case 'shareopen': s.sh.open = true; startShare(); render(); return;
    case 'shareclose': s.sh.open = false; render(); return;
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

function onChange(e){
  const t = e.target; const s = state;
  if(t.dataset.kid != null){ s.kids[+t.dataset.kid] = Math.min(17, Math.max(0, parseInt(t.value, 10) || 0)); }
  else if(t.dataset.date){ if(!t.value) return; s[t.dataset.date] = t.value; s.fullDay = {}; s.assign = {}; s.dlock = {}; }
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
{
  const j = parseJoin(location.hash);
  if(j){
    history.replaceState(null, '', location.pathname + location.search);
    if(j !== state.shareId){ state.sh.pendingJoin = j; state.sh.open = true; }
    startShare();
  } else if(state.shareId) startShare();
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

// 여행 중 그날 처음 열면 오늘 하루 화면부터 (계획으로 돌아가면 그날은 다시 안 띄움)
{ const td = ymd(new Date()); if(shouldAutoOpen(state, td)){ state.mode = 'today'; state.tday = null; state.todayOpened = td; saveLocal(); } }
render();
if(state.step === VAULT_STEP) refreshUsage();

// 오프라인 사용(홈 화면 앱). localhost 개발 중에는 캐시 때문에 헷갈리지 않게 등록하지 않음
if('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)){
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
