// 단계별 화면. 각 함수는 상태(s)를 받아 HTML 문자열을 돌려줌.
// 버튼은 data-act / data-v, 입력은 data-kid / data-date / data-full / data-move 로 app.js가 처리.
import { AREAS, PLACES, WHO, STYLES, PACE, DAY_COLORS, CURRENCY, KINDS, STEPS } from './data.js';
import { PACK_CATS, packCatOf, suggestPacking, missingSuggestions, packView } from './packing.js';
import { dayRain, outdoorStops, indoorAlternatives, betterFullDay, indoorShare } from './rain.js';
import { CHECKED, PHRASES, QUAKE, LOST, EMBASSY, telHref, callsFor, hotelCard as sosHotel, kidCardJa } from './safety.js';
import { mealSlots, rankFood, moreFoodUrl, foodKey, walkMin } from './food.js';
import { transitPlan, transitTip, transitYen as tyen, transitRange, PASSES, CHECKED as FARE_CHECKED } from './transit.js';
const STEP = name => STEPS.indexOf(name);   // 단계 번호는 이름으로 찾음 (단계를 끼워 넣어도 버튼이 안 틀리게)
import { parseDate, buildDays, kindLabel, fitScore, fullAssign, capacity, rankAreas, plan, allPlaces, pickedPlaces, closedText, compareHotels, nights, avgToPicks } from './logic.js';
import { partyNote, RK_RADIUS } from './rakuten.js';
import { koHotelName } from './janame.js';
import { clothesTip } from './weather.js';
import { SITES, siteUrl, priceOptions } from './prices.js';
import { voteSummary, inviteLink, defaultTitle } from './sharecore.js';
import { VAULT_KINDS, kindOf, groupVault, missingBookings, placeName, sizeText } from './vault.js';
import { CATS, PAYS, catOf, partyOf, defaultPayer, defaultDay, dayLabel, tripDates, ledgerSummary, ledgerHint, money as lmoney, personUsed } from './ledger.js';
import { budgetOf, budgetView, budgetLines, catLine, manwon } from './budget.js';
import { phaseOf, dayToShow, shownDate, nextStopIndex, fromFor, dayVault, dayWeather, phaseText, doneKey } from './today.js';
import { mapSVG } from './map.js';
import { esc, chip, badge, gmap, gdir } from './ui.js';
import { safeMapUrl, safeHttpsUrl, nearestArea, FAR_KM } from './gimport.js';

export function partyText(s){
  if(!s.who) return '동행 미정';
  if(s.who === 'solo') return '혼자';
  if(s.who === 'family'){
    const n = s.adults + s.kids.length;
    return `가족 ${n}명` + (s.kids.length ? ` (아이 ${s.kids.map(a => a + '살').join(', ')})` : '');
  }
  const w = WHO.find(x => x.key === s.who); return `${w.label} ${s.adults}명`;
}

/* 함께 짜기: 장소마다 투표·의견 (공유 여행일 때만) */
function voteBar(s, p){
  if(!s.shareId || !s.sh || !s.sh.user) return '';
  const v = voteSummary(s.sh.votes, p.id, s.sh.user.uid);
  const cms = (s.sh.comments || []).filter(c => c.placeId === p.id);
  const open = s.sh.cmPlace === p.id;
  return `<div class="votes">
      <button type="button" class="vbtn" data-act="vote" data-v="${esc(p.id)}|1" aria-pressed="${v.mine === 1}" aria-label="좋아요">👍 ${v.up || ''}</button>
      <button type="button" class="vbtn" data-act="vote" data-v="${esc(p.id)}|-1" aria-pressed="${v.mine === -1}" aria-label="글쎄요">🤔 ${v.down || ''}</button>
      <button type="button" class="vbtn" data-act="cmopen" data-v="${esc(p.id)}" aria-expanded="${open}">의견 ${cms.length || ''}</button>
    </div>
    ${open ? commentList(s, cms, p.id) : ''}`;
}

function commentList(s, cms, placeId){
  const me = s.sh.user;
  return `<div class="cms">
      ${cms.length ? `<ul class="cmlist">${cms.map(c => `<li><b>${esc(c.name)}</b> <span class="fine">${esc(c.at)}</span>${c.uid === me.uid ? ` <button type="button" class="link" data-act="cmdel" data-v="${esc(c.id)}">지우기</button>` : ''}<p>${esc(c.text)}</p></li>`).join('')}</ul>` : '<p class="fine">아직 의견이 없어요.</p>'}
      <form class="cmform" data-place="${esc(placeId || '')}"><textarea id="cmtext-${placeId ? esc(placeId) : 'all'}" rows="2" maxlength="500" placeholder="${placeId ? '이 장소에 대한 의견' : '여행 전체에 대한 의견'}" aria-label="의견 쓰기"></textarea><button type="submit" class="ghost small">보내기</button></form>
    </div>`;
}

// 함께 짜기 창
export function SHEET(s){
  const sh = s.sh; const me = sh.user; const t = sh.trip;
  const head = `<div class="mshead"><b>함께 짜기</b><button type="button" class="ghost small" data-act="shareclose">닫기</button></div>`;
  const note = `<p class="fine">공유를 시작한 여행만 서버(구글 Firebase, 서울)에 저장되고, 초대받은 사람만 보고 고칠 수 있어요. 일정과 가계부가 함께 보이고, 보관함(예약번호·티켓)은 공유하지 않아요. 참여자 이름(구글 이름)은 '누가 고쳤는지' 표시에 쓰여요. 라쿠텐 키·날씨·환율은 각자 기기에만 있어요.</p>`;
  let body;
  if(!sh.authReady) body = '<p class="fine">불러오는 중…</p>';
  else if(!me) body = `<h2>가족·친구와 일정을 함께 짜요</h2>
      <p class="pnote">${sh.pendingJoin ? '초대받은 여행에 참여하려면 구글로 로그인해 주세요.' : '구글로 로그인하고 이 여행을 공유하면, 초대 링크를 받은 사람이 함께 장소를 담고 숙소를 고르고 의견을 남길 수 있어요. 바꾼 내용은 서로의 화면에 바로 보여요.'}</p>
      <div><button type="button" class="primary small" data-act="login">구글로 로그인</button></div>${note}`;
  else if(sh.pendingJoin && sh.pendingJoin !== s.shareId) body = `<h2>초대받은 여행에 참여할까요?</h2>
      <p class="pnote">참여하면 이 기기의 일정이 공유 여행 일정으로 바뀌어요. 지금 일정은 따로 보관해 두니, 나중에 되돌릴 수 있어요.</p>
      <div class="pfoot"><button type="button" class="primary small" data-act="joinok"${sh.busy ? ' disabled' : ''}>${sh.busy ? '참여하는 중…' : `${esc(me.name)}(으)로 참여하기`}</button><button type="button" class="ghost small" data-act="joincancel">취소</button></div>${note}`;
  else if(!s.shareId) body = `<h2>이 여행을 공유해요</h2>
      <label for="sharetitle" class="shlabel">여행 이름<input id="sharetitle" type="text" maxlength="40" value="${esc(defaultTitle(s))}"></label>
      <div><button type="button" class="primary small" data-act="sharestart"${sh.busy ? ' disabled' : ''}>${sh.busy ? '만드는 중…' : '공유 시작하고 초대 링크 받기'}</button></div>
      ${sh.hasBackup ? '<p class="fine">공유 여행에 참여하기 전의 내 일정이 보관돼 있어요. <button type="button" class="link" data-act="restore">그 일정으로 되돌리기</button></p>' : ''}
      ${note}<p class="fine">${esc(me.name)}(으)로 로그인됨 · <button type="button" class="link" data-act="logout">로그아웃</button></p>`;
  else if(!t) body = '<p class="fine">공유 여행을 불러오는 중…</p>';
  else {
    const owner = me.uid === t.ownerUid;
    const members = t.memberUids.map(uid => ({ uid, name:(t.members[uid] && t.members[uid].name) || '참여자' }));
    const allCms = (sh.comments || []).filter(c => !c.placeId);
    body = `<h2>${esc(t.title)}</h2>
      <p class="fine">${t.updatedBy ? `마지막으로 ${esc(t.updatedBy.name)}님이 고쳤어요.` : ''}</p>
      <div class="box">
        <h2>초대 링크${owner ? `<small>${t.open ? '열려 있어요' : '닫혀 있어요 · 새로 참여할 수 없어요'}</small>` : ''}</h2>
        <input type="text" readonly value="${esc(inviteLink(location.href, s.shareId))}" aria-label="초대 링크" onclick="this.select()">
        <div class="pfoot"><button type="button" class="primary small" data-act="sendlink">링크 보내기</button><button type="button" class="ghost small" data-act="copylink">복사</button>
          ${owner ? `<button type="button" class="link" data-act="linkopen">${t.open ? '초대 링크 닫기' : '초대 링크 다시 열기'}</button>` : ''}</div>
        <p class="fine">이 링크를 받은 사람은 구글로 로그인해 참여할 수 있어요. 다 모이면 링크를 닫아 두세요.</p>
      </div>
      <div class="box"><h2>참여자 ${members.length}명</h2>
        <ul class="implist">${members.map(m => `<li class="imp"><div class="sbody"><b>${esc(m.name)}${m.uid === me.uid ? ' (나)' : ''}</b><span>${m.uid === t.ownerUid ? '여행 주인' : '참여자'}</span></div>
          ${owner && m.uid !== me.uid ? `<button type="button" class="link" data-act="kick" data-v="${esc(m.uid)}">빼기</button>` : ''}</li>`).join('')}</ul>
      </div>
      <div class="box"><h2>여행 전체 의견<small>장소별 의견은 장소 카드의 '의견'에서</small></h2>${commentList(s, allCms, null)}</div>
      <div class="box"><h2>최근 바뀐 것</h2>
        ${(sh.log || []).length ? `<ul class="loglist">${sh.log.map(l => `<li><b>${esc(l.name)}</b> ${esc(l.text)} <span class="fine">${esc(l.at)}</span></li>`).join('')}</ul>` : '<p class="fine">아직 기록이 없어요.</p>'}
      </div>
      <div class="pfoot">
        ${owner ? `<button type="button" class="ghost small${sh.delArmed ? ' armed' : ''}" data-act="sharedel">${sh.delArmed ? '한 번 더 누르면 모두에게서 지워져요' : '공유 여행 지우기'}</button>` : '<button type="button" class="ghost small" data-act="leave">이 여행에서 나가기</button>'}
        <button type="button" class="link" data-act="unlink">이 기기에서만 공유 끊기</button>
        <button type="button" class="link" data-act="logout">로그아웃</button>
      </div>${note}`;
  }
  return `<div class="mapsheet sheet" role="dialog" aria-label="함께 짜기">${head}<div class="shbody">${sh.msg ? `<p class="warnline">${esc(sh.msg)}</p>` : ''}${body}</div></div>`;
}

/* Step 1 · 동행 */
export function vWho(s){
  const counter = (label) => `<div class="row"><span>${label}</span><div class="counter"><button type="button" data-act="adults" data-v="-1" aria-label="한 명 빼기">−</button><b>${s.adults}</b><button type="button" data-act="adults" data-v="1" aria-label="한 명 더하기">+</button></div></div>`;
  const party = s.who === 'family' ? `
    <div class="box">
      ${counter('어른')}
      ${s.kids.map((a, i) => `<div class="row"><label for="kid${i}">아이 ${i+1} 나이</label><div class="kidin"><input id="kid${i}" type="number" min="0" max="17" inputmode="numeric" value="${a}" data-kid="${i}"><span>살</span><button type="button" class="link" data-act="kiddel" data-v="${i}">빼기</button></div></div>`).join('')}
      ${s.kids.length < 5 ? `<div><button type="button" class="ghost small" data-act="kidadd">+ 아이 추가</button></div>` : ''}
      <p class="fine">아이 나이에 맞춰 놀이기구 키 제한, 입장료 구분, 걷는 양을 따질 거예요.</p>
    </div>` : s.who && s.who !== 'solo' ? `<div class="box">${counter('인원')}</div>` : '';
  return `<section class="step">
    <p class="eyebrow">Step 1 · 동행</p>
    <h1>누구와 함께 가나요?</h1>
    <p class="lead">함께 가는 사람에 따라 갈 곳도, 하루에 다닐 양도 달라져요.</p>
    <div class="chips">${WHO.map(w => chip('who', w.key, w.label, s.who === w.key)).join('')}</div>
    ${party}
    <h2>어떤 여행을 좋아하세요?<small>여러 개 고를 수 있어요</small></h2>
    <div class="chips">${STYLES.map(t => chip('style', t, t, s.styles.includes(t))).join('')}</div>
    <h2>하루를 어떻게 보낼까요?</h2>
    <div class="seg">${Object.entries(PACE).map(([k, p]) => `<button type="button" class="segopt" data-act="pace" data-v="${k}" aria-pressed="${s.pace === k}"><b>${p.label}</b><span>${p.desc}</span></button>`).join('')}</div>
    <div class="summary">${esc(partyText(s))} · ${s.styles.length ? esc(s.styles.join('·')) : '취향 미정'} · 하루 약 ${PACE[s.pace].hours}시간<span>이 정보로 장소 추천 순서와 하루 일정 양이 정해져요.</span></div>
  </section>`;
}

/* Step 2 · 여행지 */
export function vWhere(s){
  const days = buildDays(s);
  const countries = [['jp','일본',true],['kr','한국',false],['vn','베트남',false],['th','태국',false]];
  const cities = [['tokyo','도쿄',true],['osaka','오사카',false],['fukuoka','후쿠오카',false],['sapporo','삿포로',false]];
  const opt = (act, cur) => ([k, l, on]) => chip(act, k, on ? l : `${l}<span class="soon">준비 중</span>`, cur === k, !on);
  return `<section class="step">
    <p class="eyebrow">Step 2 · 여행지</p>
    <h1>어디로, 언제 가나요?</h1>
    <p class="lead">큰 지역부터 정하고, 도쿄 안의 동네는 장소를 담으면서 자연스럽게 정해져요.</p>
    <h2>나라</h2>
    <div class="chips">${countries.map(opt('country', s.country)).join('')}</div>
    <h2>도시</h2>
    <div class="chips">${cities.map(opt('city', s.city)).join('')}</div>
    <h2>날짜</h2>
    <div class="dates">
      <label for="dstart">가는 날<input id="dstart" type="date" value="${s.start}" data-date="start"></label>
      <label for="dend">오는 날<input id="dend" type="date" value="${s.end}" data-date="end"></label>
    </div>
    ${days.length ? `<div class="box">
      <div class="row"><h2>${days.length-1}박 ${days.length}일</h2><span class="fine">${PACE[s.pace].label} 기준</span></div>
      <ol class="daystrip">${days.map(d => `<li>${badge(d.i)}<div><b>${d.label}</b><span>${kindLabel(d.kind)} · 쓸 수 있는 시간 약 ${d.cap}시간</span></div></li>`).join('')}</ol>
      ${days.length >= 10 ? '<p class="fine">시제품은 최대 10일까지만 계산해요.</p>' : ''}
    </div>` : '<p class="fine">가는 날과 오는 날을 고르면 하루씩 나눠서 쓸 수 있는 시간을 보여 드려요.</p>'}
    ${days.length ? weatherBox(s) : ''}
  </section>`;
}

