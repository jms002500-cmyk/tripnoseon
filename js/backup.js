// 백업 내보내기·가져오기. 일정·숙소 후보·가져온 장소·보관함(첨부 포함)을 JSON 파일 하나로.
// 순수 함수(테스트 대상). 파일 저장·IndexedDB 읽기/쓰기는 app.js가 맡음.
// 라쿠텐 키는 사용자가 고를 때만 넣음 (파일이 남에게 가면 키가 새어 나가므로 기본은 뺌).
import { DEFAULT } from './data.js';

export const BACKUP_APP = 'tripnoseon';
export const BACKUP_V = 1;

// 다시 받을 수 있거나 화면에서만 쓰는 칸은 백업에서 뺌
const DROP = ['sh', 'geoBusy', 'hotelBusy', 'rkBusy', 'wxBusy', 'wx', 'fx', 'rk', 'rkOn',
  'impMsg', 'hotelMsg', 'geoErr', 'hotelErr', 'vedit', 'vdraft'];

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

// 파일 내용 → { ok, data } 또는 { ok:false, error }
export function parseBackup(text){
  let d;
  try{ d = JSON.parse(String(text || '')); }catch(e){ return { ok:false, error:'백업 파일을 읽지 못했어요. 트립노선에서 만든 .json 백업 파일인지 확인해 주세요.' }; }
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
    vault:(s.vault || []).length, spend:Object.keys(s.spend || {}).length, files:(d.files || []).length,
    bytes:(d.files || []).reduce((n, f) => n + (f.size || 0), 0),
    shared:!!s.shareId, keys:!!(d.rakuten && d.rakuten.key)
  };
}

// 백업 상태 → 앱 상태 (없는 칸은 기본값, 화면 전용 칸은 비움)
export function restoreState(d){
  const o = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(JSON.stringify(d.state)));
  DROP.forEach(k => { if(k !== 'sh') o[k] = JSON.parse(JSON.stringify(DEFAULT[k] === undefined ? null : DEFAULT[k])); });
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
  return new Blob([bytes], { type:type || 'application/octet-stream' });
}
