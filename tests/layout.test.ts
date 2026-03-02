import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../src/utils/tree';
import { computeRadialLayout } from '../src/utils/layout';

describe('computeRadialLayout', () => {
  let tree: FileTree;

  beforeEach(() => {
    tree = new FileTree();
  });

  it('positions root at origin', () => {
    tree.addFile('file.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);
    const rootEntry = result.entries.find((e) => e.id === '');
    expect(rootEntry).toBeDefined();
    expect(rootEntry!.position[0]).toBeCloseTo(0, 5);
    expect(rootEntry!.position[1]).toBeCloseTo(0, 5);
    expect(rootEntry!.position[2]).toBeCloseTo(0, 5);
  });

  it('places children at non-zero distance from root', () => {
    tree.addFile('a.ts', 1000, 'Alice');
    tree.addFile('b.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    for (const entry of result.entries) {
      if (entry.id === '') continue; // skip root
      const dist = Math.sqrt(entry.position[0] ** 2 + entry.position[2] ** 2);
      expect(dist).toBeGreaterThan(0);
    }
  });

  it('all nodes get positions', () => {
    tree.addFile('src/a.ts', 1000, 'Alice');
    tree.addFile('src/b.ts', 1000, 'Bob');
    tree.addFile('lib/c.ts', 1000, 'Charlie');
    const result = computeRadialLayout(tree);

    // Should have entries for: root, src, lib, src/a.ts, src/b.ts, lib/c.ts
    expect(result.entries.length).toBe(6);
  });

  it('does not place two nodes at the exact same position', () => {
    tree.addFile('a.ts', 1000, 'Alice');
    tree.addFile('b.ts', 1000, 'Alice');
    tree.addFile('c.ts', 1000, 'Alice');
    tree.addFile('d.ts', 1000, 'Alice');
    tree.addFile('e.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    const positions = new Set<string>();
    for (const entry of result.entries) {
      if (entry.id === '') continue; // root is at origin
      const key = entry.position.map((v) => v.toFixed(4)).join(',');
      expect(positions.has(key)).toBe(false);
      positions.add(key);
    }
  });

  it('deeper directories are further from center', () => {
    tree.addFile('a/b/c/d/file.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    const distanceOf = (id: string): number => {
      const entry = result.entries.find((e) => e.id === id);
      if (!entry) return -1;
      return Math.sqrt(entry.position[0] ** 2 + entry.position[2] ** 2);
    };

    expect(distanceOf('a')).toBeLessThan(distanceOf('a/b'));
    expect(distanceOf('a/b')).toBeLessThan(distanceOf('a/b/c'));
    expect(distanceOf('a/b/c')).toBeLessThan(distanceOf('a/b/c/d'));
  });

  it('computes bounds correctly', () => {
    tree.addFile('a.ts', 1000, 'Alice');
    tree.addFile('b.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);

    expect(result.bounds.minX).toBeLessThanOrEqual(result.bounds.maxX);
    expect(result.bounds.minZ).toBeLessThanOrEqual(result.bounds.maxZ);
  });

  it('handles single file tree', () => {
    tree.addFile('only.ts', 1000, 'Alice');
    const result = computeRadialLayout(tree);
    expect(result.entries.length).toBe(2); // root + file
  });

  it('handles deep nesting (50 levels)', () => {
    let path = '';
    for (let i = 0; i < 50; i++) {
      path += (path ? '/' : '') + `d${i}`;
    }
    path += '/file.ts';
    tree.addFile(path, 1000, 'Alice');
    const result = computeRadialLayout(tree);
    expect(result.entries.length).toBe(52); // 50 dirs + root + file
  });

  describe('performance', () => {
    it('layout for 1000 files completes in under 50ms', () => {
      for (let i = 0; i < 1000; i++) {
        tree.addFile(`dir${Math.floor(i / 20)}/file${i}.ts`, 1000 + i, 'author');
      }
      const start = performance.now();
      const result = computeRadialLayout(tree);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
      expect(result.entries.length).toBeGreaterThan(1000);
    });

    it('layout for 10000 files completes in under 200ms', () => {
      for (let i = 0; i < 10000; i++) {
        tree.addFile(`dir${Math.floor(i / 50)}/file${i}.ts`, 1000 + i, 'author');
      }
      const start = performance.now();
      const result = computeRadialLayout(tree);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
      expect(result.entries.length).toBeGreaterThan(10000);
    });
  });
});
