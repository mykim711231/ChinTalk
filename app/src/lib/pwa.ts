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
let checking: Promise<void> | undefined;

function updateAvailable(): void {
  useOfflineStore.setState((s) => ({ updateReady: true, updateState: s.updateState === 'applying' ? 'applying' : 'ready' }));
}

function shouldDownloadAudio(): boolean {
  const { voiceMode, autoDownload } = useSettingsStore.getState();
  return voiceMode === 'recorded' && autoDownload;
}

export function resumeOfflineDownload(): Promise<void> {
  if (!shouldDownloadAudio() || useOfflineStore.getState().core !== 'ready') return Promise.resolve();
  if (running) return running;
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
      useOfflineStore.setState({ ...result, audio: abort.signal.aborted || !shouldDownloadAudio() ? 'paused'
        : result.done === result.total ? 'ready' : !navigator.onLine ? 'offline' : 'error' });
    } catch {
      useOfflineStore.setState({ audio: !navigator.onLine ? 'offline'
        : abort.signal.aborted ? 'paused' : 'error' });
    }
  })().finally(() => {
    controller = undefined;
    running = undefined;
    if (abort.signal.aborted && navigator.onLine && shouldDownloadAudio()) void resumeOfflineDownload();
  });
  return running;
}

export async function pauseOfflineDownload(): Promise<void> {
  controller?.abort();
  await running;
  if (!shouldDownloadAudio()) useOfflineStore.setState({ audio: navigator.onLine ? 'paused' : 'offline' });
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
      if (shouldDownloadAudio()) void resumeOfflineDownload();
      else useOfflineStore.setState({ audio: 'paused' });
    } catch { useOfflineStore.setState({ core: 'error' }); }
  })().finally(() => { preparing = undefined; });
  return preparing;
}

export function checkForUpdate(force = false): Promise<void> {
  if (!navigator.onLine) {
    if (force) useOfflineStore.setState({ updateState: 'offline' });
    return Promise.resolve();
  }
  if (checking) return checking;
  if (!force && (!registration || Date.now() - lastCheck < 60000)) return Promise.resolve();
  lastCheck = Date.now();
  checking = (async () => {
    useOfflineStore.setState({ updateState: 'checking' });
    try {
      if (!registration) await registerWorker();
      if (!registration) throw new Error('registration');
      if (registration.installing && !registration.active) {
        useOfflineStore.setState({ updateState: 'downloading' });
        return;
      }
      await registration.update();
      if (registration.waiting || useOfflineStore.getState().updateReady) updateAvailable();
      else useOfflineStore.setState({ updateState: registration.installing ? 'downloading' : 'current' });
    } catch { useOfflineStore.setState({ updateState: 'error' }); }
  })().finally(() => { checking = undefined; });
  return checking;
}

/** 사용자가 적용을 누르면 설치 시작 주소인 홈으로 다시 연다. 진도·설정·음원 캐시는 유지한다. */
export async function applyAppUpdate(): Promise<void> {
  if (!useOfflineStore.getState().updateReady || useOfflineStore.getState().updateState === 'applying') return;
  useOfflineStore.setState({ updateState: 'applying' });
  try {
    // 예전 skipWaiting=false 워커가 대기 중인 경우도 처리한다.
    const incoming = registration?.waiting ?? registration?.installing;
    if (incoming && navigator.serviceWorker.controller !== incoming) await new Promise<void>((resolve, reject) => {
      const finish = () => { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve(); };
      const changed = () => finish();
      const timeout = window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', changed);
        reject(new Error('activation timeout'));
      }, 15000);
      navigator.serviceWorker.addEventListener('controllerchange', changed);
      incoming.postMessage({ type: 'SKIP_WAITING' });
      if (incoming.state === 'activated' && navigator.serviceWorker.controller === incoming) finish();
    });
    const entry = window.location.pathname === `${B}browser.html` ? `${B}browser.html` : B;
    window.location.replace(new URL(entry, window.location.origin).href);
  } catch { useOfflineStore.setState({ updateState: 'error' }); }
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
        if (worker.state === 'installing' && registration?.active) useOfflineStore.setState({ updateState: 'downloading' });
        if (worker.state === 'installed' && registration?.active) updateAvailable();
        if (worker.state === 'activated') {
          if (!useOfflineStore.getState().updateReady) useOfflineStore.setState({ updateState: 'current' });
          void prepareOffline();
        }
        if (worker.state === 'redundant') {
          if (!registration?.active) useOfflineStore.setState({ core: 'error' });
          else useOfflineStore.setState({ updateState: 'error' });
        }
      });
    };
    registration.addEventListener('updatefound', () => {
      if (registration?.installing) {
        if (registration.active) useOfflineStore.setState({ updateState: 'downloading' });
        watch(registration.installing);
      }
    });
    if (registration.installing) watch(registration.installing);
    if (registration.waiting) updateAvailable();
    if (registration.active) await prepareOffline();
    void checkForUpdate();
  } catch { useOfflineStore.setState({ core: 'error' }); }
}

/** 새 버전은 자동 준비한다. 실행 중 화면은 유지하고 다음 실행 또는 적용 버튼으로 전환한다. */
export function startOfflineFeatures(): void {
  if (started) return;
  started = true;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !('caches' in window)) {
    useOfflineStore.setState({ core: 'unsupported' });
    return;
  }
  void Promise.resolve().then(() => navigator.storage?.persist?.()).catch(() => false);
  let previousController = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const current = navigator.serviceWorker.controller;
    if (previousController && current && current !== previousController) updateAvailable();
    previousController = current;
  });
  void registerWorker();
  useSettingsStore.subscribe((next, previous) => {
    if (next.autoDownload === previous.autoDownload && next.voiceMode === previous.voiceMode) return;
    if (shouldDownloadAudio()) void resumeOfflineDownload();
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
