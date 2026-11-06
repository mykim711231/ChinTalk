import { loadVol } from './contentLoader';
import { koMp3Url, mp3Url } from './tts';
import type { Lesson } from '../types/lesson';

export const TTS_CACHE = 'chintalk-tts-audio';
const B = import.meta.env.BASE_URL;
export type DownloadProgress = { done: number; failed: number; total: number };
const jobs = new Map<AbortController, Promise<DownloadProgress>>();

function texts(lessons: Lesson[]): string[] {
  const set = new Set<string>();
  const add = (t?: string) => t && set.add(t);
  for (const l of lessons) {
    for (const v of l.text) { add(v.zh); v.chunks.forEach((c) => add(c.zh)); }
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

export async function allAudioUrls(signal?: AbortSignal): Promise<string[]> {
  const manifests = await Promise.all(['zh', 'ko'].map(async (lang) => {
    const response = await fetch(`${B}data/${lang}-tts-manifest.json`, { signal });
    if (!response.ok) throw new Error('음원 목록을 가져올 수 없어요.');
    const manifest: Record<string, string> = await response.json();
    const files = Object.values(manifest);
    if (!files.length || files.some((file) => typeof file !== 'string' || !/^[a-f0-9]+\.mp3$/.test(file))) {
      throw new Error('음원 목록을 확인할 수 없어요.');
    }
    return files;
  }));
  return [...new Set(manifests.flat())].map((file) => `${B}tts/${file}`);
}

/** 이전 버전의 공용 캐시에서 이 앱의 음원만 옮긴다. SMCB 자료는 건드리지 않는다. */
export async function migrateAudioCache(): Promise<void> {
  if (!(await caches.has('tts-audio'))) return;
  const legacy = await caches.open('tts-audio');
  const current = await caches.open(TTS_CACHE);
  const prefix = new URL(`${B}tts/`, location.origin).href;
  for (const request of await legacy.keys()) {
    if (!request.url.startsWith(prefix)) continue;
    const response = await legacy.match(request);
    if (!response || !isAudio(response)) continue;
    if (!(await current.match(request))) await current.put(request, response);
    await legacy.delete(request);
  }
}

export async function cachedCount(urls: string[]): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const cache = await caches.open(TTS_CACHE);
  const queue = [...new Set(urls)];
  let count = 0;
  const worker = async () => {
    while (queue.length) {
      const response = await cache.match(queue.shift()!);
      if (response && isAudio(response)) count++;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return count;
}

function isAudio(response: Response): boolean {
  const type = response.headers.get('content-type')?.toLowerCase() ?? '';
  return response.status === 200 && (type.startsWith('audio/') || type.startsWith('application/octet-stream'));
}

/** 중단 후 성공한 파일을 재사용하고 실패한 응답은 완료로 세지 않는다. */
export function downloadAudioUrls(urls: string[], onProgress: (p: DownloadProgress) => void, signal?: AbortSignal): Promise<DownloadProgress> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const job = (async () => {
    const cache = await caches.open(TTS_CACHE);
    const queue = [...new Set(urls)];
    const progress = { done: 0, failed: 0, total: queue.length };
    onProgress({ ...progress });
    const worker = async () => {
      while (queue.length && !controller.signal.aborted) {
        const url = queue.shift()!;
        try {
          const cached = await cache.match(url);
          if (!cached || !isAudio(cached)) {
            if (cached) await cache.delete(url);
            let saved = false;
            for (let attempt = 0; attempt < 2 && !saved; attempt++) {
              if (controller.signal.aborted) break;
              const request = new AbortController();
              const stop = () => request.abort();
              controller.signal.addEventListener('abort', stop, { once: true });
              const timer = window.setTimeout(stop, 20000);
              try {
                // SW의 재생용 캐시 쓰기와 겹치지 않게 내려받기는 직접 받아 원래 URL로 저장한다.
                const download = new URL(url, location.origin);
                download.searchParams.set('offline', '1');
                const response = await fetch(download.href, { signal: request.signal, cache: 'no-store' });
                if (!isAudio(response)) throw new Error('음원을 받을 수 없어요.');
                if (controller.signal.aborted) break;
                await cache.put(url, response);
                saved = true;
              } catch (error) {
                if (controller.signal.aborted) break;
                if (error instanceof DOMException && error.name === 'QuotaExceededError') throw error;
                if (attempt === 1) throw error;
              } finally {
                clearTimeout(timer);
                controller.signal.removeEventListener('abort', stop);
              }
            }
            if (!saved) continue;
          }
          progress.done++;
        } catch (error) {
          if (!controller.signal.aborted) {
            progress.failed++;
            if (error instanceof DOMException && error.name === 'QuotaExceededError') controller.abort();
          }
        }
        onProgress({ ...progress });
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return progress;
  })();
  jobs.set(controller, job);
  return job.finally(() => {
    jobs.delete(controller);
    signal?.removeEventListener('abort', abort);
  });
}

export async function cancelAudioDownloads(): Promise<void> {
  for (const controller of jobs.keys()) controller.abort();
  await Promise.allSettled(jobs.values());
}

export async function downloadVol(urls: string[], onProgress: (done: number) => void, signal?: AbortSignal): Promise<void> {
  const result = await downloadAudioUrls(urls, (p) => onProgress(p.done), signal);
  if (result.failed) throw new Error('받지 못한 음원이 있어요. 다시 시도해 주세요.');
}

export async function deleteVol(urls: string[]): Promise<void> {
  const c = await caches.open(TTS_CACHE);
  await Promise.all(urls.map((u) => c.delete(u)));
}
