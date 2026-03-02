import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../src/utils/tree';
import { computeRadialLayout } from '../src/utils/layout';
import { useAnimationStore } from '../src/store/useAnimationStore';
import { useTreeStore } from '../src/store/useTreeStore';
import type { Commit, Contributor, Vec3 } from '../src/types';

/**
 * Inline helper: hash a string to a deterministic color.
 * Must match the logic in useAnimationEngine.ts.
 */
function hashStringToColor(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return ((hash & 0x00ffffff) + 0x333333) & 0x00ffffff;
}

/**
 * Inline helper: update contributors map from a commit.
 * Must match the logic in useAnimationEngine.ts.
 */
function updateContributors(
  contributors: Map<string, Contributor>,
  commit: Commit,
  clockTimeMs: number,
): void {
  for (let i = 0; i < commit.files.length; i++) {
    const change = commit.files[i];
    const authorName = commit.author;

    let contributor = contributors.get(authorName);
    if (!contributor) {
      contributor = {
        name: authorName,
        color: hashStringToColor(authorName),
        position: [0, 0, 0] as Vec3,
        targetFile: null,
        active: true,
        lastActiveTimestamp: clockTimeMs,
      };
      contributors.set(authorName, contributor);
    }

    contributor.targetFile = change.path;
    contributor.active = true;
    contributor.lastActiveTimestamp = clockTimeMs;
  }
}

/**
 * Inline helper: apply layout to tree and return new maps.
 * Must match the logic in useAnimationEngine.ts.
 */
function applyLayoutToTree(tree: FileTree): {
  files: Map<string, import('../src/types').FileNode>;
  dirs: Map<string, import('../src/types').DirNode>;
} {
  const layout = computeRadialLayout(tree);
  const filesMap = tree.getFilesMap();
  const dirsMap = tree.getDirsMap();

  for (let i = 0; i < layout.entries.length; i++) {
    const entry = layout.entries[i];
    const file = filesMap.get(entry.id);
    if (file) {
      file.position = entry.position;
      continue;
    }
    const dir = dirsMap.get(entry.id);
    if (dir) {
      dir.position = entry.position;
      dir.angle = entry.angle;
    }
  }

  return {
    files: new Map(filesMap),
    dirs: new Map(dirsMap),
  };
}

// Test data: a small series of commits
function makeTestCommits(): Commit[] {
  return [
    {
      timestamp: 1000,
      author: 'Alice',
      files: [
        { action: 'A', path: 'src/main.ts' },
        { action: 'A', path: 'src/utils/helper.ts' },
      ],
    },
    {
      timestamp: 2000,
      author: 'Bob',
      files: [
        { action: 'M', path: 'src/main.ts' },
        { action: 'A', path: 'README.md' },
      ],
    },
    {
      timestamp: 3000,
      author: 'Alice',
      files: [{ action: 'D', path: 'src/utils/helper.ts' }],
    },
    {
      timestamp: 4000,
      author: 'Charlie',
      files: [
        { action: 'A', path: 'src/components/App.tsx' },
        { action: 'M', path: 'README.md' },
      ],
    },
  ];
}

