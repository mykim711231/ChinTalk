import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { stopSpeak } from '../lib/tts';
import { useShadowing } from '../hooks/useShadowing';
import { currentCard, gradeCard, recallAccuracy, remainingCards, remainingCount, shadowCount, startRecall } from '../lib/recall';
import type { StudyLine } from '../lib/studyContent';

const btn = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2 disabled:opacity-40';
const hanziCount = (zh: string) => zh.match(/[一-鿿]/g)?.length ?? 0;

export type DeckLater = { remaining: string[]; correct: number; total: number };

/**
 * 떠올리기 플래시카드: 한글 → (말하기) → 한자·병음·한글 확인 → 맞음/못함.
 * 못함은 따라 말하기 후 추가 학습 더미로 가고, 더미가 빌 때까지 반복한다.
 */
export default function RecallDeck({ lines, carry = { correct: 0, total: 0 }, onGrade, onFinish, onLater }: {
  lines: StudyLine[];
  carry?: { correct: number; total: number };
  /** 카드의 첫 시도 결과 */
  onGrade: (line: StudyLine, ok: boolean) => void;
  onFinish: (result: { correct: number; total: number }) => void;
  onLater?: (later: DeckLater) => void;
}) {
  const [rs, setRs] = useState(() => startRecall(lines.map((_, i) => i)));
  const [phase, setPhase] = useState<'front' | 'back' | 'shadow'>('front');
  const [shadowDone, setShadowDone] = useState(0);
  const [ready, setReady] = useState(false);
  const shadow = useShadowing(lines, stopSpeak);
  const { canRecord, capture, startRecording, stopRecording, play, clips, playback } = shadow;
  const cur = currentCard(rs);
  const finished = useRef(false);
  const autoPlayed = useRef('');
  const baseClip = useRef<string | undefined>(undefined);

  // 앞면: 대기 시간(2초 + 한자당 0.3초) 뒤 녹음 시작
  useEffect(() => {
    setReady(false);
    if (phase !== 'front' || cur === null) return;
    const lead = 2000 + 300 * hanziCount(lines[cur].verse.zh);
    const timer = window.setTimeout(() => {
      setReady(true);
    }, lead);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cur, rs]);

  // 뒷면·따라 말하기: 원문을 한 번 들려 준다
  useEffect(() => {
    if (phase === 'front' || cur === null || capture) return;
    const key = `${phase}:${cur}:${rs.batch.length}:${rs.pile.length}:${shadowDone}`;
    if (autoPlayed.current === key) return;
    autoPlayed.current = key;
    void play(cur, 'original');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cur, capture, shadowDone]);

  useEffect(() => {
    if (cur !== null || finished.current) return;
    finished.current = true;
    onFinish(recallAccuracy(rs, carry));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  if (cur === null) return <p role="status" className="text-sm text-slate-600">카드를 모두 마쳤어요.</p>;
  const line = lines[cur];
  const v = line.verse;
  const busy = !!capture;
  const left = remainingCount(rs);
  const need = shadowCount(rs);

  const flip = () => { if (capture) stopRecording(); setPhase('back'); };
  const advance = (next: typeof rs) => { shadow.stopPlayback(); setRs(next); setShadowDone(0); setPhase('front'); };
  const grade = (ok: boolean) => {
    if (!rs.inPile && !(cur in rs.first)) onGrade(line, ok);
    if (ok) return advance(gradeCard(rs, true));
    baseClip.current = clips[cur]?.url;
    setShadowDone(0);
    setPhase('shadow');
  };
  const countShadow = () => {
    const n = shadowDone + 1;
    baseClip.current = clip?.url;
    if (n >= need) advance(gradeCard(rs, false)); else setShadowDone(n);
  };
  const later = () => {
    shadow.stopPlayback(); stopRecording();
    const remaining = remainingCards(rs);
    const acc = recallAccuracy(rs, carry);
    const redone = remaining.filter((i) => i in rs.first).length;
    onLater?.({ remaining: remaining.map((i) => lines[i].verse.zh), correct: acc.correct, total: acc.total - redone });
  };

  const answer = (
    <div className="space-y-1 text-center">
      <div lang="zh-Latn-pinyin" className="reading-pinyin">{v.pinyin}</div>
      <div lang="zh-Hans" className="font-hanzi text-3xl leading-snug">{v.zh}</div>
      <div className="text-sm text-slate-600">{v.ko}</div>
    </div>
  );
  const clip = clips[cur];
  const fresh = true; // 녹음은 선택 사항: 마이크 없이도 진행
  const playing = playback?.index === cur ? playback : null;

  return (
    <section className="space-y-3" aria-label="떠올리기 카드">
      <div role="status" className="flex items-center justify-between text-xs text-slate-500">
        <span>{rs.inPile ? '추가 학습' : '떠올리기'} · 남은 카드 {left}장</span>
        {onLater && <button type="button" className="underline" onClick={later}>나중에 하기</button>}
      </div>
      {shadow.error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{shadow.error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 min-h-[11rem] grid place-items-center">
        {phase === 'front' && (
          <div className="text-center space-y-3 w-full">
            {line.speaker && <div className="text-xs text-slate-500">{line.speaker}</div>}
            <div className="text-xl font-semibold leading-snug">{v.ko}</div>
            <p className="text-sm text-slate-500" role="status">
              {ready ? '소리 내어 말한 뒤 뒤집어 확인하세요.' : '한자를 떠올려 말할 준비를 해요…'}
            </p>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white font-semibold px-6 py-3 disabled:opacity-40" disabled={capture?.phase === 'requesting' || capture?.phase === 'saving'} onClick={flip}>
              <Icon name="refresh" size={16} /> {ready ? '뒤집기' : '준비됐어요 · 뒤집기'}
            </button>
          </div>
        )}
        {phase === 'back' && answer}
        {phase === 'shadow' && (
          <div className="space-y-3 w-full">
            {answer}
            <p className="text-sm text-center text-brand font-semibold" role="status">
              {capture?.phase === 'recording' ? '● 녹음 중 · 끝나면 녹음 끝' : `원문을 듣고 따라 말해요 (${shadowDone}/${need})`}
            </p>
          </div>
        )}
      </div>

      {phase !== 'front' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => void play(cur, 'original')}><Icon name="speaker" size={16} /> 원문 듣기</button>
          {phase === 'shadow' && canRecord && (capture ? (
            <button type="button" className={`${btn} border-red-500 text-red-700`} disabled={capture.phase === 'saving'} onClick={stopRecording}><Icon name="stop" size={16} /> 녹음 끝</button>
          ) : (
            <button type="button" className={btn} onClick={() => void startRecording(cur)}><Icon name="mic" size={16} /> {clip ? '다시 녹음' : '녹음'}</button>
          ))}
          <button type="button" className={btn} disabled={!clip || busy} onClick={() => void play(cur, 'mine')}><Icon name={playing?.mode === 'mine' ? 'stop' : 'play'} size={16} /> 내 소리</button>
          <button type="button" className={btn} disabled={!clip || busy} onClick={() => void play(cur, 'compare')}><Icon name="repeat" size={16} /> 번갈아 듣기</button>
        </div>
      )}

      {phase === 'back' && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" disabled={busy} onClick={() => grade(false)} className="rounded-2xl border-2 border-red-300 bg-red-50 text-red-700 font-bold text-lg py-4 disabled:opacity-40">못함</button>
          <button type="button" disabled={busy} onClick={() => grade(true)} className="rounded-2xl border-2 border-brand bg-brand-50 text-brand font-bold text-lg py-4 disabled:opacity-40">맞음</button>
        </div>
      )}
      {phase === 'shadow' && (
        <button type="button" disabled={busy || !fresh} onClick={countShadow} className="w-full rounded-2xl bg-brand text-white font-bold py-3 disabled:opacity-40">
          따라 했어요 ({shadowDone + 1}/{need})
        </button>
      )}
      {phase === 'shadow' && <p className="text-xs text-slate-500">녹음은 선택이에요. 소리 내어 따라 말한 뒤 눌러 주세요.</p>}
    </section>
  );
}
