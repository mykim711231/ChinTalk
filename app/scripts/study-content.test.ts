import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studyLines, parseStudySource } from '../src/lib/studyContent';
import type { Lesson, Verse } from '../src/types/lesson';

const verse = (zh: string): Verse => ({ zh, pinyin: 'nǐ hǎo', ko: '안녕하세요', chunks: [] });
const body = [verse('本文一'), verse('本文二')];
const dialog = [{ title: '대화1', turns: [{ speaker: 'A', verse: verse('会话一') }, { speaker: 'B', verse: verse('会话二') }] },
  { title: '대화2', turns: [{ speaker: 'C', verse: verse('会话三') }] }];
const lesson: Lesson = { id: 'v1-01', vol: 1, no: 1, level: 1, titleZh: '测试', titleKo: '검사', titlePinyin: 'cèshì',
  text: body, dialogs: dialog, vocab: [], related: [], grammar: [], traps: [] };

test('text and dialogue targets contain exactly their own sentences', () => {
  assert.deepEqual(studyLines(lesson, 'text').map((l) => l.verse.zh), ['本文一', '本文二']);
  assert.deepEqual(studyLines(lesson, 'dialog').map((l) => l.verse.zh), ['会话一', '会话二', '会话三']);
});

test('combined target preserves all text, sections, speakers and dialogue order', () => {
  const lines = studyLines(lesson, 'all');
  assert.deepEqual(lines.map((l) => l.verse.zh), ['本文一', '本文二', '会话一', '会话二', '会话三']);
  assert.deepEqual(lines.map((l) => l.source), ['text', 'text', 'dialog', 'dialog', 'dialog']);
  assert.equal(lines[0].section, '본문');
  assert.equal(lines[2].section, '회화 · 대화1');
  assert.equal(lines[4].section, '회화 · 대화2');
  assert.equal(lines[3].speaker, 'B');
  assert.equal(lines[0].verse, body[0]);
  assert.equal(lesson.text.length, 2);
});

test('missing content is safe, and repeated sentences in different areas are retained', () => {
  assert.deepEqual(studyLines({ ...lesson, dialogs: [] }, 'dialog'), []);
  assert.equal(studyLines({ ...lesson, dialogs: [] }, 'all').length, body.length);
  const repeated = studyLines({ ...lesson, dialogs: [{ title: '같은 문장', turns: [{ speaker: 'A', verse: body[0] }] }] }, 'all');
  assert.equal(repeated.filter((l) => l.verse === body[0]).length, 2);
});

test('target links support all three choices and fall back to the saved preference', () => {
  for (const source of ['text', 'dialog', 'all'] as const) assert.equal(parseStudySource(source), source);
  assert.equal(parseStudySource(null, 'all'), 'all');
  assert.equal(parseStudySource('invalid', 'dialog'), 'dialog');
});
