import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadLesson } from '../lib/contentLoader';
import { speak, speakAsync, stopSpeak } from '../lib/tts';
import { useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import ChunkCard from '../components/ChunkCard';
import Icon from '../components/Icon';
import type { Chunk, Lesson } from '../types/lesson';

const STAGES = ['Blind', 'Script', 'Shadowing', 'Final'] as const;
const btn = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2 disabled:opacity-40';
const btnBrand = 'inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2 disabled:opacity-40';

/** 재생 중인 verse 번호를 알려 주며 본문 전체를 순서대로 1회 재생. cancel 하면 중단 */
function usePlayAll(lesson: Lesson | null) {
  const [playing, setPlaying] = useState(-1);
  const token = useRef(0);
  const stop = useCallback(() => { token.current++; stopSpeak(); setPlaying(-1); }, []);
  const play = useCallback(async () => {
    if (!lesson) return;
    const my = ++token.current;
    for (let i = 0; i < lesson.text.length; i++) {
      if (token.current !== my) return;
      setPlaying(i);
      await speakAsync(lesson.text[i].zh);
      if (token.current !== my) return;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (token.current === my) setPlaying(-1);
  }, [lesson]);
  useEffect(() => () => { token.current++; stopSpeak(); }, []);
  return { playing, play, stop };
}

function Blur({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div className={on ? 'blur-md select-none pointer-events-none' : ''} aria-hidden={on}>
      {children}
    </div>
  );
}

export default function MasteryPage() {
  const { id = '' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<{ chunk: Chunk; traps: Lesson['traps'] } | null>(null);
  const [score, setScore] = useState(0);
  const { mastered, markMastered, setLast } = useProgressStore();
  const level = useSettingsStore((s) => s.level);
  void level;
  const all = usePlayAll(lesson ?? null);

  useEffect(() => {
    setLesson(undefined);
    loadLesson(id).then((l) => { setLesson(l ?? null); if (l) setLast(l.id); });
  }, [id, setLast]);

  const keywords = useMemo(() => {
    if (!lesson) return [] as Chunk[];
    const seen = new Set<string>();
    const out: Chunk[] = [];
    for (const v of lesson.text) for (const c of v.chunks) if (!seen.has(c.zh)) { seen.add(c.zh); out.push(c); }
    return out.slice(0, 16);
  }, [lesson]);

  const go = (n: number) => { all.stop(); setPopup(null); setStage(n); };

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null) return <main className="p-4">과를 찾을 수 없습니다. <Link to="/path" className="text-brand">목록으로</Link></main>;

  const finished = mastered[lesson.id];
  const trapsFor = (c: Chunk) =>
    lesson.traps.filter((t) => c.zh.includes(t.target) || c.pinyin.toLowerCase().includes(t.target.toLowerCase()));

  return (
    <main className="p-4 pb-24 space-y-4">
      <Link to={`/lesson/${lesson.id}`} className="text-sm text-slate-500">← {lesson.no}. {lesson.titleZh} 과 참고</Link>
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">4단계 마스터리</h1>
        {finished && <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">완료 · {finished.score}점</span>}
      </div>

      <ol className="grid grid-cols-4 gap-1" aria-label="진행 단계">
        {STAGES.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === stage ? 'step' : undefined}
              className={`w-full rounded-lg py-2 text-xs font-semibold border ${i === stage ? 'bg-brand text-white border-brand' : i < stage ? 'bg-brand-50 text-brand border-brand-200' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {stage === 0 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">자막 없이 소리만 듣고, <b>들리는 키워드</b>를 눌러 보세요.</p>
          <Blur on>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
              {lesson.text.map((v, i) => <div key={i} className="text-xl">{v.zh}</div>)}
            </div>
          </Blur>
          <div className="flex gap-2">
            <button type="button" className={btnBrand} onClick={() => (all.playing >= 0 ? all.stop() : void all.play())}>
              <Icon name={all.playing >= 0 ? 'stop' : 'play'} size={16} /> {all.playing >= 0 ? '멈추기' : '전체 듣기'}
            </button>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">들리는 키워드 ({picked.size}/{keywords.length})</div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((c) => {
                const on = picked.has(c.id);
                return (
                  <button
                    key={c.id} type="button" aria-pressed={on}
                    onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-300'}`}
                  >
                    {on ? c.zh : '● ● ●'}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">누르면 그 칩의 글자가 보여요. 들렸다고 생각하는 것만 눌러 보세요.</p>
          </div>
        </section>
      )}

      {stage === 1 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">스크립트를 보며 듣고, 구절을 눌러 발음 함정을 확인하세요.</p>
          <div className="flex gap-2">
            <button type="button" className={btnBrand} onClick={() => (all.playing >= 0 ? all.stop() : void all.play())}>
              <Icon name={all.playing >= 0 ? 'stop' : 'play'} size={16} /> {all.playing >= 0 ? '멈추기' : '전체 듣기'}
            </button>
          </div>
          {lesson.text.map((v, i) => (
            <div key={i} className={i === all.playing ? 'ring-2 ring-brand rounded-xl' : ''}>
              <ChunkCard verse={v} />
              {(v.chunks.length > 1 || v.chunks.some((c) => trapsFor(c).length > 0)) && (
                <div className="flex flex-wrap gap-1.5 -mt-1 mb-3 px-1">
                  {v.chunks.map((c) => (
                    <button
                      key={c.id} type="button"
                      onClick={() => { void speak(c.zh); const t = trapsFor(c); setPopup(t.length ? { chunk: c, traps: t } : null); }}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-sm"
                    >
                      {c.zh}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {popup && (
            <div role="dialog" aria-label="발음 함정" className="fixed inset-x-0 bottom-20 z-40 px-4">
              <div className="mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-lg text-sm">
                <div className="flex items-center justify-between">
                  <b className="inline-flex items-center gap-1.5"><Icon name="bulb" size={16} /> 발음 함정 · {popup.chunk.zh}</b>
                  <button type="button" aria-label="닫기" onClick={() => setPopup(null)}><Icon name="x" size={18} /></button>
                </div>
                {popup.traps.map((t, i) => (
                  <div key={i} className="mt-2">
                    <div className="font-semibold">{t.target} <span className="text-slate-500 font-normal">{t.pinyin}</span></div>
                    <div className="text-red-700">✗ {t.mistake}</div>
                    <div className="text-green-700">✓ {t.correct}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {stage === 2 && <Shadowing lesson={lesson} />}

      {stage === 3 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">자막을 다시 가리고 들어 보세요. 처음보다 얼마나 잘 들리나요?</p>
          <Blur on>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
              {lesson.text.map((v, i) => <div key={i} className="text-xl">{v.zh}</div>)}
            </div>
          </Blur>
          <button type="button" className={btnBrand} onClick={() => (all.playing >= 0 ? all.stop() : void all.play())}>
            <Icon name={all.playing >= 0 ? 'stop' : 'play'} size={16} /> {all.playing >= 0 ? '멈추기' : '전체 듣기'}
          </button>
          <div role="radiogroup" aria-label="자기 평가" className="flex gap-1 pt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button" role="radio" aria-checked={score === n} aria-label={`${n}점`}
                onClick={() => setScore(n)}
                className={`flex-1 rounded-xl border py-3 grid place-items-center ${score >= n ? 'bg-brand-50 border-brand text-brand' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                <Icon name="star" size={22} />
                <span className="text-xs font-bold">{n}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500"><span>거의 안 들려요</span><span>다 들려요</span></div>
          <button
            type="button" disabled={!score}
            onClick={() => { all.stop(); markMastered(lesson.id, score); }}
            className={`${btnBrand} w-full justify-center py-3`}
          >
            <Icon name="check-circle" size={18} /> {finished ? '평가 다시 제출' : '마스터리 완료'}
          </button>
          {finished && (
            <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm space-y-2">
              <p><b>마스터리 완료!</b> 이 과의 음원이 <b>편하게 듣기</b>에 해금되었어요.</p>
              <div className="flex gap-2">
                <Link to="/passive" className={btn}><Icon name="headphones" size={16} /> 편하게 듣기</Link>
                <Link to="/path" className={btn}>학습 경로</Link>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" className={btn} disabled={stage === 0} onClick={() => go(stage - 1)}>
          <Icon name="chevronLeft" size={16} /> 이전 단계
        </button>
        <button type="button" className={btn} disabled={stage === 3} onClick={() => go(stage + 1)}>
          다음 단계 <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </main>
  );
}

/** 3단계: 문장 듣기 → 녹음 → 내 소리 재생 → 번갈아 비교 (MVP, §6.6) */
function Shadowing({ lesson }: { lesson: Lesson }) {
  const [recs, setRecs] = useState<Record<number, string>>({});
  const [recording, setRecording] = useState(-1);
  const [err, setErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const urls = useRef<string[]>([]);
  const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => () => {
    stopSpeak();
    mr.current?.state === 'recording' && mr.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    urls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const start = async (i: number) => {
    setErr(null);
    stopSpeak();
    try {
      // 권한 요청은 쉐도잉 최초 진입 시점 (§6.3)
      stream.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream.current);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        urls.current.push(url);
        setRecs((r) => ({ ...r, [i]: url }));
        setRecording(-1);
      };
      mr.current = rec;
      rec.start();
      setRecording(i);
    } catch {
      setErr('마이크를 사용할 수 없어요. 권한을 허용하거나, 마이크 없이 소리를 들으며 입모양을 따라 해 보세요.');
    }
  };
  const stopRec = () => mr.current?.state === 'recording' && mr.current.stop();
  const playMine = (i: number) => new Promise<void>((res) => {
    const a = new Audio(recs[i]); a.onended = () => res(); a.onerror = () => res(); a.play().catch(() => res());
  });
  const compare = async (i: number) => { await speakAsync(lesson.text[i].zh); await playMine(i); };

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-600">원어민 소리를 듣고 → 따라 녹음하고 → 내 소리와 번갈아 들어 비교해 보세요.</p>
      {!canRecord && <p role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-xl p-3">이 브라우저는 녹음을 지원하지 않아요. 소리를 들으며 입모양을 따라 해 보세요.</p>}
      {err && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{err}</p>}
      {lesson.text.map((v, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="text-lg">{v.zh}</div>
          <div className="text-xs text-slate-500">{v.pinyin}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => void speak(v.zh)}><Icon name="speaker" size={14} /> 원어민</button>
            {canRecord && (recording === i ? (
              <button type="button" className={`${btn} border-red-500 text-red-700`} onClick={stopRec}><Icon name="stop" size={14} /> 녹음 끝</button>
            ) : (
              <button type="button" className={btn} disabled={recording >= 0} onClick={() => void start(i)}><Icon name="mic" size={14} /> 녹음</button>
            ))}
            <button type="button" className={btn} disabled={!recs[i]} onClick={() => void playMine(i)}><Icon name="play" size={14} /> 내 소리</button>
            <button type="button" className={btn} disabled={!recs[i]} onClick={() => void compare(i)}><Icon name="repeat" size={14} /> 번갈아 듣기</button>
          </div>
        </div>
      ))}
    </section>
  );
}
