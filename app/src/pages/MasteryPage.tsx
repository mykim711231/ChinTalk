import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speak, speakAsync, speakKoIfOn, stopSpeak } from '../lib/tts';
import { recommendLesson } from "../lib/recommend";
import { getMasteryResult, isUnlocked, useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useOfflineStore } from '../stores/useOfflineStore';
import ChunkCard from '../components/ChunkCard';
import Icon from '../components/Icon';
import LessonSelect from '../components/LessonSelect';
import type { Chunk, Lesson, LessonMeta, MasterySource, Verse } from '../types/lesson';
import { studyLines, studySourceLabel, type StudyLine } from '../lib/studyContent';
import { useStudySource } from '../hooks/useStudySource';
import StudySourceSelector from '../components/StudySourceSelector';
import HanText from '../components/HanText';
import { alignChars } from '../lib/pinyin';
import { Toggle } from '../components/ui';
import { useShadowing, type ShadowingController } from '../hooks/useShadowing';

const STAGES = ['Blind', 'Script', 'Shadowing', 'Final'] as const;
const btn = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2 disabled:opacity-40';
const btnBrand = 'inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2 disabled:opacity-40';

/** 선택한 본문 또는 회화 전체를 순서대로 1회 재생한다. */
function usePlayAll(lines: StudyLine[]) {
  const [playing, setPlaying] = useState(-1);
  const token = useRef(0);
  const stop = useCallback(() => { token.current++; stopSpeak(); setPlaying(-1); }, []);
  const play = useCallback(async () => {
    if (!lines.length) return;
    const my = ++token.current;
    for (let i = 0; i < lines.length; i++) {
      if (token.current !== my) return;
      setPlaying(i);
      await speakAsync(lines[i].verse.zh);
      if (token.current !== my) return;
      if (useOfflineStore.getState().playbackError) { setPlaying(-1); return; }
      await speakKoIfOn(lines[i].verse.ko);
      if (token.current !== my) return;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (token.current === my) setPlaying(-1);
  }, [lines]);
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
  const { source, setSource } = useStudySource();
  return (
    <MasteryContent
      key={`${id}:${source}`}
      id={id}
      source={source}
      onSourceChange={setSource}
    />
  );
}

function MasteryContent({ id, source, onSourceChange }: {
  id: string; source: MasterySource; onSourceChange: (source: MasterySource) => void;
}) {
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<{ chunk: Chunk; traps: Lesson['traps'] } | null>(null);
  const [score, setScore] = useState(0);
  const prog = useProgressStore();
  const { markMastered, setLast } = prog;
  const level = useSettingsStore((s) => s.level);
  const { showMeaningUnits, toggle } = useSettingsStore();
  const lines = useMemo(() => lesson ? studyLines(lesson, source) : [], [lesson, source]);
  const all = usePlayAll(lines);
  const shadow = useShadowing(lines, all.stop);
  const nav = useNavigate();
  const [metas, setMetas] = useState<LessonMeta[]>([]);
  useEffect(() => { void loadMeta().then(setMetas); }, []);

  useEffect(() => {
    let active = true;
    setLesson(undefined);
    setStage(0);
    setPicked(new Set());
    setPopup(null);
    setScore(0);
    loadLesson(id).then((l) => { if (active) { setLesson(l ?? null); if (l) setLast(l.id); } });
    return () => { active = false; };
  }, [id, setLast]);

  const keywords = useMemo(() => {
    const seen = new Set<string>();
    const out: Chunk[] = [];
    for (const { verse } of lines) for (const c of verse.chunks) if (!seen.has(c.zh)) { seen.add(c.zh); out.push(c); }
    return out.slice(0, 16);
  }, [lines]);

  const go = (n: number) => { all.stop(); shadow.stopPlayback(); shadow.stopRecording(); setPopup(null); setStage(n); };

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null) return <main className="p-4">과를 찾을 수 없습니다. <Link to="/path" className="text-brand">목록으로</Link></main>;

  const finished = getMasteryResult(prog, lesson.id, source);
  const sourceLabel = studySourceLabel(source);
  const playLabel = all.playing >= 0 ? '멈추기' : `${sourceLabel} 전체 듣기`;
  const trapsFor = (c: Chunk) =>
    lesson.traps.filter((t) => c.zh.includes(t.target) || c.pinyin.toLowerCase().includes(t.target.toLowerCase()));

  return (
    <main className="p-4 pb-24 space-y-4">
      <Link to={`/lesson/${lesson.id}`} className="text-sm text-slate-500">← {lesson.no}. {lesson.titleZh} 과 참고</Link>
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">4단계 마스터리</h1>
        {finished && <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">{sourceLabel} 완료 · {finished.score}점</span>}
      </div>

      <LessonSelect label="과 선택" metas={metas} value={lesson.id} recId={recommendLesson(metas, prog, level)?.id} isDone={(id) => isUnlocked(prog, id)} onChange={(v) => { all.stop(); nav(`/lesson/${v}/mastery?source=${source}`); }} />

      <StudySourceSelector value={source} lesson={lesson} onChange={(value) => { all.stop(); onSourceChange(value); }} />
      <p className="text-xs text-slate-500">{sourceLabel} · {lines.length}문장으로 4단계를 진행해요. 대상을 바꾸면 1단계부터 시작해요.</p>
      {!lines.length && <p role="status" className="text-sm text-slate-500">등록된 {sourceLabel} 내용이 없어요. 다른 학습 내용을 선택해 주세요.</p>}

      <ol className="grid grid-cols-4 gap-1" aria-label="진행 단계">
        {STAGES.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={!lines.length}
              onClick={() => go(i)}
              aria-current={i === stage ? 'step' : undefined}
              className={`w-full rounded-lg py-2 text-xs font-semibold border ${i === stage ? 'bg-brand text-white border-brand' : i < stage ? 'bg-brand-50 text-brand border-brand-200' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3" aria-label="듣기와 표시 설정">
        <button type="button" disabled={!lines.length || !!shadow.capture} className={btnBrand} onClick={() => {
          shadow.stopPlayback();
          if (all.playing >= 0) all.stop(); else void all.play();
        }}>
          <Icon name={all.playing >= 0 ? 'stop' : 'play'} size={16} /> {playLabel}
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span>의미단위 표시</span>
          <Toggle label="의미단위 표시" on={showMeaningUnits} onClick={() => toggle('showMeaningUnits')} />
        </div>
      </div>

      {stage === 0 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">자막 없이 소리만 듣고, <b>들리는 키워드</b>를 눌러 보세요.</p>
          <Blur on>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
              {lines.map(({ verse }, i) => <MasteryText key={i} verse={verse} />)}
            </div>
          </Blur>
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
          {lines.map(({ verse: v, speaker, section }, i) => (
            <div key={i} className={i === all.playing ? 'ring-2 ring-brand rounded-xl' : ''}>
              {section && <h3 className="font-semibold text-sm mb-1">{section}</h3>}
              <ChunkCard verse={v} speaker={speaker} onBeforeSpeak={all.stop} />
              {(v.chunks.length > 1 || v.chunks.some((c) => trapsFor(c).length > 0)) && (
                <div className="flex flex-wrap gap-1.5 -mt-1 mb-3 px-1">
                  {v.chunks.map((c) => (
                    <button
                      key={c.id} type="button"
                      onClick={() => { all.stop(); void speak(c.zh); const t = trapsFor(c); setPopup(t.length ? { chunk: c, traps: t } : null); }}
                      lang="zh-Hans" className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-hanzi text-xl"
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
                    <div className="font-semibold"><span lang="zh-Hans" className="font-hanzi text-xl">{t.target}</span> <span lang="zh-Latn-pinyin" className="reading-pinyin font-normal">{t.pinyin}</span></div>
                    <div className="text-red-700">✗ {t.mistake}</div>
                    <div className="text-green-700">✓ {t.correct}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {stage === 2 && <Shadowing lines={lines} shadow={shadow} />}

      {stage === 3 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">자막을 다시 가리고 들어 보세요. 처음보다 얼마나 잘 들리나요?</p>
          <Blur on>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
              {lines.map(({ verse }, i) => <MasteryText key={i} verse={verse} />)}
            </div>
          </Blur>
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
            type="button" disabled={!score || !lines.length}
            onClick={() => { all.stop(); markMastered(lesson.id, score, source); }}
            className={`${btnBrand} w-full justify-center py-3`}
          >
            <Icon name="check-circle" size={18} /> {finished ? '평가 다시 제출' : '마스터리 완료'}
          </button>
          {finished && (
            <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm space-y-2">
              <p><b>{sourceLabel} 마스터리 완료!</b> 이 과의 음원이 <b>편하게 듣기</b>에 해금되었어요.</p>
              <div className="flex gap-2">
                <Link to={`/passive?source=${source}`} className={btn}><Icon name="headphones" size={16} /> 편하게 듣기</Link>
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
        <button type="button" className={btn} disabled={stage === 3 || !lines.length} onClick={() => go(stage + 1)}>
          다음 단계 <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </main>
  );
}

function MasteryText({ verse }: { verse: Verse }) {
  const { showPinyin, showMeaningUnits } = useSettingsStore();
  const aligned = !!alignChars(verse.zh, verse.pinyin);
  return (
    <div>
      {showPinyin && !aligned && <div lang="zh-Latn-pinyin" className="reading-pinyin mb-1">{verse.pinyin}</div>}
      <div className="reading-zh">
        <HanText zh={verse.zh} pinyin={verse.pinyin} ruby={showPinyin} phrases={verse.phrases} showMeaningUnits={showMeaningUnits} interactive={false} />
      </div>
    </div>
  );
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function Shadowing({ lines, shadow: s }: { lines: StudyLine[]; shadow: ShadowingController }) {
  const busy = !!s.capture;
  return (
    <section className="space-y-3" aria-label="쉐도잉 연습">
      <p className="text-sm text-slate-600">원문 듣기 → 녹음 → 녹음 끝 → 내 소리·번갈아 듣기로 비교해 보세요. 이어폰을 쓰면 원문 소리가 마이크에 섞이지 않아요.</p>
      <p className="text-xs text-slate-500">녹음은 이번 과·대상의 단계 사이에서 유지돼요. 과나 대상을 바꾸거나 학습을 나가면 삭제돼요.</p>
      {s.canRecord ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => void s.checkMicrophone()}><Icon name="mic" size={16} /> 마이크 권한 확인</button>
          {s.micPermission === 'granted' && <span className="text-sm text-brand" role="status">마이크 사용 가능</span>}
          {s.capture?.index === -1 && <button type="button" className={btn} onClick={s.stopRecording}>권한 확인 취소</button>}
        </div>
      ) : <p role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-xl p-3">{!window.isSecureContext ? '마이크는 HTTPS 주소 또는 이 PC의 localhost에서 사용할 수 있어요. HTTPS 주소로 다시 열어 주세요.' : '이 브라우저는 녹음을 지원하지 않아요. 최신 Chrome·Edge·Safari에서 열어 주세요.'}</p>}
      {s.error && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1"><p>{s.error}</p>{s.errorKind === 'microphone' && <p>PC: 주소창 왼쪽 사이트 설정 → 마이크 허용. 계속 차단되면 Windows 설정 → 개인정보 및 보안 → 마이크에서 브라우저 접근을 허용해 주세요.</p>}</div>}
      {s.capture?.phase === 'requesting' && <p role="status" className="text-sm text-brand">브라우저의 마이크 권한 창에서 허용을 눌러 주세요.</p>}
      {lines.map(({ verse: v, speaker, section }, i) => {
        const capturing = s.capture?.index === i;
        const playing = s.playback?.index === i ? s.playback : null;
        const clip = s.clips[i];
        return (
          <div key={i} className={`rounded-xl border bg-white p-3 space-y-3 ${playing || capturing ? 'border-brand ring-1 ring-brand' : 'border-slate-200'}`} role="group" aria-label={`${i + 1}번 문장 연습`}>
            {section && <h3 className="font-semibold text-sm">{section}</h3>}
            {speaker && <div className="text-xs text-slate-500">{speaker}</div>}
            <MasteryText verse={v} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy} onClick={() => playing?.mode === 'original' ? s.stopPlayback() : void s.play(i, 'original')}><Icon name={playing?.mode === 'original' ? 'stop' : 'speaker'} size={16} /> {playing?.mode === 'original' ? '원문 멈추기' : '원문 듣기'}</button>
              {s.canRecord && (capturing ? (
                <button type="button" className={`${btn} border-red-500 text-red-700`} disabled={s.capture?.phase === 'saving'} onClick={s.stopRecording}><Icon name="stop" size={16} /> {s.capture?.phase === 'requesting' ? '권한 요청 취소' : s.capture?.phase === 'saving' ? '녹음 저장 중…' : '녹음 끝'}</button>
              ) : (
                <button type="button" className={btn} disabled={busy} onClick={() => void s.startRecording(i)}><Icon name="mic" size={16} /> {clip ? '다시 녹음' : '녹음'}</button>
              ))}
              <button type="button" className={btn} disabled={!clip || busy} onClick={() => playing?.mode === 'mine' ? s.stopPlayback() : void s.play(i, 'mine')}><Icon name={playing?.mode === 'mine' ? 'stop' : 'play'} size={16} /> {playing?.mode === 'mine' ? '내 소리 멈추기' : '내 소리'}</button>
              <button type="button" className={btn} disabled={!clip || busy} onClick={() => playing?.mode === 'compare' ? s.stopPlayback() : void s.play(i, 'compare')}><Icon name={playing?.mode === 'compare' ? 'stop' : 'repeat'} size={16} /> {playing?.mode === 'compare' ? '비교 멈추기' : '번갈아 듣기'}</button>
            </div>
            <div role="status" aria-live="polite" className="text-sm text-slate-600">
              {capturing && s.capture?.phase === 'recording' ? <span className="font-semibold text-red-700">● 녹음 중 {clock(s.seconds)} · 끝나면 녹음 끝을 눌러 주세요.</span>
                : capturing && s.capture?.phase === 'saving' ? '녹음을 저장하고 있어요…'
                : playing ? `${playing.mode === 'compare' ? '번갈아 듣기 · ' : ''}${playing.part === 'mine' ? '내 소리 재생 중' : '원문 재생 중'}`
                : clip ? `녹음 완료 ${clock(clip.seconds)} · 내 소리로 확인해 보세요.` : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
