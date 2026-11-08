import { useCallback, useEffect, useRef, useState } from 'react';
import { speakAsync, stopSpeak } from '../lib/tts';
import { LISTENING_PASSES, type ListeningPass } from '../lib/learningListening';
import { useOfflineStore } from '../stores/useOfflineStore';
import type { Verse } from '../types/lesson';

/** 표시 전환은 학습 화면 안에서만 적용하고 저장된 표시 설정은 바꾸지 않는다. */
export function useLessonPlayback(verses: Verse[], scope: string, passes: ListeningPass[] = LISTENING_PASSES) {
  const [current, setCurrent] = useState<{ index: number; pass: number | null } | null>(null);
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

  const play = async (mode: 'once' | 'learning') => {
    if (!verses.length) return;
    const my = ++token.current;
    stopSpeak();
    setCompleted(false);
    const rounds = mode === 'learning' ? passes.length : 1;
    try {
      for (let pass = 0; pass < rounds; pass++) {
        for (let index = 0; index < verses.length; index++) {
          if (token.current !== my) return;
          setCurrent({ index, pass: mode === 'learning' ? pass : null });
          const lead = mode === 'learning' ? passes[pass].leadMs ?? 0 : 0;
          if (lead) { await new Promise((resolve) => setTimeout(resolve, lead)); if (token.current !== my) return; }
          await speakAsync(verses[index].zh);
          if (token.current !== my || useOfflineStore.getState().playbackError) return;
          if (index < verses.length - 1 || pass < rounds - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
    pass,
    display: pass === null ? undefined : passes[pass].display,
    passLabel: pass === null ? null : passes[pass].label,
    completed,
    play,
    stop,
  };
}
