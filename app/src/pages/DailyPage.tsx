import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { recommendLesson } from '../lib/recommend';
import { speakAsync, speakKoIfOn, stopSpeak } from '../lib/tts';
import { calcStreak, useProgressStore } from '../stores/useProgressStore';
import { useHighlightStore } from '../stores/useHighlightStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useOfflineStore } from '../stores/useOfflineStore';
import Icon from '../components/Icon';
import type { Lesson, LessonMeta, StudySource, Verse } from '../types/lesson';
import { studyLines, studyTargetText } from '../lib/studyContent';
import { useStudySource } from '../hooks/useStudySource';
import StudySourceSelector from '../components/StudySourceSelector';
import HanText from '../components/HanText';
import { alignChars } from '../lib/pinyin';

// §6.7 6단계 (초). ?speed=N 으로 N배속(테스트·체험용)
const STEPS = [
  { sec: 60, name: '워밍업', desc: '음원 전체 듣기 (자막 없음)', blur: true },
  { sec: 60, name: '스크립트', desc: '스크립트 보며 다시 듣기', blur: false },
  { sec: 120, name: '표현 확인', desc: '모르는 표현을 눌러 빨간 북마크만 하세요', blur: false },
  { sec: 120, name: '리듬 따라가기', desc: '소리 덩어리 의미를 파악하며 리듬 따라 읽기', blur: false },
  { sec: 120, name: '쉐도잉', desc: '문장을 듣고 바로 따라 말해 보세요', blur: false },
  { sec: 120, name: '마무리', desc: '자막 없이 최종 재청취', blur: true },
] as const;
const btn = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2 disabled:opacity-40';
const btnBrand = 'inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2 disabled:opacity-40';
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;

