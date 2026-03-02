import { describe, it, expect } from 'vitest';
import { parseGourceLog } from '../../src/utils/parser';
import { FileTree } from '../../src/utils/tree';
import { computeRadialLayout } from '../../src/utils/layout';
import { buildFileNodeArrays } from '../../src/utils/fileNodeHelpers';
import type { Commit } from '../../src/types';

describe('Integration: full pipeline from raw log to rendered data', () => {
  it('raw log string -> parser -> commits -> tree -> layout -> file node arrays', () => {
    const rawLog = [
      '1000000000|Alice|A|src/main.ts|3178C6',
      '1000000000|Alice|A|src/utils/helper.ts|3178C6',
      '1000000000|Alice|A|README.md|083FA1',
      '1000086400|Bob|M|src/main.ts|',
      '1000086400|Bob|A|src/components/App.tsx|3178C6',
      '1000172800|Alice|D|README.md|',
      '1000172800|Alice|A|docs/README.md|083FA1',
    ].join('\n');

    // Step 1: Parse
    const commits = parseGourceLog(rawLog);
    expect(commits.length).toBeGreaterThanOrEqual(3);

    // Step 2: Build tree by applying commits
    const tree = new FileTree();
    for (const commit of commits) {
      tree.applyCommit(commit);
    }

    // Step 3: Verify tree state
    const aliveFiles = tree.getAliveFiles();
    const aliveIds = aliveFiles.map((f) => f.id);
    expect(aliveIds).toContain('src/main.ts');
    expect(aliveIds).toContain('src/utils/helper.ts');
    expect(aliveIds).toContain('src/components/App.tsx');
    expect(aliveIds).toContain('docs/README.md');
    // README.md was deleted
    expect(tree.getFile('README.md')!.alive).toBe(false);

    // Step 4: Compute layout
    const layout = computeRadialLayout(tree);
    expect(layout.entries.length).toBeGreaterThan(0);

    // Update tree positions from layout
    for (const entry of layout.entries) {
      const file = tree.getFile(entry.id);
      if (file) {
        file.position = entry.position;
      }
      const dir = tree.getDir(entry.id);
      if (dir) {
        dir.position = entry.position;
        dir.angle = entry.angle;
      }
    }

    // Step 5: Build file node arrays for rendering
    const allFiles = tree.getAllFiles();
    const currentTimeMs = 1000172800 * 1000; // last commit time in ms
    const arrays = buildFileNodeArrays(allFiles, currentTimeMs);

    // Should include alive files + recently deleted files in fadeout
    expect(arrays.count).toBeGreaterThanOrEqual(aliveFiles.length);
    expect(arrays.positions.length).toBe(arrays.count * 3);
    expect(arrays.colors.length).toBe(arrays.count * 3);
    expect(arrays.scales.length).toBe(arrays.count);
    expect(arrays.opacities.length).toBe(arrays.count);
  });

  it('file lifecycle: add -> modify -> delete -> verify state at each step', () => {
    const tree = new FileTree();

    // Step 1: Add file
    const addCommit: Commit = {
      timestamp: 1000,
      author: 'Alice',
      files: [{ action: 'A', path: 'src/feature.ts' }],
    };
    tree.applyCommit(addCommit);

    let file = tree.getFile('src/feature.ts');
    expect(file).toBeDefined();
    expect(file!.alive).toBe(true);
    expect(file!.lastAuthor).toBe('Alice');
    expect(file!.lastModified).toBe(1000);

    // Step 2: Modify file
    const modifyCommit: Commit = {
      timestamp: 2000,
      author: 'Bob',
      files: [{ action: 'M', path: 'src/feature.ts' }],
    };
    tree.applyCommit(modifyCommit);

    file = tree.getFile('src/feature.ts');
    expect(file!.alive).toBe(true);
    expect(file!.lastAuthor).toBe('Bob');
    expect(file!.lastModified).toBe(2000);

    // Step 3: Delete file
    const deleteCommit: Commit = {
      timestamp: 3000,
      author: 'Charlie',
      files: [{ action: 'D', path: 'src/feature.ts' }],
    };
    tree.applyCommit(deleteCommit);

    file = tree.getFile('src/feature.ts');
    expect(file!.alive).toBe(false);

    // Step 4: Layout still works with dead file
    const layout = computeRadialLayout(tree);
    expect(layout.entries.length).toBeGreaterThan(0);
  });

  it('large batch: apply 1000 commits and verify tree consistency', () => {
    const commits: Commit[] = [];
    for (let i = 0; i < 1000; i++) {
      const timestamp = 1000000000 + i * 86400;
      const author = `dev${i % 10}`;
      const files = [];

      // Add files
      for (let j = 0; j < 5; j++) {
        files.push({
          action: 'A' as const,
          path: `module${i % 20}/sub${j}/file_${i}_${j}.ts`,
        });
      }

      // Modify some existing files
      if (i > 0) {
        files.push({
          action: 'M' as const,
          path: `module${(i - 1) % 20}/sub0/file_${i - 1}_0.ts`,
        });
      }

      // Delete some old files
      if (i > 50 && i % 10 === 0) {
        files.push({
          action: 'D' as const,
          path: `module${(i - 50) % 20}/sub0/file_${i - 50}_0.ts`,
        });
      }

      commits.push({ timestamp, author, files });
    }

    const tree = new FileTree();
    for (const commit of commits) {
      tree.applyCommit(commit);
    }

    const aliveFiles = tree.getAliveFiles();
    const allFiles = tree.getAllFiles();

    // Should have many alive files
    expect(aliveFiles.length).toBeGreaterThan(4000);
    // Total files should be more than alive
    expect(allFiles.length).toBeGreaterThan(aliveFiles.length);
    // All alive files should actually be alive
    for (const f of aliveFiles) {
      expect(f.alive).toBe(true);
    }

    // Layout should work
    const layout = computeRadialLayout(tree);
    expect(layout.entries.length).toBeGreaterThan(0);

    // Build arrays should work
    const arrays = buildFileNodeArrays(allFiles, Date.now());
    expect(arrays.count).toBe(aliveFiles.length); // dead files past fadeout
  });

  it('store integration: animation store handles commits from parser', async () => {
    const { useAnimationStore } = await import('../../src/store/useAnimationStore');
    useAnimationStore.getState().reset();

    const rawLog = ['1000|Alice|A|a.ts|', '2000|Bob|A|b.ts|', '3000|Charlie|M|a.ts|'].join('\n');

    const commits = parseGourceLog(rawLog);
    useAnimationStore.getState().setCommits(commits);

    const state = useAnimationStore.getState();
    expect(state.commits.length).toBe(3);
    expect(state.timeRange).toEqual({ start: 1000, end: 3000 });
    expect(state.currentTimestamp).toBe(1000);
    expect(state.currentCommitIndex).toBe(0);

    // Step through
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentTimestamp).toBe(2000);
    useAnimationStore.getState().stepForward();
    expect(useAnimationStore.getState().currentTimestamp).toBe(3000);
  });
});
