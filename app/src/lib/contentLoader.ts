import type { Lesson, LessonMeta } from '../types/lesson';
const B = import.meta.env.BASE_URL;
let metaP: Promise<LessonMeta[]> | null = null;
const volCache = new Map<number, Promise<Lesson[]>>();
export const loadMeta = () => (metaP ??= fetch(`${B}data/lessons-meta.json`).then(r => r.json()));
export const loadVol = (vol: number) => {
  if (!volCache.has(vol)) volCache.set(vol, fetch(`${B}data/lessons-vol${vol}.json`).then(r => r.json()));
  return volCache.get(vol)!;
};
export const loadLesson = async (id: string) => {
  const m = /^v([1-8])-\d+$/.exec(id);
  if (!m) return undefined;
  try { return (await loadVol(Number(m[1]))).find(l => l.id === id); } catch { return undefined; }
};
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Lv.1 왕초보 귀 트이기', 2: 'Lv.2 중국어 벽 뚫기', 3: 'Lv.3 네이티브 리듬 정복', 4: 'Lv.4 프리토킹 마스터',
};
