// 홈 화면 설치 안내. 브라우저마다 설치 메뉴가 달라서, 지금 브라우저에 맞는 한두 줄만 보여 줌.
// 크롬처럼 설치 창을 바로 띄울 수 있으면(beforeinstallprompt) 버튼 하나로. 이미 홈 화면 앱으로 열었으면 안 보임.
// 순수 함수(테스트 대상). 화면·이벤트는 app.js.

// ua: navigator.userAgent, o: { standalone, canPrompt, mobile }
//   → null(안내 안 함) | { kind, steps:[문장…] }
export function installHint(ua, o){
  const u = String(ua || ''); const opt = o || {};
  if(opt.standalone) return null;
  if(/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(u)) return { kind:'inapp', steps:[
    '지금은 앱 안의 브라우저라 홈 화면에 설치할 수 없어요.',
    '오른쪽 위(또는 아래)의 ⋮ 메뉴 → "다른 브라우저로 열기"를 누른 뒤 거기서 설치하세요.'] };
  if(opt.canPrompt) return { kind:'prompt', steps:['버튼 하나로 홈 화면에 앱처럼 설치할 수 있어요. 인터넷이 없어도 열려요.'] };
  if(/iPhone|iPad|iPod/i.test(u)) return { kind:'ios', steps:[
    /CriOS|FxiOS|EdgiOS/i.test(u) ? '아이폰은 사파리에서 설치해야 해요. 이 주소를 사파리로 여세요.' : '아래 가운데 공유 버튼(네모에 위 화살표)을 누르세요.',
    '"홈 화면에 추가" → 오른쪽 위 "추가"를 누르면 돼요.'] };
  if(/SamsungBrowser/i.test(u)) return { kind:'samsung', steps:['아래 ≡ 메뉴 → "현재 페이지 추가" → "홈 화면"을 누르세요.'] };
  if(/Android/i.test(u)) return { kind:'chrome', steps:['오른쪽 위 ⋮ 메뉴 → "홈 화면에 추가"(또는 "앱 설치") → "설치"를 누르세요.'] };
  return opt.mobile ? { kind:'other', steps:['브라우저 메뉴에서 "홈 화면에 추가"를 찾아 누르세요.'] } : null;
}
