import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../src/utils/tree';

describe('FileTree', () => {
  let tree: FileTree;

  beforeEach(() => {
    tree = new FileTree();
  });

  describe('addFile', () => {
    it('creates root directory and file', () => {
      tree.addFile('src/main.ts', 1000, 'Alice');
      expect(tree.getFile('src/main.ts')).toBeDefined();
      expect(tree.getFile('src/main.ts')!.alive).toBe(true);
      expect(tree.getDir('src')).toBeDefined();
      expect(tree.getDir('')).toBeDefined(); // root
    });

    it('creates intermediate directories', () => {
      tree.addFile('a/b/c/file.ts', 1000, 'Alice');
      expect(tree.getDir('')).toBeDefined();
      expect(tree.getDir('a')).toBeDefined();
      expect(tree.getDir('a/b')).toBeDefined();
      expect(tree.getDir('a/b/c')).toBeDefined();
      expect(tree.getFile('a/b/c/file.ts')).toBeDefined();
    });

    it('sets file metadata correctly', () => {
      tree.addFile('README.md', 1000, 'Bob');
      const file = tree.getFile('README.md');
      expect(file).toBeDefined();
      expect(file!.name).toBe('README.md');
      expect(file!.parent).toBe('');
      expect(file!.extension).toBe('md');
      expect(file!.lastModified).toBe(1000);
      expect(file!.lastAuthor).toBe('Bob');
    });

    it('sets correct parent-child relationships', () => {
      tree.addFile('src/utils/helper.ts', 1000, 'Alice');
      const root = tree.getDir('');
      expect(root!.children).toContain('src');
      const src = tree.getDir('src');
      expect(src!.children).toContain('src/utils');
      const utils = tree.getDir('src/utils');
      expect(utils!.children).toContain('src/utils/helper.ts');
    });

    it('handles files at the root level', () => {
      tree.addFile('README.md', 1000, 'Alice');
      const root = tree.getDir('');
      expect(root!.children).toContain('README.md');
    });

    it('does not duplicate directories on repeated adds', () => {
      tree.addFile('src/a.ts', 1000, 'Alice');
      tree.addFile('src/b.ts', 1001, 'Bob');
      const src = tree.getDir('src');
      expect(src!.children).toContain('src/a.ts');
      expect(src!.children).toContain('src/b.ts');
      // root should only have one 'src' child
      const root = tree.getDir('');
      const srcCount = root!.children.filter((c) => c === 'src').length;
      expect(srcCount).toBe(1);
    });
  });

  describe('modifyFile', () => {
    it('updates lastModified and lastAuthor', () => {
      tree.addFile('file.ts', 1000, 'Alice');
      tree.modifyFile('file.ts', 2000, 'Bob');
      const file = tree.getFile('file.ts');
      expect(file!.lastModified).toBe(2000);
      expect(file!.lastAuthor).toBe('Bob');
    });

    it('returns false for non-existent file', () => {
      const result = tree.modifyFile('nope.ts', 1000, 'Alice');
      expect(result).toBe(false);
    });

    it('revives a deleted file on modify (re-add scenario)', () => {
      tree.addFile('file.ts', 1000, 'Alice');
      tree.deleteFile('file.ts');
      expect(tree.getFile('file.ts')!.alive).toBe(false);
      tree.modifyFile('file.ts', 2000, 'Bob');
      expect(tree.getFile('file.ts')!.alive).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('marks file as not alive', () => {
      tree.addFile('file.ts', 1000, 'Alice');
      tree.deleteFile('file.ts');
      expect(tree.getFile('file.ts')!.alive).toBe(false);
    });

    it('returns false for non-existent file', () => {
      expect(tree.deleteFile('nope.ts')).toBe(false);
    });
  });

  describe('getAliveFiles', () => {
    it('returns only alive files', () => {
      tree.addFile('a.ts', 1000, 'Alice');
      tree.addFile('b.ts', 1000, 'Alice');
      tree.addFile('c.ts', 1000, 'Alice');
      tree.deleteFile('b.ts');
      const alive = tree.getAliveFiles();
      expect(alive).toHaveLength(2);
      expect(alive.map((f) => f.id)).toContain('a.ts');
      expect(alive.map((f) => f.id)).toContain('c.ts');
    });
  });

  describe('getAllDirs', () => {
    it('returns all directories including root', () => {
      tree.addFile('src/a.ts', 1000, 'Alice');
      tree.addFile('lib/b.ts', 1000, 'Bob');
      const dirs = tree.getAllDirs();
      const ids = dirs.map((d) => d.id);
      expect(ids).toContain('');
      expect(ids).toContain('src');
      expect(ids).toContain('lib');
    });
  });

  describe('applyCommit', () => {
    it('applies add, modify, and delete actions', () => {
      tree.applyCommit({
        timestamp: 1000,
        author: 'Alice',
        files: [
          { action: 'A', path: 'new.ts' },
          { action: 'A', path: 'other.ts' },
        ],
      });
      expect(tree.getFile('new.ts')!.alive).toBe(true);
      expect(tree.getFile('other.ts')!.alive).toBe(true);

      tree.applyCommit({
        timestamp: 2000,
        author: 'Bob',
        files: [
          { action: 'M', path: 'new.ts' },
          { action: 'D', path: 'other.ts' },
        ],
      });
      expect(tree.getFile('new.ts')!.lastAuthor).toBe('Bob');
      expect(tree.getFile('other.ts')!.alive).toBe(false);
    });

    it('handles add for already existing file (re-add)', () => {
      tree.addFile('f.ts', 1000, 'Alice');
      tree.deleteFile('f.ts');
      tree.applyCommit({
        timestamp: 2000,
        author: 'Bob',
        files: [{ action: 'A', path: 'f.ts' }],
      });
      expect(tree.getFile('f.ts')!.alive).toBe(true);
      expect(tree.getFile('f.ts')!.lastAuthor).toBe('Bob');
    });
  });

  describe('scale test', () => {
    it('handles 10k files without error', () => {
      for (let i = 0; i < 10000; i++) {
        const dir = `dir${Math.floor(i / 100)}`;
        tree.addFile(`${dir}/file${i}.ts`, 1000 + i, `author${i % 5}`);
      }
      expect(tree.getAliveFiles()).toHaveLength(10000);
      expect(tree.getAllDirs().length).toBeGreaterThan(100);
    });
  });
});
