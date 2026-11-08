import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getMasteryResult, useProgressStore } from '../stores/useProgressStore';
import Icon from '../components/Icon';
import type { Lesson, LessonMeta, Verse } from '../types/lesson';
import { usePlaybackFollow } from '../hooks/usePlaybackFollow';
import { isBasicMode } from '../lib/compatibility';
import { useLessonPlayback } from '../hooks/useLessonPlayback';

type Tab = 'text' | 'vocab' | 'grammar' | 'dialog' | 'trap';
const TABS: [Tab, string][] = [
  ['text', '본문'],
  ['vocab', '단어'],
  ['grammar', '문법'],
  ['dialog', '회화'],
  ['trap', '발음 함정'],
];

export default function LessonPage() {
  const basic = isBasicMode();
  const { id = '' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('text');
  const settings = useSettingsStore();
  const { showMeaningUnits, toggle } = settings;
  const progress = useProgressStore();
  const { done, markDone, setLast } = progress;
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const nav = useNavigate();
  const playableVerses = tab === 'text' ? lesson?.text ?? []
    : tab === 'dialog' ? lesson?.dialogs.flatMap((d) => d.turns.map((t) => t.verse)) ?? []
    : tab === 'vocab' ? (lesson?.vocab ?? []).map((w): Verse => ({ zh: w.zh, pinyin: w.pinyin, ko: w.ko, chunks: [] }))
    : [];
  const playback = useLessonPlayback(playableVerses, `${id}:${tab}`);
  const { playing, pass, display, stop: stopAll } = playback;
  const { showZh, showPinyin, showKo } = display ?? settings;
  const learning = pass !== null;
  const ordinary = playing >= 0 && !learning;
  const follow = usePlaybackFollow(playing, `${lesson?.id ?? ''}:${tab}:${pass ?? ''}`);

  useEffect(() => { void loadMeta().then(setMeta); }, []);
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

  const selectTab = (nextTab: Tab) => {
    if (nextTab === tab) return;
    stopAll();
    setTab(nextTab);
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
    let active = true;
    setLesson(undefined);
    loadLesson(id).then((l) => {
      if (!active) return;
      setLesson(l ?? null);
      if (l) setLast(l.id);
    });
    return () => { active = false; };
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
    `px-3 py-1 rounded-full text-sm border disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600'}`;
  const canDisplay = tab === 'text' || tab === 'dialog';
  const masterySource = tab === 'dialog' ? 'dialog' : 'text';
  const masteryResult = getMasteryResult(progress, lesson.id, masterySource);

  return (
    <main ref={follow.readingRef} className="p-4 pb-24" onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd}>
      <Link to="/path" className="text-sm text-slate-500">
        ← 학습 경로
      </Link>
      <h1 className="text-xl font-bold mt-1">
        {lesson.no}. <span lang="zh-Hans" className="font-hanzi">{lesson.titleZh}</span>
      </h1>
      <div className="text-sm text-slate-600 mb-3">
        <span lang="zh-Latn-pinyin" className="reading-pinyin">{lesson.titlePinyin}</span> · {lesson.titleKo}
      </div>
      <div ref={follow.controlsRef} className={`flex flex-wrap items-center gap-2 mb-3 ${playing >= 0 ? 'playback-controls' : ''}`} aria-label="듣기 설정">
        {!basic && <button type="button" disabled={!canDisplay || !playableVerses.length} onClick={() => nav(`/lesson/${lesson.id}/mastery?source=${masterySource}`)} title={!canDisplay ? '본문·회화 탭에서 사용할 수 있어요.' : undefined} className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
          <Icon name="target" size={14} /> 4단계 마스터리{masteryResult ? ' (완료)' : ''}
        </button>}
        <button type="button" disabled={!playableVerses.length} onClick={() => { if (ordinary) stopAll(); else void playback.play('once'); }} className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
          <Icon name={ordinary ? 'stop' : 'play'} size={14} /> {ordinary ? '멈추기' : tab === 'text' ? '본문 전체 듣기' : tab === 'dialog' ? '회화 전체 듣기' : tab === 'vocab' ? '단어 전체 듣기' : '전체 듣기'}
        </button>
        <button type="button" disabled={!playableVerses.length} aria-pressed={learning} aria-describedby="learning-listening-guide" onClick={() => { if (learning) stopAll(); else void playback.play('learning'); }} className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
          <Icon name={learning ? 'stop' : 'repeat'} size={14} /> {learning ? '학습 듣기 멈추기' : tab === 'text' ? '본문 4회 학습 듣기' : tab === 'dialog' ? '회화 4회 학습 듣기' : tab === 'vocab' ? '단어 4회 학습 듣기' : '4회 학습 듣기'}
        </button>
        {playing >= 0 && <span role="status" className="text-xs text-slate-500">{learning ? `${pass + 1}/4회 · ${playback.passLabel} · ` : '재생 중 '}{playing + 1}/{playableVerses.length}{tab === 'vocab' ? '단어' : '문장'}</span>}
      </div>
      {playback.completed && <p role="status" className="text-sm text-brand mb-2">4회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.</p>}
      <p id="learning-listening-guide" className="text-xs text-slate-500 mb-3">4회 학습 듣기: 병음만 → 한글만 → 한자만 → 모두 표시. 매회 선택한 내용 전체를 듣고, 종료하면 기존 표시 설정으로 돌아와요.</p>
      <div className="flex gap-1 overflow-x-auto mb-3 border-b border-slate-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => selectTab(k)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${
              tab === k ? 'border-b-2 border-brand text-brand font-semibold' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" disabled={!canDisplay || learning} aria-pressed={showZh} className={chip(showZh)} onClick={() => toggle('showZh')}>
          한자
        </button>
        <button type="button" disabled={!canDisplay || learning} aria-pressed={showPinyin} className={chip(showPinyin)} onClick={() => toggle('showPinyin')}>
          병음
        </button>
        <button type="button" disabled={!canDisplay || learning} aria-pressed={showKo} className={chip(showKo)} onClick={() => toggle('showKo')}>
          한글
        </button>
        <button type="button" disabled={!canDisplay} aria-pressed={showMeaningUnits} className={chip(showMeaningUnits)} onClick={() => toggle('showMeaningUnits')} aria-label="의미단위 표시">
          의미단위 표시
        </button>
      </div>

      {tab === 'text' && lesson.text.map((v, i) => (
        <div key={i} data-playback-line={i} aria-current={i === playing ? 'true' : undefined} className={i === playing ? 'ring-2 ring-brand rounded-xl' : ''}><ChunkCard verse={v} onBeforeSpeak={stopAll} display={display} /></div>
      ))}

      {tab === 'vocab' && (
        <>
          {lesson.vocab.map((w, i) => {
            const vz = !display || display.showZh, vp = !display || display.showPinyin, vk = !display || display.showKo;
            const full = !display || (display.showZh && display.showPinyin && display.showKo); // 4회 학습 앞 3회는 한 가지만 보임
            return (
            <div key={i} data-playback-line={i} aria-current={i === playing ? 'true' : undefined} className={`border border-slate-200 rounded-xl p-3 mb-2 ${i === playing ? 'ring-2 ring-brand' : ''}`}>
              <button onClick={() => { stopAll(); void speak(w.zh); }} aria-label={`${w.zh} 듣기`} className="mr-2 inline-flex items-center gap-1">
                {vz && <span lang="zh-Hans" className="reading-zh">{w.zh}</span>} <Icon name="speaker" size={16} className="text-brand" />
              </button>
              <span className="text-sm text-slate-600">
                {vp && <span lang="zh-Latn-pinyin" className="reading-pinyin">{w.pinyin}</span>}{vp && vk && ' · '}{vk && w.pos}
              </span>
              {vk && <div>{w.ko}</div>}
              {full && w.hanjaNote && <div className="text-xs text-slate-500 mt-1">{w.hanjaNote}</div>}
              {full && w.exZh && (
                <div className="text-sm mt-1">
                  <button aria-label="예문 듣기" onClick={() => speak(w.exZh!)} className="align-middle text-brand"><Icon name="speaker" size={14} /></button> <span lang="zh-Hans" className="font-hanzi text-xl leading-relaxed">{w.exZh}</span>
                  <div className="text-xs text-slate-500">
                    <span lang="zh-Latn-pinyin" className="reading-pinyin">{w.exPinyin}</span> · {w.exKo}
                  </div>
                </div>
              )}
            </div>
            );
          })}
          {lesson.related.map((g, i) => (
            <div key={i} className="mt-3">
              <h3 className="font-semibold text-sm mb-1">{g.title}</h3>
              <table className="w-full table-fixed text-sm">
                <tbody>
                  {g.rows.map((r, j) => (
                    <tr key={j} className="border-t border-slate-100">
                      <td className="py-1">
                        <button lang="zh-Hans" className="font-hanzi text-xl break-words" onClick={() => speak(r.zh)}>{r.zh}</button>
                      </td>
                      <td lang="zh-Latn-pinyin" className="reading-pinyin">{r.pinyin}</td>
                      <td className="break-words">{r.ko}</td>
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
              <div key={j} data-playback-line={lesson.dialogs.slice(0, i).reduce((n, section) => n + section.turns.length, 0) + j} aria-current={lesson.dialogs.slice(0, i).reduce((n, section) => n + section.turns.length, 0) + j === playing ? 'true' : undefined} className={lesson.dialogs.slice(0, i).reduce((n, section) => n + section.turns.length, 0) + j === playing ? 'ring-2 ring-brand rounded-xl' : ''}>
                <ChunkCard verse={t.verse} speaker={t.speaker} onBeforeSpeak={stopAll} display={display} />
              </div>
            ))}
          </div>
        ))}

      {tab === 'trap' &&
        (lesson.traps.length ? (
          lesson.traps.map((t, i) => (
            <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-2 text-sm">
              <div className="font-semibold">
                <Icon name="bulb" size={16} className="inline -mt-0.5 mr-1" /><span lang="zh-Hans" className="font-hanzi text-xl">{t.target}</span> <span lang="zh-Latn-pinyin" className="reading-pinyin font-normal">{t.pinyin}</span>
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
