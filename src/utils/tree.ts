import type { FileNode, DirNode, Commit } from '../types';
import { colorForExtension } from './colors';

/**
 * Extracts the file extension from a filename.
 * Returns empty string if no extension.
 */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1) : '';
}

/**
 * Splits a file path into its parent directory and filename.
 * For "src/utils/file.ts" returns { parent: "src/utils", name: "file.ts" }.
 * For "file.ts" returns { parent: "", name: "file.ts" }.
 */
function splitPath(path: string): { parent: string; name: string } {
  const slash = path.lastIndexOf('/');
  if (slash === -1) return { parent: '', name: path };
  return { parent: path.slice(0, slash), name: path.slice(slash + 1) };
}

/**
 * Incremental tree data structure for a git repository's file hierarchy.
 * Supports adding, modifying, and deleting files over time as commits are applied.
 */
export class FileTree {
  private files: Map<string, FileNode> = new Map();
  private dirs: Map<string, DirNode> = new Map();

  constructor() {
    // Always create the root directory
    this.dirs.set('', {
      id: '',
      name: '',
      parent: null,
      children: [],
      position: [0, 0, 0],
      angle: 0,
      depth: 0,
    });
  }

  /** Ensure a directory exists, creating intermediate directories as needed. */
  private ensureDir(dirPath: string): void {
    if (this.dirs.has(dirPath)) return;

    const { parent, name } = splitPath(dirPath);
    // Recursively ensure parent exists
    this.ensureDir(parent);

    const dir: DirNode = {
      id: dirPath,
      name,
      parent,
      children: [],
      position: [0, 0, 0],
      angle: 0,
      depth: this.dirs.get(parent)!.depth + 1,
    };
    this.dirs.set(dirPath, dir);

    // Add to parent's children
    const parentDir = this.dirs.get(parent)!;
    if (!parentDir.children.includes(dirPath)) {
      parentDir.children.push(dirPath);
    }
  }

  /** Add a new file to the tree. Creates intermediate directories as needed. */
  addFile(path: string, timestamp: number, author: string, color?: number): void {
    const { parent, name } = splitPath(path);
    const ext = getExtension(name);

    this.ensureDir(parent);

    const existing = this.files.get(path);
    if (existing) {
      // Re-add: just revive and update metadata
      existing.alive = true;
      existing.lastModified = timestamp;
      existing.lastAuthor = author;
      if (color !== undefined) existing.color = color;
      return;
    }

    const file: FileNode = {
      id: path,
      name,
      parent,
      extension: ext,
      color: color ?? colorForExtension(ext),
      position: [0, 0, 0],
      lastModified: timestamp,
      lastAuthor: author,
      alive: true,
    };
    this.files.set(path, file);

    // Add to parent's children
    const parentDir = this.dirs.get(parent)!;
    if (!parentDir.children.includes(path)) {
      parentDir.children.push(path);
    }
  }

  /** Modify an existing file's metadata. Returns false if the file doesn't exist. */
  modifyFile(path: string, timestamp: number, author: string): boolean {
    const file = this.files.get(path);
    if (!file) return false;
    file.lastModified = timestamp;
    file.lastAuthor = author;
    file.alive = true; // revive if deleted
    return true;
  }

  /** Mark a file as deleted. Returns false if the file doesn't exist. */
  deleteFile(path: string): boolean {
    const file = this.files.get(path);
    if (!file) return false;
    file.alive = false;
    return true;
  }

  /** Get a file node by its path. */
  getFile(path: string): FileNode | undefined {
    return this.files.get(path);
  }

  /** Get a directory node by its path. */
  getDir(path: string): DirNode | undefined {
    return this.dirs.get(path);
  }

  /** Get all alive (non-deleted) file nodes. */
  getAliveFiles(): FileNode[] {
    const result: FileNode[] = [];
    for (const file of this.files.values()) {
      if (file.alive) result.push(file);
    }
    return result;
  }

  /** Get all directory nodes. */
  getAllDirs(): DirNode[] {
    return Array.from(this.dirs.values());
  }

  /** Get all file nodes (including deleted). */
  getAllFiles(): FileNode[] {
    return Array.from(this.files.values());
  }

  /** Get the internal files Map (read-only reference, no copy). */
  getFilesMap(): Map<string, FileNode> {
    return this.files;
  }

  /** Get the internal dirs Map (read-only reference, no copy). */
  getDirsMap(): Map<string, DirNode> {
    return this.dirs;
  }

  /** Apply a commit to the tree, processing all file changes. */
  applyCommit(commit: Commit): void {
    for (const change of commit.files) {
      switch (change.action) {
        case 'A':
          this.addFile(change.path, commit.timestamp, commit.author, change.color);
          break;
        case 'M':
          if (!this.modifyFile(change.path, commit.timestamp, commit.author)) {
            // File doesn't exist yet, treat M as an implicit add
            this.addFile(change.path, commit.timestamp, commit.author, change.color);
          }
          break;
        case 'D':
          this.deleteFile(change.path);
          break;
      }
    }
  }
}
