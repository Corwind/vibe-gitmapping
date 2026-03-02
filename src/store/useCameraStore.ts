import { create } from 'zustand';
import type { Vec3 } from '../types';
import { DEFAULT_CAMERA_DISTANCE } from '../utils/constants';

export type CameraMode = 'overview' | 'tracking';

export interface CameraState {
  mode: CameraMode;
  target: Vec3;
  distance: number;
}

export interface CameraActions {
  setMode: (mode: CameraMode) => void;
  setTarget: (target: Vec3) => void;
  setDistance: (distance: number) => void;
}

export const useCameraStore = create<CameraState & CameraActions>()((set) => ({
  mode: 'overview',
  target: [0, 0, 0],
  distance: DEFAULT_CAMERA_DISTANCE,
  setMode: (mode: CameraMode): void => set({ mode }),
  setTarget: (target: Vec3): void => set({ target }),
  setDistance: (distance: number): void => set({ distance }),
}));
