import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadLesson } from '../lib/contentLoader';
import { speak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useProgressStore } from '../stores/useProgressStore';
import Icon from '../components/Icon';
import type { Lesson } from '../types/lesson';

type Tab = 'text' | 'vocab' | 'grammar' | 'dialog' | 'trap';
const TABS: [Tab, string][] = [
  ['text', '본문'],
  ['vocab', '단어'],
  ['grammar', '문법'],
  ['dialog', '회화'],
  ['trap', '발음 함정'],
];

export default function LessonPage() {
  const { id = '' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('text');
  const { showZh, showPinyin, showKo, toggle } = useSettingsStore();
  const { done, markDone, setLast } = useProgressStore();

  useEffect(() => {
    setLesson(undefined);
    loadLesson(id).then((l) => {
      setLesson(l ?? null);
      if (l) setLast(l.id);
    });
  }, [id, setLast]);

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null)
    return (
      <main className="p-4">
        과를 찾을 수 없습니다.{' '}
        <Link to="/path" className="text-brand">
          목록으로
        </Link>
      </main>
    );

  const chip = (on: boolean) =>
    `px-3 py-1 rounded-full text-sm border ${on ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600'}`;

  return (
    <main className="p-4">
      <Link to="/path" className="text-sm text-slate-500">
        ← 학습 경로
      </Link>
      <h1 className="text-xl font-bold mt-1">
        {lesson.no}. {lesson.titleZh}
      </h1>
      <div className="text-sm text-slate-600 mb-3">
        {lesson.titlePinyin} · {lesson.titleKo}
      </div>
      <div className="flex gap-2 mb-3">
        <button className={chip(showZh)} onClick={() => toggle('showZh')}>
          한자
        </button>
        <button className={chip(showPinyin)} onClick={() => toggle('showPinyin')}>
          병음
        </button>
        <button className={chip(showKo)} onClick={() => toggle('showKo')}>
          한글
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-3 border-b border-slate-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${
              tab === k ? 'border-b-2 border-brand text-brand font-semibold' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'text' && lesson.text.map((v, i) => <ChunkCard key={i} verse={v} />)}

      {tab === 'vocab' && (
        <>
          {lesson.vocab.map((w, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3 mb-2">
              <button onClick={() => speak(w.zh)} className="text-xl mr-2 inline-flex items-center gap-1">
                {w.zh} <Icon name="speaker" size={16} className="text-brand" />
              </button>
              <span className="text-sm text-slate-600">
                {w.pinyin} · {w.pos}
              </span>
              <div>{w.ko}</div>
              {w.hanjaNote && <div className="text-xs text-slate-500 mt-1">{w.hanjaNote}</div>}
              {w.exZh && (
                <div className="text-sm mt-1">
                  <button aria-label="예문 듣기" onClick={() => speak(w.exZh!)} className="align-middle text-brand"><Icon name="speaker" size={14} /></button> {w.exZh}
                  <div className="text-xs text-slate-500">
                    {w.exPinyin} · {w.exKo}
                  </div>
                </div>
              )}
            </div>
          ))}
          {lesson.related.map((g, i) => (
            <div key={i} className="mt-3">
              <h3 className="font-semibold text-sm mb-1">{g.title}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {g.rows.map((r, j) => (
                    <tr key={j} className="border-t border-slate-100">
                      <td className="py-1">
                        <button onClick={() => speak(r.zh)}>{r.zh}</button>
                      </td>
                      <td className="text-slate-500">{r.pinyin}</td>
                      <td>{r.ko}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {tab === 'grammar' &&
        lesson.grammar.map((g, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-3 mb-2">
            <div className="font-semibold mb-1">{g.title}</div>
            {g.lines.map((l, j) => (
              <div key={j} className="text-sm text-slate-700">
                {l}
              </div>
            ))}
          </div>
        ))}

      {tab === 'dialog' &&
        lesson.dialogs.map((d, i) => (
          <div key={i}>
            <h3 className="font-semibold text-sm mb-1">{d.title}</h3>
            {d.turns.map((t, j) => (
              <ChunkCard key={j} verse={t.verse} speaker={t.speaker} />
            ))}
          </div>
        ))}

      {tab === 'trap' &&
        (lesson.traps.length ? (
          lesson.traps.map((t, i) => (
            <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-2 text-sm">
              <div className="font-semibold">
                <Icon name="bulb" size={16} className="inline -mt-0.5 mr-1" />{t.target} <span className="text-slate-500 font-normal">{t.pinyin}</span>
              </div>
              <div className="text-red-700">✗ {t.mistake}</div>
              <div className="text-green-700">✓ {t.correct}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">이 과에는 등록된 발음 함정이 없습니다.</p>
        ))}

      <button
        onClick={() => markDone(lesson.id)}
        disabled={!!done[lesson.id]}
        className="mt-4 w-full rounded-xl bg-brand text-white py-3 disabled:bg-slate-300"
      >
        {done[lesson.id] ? '완료한 과' : '이 과 완료로 표시'}
      </button>
    </main>
  );
}
