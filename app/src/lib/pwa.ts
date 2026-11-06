import { allAudioUrls, cachedCount, downloadAudioUrls, migrateAudioCache } from './offline';
import { useOfflineStore } from '../stores/useOfflineStore';
import { useSettingsStore } from '../stores/useSettingsStore';

const B = import.meta.env.BASE_URL;
const CORE = ['index.html', 'data/lessons-meta.json', 'data/word-dict.json',
  'data/zh-tts-manifest.json', 'data/ko-tts-manifest.json',
  ...Array.from({ length: 8 }, (_, i) => `data/lessons-vol${i + 1}.json`)];
let registration: ServiceWorkerRegistration | undefined;
let running: Promise<void> | undefined;
let controller: AbortController | undefined;
let preparing: Promise<void> | undefined;
let started = false;
let lastCheck = 0;

export function resumeOfflineDownload(): Promise<void> {
  if (running) return running;
  if (!useSettingsStore.getState().autoDownload || useOfflineStore.getState().core !== 'ready') return Promise.resolve();
  if (!navigator.onLine) {
    useOfflineStore.setState({ audio: 'offline' });
    return Promise.resolve();
  }
  const abort = new AbortController();
  controller = abort;
  running = (async () => {
    useOfflineStore.setState({ audio: 'downloading', failed: 0 });
    try {
      const urls = await allAudioUrls(abort.signal);
      const saved = await cachedCount(urls);
      useOfflineStore.setState({ done: saved, total: urls.length });
      if (abort.signal.aborted) return;
      if (saved === urls.length) {
        useOfflineStore.setState({ audio: 'ready' });
        return;
      }
      let lastProgress = 0;
      const result = await downloadAudioUrls(urls, (progress) => {
        if (Date.now() - lastProgress < 100 && progress.done + progress.failed < progress.total) return;
        lastProgress = Date.now();
        useOfflineStore.setState(progress);
      }, abort.signal);
      useOfflineStore.setState({ ...result, audio: result.done === result.total ? 'ready'
        : !navigator.onLine ? 'offline' : !useSettingsStore.getState().autoDownload ? 'paused' : 'error' });
    } catch {
      useOfflineStore.setState({ audio: !navigator.onLine ? 'offline'
        : abort.signal.aborted ? 'paused' : 'error' });
    }
  })().finally(() => {
    controller = undefined;
    running = undefined;
    if (abort.signal.aborted && navigator.onLine && useSettingsStore.getState().autoDownload) void resumeOfflineDownload();
  });
  return running;
}

export async function pauseOfflineDownload(): Promise<void> {
  controller?.abort();
  await running;
  useOfflineStore.setState({ audio: navigator.onLine ? 'paused' : 'offline' });
}

function prepareOffline(): Promise<void> {
  if (preparing) return preparing;
  preparing = (async () => {
    try {
      const urls = CORE.map((file) => new URL(`${B}${file}`, location.origin).href);
      const missing = (await Promise.all(urls.map(async (url) =>
        await caches.match(url, { ignoreSearch: true }) ? null : url))).filter((url): url is string => !!url);
      if (missing.length) {
        if (!navigator.onLine) throw new Error('offline');
        await Promise.all(missing.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error('download');
        }));
        if ((await Promise.all(urls.map((url) => caches.match(url, { ignoreSearch: true })))).some((r) => !r)) {
          throw new Error('cache');
        }
      }
      await migrateAudioCache();
      useOfflineStore.setState({ core: 'ready' });
      if (useSettingsStore.getState().autoDownload) void resumeOfflineDownload();
      else useOfflineStore.setState({ audio: 'paused' });
    } catch { useOfflineStore.setState({ core: 'error' }); }
  })().finally(() => { preparing = undefined; });
  return preparing;
}

export async function checkForUpdate(): Promise<void> {
  if (!navigator.onLine || !registration || Date.now() - lastCheck < 60000) return;
  lastCheck = Date.now();
  try { await registration.update(); } catch { /* 연결 복구 후 다시 확인한다. */ }
}

export async function retryOfflineSetup(): Promise<void> {
  if (!registration) await registerWorker();
  else if (registration.active) await prepareOffline();
}

async function registerWorker(): Promise<void> {
  try {
    registration = await navigator.serviceWorker.register(`${B}sw.js`, { scope: B, updateViaCache: 'none' });
    const watch = (worker: ServiceWorker) => {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && registration?.active) useOfflineStore.setState({ updateReady: true });
        if (worker.state === 'activated') void prepareOffline();
        if (worker.state === 'redundant' && !registration?.active) useOfflineStore.setState({ core: 'error' });
      });
    };
    registration.addEventListener('updatefound', () => { if (registration?.installing) watch(registration.installing); });
    if (registration.installing) watch(registration.installing);
    if (registration.waiting) useOfflineStore.setState({ updateReady: true });
    if (registration.active) await prepareOffline();
    void checkForUpdate();
  } catch { useOfflineStore.setState({ core: 'error' }); }
}

/** 앱 실행·연결 복구 때 자동 준비. 새 버전은 사용 중인 모든 창을 닫으면 적용된다. */
export function startOfflineFeatures(): void {
  if (started) return;
  started = true;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !('caches' in window)) {
    useOfflineStore.setState({ core: 'unsupported' });
    return;
  }
  void navigator.storage?.persist?.().catch(() => false);
  void registerWorker();
  useSettingsStore.subscribe((next, previous) => {
    if (next.autoDownload === previous.autoDownload) return;
    if (next.autoDownload) void resumeOfflineDownload();
    else void pauseOfflineDownload();
  });
  const resume = () => {
    void checkForUpdate();
    if (registration?.active) void prepareOffline();
    else if (!registration) void registerWorker();
  };
  window.addEventListener('online', resume);
  window.addEventListener('offline', () => { controller?.abort(); useOfflineStore.setState({ audio: 'offline' }); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  window.setInterval(() => { if (!document.hidden) void checkForUpdate(); }, 60 * 60 * 1000);
}
