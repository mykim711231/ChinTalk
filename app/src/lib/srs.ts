import { toLocalDateKey } from './date';

/** 못함 카드는 1일 → 3일 → 7일 간격으로 다시 나온다. 7일 단계까지 맞히면 졸업한다. */
export const SRS_DAYS = [1, 3, 7] as const;

export type ReviewCard = { lessonId: string; zh: string; box: number; due: string };

export const cardKey = (lessonId: string, zh: string) => `${lessonId}|${zh}`;

export function addDays(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

/** 맞으면 다음 상자로(졸업이면 null), 틀리면 처음 상자로. */
export function nextCard(card: ReviewCard, ok: boolean, from = new Date()): ReviewCard | null {
  if (!ok) return { ...card, box: 0, due: addDays(SRS_DAYS[0], from) };
  const box = card.box + 1;
  if (box >= SRS_DAYS.length) return null;
  return { ...card, box, due: addDays(SRS_DAYS[box], from) };
}

export const isDue = (card: ReviewCard, today = toLocalDateKey()) => card.due <= today;
