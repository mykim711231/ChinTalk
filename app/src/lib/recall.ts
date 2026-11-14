/** 떠올리기 카드 진행 상태: 5장씩 묶음 → 못함은 추가 학습 더미 → 비면 다음 묶음 */
export const BATCH = 5;

export type RecallState = {
  todo: number[];
  batch: number[];
  pile: number[];
  inPile: boolean;
  /** 카드별 첫 시도 결과 */
  first: Record<number, boolean>;
};

const shuffled = (a: number[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

function normalize(s: RecallState): RecallState {
  let { todo, batch, pile, inPile } = s;
  for (let guard = 0; guard < 4; guard++) {
    if (inPile && !pile.length) inPile = false;
    if (!inPile && !batch.length) {
      if (pile.length) { inPile = true; pile = shuffled(pile); }
      else if (todo.length) { batch = todo.slice(0, BATCH); todo = todo.slice(BATCH); }
    }
    if (inPile ? pile.length : batch.length) break;
    if (!todo.length && !pile.length) break;
  }
  return { ...s, todo, batch, pile, inPile };
}

export const startRecall = (indices: number[]): RecallState =>
  normalize({ todo: indices, batch: [], pile: [], inPile: false, first: {} });

export const currentCard = (s: RecallState): number | null =>
  (s.inPile ? s.pile[0] : s.batch[0]) ?? null;

/** 추가 학습 중 못함이면 따라 말하기 2번, 첫 못함이면 1번 */
export const shadowCount = (s: RecallState) => (s.inPile ? 2 : 1);

export const remainingCount = (s: RecallState) => new Set([...s.todo, ...s.batch, ...s.pile]).size;
export const remainingCards = (s: RecallState) => [...new Set([...s.batch, ...s.pile, ...s.todo])];

export function gradeCard(s: RecallState, ok: boolean): RecallState {
  const cur = currentCard(s);
  if (cur === null) return s;
  let { batch, pile } = s;
  const first = { ...s.first };
  if (s.inPile) {
    pile = pile.slice(1);
    if (!ok) pile = [...pile, cur];
  } else {
    batch = batch.slice(1);
    if (!(cur in first)) first[cur] = ok;
    if (!ok && !pile.includes(cur)) pile = [...pile, cur];
  }
  return normalize({ ...s, batch, pile, first });
}

/** 첫 시도 정답 수 / 시도 수 (이어 하기 값 포함) */
export function recallAccuracy(s: RecallState, carry = { correct: 0, total: 0 }) {
  const vals = Object.values(s.first);
  return { correct: carry.correct + vals.filter(Boolean).length, total: carry.total + vals.length };
}

/** 퀴즈 50% + 떠올리기 첫 시도 50%. 퀴즈를 안 풀었으면 떠올리기만 반영한다. */
export function masteryScore(quiz: number | null, recall: number): number {
  return Math.round(quiz === null ? recall * 100 : (quiz * 50 + recall * 50));
}
