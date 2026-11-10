// 내 주변 가볼 만한 곳 (js/nearby.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import { clone } from '../js/logic.js';
import { nearbyOf, googleNearUrl, amapNearUrl, nearDirUrl, amapDirUrl, NEAR_STEPS } from '../js/nearby.js';

test('내 주변: 가까운 순, 오늘 쉬는 곳은 뒤, 저녁엔 야경, 범위를 넓혀 3곳 넘게', async () => {
  await D.loadRegion('hksz');
  try{
    const s = Object.assign(clone(D.DEFAULT), { city:'hksz', who:'family', kids:[10], picked:{} });
    const tst = { lat:22.2946, lng:114.1722 };   // 침사추이
    const R = nearbyOf({ places:D.PLACES, eats:D.EATS, s, pt:tst, wd:2, hour:11 });
    assert.ok(R.items.length >= 3 && R.radius <= 2);
    assert.ok(R.items.every(x => x.km <= R.radius));
    const offAt = R.items.findIndex(x => x.off), onAfter = R.items.slice(offAt + 1).some(x => !x.off);
    assert.ok(offAt < 0 || !onAfter);                                   // 화요일에 쉬는 곳(우주박물관)은 맨 뒤
    if(offAt >= 0) assert.equal(R.items[offAt].p.id, 'hk_space');
    assert.ok(R.items.every(x => x.byWalk === (x.km <= 1.5)));
    assert.ok(R.eats.length >= 1 && R.eats.every(e => e.km <= 1));
    // 저녁이면 야경 명소가 앞으로
    const night = nearbyOf({ places:D.PLACES, eats:[], s, pt:tst, wd:1, hour:19 });
    const day = nearbyOf({ places:D.PLACES, eats:[], s, pt:tst, wd:1, hour:10 });
    const pos = (r, f) => r.items.findIndex(f);
    const pd = pos(day, x => x.night);   // 낮엔 야경이 뒤로 가거나 목록에서 빠짐 (v0.84)
    assert.ok(pos(night, x => x.night) >= 0 && (pd < 0 || pos(night, x => x.night) <= pd));
    // 장소가 먼 곳: 범위 밖이면 가장 가까운 몇 곳만, far 표시
    const sea = nearbyOf({ places:D.PLACES, eats:D.EATS, s, pt:{ lat:22.0, lng:113.7 }, wd:1, hour:10 });
    assert.ok(sea.far && sea.radius === null && sea.items.length <= 5 && sea.eats.length === 0);
    assert.deepEqual(NEAR_STEPS, [1, 2, 4]);
    assert.equal(nearbyOf({ places:D.PLACES, pt:null }), null);
    // 같은 장소가 두 번 들어와도 한 번만 (지역 장소 + 직접 담은 곳)
    const dup = nearbyOf({ places:D.PLACES.concat(D.PLACES.slice(0, 3)), eats:[], s, pt:tst, wd:1, hour:10, limit:50 });
    assert.equal(new Set(dup.items.map(x => x.p.id)).size, dup.items.length);
  } finally { D.useRegion('tokyo'); }
});

test('내 주변 지도 링크: 좌표는 링크에만, 가오더는 GPS 좌표 그대로', () => {
  const pt = { lat:22.53331, lng:114.05501 };
  assert.match(googleNearUrl(pt), /^https:\/\/www\.google\.com\/maps\/search\/.+\/@22\.53331,114\.05501,15z$/);
  assert.match(amapNearUrl(pt), /center=114\.05501,22\.53331&coordinate=wgs84/);
  const p = { name:'세계의 창', ja:'世界之窗', lat:22.5362, lng:113.9736 };
  assert.match(nearDirUrl(pt, p, true), /travelmode=walking/); assert.match(nearDirUrl(pt, p, false), /travelmode=transit/);
  assert.match(nearDirUrl(pt, { ...p, mapq:'Window of the World' }, true), /destination=Window%20of%20the%20World/);
  assert.match(amapDirUrl(pt, p, false), /from=114\.05501,22\.53331,.+&to=113\.97360,22\.53620,.+&mode=bus&coordinate=wgs84/);
});
