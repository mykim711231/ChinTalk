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

let audio: HTMLAudioElement | null = null;
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function stopSpeak() {
  if (audio) { audio.pause(); audio = null; }
  if (ttsSupported()) window.speechSynthesis.cancel();
}

function speakFallback(text: string, rate: number) {
  if (!ttsSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

export async function speak(text: string, rate: number = useSettingsStore.getState().ttsRate) {
  stopSpeak();
  const file = (await loadManifest())[normalize(text)];
  if (!file) return speakFallback(text, rate);
  const a = new Audio(`${B}tts/${file}`);
  a.playbackRate = rate;
  audio = a;
  a.onerror = () => { if (audio === a) speakFallback(text, rate); };
  a.play().catch(() => speakFallback(text, rate));
}
