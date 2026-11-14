import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadLesson } from '../lib/contentLoader';
import { dueCards, useReviewStore } from '../stores/useReviewStore';
import RecallDeck from '../components/RecallDeck';
import { QuizRun } from './MasteryPage';
import type { StudyLine } from '../lib/studyContent';
import type { Verse } from '../types/lesson';

/** 못함으로 남긴 문장을 언제든 다시 확인한다. 듣고 이해와 보고 떠올리기를 둘 다 통과하면 익힌 것으로 빠진다. */
export default function ReviewPage() {
  const cards = useReviewStore((s) => s.cards);
  const mark = useReviewStore((s) => s.mark);
  // 시작 시점의 복습 대상만 고정한다(진행 중 저장소가 바뀌어도 덱이 흔들리지 않게).
  const due = useMemo(() => dueCards(cards), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [lines, setLines] = useState<(StudyLine & { lessonId: string })[] | null>(null);
  const [extra, setExtra] = useState<StudyLine[]>([]);
  const [phase, setPhase] = useState<'quiz' | 'recall' | 'done'>('quiz');
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const out: (StudyLine & { lessonId: string })[] = [];
      const others: StudyLine[] = [];
      for (const c of due) {
        const lesson = await loadLesson(c.lessonId);
        if (!lesson) continue;
        for (const v of lesson.text) others.push({ verse: v, source: 'text' });
        for (const d of lesson.dialogs) for (const t of d.turns) others.push({ verse: t.verse as Verse, source: 'dialog', speaker: t.speaker });
        const text = lesson.text.find((v) => v.zh === c.zh);
        if (text) { out.push({ verse: text, source: 'text', lessonId: c.lessonId }); continue; }
        for (const d of lesson.dialogs) {
          const t = d.turns.find((turn) => turn.verse.zh === c.zh);
          if (t) { out.push({ verse: t.verse as Verse, source: 'dialog', speaker: t.speaker, lessonId: c.lessonId }); break; }
        }
      }
      if (active) { setExtra(others); setLines(out); }
    })();
    return () => { active = false; };
  }, [due]);

  return (
    <main className="p-4 pb-28 space-y-4">
      <Link to="/study" className="text-sm text-slate-500">← 학습</Link>
      <h1 className="text-xl font-bold">심화 학습 복습</h1>
      <p className="text-xs text-slate-500">심화 학습에서 못한 문장을 언제든 복습할 수 있어요. 듣고 이해 → 보고 떠올리기를 둘 다 통과한 문장만 목록에서 빠지고, 하나라도 못하면 남아요.</p>
      {lines === null && <p className="text-sm">불러오는 중…</p>}
      {lines && !lines.length && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          복습할 카드가 없어요. 심화 학습에서 못한 문장이 생기면 여기에 나타나요.
        </p>
      )}
      {lines && lines.length > 0 && phase !== 'done' && (
        <ol aria-label="복습 단계" className="flex gap-2 text-xs font-semibold">
          {(['듣고 이해', '보고 떠올리기'] as const).map((t, k) => (
            <li key={t} aria-current={(phase === 'quiz' ? 0 : 1) === k ? 'step' : undefined}
              className={`flex-1 text-center rounded-lg py-2 border ${(phase === 'quiz' ? 0 : 1) === k ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200'}`}>{k + 1}. {t}</li>
          ))}
        </ol>
      )}
      {lines && lines.length > 0 && phase === 'quiz' && (
        <div className="space-y-3">
          <QuizRun face="ko" lines={lines} extra={extra} max={lines.length} previous={null} redNote={false}
            onDone={(_r, wrong, asked) => {
              for (const i of asked) mark(lines[i].lessonId, lines[i].verse.zh, 'heard', !wrong.includes(i));
              setQuizDone(true);
            }} />
          {quizDone && <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2" onClick={() => setPhase('recall')}>다음: 보고 떠올리기</button>}
        </div>
      )}
      {lines && lines.length > 0 && phase === 'recall' && (
        <RecallDeck face="ko"
          lines={lines}
          onGrade={(line, ok) => mark((line as StudyLine & { lessonId: string }).lessonId, line.verse.zh, 'recalled', ok)}
          onFinish={() => setPhase('done')}
        />
      )}
      {phase === 'done' && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm">심화 학습 복습을 마쳤어요. 두 단계를 모두 통과한 문장은 목록에서 빠졌고, 못한 문장은 남아 있어요.</p>}
    </main>
  );
}
