import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname ?? '.', '..');
const dict = JSON.parse(readFileSync(join(root, 'public', 'data', 'word-dict.json'), 'utf8')) as Record<string, unknown>;
const isHan = (c: string) => /[\u4e00-\u9fff]/.test(c);

let totalChars = 0;
let missingChars = 0;
const missingSamples: string[] = [];

function check(zh: string, file: string) {
  const chars = [...zh];
  for (let idx = 0; idx < chars.length; idx++) {
    if (!isHan(chars[idx])) continue;
    totalChars++;
    // lookup: 글자를 포함한 최대 8자 부분문자열 중 사전에 있는가
    let found = false;
    for (let len = Math.min(8, chars.length); len >= 1; len--) {
      for (let s = Math.max(0, idx - len + 1); s <= idx && s + len <= chars.length; s++) {
        const w = chars.slice(s, s + len).join('');
        if (dict[w]) { found = true; break; }
      }
      if (found) break;
    }
    if (!found) {
      missingChars++;
      if (missingSamples.length < 20) missingSamples.push(`${file}: '${zh}' [${chars[idx]}]`);
    }
  }
}

for (let vol = 1; vol <= 8; vol++) {
  const lessons = JSON.parse(readFileSync(join(root, 'public', 'data', `lessons-vol${vol}.json`), 'utf8'));
  for (const l of lessons) {
    for (const t of l.text) check(t.zh, `${l.id}`);
    for (const d of l.dialogs) for (const t of d.turns) check(t.verse.zh, `${l.id}`);
  }
}

console.log(`사전 단어 수: ${Object.keys(dict).length}`);
console.log(`총 한자 글자 수: ${totalChars}`);
console.log(`단어장 미보유 글자 수: ${missingChars}`);
console.log('미보유 샘플:');
missingSamples.forEach(s => console.log('  ' + s));
