import { create } from 'zustand';
import type { FileNode, DirNode, Contributor } from '../types';

export interface TreeState {
  files: Map<string, FileNode>;
  dirs: Map<string, DirNode>;
  contributors: Map<string, Contributor>;
  selectedFileId: string | null;
}

export interface TreeActions {
  reset: () => void;
  setSelectedFileId: (id: string | null) => void;
}

const initialState: TreeState = {
  files: new Map(),
  dirs: new Map(),
  contributors: new Map(),
  selectedFileId: null,
};

export const useTreeStore = create<TreeState & TreeActions>()((set) => ({
  ...initialState,
  reset: (): void => set({ ...initialState, files: new Map(), dirs: new Map(), contributors: new Map() }),
  setSelectedFileId: (id: string | null): void => set({ selectedFileId: id }),
}));
