// ⭐ 내 구글 지도에 저장 (js/gsave.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone, plan } from '../js/logic.js';
import { gsaveUrl, gsaveList, isSaved, hotelKey, cleanGsaved } from '../js/gsave.js';
import { prepTasks } from '../js/prep.js';
import { cleanShared, SHARED_KEYS } from '../js/sharecore.js';

test('저장 주소: 장소 ID > 구글 링크 > 확인한 검색어 > 좌표 근처 이름', async () => {
  await D.loadRegion('hksz');
  try{
    const p = D.PLACES.find(x => x.mapq);
    assert.equal(gsaveUrl(p), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.mapq)}`);   // 지도 링크와 같은 검색어
    const q = D.PLACES.find(x => !x.mapq && !x.gid && x.addr);
    const w = new URL(gsaveUrl(D.PLACES.find(x => x.id === 'sz_window')));   // 검색어로는 매표소가 열려서 장소 ID로 (실제 폰에서 확인)
    assert.equal(w.searchParams.get('query_place_id'), 'ChIJ____7_PxAzQRBuBr2pNmuIU');
    assert.ok(D.PLACES.filter(x => x.gid).every(x => /^ChIJ[\w-]{20,}$/.test(x.gid)));
    assert.ok(gsaveUrl(q).endsWith(encodeURIComponent(q.addr)));
    const g = { id:'c1', name:'딤딤섬', gid:'ChIJabc', custom:true, lat:22.3, lng:114.17 };
    const u = new URL(gsaveUrl(g));
    assert.equal(u.searchParams.get('query_place_id'), 'ChIJabc');
    assert.equal(gsaveUrl({ id:'c2', name:'가게', custom:true, url:'https://maps.app.goo.gl/xyz' }), 'https://maps.app.goo.gl/xyz');
    assert.equal(gsaveUrl({ id:'c3', name:'가게', custom:true, url:'javascript:alert(1)', lat:22.3, lng:114.17 }),
      `https://www.google.com/maps/search/${encodeURIComponent('가게')}/@22.30000,114.17000,17z`);   // 이상한 링크는 안 씀
    assert.equal(gsaveUrl({ id:'c4', name:'대략 위치', custom:true, approx:true, lat:22.3, lng:114.17 }), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('대략 위치')}`);
    assert.ok(gsaveUrl({ id:'h', name:'호텔 A', lat:22.29, lng:114.17 }, true).includes('/@22.29000,114.17000,17z'));   // 숙소는 이름 + 좌표
  } finally { D.useRegion('tokyo'); }
});

test('저장 목록: 숙소 먼저, 날짜순, 못 넣은 곳 끝, 저장한 수', async () => {
  await D.loadRegion('hksz');
  try{
    const ids = D.PLACES.filter(p => !p.full && p.area === 'tst').slice(0, 3).map(p => p.id);
    const s = Object.assign(clone(D.DEFAULT), { city:'hksz', country:'hk', start:'2026-12-20', end:'2026-12-22', who:'family', kids:[10],
      picked:Object.fromEntries(ids.map(i => [i, true])), assign:{ [ids[2]]:-1 },
      hotels:[{ id:'ha', name:'호텔 A', lat:22.2975, lng:114.1722, area:'tst' }], hotelPick:'ha' });
    s.gsaved = { [ids[0]]:1, [hotelKey({ id:'ha' })]:2 };
    const P = plan(s); const G = gsaveList(s, P);
    assert.equal(G.rows[0].title, '🏨 숙소');
    assert.deepEqual(G.rows[0].items.map(x => [x.key, x.saved]), [['h:ha', true]]);
    assert.equal(G.rows.at(-1).title, '날짜 안 정한 곳');
    assert.deepEqual(G.rows.at(-1).items.map(x => x.key), [ids[2]]);
    assert.equal(G.total, 4); assert.equal(G.done, 2);
    const keys = G.rows.flatMap(r => r.items.map(x => x.key));
    assert.equal(new Set(keys).size, keys.length);   // 숙소가 여러 날에 나와도 한 번만
    assert.ok(isSaved(s, ids[0]) && !isSaved(s, ids[1]));
    // 할 일: 담은 곳을 모두 저장하면 저절로 체크
    const t = x => prepTasks(x).find(y => y.key === 'gsave');
    assert.ok(t(s) && !t(s).done);
    assert.match(t(s).why, /선전/);
    assert.ok(t(Object.assign({}, s, { gsaved:{ [ids[0]]:1, [ids[1]]:1, [ids[2]]:1 } })).auto);
    assert.ok(!t(Object.assign({}, s, { picked:{}, gsaved:{} })).done);   // 담은 곳이 없으면 체크 안 됨
  } finally { D.useRegion('tokyo'); }
});

test('저장 표시는 이 기기에만: 공유 칸이 아니고 백업 모양은 바로잡음', () => {
  assert.ok(!SHARED_KEYS.includes('gsaved'));
  assert.deepEqual(D.DEFAULT.gsaved, {});
  assert.deepEqual(cleanGsaved({ a:1, b:'x', c:null, d:NaN, ['x'.repeat(90)]:3 }), { a:1 });
  assert.deepEqual(cleanGsaved([1, 2]), {});
  assert.deepEqual(cleanGsaved(null), {});
  const o = { gsaved:{ a:1 } }; cleanShared(o); assert.deepEqual(o.gsaved, { a:1 });   // 공유 정리가 건드리지 않음
});
