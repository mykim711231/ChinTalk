import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, cardKey, isDue, nextCard, SRS_DAYS, type ReviewCard } from '../lib/srs';
import type { MasterySource } from '../types/lesson';

/** 심화 학습을 "나중에 하기"로 멈춘 상태 */
export type Pending = { remaining: string[]; correct: number; total: number; quiz: number | null };

type R = {
  cards: Record<string, ReviewCard>;
  pending: Record<string, Pending>;
  /** 심화 학습에서 못함으로 처음 판정한 문장: 내일 복습 대상으로 등록 */
  addWeak: (lessonId: string, zh: string) => void;
  /** 복습 결과 반영 */
  grade: (lessonId: string, zh: string, ok: boolean) => void;
  setPending: (key: string, value: Pending | null) => void;
};

export const pendingKey = (lessonId: string, source: MasterySource, face: 'ko' | 'zh') => `${lessonId}:${source}:${face}`;
export const dueCards = (cards: Record<string, ReviewCard>, today?: string) =>
  Object.values(cards).filter((c) => isDue(c, today)).sort((a, b) => a.due.localeCompare(b.due));

export const useReviewStore = create<R>()(persist((set) => ({
  cards: {},
  pending: {},
  addWeak: (lessonId, zh) => set((s) => {
    const key = cardKey(lessonId, zh);
    const next: ReviewCard = { lessonId, zh, box: 0, due: addDays(SRS_DAYS[0]) };
    return { cards: { ...s.cards, [key]: next } };
  }),
  grade: (lessonId, zh, ok) => set((s) => {
    const key = cardKey(lessonId, zh);
    const card = s.cards[key];
    if (!card) return s;
    const cards = { ...s.cards };
    const next = nextCard(card, ok);
    if (next) cards[key] = next; else delete cards[key];
    return { cards };
  }),
  setPending: (key, value) => set((s) => {
    const pending = { ...s.pending };
    if (value) pending[key] = value; else delete pending[key];
    return { pending };
  }),
}), { name: 'chintalk-review' }));
