import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../src/store/useAnimationStore';
import { useCameraStore } from '../src/store/useCameraStore';
import { useTreeStore } from '../src/store/useTreeStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { DEFAULT_CAMERA_DISTANCE, DEFAULT_SECONDS_PER_DAY } from '../src/utils/constants';
import type { Commit } from '../src/types';

describe('useAnimationStore — extended', () => {
  beforeEach(() => {
    useAnimationStore.getState().reset();
  });

  it('reset restores all fields to default', () => {
    const store = useAnimationStore.getState();
    store.play();
    store.setCommits([
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
    ]);
    store.setSecondsPerDay(5);
    store.setLoading(true);
    store.setError('test error');
    store.setInputSource({ type: 'paste' });

    store.reset();
    const state = useAnimationStore.getState();
    expect(state.playing).toBe(false);
    expect(state.currentTimestamp).toBe(0);
    expect(state.secondsPerDay).toBe(DEFAULT_SECONDS_PER_DAY);
    expect(state.commits).toEqual([]);
    expect(state.timeRange).toBeNull();
    expect(state.currentCommitIndex).toBe(0);
    expect(state.inputSource).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setSecondsPerDay changes speed', () => {
    useAnimationStore.getState().setSecondsPerDay(10);
    expect(useAnimationStore.getState().secondsPerDay).toBe(10);
    useAnimationStore.getState().setSecondsPerDay(0.1);
    expect(useAnimationStore.getState().secondsPerDay).toBe(0.1);
  });

  it('setCurrentTimestamp updates timestamp', () => {
    useAnimationStore.getState().setCurrentTimestamp(5000);
    expect(useAnimationStore.getState().currentTimestamp).toBe(5000);
  });

  it('multiple stepForward calls advance correctly', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'A', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'B', files: [{ action: 'A', path: 'b.ts' }] },
      { timestamp: 3000, author: 'C', files: [{ action: 'A', path: 'c.ts' }] },
      { timestamp: 4000, author: 'D', files: [{ action: 'A', path: 'd.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);

    useAnimationStore.getState().stepForward();
    useAnimationStore.getState().stepForward();
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(3);
    expect(useAnimationStore.getState().currentTimestamp).toBe(4000);

    // One more should not advance
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(3);
  });

  it('setCurrentCommitIndex jumps to specific commit', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'A', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'B', files: [{ action: 'A', path: 'b.ts' }] },
      { timestamp: 3000, author: 'C', files: [{ action: 'A', path: 'c.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().setCurrentCommitIndex(2);
    expect(useAnimationStore.getState().currentTimestamp).toBe(3000);
  });

  it('setInputSource stores different source types', () => {
    useAnimationStore.getState().setInputSource({ type: 'url', url: 'https://example.com' });
    expect(useAnimationStore.getState().inputSource).toEqual({
      type: 'url',
      url: 'https://example.com',
    });

    useAnimationStore.getState().setInputSource(null);
    expect(useAnimationStore.getState().inputSource).toBeNull();
  });
});

describe('useCameraStore — extended', () => {
  it('starts with correct defaults', () => {
    const state = useCameraStore.getState();
    expect(state.mode).toBe('orbit');
    expect(state.target).toEqual([0, 0, 0]);
    expect(state.distance).toBe(DEFAULT_CAMERA_DISTANCE);
    expect(state.autoTrackTarget).toEqual([0, 0, 0]);
  });

  it('setMode changes mode directly', () => {
    useCameraStore.getState().setMode('tracking');
    expect(useCameraStore.getState().mode).toBe('tracking');
    useCameraStore.getState().setMode('orbit');
    expect(useCameraStore.getState().mode).toBe('orbit');
  });

  it('setDistance updates camera distance', () => {
    useCameraStore.getState().setDistance(100);
    expect(useCameraStore.getState().distance).toBe(100);
    useCameraStore.getState().setDistance(5);
    expect(useCameraStore.getState().distance).toBe(5);
  });

  it('setTarget updates camera target', () => {
    useCameraStore.getState().setTarget([10, 20, 30]);
    expect(useCameraStore.getState().target).toEqual([10, 20, 30]);
  });

  it('toggleMode cycles between orbit and tracking', () => {
    useCameraStore.getState().setMode('orbit');
    useCameraStore.getState().toggleMode();
    expect(useCameraStore.getState().mode).toBe('tracking');
    useCameraStore.getState().toggleMode();
    expect(useCameraStore.getState().mode).toBe('orbit');
    useCameraStore.getState().toggleMode();
    expect(useCameraStore.getState().mode).toBe('tracking');
  });
});

describe('useTreeStore — extended', () => {
  beforeEach(() => {
    useTreeStore.getState().reset();
  });

  it('reset clears all maps', () => {
    const state = useTreeStore.getState();
    expect(state.files.size).toBe(0);
    expect(state.dirs.size).toBe(0);
    expect(state.contributors.size).toBe(0);
    expect(state.selectedFileId).toBeNull();
  });

  it('reset creates fresh Map instances', () => {
    const filesBefore = useTreeStore.getState().files;
    useTreeStore.getState().reset();
    const filesAfter = useTreeStore.getState().files;
    expect(filesBefore).not.toBe(filesAfter);
  });

  it('selectedFileId can be set and cleared multiple times', () => {
    useTreeStore.getState().setSelectedFileId('file1');
    expect(useTreeStore.getState().selectedFileId).toBe('file1');
    useTreeStore.getState().setSelectedFileId('file2');
    expect(useTreeStore.getState().selectedFileId).toBe('file2');
    useTreeStore.getState().setSelectedFileId(null);
    expect(useTreeStore.getState().selectedFileId).toBeNull();
  });
});

describe('useSettingsStore — extended', () => {
  it('all toggles flip their respective booleans', () => {
    const store = useSettingsStore.getState();
    const initial = {
      showFileLabels: store.showFileLabels,
      showDirectoryNames: store.showDirectoryNames,
      showEdges: store.showEdges,
      showBloom: store.showBloom,
      autoCamera: store.autoCamera,
      fullscreen: store.fullscreen,
    };

    store.toggleFileLabels();
    expect(useSettingsStore.getState().showFileLabels).toBe(!initial.showFileLabels);

    store.toggleDirectoryNames();
    expect(useSettingsStore.getState().showDirectoryNames).toBe(!initial.showDirectoryNames);

    store.toggleEdges();
    expect(useSettingsStore.getState().showEdges).toBe(!initial.showEdges);

    store.toggleBloom();
    expect(useSettingsStore.getState().showBloom).toBe(!initial.showBloom);

    store.toggleAutoCamera();
    expect(useSettingsStore.getState().autoCamera).toBe(!initial.autoCamera);

    store.toggleFullscreen();
    expect(useSettingsStore.getState().fullscreen).toBe(!initial.fullscreen);
  });

  it('setFullscreen sets value directly', () => {
    useSettingsStore.getState().setFullscreen(true);
    expect(useSettingsStore.getState().fullscreen).toBe(true);
    useSettingsStore.getState().setFullscreen(false);
    expect(useSettingsStore.getState().fullscreen).toBe(false);
  });

  it('setColorScheme accepts all valid schemes', () => {
    useSettingsStore.getState().setColorScheme('language');
    expect(useSettingsStore.getState().colorScheme).toBe('language');
    useSettingsStore.getState().setColorScheme('author');
    expect(useSettingsStore.getState().colorScheme).toBe('author');
    useSettingsStore.getState().setColorScheme('age');
    expect(useSettingsStore.getState().colorScheme).toBe('age');
  });

  it('setFileFilter and setAuthorFilter accept empty strings', () => {
    useSettingsStore.getState().setFileFilter('');
    expect(useSettingsStore.getState().fileFilter).toBe('');
    useSettingsStore.getState().setAuthorFilter('');
    expect(useSettingsStore.getState().authorFilter).toBe('');
  });
});
