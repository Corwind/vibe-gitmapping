import { create } from 'zustand';
import type { Commit, InputSource } from '../types';
import { DEFAULT_SECONDS_PER_DAY } from '../utils/constants';

export interface AnimationState {
  playing: boolean;
  currentTimestamp: number;
  secondsPerDay: number;
  commits: Commit[];
  timeRange: { start: number; end: number } | null;
  currentCommitIndex: number;
  inputSource: InputSource | null;
  loading: boolean;
  error: string | null;
}

export interface AnimationActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setCurrentTimestamp: (ts: number) => void;
  setSecondsPerDay: (spd: number) => void;
  setCommits: (commits: Commit[]) => void;
  setCurrentCommitIndex: (idx: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setInputSource: (source: InputSource | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AnimationState = {
  playing: false,
  currentTimestamp: 0,
  secondsPerDay: DEFAULT_SECONDS_PER_DAY,
  commits: [],
  timeRange: null,
  currentCommitIndex: 0,
  inputSource: null,
  loading: false,
  error: null,
};

export const useAnimationStore = create<AnimationState & AnimationActions>()((set, get) => ({
  ...initialState,
  play: (): void => set({ playing: true }),
  pause: (): void => set({ playing: false }),
  toggle: (): void => set((s) => ({ playing: !s.playing })),
  setCurrentTimestamp: (ts: number): void => set({ currentTimestamp: ts }),
  setSecondsPerDay: (spd: number): void => set({ secondsPerDay: spd }),
  setCommits: (commits: Commit[]): void => {
    if (commits.length === 0) {
      set({ commits, timeRange: null, currentCommitIndex: 0, currentTimestamp: 0 });
      return;
    }
    const start = commits[0].timestamp;
    const end = commits[commits.length - 1].timestamp;
    set({
      commits,
      timeRange: { start, end },
      currentTimestamp: start,
      currentCommitIndex: 0,
    });
  },
  setCurrentCommitIndex: (idx: number): void => {
    const { commits } = get();
    if (idx >= 0 && idx < commits.length) {
      set({ currentCommitIndex: idx, currentTimestamp: commits[idx].timestamp });
    }
  },
  stepForward: (): void => {
    const { currentCommitIndex, commits } = get();
    if (currentCommitIndex < commits.length - 1) {
      const next = currentCommitIndex + 1;
      set({ currentCommitIndex: next, currentTimestamp: commits[next].timestamp });
    }
  },
  stepBackward: (): void => {
    const { currentCommitIndex, commits } = get();
    if (currentCommitIndex > 0) {
      const prev = currentCommitIndex - 1;
      set({ currentCommitIndex: prev, currentTimestamp: commits[prev].timestamp });
    }
  },
  setInputSource: (source: InputSource | null): void => set({ inputSource: source }),
  setLoading: (loading: boolean): void => set({ loading }),
  setError: (error: string | null): void => set({ error }),
  reset: (): void => set(initialState),
}));
