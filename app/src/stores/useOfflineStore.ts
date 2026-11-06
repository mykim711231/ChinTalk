import { create } from 'zustand';

type OfflineState = {
  core: 'preparing' | 'ready' | 'error' | 'unsupported';
  audio: 'idle' | 'downloading' | 'ready' | 'paused' | 'offline' | 'error';
  done: number;
  total: number;
  failed: number;
  updateReady: boolean;
  playbackError: string | null;
};

export const useOfflineStore = create<OfflineState>(() => ({
  core: 'preparing', audio: 'idle', done: 0, total: 0, failed: 0, updateReady: false, playbackError: null,
}));
