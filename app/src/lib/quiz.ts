import type { StudyLine } from './studyContent';

export type QuizFace = 'ko' | 'zh';
export type QuizItem = { index: number; options: string[]; answer: number; face: QuizFace };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

/**
 * 들려 주는 문장을 4지선다로 묻는다. face가 ko면 한글 뜻, zh면 같은 간체 문장을 고른다.
 * 오답은 같은 학습 대상의 다른 문장에서 뽑는다.
 */
export function buildQuiz(lines: StudyLine[], max = 10, face: QuizFace = 'ko'): QuizItem[] {
  const text = (i: number) => (face === 'ko' ? lines[i].verse.ko : lines[i].verse.zh);
  const pool = [...new Set(lines.map((_, i) => text(i)).filter(Boolean))];
  if (pool.length < 2) return [];
  const picked = shuffle(lines.map((_, i) => i).filter((i) => text(i))).slice(0, max);
  return picked.map((index) => {
    const answerText = text(index);
    const wrong = shuffle(pool.filter((k) => k !== answerText)).slice(0, 3);
    const options = shuffle([answerText, ...wrong]);
    return { index, options, answer: options.indexOf(answerText), face };
  });
}
