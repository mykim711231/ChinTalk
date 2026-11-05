// vol 단위 mp3 오프라인 다운로드 (§6.9). Workbox 런타임 캐시 'tts-audio' 에 같은 URL 로 저장한다.
import { loadVol } from './contentLoader';
import { koMp3Url, mp3Url } from './tts';
import type { Lesson } from '../types/lesson';

export const TTS_CACHE = 'tts-audio';

function texts(lessons: Lesson[]): string[] {
  const set = new Set<string>();
  const add = (t?: string) => t && set.add(t);
  for (const l of lessons) {
    for (const v of l.text) { add(v.zh); if (v.chunks.length > 1) v.chunks.forEach((c) => add(c.zh)); }
    for (const w of l.vocab) { add(w.zh); add(w.exZh); }
    for (const g of l.related) g.rows.forEach((r) => add(r.zh));
    for (const d of l.dialogs) d.turns.forEach((t) => add(t.verse.zh));
  }
  return [...set];
}

export async function volUrls(vol: number): Promise<string[]> {
  const lessons = await loadVol(vol);
  const urls = await Promise.all([
    ...texts(lessons).map((t) => mp3Url(t)),
    ...lessons.flatMap((l) => l.text.map((v) => koMp3Url(v.ko))),
  ]);
  return [...new Set(urls.filter((u): u is string => !!u))];
}

export async function cachedCount(urls: string[]): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const c = await caches.open(TTS_CACHE);
  let n = 0;
  for (const u of urls) if (await c.match(u)) n++;
  return n;
}

export async function downloadVol(urls: string[], onProgress: (done: number) => void, signal?: { cancelled: boolean }): Promise<void> {
  const c = await caches.open(TTS_CACHE);
  let done = 0;
  const queue = [...urls];
  const worker = async () => {
    for (let u = queue.shift(); u && !signal?.cancelled; u = queue.shift()) {
      if (!(await c.match(u))) {
        const r = await fetch(u);
        if (r.ok) await c.put(u, r);
      }
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

export async function deleteVol(urls: string[]): Promise<void> {
  const c = await caches.open(TTS_CACHE);
  await Promise.all(urls.map((u) => c.delete(u)));
}