export default function DailyPage() {
  const [params, setParams] = useSearchParams();
  const { source, setSource } = useStudySource();
  const speed = Math.max(1, Number(params.get('speed')) || 1);
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [id, setId] = useState<string | null>(params.get('id'));
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState<number>(STEPS[0].sec);
  const [vIdx, setVIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const prog = useProgressStore();
  const level = useSettingsStore((s) => s.level);
  const { marks, toggleRed } = useHighlightStore();
  const stepRef = useRef(0);
  const cursor = useRef(0);
  stepRef.current = step;
  const lines = useMemo(() => lesson ? studyLines(lesson, source) : [], [lesson, source]);

  useEffect(() => { void loadMeta().then(setMeta); }, []);
  const rec = useMemo(() => recommendLesson(meta, prog, level), [meta, prog.last, prog.mastered, prog.dailyDone, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const curId = id ?? rec?.id ?? null;
  useEffect(() => {
    let active = true;
    setLesson(null);
    if (curId) void loadLesson(curId).then((l) => { if (active) setLesson(l ?? null); });
    return () => { active = false; };
  }, [curId]);

  // 타이머
  useEffect(() => {
    if (state !== 'running') return;
    const t = window.setInterval(() => setLeft((l) => l - 0.25 * speed), 250);
    return () => window.clearInterval(t);
  }, [state, speed]);

  // 단계 전환
  useEffect(() => {
    if (state !== 'running' || left > 0) return;
    if (step >= STEPS.length - 1) { finish(); return; }
    const n = step + 1;
    setStep(n); setLeft(STEPS[n].sec);
    setToast(`다음 단계: ${STEPS[n].name}`);
    window.setTimeout(() => setToast(null), 3000);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  // 재생 루프: 음원이 짧으면 순환 반복, 단계가 바뀌거나 멈추면 중단
  useEffect(() => {
    if (state !== 'running' || !lines.length) return;
    let alive = true;
    (async () => {
      while (alive) {
        const i = cursor.current % lines.length;
        setVIdx(i);
        const verse = lines[i].verse;
        const startedAt = Date.now();
        await speakAsync(verse.zh);
        const spent = Date.now() - startedAt; // 재생에 걸린 시간 = 문장 길이·재생 속도 반영
        if (!alive) break;
        if (useOfflineStore.getState().playbackError) { setState('paused'); break; }
        if (stepRef.current !== 4) { await new Promise((r) => setTimeout(r, 250)); if (alive) await speakKoIfOn(verse.ko); }
        if (!alive) break;
        await new Promise((r) => setTimeout(r, stepRef.current === 4 ? Math.min(8000, Math.max(1500, spent + 500)) / Math.min(speed, 4) : 600)); // 쉐도잉: 방금 들은 만큼 쉬며 따라 말하기
        if (!alive) break;
        cursor.current = (i + 1) % lines.length;
      }
    })();
    return () => { alive = false; stopSpeak(); };
  }, [state, step, lines, speed]);

  useEffect(() => () => stopSpeak(), []);

  const finish = () => {
    stopSpeak();
    if (lesson) prog.markDaily(lesson.id, source);
    setState('done');
  };
  const start = () => {
    if (!lesson || !lines.length) return;
    setId(lesson.id); prog.setLast(lesson.id);
    cursor.current = 0; setStep(0); setLeft(STEPS[0].sec); setVIdx(0); setState('running');
  };
  const changeSource = (next: StudySource) => {
    stopSpeak();
    cursor.current = 0;
    setState('idle'); setStep(0); setLeft(STEPS[0].sec); setVIdx(0);
    setSource(next);
  };
  const skip = () => setLeft(0);
  const total = STEPS.reduce((a, s) => a + s.sec, 0);
  const remaining = STEPS.slice(step + 1).reduce((a, s) => a + s.sec, 0) + Math.max(0, left);
  const cur = STEPS[step];
  const line = lines[vIdx];
  const v = line?.verse;
  const streak = calcStreak(prog.days);

  return (
    <main className="p-4 pb-28 space-y-4">
      {lesson && <Link to={`/lesson/${lesson.id}`} className="text-sm text-slate-500">← {lesson.no}. {lesson.titleZh} 과 참고</Link>}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><Icon name="timer" size={22} className="text-brand" /> 10분 데일리</h1>
        {state !== 'idle' && state !== 'done' && <span className="font-mono text-lg" aria-label="남은 시간">{mmss(remaining)}</span>}
      </div>
      <StudySourceSelector value={source} lesson={lesson} onChange={changeSource} />
      <p className="text-xs text-slate-500">{studyTargetText(source, lines.length)}{state === 'running' || state === 'paused' ? ' · 대상을 바꾸면 처음부터 시작해요.' : ''}</p>
      {lesson && !lines.length && <p role="status" className="text-sm text-slate-500">선택한 대상의 문장이 없어요. 다른 대상을 선택해 주세요.</p>}

      {state === 'idle' && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">출퇴근·자투리 시간 10분, 소리에 매일 노출되는 습관을 만들어요. 6단계가 타이머로 자동 전환됩니다.</p>
          <label className="block text-sm font-semibold">
            오늘의 음원
            <select
              value={curId ?? ''} onChange={(e) => {
                setId(e.target.value);
                cursor.current = 0; setVIdx(0);
                const query = new URLSearchParams(params); query.set('id', e.target.value); setParams(query, { replace: true });
              }}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
            >
              {meta.map((m) => (
                <option key={m.id} value={m.id}>
                  Vol.{m.vol} · {m.no}과 · {m.titleZh} {m.titleKo}{m.id === rec?.id ? ' (추천)' : ''}
                </option>
              ))}
            </select>
          </label>
          <ol className="text-sm space-y-1 rounded-xl border border-slate-200 bg-white p-3">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-2"><span className="w-12 flex-none text-slate-500">{s.sec / 60}분</span><span><b>{i + 1}. {s.name}</b> — {s.desc}</span></li>
            ))}
          </ol>
          <button type="button" className={`${btnBrand} w-full justify-center py-3`} disabled={!lines.length} onClick={start}>
            <Icon name="play" size={18} /> 시작하기 ({total / 60}분)
          </button>
        </section>
      )}

      {(state === 'running' || state === 'paused') && lesson && (
        <section className="space-y-3">
          <div className="flex gap-1" aria-label="단계">
            {STEPS.map((s, i) => (
              <span key={s.name} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand' : i === step ? 'bg-brand/60' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div>
            <div className="text-xs text-slate-500">{step + 1}/6 · {mmss(left)}</div>
            <h2 className="text-lg font-bold">{cur.name}</h2>
            <p className="text-sm text-slate-600">{cur.desc}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-40 space-y-2">
            {v && (
              <div className={cur.blur ? 'blur-md select-none' : ''} aria-hidden={cur.blur}>
                <p className="text-xs text-slate-500 mb-2">{line.source === 'text' ? '본문' : '회화'}{line.speaker ? ` · ${line.speaker}` : ''}</p>
                {step === 2 || step === 3 ? (
                  <div className="flex flex-wrap gap-2">
                    {v.chunks.map((c) => {
                      const red = marks[c.id] === 'red';
                      return step === 2 ? (
                        <button
                          key={c.id} type="button" aria-pressed={red} onClick={() => toggleRed(c.id)}
                          className={`max-w-full rounded-xl border px-3 py-2 text-left ${red ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-slate-300'}`}
                        ><DailyText verse={{ ...c, phrases: c.zh === v.zh ? v.phrases : undefined }} /></button>
                      ) : (
                        <span key={c.id} className="max-w-full rounded-xl border border-slate-200 px-3 py-2 text-center">
                          <DailyText verse={{ ...c, phrases: c.zh === v.zh ? v.phrases : undefined }} translation />
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <DailyText verse={v} translation={step === 1 || step === 4} />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {state === 'running' ? (
              <button type="button" className={btn} onClick={() => { stopSpeak(); setState('paused'); }}><Icon name="pause" size={14} /> 일시정지</button>
            ) : (
              <button type="button" className={btnBrand} onClick={() => setState('running')}><Icon name="play" size={14} /> 계속</button>
            )}
            <button type="button" className={btn} onClick={skip}><Icon name="skip" size={14} /> 건너뛰기</button>
            <button type="button" className={`${btn} ml-auto`} onClick={finish}>끝내기</button>
          </div>
        </section>
      )}

      {state === 'done' && lesson && (
        <section role="status" className="rounded-2xl border border-green-300 bg-green-50 p-5 text-center space-y-3">
          <Icon name="award" size={40} className="mx-auto text-brand" />
          <h2 className="text-xl font-bold">오늘의 10분 완료!</h2>
          <p className="text-sm">연속 학습 <b>{streak}일</b> · <b>{lesson.no}. {lesson.titleZh}</b> 음원이 편하게 듣기에 해금되었어요.</p>
          <div className="flex justify-center gap-2">
            <Link to={`/passive?source=${source}`} className={btn}><Icon name="headphones" size={14} /> 편하게 듣기</Link>
            <Link to={`/lesson/${lesson.id}/mastery?source=${source}`} className={btn}><Icon name="target" size={14} /> 심화 학습으로 이어가기</Link>
          </div>
        </section>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pointer-events-none">
          <div className="rounded-full bg-slate-800 text-white text-sm px-4 py-2 shadow-lg">{toast}</div>
        </div>
      )}
    </main>
  );
}

/** 표현 확인 버튼 안에서도 중첩 버튼 없이 글자별 병음을 위에 표시한다. */
function DailyText({ verse, translation = false }: { verse: Pick<Verse, 'zh' | 'pinyin' | 'ko' | 'phrases'>; translation?: boolean }) {
  const { showPinyin, showKo, showMeaningUnits } = useSettingsStore();
  const aligned = !!alignChars(verse.zh, verse.pinyin);
  return (
    <>
      {showPinyin && !aligned && <span lang="zh-Latn-pinyin" className="block reading-pinyin mb-1">{verse.pinyin}</span>}
      <span className="block reading-zh">
        <HanText zh={verse.zh} pinyin={verse.pinyin} ruby={showPinyin} phrases={verse.phrases} showMeaningUnits={showMeaningUnits} interactive={false} />
      </span>
      {translation && showKo && <span className="block mt-1 text-base leading-snug">{verse.ko}</span>}
    </>
  );
}
