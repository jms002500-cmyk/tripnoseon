// 백업 내보내기·가져오기. 일정·숙소 후보·가져온 장소·보관함(첨부 포함)을 JSON 파일 하나로.
// 순수 함수(테스트 대상). 파일 저장·IndexedDB 읽기/쓰기는 app.js가 맡음.
// 라쿠텐 키는 사용자가 고를 때만 넣음 (파일이 남에게 가면 키가 새어 나가므로 기본은 뺌).
import { DEFAULT, STEPS } from './data.js';
import { cleanShared } from './sharecore.js';

export const BACKUP_APP = 'tripnoseon';
export const BACKUP_V = 1;

// 다시 받을 수 있거나 화면에서만 쓰는 칸은 백업에서 뺌
const DROP = ['sh', 'geoBusy', 'hotelBusy', 'rkBusy', 'wxBusy', 'wx', 'fx', 'rk', 'rkOn',
  'impMsg', 'hotelMsg', 'geoErr', 'hotelErr', 'vedit', 'vdraft', 'mode', 'tday', 'todayOpened', 'pfilter', 'locOn', 'here', 'hko'];

export function stateForBackup(s){
  const o = JSON.parse(JSON.stringify(s, (k, v) => k === 'sh' ? undefined : v));
  DROP.forEach(k => { delete o[k]; });
  return o;
}

// files: [{ fid, name, type, size, data(base64) }], keys: { appId, key } | null
export function makeBackup(s, files, keys, now){
  const b = { app:BACKUP_APP, v:BACKUP_V, at:(now || new Date()).toISOString(), state:stateForBackup(s), files:files || [] };
  if(keys && keys.appId && keys.key) b.rakuten = { appId:keys.appId, key:keys.key };
  return b;
}

export function backupName(now){
  const d = now || new Date(); const p = n => String(n).padStart(2, '0');
  return `tripnoseon-backup-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

// '__proto__' 칸은 버림: 남이 준 파일로 되돌릴 때 Object.assign이 상태 객체의 프로토타입을 바꾸지 않게
const noProto = (k, v) => k === '__proto__' ? undefined : v;

// 파일 내용 → { ok, data } 또는 { ok:false, error }
export function parseBackup(text){
  let d;
  try{ d = JSON.parse(String(text || ''), noProto); }catch(e){ return { ok:false, error:'백업 파일을 읽지 못했어요. 트립노선에서 만든 .json 백업 파일인지 확인해 주세요.' }; }
  if(!d || d.app !== BACKUP_APP || !d.state || typeof d.state !== 'object') return { ok:false, error:'트립노선 백업 파일이 아니에요.' };
  if(!(d.v >= 1)) return { ok:false, error:'백업 파일 형식을 알 수 없어요.' };
  if(d.v > BACKUP_V) return { ok:false, error:'더 새 버전의 트립노선에서 만든 백업이에요. 앱을 새로 고친 뒤 다시 해 주세요.' };
  if(!Array.isArray(d.files)) d.files = [];
  return { ok:true, data:d };
}

// 되돌리기 전에 보여 줄 요약
export function summarizeBackup(d){
  const s = d.state || {};
  return {
    at:d.at || '', dates:s.start && s.end ? `${s.start} ~ ${s.end}` : '',
    places:Object.keys(s.picked || {}).length, custom:(s.custom || []).length, hotels:(s.hotels || []).length,
    vault:(s.vault || []).length, spend:Object.keys(s.spend || {}).length, pack:Object.values(s.pack || {}).filter(x => x && !x.hide).length, files:(d.files || []).length,
    bytes:(d.files || []).reduce((n, f) => n + (f.size || 0), 0),
    shared:!!s.shareId, keys:!!(d.rakuten && d.rakuten.key)
  };
}

// 백업 상태 → 앱 상태 (없는 칸은 기본값, 화면 전용 칸은 비움)
export function restoreState(d){
  const o = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(JSON.stringify(d.state), noProto));
  DROP.forEach(k => { if(k !== 'sh') o[k] = JSON.parse(JSON.stringify(DEFAULT[k] === undefined ? null : DEFAULT[k])); });
  return cleanBackup(o);
}

// 남이 준 백업 파일일 수도 있어서 모양을 바로잡음: 일정 칸은 공유 여행과 같은 규칙(sharecore cleanShared),
//   이 기기 칸은 목록·글자 모양만. 모양이 틀리면 화면이 멈추거나 남의 HTML이 그려질 수 있음
function cleanBackup(o){
  cleanShared(o);
  if(!(Number.isInteger(o.step) && o.step >= 0 && o.step < STEPS.length)) o.step = 0;
  ['vault', 'imports'].forEach(k => { o[k] = Array.isArray(o[k]) ? o[k].filter(x => x && typeof x === 'object' && !Array.isArray(x)) : []; });
  o.vault.forEach(it => { if(!Array.isArray(it.files)) it.files = []; it.files = it.files.filter(f => f && typeof f === 'object'); });
  ['sphone', 'askNote', 'idLater', 'lastBackup'].forEach(k => { if(typeof o[k] !== 'string') o[k] = DEFAULT[k]; });
  if(!['', 'big', 'bigger'].includes(o.textSize)) o.textSize = '';
  if(!(o.tdone && typeof o.tdone === 'object' && !Array.isArray(o.tdone))) o.tdone = {};
  if(!(typeof o.shareId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(o.shareId))) o.shareId = null;   // 여행 번호 모양(sharecore parseJoin)만
  return o;
}

// Blob ↔ base64 (백업 파일에 첨부를 글자로 넣기)
export async function blobToB64(blob){
  const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = '';
  for(let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function b64ToBlob(b64, type){
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type:safeFileType(type) });
}
// 첨부 종류는 사진·PDF만 그대로. 나머지(text/html, image/svg+xml 등)는 열면 이 앱 주소에서 스크립트가 돌 수 있어서
//   내려받기만 되는 종류로 (남이 준 백업 파일의 첨부를 '크게 보기'로 열 때)
export function safeFileType(type){
  const t = String(type || '').toLowerCase().trim();
  return /^image\/(jpeg|png|gif|webp|heic|heif|avif|bmp)$/.test(t) || t === 'application/pdf' ? t : 'application/octet-stream';
}
