import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../src/store/useAnimationStore';
import { useCameraStore } from '../src/store/useCameraStore';
import { useTreeStore } from '../src/store/useTreeStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { computeHeatmap, formatDate, formatDateTime } from '../src/utils/timelineHelpers';
import { isValidGitUrl } from '../src/utils/validation';
import { SPEED_PRESETS, KEY_SPEED_MAP } from '../src/utils/constants';
import type { Commit } from '../src/types';

// ─── Store Tests ─────────────────────────────────────────────────────────────

describe('useAnimationStore', () => {
  beforeEach(() => {
    useAnimationStore.getState().reset();
  });

  it('starts with default state', () => {
    const state = useAnimationStore.getState();
    expect(state.playing).toBe(false);
    expect(state.currentTimestamp).toBe(0);
    expect(state.secondsPerDay).toBe(1);
    expect(state.commits).toEqual([]);
    expect(state.timeRange).toBeNull();
    expect(state.currentCommitIndex).toBe(0);
    expect(state.inputSource).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('play/pause/toggle', () => {
    const store = useAnimationStore.getState();
    store.play();
    expect(useAnimationStore.getState().playing).toBe(true);
    store.pause();
    expect(useAnimationStore.getState().playing).toBe(false);
    store.toggle();
    expect(useAnimationStore.getState().playing).toBe(true);
    store.toggle();
    expect(useAnimationStore.getState().playing).toBe(false);
  });

  it('setCommits sets time range and initial timestamp', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'Bob', files: [{ action: 'M', path: 'b.ts' }] },
      { timestamp: 3000, author: 'Alice', files: [{ action: 'D', path: 'c.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    const state = useAnimationStore.getState();
    expect(state.commits.length).toBe(3);
    expect(state.timeRange).toEqual({ start: 1000, end: 3000 });
    expect(state.currentTimestamp).toBe(1000);
    expect(state.currentCommitIndex).toBe(0);
  });

  it('setCommits with empty array clears state', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().setCommits([]);
    const state = useAnimationStore.getState();
    expect(state.commits.length).toBe(0);
    expect(state.timeRange).toBeNull();
    expect(state.currentTimestamp).toBe(0);
  });

  it('stepForward advances to next commit', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'Bob', files: [{ action: 'M', path: 'b.ts' }] },
      { timestamp: 3000, author: 'Alice', files: [{ action: 'D', path: 'c.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(1);
    expect(useAnimationStore.getState().currentTimestamp).toBe(2000);
  });

  it('stepForward does not go past last commit', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(0);
  });

  it('stepBackward goes to previous commit', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'Bob', files: [{ action: 'M', path: 'b.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().stepForward();
    useAnimationStore.getState().stepBackward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(0);
    expect(useAnimationStore.getState().currentTimestamp).toBe(1000);
  });

  it('stepBackward does not go before first commit', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().stepBackward();
    expect(useAnimationStore.getState().currentCommitIndex).toBe(0);
  });

  it('setCurrentCommitIndex validates bounds', () => {
    const commits: Commit[] = [
      { timestamp: 1000, author: 'Alice', files: [{ action: 'A', path: 'a.ts' }] },
      { timestamp: 2000, author: 'Bob', files: [{ action: 'M', path: 'b.ts' }] },
    ];
    useAnimationStore.getState().setCommits(commits);
    useAnimationStore.getState().setCurrentCommitIndex(1);
    expect(useAnimationStore.getState().currentCommitIndex).toBe(1);
    expect(useAnimationStore.getState().currentTimestamp).toBe(2000);

    // Out of bounds
    useAnimationStore.getState().setCurrentCommitIndex(-1);
    // Should not change
    expect(useAnimationStore.getState().currentCommitIndex).toBe(1);
    useAnimationStore.getState().setCurrentCommitIndex(5);
    expect(useAnimationStore.getState().currentCommitIndex).toBe(1);
  });

  it('setLoading and setError', () => {
    useAnimationStore.getState().setLoading(true);
    expect(useAnimationStore.getState().loading).toBe(true);
    useAnimationStore.getState().setError('something broke');
    expect(useAnimationStore.getState().error).toBe('something broke');
  });

  it('setInputSource', () => {
    useAnimationStore.getState().setInputSource({ type: 'file', filename: 'log.txt' });
    expect(useAnimationStore.getState().inputSource).toEqual({ type: 'file', filename: 'log.txt' });
  });
});

describe('useCameraStore', () => {
  it('starts with free mode', () => {
    expect(useCameraStore.getState().mode).toBe('free');
  });

  it('toggleMode switches between free and tracking', () => {
    useCameraStore.getState().toggleMode();
    expect(useCameraStore.getState().mode).toBe('tracking');
    useCameraStore.getState().toggleMode();
    expect(useCameraStore.getState().mode).toBe('free');
  });

  it('setAutoTrackTarget updates target', () => {
    useCameraStore.getState().setAutoTrackTarget([5, 10, 15]);
    expect(useCameraStore.getState().autoTrackTarget).toEqual([5, 10, 15]);
  });
});

describe('useTreeStore', () => {
  it('starts with empty state', () => {
    const state = useTreeStore.getState();
    expect(state.files.size).toBe(0);
    expect(state.dirs.size).toBe(0);
    expect(state.contributors.size).toBe(0);
    expect(state.selectedFileId).toBeNull();
    expect(state.hoveredFileId).toBeNull();
    expect(state.hoveredContributorName).toBeNull();
  });

  it('setSelectedFileId and clear', () => {
    useTreeStore.getState().setSelectedFileId('src/main.ts');
    expect(useTreeStore.getState().selectedFileId).toBe('src/main.ts');
    useTreeStore.getState().setSelectedFileId(null);
    expect(useTreeStore.getState().selectedFileId).toBeNull();
  });

  it('setHoveredFileId and clear', () => {
    useTreeStore.getState().setHoveredFileId('src/utils.ts');
    expect(useTreeStore.getState().hoveredFileId).toBe('src/utils.ts');
    useTreeStore.getState().setHoveredFileId(null);
    expect(useTreeStore.getState().hoveredFileId).toBeNull();
  });

  it('setHoveredContributorName and clear', () => {
    useTreeStore.getState().setHoveredContributorName('Alice');
    expect(useTreeStore.getState().hoveredContributorName).toBe('Alice');
    useTreeStore.getState().setHoveredContributorName(null);
    expect(useTreeStore.getState().hoveredContributorName).toBeNull();
  });
});

describe('useSettingsStore', () => {
  it('has correct defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.showFileLabels).toBe(true);
    expect(state.showDirectoryNames).toBe(true);
    expect(state.showEdges).toBe(true);
    expect(state.showBloom).toBe(true);
    expect(state.autoCamera).toBe(true);
    expect(state.colorScheme).toBe('language');
    expect(state.fileFilter).toBe('');
    expect(state.authorFilter).toBe('');
    expect(state.fullscreen).toBe(false);
  });

  it('toggles work correctly', () => {
    const store = useSettingsStore.getState();
    store.toggleFileLabels();
    expect(useSettingsStore.getState().showFileLabels).toBe(false);
    store.toggleBloom();
    expect(useSettingsStore.getState().showBloom).toBe(false);
    store.toggleAutoCamera();
    expect(useSettingsStore.getState().autoCamera).toBe(false);
  });

  it('setColorScheme changes color scheme', () => {
    useSettingsStore.getState().setColorScheme('author');
    expect(useSettingsStore.getState().colorScheme).toBe('author');
  });

  it('setFileFilter and setAuthorFilter', () => {
    useSettingsStore.getState().setFileFilter('.*\\.ts$');
    expect(useSettingsStore.getState().fileFilter).toBe('.*\\.ts$');
    useSettingsStore.getState().setAuthorFilter('Alice');
    expect(useSettingsStore.getState().authorFilter).toBe('Alice');
  });
});

// ─── Timeline Logic Tests ────────────────────────────────────────────────────

describe('computeHeatmap', () => {
  it('returns empty array for zero buckets', () => {
    expect(computeHeatmap([], 0, 100, 0)).toEqual([]);
  });

  it('returns zero-filled array when no commits', () => {
    const result = computeHeatmap([], 0, 100, 5);
    expect(result).toEqual([0, 0, 0, 0, 0]);
  });

  it('distributes commits across buckets', () => {
    const commits = [{ timestamp: 10 }, { timestamp: 15 }, { timestamp: 50 }, { timestamp: 90 }];
    const result = computeHeatmap(commits, 0, 100, 10);
    expect(result.length).toBe(10);
    // Bucket 1 (0-10) should have 2 commits (10 and 15), normalized to 1
    expect(result[1]).toBe(1);
    // Bucket 5 (50-60) should have 1 commit
    expect(result[5]).toBe(0.5);
  });

  it('handles same start and end', () => {
    const result = computeHeatmap([{ timestamp: 5 }], 5, 5, 10);
    expect(result).toEqual(new Array(10).fill(0));
  });
});

describe('formatDate', () => {
  it('formats a Unix timestamp to a readable date', () => {
    // 2024-01-15 in UTC
    const ts = 1705276800;
    const result = formatDate(ts);
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });
});

describe('formatDateTime', () => {
  it('includes time component', () => {
    const ts = 1705276800;
    const result = formatDateTime(ts);
    expect(result).toContain('2024');
  });
});

// ─── URL Validation Tests ────────────────────────────────────────────────────

describe('isValidGitUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidGitUrl('https://github.com/user/repo')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(isValidGitUrl('http://github.com/user/repo')).toBe(true);
  });

  it('rejects ftp URLs', () => {
    expect(isValidGitUrl('ftp://example.com/repo')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidGitUrl('')).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(isValidGitUrl('not a url')).toBe(false);
  });

  it('rejects git:// protocol', () => {
    expect(isValidGitUrl('git://github.com/user/repo')).toBe(false);
  });
});

