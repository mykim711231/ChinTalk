/** 못함 카드는 날짜 제한 없이 언제든 복습할 수 있다. 맞히면 익힌 것으로 보고 목록에서 빠지고, 틀리면 남는다. */
export type ReviewCard = { lessonId: string; zh: string };

export const cardKey = (lessonId: string, zh: string) => `${lessonId}|${zh}`;

/** 맞으면 졸업(null), 틀리면 그대로 남긴다. */
export const nextCard = (card: ReviewCard, ok: boolean): ReviewCard | null => (ok ? null : card);
