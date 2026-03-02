import { describe, it, expect } from 'vitest';
import {
  isFileNode,
  isDirNode,
  type FileNode,
  type DirNode,
  type Commit,
  type GourceLogEntry,
  type FileAction,
  type LayoutEntry,
  type ParserWorkerRequest,
  type ParserWorkerResponse,
  type CommitBatch,
} from '../src/types';

const sampleFileNode: FileNode = {
  id: 'src/main.ts',
  name: 'main.ts',
  parent: 'src',
  extension: 'ts',
  color: 0x3178c6,
  position: [1, 0, 2],
  lastModified: 1700000000,
  lastAuthor: 'alice',
  alive: true,
};

const sampleDirNode: DirNode = {
  id: 'src',
  name: 'src',
  parent: null,
  children: ['src/main.ts'],
  position: [0, 0, 0],
  angle: 0,
  depth: 1,
};

describe('type guards', () => {
  it('isFileNode returns true for FileNode', () => {
    expect(isFileNode(sampleFileNode)).toBe(true);
  });

  it('isFileNode returns false for DirNode', () => {
    expect(isFileNode(sampleDirNode)).toBe(false);
  });

  it('isDirNode returns true for DirNode', () => {
    expect(isDirNode(sampleDirNode)).toBe(true);
  });

  it('isDirNode returns false for FileNode', () => {
    expect(isDirNode(sampleFileNode)).toBe(false);
  });
});

describe('data model structure', () => {
  it('Commit model holds files with actions', () => {
    const commit: Commit = {
      timestamp: 1700000000,
      author: 'alice',
      files: [
        { action: 'A', path: 'src/main.ts', color: 0x3178c6 },
        { action: 'M', path: 'README.md' },
        { action: 'D', path: 'old.txt' },
      ],
    };
    expect(commit.files).toHaveLength(3);
    expect(commit.files[0].action).toBe('A');
    expect(commit.files[1].action).toBe('M');
    expect(commit.files[2].action).toBe('D');
  });

  it('GourceLogEntry matches the pipe-delimited format fields', () => {
    const entry: GourceLogEntry = {
      timestamp: 1700000000,
      username: 'alice',
      action: 'A',
      filepath: 'src/main.ts',
      color: 0x4488ff,
    };
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.filepath).toContain('/');
  });

  it('FileAction is constrained to A, M, D', () => {
    const actions: FileAction[] = ['A', 'M', 'D'];
    expect(actions).toHaveLength(3);
  });

  it('LayoutEntry has position and angle', () => {
    const entry: LayoutEntry = {
      id: 'src/main.ts',
      position: [1, 0, 2],
      angle: 0.5,
    };
    expect(entry.position).toHaveLength(3);
    expect(entry.angle).toBeGreaterThanOrEqual(0);
  });

  it('CommitBatch groups commits by time window', () => {
    const batch: CommitBatch = {
      startTimestamp: 1700000000,
      endTimestamp: 1700086400,
      commits: [
        { timestamp: 1700000000, author: 'alice', files: [] },
        { timestamp: 1700043200, author: 'bob', files: [] },
      ],
    };
    expect(batch.endTimestamp).toBeGreaterThan(batch.startTimestamp);
    expect(batch.commits).toHaveLength(2);
  });

  it('ParserWorkerRequest supports parse and parse-chunk types', () => {
    const parse: ParserWorkerRequest = { type: 'parse', payload: 'data' };
    const chunk: ParserWorkerRequest = {
      type: 'parse-chunk',
      payload: 'chunk-data',
      chunkIndex: 0,
      isLast: true,
    };
    expect(parse.type).toBe('parse');
    expect(chunk.type).toBe('parse-chunk');
  });

  it('ParserWorkerResponse supports parsed, chunk-parsed, and error types', () => {
    const parsed: ParserWorkerResponse = { type: 'parsed', commits: [] };
    const chunkParsed: ParserWorkerResponse = {
      type: 'chunk-parsed',
      commits: [],
      chunkIndex: 0,
      isLast: false,
    };
    const error: ParserWorkerResponse = { type: 'error', message: 'fail' };
    expect(parsed.type).toBe('parsed');
    expect(chunkParsed.type).toBe('chunk-parsed');
    expect(error.type).toBe('error');
  });
});
