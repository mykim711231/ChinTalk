import { useCallback, useEffect, useRef, useState } from 'react';
import { speakAsync, stopSpeak } from '../lib/tts';
import { useOfflineStore } from '../stores/useOfflineStore';
import type { StudyLine } from '../lib/studyContent';

type Clip = { url: string; seconds: number };
type Capture = { index: number; phase: 'requesting' | 'recording' | 'saving' };
type Playback = { index: number; mode: 'original' | 'mine' | 'compare'; part: 'original' | 'mine' };

/** 녹음은 같은 과·대상의 단계 사이에서 유지하고, 학습을 나가면 해제한다. */
export function useShadowing(lines: StudyLine[], beforeAction: () => void) {
  const [clips, setClips] = useState<Record<number, Clip>>({});
  const [capture, setCapture] = useState<Capture | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'microphone' | 'playback'>('microphone');
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const mounted = useRef(true);
  const saved = useRef<Record<number, Clip>>({});
  const captureRef = useRef<Capture | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const captureToken = useRef(0);
  const started = useRef(0);
  const stopped = useRef(0);
  const playToken = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const finishAudio = useRef<(() => void) | null>(null);
  const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const releaseMic = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);
  const updateCapture = (value: Capture | null) => {
    captureRef.current = value;
    if (mounted.current) setCapture(value);
  };
  const stopPlayback = useCallback(() => {
    playToken.current++;
    stopSpeak();
    const current = audio.current;
    audio.current = null;
    if (current) {
      current.onended = current.onerror = null;
      current.pause();
      current.removeAttribute('src');
      current.load();
    }
    finishAudio.current?.();
    finishAudio.current = null;
    if (mounted.current) setPlayback(null);
  }, []);

  const stopRecording = () => {
    const current = captureRef.current;
    if (!current || current.phase === 'saving') return;
    if (current.phase === 'requesting') {
      captureToken.current++;
      updateCapture(null);
    } else {
      stopped.current = Date.now();
      updateCapture({ index: current.index, phase: 'saving' });
      if (recorder.current?.state !== 'inactive') recorder.current?.stop();
    }
    releaseMic();
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      captureToken.current++;
      stopPlayback();
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
      releaseMic();
      Object.values(saved.current).forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [releaseMic, stopPlayback]);
  useEffect(() => {
    if (capture?.phase !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((Date.now() - started.current) / 1000), 250);
    return () => window.clearInterval(timer);
  }, [capture]);

  const startRecording = async (index: number) => {
    if (!canRecord || captureRef.current) return;
    beforeAction();
    stopPlayback();
    setError(null);
    setErrorKind('microphone');
    setSeconds(0);
    updateCapture({ index, phase: 'requesting' });
    const token = ++captureToken.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || token !== captureToken.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setMicPermission('granted');
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      let failed = false;
      rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      rec.onerror = () => {
        if (!mounted.current || token !== captureToken.current) return;
        failed = true;
        releaseMic();
        setError('녹음이 중단됐어요. 마이크 연결을 확인한 후 다시 녹음해 주세요.');
        updateCapture(null);
      };
      rec.onstop = () => {
        if (!mounted.current || token !== captureToken.current) return;
        releaseMic();
        recorder.current = null;
        if (!failed) {
          const blob = new Blob(chunks, { type: rec.mimeType || chunks[0]?.type || '' });
          if (blob.size) {
            const clip = { url: URL.createObjectURL(blob), seconds: ((stopped.current || Date.now()) - started.current) / 1000 };
            const previous = saved.current[index];
            if (previous) URL.revokeObjectURL(previous.url);
            saved.current = { ...saved.current, [index]: clip };
            setClips(saved.current);
          } else setError('녹음된 소리가 없어요. 잠시 말한 후 녹음 끝을 눌러 주세요.');
        }
        updateCapture(null);
      };
      recorder.current = rec;
      rec.start();
      started.current = Date.now();
      stopped.current = 0;
      updateCapture({ index, phase: 'recording' });
    } catch (cause) {
      if (!mounted.current || token !== captureToken.current) return;
      releaseMic();
      recorder.current = null;
      updateCapture(null);
      const name = cause instanceof DOMException ? cause.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setMicPermission('denied');
      setError(name === 'NotAllowedError' || name === 'SecurityError'
        ? '마이크 권한이 꺼져 있어요. 브라우저의 사이트 설정에서 마이크를 허용한 후 다시 눌러 주세요.'
        : name === 'NotFoundError'
          ? '마이크를 찾지 못했어요. 마이크 연결을 확인한 후 다시 눌러 주세요.'
          : '마이크를 사용할 수 없어요. 다른 앱의 녹음을 종료한 후 다시 시도해 주세요.');
    }
  };

  const checkMicrophone = async () => {
    if (!canRecord || captureRef.current) return;
    beforeAction();
    stopPlayback();
    setError(null);
    setErrorKind('microphone');
    updateCapture({ index: -1, phase: 'requesting' });
    const token = ++captureToken.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      media.getTracks().forEach((track) => track.stop());
      if (!mounted.current || token !== captureToken.current) return;
      setMicPermission('granted');
      updateCapture(null);
    } catch {
      if (!mounted.current || token !== captureToken.current) return;
      setMicPermission('denied');
      setError('마이크 권한을 확인하지 못했어요. 사이트 설정에서 마이크를 허용하고, 연결된 마이크가 있는지 확인해 주세요.');
      updateCapture(null);
    }
  };

  const playMine = (index: number, token: number): Promise<void> => new Promise((resolve) => {
    const clip = saved.current[index];
    if (!clip || token !== playToken.current || !mounted.current) return resolve();
    const current = new Audio(clip.url);
    audio.current = current;
    const finish = () => {
      if (finishAudio.current === finish) finishAudio.current = null;
      if (audio.current === current) audio.current = null;
      current.onended = current.onerror = null;
      resolve();
    };
    finishAudio.current = finish;
    const fail = () => {
      if (mounted.current && token === playToken.current) setError('내 소리를 재생하지 못했어요. 내 소리 버튼을 다시 누르거나 다시 녹음해 주세요.');
      finish();
    };
    current.onended = finish;
    current.onerror = fail;
    current.play().catch(fail);
  });
  const play = async (index: number, mode: Playback['mode']) => {
    if (captureRef.current) return;
    beforeAction();
    stopPlayback();
    setError(null);
    setErrorKind('playback');
    const token = playToken.current;
    setPlayback({ index, mode, part: mode === 'mine' ? 'mine' : 'original' });
    if (mode !== 'mine') {
      await speakAsync(lines[index].verse.zh);
      if (!mounted.current || token !== playToken.current) return;
      if (useOfflineStore.getState().playbackError) { setPlayback(null); return; }
    }
    if (mode !== 'original') {
      setPlayback({ index, mode, part: 'mine' });
      await playMine(index, token);
    }
    if (mounted.current && token === playToken.current) setPlayback(null);
  };

  return { clips, capture, playback, seconds, error, errorKind, canRecord, micPermission, checkMicrophone, startRecording, stopRecording, stopPlayback, play };
}

export type ShadowingController = ReturnType<typeof useShadowing>;
