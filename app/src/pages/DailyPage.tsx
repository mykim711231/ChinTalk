import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { recommendLesson } from '../lib/recommend';
import { speakAsync, speakKoIfOn, stopSpeak } from '../lib/tts';
import { calcStreak, useProgressStore } from '../stores/useProgressStore';
import { useHighlightStore } from '../stores/useHighlightStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import Icon from '../components/Icon';
import type { Lesson, LessonMeta } from '../types/lesson';

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
  const [params] = useSearchParams();
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
  stepRef.current = step;

  useEffect(() => { void loadMeta().then(setMeta); }, []);
  const rec = useMemo(() => recommendLesson(meta, prog, level), [meta, prog.last, prog.mastered, prog.dailyDone, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const curId = id ?? rec?.id ?? null;
  useEffect(() => { if (curId) void loadLesson(curId).then((l) => setLesson(l ?? null)); }, [curId]);

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
    setStep(n); setLeft(STEPS[n].sec); setVIdx(0);
    setToast(`다음 단계: ${STEPS[n].name}`);
    window.setTimeout(() => setToast(null), 3000);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  // 재생 루프: 음원이 짧으면 순환 반복, 단계가 바뀌거나 멈추면 중단
  useEffect(() => {
    if (state !== 'running' || !lesson?.text.length) return;
    let alive = true;
    (async () => {
      let i = 0;
      while (alive) {
        setVIdx(i % lesson.text.length);
        const verse = lesson.text[i % lesson.text.length];
        await speakAsync(verse.zh);
        if (!alive) break;
        if (stepRef.current !== 4) { await new Promise((r) => setTimeout(r, 250)); if (alive) await speakKoIfOn(verse.ko); }
        if (!alive) break;
        await new Promise((r) => setTimeout(r, stepRef.current === 4 ? 2200 / Math.min(speed, 4) : 600));
        i++;
      }
    })();
    return () => { alive = false; stopSpeak(); };
  }, [state, step, lesson]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopSpeak(), []);

  const finish = () => {
    stopSpeak();
    if (lesson) prog.markDaily(lesson.id);
    setState('done');
  };
  const start = () => { setStep(0); setLeft(STEPS[0].sec); setVIdx(0); setState('running'); };
  const skip = () => setLeft(0);
  const total = STEPS.reduce((a, s) => a + s.sec, 0);
  const remaining = STEPS.slice(step + 1).reduce((a, s) => a + s.sec, 0) + Math.max(0, left);
  const cur = STEPS[step];
  const v = lesson?.text[vIdx];
  const streak = calcStreak(prog.days);

  return (
    <main className="p-4 pb-28 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><Icon name="timer" size={22} className="text-brand" /> 10분 데일리</h1>
        {state !== 'idle' && state !== 'done' && <span className="font-mono text-lg" aria-label="남은 시간">{mmss(remaining)}</span>}
      </div>

      {state === 'idle' && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">출퇴근·자투리 시간 10분, 소리에 매일 노출되는 습관을 만들어요. 6단계가 타이머로 자동 전환됩니다.</p>
          <label className="block text-sm font-semibold">
            오늘의 음원
            <select
              value={curId ?? ''} onChange={(e) => setId(e.target.value)}
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
          <button type="button" className={`${btnBrand} w-full justify-center py-3`} disabled={!lesson} onClick={start}>
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
                {step === 2 || step === 3 ? (
                  <div className="flex flex-wrap gap-2">
                    {v.chunks.map((c) => {
                      const red = marks[c.id] === 'red';
                      return step === 2 ? (
                        <button
                          key={c.id} type="button" aria-pressed={red} onClick={() => toggleRed(c.id)}
                          className={`rounded-xl border px-3 py-2 text-lg ${red ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-slate-300'}`}
                        >{c.zh}</button>
                      ) : (
                        <span key={c.id} className="rounded-xl border border-slate-200 px-3 py-2 text-center">
                          <span className="block text-lg">{c.zh}</span>
                          <span className="block text-xs text-slate-500">{c.pinyin}</span>
                          <span className="block text-xs">{c.ko}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="text-2xl">{v.zh}</div>
                    {step === 1 && <div className="text-sm text-slate-600">{v.pinyin} · {v.ko}</div>}
                  </>
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
            <Link to="/passive" className={btn}><Icon name="headphones" size={14} /> 편하게 듣기</Link>
            <Link to={`/lesson/${lesson.id}/mastery`} className={btn}><Icon name="target" size={14} /> 마스터리로 정밀 학습</Link>
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
