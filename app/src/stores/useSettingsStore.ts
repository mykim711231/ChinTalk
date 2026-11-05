import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'md' | 'lg' | 'xl';
export type BlueLight = 0 | 1 | 2 | 3;
type Level = 1 | 2 | 3 | 4;
type ToggleKey = 'showZh' | 'showPinyin' | 'showKo';
/** 끊어 읽기 단위: 0=끔, 1=초급, 2=중급, 3=고급 */
export type BreakLevel = 0 | 1 | 2 | 3;

type S = {
  showZh: boolean;
  showPinyin: boolean;
  showKo: boolean;
  /** 끊어 읽기 단위(0=끔, 1=초급, 2=중급, 3=고급) */
  breakLevel: BreakLevel;
  fontSize: FontSize;
  blueLight: BlueLight;
  ttsRate: number;
  level: Level;
  onboarded: boolean;
  /** 데일리·편하게 듣기·마스터리에서 중국어 뒤에 한글 번역을 읽어 줌 */
  koVoice: boolean;
  setKoVoice: (v: boolean) => void;
  /** 설치 안내 "다시 보지 않기"/닫은 시각(ms), 7일 후 재표시 */
  installDismissedAt: number;
  setOnboarded: (v: boolean) => void;
  dismissInstall: () => void;
  toggle: (k: ToggleKey) => void;
  setLevel: (l: Level) => void;
  setFontSize: (f: FontSize) => void;
  setBlueLight: (b: BlueLight) => void;
  setTtsRate: (r: number) => void;
  setBreakLevel: (l: BreakLevel) => void;
};

export const useSettingsStore = create<S>()(
  persist(
    (set) => ({
      showZh: true,
      showPinyin: true,
      showKo: true,
      breakLevel: 0,
      fontSize: 'md',
      blueLight: 0,
      ttsRate: 1,
      level: 1,
      onboarded: false,
      koVoice: false,
      setKoVoice: (koVoice) => set({ koVoice }),
      installDismissedAt: 0,
      setOnboarded: (onboarded) => set({ onboarded }),
      dismissInstall: () => set({ installDismissedAt: Date.now() }),
      toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<S>),
      setLevel: (level) => set({ level }),
      setFontSize: (fontSize) => set({ fontSize }),
      setBlueLight: (blueLight) => set({ blueLight }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
      setBreakLevel: (breakLevel) => set({ breakLevel }),
    }),
    {
      name: 'chintalk-settings',
      version: 3,
      // v1 의 large(boolean) → fontSize, v2 의 showBreaks(boolean) → breakLevel
      migrate: (old) => {
        const o = (old ?? {}) as Record<string, unknown>;
        const { large, showBreaks, ...rest } = o;
        return { ...rest, fontSize: large ? 'lg' : 'md', breakLevel: showBreaks ? 3 : 0 } as unknown as S;
      },
    },
  ),
);
