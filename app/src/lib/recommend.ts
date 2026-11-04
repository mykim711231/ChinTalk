import type { LessonMeta } from '../types/lesson';
import { isUnlocked } from '../stores/useProgressStore';

type Prog = Parameters<typeof isUnlocked>[0] & { last?: string };

/** §12.4 자동 추천: 진행 중인 과 → 선택 레벨의 다음 미완료 과 → 레벨 첫 과 */
export function recommendLesson(meta: LessonMeta[], p: Prog, level: number): LessonMeta | undefined {
  if (!meta.length) return undefined;
  const last = meta.find((m) => m.id === p.last);
  if (last && !isUnlocked(p, last.id)) return last;
  const lv = meta.filter((m) => m.level === level);
  return lv.find((m) => !isUnlocked(p, m.id)) ?? lv[0] ?? meta[0];
}

/** 날짜 기준 고정 선택(§6.2 오늘의 한 마디) */
export function dayIndex(len: number, d = new Date()): number {
  const n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  return len ? n % len : 0;
}
