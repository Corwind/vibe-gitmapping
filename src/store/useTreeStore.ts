import { create } from 'zustand';
import type { FileNode, DirNode, Contributor } from '../types';

export interface TreeState {
  files: Map<string, FileNode>;
  dirs: Map<string, DirNode>;
  contributors: Map<string, Contributor>;
  selectedFileId: string | null;
  hoveredFileId: string | null;
  hoveredContributorName: string | null;
}

export interface TreeActions {
  reset: () => void;
  setSelectedFileId: (id: string | null) => void;
  setHoveredFileId: (id: string | null) => void;
  setHoveredContributorName: (name: string | null) => void;
  setFiles: (files: Map<string, FileNode>) => void;
  setDirs: (dirs: Map<string, DirNode>) => void;
  setContributors: (contributors: Map<string, Contributor>) => void;
}

const initialState: TreeState = {
  files: new Map(),
  dirs: new Map(),
  contributors: new Map(),
  selectedFileId: null,
  hoveredFileId: null,
  hoveredContributorName: null,
};

export const useTreeStore = create<TreeState & TreeActions>()((set) => ({
  ...initialState,
  reset: (): void =>
    set({
      ...initialState,
      files: new Map(),
      dirs: new Map(),
      contributors: new Map(),
    }),
  setSelectedFileId: (id: string | null): void => set({ selectedFileId: id }),
  setHoveredFileId: (id: string | null): void => set({ hoveredFileId: id }),
  setHoveredContributorName: (name: string | null): void => set({ hoveredContributorName: name }),
  setFiles: (files: Map<string, FileNode>): void => set({ files }),
  setDirs: (dirs: Map<string, DirNode>): void => set({ dirs }),
  setContributors: (contributors: Map<string, Contributor>): void => set({ contributors }),
}));
