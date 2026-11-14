import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cardKey, markCard, type ReviewCard, type ReviewKind } from '../lib/srs';
import type { MasterySource } from '../types/lesson';

/** 심화 학습을 "나중에 하기"로 멈춘 상태 */
export type Pending = { remaining: string[]; correct: number; total: number; quiz: number | null };

type R = {
  cards: Record<string, ReviewCard>;
  pending: Record<string, Pending>;
  /** 심화 학습에서 못함으로 처음 판정한 문장: 복습 대상으로 등록 */
  addWeak: (lessonId: string, zh: string) => void;
  /** 복습 단계(듣고 이해/보고 떠올리기) 결과 반영: 둘 다 통과하면 목록에서 빠진다 */
  mark: (lessonId: string, zh: string, kind: ReviewKind, ok: boolean) => void;
  setPending: (key: string, value: Pending | null) => void;
};

export const pendingKey = (lessonId: string, source: MasterySource, face: 'ko' | 'zh') => `${lessonId}:${source}:${face}`;
/** 복습 대상: 언제든 복습할 수 있으므로 등록된 카드 전부 */
export const dueCards = (cards: Record<string, ReviewCard>) => Object.values(cards);

export const useReviewStore = create<R>()(persist((set) => ({
  cards: {},
  pending: {},
  addWeak: (lessonId, zh) => set((s) => {
    const key = cardKey(lessonId, zh);
    return { cards: { ...s.cards, [key]: { lessonId, zh, heard: false, recalled: false } } };
  }),
  mark: (lessonId, zh, kind, ok) => set((s) => {
    const key = cardKey(lessonId, zh);
    const card = s.cards[key];
    if (!card) return s;
    const cards = { ...s.cards };
    const next = markCard(card, kind, ok);
    if (next) cards[key] = next; else delete cards[key];
    return { cards };
  }),
  setPending: (key, value) => set((s) => {
    const pending = { ...s.pending };
    if (value) pending[key] = value; else delete pending[key];
    return { pending };
  }),
}), { name: 'chintalk-review' }));
