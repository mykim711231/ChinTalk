// TTS 대상 텍스트 수집·해시 (build-tts / 검증 스크립트 공유)
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lesson } from '../src/types/lesson';

export const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(APP, 'public', 'data');
export const TTS_DIR = join(APP, 'public', 'tts');
export const MANIFEST = join(DATA, 'zh-tts-manifest.json');

/** 정규화: 재생 시 lib/tts.ts의 normalizeTts와 반드시 동일해야 한다 */
export const normalizeTts = (s: string) => s.replace(/\s+/g, ' ').trim();
export const hashOf = (s: string) => createHash('sha1').update(normalizeTts(s)).digest('hex').slice(0, 12);

export function loadLessons(vol: number): Lesson[] {
  return JSON.parse(readFileSync(join(DATA, `lessons-vol${vol}.json`), 'utf8'));
}

export function collectTexts(lessons: Lesson[]): string[] {
  const set = new Set<string>();
  const add = (t?: string) => t && set.add(normalizeTts(t));
  for (const l of lessons) {
    for (const v of l.text) {
      add(v.zh);
      if (v.chunks.length > 1) v.chunks.forEach((c) => add(c.zh)); // 구절은 별도 합성 (§9.2)
    }
    for (const w of l.vocab) { add(w.zh); add(w.exZh); }
    for (const g of l.related) g.rows.forEach((r) => add(r.zh));
    for (const d of l.dialogs) d.turns.forEach((t) => add(t.verse.zh));
  }
  return [...set];
}

/** 한글 음성: 괄호 보충설명은 읽지 않는다. lib/tts.ts 의 koSpeech 와 동일해야 한다 */
export const koSpeech = (s: string) => normalizeTts(s.replace(/\([^)]*\)/g, ''));
export const koHashOf = (s: string) => createHash('sha1').update('ko:' + koSpeech(s)).digest('hex').slice(0, 12);
export const KO_MANIFEST = join(DATA, 'ko-tts-manifest.json');
/** 데일리·편하게 듣기·마스터리가 읽는 본문(text) 의 한글 번역 */
export function collectKo(lessons: Lesson[]): string[] {
  const set = new Set<string>();
  for (const l of lessons) for (const v of l.text) { const k = koSpeech(v.ko); if (k) set.add(k); }
  return [...set];
}
export function readKoManifest(): Record<string, string> {
  return existsSync(KO_MANIFEST) ? JSON.parse(readFileSync(KO_MANIFEST, 'utf8')) : {};
}

export function readManifest(): Record<string, string> {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
}
