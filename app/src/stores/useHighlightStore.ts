import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type Color = 'green' | 'yellow' | 'red'; // red = 북마크
type H = { marks: Record<string, Color>; cycle: (chunkId: string) => void };
const NEXT: Record<string, Color | undefined> = { none: 'green', green: 'yellow', yellow: 'red', red: undefined };
export const useHighlightStore = create<H>()(persist((set) => ({
  marks: {},
  cycle: (id) => set((s) => {
    const next = NEXT[s.marks[id] ?? 'none'];
    const marks = { ...s.marks };
    if (next) marks[id] = next; else delete marks[id];
    return { marks };
  }),
}), { name: 'chintalk-highlight' }));
