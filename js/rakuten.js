// 라쿠텐 트래블 빈방 검색 (VacantHotelSearch).
// 키(applicationId + accessKey)는 사용자가 앱에 직접 넣고 그 기기 localStorage에만 둠 — 코드·저장소에 넣지 않음.
// 라쿠텐 앱 등록에서 '허용된 웹사이트'로 지정한 주소(github.io)에서 부를 때만 통과함 (브라우저가 Referer를 붙임).
// 위쪽은 순수 함수(테스트 대상), 맨 아래 vacantSearch만 네트워크를 씀.
import { koHotelName } from './janame.js';

export const RK_URL = 'https://openapi.rakuten.co.jp/engine/api/Travel/VacantHotelSearch/20170426';
export const RK_RADIUS = 3;   // 좌표 검색 반경 최대값(km)
const GAP_MS = 1600;          // 새 API는 1.5초보다 자주 부르면 429가 남

// 아이 나이 → 라쿠텐 인원 구분. 일본 숙소는 학년 기준으로 요금을 나눔.
// 13살 이상은 중학생 이상이라 어른 요금으로 계산
export function partyParams(s){
  const kids = s.who === 'family' ? s.kids : [];
  const p = { adultNum: Math.min(10, Math.max(1, s.who === 'solo' ? 1 : s.adults) + kids.filter(a => a >= 13).length),
    upClassNum: 0, lowClassNum: 0, infantWithoutMBNum: 0 };
  kids.forEach(a => { if(a >= 13) return; if(a >= 10) p.upClassNum++; else if(a >= 6) p.lowClassNum++; else p.infantWithoutMBNum++; });
  return p;
}

// 화면에 보여 줄 인원 설명
export function partyNote(s){
  const p = partyParams(s); const out = [`어른 ${p.adultNum}명`];
  if(p.upClassNum) out.push(`초등 고학년(10~12살) ${p.upClassNum}명`);
  if(p.lowClassNum) out.push(`초등 저학년(6~9살) ${p.lowClassNum}명`);
  if(p.infantWithoutMBNum) out.push(`유아(식사·이불 없음) ${p.infantWithoutMBNum}명`);
  return out.join(', ');
}

// 요청 주소. pt가 있으면 좌표 반경 검색, hotelNos가 있으면 그 숙소들만(최대 15곳) 다시 조회
export function vacantUrl(keys, s, opt){
  const q = new URLSearchParams({ applicationId:keys.appId, accessKey:keys.key, format:'json', formatVersion:'2',
    checkinDate:s.start, checkoutDate:s.end, roomNum:'1', datumType:'1', responseType:'small', searchPattern:'0', hits:'30', sort:'+roomCharge' });
  Object.entries(partyParams(s)).forEach(([k, v]) => { if(v) q.set(k, String(v)); });
  if(opt.hotelNos && opt.hotelNos.length) q.set('hotelNo', opt.hotelNos.slice(0, 15).join(','));
  else { q.set('latitude', opt.pt.lat.toFixed(6)); q.set('longitude', opt.pt.lng.toFixed(6)); q.set('searchRadius', String(RK_RADIUS)); }
  return `${RK_URL}?${q}`;
}

const arr = v => Array.isArray(v) ? v : v == null ? [] : [v];

// 응답 → 숙소 목록. formatVersion 1(hotels[].hotel[])과 2(hotels[][]) 둘 다 받음
//   price: 우리 인원·객실 1개 기준 첫날 1박 요금(플랜 중 가장 싼 것). 플랜 요금이 없으면 숙소 최저가 목안(hotelMinCharge)
export function parseVacant(json){
  return arr(json && json.hotels).map(h => {
    const parts = Array.isArray(h) ? h : arr(h.hotel);
    const basicPart = parts.find(x => x && x.hotelBasicInfo); if(!basicPart) return null;
    const b = basicPart.hotelBasicInfo;
    const rooms = parts.filter(x => x && x.roomInfo).flatMap(x => {
      const ri = arr(x.roomInfo);
      const rb = (ri.find(r => r.roomBasicInfo) || {}).roomBasicInfo || {};
      const dc = (ri.find(r => r.dailyCharge) || {}).dailyCharge || {};
      return dc.total > 0 ? [{ total:+dc.total, planName:rb.planName || '', breakfast:rb.withBreakfastFlag === 1, url:rb.reserveUrl || '' }] : [];
    });
    const best = rooms.reduce((m, r) => (!m || r.total < m.total) ? r : m, null);
    const lat = +b.latitude, lng = +b.longitude; const name = String(b.hotelName || '').slice(0, 80);
    return { hotelNo:String(b.hotelNo), name, ko:koHotelName(name, b.hotelKanaName), station:b.nearestStation || '',
      review:+b.reviewAverage || 0, reviewCount:+b.reviewCount || 0,
      price: best ? best.total : (+b.hotelMinCharge || 0), priceIsPlan: !!best, breakfast: best ? best.breakfast : false,
      lat: Number.isFinite(lat) && lat ? lat : null, lng: Number.isFinite(lng) && lng ? lng : null,
      url: b.planListUrl || b.hotelInformationUrl || '' };
  }).filter(Boolean);
}

// 오류 응답 → 사용자에게 보여 줄 말. 새 형식 {errors:{errorCode,errorMessage}}와 옛 형식 {error,error_description} 둘 다
export function errorText(status, body){
  const e = body && (body.errors || body);
  const code = String((e && (e.errorCode || e.error)) || status);
  const msg = String((e && (e.errorMessage || e.error_description)) || '');
  if(status === 404 || code === 'not_found') return { empty:true, text:'선택한 날짜·인원으로 이 주변에 빈방이 없어요.' };
  if(status === 429 || code === 'too_many_requests') return { text:'라쿠텐에 너무 자주 물어봤어요. 잠시 후 다시 눌러 주세요.' };
  if(/REFERRER|REFERER/i.test(msg + code)) return { text:'라쿠텐이 이 주소에서 온 요청을 막았어요. 라쿠텐 앱 설정의 허용된 웹사이트(Allowed websites)를 확인해 주세요.' };
  if(status === 401 || status === 403 || /accessKey|applicationId|key/i.test(msg)) return { text:'라쿠텐 키가 맞지 않아요. Application ID와 Access Key를 다시 넣어 주세요.' };
  if(status === 400) return { text:'검색 조건이 맞지 않아요. 여행 날짜와 인원을 확인해 주세요.' };
  if(status >= 500) return { text:'라쿠텐 쪽에 문제가 있어요. 잠시 후 다시 눌러 주세요.' };
  return { text:`숙소 가격을 못 불러왔어요 (${code}). 잠시 후 다시 눌러 주세요.` };
}

let last = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

// 실제 요청. 성공하면 { items }, 빈방 없음은 { items:[], empty:true }, 실패는 { error }
export async function vacantSearch(keys, s, opt){
  const now = Date.now(); if(now - last < GAP_MS) await wait(GAP_MS - (now - last)); last = Date.now();
  let res;
  try{ res = await fetch(vacantUrl(keys, s, opt), { headers:{ Accept:'application/json' } }); }
  catch(e){ return { error:'인터넷 연결을 확인하고 다시 눌러 주세요.' }; }
  let body = null; try{ body = await res.json(); }catch(e){}
  if(!res.ok){ const t = errorText(res.status, body); return t.empty ? { items:[], empty:true, text:t.text } : { error:t.text }; }
  return { items: parseVacant(body) };
}
