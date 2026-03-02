import { describe, it, expect } from 'vitest';
import {
  computeGlowScale,
  computeGlowEmissive,
  computeFadeOpacity,
  buildFileNodeArrays,
} from '../src/utils/fileNodeHelpers';
import { FILE_PULSE_DURATION_MS, FILE_FADEOUT_DURATION_MS } from '../src/utils/constants';
import type { FileNode, Vec3 } from '../src/types';

function makeFile(overrides: Partial<FileNode> = {}): FileNode {
  return {
    id: 'src/test.ts',
    name: 'test.ts',
    parent: 'src',
    extension: 'ts',
    color: 0x3178c6,
    position: [5, 0, 3] as Vec3,
    lastModified: 1000,
    lastAuthor: 'Alice',
    alive: true,
    ...overrides,
  };
}

describe('computeGlowScale — boundary values', () => {
  it('returns exactly 1.8 at elapsed=0', () => {
    // t = 1 - 0/2000 = 1.0; scale = 1.0 + 0.8 * 1 * 1 = 1.8
    expect(computeGlowScale(0)).toBeCloseTo(1.8, 5);
  });

  it('returns exactly 1.0 at elapsed=FILE_PULSE_DURATION_MS', () => {
    expect(computeGlowScale(FILE_PULSE_DURATION_MS)).toBeCloseTo(1.0, 5);
  });

  it('returns 1.0 for elapsed slightly beyond duration', () => {
    expect(computeGlowScale(FILE_PULSE_DURATION_MS + 1)).toBeCloseTo(1.0, 5);
  });

  it('returns 1.0 for very large elapsed', () => {
    expect(computeGlowScale(1_000_000)).toBeCloseTo(1.0, 5);
  });

  it('returns value between 1.0 and 1.8 at half duration', () => {
    const scale = computeGlowScale(FILE_PULSE_DURATION_MS / 2);
    expect(scale).toBeGreaterThan(1.0);
    expect(scale).toBeLessThan(1.8);
  });

  it('handles negative elapsed (treats as fresh)', () => {
    // Negative elapsed: t = 1 - (-100/2000) = 1.05, scale = 1 + 0.8 * 1.05^2
    const scale = computeGlowScale(-100);
    expect(scale).toBeGreaterThan(1.8);
  });
});

describe('computeGlowEmissive — boundary values', () => {
  it('returns exactly 1.0 at elapsed=0', () => {
    expect(computeGlowEmissive(0)).toBeCloseTo(1.0, 5);
  });

  it('returns exactly 0.0 at elapsed=FILE_PULSE_DURATION_MS', () => {
    expect(computeGlowEmissive(FILE_PULSE_DURATION_MS)).toBeCloseTo(0.0, 5);
  });

  it('returns 0.0 for elapsed beyond duration', () => {
    expect(computeGlowEmissive(FILE_PULSE_DURATION_MS + 500)).toBeCloseTo(0.0, 5);
  });

  it('returns value between 0 and 1 at half duration', () => {
    const em = computeGlowEmissive(FILE_PULSE_DURATION_MS / 2);
    expect(em).toBeGreaterThan(0.0);
    expect(em).toBeLessThan(1.0);
  });
});

describe('computeFadeOpacity — boundary values', () => {
  it('returns 1.0 for alive file regardless of elapsed', () => {
    expect(computeFadeOpacity(true, 0)).toBeCloseTo(1.0);
    expect(computeFadeOpacity(true, 5000)).toBeCloseTo(1.0);
    expect(computeFadeOpacity(true, -100)).toBeCloseTo(1.0);
  });

  it('returns exactly 1.0 at elapsed=0 for dead file', () => {
    expect(computeFadeOpacity(false, 0)).toBeCloseTo(1.0, 5);
  });

  it('returns exactly 0.5 at half fadeout duration', () => {
    expect(computeFadeOpacity(false, FILE_FADEOUT_DURATION_MS / 2)).toBeCloseTo(0.5, 5);
  });

  it('returns exactly 0.0 at elapsed=FILE_FADEOUT_DURATION_MS', () => {
    expect(computeFadeOpacity(false, FILE_FADEOUT_DURATION_MS)).toBeCloseTo(0.0, 5);
  });

  it('returns 0.0 for elapsed beyond fadeout', () => {
    expect(computeFadeOpacity(false, FILE_FADEOUT_DURATION_MS + 500)).toBeCloseTo(0.0, 5);
  });

  it('handles negative elapsed for dead file', () => {
    // 1.0 - (-100 / 1000) = 1.1
    const opacity = computeFadeOpacity(false, -100);
    expect(opacity).toBeGreaterThan(1.0);
  });
});

describe('buildFileNodeArrays — extended', () => {
  it('handles large number of files', () => {
    const files: FileNode[] = [];
    for (let i = 0; i < 1000; i++) {
      files.push(makeFile({ id: `file${i}.ts`, position: [i, 0, 0], alive: true }));
    }
    const result = buildFileNodeArrays(files, 2000);
    expect(result.count).toBe(1000);
    expect(result.positions.length).toBe(3000);
    expect(result.colors.length).toBe(3000);
    expect(result.scales.length).toBe(1000);
    expect(result.opacities.length).toBe(1000);
    expect(result.ids.length).toBe(1000);
  });

  it('all alive files have opacity 1.0', () => {
    const files = [makeFile({ id: 'a.ts', alive: true }), makeFile({ id: 'b.ts', alive: true })];
    const result = buildFileNodeArrays(files, 5000);
    expect(result.opacities[0]).toBeCloseTo(1.0);
    expect(result.opacities[1]).toBeCloseTo(1.0);
  });

  it('dead file within fadeout has partial opacity', () => {
    const files = [makeFile({ id: 'dying.ts', alive: false, lastModified: 1500 })];
    // currentTime=2000, elapsed=500ms, opacity = 1 - 500/1000 = 0.5
    const result = buildFileNodeArrays(files, 2000);
    expect(result.count).toBe(1);
    expect(result.opacities[0]).toBeCloseTo(0.5, 1);
  });

  it('dead file exactly at fadeout boundary is excluded', () => {
    const files = [
      makeFile({
        id: 'dead.ts',
        alive: false,
        lastModified: 1000,
      }),
    ];
    // currentTime = 1000 + FILE_FADEOUT_DURATION_MS = exactly at boundary
    const result = buildFileNodeArrays(files, 1000 + FILE_FADEOUT_DURATION_MS);
    expect(result.count).toBe(0);
  });

  it('correctly normalizes colors for 0x000000 (black)', () => {
    const files = [makeFile({ color: 0x000000 })];
    const result = buildFileNodeArrays(files, 5000);
    expect(result.colors[0]).toBeCloseTo(0.0);
    expect(result.colors[1]).toBeCloseTo(0.0);
    expect(result.colors[2]).toBeCloseTo(0.0);
  });

  it('correctly normalizes colors for 0xFFFFFF (white)', () => {
    const files = [makeFile({ color: 0xffffff })];
    const result = buildFileNodeArrays(files, 5000);
    expect(result.colors[0]).toBeCloseTo(1.0, 1);
    expect(result.colors[1]).toBeCloseTo(1.0, 1);
    expect(result.colors[2]).toBeCloseTo(1.0, 1);
  });

  it('ids array matches file order', () => {
    const files = [
      makeFile({ id: 'first.ts' }),
      makeFile({ id: 'second.ts' }),
      makeFile({ id: 'third.ts' }),
    ];
    const result = buildFileNodeArrays(files, 5000);
    expect(result.ids).toEqual(['first.ts', 'second.ts', 'third.ts']);
  });
});