// ─── Constants Tests ─────────────────────────────────────────────────────────

describe('SPEED_PRESETS', () => {
  it('is sorted descending (fastest secondsPerDay first = biggest speed multiplier first)', () => {
    for (let i = 1; i < SPEED_PRESETS.length; i++) {
      expect(SPEED_PRESETS[i]).toBeLessThan(SPEED_PRESETS[i - 1]);
    }
  });

  it('contains default speed of 1 (1x)', () => {
    expect(SPEED_PRESETS).toContain(1);
  });

  it('all presets produce speed multipliers between 1x and 100x', () => {
    for (const s of SPEED_PRESETS) {
      const mult = 1 / s;
      expect(mult).toBeGreaterThanOrEqual(1);
      expect(mult).toBeLessThanOrEqual(100);
    }
  });
});

describe('KEY_SPEED_MAP', () => {
  it('maps keys 1-9', () => {
    for (let i = 1; i <= 9; i++) {
      expect(KEY_SPEED_MAP[String(i)]).toBeDefined();
      expect(typeof KEY_SPEED_MAP[String(i)]).toBe('number');
    }
  });

  it('key 1 maps to 1 (1x, normal speed)', () => {
    expect(KEY_SPEED_MAP['1']).toBe(1);
  });

  it('key 9 maps to 0.01 (100x, fastest speed)', () => {
    expect(KEY_SPEED_MAP['9']).toBe(0.01);
  });
});
