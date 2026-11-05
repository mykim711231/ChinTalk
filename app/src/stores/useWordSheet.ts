import { create } from 'zustand';
export type WordTarget = { zh: string; idx: number; py?: string };
export const useWordSheet = create<{ target: WordTarget | null; open: (t: WordTarget) => void; close: () => void }>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
