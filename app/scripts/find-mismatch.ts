import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alignChars, splitSyllables, isHan } from '../src/lib/pinyin';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'Doc', 'Markdown');

type Item = { file: string; zh: string; pinyin: string };
const items: Item[] = [];

function collect(file: string, text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const body = lines.slice(1).join('\n');
  const parts = body.split(/^## /m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl).trim();
    const sec = p.slice(nl + 1).replace(/\n---\s*$/m, '').trim();
    if (head.startsWith('本文')) {
      for (const g of sec.split(/\n\s*\n/)) {
        const l = g.split('\n').map(x => x.trim()).filter(Boolean);
        if (l.length >= 3) items.push({ file, zh: l[0], pinyin: l[1] });
      }
    } else if (head.startsWith('应用会话')) {
      const bl = sec.split('\n');
      for (let i = 0; i < bl.length; i++) {
        const sp = bl[i].match(/^([A-Z]):\s*(.+)$/);
        if (!sp) continue;
        items.push({ file, zh: sp[2].trim(), pinyin: (bl[i + 1] ?? '').trim() });
        i += 2;
      }
    }
  }
}

for (let vol = 1; vol <= 8; vol++) {
  const dir = join(SRC, `vol${vol}`);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    collect(f, readFileSync(join(dir, f), 'utf8'));
  }
}

console.log('총 문장 수:', items.length);
let mismatch = 0;
for (const it of items) {
  const r = alignChars(it.zh, it.pinyin);
  if (r === null) {
    mismatch++;
    const han = [...it.zh].filter(isHan).length;
    const syl = splitSyllables(it.pinyin);
    console.log(`\n[불일치] ${it.file}   한자=${han} 음절=${syl.length}`);
    console.log(`  한자: ${it.zh}`);
    console.log(`  병음: ${it.pinyin}`);
  }
}
console.log('\n불일치 문장 수:', mismatch);
