// 위치 공유 (켜는 사람만). 함께 짜기 여행의 참여자에게만, 여행 마지막 날까지, 앱을 열어 둔 동안만.
// 순수 함수(테스트 대상). 위치 받기(geolocation)·서버 읽기/쓰기는 app.js·share.js.
//   s.locOn: 이 기기에서 내 위치를 보여 주는 중인지 (기기마다, 함께 짜기로 공유 안 함, 백업에서 뺌)
//   서버: trips/{여행}/locs/{uid} = { uid, name, lat, lng, acc, at, until, expireAt }  (firestore.rules: 참여자만 읽고, 자기 것만 씀)
import { dist } from './logic.js';

export const SEND_MOVE_M = 50;       // 이만큼 움직이면 바로 올림
export const SEND_EVERY = 120000;    // 안 움직여도 2분마다 한 번
export const SEND_MIN = 20000;       // 그래도 20초 안에 두 번은 안 올림
export const STALE = 30 * 60000;     // 30분 넘게 안 바뀌면 '오래됨'

// 받은 위치 → 올릴 값. 소수 넷째 자리(약 10m)까지만
export function roundLoc(c){
  if(!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return null;
  const r = v => Math.round(v * 1e4) / 1e4;
  return { lat:r(c.latitude), lng:r(c.longitude), acc:Math.min(5000, Math.max(0, Math.round(c.accuracy || 0))) };
}

// 지금 올릴지: 처음이거나, 50m 넘게 움직였거나, 2분이 지났으면 (20초 안에는 다시 안 올림)
export function shouldSend(last, cur, now){
  if(!cur) return false;
  if(!last) return true;
  const gap = now - last.t;
  if(gap < SEND_MIN) return false;
  return dist(last, cur) * 1000 >= SEND_MOVE_M || gap >= SEND_EVERY;
}

// 내 위치를 보여 줄 수 있는 여행인지: 함께 짜기 여행이고, 날짜가 있고, 마지막 날이 안 지났음
export function canShareLoc(s, today){
  return !!(s && s.shareId && s.end && today && today <= s.end);
}
// 켜 둔 채로 여행이 끝났으면 꺼야 함
export const locExpired = (s, today) => !!(s && s.locOn && s.end && today > s.end);

// 'n분 전'
export function ageText(ms){
  if(!(ms >= 0)) return '';
  const m = Math.floor(ms / 60000);
  if(m < 1) return '방금';
  if(m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if(h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// 서버의 위치 목록 → 화면 목록. 여행이 끝난 것은 뺌, 나는 맨 위, 나머지는 최근 순
//   me: 내 마지막 위치 { lat, lng } (거리 계산용, 없어도 됨)
export function locList(docs, { myUid, today, now, me }){
  return (docs || [])
    .filter(d => d && Number.isFinite(d.lat) && Number.isFinite(d.lng) && (!d.until || !today || d.until >= today))
    .map(d => {
      const age = d.at ? Math.max(0, now - d.at) : null;
      return { uid:d.uid, name:d.name || '이름 없음', lat:d.lat, lng:d.lng, acc:d.acc || 0, mine:d.uid === myUid,
        age, ageText:age == null ? '' : ageText(age), stale:age != null && age > STALE,
        km:me && d.uid !== myUid ? dist(me, d) : null };
    })
    .sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (a.age ?? Infinity) - (b.age ?? Infinity));
}

// 거리 한 줄: '120m', '2.3km'
export const kmText = km => km == null ? '' : km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)}m` : `${km.toFixed(1)}km`;

// 그 사람 위치를 구글 지도로
export const locMapUrl = l => `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