// 여행 날짜 날씨: 지난 10년 같은 날짜 평균 + (16일 안이면) 예보
function weatherBox(s){
  const w = s.wx;
  if(s.wxBusy && !w) return '<div class="box"><p class="fine">이맘때 날씨를 불러오고 있어요…</p></div>';
  if(!w) return '';
  if(w.error && !w.climate) return `<div class="box"><p class="warnline">${esc(w.error)}</p><div><button type="button" class="ghost small" data-act="wxretry">다시 불러오기</button></div></div>`;
  const c = w.climate;
  const fc = w.forecast && w.forecast.length ? `<h2>일기 예보<small>${esc(w.forecastAt)} 기준</small></h2>
    <ol class="daystrip">${w.forecast.map(f => { const d = parseDate(f.date);
      return `<li><span class="wxd">${d.getMonth()+1}/${d.getDate()}</span><div><b>${esc(f.text || '—')} · ${f.lo}° / ${f.hi}°</b><span>비 올 확률 ${f.rain != null ? f.rain + '%' : '—'}</span></div></li>`; }).join('')}</ol>` : '';
  return `<div class="box wx">
    <div class="row"><h2>이맘때 ${esc(CITY_NAME[s.city] || '')} 날씨</h2><span class="fine">지난 ${c ? c.years : 10}년 같은 날짜 평균</span></div>
    ${c ? `<ul class="facts">
      <li><span>낮 최고 / 아침 최저</span><b>${c.hi}° / ${c.lo}°</b></li>
      <li><span>평균 습도</span><b>${c.hum}%</b></li>
      <li><span>비 온 날</span><b>${c.rainPct != null ? `10일 중 ${Math.round(c.rainPct / 10)}일꼴` : '—'}</b></li>
      <li><span>낮 길이</span><b>약 ${c.daylight}시간</b></li>
    </ul>
    <p class="pnote">${esc(clothesTip(c.mean))}${c.wind >= 25 ? ' 바람이 센 편이라 체감 온도가 더 낮아요.' : ''}</p>` : '<p class="fine">이 날짜의 지난 기록을 찾지 못했어요.</p>'}
    ${fc}
    <p class="fine">Open-Meteo의 관측·예보 자료예요. 보내는 정보는 도시 위치와 날짜뿐이에요.${fc ? '' : ' 출발 16일 전부터는 실제 예보도 보여 드려요.'}</p>
  </div>`;
}

const CITY_NAME = { tokyo:'도쿄' };

// 종류 거르기 칩. 목록에 있는 종류만, 개수와 함께
function kindChips(act, cur, items){
  const n = {}; items.forEach(p => { if(p.kind) n[p.kind] = (n[p.kind] || 0) + 1; });
  return `<div class="scroller" role="group" aria-label="종류로 거르기">${chip(act, 'all', `전체 ${items.length}`, cur === 'all')}${KINDS.filter(k => n[k]).map(k => chip(act, k, `${k} ${n[k]}`, cur === k)).join('')}</div>`;
}

/* Step 3 · 꼭 갈 곳 */
function daySelect(p, days, fa, s){
  const pool = days.filter(d => d.kind === 'full' || d.kind === 'single'); const opts = pool.length ? pool : days;
  const others = {};
  pickedPlaces(s).filter(q => q.full && q.id !== p.id).forEach(q => { if(fa[q.id] != null) others[fa[q.id]] = q.name; });
  const cur = fa[p.id];
  return `<label class="daysel" for="full-${p.id}">어느 날 갈까요?
    <select id="full-${p.id}" data-full="${p.id}">${opts.map(d => `<option value="${d.i}"${cur === d.i ? ' selected' : ''}>${d.i+1}일차 · ${d.label}${(d.wd === 0 || d.wd === 6) ? ' · 주말이라 붐벼요' : ''}${others[d.i] ? ` · ${esc(others[d.i])} 예정` : ''}</option>`).join('')}</select>
  </label>`;
}

export function vMust(s){
  const days = buildDays(s); const fa = fullAssign(s, days);
  const allAnchors = PLACES.filter(p => p.anchor);
  const anchors = allAnchors.filter(p => s.anchorKind === 'all' || p.kind === s.anchorKind || s.must[p.id]);
  const noDay = pickedPlaces(s).filter(p => p.full && fa[p.id] == null);
  return `<section class="step">
    <p class="eyebrow">Step 3 · 꼭 갈 곳</p>
    <h1>이번 여행에서 꼭 갈 곳이 있나요?</h1>
    <p class="lead">꼭 갈 곳을 먼저 박아두면 숙소와 나머지 일정이 그 주변으로 짜여요.</p>
    ${kindChips('akind', s.anchorKind, allAnchors)}
    ${noDay.length ? `<p class="warnline">${days.length ? `${noDay.map(p => esc(p.name)).join(', ')}을(를) 넣을 온종일 날짜가 모자라요. 날짜를 늘리거나 하나를 빼 주세요.` : '여행 날짜를 정하면 하루 종일 쓰는 곳을 어느 날 갈지 정해 드려요.'}</p>` : ''}
    <div class="list">${anchors.map(p => { const on = !!s.must[p.id];
      return `<article class="pcard${on ? ' on' : ''}">
        <div class="ptop"><div><h3>${esc(p.name)}</h3><p class="ja">${esc(p.ja)}</p></div>
          <button type="button" class="mustbtn" data-act="anchor" data-v="${p.id}" aria-pressed="${on}">${on ? '꼭 갈 곳 ✓' : '꼭 갈 곳으로'}</button></div>
        <p class="meta">${p.kind ? esc(p.kind) + ' · ' : ''}${esc(AREAS[p.area].name)} · ${p.full ? '하루 종일' : '약 ' + p.hours + '시간'}${p.book ? ' · 예약 필요' : ''}${p.closed ? ` · <span class="closed">${closedText(p)}</span>` : ''}</p>
        ${p.note ? `<p class="pnote">${esc(p.note)}</p>` : ''}
        ${on && p.full && fa[p.id] != null ? daySelect(p, days, fa, s) : ''}
      </article>`; }).join('')}</div>
    <p class="fine">목록에 없는 곳은 다음 단계에서 직접 추가할 수 있어요.</p>
  </section>`;
}

/* Step 4 · 장소 담기 */
function placeCard(p, s){
  const on = !!s.picked[p.id]; const must = !!s.must[p.id]; const f = fitScore(p, s);
  return `<article class="pcard${on ? ' on' : ''}">
    <div class="ptop"><div><h3>${esc(p.name)}</h3>${p.ja ? `<p class="ja">${esc(p.ja)}</p>` : ''}</div>
      <button type="button" class="pickbtn" data-act="pick" data-v="${esc(p.id)}" aria-pressed="${on}">${on ? '담음 ✓' : '담기'}</button></div>
    <p class="meta">${p.kind ? esc(p.kind) + ' · ' : ''}${esc(AREAS[p.area].name)} · ${p.full ? '하루 종일' : '약 ' + p.hours + '시간'}${p.closed ? ` · <span class="closed">${closedText(p)}</span>` : ''}${p.approx ? ' · 위치 대략' : ''}</p>
    ${(f.why.length || f.neg.length) ? `<div class="why">${f.why.map(w => `<span>${esc(w)}</span>`).join('')}${f.neg.map(w => `<span class="neg">${esc(w)}</span>`).join('')}</div>` : ''}
    ${p.note ? `<p class="pnote">${esc(p.note)}</p>` : ''}
    ${on ? voteBar(s, p) : ''}
    <div class="pfoot">
      <button type="button" class="link" data-act="must" data-v="${esc(p.id)}" aria-pressed="${must}">${must ? '★ 꼭 갈 곳' : '☆ 꼭 갈 곳으로'}</button>
      ${safeMapUrl(p.url) ? `<a class="link" href="${esc(safeMapUrl(p.url))}" target="_blank" rel="noopener">구글 지도 ↗</a>` : ''}
      ${p.custom ? `<button type="button" class="link" data-act="customdel" data-v="${esc(p.id)}">목록에서 지우기</button>` : `<a class="link" href="${gmap(p.ja)}" target="_blank" rel="noopener">구글 지도 ↗</a>`}
    </div>
  </article>`;
}

// 구글 지도에서 가져오기: 파일·붙여넣기 입력 + 가져온 곳 확인 목록
function importRow(r){
  const areaName = r.area ? AREAS[r.area].name : '';
  const far = r.lat != null && nearestArea(r).km > FAR_KM;
  const check = r.lat != null ? ` <a class="link" href="${gmap(r.lat.toFixed(6) + ',' + r.lng.toFixed(6))}" target="_blank" rel="noopener">지도에서 확인 ↗</a>` : '';
  let st;
  if(r.dup) st = '이미 목록에 있는 곳이라 건너뛰어요';
  else if(r.st === 'ok') st = (r.src === 'geo' ? `찾은 위치: ${esc(r.label)}` : '링크에 있는 위치') + ` · ${esc(areaName)}${far ? ' 바깥쪽' : ' 근처'}` + check;
  else if(r.st === 'fail') st = r.area ? `위치를 못 찾아서 ${esc(areaName)} 근처로 대략 표시할게요` : '위치를 못 찾았어요. 동네를 고르거나 좌표가 있는 링크를 붙여 주세요';
  else st = '위치를 아직 안 찾았어요';
  if(r.st !== 'ok' && !r.dup && safeMapUrl(r.url)) st += ` <a class="link" href="${esc(safeMapUrl(r.url))}" target="_blank" rel="noopener">구글 지도에서 열기 ↗</a>`;
  const areaOpts = `<option value="">동네 고르기</option>` + Object.entries(AREAS).map(([k, a]) => `<option value="${k}"${r.area === k ? ' selected' : ''}>${a.name}</option>`).join('');
  return `<li class="imp${r.skip ? ' skip' : ''}${r.st === 'ok' ? ' ok' : ''}">
    <div class="sbody"><b>${esc(r.name)}</b><span>${st}</span></div>
    <button type="button" class="link" data-act="impskip" data-v="${esc(r.k)}" aria-pressed="${!r.skip}">${r.skip ? '되살리기' : '빼기'}</button>
    ${r.skip ? '' : `<div class="row2">
      <select data-imparea="${esc(r.k)}" aria-label="${esc(r.name)} 동네">${areaOpts}</select>
      <select data-imphours="${esc(r.k)}" aria-label="${esc(r.name)} 머무는 시간">${[0.5,1,1.5,2,3,4].map(h => `<option value="${h}"${r.hours === h ? ' selected' : ''}>${h}시간</option>`).join('')}</select>
    </div>
    ${r.st === 'ok' ? '' : `<input type="url" inputmode="url" data-implink="${esc(r.k)}" placeholder="PC 구글 지도 주소창의 긴 주소" aria-label="${esc(r.name)} 구글 지도 주소">`}`}
  </li>`;
}

function importBox(s){
  const rows = s.imports || [];
  const live = rows.filter(r => !r.skip);
  const ready = live.filter(r => r.lat != null || r.area).length;
  const need = live.filter(r => r.st === 'need').length;
  const fail = live.filter(r => r.st === 'fail' && !r.area).length;
  const list = rows.length ? `<div class="box">
      <div class="row"><h2>가져온 곳 ${rows.length}곳</h2><button type="button" class="link" data-act="impclear">모두 취소</button></div>
      ${s.geoBusy ? `<p class="fine">이름으로 위치를 찾고 있어요… 남은 곳 ${need}곳 (1초에 1곳씩)</p>`
        : need ? `<div><button type="button" class="ghost small" data-act="impfind">이름으로 위치 찾기 (${need}곳, 약 ${Math.ceil(need * 1.1)}초)</button></div>` : ''}
      ${s.geoErr ? '<p class="warnline">위치 찾기가 중간에 멈췄어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>' : ''}
      <ul class="implist">${rows.map(importRow).join('')}</ul>
      <div><button type="button" class="primary small" data-act="impadd"${ready ? '' : ' disabled'}>${ready}곳 담기</button></div>
      ${fail ? `<p class="fine">위치를 못 찾은 ${fail}곳은 동네를 골라야 담을 수 있어요.</p>` : ''}
      <p class="fine">이름으로 찾은 위치는 OpenStreetMap 검색 결과라 틀릴 수 있어요. '지도에서 확인'으로 맞는지 봐 주세요.</p>
    </div>` : '';
  return `<div class="box">
      <h2>구글 지도에서 가져오기</h2>
      <p class="fine">구글 지도에 저장해 둔 장소를 한 번에 가져와요. 가져온 장소는 이 기기에만 저장돼요. 이름으로 위치를 찾을 때는 장소 이름만 OpenStreetMap 검색 서버로 보내요.</p>
      ${s.impMsg ? `<p class="warnline">${esc(s.impMsg)}</p>` : ''}
      <div><label class="ghost small filebtn">파일 고르기 (CSV·JSON)<input type="file" accept=".csv,.json,text/csv,application/json" data-import hidden></label></div>
      <details class="more"><summary>파일은 어떻게 받나요?</summary>
        <ol class="howto">
          <li>PC에서 takeout.google.com 에 들어가요.</li>
          <li>'모두 선택 해제'를 누르고 <b>저장됨</b>과 <b>지도(내 장소)</b>만 체크해요.</li>
          <li>내보내기를 만들고, 메일로 온 압축 파일을 풀어요.</li>
          <li>'저장됨' 폴더의 목록 이름.csv 파일이나 '지도(내 장소)' 폴더의 Saved Places.json 파일을 골라요.</li>
        </ol>
      </details>
      <form id="pasteform" class="pasteform">
        <label for="gpaste">또는 이름이나 링크를 붙여넣기<textarea id="gpaste" rows="3" placeholder="한 줄에 하나씩&#10;예: 센소지&#10;예: https://www.google.com/maps/place/…"></textarea></label>
        <div><button type="submit" class="ghost small">목록에 올리기</button></div>
      </form>
    </div>
    ${list}`;
}

