// 인터넷 연결 안내 띠. 지하철·데이터 끊긴 곳에서 지금 보는 게 이 기기에 저장된 내용이라는 걸 알려 줌.
// 순수 함수(테스트 대상). 띠 그리기와 online/offline 이벤트는 app.js.
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
