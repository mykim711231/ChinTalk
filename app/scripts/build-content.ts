// Doc/Markdown/vol*/*.md → public/data/lessons-vol{n}.json + lessons-meta.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lesson, Verse, Chunk, DialogSection, LessonMeta } from '../src/types/lesson';
import { splitSyllables } from '../src/lib/pinyin';
import { Jieba } from '@node-rs/jieba';
import { dict as jiebaDict } from '@node-rs/jieba/dict';
import { meaningUnitEnds } from './meaning-units';
const jieba = Jieba.withDict(jiebaDict);
// 사용자 사전: jieba가 쪼개는 인사말·인명·지명·합성어를 한 단어로 고정
const USER_WORDS = [
  // 인사말·숙어
  '早上好', '下午好', '晚上好', '明天见', '好久不见', '多多关照', '欢迎光临', '不客气', '不用谢', '没关系', '对不起',
  '没问题', '听起来',
  // 요일 (일관성)
  '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日', '星期天',
  // 인명·직함
  '李明', '金美娜', '王芳', '金秀贤', '秀贤', '王强', '小王', '小李', '小张', '王经理', '张先生',
  // 지명·기관·고유명사
  '首尔大学', '北京大学', '奥林匹克运动会', '奥林匹克', '阳光酒店', '宫保鸡丁', '鸡丁',
  // 국민
  '中国人', '韩国人', '日本人', '美国人',
  // 합성어·전문용어
  '电话号码', '电子邮件', '电子邮箱', '邮箱地址', '联系方式', '圣诞节', '元旦',
  '儿化音', '北京话', '双音节词', '拍照片', '照片',
  '竞品', '网红', '带货', '直播带货', '年化', '云计算', '扎心', '打工人',
  '线上', '下一步', '上下班', '入行', '限行', '年会', '劝菜', '课外班', '受教育',
  '全社会', '移动端', '信息时代', '新产品', '贵公司', '每一位', '投诉率', '倾向于', '一开始',
  '成人票', '安检机', '高铁票', '短视频', '两室一厅',
  '下一班', '电子邮箱地址',
  '合同草案', '固定说法', '季度绩效考核', '绩效考核', '论据支撑', '装运日期', '核心卖点', '装运', '说服力',
];
// 동목구조(동사+목적어): jieba가 명사(n)로 오태깅해 "시간+명사"(九点见面)로 잘못 묶이는 것을 막음
const USER_VERBS = [
  '见面', '开会', '吃饭', '上课', '下课', '说话', '聊天', '散步', '唱歌', '跳舞', '游泳', '跑步', '打球',
  '请客', '点菜', '拍照', '购物', '取钱', '存钱', '换钱', '挂号', '排队', '理发', '结账', '退房', '入住',
  '登机', '起飞', '降落', '转机', '迷路', '问路', '租车', '还车', '加油', '签字', '订票', '回家', '出门', '打车', '开车', '爬山', '做饭', '逛街',
];
const wordTag = (word: string) => {
  const tagged = jieba.tag(word);
  return tagged.length === 1 && tagged[0].word === word ? tagged[0].tag || 'n' : 'n';
};
const USER_DICT = [
  ...USER_WORDS.map(w => `${w} 100000 ${wordTag(w)}`),
  ...USER_VERBS.map(w => `${w} 100000 v`),
].join('\n');
jieba.loadDict(new TextEncoder().encode(USER_DICT));
const VERB_LIKE = new Set(USER_VERBS);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'Doc', 'Markdown');
const OUT = join(ROOT, 'app', 'public', 'data');
mkdirSync(OUT, { recursive: true });

// 교재 주요 단어(### N. 한자 / 병음 …)를 jieba 사용자 사전에 넣어 교재의 단어 단위를 유지한다
{
  const ws = new Map<string, string>();
  for (let v = 1; v <= 8; v++) {
    const d = join(SRC, `vol${v}`);
    for (const f of readdirSync(d).filter(x => x.endsWith('.md'))) {
      for (const m of readFileSync(join(d, f), 'utf8').matchAll(/^###\s*\d+\.\s*([一-鿿]{2,12})\s*\/[^\n]+/gm)) {
        const pos = m[0].split(/\s+\/\s+/)[2] ?? '';
        const tags: [RegExp, string][] = [[/대명사|代词|pron\./i, 'r'], [/동사|动词|\bv\./i, 'v'],
          [/형용사|形容词|adj\./i, 'a'], [/부사|副词|adv\./i, 'd'], [/개사|전치사|介词|prep\./i, 'p'],
          [/접속사|连词|conj\./i, 'c'], [/양사|量词/, 'q'], [/수사|数词|num\./i, 'm'], [/명사|名词|\bn\./i, 'n']];
        ws.set(m[1], tags.find(([pattern]) => pattern.test(pos))?.[1] ?? wordTag(m[1]));
      }
    }
  }
  jieba.loadDict(Buffer.from([...ws].map(([word, tag]) => `${word} 100000 ${tag}`).join('\n')));
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
  const seg = segmentTokens(zh.replace(/／/g, ''), zh);
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
/** 분절 결과로 의미 단위를 계산한다. 모든 위치는 구두점 포함 끝 인덱스(배타). */
function segmentTokens(zh: string, marked?: string): { words: number[]; phrases: number[] } {
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
    // 인덱스는 구두점 포함 글자 기준(앱의 breakPositions와 동일)
    hi += [...t.word].length;
    if (![...t.word].some(isHanChar)) {
      // 구두점은 앞 단어에 붙여 '，' 앞에서만 끊기게 한다
      if (hw.length && /^[，。！？、；：,.!?;:”’）)…—]+$/.test(t.word)) hw[hw.length - 1].end = hi;
      continue;
    }
    hw.push({ w: t.word, end: hi, tag: t.tag });
  }
  const words = hw.map(x => x.end);
  const phrases = meaningUnitEnds(zh, tokens.map((t) => ({ ...t, tag: VERB_LIKE.has(t.word) ? 'v' : t.tag })), marked);
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
// 문장 단어의 한국어 뜻 보강 (Doc/Dictionary/ko-meanings.json)
const koMeanings: Record<string, string> = JSON.parse(readFileSync(join(ROOT, 'Doc', 'Dictionary', 'ko-meanings.json'), 'utf8'));
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
  // 문장(본문·회화)에 등장하는 단어도 사전에 추가 (ko-meanings.json의 뜻 보강)
  for (const l of lessons) {
    const verses = [...l.text, ...l.dialogs.flatMap(d => d.turns.map(t => t.verse))];
    for (const v of verses) for (const w of extractWords(v.zh, v.pinyin)) {
      if (!dict[w.zh]) dict[w.zh] = { p: w.py, ko: koMeanings[w.zh] ?? '', l: l.id };
    }
  }
  for (const l of lessons) meta.push({ id: l.id, vol: l.vol, no: l.no, level: l.level, titleZh: l.titleZh, titlePinyin: l.titlePinyin, titleKo: l.titleKo });
  console.log(`vol${vol}: ${lessons.length} lessons`);
}
writeFileSync(join(OUT, 'word-dict.json'), JSON.stringify(dict));
console.log(`dict: ${Object.keys(dict).length}`);
writeFileSync(join(OUT, 'lessons-meta.json'), JSON.stringify(meta));
console.log(`meta: ${meta.length}`);
