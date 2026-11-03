// 인터넷 연결 안내 띠. 지하철·데이터 끊긴 곳에서 지금 보는 게 이 기기에 저장된 내용이라는 걸 알려 줌.
// 띠 내용은 순수 함수(테스트 대상). 띠 그리기와 online/offline 이벤트는 app.js.
// 바깥 서버에 물을 때 쓰는 시간 제한 도우미(fetchTimed, withTimeout)도 여기.
//   마지막으로 연결돼 있던 때는 localStorage 'tripnoseon-online-at'(이 기기에만, 백업에 안 들어감)

const pad = n => String(n).padStart(2, '0');

// 마지막 연결 시각을 지금 기준으로 짧게: '방금', '오후 3:12', '어제 오후 3:12', '10/27 오후 3:12'
export function sinceText(at, now){
  if(!at) return '';
  const a = new Date(at), n = new Date(now);
  if(isNaN(a)) return '';
  if(n - a < 60000) return '방금';
  const h = a.getHours(), clock = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(a.getMinutes())}`;
  const day = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(n) - day(a)) / 86400000);
  if(diff === 0) return clock;
  if(diff === 1) return `어제 ${clock}`;
  return `${a.getMonth() + 1}/${a.getDate()} ${clock}`;
}

// 띠에 쓸 내용. online이고 막 다시 연결된 게 아니면 null(띠 숨김)
//   shared: 함께 짜기 여행인지 → 고친 내용이 연결되면 올라간다고 알려 줌
export function netBanner({ online, back, at, now, shared }){
  if(online) return back ? { kind:'back', title:'다시 연결됐어요', text:shared ? '끊긴 동안 고친 내용을 함께 짜기에 올려요.' : '', more:'' } : null;
  const since = sinceText(at, now);
  return {
    kind:'off',
    title:'인터넷이 끊겼어요',
    text:`저장된 내용이에요${since ? ` · 마지막 연결 ${since}` : ''}`,
    // 위에 붙어 다니는 띠라 폰에서 짧게 한 줄, 나머지는 눌러서
    more:[
      '일정·보관함·가계부·긴급 정보는 그대로 쓸 수 있어요.',
      shared ? '고친 내용은 다시 연결되면 가족에게 올라가요. 앱을 닫아도 남아 있어요.' : '',
      '지도·식당 찾기·빈방·날씨 예보는 연결되면 돼요.'
    ].filter(Boolean).join(' ')
  };
}

// 느린 연결에서 '불러오는 중'에 멈추지 않게: 바깥 서버에 물을 때 시간 제한.
//   fetch는 스스로 끝내는 시간이 없어서, 해외 로밍·중국 본토처럼 응답이 안 오는 곳에서는 몇 분씩 기다림.
//   본문까지 다 받은 뒤 같은 모양(Response)으로 돌려줌 → 부르는 쪽은 그대로 res.ok·res.json()·res.text()
//   시간이 지나면 'timeout' 오류(네트워크 오류와 같이 처리하면 됨)
export const NET_WAIT = 15000;
export async function fetchTimed(url, opts, ms){
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const late = new Promise((ok, fail) => { timer = setTimeout(() => { if(ac) ac.abort(); fail(new Error('timeout')); }, ms || NET_WAIT); });
  try{
    return await Promise.race([late, (async () => {
      const res = await fetch(url, Object.assign({}, opts, ac ? { signal:ac.signal } : {}));
      const body = await res.text();
      return new Response([101, 204, 205, 304].includes(res.status) ? null : body, { status:res.status, statusText:res.statusText, headers:res.headers });
    })()]);
  }finally{ clearTimeout(timer); }
}

// 끊을 수 없는 기다림(스크립트·모듈 불러오기, 구글 장소 검색)에 시간 제한. 늦으면 Error('timeout')
export function withTimeout(p, ms){
  let timer;
  const late = new Promise((ok, fail) => { timer = setTimeout(() => fail(new Error('timeout')), ms || NET_WAIT); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(timer));
}
