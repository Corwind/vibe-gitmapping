import { create } from 'zustand';
import type { Vec3 } from '../types';
import { DEFAULT_CAMERA_DISTANCE } from '../utils/constants';

export type CameraMode = 'orbit' | 'tracking';

export interface CameraState {
  mode: CameraMode;
  target: Vec3;
  distance: number;
  autoTrackTarget: Vec3;
}

export interface CameraActions {
  setMode: (mode: CameraMode) => void;
  toggleMode: () => void;
  setTarget: (target: Vec3) => void;
  setDistance: (distance: number) => void;
  setAutoTrackTarget: (target: Vec3) => void;
}

export const useCameraStore = create<CameraState & CameraActions>()((set) => ({
  mode: 'orbit',
  target: [0, 0, 0],
  distance: DEFAULT_CAMERA_DISTANCE,
  autoTrackTarget: [0, 0, 0],
  setMode: (mode: CameraMode): void => set({ mode }),
  toggleMode: (): void =>
    set((s) => ({ mode: s.mode === 'orbit' ? 'tracking' : 'orbit' })),
  setTarget: (target: Vec3): void => set({ target }),
  setDistance: (distance: number): void => set({ distance }),
  setAutoTrackTarget: (target: Vec3): void => set({ autoTrackTarget: target }),
}));
