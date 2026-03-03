import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../src/utils/tree';
import { computeRadialLayout } from '../src/utils/layout';
import { DEPTH_SPACING, FILE_CLUSTER_SPACING } from '../src/utils/constants';

describe('computeRadialLayout — extended edge cases', () => {
  let tree: FileTree;

  beforeEach(() => {
    tree = new FileTree();
  });

  it('handles empty tree (root only, no files)', () => {
    const result = computeRadialLayout(tree);
    expect(result.entries).toHaveLength(1); // just the root
    expect(result.entries[0].id).toBe('');
    expect(result.entries[0].position).toEqual([0, 0, 0]);
  });

  it('handles tree with only directories (no files)', () => {
    // Adding a file creates directories, but if we delete the file,
    // the directories remain
    tree.addFile('src/utils/helper.ts', 1000, 'Alice');
    tree.deleteFile('src/utils/helper.ts');
    // Dirs still exist: '', 'src', 'src/utils' — but helper.ts is dead
    const result = computeRadialLayout(tree);
    // entries include root, src, src/utils, and the dead file (still in tree children)
    expect(result.entries.length).toBeGreaterThanOrEqual(3);
  });

  it('handles single-child chain (linear path)', () => {
    tree.addFile('a/b/c/d/e/file.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);
    // root -> a -> b -> c -> d -> e -> file.ts  (7 entries total)
    const aEntry = result.entries.find((e) => e.id === 'a');
    const bEntry = result.entries.find((e) => e.id === 'a/b');
    expect(aEntry).toBeDefined();
    expect(bEntry).toBeDefined();
  });

  it('handles wide tree (many children at one level)', () => {
    for (let i = 0; i < 100; i++) {
      tree.addFile(`file${i}.ts`, 1000, 'Alice');
    }
    const result = computeRadialLayout(tree);
    // root + 100 files = 101 entries
    expect(result.entries).toHaveLength(101);

    // No two files should overlap
    const positions = new Set<string>();
    for (const entry of result.entries) {
      if (entry.id === '') continue;
      const key = entry.position.map((v) => v.toFixed(4)).join(',');
      expect(positions.has(key)).toBe(false);
      positions.add(key);
    }
  });

  it('handles unbalanced tree (one deep branch, one shallow branch)', () => {
    // Deep branch
    tree.addFile('deep/a/b/c/d/leaf.ts', 1000, 'Alice');
    // Shallow branch
    tree.addFile('shallow/leaf.ts', 1000, 'Alice');

    const result = computeRadialLayout(tree);

    // The deepest directory in the deep branch should be further out
    // than the shallow directory
    const deepDir = result.entries.find((e) => e.id === 'deep/a/b/c/d');
    const shallowDir = result.entries.find((e) => e.id === 'shallow');

    expect(deepDir).toBeDefined();
    expect(shallowDir).toBeDefined();

    const deepDist = Math.sqrt(deepDir!.position[0] ** 2 + deepDir!.position[2] ** 2);
    const shallowDist = Math.sqrt(
      shallowDir!.position[0] ** 2 + shallowDir!.position[2] ** 2
    );
    expect(deepDist).toBeGreaterThan(shallowDist);
  });

  it('all positions are on XZ plane (Y=0)', () => {
    tree.addFile('src/a.ts', 1000, 'Alice');
    tree.addFile('src/b.ts', 1000, 'Alice');
    tree.addFile('lib/c.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    for (const entry of result.entries) {
      expect(entry.position[1]).toBe(0);
    }
  });

  it('directory distance from center equals depth * DEPTH_SPACING', () => {
    tree.addFile('a/b/file.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    const aEntry = result.entries.find((e) => e.id === 'a');
    const bEntry = result.entries.find((e) => e.id === 'a/b');

    const dist = (e: typeof aEntry) => Math.sqrt(e!.position[0] ** 2 + e!.position[2] ** 2);
    expect(dist(aEntry)).toBeCloseTo(1 * DEPTH_SPACING, 5);
    expect(dist(bEntry)).toBeCloseTo(2 * DEPTH_SPACING, 5);
  });

  it('file clusters near parent, not at depth * DEPTH_SPACING', () => {
    tree.addFile('a/b/file.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    const bEntry = result.entries.find((e) => e.id === 'a/b');
    const fileEntry = result.entries.find((e) => e.id === 'a/b/file.ts');

    expect(bEntry).toBeDefined();
    expect(fileEntry).toBeDefined();

    // File should be at or very near the directory position (within cluster spacing)
    const dx = fileEntry!.position[0] - bEntry!.position[0];
    const dz = fileEntry!.position[2] - bEntry!.position[2];
    const distFromDir = Math.sqrt(dx * dx + dz * dz);
    expect(distFromDir).toBeLessThan(FILE_CLUSTER_SPACING * 2);
  });

  it('bounds encompass all node positions', () => {
    for (let i = 0; i < 50; i++) {
      tree.addFile(`dir${i % 5}/file${i}.ts`, 1000, 'Alice');
    }
    const result = computeRadialLayout(tree);

    for (const entry of result.entries) {
      expect(entry.position[0]).toBeGreaterThanOrEqual(result.bounds.minX);
      expect(entry.position[0]).toBeLessThanOrEqual(result.bounds.maxX);
      expect(entry.position[2]).toBeGreaterThanOrEqual(result.bounds.minZ);
      expect(entry.position[2]).toBeLessThanOrEqual(result.bounds.maxZ);
    }
  });

  it('layout is deterministic (same tree produces same result)', () => {
    tree.addFile('src/a.ts', 1000, 'Alice');
    tree.addFile('src/b.ts', 1000, 'Alice');
    tree.addFile('lib/c.ts', 1000, 'Alice');

    const r1 = computeRadialLayout(tree);
    const r2 = computeRadialLayout(tree);

    expect(r1.entries.length).toBe(r2.entries.length);
    for (let i = 0; i < r1.entries.length; i++) {
      expect(r1.entries[i].id).toBe(r2.entries[i].id);
      expect(r1.entries[i].position[0]).toBeCloseTo(r2.entries[i].position[0], 10);
      expect(r1.entries[i].position[2]).toBeCloseTo(r2.entries[i].position[2], 10);
    }
  });
});