export function vPick(s){
  const cap = capacity(s); const pct = cap.total ? Math.min(100, cap.used / cap.total * 100) : 0; const over = cap.used > cap.total;
  let list = allPlaces(s).map(p => ({ p, sc: fitScore(p, s).score + (s.must[p.id] ? 100 : 0) }));
  if(s.areaFilter !== 'all') list = list.filter(x => x.p.area === s.areaFilter);
  const byArea = list.map(x => x.p);
  if(s.kindFilter !== 'all') list = list.filter(x => x.p.kind === s.kindFilter);
  list.sort((a, b) => b.sc - a.sc);
  const counts = {}; allPlaces(s).forEach(p => { counts[p.area] = (counts[p.area] || 0) + 1; });
  return `<section class="step">
    <p class="eyebrow">Step 4 · 장소 담기</p>
    <h1>가고 싶은 곳을 담아요</h1>
    <p class="lead">고민은 나중에 하고 일단 담으세요. ${esc(partyText(s))}에게 맞는 순서로 보여드려요.</p>
    ${mapSVG('pick', s)}
    <div class="box">
      <div class="statline"><span>담은 곳 <b>${pickedPlaces(s).length}</b>곳</span><span>필요한 시간 <b>${cap.used}</b> / 쓸 수 있는 시간 <b>${cap.total}</b>시간</span></div>
      <div class="meter${over && cap.total ? ' over' : ''}"><span style="width:${pct}%"></span></div>
      <p class="fine">${!cap.total ? '여행 날짜를 정하면 쓸 수 있는 시간을 계산해 드려요.' : over ? '쓸 수 있는 시간보다 많이 담았어요. 일정에서 넘치는 곳은 따로 모아둘게요.' : `하루 종일 쓰는 곳을 뺀 나머지 날에 ${+(cap.total - cap.used).toFixed(1)}시간 정도 여유가 있어요.`}</p>
      <div><button type="button" class="ghost small" data-act="autopick">추천 순서대로 빈 시간 채우기</button></div>
    </div>
    <div class="box">
      <h2>구글 지도에서 찾아 담기</h2>
      <p class="fine">한국어 구글 지도에서 이름으로 찾거나 장소 아이콘을 눌러, 평점·영업시간을 보고 몇 일차에 갈지 골라 바로 담아요. 쉬는 요일은 일정 짜기가 알아서 피해요.</p>
      <div><button type="button" class="primary small" data-act="mapopen">구글 지도 열기</button></div>
    </div>
    ${importBox(s)}
    <div class="scroller" role="group" aria-label="동네로 거르기">
      ${chip('filter', 'all', '추천순 전체', s.areaFilter === 'all')}
      ${Object.entries(AREAS).map(([k, a]) => chip('filter', k, `${a.name} ${counts[k] || 0}`, s.areaFilter === k)).join('')}
    </div>
    ${kindChips('kfilter', s.kindFilter, byArea)}
    ${list.length ? '' : '<p class="empty">이 조건에 맞는 곳이 없어요. 다른 동네나 종류를 골라 보세요.</p>'}
    <div class="list">${list.map(x => placeCard(x.p, s)).join('')}</div>
    <form class="box" id="customform">
      <h2>목록에 없는 곳 추가</h2>
      <label for="cname">장소 이름<input id="cname" type="text" required maxlength="40" placeholder="예: 구글 지도에서 찾은 라멘집"></label>
      <div class="row2">
        <label for="carea">동네<select id="carea">${Object.entries(AREAS).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join('')}</select></label>
        <label for="chours">머무는 시간<select id="chours">${[1,1.5,2,3,4].map(h => `<option value="${h}"${h === 1.5 ? ' selected' : ''}>${h}시간</option>`).join('')}</select></label>
      </div>
      <div><button type="submit" class="primary small">추가하고 담기</button></div>
      <p class="fine">고른 동네 근처에 대략 표시돼요. 정확한 위치가 필요하면 위의 '구글 지도에서 가져오기'를 써 주세요.</p>
    </form>
  </section>`;
}

/* Step 5 · 숙소 후보 비교 */
function money(s, v){ return CURRENCY[s.hotelCur].sign + Math.round(v).toLocaleString('ko-KR'); }

