// 오프라인 지키기: 앱을 처음 열 때 필요한 같은 사이트 파일이 sw.js SHELL에 빠짐없이 있어야 인터넷 없이 열림.
// (예전에 js/guide.js가 SHELL에서 빠진 채로 나가 오프라인에서 앱이 안 열렸음)
// sw.js의 SHELL 배열·CACHE 이름을 그대로 읽고, index.html의 모듈 스크립트와 js/app.js부터 import를 끝까지 따라감.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const sw = read('sw.js');

// 저장소 기준 경로로: './js/a.js' → 'js/a.js', './' → '' (from: 그 경로를 적은 파일)
const rel = (spec, from = '') => {
  const u = new URL(spec, new URL(from, root));
  return decodeURIComponent(u.pathname).slice(decodeURIComponent(root.pathname).length);
};
const local = u => u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith('//') && !u.startsWith('#');
const onDisk = p => existsSync(new URL(p === '' ? 'index.html' : p, root)) && (p === '' || statSync(new URL(p, root)).isFile());

/* ---------- sw.js의 SHELL·CACHE를 글자 그대로 읽기 ---------- */
const shellSrc = sw.match(/const SHELL\s*=\s*(\[[\s\S]*?\]);/);
const cacheSrc = sw.match(/const CACHE\s*=\s*'([^']+)';/);
const SHELL_RAW = shellSrc ? [...vm.runInNewContext(shellSrc[1])] : [];   // vm 쪽 배열을 이쪽 배열로(deepEqual이 다른 realm 배열을 다르게 봄)
const SHELL = SHELL_RAW.map(u => rel(u));
const CACHE = cacheSrc && cacheSrc[1];

test('sw.js에서 SHELL 배열과 CACHE 이름을 읽을 수 있음', () => {
  assert.ok(shellSrc, 'sw.js에 const SHELL = [ … ]; 이 있어야 해요');
  assert.ok(Array.isArray(SHELL_RAW) && SHELL_RAW.length > 10);
  assert.match(CACHE || '', /^tripnoseon-v\d+$/, 'CACHE는 tripnoseon-v<숫자>');
});

test('SHELL 항목은 모두 ./로 시작하는 문자열이고 겹치지 않음', () => {
  SHELL_RAW.forEach(u => assert.ok(typeof u === 'string' && u.startsWith('./'), `SHELL의 ${u}: GitHub Pages 하위 경로에서도 맞게 './'로 시작해야 해요`));
  const dup = SHELL.filter((p, i) => SHELL.indexOf(p) !== i);
  assert.deepEqual(dup, [], `SHELL에 두 번 적힌 항목: ${dup.join(', ')}`);
  assert.ok(!SHELL.includes('sw.js'), 'sw.js 자신은 SHELL에 넣지 않음(브라우저가 따로 새것을 확인)');
});

test('SHELL 항목은 모두 디스크에 있는 파일', () => {
  SHELL.forEach(p => assert.ok(onDisk(p), `SHELL의 ./${p} 파일이 없어요 (설치할 때 addAll이 통째로 실패해 오프라인 사본이 하나도 안 생김)`));
});

