/** 못함 카드는 날짜 제한 없이 언제든 복습한다. 듣고 이해와 보고 떠올리기를 둘 다 통과해야 목록에서 빠진다. */
export type ReviewCard = { lessonId: string; zh: string; heard?: boolean; recalled?: boolean };
export type ReviewKind = 'heard' | 'recalled';

export const cardKey = (lessonId: string, zh: string) => `${lessonId}|${zh}`;

/** 한 단계 결과를 반영한다. 두 단계를 모두 통과하면 졸업(null), 아니면 카드가 남는다. */
export const markCard = (card: ReviewCard, kind: ReviewKind, ok: boolean): ReviewCard | null => {
  const next = { ...card, [kind]: ok };
  return next.heard && next.recalled ? null : next;
};
