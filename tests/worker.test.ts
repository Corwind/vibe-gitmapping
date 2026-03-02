import { describe, it, expect } from 'vitest';
import { handleMessage } from '../src/workers/logParser.worker';
import type { ParserWorkerRequest } from '../src/types';

describe('logParser worker handleMessage', () => {
  it('handles a parse request and returns commits', () => {
    const request: ParserWorkerRequest = {
      type: 'parse',
      payload: '1000000000|Alice|A|src/main.ts|3178C6\n1000000000|Alice|M|README.md|',
    };
    const response = handleMessage(request);
    expect(response.type).toBe('parsed');
    if (response.type === 'parsed') {
      expect(response.commits).toHaveLength(1);
      expect(response.commits[0].files).toHaveLength(2);
    }
  });

  it('handles empty parse request', () => {
    const request: ParserWorkerRequest = { type: 'parse', payload: '' };
    const response = handleMessage(request);
    expect(response.type).toBe('parsed');
    if (response.type === 'parsed') {
      expect(response.commits).toEqual([]);
    }
  });

  it('handles parse-chunk request', () => {
    const request: ParserWorkerRequest = {
      type: 'parse-chunk',
      payload: '1000000000|Alice|A|file.ts|',
      chunkIndex: 0,
      isLast: false,
    };
    const response = handleMessage(request);
    expect(response.type).toBe('chunk-parsed');
    if (response.type === 'chunk-parsed') {
      expect(response.commits).toHaveLength(1);
      expect(response.chunkIndex).toBe(0);
      expect(response.isLast).toBe(false);
    }
  });

  it('handles parse-chunk with isLast=true', () => {
    const request: ParserWorkerRequest = {
      type: 'parse-chunk',
      payload: '1000000000|Bob|M|final.ts|',
      chunkIndex: 5,
      isLast: true,
    };
    const response = handleMessage(request);
    expect(response.type).toBe('chunk-parsed');
    if (response.type === 'chunk-parsed') {
      expect(response.chunkIndex).toBe(5);
      expect(response.isLast).toBe(true);
    }
  });

  it('handles a large chunk (simulating streaming)', () => {
    const lines: string[] = [];
    for (let i = 0; i < 5000; i++) {
      lines.push(`${1000000000 + i}|author${i % 3}|M|file${i}.ts|`);
    }
    const request: ParserWorkerRequest = {
      type: 'parse-chunk',
      payload: lines.join('\n'),
      chunkIndex: 0,
      isLast: true,
    };
    const response = handleMessage(request);
    expect(response.type).toBe('chunk-parsed');
    if (response.type === 'chunk-parsed') {
      const totalFiles = response.commits.reduce((sum, c) => sum + c.files.length, 0);
      expect(totalFiles).toBe(5000);
    }
  });
});
