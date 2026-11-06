import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speak, speakAsync, stopSpeak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useProgressStore } from '../stores/useProgressStore';
import Icon from '../components/Icon';
import type { Lesson, LessonMeta } from '../types/lesson';

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
  const { showZh, showPinyin, showKo, breakLevel, toggle, setBreakLevel } = useSettingsStore();
  const { done, markDone, setLast, mastered } = useProgressStore();
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [playing, setPlaying] = useState(-1);
  const token = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const nav = useNavigate();

  useEffect(() => { void loadMeta().then(setMeta); }, []);
  // 과를 벗어나면 연속 재생 중단
  useEffect(() => () => { token.current++; stopSpeak(); }, [id]);
  // 스크롤 70% 이상 → 읽기 완료 (해금과 무관)
  useEffect(() => {
    if (!lesson) return;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0 || (el.scrollTop || window.scrollY) / max >= 0.7) markDone(lesson.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lesson, markDone, tab]);

  const playAll = async () => {
    if (!lesson) return;
    if (playing >= 0) { token.current++; stopSpeak(); setPlaying(-1); return; }
    const my = ++token.current;
    for (let i = 0; i < lesson.text.length; i++) {
      if (token.current !== my) return;
      setPlaying(i);
      await speakAsync(lesson.text[i].zh);
      if (token.current !== my) return;
      await new Promise((r) => setTimeout(r, 1000)); // 자동 연속 재생 간격
    }
    if (token.current === my) setPlaying(-1);
  };
  const idx = meta.findIndex((m) => m.id === id);
  const prev = idx > 0 ? meta[idx - 1] : undefined;
  const next = idx >= 0 ? meta[idx + 1] : undefined;
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current; touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      const to = dx < 0 ? next : prev;
      if (to) nav(`/lesson/${to.id}`);
    }
  };

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
    <main className="p-4 pb-24" onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd}>
      <Link to="/path" className="text-sm text-slate-500">
        ← 학습 경로
      </Link>
      <h1 className="text-xl font-bold mt-1">
        {lesson.no}. {lesson.titleZh}
      </h1>
      <div className="text-sm text-slate-600 mb-3">
        {lesson.titlePinyin} · {lesson.titleKo}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Link to={`/lesson/${lesson.id}/mastery`} className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-3 py-1">
          <Icon name="target" size={14} /> 4단계 마스터리{mastered[lesson.id] ? ' (완료)' : ''}
        </Link>
        <button type="button" onClick={() => void playAll()} className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1">
          <Icon name={playing >= 0 ? 'stop' : 'play'} size={14} /> {playing >= 0 ? '멈추기' : '전체 듣기'}
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
      {(tab === "text" || tab === "dialog") && (
      <div className="flex flex-wrap gap-2 mb-3">
        <button className={chip(showZh)} onClick={() => toggle('showZh')}>
          한자
        </button>
        <button className={chip(showPinyin)} onClick={() => toggle('showPinyin')}>
          병음
        </button>
        <button className={chip(showKo)} onClick={() => toggle('showKo')}>
          한글
        </button>
        <button className={chip(breakLevel > 0)} onClick={() => setBreakLevel(((breakLevel + 1) % 4) as 0 | 1 | 2 | 3)} aria-label="의미단위 표시">
          {breakLevel === 0 ? '의미단위 표시' : `의미단위 표시 ${['단어', '구', '절'][breakLevel - 1]}`}
        </button>
      </div>
      )}

      {tab === 'text' && lesson.text.map((v, i) => (
        <div key={i} className={i === playing ? 'ring-2 ring-brand rounded-xl' : ''}><ChunkCard verse={v} /></div>
      ))}

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
        {done[lesson.id] ? '읽기 완료' : '이 과 읽기 완료로 표시'}
      </button>
      <div className="flex justify-between gap-2 mt-3">
        {prev ? <Link to={`/lesson/${prev.id}`} className="text-sm text-brand inline-flex items-center gap-1"><Icon name="chevronLeft" size={14} /> 이전 과</Link> : <span />}
        {next ? <Link to={`/lesson/${next.id}`} className="text-sm text-brand inline-flex items-center gap-1">다음 과 <Icon name="chevronRight" size={14} /></Link> : <span />}
      </div>
    </main>
  );
}
