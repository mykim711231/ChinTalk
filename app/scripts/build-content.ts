// Doc/Markdown/vol*/*.md → public/data/lessons-vol{n}.json + lessons-meta.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lesson, Verse, Chunk, DialogSection, LessonMeta } from '../src/types/lesson';
import { splitSyllables } from '../src/lib/pinyin';
import { Jieba } from '@node-rs/jieba';
import { dict as jiebaDict } from '@node-rs/jieba/dict';
const jieba = Jieba.withDict(jiebaDict);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'Doc', 'Markdown');
const OUT = join(ROOT, 'app', 'public', 'data');
mkdirSync(OUT, { recursive: true });

// 교재 주요 단어(### N. 한자 / 병음 …)를 jieba 사용자 사전에 넣어 교재의 단어 단위를 유지한다
{
  const ws = new Set<string>();
  for (let v = 1; v <= 8; v++) {
    const d = join(SRC, `vol${v}`);
    for (const f of readdirSync(d).filter(x => x.endsWith('.md'))) {
      for (const m of readFileSync(join(d, f), 'utf8').matchAll(/^###\s*\d+\.\s*([一-鿿]{2,6})\s*\//gm)) ws.add(m[1]);
    }
  }
  jieba.loadDict(Buffer.from([...ws].map(w => `${w} 100000`).join('\n')));
}

const levelOf = (vol: number) => (Math.ceil(vol / 2) as 1 | 2 | 3 | 4);
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const SPLIT = /／/;

function makeVerse(lessonId: string, zh: string, pinyin: string, ko: string): Verse {
  const z = zh.split(SPLIT), p = pinyin.split(SPLIT), k = ko.split(SPLIT);
  const aligned = z.length > 1 && z.length === p.length && z.length === k.length;
  const chunks: Chunk[] = aligned
    ? z.map((zz, i) => ({ id: `${lessonId}_${sha(zz)}`, zh: zz.trim(), pinyin: p[i].trim(), ko: k[i].trim() }))
    : [{ id: `${lessonId}_${sha(zh)}`, zh: zh.replace(/／/g, ''), pinyin: pinyin.replace(/／/g, ''), ko: ko.replace(/／/g, '') }];
  const seg = segmentTokens(zh.replace(/／/g, ''));
  return { zh: zh.replace(/／/g, ''), pinyin: pinyin.replace(/／/g, ''), ko: ko.replace(/／/g, ''), chunks, words: seg.words, phrases: seg.phrases };
}

/** 한자 문장 + 단어 단위 병음 → 단어 목록. 병음 띄어쓰기를 단어 경계로 사용한다. */
function extractWords(zh: string, pinyin: string): { zh: string; py: string }[] {
  const out: { zh: string; py: string }[] = [];
  const zhChars = [...zh.replace(/／/g, '')];
  let hi = 0;
  for (const tok of pinyin.replace(/／/g, ' ').trim().split(/\s+/).filter(Boolean)) {
    const syl = splitSyllables(tok);
    if (!syl.length) continue;
    let w = '';
    let taken = 0;
    while (hi < zhChars.length && taken < syl.length) {
      const c = zhChars[hi++];
      if (/[\u4e00-\u9fff]/.test(c)) { w += c; taken++; }
    }
    if (w) out.push({ zh: w, py: syl.join('') });
  }
  return out;
}

// ── 형태소 분절 + 구(phrase) 묶음 ──
const isHanChar = (c: string) => /[\u4e00-\u9fff]/.test(c);
const NOUN = new Set(['n', 'nr', 'ns', 'nt', 'nz', 'ng', 'an']);
const VERB = new Set(['v', 'vd', 'vn']);
const ADJ = new Set(['a', 'ad']);
const NUM = new Set(['m', 'q']);
const ASPECT = new Set(['ul', 'uz', 'ug']); // 了/着/过
const DE = new Set(['uj']); // 的
const PREP_LIKE = new Set('将把被在对向从给为于跟和与同往朝沿凭靠比按按照根据通过经过'.split(''));

function mergeable(pw: string, pt: string, nt: string): boolean {
  if (pt === 'p' || (pw.length === 1 && PREP_LIKE.has(pw))) {
    if (nt === 'r' || NOUN.has(nt) || NUM.has(nt) || DE.has(nt)) return true;
  }
  if (NUM.has(pt) && (NUM.has(nt) || NOUN.has(nt))) return true;
  if (pt === 'd' && (VERB.has(nt) || ADJ.has(nt))) return true;
  if (VERB.has(pt) && ASPECT.has(nt)) return true;
  if ((NOUN.has(pt) || pt === 'r' || ADJ.has(pt) || NUM.has(pt)) && DE.has(nt)) return true;
  if (DE.has(pt) && (NOUN.has(nt) || nt === 'r')) return true;
  return false;
}

/** jieba 분절(단어) + 품사 기반 구(phrase) 묶음 → 끝 인덱스(배타) 배열 */
function segmentTokens(zh: string): { words: number[]; phrases: number[] } {
  const raw = jieba.tag(zh) as { word: string; tag: string }[];
  // 儿화: '点|儿发' 처럼 儿 이 다음 토큰 앞에 붙으면 앞 토큰 뒤로 옮긴다
  const tokens: { word: string; tag: string }[] = [];
  for (const t of raw) {
    if (t.word.length > 1 && t.word[0] === '儿' && tokens.length) {
      tokens[tokens.length - 1] = { ...tokens[tokens.length - 1], word: tokens[tokens.length - 1].word + '儿' };
      tokens.push({ word: t.word.slice(1), tag: t.tag });
    } else tokens.push(t);
  }
  const hw: { w: string; end: number; tag: string }[] = [];
  let hi = 0;
  for (const t of tokens) {
    // 인덱스는 구두점 포함 글자 기준(앱의 splitChunks/breakPositions 와 동일)
    hi += [...t.word].length;
    if (![...t.word].some(isHanChar)) {
      // 구두점은 앞 단어에 붙여 '，' 앞에서만 끊기게 한다
      if (hw.length && /^[，。！？、；：,.!?;:”’）)…—]+$/.test(t.word)) hw[hw.length - 1].end = hi;
      continue;
    }
    hw.push({ w: t.word, end: hi, tag: t.tag });
  }
  const words = hw.map(x => x.end);
  const phrases: number[] = [];
  let i = 0;
  while (i < hw.length) {
    let j = i;
    while (j + 1 < hw.length && mergeable(hw[j].w, hw[j].tag, hw[j + 1].tag)) j++;
    phrases.push(hw[j].end);
    i = j + 1;
  }
  return { words, phrases };
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
// 단어장: 각 과 '단어' 섹션 + 관련 어휘 행에서 만든다 (외부 사전 미사용 → 라이선스 이슈 없음)
type DictEntry = { p: string; pos?: string; ko: string; h?: string; ex?: [string, string, string]; l: string };
const dict: Record<string, DictEntry> = {};
for (let vol = 1; vol <= 8; vol++) {
  const dir = join(SRC, `vol${vol}`);
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  const lessons = files.map(f => parseLesson(vol, f, readFileSync(join(dir, f), 'utf8')));
  writeFileSync(join(OUT, `lessons-vol${vol}.json`), JSON.stringify(lessons));
  for (const l of lessons) {
    for (const w of l.vocab) {
      if (!w.zh || dict[w.zh]) continue;
      dict[w.zh] = { p: w.pinyin, pos: w.pos, ko: w.ko, h: w.hanjaNote, ex: w.exZh ? [w.exZh, w.exPinyin ?? '', w.exKo ?? ''] : undefined, l: l.id };
    }
  }
  for (const l of lessons) for (const g of l.related) for (const r of g.rows) {
    if (r.zh && r.zh.length <= 8 && !dict[r.zh]) dict[r.zh] = { p: r.pinyin, ko: r.ko, l: l.id };
  }
  // 문장(본문·회화)에 등장하는 단어도 사전에 추가(병음만, 뜻은 추후 CC-CEDICT로 보강)
  for (const l of lessons) {
    const verses = [...l.text, ...l.dialogs.flatMap(d => d.turns.map(t => t.verse))];
    for (const v of verses) for (const w of extractWords(v.zh, v.pinyin)) {
      if (!dict[w.zh]) dict[w.zh] = { p: w.py, ko: '', l: l.id };
    }
  }
  for (const l of lessons) meta.push({ id: l.id, vol: l.vol, no: l.no, level: l.level, titleZh: l.titleZh, titlePinyin: l.titlePinyin, titleKo: l.titleKo });
  console.log(`vol${vol}: ${lessons.length} lessons`);
}
writeFileSync(join(OUT, 'word-dict.json'), JSON.stringify(dict));
console.log(`dict: ${Object.keys(dict).length}`);
writeFileSync(join(OUT, 'lessons-meta.json'), JSON.stringify(meta));
console.log(`meta: ${meta.length}`);
