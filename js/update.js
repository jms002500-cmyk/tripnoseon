// 지금 화면에 올라온 앱 버전. sw.js의 CACHE와 늘 같아야 함(tests/sw.test.mjs가 확인): CACHE를 올릴 때 같이 올린다.
// 서버의 sw.js가 이 번호보다 크면 새 버전이 있다는 뜻 → 왼쪽 위 새로고침 버튼이 깜빡임(js/app.js checkUpdate)
export const BUILD = 'tripnoseon-v94';

const buildNo = t => { const m = String(t || '').match(/tripnoseon-v(\d+)/); return m ? +m[1] : 0; };
// 서버 파일 글에서 번호를 읽어 지금보다 새것인지. 서버 쪽이 잠깐 옛 파일을 줘도(반영 지연) 새 버전으로 보지 않음
export const isNewer = (swText, cur = BUILD) => buildNo(swText) > buildNo(cur);