// 숙소 카드 안 '사이트별 가격 비교': 사이트 열기(숙소 이름 복사) + 본 가격 적기 + 가장 싼 곳 표시
function priceCompare(h, s, r){
  const opts = priceOptions(h, s.hotelCur, s.fx && s.fx.rate);
  const best = r.best; const filled = Object.values(h.prices || {}).filter(p => p.v > 0).length;
  const curOpts = cur => Object.entries(CURRENCY).map(([k, v]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${v.sign}</option>`).join('');
  const base = opts.find(o => o.key === 'base');
  const rows = SITES.map(site => { const p = (h.prices || {})[site.key] || {}; const isBest = best && best.key === site.key;
    return `<li class="pcrow${isBest ? ' best' : ''}">
      <a class="link" href="${esc(siteUrl(site, h, s))}" target="_blank" rel="noopener noreferrer" data-copy="${esc(h.name)}">${esc(site.label)} ↗</a>
      <div class="pcin"><select data-hpcur="${esc(h.id)}|${site.key}" aria-label="${esc(site.label)} 통화">${curOpts(p.cur || site.cur)}</select><input type="number" min="0" step="1" inputmode="numeric" data-hprice="${esc(h.id)}|${site.key}" value="${p.v > 0 ? p.v : ''}" placeholder="1박" aria-label="${esc(site.label)} 1박 가격"></div>
      ${isBest ? '<span class="pcbest">최저 ✓</span>' : ''}
    </li>`; }).join('');
  return `<details class="pc"${filled ? ' open' : ''}>
    <summary>사이트별 가격 비교${filled ? ` · ${filled}곳 입력` : ''}${best ? ` · 최저 ${esc(best.label)}` : ''}</summary>
    ${base ? `<p class="fine">${esc(base.label)}: ${money(s, base.value)}${best && best.key === 'base' ? ' · 최저 ✓' : ''}</p>` : ''}
    <ul class="pclist">${rows}</ul>
    <p class="fine">사이트 이름을 누르면 숙소 이름이 복사되고 그 사이트가 열려요. 검색창에 붙여넣어 같은 숙소를 찾은 뒤, 객실 1개·세금 포함 <b>1박</b> 가격을 적어 주세요. 날짜·인원은 ${SITES.filter(x => !x.home).map(x => x.label).join('·')}에 미리 채워져요(아이 인원은 사이트에서 한 번 더 확인).</p>
  </details>`;
}

// 일본어 숙소 이름의 한글 읽기 (라쿠텐에서 담은 곳은 담을 때 받은 읽기, 없으면 이름의 가나·한자로)
const koOf = h => h.ko || koHotelName(h.name, '');

function hotelCard(r, i, s, c){
  const h = r.h; const on = s.hotelPick === h.id; const ko = koOf(h);
  const book = safeHttpsUrl(h.bookUrl); const map = safeMapUrl(h.mapUrl);
  const where = h.approx ? ' 근처 · 위치 대략' : h.src === 'geo' ? ' · 이름으로 찾은 위치' : '';
  return `<article class="acard hcard${i === 0 ? ' top' : ''}${on ? ' on' : ''}">
    <div class="ahead"><span class="rank">${i+1}</span><div><h3>${esc(ko || h.name)}</h3>${ko ? `<p class="ja">${esc(h.name)}</p>` : ''}<p class="ja">${esc(r.a.name)}${where}</p></div></div>
    <ul class="facts">
      ${c.dayCount ? `<li><span>담은 곳까지 평균</span><b>${r.avg.toFixed(1)}km</b></li><li><span>2.5km 안에 담은 곳</span><b>${r.near}곳</b></li>` : ''}
      ${c.hasDisney ? `<li class="wide"><span>디즈니까지 (동네 기준 대략)</span><b>${esc(r.a.disneyText || '알 수 없음')}</b></li>` : ''}
      <li><span>1박${r.best ? ` · ${r.best.key === 'base' ? (h.src === 'rakuten' ? '라쿠텐' : '직접 입력') : esc(r.best.label)}${r.best.cur !== s.hotelCur ? ' 환산' : ''}` : ''}</span><b>${r.price ? (r.best.cur !== s.hotelCur ? '≈' : '') + money(s, r.price) : '가격 미입력'}</b>${h.soldOut ? '<span class="closed">이 날짜엔 라쿠텐 빈방 없음</span>' : ''}</li>
      <li><span>${c.nights ? `${c.nights}박 합계` : '합계'}</span><b>${r.total != null ? money(s, r.total) : '—'}</b>${r.per != null ? `<span>1인당 ${money(s, r.per)}</span>` : ''}</li>
    </ul>
    ${h.memo ? `<p class="pnote">${esc(h.memo)}</p>` : ''}
    ${priceCompare(h, s, r)}
    <div class="pfoot">
      <button type="button" class="${on ? 'primary' : 'ghost'} small" data-act="hpick" data-v="${esc(h.id)}" aria-pressed="${on}">${on ? '이 숙소로 정함 ✓' : '이 숙소로 정하기'}</button>
      ${book ? `<a class="link" href="${esc(book)}" target="_blank" rel="noopener noreferrer">예약 페이지 ↗</a>` : ''}
      <a class="link" href="${map ? esc(map) : gmap(h.lat.toFixed(6) + ',' + h.lng.toFixed(6))}" target="_blank" rel="noopener">지도 ↗</a>
      <button type="button" class="link" data-act="hdel" data-v="${esc(h.id)}">지우기</button>
    </div>
  </article>`;
}

function hotelNoLoc(h, s){
  const areaOpts = `<option value="">동네 고르기</option>` + Object.entries(AREAS).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join('');
  const st = h.st === 'need' ? (s.hotelBusy ? '이름으로 위치를 찾고 있어요…' : '위치를 아직 안 찾았어요') : '위치를 못 찾았어요. 구글 지도 주소를 붙이거나 동네를 골라 주세요';
  return `<li class="imp">
    <div class="sbody"><b>${esc(koOf(h) || h.name)}</b>${koOf(h) ? `<span>${esc(h.name)}</span>` : ''}<span>${st}</span></div>
    <button type="button" class="link" data-act="hdel" data-v="${esc(h.id)}">지우기</button>
    ${h.st === 'fail' ? `<a class="link" href="${gmap(h.name)}" target="_blank" rel="noopener">구글 지도에서 찾기 ↗</a>` : ''}
    ${h.st === 'fail' ? `<div class="row2"><select data-harea="${esc(h.id)}" aria-label="${esc(h.name)} 동네">${areaOpts}</select></div>
    <input type="url" inputmode="url" data-hlink="${esc(h.id)}" placeholder="PC 구글 지도 주소창의 긴 주소" aria-label="${esc(h.name)} 구글 지도 주소">` : ''}
  </li>`;
}

// 고른 동네에서 숙소를 찾아볼 수 있는 바로가기. 예약 사이트로 가는 링크는 날짜·인원이 넘어간다고 알림
function hotelSearchLinks(s, key){
  const a = AREAS[key]; const n = nights(s);
  const p = new URLSearchParams({ ss:`${a.q.replace(/駅$/, '')} 東京`, no_rooms:'1', group_adults:String(Math.max(1, s.who ? s.adults : 2)) });
  if(n){ p.set('checkin', s.start); p.set('checkout', s.end); }
  const kids = s.who === 'family' ? s.kids : [];
  p.set('group_children', String(kids.length)); kids.forEach(k => p.append('age', String(k)));
  return `<div class="pfoot">
    <a class="link" href="${gmap('ホテル ' + a.q)}" target="_blank" rel="noopener">구글 지도에서 ${esc(a.name)} 숙소 ↗</a>
    <a class="link" href="https://www.booking.com/searchresults.ko.html?${p}" target="_blank" rel="noopener noreferrer">Booking.com에서 찾기 ↗</a>
  </div>
  <p class="fine">Booking.com 링크를 누르면 여행 날짜와 인원${kids.length ? '(아이 나이 포함)' : ''}이 그 사이트로 전달돼요.</p>`;
}

const yen = v => '¥' + Math.round(v).toLocaleString('ko-KR');   // 라쿠텐 요금은 늘 엔화

// 라쿠텐 트래블 빈방 검색: 키 입력 → 고른 동네 주변 3km 빈방을 싼 순으로 → 후보에 담기
function rakutenBox(s, areaKey){
  if(!s.rkOn) return `<form class="box" id="rkform" autocomplete="off">
      <h2>라쿠텐 트래블에서 빈방·가격 찾기</h2>
      <p class="fine">라쿠텐 개발자 페이지(Your Apps → More Details)의 두 값을 붙여넣어 주세요. 키는 이 기기에만 저장되고 코드나 GitHub에는 올라가지 않아요.</p>
      <label for="rkapp">Application ID<input id="rkapp" type="password" required autocomplete="off" spellcheck="false"></label>
      <label for="rkkey">Access Key<input id="rkkey" type="password" required autocomplete="off" spellcheck="false" placeholder="pk_로 시작해요"></label>
      <div><button type="submit" class="primary small">이 기기에 저장</button></div>
    </form>`;
  const a = AREAS[areaKey]; const r = s.rk; const days = nights(s);
  const taken = new Set((s.hotels || []).map(h => h.hotelNo).filter(Boolean));
  const fresh = r && r.area === areaKey && r.start === s.start && r.end === s.end;
  const list = r && r.items && r.items.length ? `<p class="fine">${esc(AREAS[r.area].name)} 주변 ${RK_RADIUS}km · ${esc(r.party)} · 1박 싼 순 · ${esc(r.at)} 기준${fresh ? '' : ' (지금 조건과 달라요. 다시 찾아 주세요)'}</p>
      <ul class="implist rklist">${r.items.map(it => { const avg = it.lat != null ? avgToPicks(s, it) : null; const on = taken.has(it.hotelNo);
        return `<li class="imp">
          <div class="sbody"><b>${esc(it.ko || it.name)}</b>${it.ko ? `<span>${esc(it.name)}</span>` : ''}<span>${it.station ? esc(it.station) + '역 · ' : ''}${it.review ? `★${it.review.toFixed(1)} (${it.reviewCount}) · ` : ''}${avg != null ? `담은 곳까지 평균 ${avg.toFixed(1)}km` : ''}</span>
            <span class="rkprice">1박 ${yen(it.price)}${it.priceIsPlan ? '' : ' (최저가 목안)'}${it.breakfast ? ' · 조식 포함' : ''}</span></div>
          <button type="button" class="${on ? 'ghost' : 'primary'} small" data-act="rkadd" data-v="${esc(it.hotelNo)}"${on ? ' disabled' : ''}>${on ? '담음 ✓' : '후보에 담기'}</button>
        </li>`; }).join('')}</ul>` : '';
  return `<div class="box">
      <div class="row"><h2>라쿠텐 트래블 빈방·가격</h2><button type="button" class="link" data-act="rkforget">키 지우기</button></div>
      ${days ? `<div><button type="button" class="ghost small" data-act="rksearch" data-v="${areaKey}"${s.rkBusy ? ' disabled' : ''}>${s.rkBusy ? '라쿠텐에서 찾는 중…' : `${esc(a.name)} 주변 빈방 찾기`}</button></div>
        <p class="fine">${esc(partyNote(s))} 기준, 객실 1개, 첫날 1박 요금이에요. 누르면 여행 날짜·인원·동네 위치가 라쿠텐으로 가요.</p>`
        : '<p class="fine">여행 날짜를 정하면 그 날짜에 실제로 예약할 수 있는 숙소를 찾아 드려요.</p>'}
      ${r && r.msg ? `<p class="warnline">${esc(r.msg)}</p>` : ''}
      ${list}
      ${(s.hotels || []).some(h => h.hotelNo) && days ? `<div><button type="button" class="ghost small" data-act="rkrefresh"${s.rkBusy ? ' disabled' : ''}>담은 라쿠텐 후보 가격 새로 확인</button></div>` : ''}
      <p class="fine">한글 이름은 라쿠텐의 일본어 읽기를 자동으로 옮긴 거라 예약 사이트의 한국어 이름과 조금 다를 수 있어요. 그 아래가 일본어 원래 이름이에요. 실제 요금은 예약 페이지에서 꼭 다시 확인해 주세요.</p>
    </div>`;
}

function hotelSection(s, areaKey){
  const c = compareHotels(s, s.hotelSort); const cur = CURRENCY[s.hotelCur];
  return `<h2>숙소 후보 비교<small>예약 사이트에서 본 숙소를 담아 나란히 비교해요</small></h2>
    <div class="box">
      <p class="fine">${esc(AREAS[areaKey].name)}에서 찾아보기</p>
      ${hotelSearchLinks(s, areaKey)}
    </div>
    ${rakutenBox(s, areaKey)}
    ${s.hotelMsg ? `<p class="warnline">${esc(s.hotelMsg)}</p>` : ''}
    ${s.fx ? `<p class="fine">환율 1엔 ≈ ${s.fx.rate.toFixed(2)}원 (${esc(s.fx.date)}, ${esc(s.fx.src)}). 통화가 다른 가격은 이 환율로 바꿔 비교해요.</p>` : ''}
    ${c.rows.length > 1 ? `<div class="chips" role="group" aria-label="정렬">${chip('hsort', 'place', '위치 좋은 순', s.hotelSort !== 'price')}${chip('hsort', 'price', '1박 싼 순', s.hotelSort === 'price')}</div>` : ''}
    ${c.rows.length ? `<div class="list">${c.rows.map((r, i) => hotelCard(r, i, s, c)).join('')}</div>` : ''}
    ${c.noLoc.length ? `<div class="box"><h2>위치를 확인할 후보</h2><ul class="implist">${c.noLoc.map(h => hotelNoLoc(h, s)).join('')}</ul>
      ${s.hotelErr ? '<p class="warnline">위치 찾기가 멈췄어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p><div><button type="button" class="ghost small" data-act="hfind">다시 찾기</button></div>' : ''}</div>` : ''}
    ${c.rows.length && !c.nights ? '<p class="fine">여행 날짜를 정하면 박 수에 맞춘 합계와 1인당 가격도 보여 드려요.</p>' : ''}
    <form class="box" id="hotelform">
      <h2>숙소 후보 담기</h2>
      <label for="hname">숙소 이름<input id="hname" type="text" required maxlength="60" placeholder="예: 예약 사이트에 나온 호텔 이름"></label>
      <div class="row2">
        <label for="hprice">1박 가격 (${cur.label})<input id="hprice" type="number" min="0" step="1" inputmode="numeric" placeholder="세금 포함 객실 1개"></label>
        <label for="hcur">통화<select id="hcur" data-hcur>${Object.entries(CURRENCY).map(([k, v]) => `<option value="${k}"${s.hotelCur === k ? ' selected' : ''}>${v.label} (${v.sign})</option>`).join('')}</select></label>
      </div>
      <label for="hmap">구글 지도 주소 (위치가 정확해져요)<input id="hmap" type="url" inputmode="url" placeholder="PC 구글 지도에서 숙소를 연 뒤 주소창의 긴 주소"></label>
      <label for="hbook">예약 페이지 주소 (선택)<input id="hbook" type="url" inputmode="url" placeholder="https://"></label>
      <label for="hmemo">메모 (선택)<input id="hmemo" type="text" maxlength="80" placeholder="예: 3명 한 방, 조식 포함, 역 출구 바로 앞"></label>
      <div><button type="submit" class="primary small">후보에 담기</button></div>
      <p class="fine">구글 지도 주소가 없으면 숙소 이름으로 OpenStreetMap에서 위치를 찾아요(숙소 이름만 보내요). 지점이 많은 체인 호텔은 잘 못 찾으니 구글 지도 주소를 넣어 주세요. 담은 후보는 이 기기에만 저장돼요. 통화를 바꿔도 이미 넣은 가격은 바뀌지 않아요.</p>
    </form>`;
}

/* Step 5 · 숙소 동네 */
export function vStay(s){
  const ranked = rankAreas(s); const picked = pickedPlaces(s); const dayPicks = picked.filter(p => !p.full);
  const hasDisney = picked.some(p => p.full && p.area === 'maihama'); const best = ranked[0]; const chosen = s.hotelArea;
  const card = (r, i) => { const a = r.a; const on = chosen === r.key;
    return `<article class="acard${i < 3 ? ' top' : ''}${on ? ' on' : ''}">
      <div class="ahead"><span class="rank">${i+1}</span><div><h3>${esc(a.name)}</h3><p class="ja">${esc(a.station)} 주변</p></div></div>
      <ul class="facts">
        ${dayPicks.length ? `<li><span>담은 곳까지 평균</span><b>${r.avg.toFixed(1)}km</b></li><li><span>2.5km 안에 담은 곳</span><b>${r.near}곳</b></li>` : ''}
        ${hasDisney ? `<li class="${dayPicks.length ? '' : 'wide'}"><span>디즈니까지</span><b>${esc(a.disneyText)}</b></li>` : ''}
        <li><span>체감 가격대</span><b>${esc(a.price)}</b></li>
      </ul>
      <p class="pnote">${esc(a.note)}</p>
      <div class="pfoot">
        <button type="button" class="${on ? 'primary' : 'ghost'} small" data-act="hotel" data-v="${r.key}" aria-pressed="${on}">${on ? '이 동네로 정함 ✓' : '이 동네로 정하기'}</button>
        <a class="link" href="${gmap('ホテル ' + a.q)}" target="_blank" rel="noopener">구글 지도에서 숙소 보기 ↗</a>
      </div>
    </article>`; };
  return `<section class="step">
    <p class="eyebrow">Step 5 · 숙소 동네</p>
    <h1>어느 동네에서 잘까요?</h1>
    <p class="lead">호텔을 고르기 전에 동네부터 정해요. 담은 장소 ${dayPicks.length}곳과의 거리${hasDisney ? ', 디즈니 가는 시간' : ''}을 같이 따져 순서를 매겼어요.</p>
    ${dayPicks.length < 3 ? `<div class="box tip"><p>장소를 3곳 이상 담으면 추천이 더 정확해져요.</p><div><button type="button" class="ghost small" data-act="go" data-v="3">장소 더 담으러 가기</button></div></div>` : ''}
    ${mapSVG('stay', s)}
    ${hasDisney && best.key !== 'maihama' ? `<div class="box tip"><h2>나눠 자는 방법도 있어요</h2><p>디즈니 가는 날 전날 1박만 마이하마에서 자고, 나머지는 ${esc(best.a.name)}에서 자면 디즈니 아침 이동이 없어져요. 대신 짐을 한 번 옮겨야 해요.</p></div>` : ''}
    <div class="list">${ranked.slice(0, 3).map(card).join('')}</div>
    ${ranked.length > 3 ? `<details class="more"><summary>다른 동네 ${ranked.length-3}곳 더 보기</summary><div class="list">${ranked.slice(3).map((r, i) => card(r, i + 3)).join('')}</div></details>` : ''}
    <p class="fine">거리는 직선거리 기준이에요. 이동 시간과 가격대는 시제품용 대략값이라 실제와 다를 수 있어요.</p>
    ${hotelSection(s, chosen || best.key)}
  </section>`;
}

/* 비 오는 날 실내 대안 (일정 단계의 날짜마다, 오늘 하루 화면) */
const ymdStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rainBox(s, P, d){
  const sh = s.sh || {}; const date = ymdStr(d.date); const r = dayRain(s.wx, date);
  const open = (r && r.rainy) || sh.ropen === d.i;
  const undo = sh.rundo && sh.rundo.day === d.i ? `<p class="lmsg" role="status">'${esc(sh.rundo.outName)}' 대신 '${esc(sh.rundo.inName)}'(으)로 바꿨어요. <button type="button" class="link" data-act="rundo">되돌리기</button></p>` : '';
  if(!open) return `${undo}<div><button type="button" class="link" data-act="ropen" data-v="${d.i}">☔ 비 오면?</button></div>`;
  const outs = outdoorStops(d);
  const head = r && r.rainy ? `☔ 비 예보 ${r.prob != null ? r.prob + '%' : ''}${r.text ? ' · ' + esc(r.text) : ''}` : '☔ 비 오면 이렇게 바꿔요';
  let body;
  if(d.full){
    const b = r && r.rainy ? betterFullDay(P, s.wx, d.i) : null;
    body = `<p class="pnote">${esc(d.full.name)}은(는) 비가 와도 대부분 운영해요. 우비·방수 신발을 챙기고 실내 어트랙션 위주로 다니세요.</p>
      ${b ? `<p class="pnote">예보로는 <b>${esc(b.label)}</b>이 비 올 확률 ${b.prob != null ? b.prob + '%' : '낮음'}이에요. <button type="button" class="ghost small" data-act="rfull" data-v="${esc(d.full.id)}|${b.i}">그날로 옮기기</button></p>` : ''}`;
  } else if(!outs.length) body = '<p class="pnote">이날 장소는 모두 실내라 비가 와도 그대로 다닐 수 있어요.</p>';
  else body = outs.map(p => { const alts = indoorAlternatives(s, P, d.i, p, 3);
    return `<div class="ralt"><p><b>${esc(p.name)}</b> <span class="fine">${p.indoor === 'part' ? '반쯤 실외' : '실외'}</span></p>
      ${alts.length ? `<ul class="implist">${alts.map(a => `<li class="imp"><div class="sbody"><b>${esc(a.p.name)}</b><span>${a.km < 0.95 ? '걸어서 가까워요' : `약 ${a.km.toFixed(1)}km`} · 약 ${a.p.hours}시간${a.why.length ? ' · ' + esc(a.why.join(' · ')) : ''}</span></div>
        <button type="button" class="ghost small" data-act="rswap" data-v="${esc(p.id)}|${esc(a.p.id)}|${d.i}">바꾸기</button></li>`).join('')}</ul>` : '<p class="fine">근처에 대신 갈 실내 장소를 못 찾았어요.</p>'}
    </div>`; }).join('');
  return `${undo}<div class="rainbox"><h3>${head}</h3>${body}
    ${r && r.rainy ? '' : `<p class="fine">${r ? '예보로는 비 소식이 없어요. 미리 보기예요.' : '출발 16일 안이 되면 예보로 비 오는 날을 알려 줘요.'} <button type="button" class="link" data-act="ropen" data-v="${d.i}">닫기</button></p>`}
  </div>`;
}

// 교통패스 (일정 단계 아래): 지하철 낱개 표 vs Tokyo Subway Ticket
function transitBox(s, P){
  if(!P.days.some(d => d.full || d.items.length)) return '';
  const t = transitPlan(s, P); const pp = t.people; const open = s.sh && s.sh.tpass;
  const who = pp.guess ? '동행을 안 정해서 어른 1명 기준' : [`어른 ${pp.adults}`, pp.children ? `아이 ${pp.children}` : '', pp.free ? `무료 ${pp.free}` : ''].filter(Boolean).join(' · ');
  const passOf = i => t.blocks.find(b => b.pass && i >= b.from && i <= b.to);
  const segText = x => x.kind === 'subway' ? `지하철 ${tyen(x.fare)}` : `<span class="tout">패스 밖 ${esc(x.line)}${x.at ? `(${esc(x.at)}에서)` : ''}</span>`;
  const days = t.days.map(d => { const b = passOf(d.i);
    return `<div class="tday"><h3>${d.i + 1}일차 · ${esc(d.label)}</h3>
      <p class="fine">${d.legs.length ? (d.rides ? `지하철 ${d.rides}번 · 낱개 어른 ${tyen(d.fareA)}${pp.children ? ` · 아이 ${tyen(d.fareC)}` : ''}${b ? ` · ${esc(b.pass.label)}(${transitRange(b)})` : ''}` : '지하철은 안 타요.') : '일정이 비어 있어요.'}</p>
      ${d.legs.length ? `<ul class="tlegs">${d.legs.map(l => `<li>${esc(l.from.name)} → ${esc(l.to.name)} · ${l.segs.length ? `약 ${l.km.toFixed(1)}km · ${l.segs.map(segText).join(' + ')}` : '걸어서'}</li>`).join('')}</ul>` : ''}
    </div>`; }).join('');
  return `<div class="box" id="transitbox">
    <h2>🚇 교통패스<small>${esc(who)}</small></h2>
    <p class="pnote"><b>${esc(transitTip(t))}</b></p>
    <p class="pnote">${t.saving > 0 ? `패스를 쓰면 모두 약 ${tyen(t.best)}, 낱개로는 약 ${tyen(t.single)}이에요.` : `낱개로 모두 약 ${tyen(t.single)}이에요.`}</p>
    <p class="fine">대략값이에요. 거리는 직선거리로 어림했고(실제 경로 아님), 1km 안은 걸어서 간다고 봤어요. 공항 오가는 길과 패스 밖 노선(디즈니 가는 JR 게이요선, 오다이바 유리카모메 등) 요금은 빼고 셌어요.</p>
    <p class="fine">Tokyo Subway Ticket은 도쿄 메트로·도에이 지하철 전 노선, 처음 탄 때부터 시간을 세요. 외국인 여행자용이라 살 때 여권이 필요해요. 값: ${PASSES.map(p => `${p.label} ${tyen(p.adult)}(아이 ${tyen(p.child)})`).join(' · ')}. 요금 확인 ${FARE_CHECKED} (도쿄 메트로·도에이 공식 누리집)</p>
    <div><button type="button" class="link" data-act="tpass" aria-expanded="${!!open}">${open ? '날짜별 자세히 닫기' : '날짜별 자세히 보기'}</button></div>
    ${open ? days : ''}
  </div>`;
}

/* Step 6 · 일정 */
function moveSelect(p, days, cur){
  const opts = [`<option value="">자동</option>`]
    .concat(days.filter(d => !d.full).map(d => `<option value="${d.i}"${cur === d.i ? ' selected' : ''}>${d.i+1}일차로</option>`))
    .concat([`<option value="-1"${cur === -1 ? ' selected' : ''}>빼두기</option>`]);
  return `<select data-move="${esc(p.id)}" aria-label="${esc(p.name)} 날짜 옮기기">${opts.join('')}</select>`;
}

export function vPlan(s){
  const P = plan(s);
  if(!P.days.length) return `<section class="step">
    <p class="eyebrow">Step 6 · 일정</p>
    <h1>날짜별 일정 초안</h1>
    <div class="box tip"><p>여행 날짜를 먼저 정해 주세요. 날짜가 있어야 하루씩 나눠서 일정을 짤 수 있어요.</p><div><button type="button" class="ghost small" data-act="go" data-v="1">날짜 정하러 가기</button></div></div>
  </section>`;
  const anyItems = P.days.some(d => d.full || d.items.length);
  return `<section class="step">
    <p class="eyebrow">Step 6 · 일정</p>
    <h1>날짜별 일정 초안</h1>
    <p class="lead">${esc(P.hotel.name)}에 묵는 기준으로, 가까운 곳끼리 같은 날에 묶었어요.${s.hotelArea || P.hotel.cand ? '' : ' 숙소 동네를 아직 안 정해서 1순위 동네로 계산했어요.'}</p>
    <div><button type="button" class="ghost small" data-act="replan">손으로 옮긴 것 지우고 다시 짜기</button></div>
    ${mapSVG('plan', s, P)}
    ${(sh => sh.total ? `<p class="fine">담은 곳 ${sh.total}곳 중 실내는 ${sh.indoor}곳이에요. 날짜마다 '☔ 비 오면?'을 누르면 가까운 실내 장소로 바꿀 수 있어요.</p>` : '')(indoorShare(s))}
    ${P.days.map(d => { const col = DAY_COLORS[d.i % DAY_COLORS.length]; const pct = d.cap ? Math.min(100, d.used / d.cap * 100) : 0;
      const body = d.full
        ? `<div class="fullday"><b>${esc(d.full.name)}</b><span>하루 종일 · ${esc(d.full.note || '')}</span><a class="link" href="${esc(gdir(P.hotel, d.full))}" target="_blank" rel="noopener">숙소에서 길찾기 ↗</a>${(d.wd === 0 || d.wd === 6) ? '<p class="warnline">주말이라 많이 붐벼요. 평일로 옮길 수 있으면 옮겨 보세요.</p>' : ''}</div>`
        : d.items.length
          ? `<ol class="stops">${d.items.map((p, j) => { const cl = p.closed && p.closed.includes(d.wd);
              const prev = j ? d.items[j-1] : P.hotel;
              return `<li><span class="num">${j+1}</span><div class="sbody"><b>${esc(p.name)}</b><span>${esc(AREAS[p.area].name)} · 약 ${p.hours}시간${cl ? ` · <span class="closed">이날 휴무예요</span>` : ''}</span><a class="link" href="${esc(gdir(prev, p))}" target="_blank" rel="noopener">${j ? '앞 장소에서' : '숙소에서'} 길찾기 ↗</a>${voteBar(s, p)}</div>${moveSelect(p, P.days, s.assign[p.id])}</li>`; }).join('')}</ol>`
          : `<p class="empty">${d.kind === 'arrive' ? '도착해서 짐 풀고 숙소 근처를 가볍게 걷기 좋은 날이에요.' : d.kind === 'depart' ? '공항 가기 전 숙소 근처에서 가볍게 보내는 날이에요.' : '아직 비어 있어요. 장소를 더 담거나 쉬는 날로 두세요.'}</p>`;
      return `<article class="day" style="--day:${col}">
        <header>${badge(d.i)}<div><h3>${d.i+1}일차 · ${d.label}</h3><p>${kindLabel(d.kind)} · ${d.full ? '하루 종일' : `${d.used}시간 / 약 ${d.cap}시간`}${(r => r ? ` · 예보 ${esc(r.text || '')}${r.prob != null ? ` ${r.prob}%` : ''}` : '')(dayRain(s.wx, ymdStr(d.date)))}</p></div></header>
        ${body}
        ${rainBox(s, P, d)}
        <div><button type="button" class="link" data-act="tfood" data-v="${d.i}">🍜 이날 점심·저녁 식당 찾기</button></div>
        ${d.full ? '' : `<div class="meter${d.used > d.cap ? ' over' : ''}"><span style="width:${pct}%"></span></div>`}
      </article>`; }).join('')}
    ${transitBox(s, P)}
    ${P.unassigned.length ? `<div class="box"><h2>아직 일정에 못 넣은 곳</h2><ol class="stops">${P.unassigned.map(u => `<li><span class="num" style="--day:var(--muted)">·</span><div class="sbody"><b>${esc(u.p.name)}</b><span>${esc(u.why)}</span></div>${u.p.full ? '' : moveSelect(u.p, P.days, s.assign[u.p.id])}</li>`).join('')}</ol></div>` : ''}
    ${anyItems ? '' : '<p class="empty">담은 장소가 없어요. 장소 담기 단계에서 몇 곳을 담아 주세요.</p>'}
    <div class="box"><h2>다음에 붙일 기능</h2><p class="pnote">날짜별 실제 이동 경로와 시간, 날짜마다 다른 숙소에서 나눠 자기를 하나씩 붙여 갈 거예요.</p></div>
  </section>`;
}

/* Step 7 · 준비물 (함께 짜기 여행이면 가족이 같이 체크) */
export function vPack(s){
  const sh = s.sh || {}; const shared = !!(s.shareId && sh.trip);
  const sugg = suggestPacking(s, s.wx); const miss = missingSuggestions(s.pack, sugg);
  const whyOf = it => (it.src && (sugg.find(x => x.key === it.src) || {}).why) || '';
  const v = packView(s.pack, s.pfilter); const party = partyOf(s);
  const m = s.start ? +s.start.slice(5, 7) : null;
  const ctx = [m ? `${m}월` : '', CITY_NAME[s.city] || '', s.who ? partyText(s) : ''].filter(Boolean).join(' · ');
  const pct = v.total ? Math.round(v.done / v.total * 100) : 0;
  const filters = [['all', '전체'], ['left', '남은 것'], ['common', '공용']].concat(party.length > 1 ? party.map(p => [p.id, `${p.name} 짐`]) : []);
  const preview = PACK_CATS.map(c => ({ c, xs:miss.filter(x => x.c === c.key) })).filter(g => g.xs.length);
  return `<section class="step">
    <p class="eyebrow">Step 7 · 준비물</p>
    <h1>준비물 체크리스트</h1>
    <p class="lead">${ctx ? `${esc(ctx)}에 맞춰 골랐어요. ` : ''}누구 짐인지 나누고 챙긴 것을 체크해요.</p>
    <div class="box tip"><p>${shared ? '함께 짜는 여행이라 <b>준비물도 참여자 모두와 공유</b>돼요. 누가 체크해도 모두의 화면에 바로 보여요.' : '지금은 <b>이 기기에만</b> 저장돼요. 가족과 같이 체크하려면 오른쪽 위 \'함께 짜기\'로 여행을 공유해 주세요.'}${s.wx && s.wx.climate ? '' : ' 여행지 단계에서 날씨를 받으면 옷차림 추천이 더 정확해져요.'}</p></div>
    ${!v.total ? `<div class="box">
      <h2>추천 준비물<small>${miss.length}개</small></h2>
      <ul class="pkprev">${preview.map(g => `<li><b>${g.c.icon} ${esc(g.c.label)}</b><span>${g.xs.map(x => esc(x.t)).join(' · ')}</span></li>`).join('')}</ul>
      <div class="pfoot"><button type="button" class="primary small" data-act="pkseed"${miss.length ? '' : ' disabled'}>추천 ${miss.length}개 한 번에 담기</button></div>
      <p class="fine">담은 뒤에 필요 없는 건 빼고, 빠진 건 아래에서 직접 더할 수 있어요.</p>
    </div>` : `<div class="box">
      <h2>챙긴 것<small>${v.done}/${v.total}</small></h2>
      <div class="meter"><span style="width:${pct}%"></span></div>
      <div class="chips" role="group" aria-label="준비물 거르기">${filters.map(([k, l]) => chip('pkfilter', k, esc(l), (s.pfilter || 'all') === k)).join('')}</div>
    </div>
    ${v.groups.length ? v.groups.map(g => `<h2 class="vday">${g.cat.icon} ${esc(g.cat.label)}<small>${g.items.filter(x => x.done).length}/${g.items.length}</small></h2>
      <ul class="plist">${g.items.map(it => `<li class="${it.done ? 'done' : ''}">
        <button type="button" class="tchk" data-act="pkchk" data-v="${esc(it.id)}" aria-pressed="${!!it.done}" aria-label="${esc(it.t)} 챙김">✓</button>
        <div class="sbody"><b>${esc(it.t)}</b>${whyOf(it) ? `<span>${esc(whyOf(it))}</span>` : ''}${it.done && it.doneBy ? `<span class="pkby">${esc(it.doneBy)} 챙김</span>` : ''}
          <span class="pkrow"><select data-pkwho="${esc(it.id)}" aria-label="${esc(it.t)} 누구 짐">${[['', '공용']].concat(party.map(p => [p.id, p.name])).map(([k, l]) => `<option value="${esc(k)}"${(it.who || '') === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
          <button type="button" class="link" data-act="pkdel" data-v="${esc(it.id)}">빼기</button></span></div>
      </li>`).join('')}</ul>`).join('') : '<p class="empty">이 조건에 맞는 준비물이 없어요.</p>'}`}
    <form class="box" id="packform" autocomplete="off">
      <h2>직접 더하기</h2>
      <div class="lline"><input id="pkin" type="text" maxlength="200" enterkeyhint="done" placeholder="예: 수영복, 머리끈 (쉼표로 여러 개)" aria-label="준비물 직접 더하기"><button type="submit" class="primary small">더하기</button></div>
      <p class="fine">이름을 보고 분류를 알아서 정해요.</p>
    </form>
    ${v.total && miss.length ? `<div class="box">
      <h2>더 챙길 만한 것<small>${miss.length}개</small></h2>
      <ul class="implist">${miss.map(x => `<li class="imp"><div class="sbody"><b>${packCatOf(x.c).icon} ${esc(x.t)}</b>${x.why ? `<span>${esc(x.why)}</span>` : ''}</div><button type="button" class="ghost small" data-act="pkone" data-v="${esc(x.key)}">담기</button></li>`).join('')}</ul>
      <div class="pfoot"><button type="button" class="ghost small" data-act="pkseed">모두 담기</button></div>
    </div>` : ''}
  </section>`;
}

/* Step 8 · 보관함 (예약·티켓, 이 기기에만) */
function vaultDay(s, date){
  if(!date) return '날짜 없음';
  const d = parseDate(date); const i = buildDays(s).findIndex(x => x.date.getTime() === d.getTime());
  return `${d.getMonth()+1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})${i >= 0 ? ` · ${i+1}일차` : ''}`;
}

function vaultCard(s, it){
  const k = kindOf(it.kind); const pn = it.placeId ? placeName(s, it.placeId) : '';
  const armed = s.sh && s.sh.vdel === it.id; const link = safeHttpsUrl(it.link);
  return `<article class="vcard" id="v-${esc(it.id)}">
    <div class="vhead"><span class="vicon" aria-hidden="true">${k.icon}</span><div><h3>${esc(it.title)}</h3>
      <p class="meta">${esc(k.label)}${it.time ? ' · ' + esc(it.time) : ''}${pn && pn !== it.title ? ' · ' + esc(pn) : ''}</p></div></div>
    ${it.code ? `<div class="vcode"><span>예약번호</span><b>${esc(it.code)}</b><button type="button" class="link" data-act="vcopy" data-v="${esc(it.id)}">복사</button></div>` : ''}
    ${it.memo ? `<p class="pnote">${esc(it.memo)}</p>` : ''}
    ${(it.files || []).length ? `<div class="vfiles">${it.files.map(f => /^image\//.test(f.type)
      ? `<button type="button" class="vthumb" data-act="vview" data-v="${esc(it.id)}|${esc(f.fid)}" aria-label="${esc(f.name)} 크게 보기"><img data-fid="${esc(f.fid)}" alt=""></button>`
      : `<button type="button" class="vpdf" data-act="vview" data-v="${esc(it.id)}|${esc(f.fid)}">📄 ${esc(f.name)}</button>`).join('')}</div>` : ''}
    <div class="pfoot">
      ${link ? `<a class="link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">예약 페이지 ↗</a>` : ''}
      <button type="button" class="link" data-act="vedit" data-v="${esc(it.id)}">고치기</button>
      <button type="button" class="link${armed ? ' warnlink' : ''}" data-act="vdel" data-v="${esc(it.id)}">${armed ? '한 번 더 누르면 지워져요' : '지우기'}</button>
    </div>
  </article>`;
}

// 백업 · 되돌리기 (보관함 단계 맨 아래)
function backupBox(s){
  const sh = s.sh || {}; const r = sh.restore;
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }); };
  const bad = sh.bkmsg && /못|아니에요|알 수 없|새 버전/.test(sh.bkmsg);
  return `<div class="box" id="backupbox">
    <h2>백업 · 되돌리기<small>${s.lastBackup ? `마지막 백업 ${esc(s.lastBackup)}` : '아직 백업하지 않았어요'}</small></h2>
    <p class="fine">일정·숙소 후보·가져온 장소·가계부·보관함(첨부 사진·PDF 포함)을 파일 하나로 저장해요. 폰을 바꾸거나 데이터가 지워져도 이 파일로 되돌릴 수 있어요. 파일은 '파일' 앱이나 메일·카톡 '나에게 보내기'로 보관하세요.</p>
    ${s.rkOn ? '<label class="chk"><input type="checkbox" id="bkkeys"> 라쿠텐 키도 넣기 <span class="fine">(키가 든 파일은 남에게 보내지 마세요)</span></label>' : ''}
    <div class="pfoot"><button type="button" class="primary small" data-act="bkexport"${sh.bkbusy ? ' disabled' : ''}>${sh.bkbusy ? '만드는 중…' : '백업 파일 만들기'}</button>
      <label class="ghost small filebtn">백업 파일로 되돌리기<input type="file" accept=".json,application/json" data-bkimport hidden></label></div>
    ${sh.bkmsg ? `<p class="${bad ? 'warnline' : 'fine'}">${esc(sh.bkmsg)}</p>` : ''}
    ${r ? `<div class="box tip"><h2>이 백업으로 바꿀까요?</h2>
      <ul class="bklist">
        <li>만든 때: ${esc(when(r.sum.at))}</li>
        ${r.sum.dates ? `<li>여행 날짜: ${esc(r.sum.dates)}</li>` : ''}
        <li>담은 곳 ${r.sum.places}곳${r.sum.custom ? ` (직접 담은 곳 ${r.sum.custom}곳)` : ''} · 숙소 후보 ${r.sum.hotels}곳</li>
        <li>보관함 ${r.sum.vault}건 · 첨부 ${r.sum.files}개${r.sum.bytes ? ` (${sizeText(r.sum.bytes)})` : ''}${r.sum.spend ? ` · 가계부 ${r.sum.spend}건` : ''}${r.sum.pack ? ` · 준비물 ${r.sum.pack}개` : ''}</li>
        ${r.sum.shared ? '<li>공유 여행이 연결된 백업이에요. 일정은 공유 여행의 최신 내용으로 맞춰지고, 보관함 등 이 기기 것만 백업에서 돌아와요.</li>' : ''}
        ${r.sum.keys ? '<li>라쿠텐 키가 들어 있어요.</li>' : ''}
      </ul>
      <p class="fine">지금 이 기기의 일정과 보관함 목록이 이 백업으로 바뀌어요. 바꾸기 전 상태는 따로 보관해서 '되돌리기 취소'로 돌아갈 수 있어요.</p>
      <div class="pfoot"><button type="button" class="primary small" data-act="bkrestore"${sh.bkbusy ? ' disabled' : ''}>이 백업으로 바꾸기</button><button type="button" class="ghost small" data-act="bkcancel">취소</button></div>
    </div>` : ''}
    ${sh.hasRestoreUndo && !r ? '<p class="fine">백업으로 바꾸기 전 상태가 보관돼 있어요. <button type="button" class="link" data-act="bkundo">되돌리기 취소</button></p>' : ''}
  </div>`;
}

export function vVault(s){
  const items = s.vault || []; const miss = missingBookings(s, items);
  const editing = s.vedit ? items.find(x => x.id === s.vedit) : null;
  const d = editing || s.vdraft || {};
  const groups = groupVault(items);
  return `<section class="step">
    <p class="eyebrow">Step 8 · 보관함</p>
    <h1>예약과 티켓을 한곳에</h1>
    <p class="lead">항공권·숙소·입장권·입국 QR을 모아 두면 공항·호텔·입구에서 인터넷 없이 바로 꺼내 보여 줄 수 있어요.</p>
    <div class="box tip"><p>보관함은 <b>이 기기에만</b> 저장돼요. 예약번호·QR은 민감한 정보라 함께 짜기로 공유하지 않아요. 가족에게 줄 티켓은 사진을 열어 '보내기'로 전해 주세요.${s.sh && s.sh.vusage ? ` 이 앱이 기기에서 쓰는 저장 공간은 약 ${sizeText(s.sh.vusage)}이에요.` : ''}</p></div>
    ${miss.length ? `<div class="box"><h2>아직 보관함에 없는 예약<small>${miss.length}가지</small></h2>
      <ul class="implist">${miss.map((m, i) => `<li class="imp"><div class="sbody"><b>${kindOf(m.kind).icon} ${esc(m.title)}</b><span>${esc(m.why)}</span></div>
        <button type="button" class="ghost small" data-act="vaddq" data-v="${i}">넣기</button></li>`).join('')}</ul></div>` : ''}
    ${groups.length ? groups.map(g => `<h2 class="vday">${esc(vaultDay(s, g.date))}</h2><div class="list">${g.items.map(it => vaultCard(s, it)).join('')}</div>`).join('')
      : '<p class="empty">아직 넣은 예약이 없어요. 아래에서 첫 예약을 넣어 보세요.</p>'}
    <form class="box" id="vaultform" autocomplete="off">
      <h2>${editing ? '예약 고치기' : '보관함에 넣기'}</h2>
      <div class="row2">
        <label for="vkind">종류<select id="vkind">${VAULT_KINDS.map(k => `<option value="${k.key}"${(d.kind || 'flight') === k.key ? ' selected' : ''}>${k.icon} ${k.label}</option>`).join('')}</select></label>
        <label for="vdate">날짜<input id="vdate" type="date" value="${esc(d.date || '')}"></label>
      </div>
      <label for="vtitle">이름<input id="vtitle" type="text" required maxlength="60" value="${esc(d.title || '')}" placeholder="예: 가는 편 인천 → 나리타"></label>
      <div class="row2">
        <label for="vtime">시간<input id="vtime" type="time" value="${esc(d.time || '')}"></label>
        <label for="vcode">예약번호<input id="vcode" type="text" maxlength="40" value="${esc(d.code || '')}" spellcheck="false"></label>
      </div>
      <label for="vlink">예약 페이지 주소 (선택)<input id="vlink" type="url" inputmode="url" value="${esc(d.link || '')}" placeholder="https://"></label>
      <label for="vmemo">메모 (선택)<textarea id="vmemo" rows="2" maxlength="300" placeholder="예: 체크인 15시 · 짐은 프런트에 맡기기">${esc(d.memo || '')}</textarea></label>
      <label for="vfiles">티켓·QR 사진, PDF (선택, 여러 개)<input id="vfiles" type="file" accept="image/*,application/pdf" multiple></label>
      <input type="hidden" id="vplace" value="${esc(d.placeId || '')}">
      ${editing && (editing.files || []).length ? `<p class="fine">이미 넣은 첨부 ${editing.files.length}개는 그대로 둬요. 새로 고른 파일은 더해져요.</p>` : ''}
      <div class="pfoot"><button type="submit" class="primary small">${editing ? '고친 내용 저장' : '보관함에 넣기'}</button>
        ${editing || s.vdraft ? '<button type="button" class="ghost small" data-act="vcancel">취소</button>' : ''}</div>
      <p class="fine">큰 사진은 줄여서 저장하고, QR 캡처는 선명하게 그대로 둬요. 아이폰은 홈 화면에 추가한 앱에서 써야 오래 안전하게 남아요. 원본은 메일·사진첩에도 꼭 남겨 두세요.</p>
    </form>
    ${backupBox(s)}
  </section>`;
}

/* Step 9 · 가계부 (함께 짜기 여행이면 참여자 모두와 공유) */
const LEX = ['어제 택시 2800엔 카드', '아빠가 디즈니 입장권 4장 39600엔', '여행 전 유심 25000원'];

function ledgerRow(s, e, L, armed){
  const c = catOf(e.cat); const p = partyOf(s).find(x => x.id === e.by);
  const conv = e.cur !== L.base ? L.val(e) : null;
  const pay = e.pay ? (PAYS.find(x => x.key === e.pay) || {}).label : '';
  const sp = e.split && e.split.length ? (e.split.length === 1 && e.split[0] === e.by ? '혼자 부담' : `${e.split.map(id => (partyOf(s).find(x => x.id === id) || {}).name).filter(Boolean).join('·')} 몫`) : '';
  const meta = [p ? `${p.name} 냄` : '', pay, sp, e.src === 'triple' ? '트리플에서 가져옴' : ''].filter(Boolean).join(' · ');
  return `<li class="lrow">
    <span class="licon" aria-hidden="true">${c.icon}</span>
    <div class="sbody"><b>${esc(e.what || c.label)}</b><span>${esc(c.label)}${meta ? ' · ' + esc(meta) : ''}</span>
      <span class="lacts"><button type="button" class="link" data-act="ledit" data-v="${esc(e.id)}">고치기</button>
      <button type="button" class="link${armed === e.id ? ' warnlink' : ''}" data-act="ldel" data-v="${esc(e.id)}">${armed === e.id ? '한 번 더 누르면 지워져요' : '지우기'}</button></span></div>
    <div class="lamt"><b>${lmoney(e.amt, e.cur)}</b>${conv != null ? `<span>≈ ${lmoney(conv, L.base)}</span>` : ''}</div>
  </li>`;
}

function ledgerDetail(s, editing, today){
  const party = partyOf(s); const ds = tripDates(s);
  const e = editing || { d:defaultDay(s, today, 'food'), amt:'', cur:s.country === 'jp' ? 'JPY' : 'KRW', what:'', cat:'food', pay:'', by:defaultPayer(s), split:null };
  const dopts = [['before', '여행 전']].concat(ds.map(d => [d, dayLabel(s, d)]), [['after', '여행 후']]);
  if(e.d && !dopts.some(o => o[0] === e.d)) dopts.push([e.d, dayLabel(s, e.d)]);
  const split = e.split && e.split.length ? e.split : party.map(p => p.id);
  return `<form class="box" id="ledgerdetail" autocomplete="off">
    <h2>${editing ? '지출 고치기' : '자세히 적기'}</h2>
    <div class="row2">
      <label for="ldate">날짜<select id="ldate">${dopts.map(([v, l]) => `<option value="${esc(v)}"${e.d === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <label for="lcat">분류<select id="lcat">${CATS.map(c => `<option value="${c.key}"${e.cat === c.key ? ' selected' : ''}>${c.icon} ${c.label}</option>`).join('')}</select></label>
    </div>
    <div class="row2">
      <label for="lamt">금액<input id="lamt" type="number" inputmode="decimal" min="1" step="any" required value="${esc(String(e.amt))}"></label>
      <label for="lcur">통화<select id="lcur">${Object.entries(CURRENCY).map(([k, v]) => `<option value="${k}"${e.cur === k ? ' selected' : ''}>${v.label} (${k})</option>`).join('')}</select></label>
    </div>
    <label for="lwhat">내용<input id="lwhat" type="text" maxlength="40" value="${esc(e.what || '')}" placeholder="예: 라멘"></label>
    <div class="row2">
      <label for="lby">낸 사람<select id="lby">${party.map(p => `<option value="${esc(p.id)}"${e.by === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label for="lpay">결제<select id="lpay">${PAYS.map(p => `<option value="${p.key}"${(e.pay || '') === p.key ? ' selected' : ''}>${p.label}</option>`).join('')}</select></label>
    </div>
    ${party.length > 1 ? `<fieldset class="lsplit"><legend>누구 몫인가요</legend>${party.map(p => `<label class="chk"><input type="checkbox" name="lsplit" value="${esc(p.id)}"${split.includes(p.id) ? ' checked' : ''}> ${esc(p.name)}</label>`).join('')}</fieldset>` : ''}
    <div class="pfoot"><button type="submit" class="primary small">${editing ? '고친 내용 저장' : '적기'}</button><button type="button" class="ghost small" data-act="lcancel">닫기</button></div>
  </form>`;
}

// 트리플 가계부 CSV 가져오기 (트리플은 2026-11-03 종료, 가계부는 CSV로만 남음)
function ledgerImportBox(s){
  const sh = s.sh || {}; const p = sh.limp;
  return `<div class="box" id="limpbox">
    <h2>트리플 가계부 가져오기<small>CSV 파일</small></h2>
    <p class="fine">트리플은 11월 3일에 끝나고 가계부는 CSV 파일로만 남아요. 트리플 가계부 화면 오른쪽 위 ··· → '가계부 내보내기(CSV)'로 만든 파일을 고르면, '1 일차'를 이 여행 날짜에 맞춰 넣고 낸 사람·나눠 낼 사람도 옮겨요. 파일은 이 기기에서만 읽어요.</p>
    <div><label class="ghost small filebtn">CSV 파일 고르기<input type="file" accept=".csv,text/csv" data-limport hidden></label></div>
    ${sh.limpMsg ? `<p class="${sh.limpBad ? 'warnline' : 'lmsg'}" role="status">${esc(sh.limpMsg)}</p>` : ''}
    ${p ? `<div class="box tip"><h2>이대로 가져올까요?</h2>
      <ul class="bklist">
        <li>${esc(sh.limpName || '')} · 지출 ${p.items.length}건${p.items.length ? ` (${[p.sum.JPY ? lmoney(p.sum.JPY, 'JPY') : '', p.sum.KRW ? lmoney(p.sum.KRW, 'KRW') : ''].filter(Boolean).join(' + ')})` : ''}</li>
        <li>트리플의 1 일차 = ${esc(dayLabel(s, p.firstDay))}</li>
        ${p.people.length ? `<li>사람: ${esc(p.people.join(', '))} — 이름은 가져온 뒤 정산 칸에서 고칠 수 있어요</li>` : ''}
        ${p.dup ? `<li>이미 가져온 ${p.dup}건은 건너뛰어요</li>` : ''}
        ${p.late ? `<li>이 여행보다 긴 일차의 ${p.late}건은 '여행 후'로 넣어요</li>` : ''}
        ${p.other ? `<li>엔·원이 아닌 통화 ${p.other}건은 트리플이 바꿔 둔 원화 금액으로 넣어요</li>` : ''}
      </ul>
      <div class="pfoot"><button type="button" class="primary small" data-act="limpok"${p.items.length ? '' : ' disabled'}>가져오기</button><button type="button" class="ghost small" data-act="limpcancel">취소</button></div>
    </div>` : ''}
  </div>`;
}

// 예산: 정하지 않았으면 칸만, 정했으면 쓴 돈·남은 돈·하루에 쓸 수 있는 돈 (넘어도 부드럽게)
const wonVal = v => v > 0 ? v.toLocaleString('ko-KR') : '';
function budgetBox(s, today){
  const sh = s.sh || {}; const b = budgetOf(s); const v = budgetView(s, today); const ln = budgetLines(v);
  const edit = !v.on || sh.lbedit; const catsOpen = sh.lbcats || Object.keys(b.cats).length;
  const bar = (pct, level) => `<span class="meter bmeter${level === 'over' ? ' bover' : ''}"><span style="width:${Math.min(100, Math.max(pct ? 3 : 0, pct))}%"></span></span>`;
  return `<div class="box" id="lbudget">
    <h2>예산<small>${v.on ? `${manwon(v.total)}${v.fromCats ? ' · 분류별 합' : ''}` : '원화로'}</small></h2>
    ${v.on ? `<p class="bnums"><b>${manwon(v.spent)}</b> 썼어요 <span class="fine">/ ${manwon(v.total)} · ${v.pct}%</span></p>
      ${bar(v.pct, v.level)}
      <p class="bnote${v.level === 'ok' ? '' : ' bsoft'}">${esc(ln.head)}${ln.day ? `<br><span class="fine">${esc(ln.day)}</span>` : ''}</p>
      ${v.missing ? `<p class="fine">환율을 아직 못 받아서 엔화 지출 ${v.missing}건은 예산에 넣지 못했어요. 아래 정산 칸에 환율을 넣어 주세요.</p>` : ''}
      ${v.cats.length ? `<ul class="lcats bcats">${v.cats.map(c => `<li><span>${c.icon} ${esc(c.label)}</span>${bar(c.pct, c.level)}<b${c.level === 'over' ? ' class="bsoftk"' : ''}>${esc(catLine(c))}</b></li>`).join('')}</ul>
        ${v.cats.some(c => c.level === 'over') ? `<p class="fine">${v.cats.filter(c => c.level === 'over').map(c => `${esc(c.label)} 예산보다 ${manwon(-c.left)} 더 썼어요`).join(' · ')}. 다른 분류에서 조금 아끼면 돼요.</p>` : ''}` : ''}
      ${edit ? '' : '<div class="pfoot"><button type="button" class="link" data-act="lbedit">예산 고치기</button></div>'}` : ''}
    ${edit ? `<label class="lrate" for="lbtotal">여행 전체 예산 (원)<input id="lbtotal" type="text" inputmode="numeric" data-bud="total" value="${esc(wonVal(b.total))}" placeholder="예: 2,000,000 또는 200만"></label>
      <p class="fine">항공권·숙소처럼 여행 전에 낸 돈도 같이 세요. 엔으로 적은 지출은 정산 환율로 원화로 바꿔 계산해요.${s.shareId && sh.trip ? ' 예산도 함께 짜는 사람 모두에게 보여요.' : ''}</p>
      ${catsOpen ? `<fieldset class="bcatin"><legend>분류별 예산 (원, 비우면 안 정함)</legend>${CATS.map(c => `<label for="lb_${c.key}"><span>${c.icon} ${esc(c.label)}</span><input id="lb_${c.key}" type="text" inputmode="numeric" data-bud="${c.key}" value="${esc(wonVal(b.cats[c.key] || 0))}" placeholder="예: 50만"></label>`).join('')}</fieldset>
        ${v.catOver ? `<p class="fine">분류별 예산을 더하면 전체 예산보다 ${manwon(v.catOver)} 많아요.</p>` : ''}`
        : '<div><button type="button" class="link" data-act="lbcats">분류별로도 정하기</button></div>'}
      ${v.on ? '<div class="pfoot"><button type="button" class="ghost small" data-act="lbdone">다 정했어요</button></div>' : ''}` : ''}
  </div>`;
}

export function vLedger(s){
  const sh = s.sh || {}; const today = sh.today || ''; const L = ledgerSummary(s); const party = partyOf(s);
  const shared = !!(s.shareId && sh.trip);
  const editing = sh.ledit && (s.spend || {})[sh.ledit] ? Object.assign({ id:sh.ledit }, s.spend[sh.ledit]) : null;
  const name = id => esc((party.find(p => p.id === id) || {}).name || '?');
  const members = shared ? Object.values(sh.trip.members || {}).map(m => m.name).filter(n => n && !party.some(p => p.name === n)) : [];
  const fx = L.rate > 0 ? `1엔 = ${L.rate.toFixed(2)}원${s.lrate > 0 ? ' (직접 넣은 환율)' : s.fx && s.fx.src ? ` (${esc(s.fx.src)} ${esc(s.fx.date || '')})` : ''}` : '';
  return `<section class="step">
    <p class="eyebrow">Step 9 · 가계부</p>
    <h1>함께 쓰는 가계부</h1>
    <p class="lead">쓴 돈을 한 줄로 적으면 원화로 바꿔 합치고, 누가 누구에게 얼마를 보내면 되는지 계산해요.</p>
    <div class="box tip"><p>${shared ? '함께 짜는 여행이라 <b>가계부도 참여자 모두와 공유</b>돼요. 누가 적어도 모두의 화면에 바로 보여요.' : '지금은 <b>이 기기에만</b> 저장돼요. 가족과 같이 적으려면 오른쪽 위 \'함께 짜기\'로 여행을 공유해 주세요. 공유하면 가계부도 함께 보여요.'}</p></div>
    <form class="box" id="ledgerform" autocomplete="off">
      <h2>한 줄로 적기</h2>
      <div class="lline"><input id="lline" type="text" maxlength="120" enterkeyhint="done" placeholder="예: 라멘 1200엔" aria-label="지출을 한 줄로 적기" aria-describedby="lprev"><button type="submit" class="primary small">적기</button></div>
      <p id="lprev" class="fine" aria-live="polite">${esc(ledgerHint(s, { today, cur:s.country === 'jp' ? 'JPY' : 'KRW' }))}</p>
      ${sh.lmsg ? `<p class="lmsg${sh.lerr ? ' bad' : ''}" role="status">${esc(sh.lmsg)}${sh.lundo && (s.spend || {})[sh.lundo] ? ' <button type="button" class="link" data-act="lundo">되돌리기</button>' : ''}</p>` : ''}
      <p class="fine lex">이렇게도 돼요: ${LEX.map(x => `<button type="button" class="link" data-act="lex" data-v="${esc(x)}">${esc(x)}</button>`).join(' · ')}</p>
      <p class="fine">어제·그제, '2일차', '3/8', '여행 전', 사람 이름, 카드·현금, '따로'(혼자 부담), '3그릇 980엔씩'을 알아들어요.${sh.lmore || editing ? '' : ' <button type="button" class="link" data-act="lmore">자세히 적기</button>'}</p>
    </form>
    ${sh.lmore || editing ? ledgerDetail(s, editing, today) : ''}
    ${budgetBox(s, today)}
    ${L.count ? `<div class="box">
      <h2>지금까지 쓴 돈<small>${L.count}건</small></h2>
      <p class="ltotal">${lmoney(L.total, L.base)}</p>
      <p class="fine">${[L.byCur.JPY ? lmoney(L.byCur.JPY, 'JPY') : '', L.byCur.KRW ? lmoney(L.byCur.KRW, 'KRW') : ''].filter(Boolean).join(' + ')}${party.length > 1 ? ` · ${party.length}명이면 1인당 ${lmoney(L.total / party.length, L.base)}` : ''}</p>
      ${L.missing ? `<p class="warnline">환율을 아직 못 받아서 엔화 지출 ${L.missing}건은 합계에 넣지 못했어요. 아래에 정산 환율을 넣어 주세요.</p>` : ''}
      <ul class="lcats">${L.byCat.map(c => `<li><span>${c.icon} ${esc(c.label)}</span><span class="meter"><span style="width:${Math.max(3, c.value / L.total * 100)}%"></span></span><b>${lmoney(c.value, L.base)}</b></li>`).join('')}</ul>
      ${L.byPay.cash || L.byPay.card || L.byPay.ic ? `<p class="fine">${[['cash', '현금'], ['card', '카드'], ['ic', '교통카드']].filter(([k]) => L.byPay[k]).map(([k, l]) => `${l} ${lmoney(L.byPay[k], L.base)}`).join(' · ')}</p>` : ''}
      <div class="pfoot"><button type="button" class="ghost small" data-act="lexport">엑셀로 내보내기</button></div>
      ${sh.lxmsg ? `<p class="lmsg${sh.lxbad ? ' bad' : ''}" role="status">${esc(sh.lxmsg)}</p>` : ''}
      <p class="fine">지출 목록을 엑셀에서 바로 열리는 CSV 파일로 만들어요. 폰에서는 보내기 창이 뜨고, 컴퓨터에서는 내려받아요.</p>
    </div>` : ''}
    <div class="box">
      <h2>정산<small>누가 누구에게</small></h2>
      <ul class="lppl">${L.people.map(p => `<li>
        <input type="text" maxlength="12" value="${esc(p.name)}" data-lname="${esc(p.id)}" aria-label="정산할 사람 이름">
        <span class="fine">낸 돈 ${lmoney(p.paid, L.base)} · 몫 ${lmoney(p.owe, L.base)}</span>
        ${party.length > 1 && !personUsed(s, p.id) ? `<button type="button" class="link" data-act="lpdel" data-v="${esc(p.id)}" aria-label="${esc(p.name)} 빼기">빼기</button>` : ''}
      </li>`).join('')}</ul>
      <div class="pfoot"><button type="button" class="ghost small" data-act="lpadd">사람 더하기</button>${members.length ? `<button type="button" class="ghost small" data-act="lpmembers">함께 짜는 사람 ${members.length}명 넣기</button>` : ''}</div>
      ${party.length < 2 ? '<p class="fine">두 명 이상이면 1인당 금액과 \'누가 누구에게 얼마\'를 계산해요. 아이처럼 돈을 안 내는 사람은 넣지 않아도 돼요.</p>'
        : L.transfers.length ? `<ul class="ltx">${L.transfers.map(t => `<li><b>${name(t.from)}</b> → <b>${name(t.to)}</b><span>${lmoney(t.amt, L.base)}</span></li>`).join('')}</ul>`
        : L.count ? '<p class="fine">모두 자기 몫만큼 냈어요. 보낼 돈이 없어요.</p>' : ''}
      <label class="lrate">정산 환율 (1엔 = ?원)<input type="number" inputmode="decimal" min="0" step="0.01" data-lrate value="${s.lrate > 0 ? esc(String(s.lrate)) : ''}" placeholder="${L.rate > 0 && !(s.lrate > 0) ? esc(L.rate.toFixed(2)) : '예: 9.35'}"></label>
      <p class="fine">${fx ? `지금 ${fx}로 계산해요. ` : ''}실제로 환전한 환율로 나누려면 숫자를 넣고, 비우면 받아 온 환율을 써요.</p>
    </div>
    ${L.groups.length ? L.groups.map(g => `<h2 class="vday">${esc(g.d ? dayLabel(s, g.d) : '날짜 없음')}<small>${lmoney(g.total, L.base)}</small></h2>
      <ul class="llist">${g.items.map(e => ledgerRow(s, e, L, sh.ldel)).join('')}</ul>`).join('')
      : '<p class="empty">아직 적은 지출이 없어요. 위 칸에 "라멘 1200엔"처럼 적어 보세요.</p>'}
    ${ledgerImportBox(s)}
  </section>`;
}

/* 동선 위 식당 찾기 (오늘 하루 화면): 점심·저녁 때 있을 곳 근처 식당을 구글에서 (평점·그 시간 영업·걸어서 몇 분) */
const foodOpenText = o => o === true ? '<span class="fopen">이 시간 영업</span>' : o === false ? '<span class="closed">이 시간엔 안 열어요</span>' : '<span>영업시간 정보 없음</span>';
function foodRow(d, k, r){
  return `<li class="imp"><div class="sbody"><b>${esc(r.name)}</b>
      <span>${esc(r.cuisine)}${r.rating ? ` · ★ ${r.rating.toFixed(1)}${r.ratingN ? ` (${r.ratingN.toLocaleString('ko-KR')})` : ''}` : ''} · 걸어서 ${walkMin(r.km)}분 · ${foodOpenText(r.open)}</span>
      ${r.mapsUrl ? `<span class="lacts"><a class="link" href="${esc(r.mapsUrl)}" target="_blank" rel="noopener">구글 지도 ↗</a></span>` : ''}</div>
    <button type="button" class="ghost small" data-act="fadd" data-v="${d.i}|${k}|${esc(r.id)}">일정에 넣기</button></li>`;
}
function foodSlot(sh, d, m, k){
  const st = (sh.food || {})[foodKey(m.at)]; const ml = m.meal === 'lunch' ? '점심' : '저녁';
  const list = st && st.items ? rankFood(st.items, d.wd, m.time, 8) : null;
  return `<div class="fslot"><p><b>${ml} ${m.time}</b> · ${esc(m.why)}</p>
    ${list ? (list.length ? `<ul class="implist flist">${list.map(r => foodRow(d, k, r)).join('')}</ul>` : '<p class="fine">이 근처 500m 안에서 식당을 못 찾았어요.</p>')
      : `<div class="pfoot"><button type="button" class="primary small" data-act="ffind" data-v="${d.i}|${k}"${st && st.busy ? ' disabled' : ''}>${st && st.busy ? '찾는 중…' : `근처 ${ml} 식당 찾기`}</button></div>`}
    ${st && st.err ? `<p class="warnline">${esc(st.err)}</p>` : ''}
    <a class="link" href="${esc(moreFoodUrl(m.at, m.meal))}" target="_blank" rel="noopener">구글 지도에서 더 보기 ↗</a>
  </div>`;
}
function foodBox(s, d, hotel){
  const slots = mealSlots(d, hotel); if(!slots.length) return '';
  return `<div class="box" id="foodbox"><h2>이날 식당<small>${slots.map(m => m.meal === 'lunch' ? '점심' : '저녁').join('·')}</small></h2>
    ${slots.map((m, k) => foodSlot(s.sh || {}, d, m, k)).join('')}
    <p class="fine">버튼을 누르면 그 장소 좌표를 구글로 보내 근처 식당을 찾아요. 일본은 정기휴무·예약제·현금만 받는 곳이 많으니 가기 전에 구글 지도에서 한 번 더 확인하세요.</p>
  </div>`;
}

/* 안전·긴급 정보 한 장 (단계 밖, 위 '긴급' 버튼). 인터넷 없이 열림 */
function sosBig(s){
  const b = (s.sh || {}).sbig; if(!b) return '';
  const hc = sosHotel(s); const ph = b.startsWith('p') ? PHRASES[+b.slice(1)] : null;
  const ja = b === 'hotel' ? ['この住所に行きたいです', hc.name, hc.addr, hc.tel ? `TEL ${hc.tel}` : ''].filter(Boolean).join('\n')
    : b === 'kid' ? kidCardJa(s.sphone, hc.name) : ph ? ph.ja : '';
  const ko = b === 'hotel' ? '이 주소로 가고 싶어요' : b === 'kid' ? '길을 잃었어요. 이 번호로 전화해 주세요' : ph ? `${ph.ko} · ${ph.read}` : '';
  return `<div class="sosover" role="dialog" aria-label="크게 보기"><p class="sosja">${esc(ja).replace(/\n/g, '<br>')}</p><p class="fine">${esc(ko)}</p>
    <button type="button" class="ghost" data-act="sbig" data-v="">닫기</button></div>`;
}

export function vSafety(s){
  const sf = s.safety || {}; const hc = sosHotel(s); const calls = callsFor(s);
  const kids = s.who === 'family' && (s.kids || []).length;
  const big = calls.filter(c => c.big), rest = calls.filter(c => !c.big);
  return `<section class="step sos">
    <p class="eyebrow">긴급</p>
    <h1>안전·긴급 정보</h1>
    <p class="lead">인터넷이 없어도 열려요. 출발 전에 한 번 읽어 보고, 숙소 주소를 넣어 두세요.</p>
    ${s.country !== 'jp' ? '<div class="box tip"><p>지금은 일본 정보만 준비했어요. 아래 외교부 영사안전콜센터는 어느 나라에서나 24시간 받아요.</p></div>' : ''}
    <div class="sosbig">${big.map(c => `<a class="sosbtn" href="${telHref(c.tel)}"><b>${esc(c.num)}</b><span>${esc(c.label)}</span></a>`).join('')}</div>
    <p class="fine">${big.map(c => `<b>${esc(c.num)}</b> ${esc(c.when)}`).join('<br>')}</p>
    <div class="box"><h2>도움받을 곳</h2>
      <ul class="soslist">${rest.map(c => `<li><div class="sbody"><b>${esc(c.label)}</b><span>${esc(c.when)}</span></div><a class="link" href="${telHref(c.tel)}">${esc(c.num)}</a></li>`).join('')}</ul>
      <p class="fine">${CHECKED}에 주일본 대한민국 대사관·외교부·일본정부관광국(JNTO)·도쿄도 공식 누리집에서 확인한 번호예요. 출발 전에 외교부 해외안전여행 누리집에서 한 번 더 확인해 주세요. 한국 휴대폰 로밍으로 걸면 국제전화 요금이 나와요.</p>
    </div>
    <div class="box" id="soshotel"><h2>숙소 일본어 카드<small>택시·길 묻기</small></h2>
      <div class="soscard"><p class="sosja">この住所に行きたいです</p><b>${esc(hc.name || '숙소 이름을 넣어 주세요')}</b>${hc.addr ? `<span>${esc(hc.addr)}</span>` : ''}${hc.tel ? `<span>TEL ${esc(hc.tel)}</span>` : ''}</div>
      <div class="pfoot"><button type="button" class="primary small" data-act="sbig" data-v="hotel">크게 보여 주기</button>${hc.mapUrl ? `<a class="link" href="${esc(hc.mapUrl)}" target="_blank" rel="noopener">지도 ↗</a>` : ''}</div>
      <label for="sfname">숙소 이름 (일본어면 더 좋아요)<input id="sfname" type="text" maxlength="80" data-sf="hname" value="${esc(sf.hname || '')}" placeholder="${esc(hc.name || '예: ホテル○○新宿')}"></label>
      <label for="sfaddr">주소 (예약 확인서의 일본어 주소를 붙여 넣기)<input id="sfaddr" type="text" maxlength="120" data-sf="addr" value="${esc(sf.addr || '')}" placeholder="예: 東京都新宿区…"></label>
      <label for="sftel">숙소 전화<input id="sftel" type="tel" maxlength="30" data-sf="tel" value="${esc(sf.tel || '')}" placeholder="예: 03-1234-5678"></label>
      <p class="fine">함께 짜는 여행이면 가족 모두의 화면에 같이 보여요.</p>
    </div>
    ${kids ? `<div class="box"><h2>아이를 잃어버렸을 때</h2>
      <p class="pnote">${esc(LOST[LOST.length - 1].d)}</p>
      <label for="sfmeet">만날 장소 (가족이 미리 정해 두기)<input id="sfmeet" type="text" maxlength="80" data-sf="meet" value="${esc(sf.meet || '')}" placeholder="예: 신주쿠역 동쪽 출구 알타 앞"></label>
      <label for="sfphone">부모 연락처 (이 기기에만 저장)<input id="sfphone" type="tel" maxlength="30" data-sphone value="${esc(s.sphone || '')}" placeholder="예: +82-10-…"></label>
      <div class="soscard"><p class="sosja">${esc(kidCardJa(s.sphone, hc.name)).replace(/\n/g, '<br>')}</p></div>
      <div class="pfoot"><button type="button" class="ghost small" data-act="sbig" data-v="kid">아이 카드 크게 보기</button></div>
      <p class="fine">이 카드를 캡처해 아이 휴대폰 배경으로 두거나, 종이에 적어 아이 주머니에 넣어 주세요.</p>
    </div>` : ''}
    <div class="box"><h2>보여 주는 일본어<small>누르면 크게</small></h2>
      <ul class="sosphr">${PHRASES.map((p, i) => `<li><button type="button" data-act="sbig" data-v="p${i}"><b>${esc(p.ja)}</b><span>${esc(p.ko)} · ${esc(p.read)}</span></button></li>`).join('')}</ul>
    </div>
    <div class="box"><h2>지진이 나면</h2>
      <ol class="sosq">${QUAKE.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <p class="fine">출발 전에 일본 관광청이 감수한 'Safety tips' 앱(한국어, 지진·쓰나미·기상 경보)을 설치해 두면 좋아요.</p>
    </div>
    <div class="box"><h2>잃어버렸을 때</h2>
      <ul class="soslist">${LOST.slice(0, -1).map(x => `<li><div class="sbody"><b>${esc(x.t)}</b><span>${esc(x.d)}</span></div></li>`).join('')}</ul>
    </div>
    <div class="box"><h2>${esc(EMBASSY.name)}</h2>
      <p class="pnote">${esc(EMBASSY.ja)}<br>〒${esc(EMBASSY.zip)} ${esc(EMBASSY.addr)}</p>
      <div class="pfoot"><a class="link" href="${esc(gmap(EMBASSY.addr))}" target="_blank" rel="noopener">지도 ↗</a></div>
    </div>
    ${sosBig(s)}
  </section>`;
}

/* 오늘 하루 (여행 중 앱을 열면 먼저 보이는 화면. 단계 밖) */
function todayVaultCard(it){
  const k = kindOf(it.kind); const link = safeHttpsUrl(it.link);
  return `<article class="vcard">
    <div class="vhead"><span class="vicon" aria-hidden="true">${k.icon}</span><div><h3>${esc(it.title)}</h3><p class="meta">${esc(k.label)}${it.time ? ' · ' + esc(it.time) : ''}</p></div></div>
    ${it.code ? `<div class="vcode"><span>예약번호</span><b>${esc(it.code)}</b><button type="button" class="link" data-act="vcopy" data-v="${esc(it.id)}">복사</button></div>` : ''}
    ${(it.files || []).length ? `<div class="vfiles">${it.files.map(f => /^image\//.test(f.type)
      ? `<button type="button" class="vthumb" data-act="vview" data-v="${esc(it.id)}|${esc(f.fid)}" aria-label="${esc(f.name)} 크게 보기"><img data-fid="${esc(f.fid)}" alt=""></button>`
      : `<button type="button" class="vpdf" data-act="vview" data-v="${esc(it.id)}|${esc(f.fid)}">📄 ${esc(f.name)}</button>`).join('')}</div>` : ''}
    ${link ? `<a class="link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">예약 페이지 ↗</a>` : ''}
  </article>`;
}

function todayWeatherLine(w){
  if(!w) return '';
  const t = w.kind === 'forecast'
    ? [w.text, w.hi != null ? `낮 ${Math.round(w.hi)}° / 아침 ${Math.round(w.lo)}°` : '', w.rain != null ? `비 올 확률 ${w.rain}%` : ''].filter(Boolean).join(' · ')
    : [`이맘때 평균 낮 ${Math.round(w.hi)}° / 아침 ${Math.round(w.lo)}°`, w.rainPct != null ? `비 온 날 ${w.rainPct}%` : ''].filter(Boolean).join(' · ');
  return `<p class="twx">${w.kind === 'forecast' ? '예보' : '평년'} · ${esc(t)}${w.kind === 'climate' && w.mean != null ? `<span class="fine">${esc(clothesTip(w.mean))}</span>` : ''}</p>`;
}

export function vToday(s){
  const sh = s.sh || {}; const today = sh.today || '';
  const ph = phaseOf(s, today);
  if(ph.phase === 'none') return `<section class="step">
    <p class="eyebrow">오늘 하루</p><h1>오늘 하루</h1>
    <div class="box tip"><p>여행 날짜를 정하면 그날의 일정·다음 장소·꺼낼 예약·쓴 돈을 한 화면에 모아 보여 줘요. 여행 중에는 앱을 열면 이 화면이 먼저 떠요.</p><div><button type="button" class="ghost small" data-act="go" data-v="1">날짜 정하러 가기</button></div></div>
  </section>`;
  const P = plan(s); const n = P.days.length;
  const i = dayToShow(s, today, s.tday, n); const d = P.days[i]; const date = shownDate(s, today);
  const col = DAY_COLORS[i % DAY_COLORS.length]; const hotel = P.hotel;
  const stops = d.items; const nx = nextStopIndex(stops, date, s.tdone);
  const isDone = p => !!(s.tdone || {})[doneKey(date, p.id)];
  const vault = dayVault(s.vault, date, stops.map(p => p.id).concat(d.full ? [d.full.id] : []));
  const L = ledgerSummary(s); const g = L.groups.find(x => x.d === date);
  const closed = p => p.closed && p.closed.includes(d.wd);

  let next;
  if(d.full) next = `<div class="tnext" style="--day:${col}">
      <span class="fine">하루 종일</span><b>${esc(d.full.name)}</b><span class="meta">${esc(d.full.note || '')}</span>
      ${(d.wd === 0 || d.wd === 6) ? '<p class="warnline">주말이라 많이 붐벼요. 문 여는 시간보다 일찍 가면 좋아요.</p>' : ''}
      <a class="primary tgo" href="${esc(gdir(hotel, d.full))}" target="_blank" rel="noopener">숙소에서 길찾기 ↗</a>
    </div>`;
  else if(stops.length && nx >= 0){ const p = stops[nx];
    next = `<div class="tnext" style="--day:${col}">
      <span class="fine">다음 장소 · ${nx + 1}/${stops.length}</span><b>${esc(p.name)}</b>
      <span class="meta">${esc(AREAS[p.area].name)} · 약 ${p.hours}시간${closed(p) ? ' · <span class="closed">이날 휴무예요</span>' : ''}</span>
      ${p.note ? `<p class="pnote">${esc(p.note)}</p>` : ''}
      <a class="primary tgo" href="${esc(gdir(fromFor(stops, nx, hotel), p))}" target="_blank" rel="noopener">${nx ? '앞 장소에서' : '숙소에서'} 길찾기 ↗</a>
      <button type="button" class="ghost small" data-act="tdone" data-v="${esc(p.id)}">다녀왔어요</button>
    </div>`; }
  else if(stops.length) next = `<div class="tnext" style="--day:${col}">
      <span class="fine">이날 일정 끝</span><b>숙소로 돌아가요</b><span class="meta">${esc(hotel.name)}</span>
      <a class="primary tgo" href="${esc(gdir(stops[stops.length - 1], hotel))}" target="_blank" rel="noopener">숙소로 길찾기 ↗</a>
    </div>`;
  else next = `<p class="empty">${d.kind === 'arrive' ? '도착해서 짐 풀고 숙소 근처를 가볍게 걷기 좋은 날이에요.' : d.kind === 'depart' ? '공항 가기 전 숙소 근처에서 가볍게 보내는 날이에요.' : '이날은 정한 곳이 없어요. 쉬어 가거나 일정 단계에서 장소를 옮겨 보세요.'}</p>`;

  return `<section class="step today">
    <p class="eyebrow">오늘 하루</p>
    <header class="thead">${badge(i)}<div><h1>${i + 1}일차 · ${esc(d.label)}</h1><p class="lead">${esc(phaseText(ph, i))}</p></div></header>
    <div class="scroller" role="group" aria-label="날짜 고르기">${P.days.map(x => `<button type="button" class="chip" data-act="tday" data-v="${x.i}" aria-pressed="${x.i === i}">${x.i + 1}일차${x.i === ph.index ? ' · 오늘' : ''}</button>`).join('')}</div>
    ${todayWeatherLine(dayWeather(s.wx, date))}
    ${ph.phase === 'before' ? (pv => pv.total ? `<p class="fine">준비물 ${pv.done}/${pv.total}개 챙김 · <button type="button" class="link" data-act="go" data-v="${STEP('준비물')}">준비물 보기</button></p>`
      : `<p class="fine">출발 전에 <button type="button" class="link" data-act="go" data-v="${STEP('준비물')}">준비물 체크리스트</button>를 만들어 두세요.</p>`)(packView(s.pack, 'all')) : ''}
    ${next}
    ${rainBox(s, P, d)}
    ${stops.length ? `<div class="box"><h2>이날 동선<small>${stops.filter(isDone).length}/${stops.length}곳 다녀옴</small></h2>
      <ol class="stops tstops" style="--day:${col}">
        <li><span class="num" aria-hidden="true">⌂</span><div class="sbody"><b>${esc(hotel.name)}</b><span>숙소에서 출발</span></div></li>
        ${stops.map((p, j) => `<li class="${isDone(p) ? 'done' : ''}${j === nx ? ' nx' : ''}"><span class="num">${j + 1}</span>
          <div class="sbody"><b>${esc(p.name)}</b><span>약 ${p.hours}시간${closed(p) ? ' · <span class="closed">이날 휴무예요</span>' : ''}</span>
            <a class="link" href="${esc(gdir(fromFor(stops, j, hotel), p))}" target="_blank" rel="noopener">${j ? '앞 장소에서' : '숙소에서'} 길찾기 ↗</a></div>
          <button type="button" class="tchk" data-act="tdone" data-v="${esc(p.id)}" aria-pressed="${isDone(p)}" aria-label="${esc(p.name)} 다녀옴">✓</button></li>`).join('')}
        <li><span class="num" aria-hidden="true">⌂</span><div class="sbody"><b>숙소로 돌아가기</b><a class="link" href="${esc(gdir(stops[stops.length - 1], hotel))}" target="_blank" rel="noopener">마지막 장소에서 길찾기 ↗</a></div></li>
      </ol></div>` : ''}
    ${foodBox(s, d, hotel)}
    ${vault.length ? `<h2 class="vday">이날 꺼낼 예약<small>${vault.length}건</small></h2><div class="list">${vault.map(todayVaultCard).join('')}</div>`
      : `<p class="fine">이날 날짜로 넣은 예약이 없어요. 입장권·QR은 <button type="button" class="link" data-act="go" data-v="${STEP('보관함')}">보관함</button>에 날짜를 넣어 두면 여기에 떠요.</p>`}
    <form class="box" id="ledgerform" autocomplete="off">
      <h2>이날 쓴 돈<small>${g ? lmoney(g.total, L.base) : '아직 없음'}</small></h2>
      ${(bv => bv.on && bv.level !== 'over' && bv.phase === 'during' && date === today && bv.perDay > 0 ? `<p class="fine">${bv.todayLeft >= 0 ? `오늘 쓸 수 있는 돈 <b>${manwon(bv.todayLeft)}</b> 남았어요` : `오늘은 하루 몫보다 ${manwon(-bv.todayLeft)} 더 썼어요`} (하루 ${manwon(bv.perDay)})</p>` : '')(budgetView(s, today))}
      ${g ? `<ul class="tspend">${g.items.map(e => `<li><span>${catOf(e.cat).icon} ${esc(e.what || catOf(e.cat).label)}</span><b>${lmoney(e.amt, e.cur)}</b></li>`).join('')}</ul>` : ''}
      <div class="lline"><input id="lline" type="text" maxlength="120" enterkeyhint="done" placeholder="예: 라멘 1200엔" aria-label="이날 쓴 돈 한 줄로 적기" aria-describedby="lprev"><button type="submit" class="primary small">적기</button></div>
      <p id="lprev" class="fine" aria-live="polite">${esc(ledgerHint(s, { today:date, cur:s.country === 'jp' ? 'JPY' : 'KRW' }))}</p>
      ${sh.lmsg ? `<p class="lmsg${sh.lerr ? ' bad' : ''}" role="status">${esc(sh.lmsg)}${sh.lundo && (s.spend || {})[sh.lundo] ? ' <button type="button" class="link" data-act="lundo">되돌리기</button>' : ''}</p>` : ''}
    </form>
    <div class="pfoot"><button type="button" class="ghost small" data-act="go" data-v="${STEP('일정')}">전체 일정</button><button type="button" class="ghost small" data-act="go" data-v="${STEP('준비물')}">준비물</button><button type="button" class="ghost small" data-act="go" data-v="${STEP('보관함')}">보관함</button><button type="button" class="ghost small" data-act="go" data-v="${STEP('가계부')}">가계부·정산</button><button type="button" class="ghost small" data-act="sos">긴급 정보</button></div>
  </section>`;
}

export const VIEWS = [vWho, vWhere, vMust, vPick, vStay, vPlan, vPack, vVault, vLedger];
