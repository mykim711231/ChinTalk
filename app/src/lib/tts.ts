// 1차: 사전 합성 mp3 (manifest 조회) / 2차: Web Speech 폴백 (§9.1)
import { useSettingsStore } from '../stores/useSettingsStore';
const B = import.meta.env.BASE_URL;
// scripts/tts-texts.ts 의 normalizeTts 와 동일해야 한다
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

type Manifest = Record<string, string>;
let manifestP: Promise<Manifest> | null = null;
const loadManifest = (): Promise<Manifest> =>
  (manifestP ??= fetch(`${B}data/zh-tts-manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : ({} as Manifest)))
    .catch(() => ({} as Manifest)));

export const mp3Url = async (text: string): Promise<string | null> => {
  const f = (await loadManifest())[normalize(text)];
  return f ? `${B}tts/${f}` : null;
};

let audio: HTMLAudioElement | null = null;
let settle: (() => void) | null = null; // 진행 중인 speakAsync 를 끝낸다
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function stopSpeak() {
  if (audio) { audio.pause(); audio = null; }
  if (ttsSupported()) window.speechSynthesis.cancel();
  const s = settle; settle = null; s?.();
}

function speakFallback(text: string, rate: number, done?: () => void) {
  if (!ttsSupported()) return done?.();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = rate;
  if (done) { u.onend = done; u.onerror = done; }
  window.speechSynthesis.speak(u);
}

/** 재생이 끝나거나(또는 stopSpeak 로 중단되면) resolve 된다. */
export async function speakAsync(text: string, rate: number = useSettingsStore.getState().ttsRate): Promise<void> {
  stopSpeak();
  const url = await mp3Url(text);
  return new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => { if (!finished) { finished = true; if (settle === finish) settle = null; resolve(); } };
    settle = finish;
    if (!url) return speakFallback(text, rate, finish);
    const a = new Audio(url);
    a.playbackRate = rate;
    audio = a;
    a.onended = () => { if (audio === a) audio = null; finish(); };
    a.onerror = () => { if (audio === a) { audio = null; speakFallback(text, rate, finish); } };
    a.play().catch(() => { if (audio === a) audio = null; speakFallback(text, rate, finish); });
  });
}

export async function speak(text: string, rate: number = useSettingsStore.getState().ttsRate) {
  void speakAsync(text, rate);
}

// ── 편하게 듣기 전용: mp3 만 재생(Web Speech 폴백 금지, §6.8), 백그라운드 재생 가능 ──
let passive: HTMLAudioElement | null = null;
export const getPassiveAudio = () => (passive ??= new Audio());
/** mp3 가 있으면 재생 후 true, 없으면 false (건너뛴다). 중단되면 true. */
export async function playMp3Only(text: string, rate: number): Promise<boolean> {
  const url = await mp3Url(text);
  if (!url) return false;
  const a = getPassiveAudio();
  return new Promise<boolean>((resolve) => {
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.onpause = () => { if (a.ended) return; };
    a.src = url;
    a.playbackRate = rate;
    a.play().catch(() => resolve(false));
    stopCurrent = () => resolve(true);
  });
}
let stopCurrent: (() => void) | null = null;
export function stopPassive() {
  const a = passive;
  if (a) { a.onended = null; a.onerror = null; a.pause(); }
  const s = stopCurrent; stopCurrent = null; s?.();
}