describe('Animation Engine Logic', () => {
  beforeEach(() => {
    useAnimationStore.getState().reset();
    useTreeStore.getState().reset();
  });

  describe('Commit application to FileTree', () => {
    it('applies commits sequentially and builds correct tree', () => {
      const tree = new FileTree();
      const commits = makeTestCommits();

      // Apply first commit
      tree.applyCommit(commits[0]);
      expect(tree.getAliveFiles()).toHaveLength(2);
      expect(tree.getFile('src/main.ts')!.alive).toBe(true);
      expect(tree.getFile('src/utils/helper.ts')!.alive).toBe(true);

      // Apply second commit
      tree.applyCommit(commits[1]);
      expect(tree.getAliveFiles()).toHaveLength(3);
      expect(tree.getFile('src/main.ts')!.lastAuthor).toBe('Bob');
      expect(tree.getFile('README.md')!.alive).toBe(true);

      // Apply third commit (delete)
      tree.applyCommit(commits[2]);
      expect(tree.getAliveFiles()).toHaveLength(2);
      expect(tree.getFile('src/utils/helper.ts')!.alive).toBe(false);

      // Apply fourth commit
      tree.applyCommit(commits[3]);
      expect(tree.getAliveFiles()).toHaveLength(3);
      expect(tree.getFile('src/components/App.tsx')!.alive).toBe(true);
    });

    it('correctly rebuilds tree from scratch for timeline scrub', () => {
      const commits = makeTestCommits();

      // Replay up to commit index 1 (first two commits)
      const tree = new FileTree();
      for (let i = 0; i <= 1; i++) {
        tree.applyCommit(commits[i]);
      }
      expect(tree.getAliveFiles()).toHaveLength(3);
      expect(tree.getFile('src/main.ts')!.lastAuthor).toBe('Bob');

      // Rebuild from scratch to index 0 (simulating scrub backward)
      const freshTree = new FileTree();
      freshTree.applyCommit(commits[0]);
      expect(freshTree.getAliveFiles()).toHaveLength(2);
      expect(freshTree.getFile('src/main.ts')!.lastAuthor).toBe('Alice');
    });
  });

  describe('Layout application', () => {
    it('assigns non-zero positions to file and directory nodes', () => {
      const tree = new FileTree();
      const commits = makeTestCommits();

      tree.applyCommit(commits[0]);
      tree.applyCommit(commits[1]);

      const { files, dirs } = applyLayoutToTree(tree);

      // Files should have positions set
      const mainFile = files.get('src/main.ts');
      expect(mainFile).toBeDefined();
      expect(mainFile!.position).toBeDefined();
      expect(mainFile!.position).toHaveLength(3);

      // At least some nodes should have non-zero positions
      let hasNonZero = false;
      for (const file of files.values()) {
        if (file.position[0] !== 0 || file.position[2] !== 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);

      // Root dir should be at origin
      const root = dirs.get('');
      expect(root).toBeDefined();
      expect(root!.position).toEqual([0, 0, 0]);
    });

    it('returns new Map references (not same identity)', () => {
      const tree = new FileTree();
      tree.applyCommit(makeTestCommits()[0]);

      const result1 = applyLayoutToTree(tree);
      const result2 = applyLayoutToTree(tree);

      // Maps should be different references (for Zustand change detection)
      expect(result1.files).not.toBe(result2.files);
      expect(result1.dirs).not.toBe(result2.dirs);
    });
  });

  describe('Contributor management', () => {
    it('creates contributors from commit authors', () => {
      const contributors = new Map<string, Contributor>();
      const commits = makeTestCommits();

      updateContributors(contributors, commits[0], 100);
      expect(contributors.size).toBe(1);
      expect(contributors.has('Alice')).toBe(true);

      const alice = contributors.get('Alice')!;
      expect(alice.name).toBe('Alice');
      expect(alice.active).toBe(true);
      expect(alice.lastActiveTimestamp).toBe(100);
      expect(alice.targetFile).toBe('src/utils/helper.ts'); // last file in commit
    });

    it('updates existing contributor on new commit', () => {
      const contributors = new Map<string, Contributor>();
      const commits = makeTestCommits();

      updateContributors(contributors, commits[0], 100); // Alice
      updateContributors(contributors, commits[1], 200); // Bob
      updateContributors(contributors, commits[2], 300); // Alice again

      expect(contributors.size).toBe(2);

      const alice = contributors.get('Alice')!;
      expect(alice.lastActiveTimestamp).toBe(300);
      expect(alice.targetFile).toBe('src/utils/helper.ts');
    });

    it('creates multiple contributors from different authors', () => {
      const contributors = new Map<string, Contributor>();
      const commits = makeTestCommits();

      for (let i = 0; i < commits.length; i++) {
        updateContributors(contributors, commits[i], (i + 1) * 100);
      }

      expect(contributors.size).toBe(3); // Alice, Bob, Charlie
      expect(contributors.has('Alice')).toBe(true);
      expect(contributors.has('Bob')).toBe(true);
      expect(contributors.has('Charlie')).toBe(true);
    });

    it('assigns deterministic colors based on author name', () => {
      const contributors = new Map<string, Contributor>();
      const commits = makeTestCommits();

      updateContributors(contributors, commits[0], 100);
      const aliceColor1 = contributors.get('Alice')!.color;

      // Create fresh map, apply same commit
      const contributors2 = new Map<string, Contributor>();
      updateContributors(contributors2, commits[0], 200);
      const aliceColor2 = contributors2.get('Alice')!.color;

      expect(aliceColor1).toBe(aliceColor2);
    });

    it('uses clock time (not commit timestamp) for lastActiveTimestamp', () => {
      const contributors = new Map<string, Contributor>();
      const commit: Commit = {
        timestamp: 999999, // git timestamp
        author: 'Alice',
        files: [{ action: 'A', path: 'file.ts' }],
      };

      const clockTimeMs = 42;
      updateContributors(contributors, commit, clockTimeMs);

      const alice = contributors.get('Alice')!;
      expect(alice.lastActiveTimestamp).toBe(42); // clock time, NOT 999999
    });
  });

  describe('hashStringToColor', () => {
    it('returns valid hex color range', () => {
      const color = hashStringToColor('Alice');
      expect(color).toBeGreaterThanOrEqual(0x000000);
      expect(color).toBeLessThanOrEqual(0xffffff);
    });

    it('returns consistent color for same input', () => {
      expect(hashStringToColor('Alice')).toBe(hashStringToColor('Alice'));
    });

    it('returns different colors for different inputs', () => {
      expect(hashStringToColor('Alice')).not.toBe(hashStringToColor('Bob'));
    });
  });

  describe('Time advancement', () => {
    it('formula: advancing 1 real second at secondsPerDay=1 advances 86400 repo-seconds', () => {
      const deltaSeconds = 1;
      const secondsPerDay = 1;
      const advanceRepoSeconds = (deltaSeconds * 86400) / secondsPerDay;
      expect(advanceRepoSeconds).toBe(86400);
    });

    it('formula: advancing 0.5 real seconds at secondsPerDay=2 advances 21600 repo-seconds', () => {
      const deltaSeconds = 0.5;
      const secondsPerDay = 2;
      const advanceRepoSeconds = (deltaSeconds * 86400) / secondsPerDay;
      expect(advanceRepoSeconds).toBe(21600);
    });
  });

  describe('Store integration', () => {
    it('useAnimationStore.setCommits sets timeRange and currentTimestamp', () => {
      const commits = makeTestCommits();
      useAnimationStore.getState().setCommits(commits);

      const state = useAnimationStore.getState();
      expect(state.commits).toHaveLength(4);
      expect(state.timeRange).toEqual({ start: 1000, end: 4000 });
      expect(state.currentTimestamp).toBe(1000);
      expect(state.currentCommitIndex).toBe(0);
    });

    it('useTreeStore set methods update state', () => {
      const tree = new FileTree();
      tree.applyCommit(makeTestCommits()[0]);
      const { files, dirs } = applyLayoutToTree(tree);

      const contributors = new Map<string, Contributor>();
      contributors.set('Alice', {
        name: 'Alice',
        color: 0xff0000,
        position: [0, 0, 0],
        targetFile: 'src/main.ts',
        active: true,
        lastActiveTimestamp: 100,
      });

      const treeStore = useTreeStore.getState();
      treeStore.setFiles(files);
      treeStore.setDirs(dirs);
      treeStore.setContributors(contributors);

      const updatedState = useTreeStore.getState();
      expect(updatedState.files.size).toBeGreaterThan(0);
      expect(updatedState.dirs.size).toBeGreaterThan(0);
      expect(updatedState.contributors.size).toBe(1);
      expect(updatedState.contributors.get('Alice')!.name).toBe('Alice');
    });
  });

  describe('FileTree map accessors', () => {
    it('getFilesMap returns internal map reference', () => {
      const tree = new FileTree();
      tree.addFile('a.ts', 1000, 'Alice');
      const map = tree.getFilesMap();
      expect(map.size).toBe(1);
      expect(map.get('a.ts')).toBeDefined();
    });

    it('getDirsMap returns internal map reference', () => {
      const tree = new FileTree();
      tree.addFile('src/a.ts', 1000, 'Alice');
      const map = tree.getDirsMap();
      expect(map.has('')).toBe(true); // root
      expect(map.has('src')).toBe(true);
    });
  });

  describe('End-to-end simulation', () => {
    it('full pipeline: commits -> tree -> layout -> store', () => {
      const commits = makeTestCommits();
      const tree = new FileTree();
      const contributors = new Map<string, Contributor>();

      // Simulate frame-by-frame commit application
      for (let i = 0; i < commits.length; i++) {
        tree.applyCommit(commits[i]);
        updateContributors(contributors, commits[i], (i + 1) * 1000);
      }

      const { files, dirs } = applyLayoutToTree(tree);

      // Verify files
      expect(files.size).toBeGreaterThan(0);
      const mainTs = files.get('src/main.ts');
      expect(mainTs).toBeDefined();
      expect(mainTs!.alive).toBe(true);

      // The deleted file should still be in the map but marked dead
      const helper = files.get('src/utils/helper.ts');
      expect(helper).toBeDefined();
      expect(helper!.alive).toBe(false);

      // Verify directories
      expect(dirs.size).toBeGreaterThan(0);
      expect(dirs.has('')).toBe(true); // root
      expect(dirs.has('src')).toBe(true);
      expect(dirs.has('src/components')).toBe(true);

      // Verify contributors
      expect(contributors.size).toBe(3);

      // Verify positions are assigned
      let filesWithPositions = 0;
      for (const file of files.values()) {
        if (file.position[0] !== 0 || file.position[2] !== 0) {
          filesWithPositions++;
        }
      }
      expect(filesWithPositions).toBeGreaterThan(0);

      // Sync to store and verify
      const treeStore = useTreeStore.getState();
      treeStore.setFiles(files);
      treeStore.setDirs(dirs);
      treeStore.setContributors(contributors);

      const storeState = useTreeStore.getState();
      expect(storeState.files.size).toBe(files.size);
      expect(storeState.dirs.size).toBe(dirs.size);
      expect(storeState.contributors.size).toBe(3);
    });
  });
});
