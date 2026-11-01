// 오프라인(sw.js): 앱이 불러오는 파일이 SHELL에 다 있어야 인터넷 없이 열림 (빠지면 여행 중 오프라인에서 그 기능만 안 열림)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const shell = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);

test('SHELL에 js 파일이 모두 있고, 없는 파일은 없음', () => {
  const js = readdirSync(new URL('js/', root)).filter(f => f.endsWith('.js')).map(f => 'js/' + f)
    .concat(readdirSync(new URL('js/regions/', root)).filter(f => f.endsWith('.js')).map(f => 'js/regions/' + f));
  js.forEach(f => assert.ok(shell.includes(f), `sw.js SHELL에 ${f}가 없어요`));
  shell.filter(Boolean).forEach(f => assert.ok(existsSync(new URL(f, root)), `SHELL의 ${f} 파일이 없어요`));
});
