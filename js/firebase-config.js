// Firebase 웹 앱 설정 (콘솔: 프로젝트 tripnoseon → 앱 tripnoseon-web).
// 이 값은 비밀이 아니라 프로젝트를 가리키는 공개 주소예요(구글 문서도 웹페이지에 그대로 넣도록 안내).
// 실제 보안은 Firebase 로그인(구글)과 Firestore 접근 규칙(firestore.rules)이 맡음.
// 라쿠텐 키처럼 사용자 비밀 키는 여기에 넣지 않음.
export const firebaseConfig = {
  apiKey: 'AIzaSyBNlR7pO9XzgaFVr6a7PEJUoA62uGI5jwQ',
  authDomain: 'tripnoseon.firebaseapp.com',
  projectId: 'tripnoseon',
  storageBucket: 'tripnoseon.firebasestorage.app',
  messagingSenderId: '780359964273',
  appId: '1:780359964273:web:cba8dbeaca7f26f1016dd0'
};
