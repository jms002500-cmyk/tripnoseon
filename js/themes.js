// 테마로 골라 보기: 장소 담기 단계의 '테마로 골라 보기' 칩과 목록 거르기(views.js themeBox·vPick). 순수 함수(테스트 대상).
//   장소 데이터에 이미 있는 취향(tags, data.js STYLES)·종류(kind)·실내(indoor)·아이 맞춤(kid)으로만 묶음 — 새 자료를 지어내지 않음
//   한 장소가 여러 테마에 들어갈 수 있음 (예: 야시장 = 쇼핑·시장 + 먹거리 + 밤·야경)
const has = (p, ...t) => (p.tags || []).some(x => t.includes(x));
const is = (p, ...k) => k.includes(p.kind);
const NIGHT = /야시장|야경|밤에|밤까지|저녁에|레이저|夜/;

export const THEMES = [
  { key:'shop', icon:'🛍', label:'쇼핑·시장', test:p => has(p, '쇼핑') || is(p, '쇼핑', '거리·시장') },
  { key:'food', icon:'🍜', label:'먹거리', test:p => has(p, '맛집') || is(p, '먹거리') },
  { key:'kids', icon:'🎢', label:'아이가 신나는 곳', test:p => has(p, '테마파크', '체험') || is(p, '테마파크', '체험·캐릭터', '수족관·동물원') || p.kid === 'kids' },
  { key:'culture', icon:'🏛', label:'문화·역사', test:p => has(p, '문화·역사') || is(p, '박물관·미술관', '신사·절') },
  { key:'nature', icon:'🌳', label:'자연·산책', test:p => has(p, '자연·산책') || is(p, '공원·정원') },
  { key:'night', icon:'🌃', label:'밤·야경', test:p => is(p, '야경·일루미네이션', '전망대') || NIGHT.test(`${p.name || ''} ${p.ja || ''} ${p.note || ''}`) },
  { key:'rain', icon:'☔', label:'비 와도 OK', test:p => p.indoor === true }
];

export const themeOf = key => THEMES.find(t => t.key === key) || null;
// 그 테마에 드는지 ('all'·모르는 키면 다 듦 — 옛 저장값이 남아도 목록이 비지 않게)
export const inTheme = (p, key) => { const t = themeOf(key); return !t || t.test(p); };
// 테마마다 몇 곳인지 → { shop:19, … }
export const themeCounts = places => Object.fromEntries(THEMES.map(t => [t.key, places.filter(t.test).length]));
