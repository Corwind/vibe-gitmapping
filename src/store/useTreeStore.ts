import { create } from 'zustand';
import type { FileNode, DirNode } from '../types';

export interface TreeState {
  files: Map<string, FileNode>;
  dirs: Map<string, DirNode>;
}

export interface TreeActions {
  reset: () => void;
}

const initialState: TreeState = {
  files: new Map(),
  dirs: new Map(),
};

export const useTreeStore = create<TreeState & TreeActions>()((set) => ({
  ...initialState,
  reset: (): void => set(initialState),
}));
