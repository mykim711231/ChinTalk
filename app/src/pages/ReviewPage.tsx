import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadLesson } from '../lib/contentLoader';
import { dueCards, useReviewStore } from '../stores/useReviewStore';
import RecallDeck from '../components/RecallDeck';
import type { StudyLine } from '../lib/studyContent';
import type { Verse } from '../types/lesson';

/** 못함으로 남긴 문장을 1일 · 3일 · 7일 간격으로 다시 확인한다. */
export default function ReviewPage() {
  const cards = useReviewStore((s) => s.cards);
  const grade = useReviewStore((s) => s.grade);
  // 시작 시점의 오늘 복습 대상만 고정한다(진행 중 저장소가 바뀌어도 덱이 흔들리지 않게).
  const due = useMemo(() => dueCards(cards), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [lines, setLines] = useState<(StudyLine & { lessonId: string })[] | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const out: (StudyLine & { lessonId: string })[] = [];
      for (const c of due) {
        const lesson = await loadLesson(c.lessonId);
        if (!lesson) continue;
        const text = lesson.text.find((v) => v.zh === c.zh);
        if (text) { out.push({ verse: text, source: 'text', lessonId: c.lessonId }); continue; }
        for (const d of lesson.dialogs) {
          const t = d.turns.find((turn) => turn.verse.zh === c.zh);
          if (t) { out.push({ verse: t.verse as Verse, source: 'dialog', speaker: t.speaker, lessonId: c.lessonId }); break; }
        }
      }
      if (active) setLines(out);
    })();
    return () => { active = false; };
  }, [due]);

  const later = Object.values(cards).filter((c) => !due.some((d) => d.lessonId === c.lessonId && d.zh === c.zh));

  return (
    <main className="p-4 pb-28 space-y-4">
      <Link to="/study" className="text-sm text-slate-500">← 학습</Link>
      <h1 className="text-xl font-bold">복습</h1>
      <p className="text-xs text-slate-500">심화 학습에서 못한 문장이 1일 · 3일 · 7일 뒤에 다시 나와요. 7일 단계까지 맞히면 졸업해요.</p>
      {lines === null && <p className="text-sm">불러오는 중…</p>}
      {lines && !lines.length && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          오늘 복습할 카드가 없어요.{later.length ? ` 앞으로 ${later.length}장이 예정되어 있어요.` : ' 심화 학습에서 못한 문장이 생기면 여기에 나타나요.'}
        </p>
      )}
      {lines && lines.length > 0 && !done && (
        <RecallDeck face="ko"
          lines={lines}
          onGrade={(line, ok) => grade((line as StudyLine & { lessonId: string }).lessonId, line.verse.zh, ok)}
          onFinish={() => setDone(true)}
        />
      )}
      {done && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm">오늘 복습을 마쳤어요. 못한 카드는 내일 다시 나와요.</p>}
    </main>
  );
}
