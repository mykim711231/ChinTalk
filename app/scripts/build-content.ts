// Doc/Markdown/vol*/*.md → public/data/lessons-vol{n}.json + lessons-meta.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lesson, Verse, Chunk, DialogSection, LessonMeta } from '../src/types/lesson';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'Doc', 'Markdown');
const OUT = join(ROOT, 'app', 'public', 'data');
mkdirSync(OUT, { recursive: true });

const levelOf = (vol: number) => (Math.ceil(vol / 2) as 1 | 2 | 3 | 4);
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const SPLIT = /／/;

function makeVerse(lessonId: string, zh: string, pinyin: string, ko: string): Verse {
  const z = zh.split(SPLIT), p = pinyin.split(SPLIT), k = ko.split(SPLIT);
  const aligned = z.length > 1 && z.length === p.length && z.length === k.length;
  const chunks: Chunk[] = aligned
    ? z.map((zz, i) => ({ id: `${lessonId}_${sha(zz)}`, zh: zz.trim(), pinyin: p[i].trim(), ko: k[i].trim() }))
    : [{ id: `${lessonId}_${sha(zh)}`, zh: zh.replace(/／/g, ''), pinyin: pinyin.replace(/／/g, ''), ko: ko.replace(/／/g, '') }];
  return { zh: zh.replace(/／/g, ''), pinyin: pinyin.replace(/／/g, ''), ko: ko.replace(/／/g, ''), chunks };
}

function splitSections(body: string) {
  const out: Record<string, string>[] = [];
  const parts = body.split(/^## /m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    out.push({ head: p.slice(0, nl).trim(), body: p.slice(nl + 1).replace(/\n---\s*$/m, '').trim() });
  }
  return out;
}

const rows = (tbl: string) =>
  tbl.split('\n').filter(l => l.trim().startsWith('|') && !/^\|\s*-/.test(l.trim()))
    .slice(1).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

function parseLesson(vol: number, file: string, text: string): Lesson {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const m = lines[0].match(/第.*?课\s*:\s*(\d+)\.\s*(\S+)\s+(.+?)\s*\((.+)\)\s*$/);
  if (!m) throw new Error(`title parse failed: ${file}: ${lines[0]}`);
  const no = parseInt(m[1], 10);
  const id = `v${vol}-${String(no).padStart(2, '0')}`;
  const lesson: Lesson = {
    id, vol, no, level: levelOf(vol), titleZh: m[2], titlePinyin: m[3].trim(), titleKo: m[4],
    text: [], vocab: [], related: [], traps: [], grammar: [], dialogs: [],
  };
  for (const s of splitSections(lines.slice(1).join('\n'))) {
    if (s.head.startsWith('本文')) {
      for (const g of s.body.split(/\n\s*\n/)) {
        const l = g.split('\n').map(x => x.trim()).filter(Boolean);
        if (l.length >= 3) lesson.text.push(makeVerse(id, l[0], l[1], l[2]));
      }
    } else if (s.head.startsWith('主要词汇')) {
      for (const blk of s.body.split(/^### /m).slice(1)) {
        const bl = blk.split('\n');
        const h = bl[0].replace(/^\d+\.\s*/, '').split(/\s+\/\s+/);
        const v = { zh: h[0]?.trim(), pinyin: h[1]?.trim(), pos: (h[2] ?? '').replace(/^\[|\]$/g, ''), ko: h.slice(3).join(' / ').trim() } as Lesson['vocab'][number];
        for (const l of bl.slice(1)) {
          const kv = l.match(/^-\s*(.+?):\s*(.*)$/);
          if (!kv) continue;
          if (kv[1].startsWith('한자')) v.hanjaNote = kv[2];
          else if (kv[1].startsWith('例句')) v.exZh = kv[2];
          else if (kv[1] === 'Pinyin') v.exPinyin = kv[2];
          else if (kv[1].startsWith('번역')) v.exKo = kv[2];
        }
        lesson.vocab.push(v);
      }
    } else if (s.head.startsWith('相关词汇')) {
      for (const blk of s.body.split(/^### /m).slice(1)) {
        const nl = blk.indexOf('\n');
        lesson.related.push({
          title: blk.slice(0, nl).trim(),
          rows: rows(blk.slice(nl + 1)).map(r => ({ zh: r[0], pinyin: r[1], ko: r[2] })),
        });
      }
    } else if (s.head.startsWith('发音陷阱')) {
      lesson.traps = rows(s.body).filter(r => r.length >= 4)
        .map(r => ({ target: r[0], pinyin: r[1], mistake: r[2], correct: r[3] }));
    } else if (s.head.startsWith('语法点')) {
      for (const blk of s.body.split(/^### /m).slice(1)) {
        const bl = blk.split('\n');
        lesson.grammar.push({ title: bl[0].replace(/^\d+\.\s*/, '').trim(), lines: bl.slice(1).map(x => x.replace(/^-\s*/, '').trim()).filter(Boolean) });
      }
    } else if (s.head.startsWith('应用会话')) {
      const d: DialogSection = { title: (s.head.match(/\((.*)\)/)?.[1] ?? '응용 회화'), turns: [] };
      const bl = s.body.split('\n');
      for (let i = 0; i < bl.length; i++) {
        const sp = bl[i].match(/^([A-Z]):\s*(.+)$/);
        if (!sp) continue;
        d.turns.push({ speaker: sp[1], verse: makeVerse(id, sp[2].trim(), (bl[i + 1] ?? '').trim(), (bl[i + 2] ?? '').trim()) });
        i += 2;
      }
      lesson.dialogs.push(d);
    }
  }
  return lesson;
}

const meta: LessonMeta[] = [];
for (let vol = 1; vol <= 8; vol++) {
  const dir = join(SRC, `vol${vol}`);
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  const lessons = files.map(f => parseLesson(vol, f, readFileSync(join(dir, f), 'utf8')));
  writeFileSync(join(OUT, `lessons-vol${vol}.json`), JSON.stringify(lessons));
  for (const l of lessons) meta.push({ id: l.id, vol: l.vol, no: l.no, level: l.level, titleZh: l.titleZh, titlePinyin: l.titlePinyin, titleKo: l.titleKo });
  console.log(`vol${vol}: ${lessons.length} lessons`);
}
writeFileSync(join(OUT, 'lessons-meta.json'), JSON.stringify(meta));
console.log(`meta: ${meta.length}`);
