/**
 * 못함 카드는 날짜 제한 없이 언제든 복습한다.
 * 듣고 이해(한글/간체)와 보고 떠올리기(한글/간체) 4가지를 모두 통과해야 목록에서 빠진다.
 */
export type ReviewKind = 'heardKo' | 'heardZh' | 'recalledKo' | 'recalledZh';
export const REVIEW_KINDS: ReviewKind[] = ['heardKo', 'heardZh', 'recalledKo', 'recalledZh'];
export type ReviewCard = { lessonId: string; zh: string } & Partial<Record<ReviewKind, boolean>> & { heard?: boolean; recalled?: boolean };

export const cardKey = (lessonId: string, zh: string) => `${lessonId}|${zh}`;

/** 이전 버전 카드(heard/recalled)는 한글 항목의 통과 기록으로 읽는다. */
export const passed = (card: ReviewCard, kind: ReviewKind): boolean => {
  const v = card[kind];
  if (v !== undefined) return v;
  return kind === 'heardKo' ? !!card.heard : kind === 'recalledKo' ? !!card.recalled : false;
};

/** 한 항목 결과를 반영한다. 4가지를 모두 통과하면 졸업(null), 아니면 카드가 남는다. */
export const markCard = (card: ReviewCard, kind: ReviewKind, ok: boolean): ReviewCard | null => {
  const next: ReviewCard = { ...card, [kind]: ok };
  return REVIEW_KINDS.every((k) => passed(next, k)) ? null : next;
};
