import { useCallback, useEffect, useRef, useState } from 'react';
import { speakAsync, stopSpeak } from '../lib/tts';
import { LISTENING_PASSES, type ListeningPass } from '../lib/learningListening';
import { useOfflineStore } from '../stores/useOfflineStore';
import type { Verse } from '../types/lesson';

/** 0..n-1 순서. shuffle 이면 섞되 원래 순서와 같아지지 않게 한다. */
function order(n: number, shuffle: boolean): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  if (!shuffle || n < 2) return a;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

/** 표시 전환은 학습 화면 안에서만 적용하고 저장된 표시 설정은 바꾸지 않는다. */
export function useLessonPlayback(verses: Verse[], scope: string, passes: ListeningPass[] = LISTENING_PASSES) {
  const [current, setCurrent] = useState<{ index: number; pass: number | null; step: number } | null>(null);
  const [completed, setCompleted] = useState(false);
  const token = useRef(0);
  const stop = useCallback(() => {
    token.current++;
    stopSpeak();
    setCurrent(null);
    setCompleted(false);
  }, []);

  useEffect(() => {
    setCurrent(null);
    setCompleted(false);
    return () => { token.current++; stopSpeak(); };
  }, [scope]);

  const play = async (mode: 'once' | 'learning', opts: { withKo?: boolean } = {}) => {
    if (!verses.length) return;
    const my = ++token.current;
    stopSpeak();
    setCompleted(false);
    const rounds = mode === 'learning' ? passes.length : 1;
    try {
      for (let pass = 0; pass < rounds; pass++) {
        const cfg = mode === 'learning' ? passes[pass] : undefined;
        const seq = order(verses.length, !!cfg?.shuffle);
        for (let step = 0; step < seq.length; step++) {
          const index = seq[step];
          if (token.current !== my) return;
          setCurrent({ index, pass: cfg ? pass : null, step });
          const lead = cfg ? (cfg.leadMs ?? 0) + (cfg.leadPerChar ?? 0) * (verses[index].zh.match(/[一-鿿]/g)?.length ?? 0) : 0;
          if (lead) { await new Promise((resolve) => setTimeout(resolve, lead)); if (token.current !== my) return; }
          const startedAt = Date.now();
          await speakAsync(verses[index].zh);
          const spent = Date.now() - startedAt;
          if (token.current !== my || useOfflineStore.getState().playbackError) return;
          // 한글 해설: 음원이 없으면 한국어 기기 음성으로 읽는다. 괄호 보충설명은 읽지 않는다.
          if (opts.withKo && mode === 'once' && verses[index].ko) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            if (token.current !== my) return;
            await speakAsync(verses[index].ko, 1, 'ko');
            if (token.current !== my || useOfflineStore.getState().playbackError) return;
          }
          if (step < seq.length - 1 || pass < rounds - 1) {
            await new Promise((resolve) => setTimeout(resolve, cfg?.shadow ? spent + 500 : 1000));
          }
        }
      }
      if (token.current === my && mode === 'learning') setCompleted(true);
    } catch {
      if (token.current === my) useOfflineStore.setState({ playbackError: '음성을 재생하지 못했어요. 음성 설정을 확인한 후 다시 들어 주세요.' });
    } finally {
      if (token.current === my) setCurrent(null);
    }
  };

  const pass = current?.pass ?? null;
  return {
    playing: current?.index ?? -1,
    step: current?.step ?? -1,
    pass,
    display: pass === null ? undefined : passes[pass].display,
    passLabel: pass === null ? null : passes[pass].label,
    completed,
    play,
    stop,
  };
}
