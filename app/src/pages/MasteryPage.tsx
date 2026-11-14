import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speakAsync, speakKoIfOn, stopSpeak } from '../lib/tts';
import { recommendLesson } from "../lib/recommend";
import { getMasteryResult, isUnlocked, useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useOfflineStore } from '../stores/useOfflineStore';
import Icon from '../components/Icon';
import LessonSelect from '../components/LessonSelect';
import type { Lesson, LessonMeta, MasterySource, Verse } from '../types/lesson';
import { studyLines, studySourceLabel, type StudyLine } from '../lib/studyContent';
import { useStudySource } from '../hooks/useStudySource';
import StudySourceSelector from '../components/StudySourceSelector';
import HanText from '../components/HanText';
import { alignChars } from '../lib/pinyin';
import { Toggle } from '../components/ui';
import RecallDeck from '../components/RecallDeck';
import { buildQuiz, type QuizFace, type QuizItem } from '../lib/quiz';
import { masteryScore, recallOrder } from '../lib/recall';
import { pendingKey, useReviewStore } from '../stores/useReviewStore';
import { useHighlightStore } from '../stores/useHighlightStore';
import { useShadowing, type ShadowingController } from '../hooks/useShadowing';
import { usePlaybackFollow } from '../hooks/usePlaybackFollow';

