import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDateKey } from '../lib/date';
import type { MasterySource } from '../types/lesson';

type MasteryResult = { score: number; at: string };

type P = {
  /** 읽기 완료 (§6.5) — 해금과 무관 */
  done: Record<string, true>;
  last?: string;
  /** 마스터리 완료(Final Check 5점 자기평가) */
  mastered: Record<string, MasteryResult>;
  /** 본문·회화별 마스터리 평가. 기존 mastered 기록은 본문 평가로 유지한다. */
  masteryBySource: Record<string, Partial<Record<MasterySource, MasteryResult>>>;
  /** 데일리 6단계 종료한 과 */
  dailyDone: Record<string, string>;
  /** 학습한 날짜(로컬 YYYY-MM-DD) → 스트릭 계산 */
  days: Record<string, true>;
  markDone: (id: string) => void;
  markUndone: (id: string) => void;
  setLast: (id: string) => void;
  markMastered: (id: string, score: number, source?: MasterySource) => void;
  markDaily: (id: string) => void;
};

export const isUnlocked = (s: Pick<P, 'mastered' | 'dailyDone'>, id: string) => !!(s.mastered[id] || s.dailyDone[id]);

export const getMasteryResult = (s: Pick<P, 'mastered' | 'masteryBySource'>, id: string, source: MasterySource) =>
  s.masteryBySource[id]?.[source] ?? (source === 'text' && !s.masteryBySource[id] ? s.mastered[id] : undefined);

/** 오늘(없으면 어제)부터 거꾸로 이어진 연속 일수 */
export function calcStreak(days: Record<string, true>, today = new Date()): number {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days[toLocalDateKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[toLocalDateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export const useProgressStore = create<P>()(persist((set) => ({
  done: {},
  mastered: {},
  masteryBySource: {},
  dailyDone: {},
  days: {},
  markDone: (id) => set((s) => ({ done: { ...s.done, [id]: true } })),
  markUndone: (id) => set((s) => {
    const done = { ...s.done };
    delete done[id];
    return { done };
  }),
  setLast: (last) => set({ last }),
  markMastered: (id, score, source = 'text') => set((s) => {
    const at = toLocalDateKey();
    const result = { score, at };
    const previous = s.masteryBySource[id] ?? (s.mastered[id] ? { text: s.mastered[id] } : {});
    return {
      mastered: { ...s.mastered, [id]: result },
      masteryBySource: { ...s.masteryBySource, [id]: { ...previous, [source]: result } },
      done: { ...s.done, [id]: true },
      days: { ...s.days, [at]: true },
    };
  }),
  markDaily: (id) => set((s) => ({
    dailyDone: { ...s.dailyDone, [id]: toLocalDateKey() },
    days: { ...s.days, [toLocalDateKey()]: true },
  })),
}), { name: 'chintalk-progress' }));
