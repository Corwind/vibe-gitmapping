import { describe, it, expect } from 'vitest';
import { parseGourceLog, parseGourceLogEntry, groupEntriesToCommits } from '../src/utils/parser';
import type { GourceLogEntry } from '../src/types';

describe('parseGourceLogEntry', () => {
  it('parses a standard entry with color', () => {
    const entry = parseGourceLogEntry('1234567890|Alice|A|src/main.ts|4488FF');
    expect(entry).toEqual({
      timestamp: 1234567890,
      username: 'Alice',
      action: 'A',
      filepath: 'src/main.ts',
      color: 0x4488ff,
    });
  });

  it('parses an entry without color', () => {
    const entry = parseGourceLogEntry('1234567890|Bob|M|README.md|');
    expect(entry).toEqual({
      timestamp: 1234567890,
      username: 'Bob',
      action: 'M',
      filepath: 'README.md',
      color: undefined,
    });
  });

  it('parses an entry with no trailing pipe', () => {
    const entry = parseGourceLogEntry('1234567890|Charlie|D|old/file.txt');
    expect(entry).toEqual({
      timestamp: 1234567890,
      username: 'Charlie',
      action: 'D',
      filepath: 'old/file.txt',
      color: undefined,
    });
  });

  it('handles deeply nested file paths', () => {
    const entry = parseGourceLogEntry(
      '1000000000|Dev|A|a/b/c/d/e/f/g/deep.rs|DDDDD0',
    );
    expect(entry).not.toBeNull();
    expect(entry!.filepath).toBe('a/b/c/d/e/f/g/deep.rs');
  });

  it('returns null for empty string', () => {
    expect(parseGourceLogEntry('')).toBeNull();
  });

  it('returns null for malformed line (missing fields)', () => {
    expect(parseGourceLogEntry('1234567890|Alice')).toBeNull();
  });

  it('returns null for non-numeric timestamp', () => {
    expect(parseGourceLogEntry('notadate|Alice|A|file.ts|')).toBeNull();
  });

  it('returns null for invalid action', () => {
    expect(parseGourceLogEntry('1234567890|Alice|X|file.ts|')).toBeNull();
  });

  it('handles username with special characters', () => {
    const entry = parseGourceLogEntry("1234567890|O'Brien, Jr.|M|file.ts|");
    expect(entry).not.toBeNull();
    expect(entry!.username).toBe("O'Brien, Jr.");
  });

  it('handles filepath with spaces', () => {
    const entry = parseGourceLogEntry('1234567890|Alice|A|path/to/my file.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.filepath).toBe('path/to/my file.ts');
  });
});

describe('groupEntriesToCommits', () => {
  it('groups entries with the same timestamp and author', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
      { timestamp: 100, username: 'Alice', action: 'M', filepath: 'b.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(2);
    expect(commits[0].author).toBe('Alice');
    expect(commits[0].timestamp).toBe(100);
  });

  it('separates different authors at the same timestamp', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
      { timestamp: 100, username: 'Bob', action: 'M', filepath: 'b.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits).toHaveLength(2);
  });

  it('separates different timestamps for the same author', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
      { timestamp: 200, username: 'Alice', action: 'M', filepath: 'b.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(groupEntriesToCommits([])).toEqual([]);
  });

  it('preserves color from entries', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts', color: 0xff0000 },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits[0].files[0].color).toBe(0xff0000);
  });

  it('commits are sorted by timestamp ascending', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 300, username: 'Charlie', action: 'A', filepath: 'c.ts' },
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
      { timestamp: 200, username: 'Bob', action: 'M', filepath: 'b.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits[0].timestamp).toBe(100);
    expect(commits[1].timestamp).toBe(200);
    expect(commits[2].timestamp).toBe(300);
  });
});

describe('parseGourceLog', () => {
  it('parses a full multi-line log into commits', () => {
    const log = [
      '1000000000|Alice|A|src/main.ts|3178C6',
      '1000000000|Alice|A|src/utils.ts|3178C6',
      '1000000000|Bob|M|README.md|',
      '1000086400|Alice|M|src/main.ts|',
    ].join('\n');

    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(3);

    const aliceFirst = commits.find(
      (c) => c.author === 'Alice' && c.timestamp === 1000000000,
    );
    expect(aliceFirst).toBeDefined();
    expect(aliceFirst!.files).toHaveLength(2);
  });

  it('skips blank lines and comments', () => {
    const log = [
      '# This is a comment',
      '',
      '1000000000|Alice|A|file.ts|',
      '',
      '# Another comment',
    ].join('\n');
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
  });

  it('handles Windows-style line endings', () => {
    const log = '1000000000|Alice|A|a.ts|\r\n1000000000|Alice|M|b.ts|\r\n';
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(2);
  });

  it('handles empty input', () => {
    expect(parseGourceLog('')).toEqual([]);
  });

  it('skips malformed lines and parses valid ones', () => {
    const log = [
      '1000000000|Alice|A|good.ts|',
      'bad line with no pipes',
      '1000000000|Alice|M|also-good.ts|',
    ].join('\n');
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(2);
  });

  it('handles large input (10k lines) without error', () => {
    const lines: string[] = [];
    for (let i = 0; i < 10000; i++) {
      const ts = 1000000000 + Math.floor(i / 10);
      const author = `author${i % 5}`;
      lines.push(`${ts}|${author}|M|file${i}.ts|`);
    }
    const commits = parseGourceLog(lines.join('\n'));
    expect(commits.length).toBeGreaterThan(0);
    const totalFiles = commits.reduce((sum, c) => sum + c.files.length, 0);
    expect(totalFiles).toBe(10000);
  });
});
