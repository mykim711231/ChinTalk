import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type Color = 'green' | 'yellow' | 'red'; // red = 북마크
type H = {
  marks: Record<string, Color>;
  cycle: (chunkId: string) => void;
  /** 이미 다른 색이어도 빨강으로 (데일리 '표현 확인'용). 이미 빨강이면 해제 */
  toggleRed: (chunkId: string) => void;
};
const NEXT: Record<string, Color | undefined> = { none: 'green', green: 'yellow', yellow: 'red', red: undefined };
export const useHighlightStore = create<H>()(persist((set) => ({
  marks: {},
  cycle: (id) => set((s) => {
    const next = NEXT[s.marks[id] ?? 'none'];
    const marks = { ...s.marks };
    if (next) marks[id] = next; else delete marks[id];
    return { marks };
  }),
  toggleRed: (id) => set((s) => {
    const marks = { ...s.marks };
    if (marks[id] === 'red') delete marks[id]; else marks[id] = 'red';
    return { marks };
  }),
}), { name: 'chintalk-highlight' }));
