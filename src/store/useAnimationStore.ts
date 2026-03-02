import { create } from 'zustand';
import { DEFAULT_SECONDS_PER_DAY } from '../utils/constants';

export interface AnimationState {
  playing: boolean;
  currentTimestamp: number;
  secondsPerDay: number;
}

export interface AnimationActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setCurrentTimestamp: (ts: number) => void;
  setSecondsPerDay: (spd: number) => void;
}

export const useAnimationStore = create<AnimationState & AnimationActions>()((set) => ({
  playing: false,
  currentTimestamp: 0,
  secondsPerDay: DEFAULT_SECONDS_PER_DAY,
  play: (): void => set({ playing: true }),
  pause: (): void => set({ playing: false }),
  toggle: (): void => set((s) => ({ playing: !s.playing })),
  setCurrentTimestamp: (ts: number): void => set({ currentTimestamp: ts }),
  setSecondsPerDay: (spd: number): void => set({ secondsPerDay: spd }),
}));
