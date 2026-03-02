import { describe, it, expect } from 'vitest';
import type { DirNode, FileNode, Vec3 } from '../src/types';

function makeDir(overrides: Partial<DirNode> = {}): DirNode {
  return {
    id: 'src',
    name: 'src',
    parent: '',
    children: [],
    position: [5, 0, 0] as Vec3,
    angle: 0,
    depth: 1,
    ...overrides,
  };
}

function makeFile(overrides: Partial<FileNode> = {}): FileNode {
  return {
    id: 'src/test.ts',
    name: 'test.ts',
    parent: 'src',
    extension: 'ts',
    color: 0x3178c6,
    position: [10, 0, 0] as Vec3,
    lastModified: 1000,
    lastAuthor: 'Alice',
    alive: true,
    ...overrides,
  };
}

/**
 * Compute edge vertex pairs from dirs and files, matching the logic
 * used in DirectoryEdges.tsx. This tests the pure data transformation.
 */
function computeEdgeVertices(
  dirs: Map<string, DirNode>,
  files: Map<string, FileNode>,
): { parentPos: Vec3; childPos: Vec3 }[] {
  const edges: { parentPos: Vec3; childPos: Vec3 }[] = [];

  // Dir-to-dir edges
  for (const dir of dirs.values()) {
    if (dir.parent === null) continue;
    const parentDir = dirs.get(dir.parent);
    if (!parentDir) continue;
    edges.push({ parentPos: parentDir.position, childPos: dir.position });
  }

  // Dir-to-file edges
  for (const file of files.values()) {
    if (!file.alive) continue;
    const parentDir = dirs.get(file.parent);
    if (!parentDir) continue;
    edges.push({ parentPos: parentDir.position, childPos: file.position });
  }

  return edges;
}

describe('directory edge computation', () => {
  it('returns no edges for root-only tree', () => {
    const dirs = new Map<string, DirNode>();
    dirs.set('', makeDir({ id: '', name: '', parent: null, depth: 0 }));
    const files = new Map<string, FileNode>();
    const edges = computeEdgeVertices(dirs, files);
    expect(edges.length).toBe(0);
  });

  it('returns one edge for single directory child of root', () => {
    const dirs = new Map<string, DirNode>();
    dirs.set('', makeDir({ id: '', name: '', parent: null, depth: 0, position: [0, 0, 0] }));
    dirs.set('src', makeDir({ id: 'src', parent: '', depth: 1, position: [5, 0, 0] }));
    const files = new Map<string, FileNode>();
    const edges = computeEdgeVertices(dirs, files);
    expect(edges.length).toBe(1);
    expect(edges[0].parentPos).toEqual([0, 0, 0]);
    expect(edges[0].childPos).toEqual([5, 0, 0]);
  });

  it('returns dir-to-file edges for alive files', () => {
    const dirs = new Map<string, DirNode>();
    dirs.set('', makeDir({ id: '', name: '', parent: null, depth: 0, position: [0, 0, 0] }));
    dirs.set('src', makeDir({ id: 'src', parent: '', depth: 1, position: [5, 0, 0] }));
    const files = new Map<string, FileNode>();
    files.set('src/a.ts', makeFile({ id: 'src/a.ts', parent: 'src', position: [10, 0, 0] }));
    const edges = computeEdgeVertices(dirs, files);
    // 1 dir-to-dir (root->src) + 1 dir-to-file (src->a.ts)
    expect(edges.length).toBe(2);
  });

  it('excludes edges for dead files', () => {
    const dirs = new Map<string, DirNode>();
    dirs.set('', makeDir({ id: '', name: '', parent: null, depth: 0 }));
    dirs.set('src', makeDir({ id: 'src', parent: '', depth: 1 }));
    const files = new Map<string, FileNode>();
    files.set('src/dead.ts', makeFile({ id: 'src/dead.ts', alive: false }));
    const edges = computeEdgeVertices(dirs, files);
    // Only 1 dir-to-dir edge (root->src), no file edge
    expect(edges.length).toBe(1);
  });

  it('handles nested directories', () => {
    const dirs = new Map<string, DirNode>();
    dirs.set('', makeDir({ id: '', name: '', parent: null, depth: 0, position: [0, 0, 0] }));
    dirs.set('a', makeDir({ id: 'a', parent: '', depth: 1, position: [3, 0, 0] }));
    dirs.set('a/b', makeDir({ id: 'a/b', parent: 'a', depth: 2, position: [6, 0, 0] }));
    dirs.set('a/b/c', makeDir({ id: 'a/b/c', parent: 'a/b', depth: 3, position: [9, 0, 0] }));
    const files = new Map<string, FileNode>();
    const edges = computeEdgeVertices(dirs, files);
    expect(edges.length).toBe(3); // root->a, a->a/b, a/b->a/b/c
  });
});
