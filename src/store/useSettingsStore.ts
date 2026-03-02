import { create } from 'zustand';

export type ColorScheme = 'language' | 'author' | 'age';

export interface SettingsState {
  showFileLabels: boolean;
  showDirectoryNames: boolean;
  showEdges: boolean;
  showBloom: boolean;
  autoCamera: boolean;
  colorScheme: ColorScheme;
  fileFilter: string;
  authorFilter: string;
  fullscreen: boolean;
}

export interface SettingsActions {
  toggleFileLabels: () => void;
  toggleDirectoryNames: () => void;
  toggleEdges: () => void;
  toggleBloom: () => void;
  toggleAutoCamera: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFileFilter: (filter: string) => void;
  setAuthorFilter: (author: string) => void;
  toggleFullscreen: () => void;
  setFullscreen: (fs: boolean) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()((set) => ({
  showFileLabels: true,
  showDirectoryNames: true,
  showEdges: true,
  showBloom: false,
  autoCamera: false,
  colorScheme: 'language',
  fileFilter: '',
  authorFilter: '',
  fullscreen: false,
  toggleFileLabels: (): void => set((s) => ({ showFileLabels: !s.showFileLabels })),
  toggleDirectoryNames: (): void => set((s) => ({ showDirectoryNames: !s.showDirectoryNames })),
  toggleEdges: (): void => set((s) => ({ showEdges: !s.showEdges })),
  toggleBloom: (): void => set((s) => ({ showBloom: !s.showBloom })),
  toggleAutoCamera: (): void => set((s) => ({ autoCamera: !s.autoCamera })),
  setColorScheme: (scheme: ColorScheme): void => set({ colorScheme: scheme }),
  setFileFilter: (filter: string): void => set({ fileFilter: filter }),
  setAuthorFilter: (author: string): void => set({ authorFilter: author }),
  toggleFullscreen: (): void => set((s) => ({ fullscreen: !s.fullscreen })),
  setFullscreen: (fs: boolean): void => set({ fullscreen: fs }),
}));
