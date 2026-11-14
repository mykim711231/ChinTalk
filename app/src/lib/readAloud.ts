import type { Lesson, Verse } from '../types/lesson';

const HANZI = /[一-鿿]/;
const HANGUL = /[가-힣]/;
const LATIN = /[A-Za-zÀ-ɏ]/;

/** 문법 줄 "你好。 Nǐ hǎo. 안녕하세요." 를 중국어·한글 해설로 나눈다. 나눌 수 없는 줄은 null. */
export function splitGrammarLine(raw: string): { zh: string; ko: string } | null {
  const line = raw.trim();
  if (!HANZI.test(line)) return null; // 병음만 있는 줄 등
  const h = line.search(HANGUL);
  if (h < 0) return LATIN.test(line) ? null : { zh: line, ko: '' }; // 한자만 있는 줄
  const head = line.slice(0, h).trim();
  const ko = line.slice(h).trim();
  if (!HANZI.test(head) || HANZI.test(ko) || /[()]\s*$/.test(head) || head.includes('(')) return null; // 여러 항목이 섞인 줄은 건너뜀
  // 병음이 끼어 있으면 첫 라틴 글자 앞까지만 중국어로 본다.
  const l = head.search(LATIN);
  const zh = (l < 0 ? head : head.slice(0, l)).trim();
  return HANZI.test(zh) ? { zh, ko } : null;
}

export type ReadItem = { verse: Verse; group: number; line: number };

/** 문법 탭의 읽을 줄(중국어 + 한글 해설). */
export function grammarItems(lesson: Lesson | null | undefined): ReadItem[] {
  const out: ReadItem[] = [];
  lesson?.grammar.forEach((g, group) => g.lines.forEach((raw, line) => {
    const s = splitGrammarLine(raw);
    if (s) out.push({ verse: { zh: s.zh, pinyin: '', ko: s.ko, chunks: [] }, group, line });
  }));
  return out;
}
