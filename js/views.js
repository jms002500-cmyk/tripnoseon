// 단계별 화면. 각 함수는 상태(s)를 받아 HTML 문자열을 돌려줌.
// 버튼은 data-act / data-v, 입력은 data-kid / data-date / data-full / data-move 로 app.js가 처리.
import { AREAS, PLACES, WHO, STYLES, PACE, DAY_COLORS, CURRENCY, KINDS } from './data.js';
import { parseDate, buildDays, kindLabel, fitScore, fullAssign, capacity, rankAreas, plan, allPlaces, pickedPlaces, closedText, compareHotels, nights, avgToPicks } from './logic.js';
import { partyNote, RK_RADIUS } from './rakuten.js';
import { clothesTip } from './weather.js';
import { SITES, siteUrl, priceOptions } from './prices.js';
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
      <h2>지도에서 찾아 담기</h2>
      <p class="fine">지도에서 이름으로 찾거나 원하는 자리를 눌러 바로 담아요. 목록에 없는 식당·가게도 담을 수 있어요.</p>
      <div><button type="button" class="primary small" data-act="mapopen">지도 열기</button></div>
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

function hotelCard(r, i, s, c){
  const h = r.h; const on = s.hotelPick === h.id;
  const book = safeHttpsUrl(h.bookUrl); const map = safeMapUrl(h.mapUrl);
  const where = h.approx ? ' 근처 · 위치 대략' : h.src === 'geo' ? ' · 이름으로 찾은 위치' : '';
  return `<article class="acard hcard${i === 0 ? ' top' : ''}${on ? ' on' : ''}">
    <div class="ahead"><span class="rank">${i+1}</span><div><h3>${esc(h.name)}</h3><p class="ja">${esc(r.a.name)}${where}</p></div></div>
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
    <div class="sbody"><b>${esc(h.name)}</b><span>${st}</span></div>
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
          <div class="sbody"><b>${esc(it.name)}</b><span>${it.station ? esc(it.station) + '역 · ' : ''}${it.review ? `★${it.review.toFixed(1)} (${it.reviewCount}) · ` : ''}${avg != null ? `담은 곳까지 평균 ${avg.toFixed(1)}km` : ''}</span>
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
      <p class="fine">숙소 이름은 라쿠텐에 나온 일본어 그대로예요. 실제 요금은 예약 페이지에서 꼭 다시 확인해 주세요.</p>
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
    ${mapSVG('plan', s, P)}
    ${P.days.map(d => { const col = DAY_COLORS[d.i % DAY_COLORS.length]; const pct = d.cap ? Math.min(100, d.used / d.cap * 100) : 0;
      const body = d.full
        ? `<div class="fullday"><b>${esc(d.full.name)}</b><span>하루 종일 · ${esc(d.full.note || '')}</span><a class="link" href="${esc(gdir(P.hotel, d.full))}" target="_blank" rel="noopener">숙소에서 길찾기 ↗</a>${(d.wd === 0 || d.wd === 6) ? '<p class="warnline">주말이라 많이 붐벼요. 평일로 옮길 수 있으면 옮겨 보세요.</p>' : ''}</div>`
        : d.items.length
          ? `<ol class="stops">${d.items.map((p, j) => { const cl = p.closed && p.closed.includes(d.wd);
              const prev = j ? d.items[j-1] : P.hotel;
              return `<li><span class="num">${j+1}</span><div class="sbody"><b>${esc(p.name)}</b><span>${esc(AREAS[p.area].name)} · 약 ${p.hours}시간${cl ? ` · <span class="closed">이날 휴무예요</span>` : ''}</span><a class="link" href="${esc(gdir(prev, p))}" target="_blank" rel="noopener">${j ? '앞 장소에서' : '숙소에서'} 길찾기 ↗</a></div>${moveSelect(p, P.days, s.assign[p.id])}</li>`; }).join('')}</ol>`
          : `<p class="empty">${d.kind === 'arrive' ? '도착해서 짐 풀고 숙소 근처를 가볍게 걷기 좋은 날이에요.' : d.kind === 'depart' ? '공항 가기 전 숙소 근처에서 가볍게 보내는 날이에요.' : '아직 비어 있어요. 장소를 더 담거나 쉬는 날로 두세요.'}</p>`;
      return `<article class="day" style="--day:${col}">
        <header>${badge(d.i)}<div><h3>${d.i+1}일차 · ${d.label}</h3><p>${kindLabel(d.kind)} · ${d.full ? '하루 종일' : `${d.used}시간 / 약 ${d.cap}시간`}</p></div></header>
        ${body}
        ${d.full ? '' : `<div class="meter${d.used > d.cap ? ' over' : ''}"><span style="width:${pct}%"></span></div>`}
      </article>`; }).join('')}
    ${P.unassigned.length ? `<div class="box"><h2>아직 일정에 못 넣은 곳</h2><ol class="stops">${P.unassigned.map(u => `<li><span class="num" style="--day:var(--muted)">·</span><div class="sbody"><b>${esc(u.p.name)}</b><span>${esc(u.why)}</span></div>${u.p.full ? '' : moveSelect(u.p, P.days, s.assign[u.p.id])}</li>`).join('')}</ol></div>` : ''}
    ${anyItems ? '' : '<p class="empty">담은 장소가 없어요. 장소 담기 단계에서 몇 곳을 담아 주세요.</p>'}
    <div class="box"><h2>다음에 붙일 기능</h2><p class="pnote">동선 위에서 점심·저녁 식당 찾기, 날짜별 이동 경로와 교통패스 계산, 실제 호텔 가격 비교를 하나씩 붙여 갈 거예요.</p></div>
  </section>`;
}

export const VIEWS = [vWho, vWhere, vMust, vPick, vStay, vPlan];
