import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type P = { done: Record<string, true>; last?: string; markDone: (id: string) => void; setLast: (id: string) => void };
export const useProgressStore = create<P>()(persist((set) => ({
  done: {},
  markDone: (id) => set((s) => ({ done: { ...s.done, [id]: true } })),
  setLast: (last) => set({ last }),
}), { name: 'chintalk-progress' }));