/* ---------- 앱이 여는 데 필요한 파일 모으기 ---------- */
// import 문(여러 줄 포함)·export … from·부작용 import·글자 그대로 쓴 동적 import. 따옴표 안 글자는 건너뛰어 문자열 속 'from'에 속지 않게
const IMPORT_RES = [
  /^[ \t]*(?:import|export)\b[^'"`;]*?\bfrom\s*(['"])([^'"]+)\1/gm,
  /^[ \t]*import\s*(['"])([^'"]+)\1/gm,
  /\bimport\s*\(\s*(['"`])([^'"`$]+)\1\s*\)/g
];
function importsOf(src){
  return IMPORT_RES.flatMap(re => [...src.matchAll(re)].map(m => m[2]));
}

const htmlSrc = read('index.html');
const tags = (tag) => [...htmlSrc.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(m => m[0]);
const attr = (t, a) => { const m = t.match(new RegExp(`\\b${a}\\s*=\\s*(["'])([^"']*)\\1`, 'i')); return m ? m[2] : null; };
const moduleRoots = tags('script').filter(t => /type\s*=\s*["']module["']/i.test(t)).map(t => attr(t, 'src')).filter(local).map(u => rel(u));
const preloads = tags('link').filter(t => /rel\s*=\s*["']modulepreload["']/i.test(t)).map(t => attr(t, 'href')).filter(local).map(u => rel(u));

const graph = new Map();   // 파일 → 그 파일이 부르는 같은 사이트 파일
function walk(f){
  if(graph.has(f)) return;
  const deps = [];
  graph.set(f, deps);
  if(!onDisk(f)) return;
  importsOf(read(f)).forEach(sp => {
    if(!local(sp)) return;   // https://… (Firebase SDK 등 다른 사이트) 는 SHELL 대상 아님
    const to = rel(sp, f);
    deps.push(to);
    walk(to);
  });
}
[...moduleRoots, ...preloads, 'js/app.js'].forEach(walk);

const manifestPath = rel(attr(tags('link').find(t => /rel\s*=\s*["']manifest["']/i.test(t)) || '', 'href') || 'manifest.webmanifest');
const manifest = JSON.parse(read(manifestPath));
const manIcons = [
  ...(manifest.icons || []),
  ...(manifest.shortcuts || []).flatMap(s => s.icons || []),
  ...(manifest.screenshots || [])
].map(i => i.src).filter(local).map(u => rel(u, manifestPath));

// index.html의 같은 사이트 link(스타일·아이콘·manifest)와 script
const htmlRefs = [
  ...tags('link').map(t => attr(t, 'href')),
  ...tags('script').map(t => attr(t, 'src')),
  ...tags('img').map(t => attr(t, 'src'))
].filter(local).map(u => rel(u));

const cssFiles = readdirSync(new URL('css/', root)).filter(f => !f.startsWith('.')).map(f => 'css/' + f);
const cssRefs = cssFiles.filter(f => f.endsWith('.css')).flatMap(f =>
  [...read(f).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g), ...read(f).matchAll(/@import\s+(['"])([^'"]+)\1/g)]
    .map(m => m[2]).filter(u => local(u) && !u.startsWith('data:')).map(u => rel(u, f)));

const NEED = new Map();   // 파일 → 왜 필요한지
const need = (p, why) => { if(!NEED.has(p)) NEED.set(p, why); };
need('', '시작 주소(start_url·share_target)');
need('index.html', '화면이 없을 때 대신 여는 사본');
need(manifestPath, 'index.html의 manifest');
need(rel(manifest.start_url || './', manifestPath), 'manifest start_url');
if(manifest.share_target) need(rel(manifest.share_target.action || './', manifestPath), 'manifest share_target');
htmlRefs.forEach(p => need(p, 'index.html'));
manIcons.forEach(p => need(p, 'manifest 아이콘'));
cssFiles.forEach(p => need(p, 'css/ 폴더'));
cssRefs.forEach(p => need(p, 'css의 url()'));
for(const [f, deps] of graph){ need(f, 'import 시작점'); deps.forEach(d => need(d, `${f}의 import`)); }

test('index.html의 모듈 스크립트와 js/app.js에서 import를 따라감', () => {
  assert.ok(moduleRoots.includes('js/app.js'), 'index.html의 <script type="module" src="js/app.js">');
  assert.ok(graph.size > 40, `따라간 파일이 너무 적어요: ${graph.size}`);
  ['js/views.js', 'js/guide.js', 'js/logic.js', 'js/regions/hksz-guide.js', 'js/regions/hksz-eats.js'].forEach(f => assert.ok(graph.has(f), `${f}까지 따라가야 해요`));
  assert.ok(graph.has('js/regions/hksz-data.js'), '동적 import(홍콩·선전 데이터)도 따라감');
});

test('import로 부르는 파일은 모두 디스크에 있음', () => {
  for(const [f, deps] of graph) deps.forEach(d => assert.ok(onDisk(d), `${f}가 부르는 ${d} 파일이 없어요`));
});

test('앱을 여는 데 필요한 같은 사이트 파일이 모두 SHELL에 있음', () => {
  const missing = [...NEED].filter(([p]) => !SHELL.includes(p)).map(([p, why]) => `./${p} (${why})`);
  assert.deepEqual(missing, [], `sw.js SHELL에 빠진 파일 — 넣고 CACHE 숫자를 올려 주세요:\n  ${missing.join('\n  ')}`);
});

test('SHELL에는 앱이 실제로 쓰는 파일만 (안 쓰는 파일이 남아 있지 않음)', () => {
  const extra = SHELL.filter(p => !NEED.has(p));
  assert.deepEqual(extra, [], `어디서도 부르지 않는데 SHELL에 있는 파일: ${extra.join(', ')}`);
});

test('글자 그대로가 아닌 동적 import는 다른 사이트(https://…)만', () => {
  for(const f of graph.keys()){
    if(!onDisk(f)) continue;
    const src = read(f);
    [...src.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)].map(m => m[1].trim()).forEach(arg => {
      if(/^(['"])[^'"]*\1$/.test(arg)) return;   // 글자 그대로 → 위에서 따라감
      assert.ok(!/^[`'"]\.{1,2}\//.test(arg), `${f}: import(${arg})는 따라갈 수 없어요. 같은 사이트 파일은 글자 그대로 적어 주세요`);
    });
  }
});

test('manifest의 아이콘·index.html의 아이콘 파일이 있음', () => {
  assert.ok(manIcons.length >= 2, 'manifest 아이콘');
  [...manIcons, ...htmlRefs].forEach(p => assert.ok(onDisk(p), `${p} 파일이 없어요`));
  assert.ok(htmlRefs.includes('icons/icon.svg') && htmlRefs.includes('icons/icon-192.png'), 'index.html의 아이콘(icon·apple-touch-icon)');
});
