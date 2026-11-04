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

/** 학습 데이터(mp3·본문 JSON) 런타임 캐시만 삭제. 진도/설정(localStorage)은 유지. */
export async function clearContentCaches(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const names = await caches.keys();
  const targets = names.filter((n) => !n.startsWith('workbox-precache'));
  await Promise.all(targets.map((n) => caches.delete(n)));
  return targets.length;
}

export async function clearAllCaches(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
  return names.length;
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
