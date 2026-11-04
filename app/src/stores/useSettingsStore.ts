import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'md' | 'lg' | 'xl';
export type BlueLight = 0 | 1 | 2 | 3;
type Level = 1 | 2 | 3 | 4;
type ToggleKey = 'showZh' | 'showPinyin' | 'showKo';

type S = {
  showZh: boolean;
  showPinyin: boolean;
  showKo: boolean;
  fontSize: FontSize;
  blueLight: BlueLight;
  ttsRate: number;
  level: Level;
  toggle: (k: ToggleKey) => void;
  setLevel: (l: Level) => void;
  setFontSize: (f: FontSize) => void;
  setBlueLight: (b: BlueLight) => void;
  setTtsRate: (r: number) => void;
};

export const useSettingsStore = create<S>()(
  persist(
    (set) => ({
      showZh: true,
      showPinyin: true,
      showKo: true,
      fontSize: 'md',
      blueLight: 0,
      ttsRate: 1,
      level: 1,
      toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<S>),
      setLevel: (level) => set({ level }),
      setFontSize: (fontSize) => set({ fontSize }),
      setBlueLight: (blueLight) => set({ blueLight }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
    }),
    {
      name: 'chintalk-settings',
      version: 2,
      // v1 의 large(boolean) → fontSize
      migrate: (old) => {
        const o = (old ?? {}) as Record<string, unknown>;
        const { large, ...rest } = o;
        return { ...rest, fontSize: large ? 'lg' : 'md' } as unknown as S;
      },
    },
  ),
);
