// 보관함 첨부 파일(티켓·QR 사진, PDF)을 이 기기 IndexedDB에 저장. 인터넷 없이 열림.
// localStorage는 용량이 작아서(5MB 안팎) 파일은 여기에 둠. 서버로 보내지 않음.
import { fitSize } from './vault.js';

const DB = 'tripnoseon-files', STORE = 'files';
const MAX_SIDE = 2000;            // 사진 긴 쪽 최대 (QR이 뭉개지지 않을 만큼)
const SHRINK_OVER = 1.5 * 1048576; // 이보다 큰 사진만 줄임
export const MAX_FILE = 15 * 1048576;

let dbp = null;
function db(){
  if(dbp) return dbp;
  dbp = new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; fail(r.error); };
  });
  return dbp;
}
function tx(mode, fn){
  return db().then(d => new Promise((ok, fail) => {
    const t = d.transaction(STORE, mode); const st = t.objectStore(STORE); const req = fn(st);
    t.oncomplete = () => ok(req && req.result); t.onerror = () => fail(t.error); t.onabort = () => fail(t.error);
  }));
}

export async function putFile(fid, rec){ await tx('readwrite', st => st.put(rec, fid)); }
export function getFile(fid){ return tx('readonly', st => st.get(fid)); }
export async function delFile(fid){ await tx('readwrite', st => st.delete(fid)); }

// 큰 사진은 긴 쪽 2000px로 줄여 저장 (PNG 캡처는 PNG 그대로 — QR 가장자리가 흐려지지 않게)
export async function shrinkImage(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= SHRINK_OVER) return file;
  try{
    const bmp = await createImageBitmap(file);
    const { w, h } = fitSize(bmp.width, bmp.height, MAX_SIDE);
    if(w === bmp.width && h === bmp.height && file.size <= MAX_FILE) return file;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => c.toBlob(r, type, 0.88));
    return blob && blob.size < file.size ? blob : file;
  }catch(e){ return file; }
}

// 브라우저가 저장 공간을 마음대로 비우지 않게 요청 (지원하는 곳만)
export async function keepStorage(){
  try{ if(navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); }catch(e){}
  return false;
}
export async function usage(){
  try{ if(navigator.storage && navigator.storage.estimate){ const e = await navigator.storage.estimate(); return e.usage || 0; } }catch(e){}
  return 0;
}
