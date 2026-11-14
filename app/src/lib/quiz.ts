import type { StudyLine } from './studyContent';

export type QuizItem = { index: number; options: string[]; answer: number };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

/** 들려 주는 문장의 한글 뜻을 4지선다로 묻는다. 오답은 같은 학습 대상의 다른 문장 뜻에서 뽑는다. */
export function buildQuiz(lines: StudyLine[], max = 10): QuizItem[] {
  const pool = [...new Set(lines.map((l) => l.verse.ko).filter(Boolean))];
  if (pool.length < 2) return [];
  const picked = shuffle(lines.map((_, i) => i).filter((i) => lines[i].verse.ko)).slice(0, max);
  return picked.map((index) => {
    const ko = lines[index].verse.ko;
    const wrong = shuffle(pool.filter((k) => k !== ko)).slice(0, 3);
    const options = shuffle([ko, ...wrong]);
    return { index, options, answer: options.indexOf(ko) };
  });
}
