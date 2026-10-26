// 함께 짜기: Firebase(구글 로그인 + Firestore) 연결. 계산은 sharecore.js, 이 파일은 네트워크만.
// Firebase는 '함께 짜기'를 열거나 공유 여행이 있을 때만 불러옴 (혼자 쓰는 사람은 아무것도 안 받음).
// 접근 규칙은 firestore.rules (참여자만 읽고 고침).
import { firebaseConfig } from './firebase-config.js';
import { DELETE } from './sharecore.js';

const V = '12.19.0';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
let F = null;          // { app, auth, db, fa (auth 모듈), fs (firestore 모듈) }
let loading = null;

export function load(){
  if(F) return Promise.resolve(F);
  if(loading) return loading;
  loading = Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`)])
    .then(([fapp, fa, fs]) => {
      const app = fapp.initializeApp(firebaseConfig);
      F = { app, auth:fa.getAuth(app), db:fs.getFirestore(app), fa, fs };
      return F;
    })
    .catch(e => { loading = null; throw e; });
  return loading;
}

const tripRef = id => F.fs.doc(F.db, 'trips', id);
const nameOf = u => (u.displayName || '이름 없음').slice(0, 40);

// 로그인 상태가 바뀔 때마다 cb({ uid, name } | null)
export async function watchUser(cb){
  await load();
  try{ await F.fa.getRedirectResult(F.auth); }catch(e){}   // 팝업이 막혀 다른 방식으로 로그인하고 돌아온 경우
  return F.fa.onAuthStateChanged(F.auth, u => cb(u ? { uid:u.uid, name:nameOf(u) } : null));
}

export async function signIn(){
  await load();
  const provider = new F.fa.GoogleAuthProvider();
  provider.setCustomParameters({ prompt:'select_account' });
  try{ await F.fa.signInWithPopup(F.auth, provider); }
  catch(e){
    // 팝업을 막는 브라우저(일부 폰 앱 화면)는 페이지 이동 방식으로
    if(e && /popup-blocked|operation-not-supported|popup-closed-by-user|cancelled-popup/.test(e.code || '')){
      if(/popup-closed-by-user|cancelled-popup/.test(e.code)) return;
      await F.fa.signInWithRedirect(F.auth, provider); return;
    }
    throw e;
  }
}
export async function signOut(){ await load(); await F.fa.signOut(F.auth); }

// sharecore의 [경로, 값] 목록 → updateDoc 인자 (DELETE는 deleteField로)
function toUpdate(changes){
  const o = {};
  changes.forEach(([path, v]) => { o[path] = v === DELETE ? F.fs.deleteField() : v; });
  return o;
}

export async function createTrip(user, title, shared){
  await load();
  const ref = await F.fs.addDoc(F.fs.collection(F.db, 'trips'), {
    ownerUid:user.uid, memberUids:[user.uid], members:{ [user.uid]:{ name:user.name } },
    open:true, title, p:shared, votes:{},
    createdAt:F.fs.serverTimestamp(), updatedAt:F.fs.serverTimestamp(), updatedBy:{ uid:user.uid, name:user.name }
  });
  return ref.id;
}

export async function joinTrip(id, user){
  await load();
  await F.fs.updateDoc(tripRef(id), { memberUids:F.fs.arrayUnion(user.uid), [`members.${user.uid}`]:{ name:user.name } });
}

// 여행 문서 실시간 감시. onData(data | null), onError(code)
export function watchTrip(id, onData, onError){
  return F.fs.onSnapshot(tripRef(id), snap => onData(snap.exists() ? snap.data() : null), e => onError(e && e.code || 'error'));
}

export async function pushChanges(id, user, changes){
  if(!changes.length) return;
  await F.fs.updateDoc(tripRef(id), Object.assign(toUpdate(changes), { updatedAt:F.fs.serverTimestamp(), updatedBy:{ uid:user.uid, name:user.name } }));
}

export async function setVote(id, user, placeId, v){
  await F.fs.updateDoc(tripRef(id), { [`votes.${placeId}.${user.uid}`]:v ? v : F.fs.deleteField() });
}
export async function setTitle(id, title){ await F.fs.updateDoc(tripRef(id), { title }); }
export async function setOpen(id, open){ await F.fs.updateDoc(tripRef(id), { open }); }
export async function removeMember(id, uid){
  await F.fs.updateDoc(tripRef(id), { memberUids:F.fs.arrayRemove(uid), [`members.${uid}`]:F.fs.deleteField() });
}
export async function deleteTrip(id){ await F.fs.deleteDoc(tripRef(id)); }

// 의견: 장소별(placeId) 또는 여행 전체(placeId:null). 최근 300개
export function watchComments(id, cb){
  const q = F.fs.query(F.fs.collection(F.db, 'trips', id, 'comments'), F.fs.orderBy('at', 'asc'), F.fs.limit(300));
  return F.fs.onSnapshot(q, snap => cb(snap.docs.map(d => Object.assign({ id:d.id }, d.data(), { at:tsText(d.get('at')) }))), () => cb([]));
}
export async function addComment(id, user, placeId, text){
  await F.fs.addDoc(F.fs.collection(F.db, 'trips', id, 'comments'), { uid:user.uid, name:user.name, placeId:placeId || null, text:text.slice(0, 500), at:F.fs.serverTimestamp() });
}
export async function deleteComment(id, commentId){ await F.fs.deleteDoc(F.fs.doc(F.db, 'trips', id, 'comments', commentId)); }

// 변경 기록: 최근 30개
export function watchLog(id, cb){
  const q = F.fs.query(F.fs.collection(F.db, 'trips', id, 'log'), F.fs.orderBy('at', 'desc'), F.fs.limit(30));
  return F.fs.onSnapshot(q, snap => cb(snap.docs.map(d => Object.assign({ id:d.id }, d.data(), { at:tsText(d.get('at')) }))), () => cb([]));
}
export async function addLog(id, user, text){
  if(!text) return;
  await F.fs.addDoc(F.fs.collection(F.db, 'trips', id, 'log'), { uid:user.uid, name:user.name, text:text.slice(0, 200), at:F.fs.serverTimestamp() });
}

function tsText(ts){
  if(!ts || !ts.toDate) return '방금';
  const d = ts.toDate(); const p = n => String(n).padStart(2, '0');
  return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
