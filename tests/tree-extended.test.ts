import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../src/utils/tree';

describe('FileTree — extended edge cases', () => {
  let tree: FileTree;

  beforeEach(() => {
    tree = new FileTree();
  });

  describe('deeply nested paths', () => {
    it('handles 20 levels of nesting', () => {
      const parts = Array.from({ length: 20 }, (_, i) => `d${i}`);
      const path = parts.join('/') + '/deep.ts';
      tree.addFile(path, 1000, 'Alice');

      const file = tree.getFile(path);
      expect(file).toBeDefined();
      expect(file!.alive).toBe(true);

      // All intermediate dirs should exist
      for (let i = 1; i <= 20; i++) {
        const dirPath = parts.slice(0, i).join('/');
        expect(tree.getDir(dirPath)).toBeDefined();
      }
    });

    it('handles 50 levels of nesting', () => {
      const parts = Array.from({ length: 50 }, (_, i) => `level${i}`);
      const path = parts.join('/') + '/leaf.rs';
      tree.addFile(path, 1000, 'Alice');

      const file = tree.getFile(path);
      expect(file).toBeDefined();
      expect(file!.extension).toBe('rs');

      const deepDir = tree.getDir(parts.join('/'));
      expect(deepDir).toBeDefined();
      expect(deepDir!.depth).toBe(50);
    });
  });

  describe('re-add after delete', () => {
    it('revives file with updated metadata', () => {
      tree.addFile('f.ts', 1000, 'Alice');
      tree.deleteFile('f.ts');
      expect(tree.getFile('f.ts')!.alive).toBe(false);

      tree.addFile('f.ts', 2000, 'Bob');
      const file = tree.getFile('f.ts');
      expect(file!.alive).toBe(true);
      expect(file!.lastModified).toBe(2000);
      expect(file!.lastAuthor).toBe('Bob');
    });

    it('re-add with new color updates the color', () => {
      tree.addFile('f.ts', 1000, 'Alice', 0xff0000);
      tree.deleteFile('f.ts');
      tree.addFile('f.ts', 2000, 'Bob', 0x00ff00);
      expect(tree.getFile('f.ts')!.color).toBe(0x00ff00);
    });

    it('re-add without color keeps original color', () => {
      tree.addFile('f.ts', 1000, 'Alice', 0xff0000);
      tree.deleteFile('f.ts');
      tree.addFile('f.ts', 2000, 'Bob');
      expect(tree.getFile('f.ts')!.color).toBe(0xff0000);
    });
  });

  describe('file extension edge cases', () => {
    it('handles file with no extension', () => {
      tree.addFile('Makefile', 1000, 'Alice');
      const file = tree.getFile('Makefile');
      expect(file!.extension).toBe('');
    });

    it('handles file with multiple dots', () => {
      tree.addFile('archive.tar.gz', 1000, 'Alice');
      const file = tree.getFile('archive.tar.gz');
      expect(file!.extension).toBe('gz');
    });

    it('handles hidden file (dot-prefixed)', () => {
      tree.addFile('.gitignore', 1000, 'Alice');
      const file = tree.getFile('.gitignore');
      expect(file!.extension).toBe('gitignore');
    });

    it('handles file ending with a dot', () => {
      tree.addFile('weird.', 1000, 'Alice');
      const file = tree.getFile('weird.');
      expect(file!.extension).toBe('');
    });
  });

  describe('multiple operations on same file', () => {
    it('handles add-modify-delete-add cycle', () => {
      tree.addFile('f.ts', 1000, 'Alice');
      expect(tree.getFile('f.ts')!.alive).toBe(true);

      tree.modifyFile('f.ts', 1500, 'Bob');
      expect(tree.getFile('f.ts')!.lastAuthor).toBe('Bob');

      tree.deleteFile('f.ts');
      expect(tree.getFile('f.ts')!.alive).toBe(false);

      tree.addFile('f.ts', 2000, 'Charlie');
      expect(tree.getFile('f.ts')!.alive).toBe(true);
      expect(tree.getFile('f.ts')!.lastAuthor).toBe('Charlie');
    });

    it('handles multiple deletes on same file', () => {
      tree.addFile('f.ts', 1000, 'Alice');
      expect(tree.deleteFile('f.ts')).toBe(true);
      expect(tree.deleteFile('f.ts')).toBe(true); // already dead, still returns true
    });
  });

  describe('empty tree operations', () => {
    it('getAliveFiles on empty tree returns empty array', () => {
      expect(tree.getAliveFiles()).toEqual([]);
    });

    it('getAllFiles on empty tree returns empty array', () => {
      expect(tree.getAllFiles()).toEqual([]);
    });

    it('getAllDirs on empty tree returns only root', () => {
      const dirs = tree.getAllDirs();
      expect(dirs).toHaveLength(1);
      expect(dirs[0].id).toBe('');
    });

    it('getFile for non-existent path returns undefined', () => {
      expect(tree.getFile('nope.ts')).toBeUndefined();
    });

    it('getDir for non-existent path returns undefined', () => {
      expect(tree.getDir('nope')).toBeUndefined();
    });
  });

  describe('applyCommit — extended', () => {
    it('handles modify on non-existent file (implicit add)', () => {
      tree.applyCommit({
        timestamp: 1000,
        author: 'Alice',
        files: [{ action: 'M', path: 'new.ts' }],
      });
      const file = tree.getFile('new.ts');
      expect(file).toBeDefined();
      expect(file!.alive).toBe(true);
      expect(file!.lastAuthor).toBe('Alice');
    });

    it('handles delete on non-existent file (no-op)', () => {
      tree.applyCommit({
        timestamp: 1000,
        author: 'Alice',
        files: [{ action: 'D', path: 'nonexist.ts' }],
      });
      expect(tree.getFile('nonexist.ts')).toBeUndefined();
    });

    it('applies commit with mixed actions in order', () => {
      tree.applyCommit({
        timestamp: 1000,
        author: 'Alice',
        files: [
          { action: 'A', path: 'a.ts' },
          { action: 'A', path: 'b.ts' },
        ],
      });
      tree.applyCommit({
        timestamp: 2000,
        author: 'Bob',
        files: [
          { action: 'M', path: 'a.ts' },
          { action: 'D', path: 'b.ts' },
          { action: 'A', path: 'c.ts' },
        ],
      });
      expect(tree.getFile('a.ts')!.lastAuthor).toBe('Bob');
      expect(tree.getFile('b.ts')!.alive).toBe(false);
      expect(tree.getFile('c.ts')!.alive).toBe(true);
    });

    it('applies empty commit without error', () => {
      tree.applyCommit({
        timestamp: 1000,
        author: 'Alice',
        files: [],
      });
      expect(tree.getAllFiles()).toHaveLength(0);
    });
  });

  describe('directory depth tracking', () => {
    it('root has depth 0', () => {
      expect(tree.getDir('')!.depth).toBe(0);
    });

    it('first-level dirs have depth 1', () => {
      tree.addFile('src/file.ts', 1000, 'Alice');
      expect(tree.getDir('src')!.depth).toBe(1);
    });

    it('depth increments correctly through nesting', () => {
      tree.addFile('a/b/c/d/file.ts', 1000, 'Alice');
      expect(tree.getDir('a')!.depth).toBe(1);
      expect(tree.getDir('a/b')!.depth).toBe(2);
      expect(tree.getDir('a/b/c')!.depth).toBe(3);
      expect(tree.getDir('a/b/c/d')!.depth).toBe(4);
    });
  });

  describe('root-level files', () => {
    it('multiple root-level files all have parent ""', () => {
      tree.addFile('README.md', 1000, 'Alice');
      tree.addFile('LICENSE', 1000, 'Alice');
      tree.addFile('Makefile', 1000, 'Alice');

      for (const name of ['README.md', 'LICENSE', 'Makefile']) {
        expect(tree.getFile(name)!.parent).toBe('');
      }
      expect(tree.getDir('')!.children).toContain('README.md');
      expect(tree.getDir('')!.children).toContain('LICENSE');
      expect(tree.getDir('')!.children).toContain('Makefile');
    });
  });
});
