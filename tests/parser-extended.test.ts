import { describe, it, expect } from 'vitest';
import { parseGourceLog, parseGourceLogEntry, groupEntriesToCommits } from '../src/utils/parser';
import type { GourceLogEntry } from '../src/types';

describe('parseGourceLogEntry — extended edge cases', () => {
  it('handles timestamp of 0', () => {
    const entry = parseGourceLogEntry('0|Alice|A|file.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBe(0);
  });

  it('handles very large timestamps (year 3000+)', () => {
    const entry = parseGourceLogEntry('32503680000|Alice|A|future.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBe(32503680000);
  });

  it('handles negative timestamps', () => {
    // parseInt will parse negative numbers
    const entry = parseGourceLogEntry('-100|Alice|A|past.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBe(-100);
  });

  it('handles unicode author names', () => {
    const entry = parseGourceLogEntry('1000|日本語ユーザー|A|file.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.username).toBe('日本語ユーザー');
  });

  it('handles emoji in author name', () => {
    const entry = parseGourceLogEntry('1000|Alice 🚀|M|rocket.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.username).toBe('Alice 🚀');
  });

  it('handles author name with pipe-like characters escaped', () => {
    // If the username field is just empty it should still parse
    const entry = parseGourceLogEntry('1000||A|file.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.username).toBe('');
  });

  it('handles filepath with unicode characters', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|src/日本語/ファイル.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.filepath).toBe('src/日本語/ファイル.ts');
  });

  it('handles filepath with only a single character', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|x|');
    expect(entry).not.toBeNull();
    expect(entry!.filepath).toBe('x');
  });

  it('handles extra pipe-separated fields (forward compat)', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|file.ts|FF0000|extra|fields');
    expect(entry).not.toBeNull();
    expect(entry!.color).toBe(0xff0000);
  });

  it('rejects empty filepath after split', () => {
    const entry = parseGourceLogEntry('1000|Alice|A||');
    expect(entry).toBeNull();
  });

  it('handles invalid hex color gracefully (returns undefined)', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|file.ts|ZZZZZZ');
    expect(entry).not.toBeNull();
    expect(entry!.color).toBeUndefined();
  });

  it('handles partial hex color', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|file.ts|F0');
    expect(entry).not.toBeNull();
    expect(entry!.color).toBe(0xf0);
  });

  it('handles lowercase hex color', () => {
    const entry = parseGourceLogEntry('1000|Alice|A|file.ts|ff00ff');
    expect(entry).not.toBeNull();
    expect(entry!.color).toBe(0xff00ff);
  });

  it('handles all three valid actions', () => {
    expect(parseGourceLogEntry('1000|A|A|f|')!.action).toBe('A');
    expect(parseGourceLogEntry('1000|A|M|f|')!.action).toBe('M');
    expect(parseGourceLogEntry('1000|A|D|f|')!.action).toBe('D');
  });

  it('rejects lowercase actions', () => {
    expect(parseGourceLogEntry('1000|A|a|f|')).toBeNull();
    expect(parseGourceLogEntry('1000|A|m|f|')).toBeNull();
    expect(parseGourceLogEntry('1000|A|d|f|')).toBeNull();
  });

  it('handles whitespace-only input', () => {
    expect(parseGourceLogEntry('   ')).toBeNull();
  });

  it('handles tab-separated data (not pipe)', () => {
    expect(parseGourceLogEntry('1000\tAlice\tA\tfile.ts')).toBeNull();
  });

  it('handles floating-point timestamp (parsed as integer)', () => {
    const entry = parseGourceLogEntry('1000.5|Alice|A|file.ts|');
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBe(1000);
  });
});

describe('groupEntriesToCommits — extended edge cases', () => {
  it('handles single entry', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(1);
  });

  it('merges many files from the same author at same timestamp', () => {
    const entries: GourceLogEntry[] = [];
    for (let i = 0; i < 100; i++) {
      entries.push({ timestamp: 100, username: 'Alice', action: 'A', filepath: `file${i}.ts` });
    }
    const commits = groupEntriesToCommits(entries);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(100);
  });

  it('does not set color if entry has no color', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits[0].files[0].color).toBeUndefined();
  });

  it('preserves file order within a commit', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'z.ts' },
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'a.ts' },
      { timestamp: 100, username: 'Alice', action: 'A', filepath: 'm.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits[0].files[0].path).toBe('z.ts');
    expect(commits[0].files[1].path).toBe('a.ts');
    expect(commits[0].files[2].path).toBe('m.ts');
  });

  it('handles entries out of timestamp order', () => {
    const entries: GourceLogEntry[] = [
      { timestamp: 300, username: 'C', action: 'A', filepath: 'c.ts' },
      { timestamp: 100, username: 'A', action: 'A', filepath: 'a.ts' },
      { timestamp: 200, username: 'B', action: 'A', filepath: 'b.ts' },
    ];
    const commits = groupEntriesToCommits(entries);
    expect(commits[0].timestamp).toBe(100);
    expect(commits[1].timestamp).toBe(200);
    expect(commits[2].timestamp).toBe(300);
  });
});

describe('parseGourceLog — extended edge cases', () => {
  it('handles only comments and blank lines', () => {
    const log = '# comment\n\n# another comment\n   \n';
    const commits = parseGourceLog(log);
    expect(commits).toEqual([]);
  });

  it('handles lines with leading/trailing whitespace', () => {
    const log = '  1000|Alice|A|file.ts|  ';
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
  });

  it('handles mixed valid and invalid lines', () => {
    const log = [
      '1000|Alice|A|good.ts|',
      'bad|line',
      '|||||',
      '1000|Alice|M|also-good.ts|',
      'notadate|X|Z|nope',
    ].join('\n');
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(2);
  });

  it('handles single line with no newline', () => {
    const log = '1000|Alice|A|file.ts|FF0000';
    const commits = parseGourceLog(log);
    expect(commits).toHaveLength(1);
  });

  it('handles null-like input', () => {
    expect(parseGourceLog(null as unknown as string)).toEqual([]);
    expect(parseGourceLog(undefined as unknown as string)).toEqual([]);
  });
});
