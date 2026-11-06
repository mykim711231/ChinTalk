export type StorageInfo = { usageMB: number; quotaMB: number; percent: number; supported: boolean };

export async function getStorageInfo(): Promise<StorageInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate)
    return { usageMB: 0, quotaMB: 0, percent: 0, supported: false };
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    usageMB: +(usage / 1048576).toFixed(2),
    quotaMB: +(quota / 1048576).toFixed(1),
    percent: quota > 0 ? +((usage / quota) * 100).toFixed(2) : 0,
    supported: true,
  };
}

/** 같은 호스트의 다른 앱(SMCB 등)의 캐시와 기록은 삭제하지 않는다. */
async function clearScopedCaches(includePrecache: boolean): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const prefix = new URL(import.meta.env.BASE_URL, location.origin).href;
  const names = await caches.keys();
  let count = 0;
  for (const name of names) {
    if (!includePrecache && name.startsWith('workbox-precache')) continue;
    const cache = await caches.open(name);
    const requests = (await cache.keys()).filter((request) => request.url.startsWith(prefix));
    if (!requests.length && !name.startsWith('chintalk-')) continue;
    await Promise.all(requests.map((request) => cache.delete(request)));
    if (!(await cache.keys()).length) await caches.delete(name);
    count++;
  }
  return count;
}

/** 기본 교재·단어장 및 학습 기록은 유지하고 다운로드한 음원을 지운다. */
export const clearContentCaches = () => clearScopedCaches(false);

export async function clearAllCaches(): Promise<number> {
  const count = await clearScopedCaches(true);
  if ('serviceWorker' in navigator) {
    const scope = new URL(import.meta.env.BASE_URL, location.origin).href;
    const registration = await navigator.serviceWorker.getRegistration(scope);
    if (registration?.scope === scope) await registration.unregister();
  }
  return count;
}

const KEYS = ['chintalk-settings', 'chintalk-progress', 'chintalk-highlight'];
export type Backup = { app: 'chintalk'; version: 1; exportedAt: string; data: Record<string, string> };

export function exportBackup(): Backup {
  const data: Record<string, string> = {};
  for (const k of KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  }
  return { app: 'chintalk', version: 1, exportedAt: new Date().toISOString(), data };
}

export function importBackup(b: Backup): number {
  if (b?.app !== 'chintalk' || typeof b.data !== 'object') throw new Error('ChinTalk 백업 파일이 아닙니다.');
  let n = 0;
  for (const k of KEYS) {
    if (typeof b.data[k] === 'string') {
      localStorage.setItem(k, b.data[k]);
      n++;
    }
  }
  return n;
}

export function resetAllUserData() {
  for (const k of KEYS) localStorage.removeItem(k);
}
