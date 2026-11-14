import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadLesson } from '../lib/contentLoader';
import { dueCards, useReviewStore } from '../stores/useReviewStore';
import RecallDeck from '../components/RecallDeck';
import { QuizRun } from './MasteryPage';
import type { StudyLine } from '../lib/studyContent';
import type { ReviewKind } from '../lib/srs';
import type { Verse } from '../types/lesson';

type RLine = StudyLine & { lessonId: string };
const TABS: { kind: ReviewKind; label: string; quiz: boolean; face: 'ko' | 'zh' }[] = [
  { kind: 'heardKo', label: '듣고 이해 한글', quiz: true, face: 'ko' },
  { kind: 'heardZh', label: '듣고 이해 간체', quiz: true, face: 'zh' },
  { kind: 'recalledKo', label: '떠올리기 한글', quiz: false, face: 'ko' },
  { kind: 'recalledZh', label: '떠올리기 간체', quiz: false, face: 'zh' },
];

/** 못함으로 남긴 문장을 언제든 다시 확인한다. 4가지(듣고 이해·떠올리기 × 한글·간체)를 모두 통과하면 익힌 것으로 빠진다. */
export default function ReviewPage() {
  const cards = useReviewStore((s) => s.cards);
  // 시작 시점의 복습 대상 문장만 불러온다(진행 중 저장소가 바뀌어도 덱이 흔들리지 않게).
  const all = useMemo(() => dueCards(cards), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [lines, setLines] = useState<RLine[] | null>(null);
  const [extra, setExtra] = useState<StudyLine[]>([]);
  const [kind, setKind] = useState<ReviewKind>('heardKo');

  useEffect(() => {
    let active = true;
    (async () => {
      const out: RLine[] = [];
      const others: StudyLine[] = [];
      for (const c of all) {
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
  }, [all]);

  const tab = TABS.find((t) => t.kind === kind)!;
  const left = (k: ReviewKind) => dueCards(cards, k).length;

  return (
    <main className="p-4 pb-28 space-y-4">
      <Link to="/study" className="text-sm text-slate-500">← 학습</Link>
      <h1 className="text-xl font-bold">심화 학습 복습</h1>
      <p className="text-xs text-slate-500">심화 학습에서 못한 문장을 언제든 복습할 수 있어요. 듣고 이해와 떠올리기를 한글·간체로 모두 통과한 문장만 목록에서 빠지고, 못하면 그 항목이 남아요.</p>
      {lines === null && <p className="text-sm">불러오는 중…</p>}
      {lines && !lines.length && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          복습할 카드가 없어요. 심화 학습에서 못한 문장이 생기면 여기에 나타나요.
        </p>
      )}
      {lines && lines.length > 0 && (
        <>
          <div role="group" aria-label="복습 유형" className="grid grid-cols-2 gap-2 text-sm">
            {TABS.map((t) => (
              <button key={t.kind} type="button" aria-pressed={kind === t.kind} onClick={() => setKind(t.kind)}
                className={`rounded-full border px-3 py-2 font-semibold ${kind === t.kind ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>
                {t.label} {left(t.kind)}장
              </button>
            ))}
          </div>
          <ReviewRun key={kind} tab={tab} lines={lines} extra={extra} />
        </>
      )}
    </main>
  );
}

function ReviewRun({ tab, lines, extra }: { tab: (typeof TABS)[number]; lines: RLine[]; extra: StudyLine[] }) {
  const mark = useReviewStore((s) => s.mark);
  // 이 항목을 아직 통과하지 못한 카드만 대상으로 한다(탭에 들어온 시점 기준으로 고정).
  const todo = useMemo(() => {
    const cards = useReviewStore.getState().cards;
    const open = new Set(dueCards(cards, tab.kind).map((c) => `${c.lessonId}|${c.zh}`));
    return lines.filter((l) => open.has(`${l.lessonId}|${l.verse.zh}`));
  }, [lines, tab.kind]);
  const [done, setDone] = useState(false);

  if (!todo.length) return <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm">{tab.label}은(는) 모두 통과했어요.</p>;
  if (tab.quiz) {
    return (
      <QuizRun face={tab.face} lines={todo} extra={extra} max={todo.length} previous={null} redNote={false}
        onDone={(_r, wrong, asked) => { for (const i of asked) mark(todo[i].lessonId, todo[i].verse.zh, tab.kind, !wrong.includes(i)); }} />
    );
  }
  if (done) return <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm">{tab.label}을(를) 마쳤어요. 통과한 문장은 이 항목에서 빠졌고, 못한 문장은 남아 있어요.</p>;
  return (
    <RecallDeck face={tab.face} lines={todo}
      onGrade={(line, ok) => mark((line as RLine).lessonId, line.verse.zh, tab.kind, ok)}
      onFinish={() => setDone(true)} />
  );
}