const STAGES = ['듣고 이해', '한글 보고 떠올리기', '간체 보고 떠올리기', '따라 말하기'] as const;
type Face = 'ko' | 'zh';
type DeckResult = { correct: number; total: number };
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
  const kKey = pendingKey(id, source, 'ko');
  const zKey = pendingKey(id, source, 'zh');
  const pendingKo = useReviewStore((s) => s.pending[kKey]);
  const pendingZh = useReviewStore((s) => s.pending[zKey]);
  const { setPending, addWeak } = useReviewStore();
  const addRed = useHighlightStore((s) => s.addRed);
  const [quizRes, setQuizRes] = useState<{ ko: DeckResult | null; zh: DeckResult | null }>(() => {
    const st = useReviewStore.getState().pending;
    const q = (st[kKey] ?? st[zKey])?.quiz;
    return { ko: q == null ? null : { correct: Math.round(q * 100), total: 100 }, zh: null };
  });
  // 한글·간체 중 푼 것을 합쳐 듣고 이해 점수로 쓴다.
  const quiz = useMemo<DeckResult | null>(() => {
    const parts = [quizRes.ko, quizRes.zh].filter((x): x is DeckResult => !!x);
    return parts.length ? { correct: parts.reduce((n, x) => n + x.correct, 0), total: parts.reduce((n, x) => n + x.total, 0) } : null;
  }, [quizRes]);
  const [decks, setDecks] = useState<{ ko: DeckResult | null; zh: DeckResult | null }>({ ko: null, zh: null });
  const [deckKey, setDeckKey] = useState({ ko: 0, zh: 0 });
  const prog = useProgressStore();
  const { markMastered, setLast } = prog;
  const level = useSettingsStore((s) => s.level);
  const { showMeaningUnits, toggle } = useSettingsStore();
  const lines = useMemo(() => lesson ? studyLines(lesson, source) : [], [lesson, source]);
  const all = usePlayAll(lines);
  const shadow = useShadowing(lines, all.stop);
  const follow = usePlaybackFollow(stage === 3 ? all.playing : -1, `${lesson?.id ?? ''}:${source}:${stage}`);
  const nav = useNavigate();
  const [metas, setMetas] = useState<LessonMeta[]>([]);
  useEffect(() => { void loadMeta().then(setMetas); }, []);

  useEffect(() => {
    let active = true;
    setLesson(undefined);
    setStage(0);
    loadLesson(id).then((l) => { if (active) { setLesson(l ?? null); if (l) setLast(l.id); } });
    return () => { active = false; };
  }, [id, setLast]);

  const go = (n: number) => { all.stop(); shadow.stopPlayback(); shadow.stopRecording(); setStage(n); };

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null) return <main className="p-4">과를 찾을 수 없습니다. <Link to="/path" className="text-brand">목록으로</Link></main>;

  const finished = getMasteryResult(prog, lesson.id, source);
  const sourceLabel = studySourceLabel(source);
  const playLabel = all.playing >= 0 ? '멈추기' : `${sourceLabel} 전체 듣기`;
  return (
    <main ref={follow.readingRef} className="p-4 pb-24 space-y-4">
      <Link to={`/lesson/${lesson.id}`} className="text-sm text-slate-500">← {lesson.no}. {lesson.titleZh} 과 참고</Link>
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">심화 학습</h1>
        {finished && <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">{sourceLabel} 완료 · {finished.score}점{finished.score >= 80 ? ' · 마스터' : ''}</span>}
      </div>

      <LessonSelect label="과 선택" metas={metas} value={lesson.id} recId={recommendLesson(metas, prog, level)?.id} isDone={(id) => isUnlocked(prog, id)} onChange={(v) => { all.stop(); nav(`/lesson/${v}/mastery?source=${source}`); }} />

      <StudySourceSelector value={source} lesson={lesson} onChange={(value) => { all.stop(); onSourceChange(value); }} />
      <p className="text-xs text-slate-500">{sourceLabel} · {lines.length}문장으로 4단계(듣고 이해 → 한글 보고 떠올리기 → 간체 보고 떠올리기 → 따라 말하기)를 진행해요. 본문은 무작위, 회화는 순서대로 나와요. 대상을 바꾸면 1단계부터 시작해요.</p>
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

      {stage === 3 && <div ref={follow.controlsRef} className={`flex flex-wrap items-center gap-3 ${all.playing >= 0 ? 'playback-controls' : ''}`} aria-label="듣기와 표시 설정">
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
        {all.playing >= 0 && <span role="status" className="text-xs text-slate-500">재생 중 {all.playing + 1}/{lines.length}문장</span>}
      </div>}

      {stage === 0 && <Quiz key={`${lesson.id}:${source}`} lines={lines} results={quizRes} onDone={(face, r, wrong) => {
        setQuizRes((q) => ({ ...q, [face]: r }));
        for (const i of wrong) addRed(lines[i].verse.chunks.map((c) => c.id));
      }} />}

      {(stage === 1 || stage === 2) && (() => {
        const face: Face = stage === 1 ? 'ko' : 'zh';
        const pend = face === 'ko' ? pendingKo : pendingZh;
        const key = face === 'ko' ? kKey : zKey;
        const res = decks[face];
        const faceLabel = face === 'ko' ? '한글 보고 떠올리기' : '간체 보고 떠올리기';
        const quizRatio = quiz ? quiz.correct / quiz.total : null;
        const finish = (r: DeckResult) => {
          const next = { ...decks, [face]: r };
          setDecks(next);
          setPending(key, null);
          if (next.ko && next.zh) {
            const t = next.ko.total + next.zh.total;
            markMastered(lesson.id, masteryScore(quizRatio, t ? (next.ko.correct + next.zh.correct) / t : 1), source);
          }
        };
        if (res) {
          const both = !!(decks.ko && decks.zh);
          const score = both ? masteryScore(quizRatio, (decks.ko!.correct + decks.zh!.correct) / Math.max(1, decks.ko!.total + decks.zh!.total)) : null;
          return (
            <section className="space-y-3" aria-label={`${faceLabel} 결과`}>
              <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm space-y-2">
                <p className="text-lg font-bold">{faceLabel} 완료 · 첫 시도 {res.correct}/{res.total}</p>
                {score !== null && <p>심화 학습 점수 <b>{score}점</b>{score >= 80 ? ' · 마스터' : ''} (듣고 이해 {quiz ? `${quiz.correct}/${quiz.total}` : '건너뜀'} + 떠올리기 첫 시도). 이 과의 음원이 <b>편하게 듣기</b>에 해금되었어요.</p>}
                <p>못한 문장은 빨강 북마크에 담고, 1일 · 3일 · 7일 뒤에 <Link to="/review" className="underline font-semibold">복습</Link>으로 다시 나와요.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnBrand} onClick={() => { setDecks({ ...decks, [face]: null }); setDeckKey({ ...deckKey, [face]: deckKey[face] + 1 }); }}>다시 도전</button>
                  {face === 'ko' && <button type="button" className={btn} onClick={() => go(2)}>간체 보고 떠올리기 <Icon name="chevronRight" size={16} /></button>}
                  {face === 'zh' && <button type="button" className={btn} onClick={() => go(3)}>따라 말하기 <Icon name="chevronRight" size={16} /></button>}
                  {both && <Link to={`/passive?source=${source}`} className={btn}><Icon name="headphones" size={16} /> 편하게 듣기</Link>}
                </div>
              </div>
            </section>
          );
        }
        const intro = pend
          ? `지난번에 멈춘 곳에서 이어 해요. 남은 카드 ${pend.remaining.length}장`
          : face === 'ko'
            ? '한글 뜻을 보고 중국어를 떠올려 말한 뒤, 뒤집어서 한자·병음·한글로 확인하세요. 못한 카드는 따라 말하기 후 추가 학습에서 다시 나와요.'
            : '간체를 보고 뜻을 떠올린 뒤, 뒤집어서 병음·한글로 확인하세요. 못한 카드는 따라 말하기 후 추가 학습에서 다시 나와요.';
        return (
          <RecallStage
            key={`${face}:${deckKey[face]}:${pend ? 'resume' : 'new'}`}
            face={face} lines={lines} pending={pend} intro={intro}
            onGrade={(line, ok) => {
              if (ok) return;
              addRed(line.verse.chunks.map((c) => c.id));
              addWeak(lesson.id, line.verse.zh);
            }}
            onLater={(later) => { setPending(key, { ...later, quiz: quizRatio }); nav('/study'); }}
            onFinish={finish}
          />
        );
      })()}

      {stage === 3 && <Shadowing lines={lines} shadow={shadow} playingIndex={all.playing} />}

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

function RecallStage({ face, lines, pending, intro, onGrade, onLater, onFinish }: {
  face: 'ko' | 'zh'; lines: StudyLine[]; pending?: { remaining: string[]; correct: number; total: number };
  intro: string; onGrade: (line: StudyLine, ok: boolean) => void;
  onLater: (later: { remaining: string[]; correct: number; total: number }) => void;
  onFinish: (r: { correct: number; total: number }) => void;
}) {
  // 본문은 무작위, 회화는 순서대로. 시작할 때 한 번만 정한다.
  const deckLines = useMemo(() => {
    const rest = pending ? new Set(pending.remaining) : null;
    return recallOrder(rest ? lines.filter((l) => rest.has(l.verse.zh)) : lines);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!deckLines.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">{intro}</p>
      <RecallDeck lines={deckLines} face={face} carry={pending ? { correct: pending.correct, total: pending.total } : undefined} onGrade={onGrade} onLater={onLater} onFinish={onFinish} />
    </div>
  );
}

function Quiz({ lines, results, onDone }: {
  lines: StudyLine[]; results: { ko: DeckResult | null; zh: DeckResult | null };
  onDone: (face: QuizFace, result: DeckResult, wrongLineIndexes: number[]) => void;
}) {
  const [face, setFace] = useState<QuizFace>('ko');
  return (
    <div className="space-y-3">
      <div role="group" aria-label="문제 유형" className="flex gap-2 text-sm">
        {(['ko', 'zh'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={face === f} onClick={() => setFace(f)} className={`flex-1 rounded-full border px-3 py-2 font-semibold ${face === f ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>
            {f === 'ko' ? '한글' : '간체'}{results[f] ? ` ${results[f]!.correct}/${results[f]!.total}` : ''}
          </button>
        ))}
      </div>
      <QuizRun key={face} face={face} lines={lines} previous={results[face]} onDone={(r, wrong) => onDone(face, r, wrong)} />
    </div>
  );
}

function QuizRun({ face, lines, previous, onDone }: {
  face: QuizFace; lines: StudyLine[]; previous: DeckResult | null;
  onDone: (result: DeckResult, wrongLineIndexes: number[]) => void;
}) {
  const items = useMemo<QuizItem[]>(() => buildQuiz(lines, 10, face), [lines, face]);
  const [n, setN] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const item = items[n];
  useEffect(() => {
    if (!item || done) return;
    void speakAsync(lines[item.index].verse.zh);
    return () => stopSpeak();
  }, [item, done, lines]);

  if (!items.length) return <p role="status" className="text-sm text-slate-500">이 학습 대상은 문장이 적어 퀴즈를 건너뛰어요. 다음 단계로 가 주세요.</p>;
  if (done) {
    return (
      <section className="space-y-3" aria-label="듣고 이해 결과">
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm"><b>{correct}/{items.length}</b> 맞혔어요. 틀린 문장은 빨강 북마크에 담았어요. 위에서 {face === 'ko' ? '간체' : '한글'} 문제도 풀 수 있어요.</p>
        <button type="button" className={btn} onClick={() => { setN(0); setChosen(null); setWrong([]); setCorrect(0); setDone(false); }}>퀴즈 다시 풀기</button>
      </section>
    );
  }
  const pick = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    const ok = i === item.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextWrong = ok ? wrong : [...wrong, item.index];
    setCorrect(nextCorrect);
    setWrong(nextWrong);
    // 정답 확인 뒤 자동으로 다음 문제로 넘어간다(오답은 조금 더 오래 보여 준다).
    window.setTimeout(() => {
      if (n + 1 < items.length) { setN(n + 1); setChosen(null); return; }
      setDone(true);
      onDone({ correct: nextCorrect, total: items.length }, nextWrong);
    }, ok ? 1000 : 2200);
  };
  return (
    <section className="space-y-3" aria-label="듣고 이해 퀴즈">
      <p className="text-sm text-slate-600">{face === 'ko' ? '자막 없이 소리를 듣고, 알맞은 한글 뜻을 고르세요.' : '소리를 듣고, 들은 문장과 같은 간체를 고르세요.'} ({n + 1}/{items.length}){previous ? ` · 지난 결과 ${previous.correct}/${previous.total}` : ''}</p>
      <button type="button" className={btnBrand} onClick={() => void speakAsync(lines[item.index].verse.zh)}><Icon name="speaker" size={16} /> 다시 듣기</button>
      <div className="space-y-2" role="group" aria-label={face === 'ko' ? '한글 뜻 선택' : '간체 선택'}>
        {item.options.map((o, i) => {
          const state = chosen === null ? '' : i === item.answer ? 'border-green-500 bg-green-50' : i === chosen ? 'border-red-400 bg-red-50' : 'opacity-60';
          return <button key={i} type="button" disabled={chosen !== null} onClick={() => pick(i)} className={`w-full text-left rounded-xl border px-3 py-3 text-sm bg-white border-slate-200 ${face === 'zh' ? 'font-hanzi text-xl' : ''} ${state}`} lang={face === 'zh' ? 'zh-Hans' : undefined}>{o}</button>;
        })}
      </div>
      {chosen !== null && (
        <div role="status" className="space-y-2">
          <div lang="zh-Hans" className="font-hanzi text-xl">{lines[item.index].verse.zh}</div>
          <div className="text-sm">{chosen === item.answer ? '정답이에요.' : '아쉬워요. 초록색이 정답이에요. 곧 다음 문제로 넘어가요.'}</div>
        </div>
      )}
    </section>
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

function Shadowing({ lines, shadow: s, playingIndex }: { lines: StudyLine[]; shadow: ShadowingController; playingIndex: number }) {
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
          <div key={i} data-playback-line={i} aria-current={i === playingIndex ? 'true' : undefined} className={`rounded-xl border bg-white p-3 space-y-3 ${playing || capturing || i === playingIndex ? 'border-brand ring-1 ring-brand' : 'border-slate-200'}`} role="group" aria-label={`${i + 1}번 문장 연습`}>
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
