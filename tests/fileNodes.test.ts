import { describe, it, expect } from 'vitest';
import { colorForExtension } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR } from '../src/utils/constants';
import {
  buildFileNodeArrays,
  computeGlowScale,
  computeGlowEmissive,
  computeFadeOpacity,
} from '../src/utils/fileNodeHelpers';
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

describe('colorForExtension', () => {
  it('returns correct color for known extensions', () => {
    expect(colorForExtension('ts')).toBe(0x3178c6);
    expect(colorForExtension('js')).toBe(0xf7df1e);
    expect(colorForExtension('py')).toBe(0x3572a5);
    expect(colorForExtension('go')).toBe(0x00add8);
    expect(colorForExtension('rs')).toBe(0xdea584);
  });

  it('returns default for unknown extensions', () => {
    expect(colorForExtension('xyz')).toBe(DEFAULT_FILE_COLOR);
    expect(colorForExtension('')).toBe(DEFAULT_FILE_COLOR);
  });

  it('is case-insensitive', () => {
    expect(colorForExtension('TS')).toBe(0x3178c6);
    expect(colorForExtension('Js')).toBe(0xf7df1e);
  });

  it('strips leading dot', () => {
    expect(colorForExtension('.ts')).toBe(0x3178c6);
    expect(colorForExtension('.py')).toBe(0x3572a5);
  });
});

describe('buildFileNodeArrays', () => {
  it('returns empty arrays for empty input', () => {
    const result = buildFileNodeArrays([], 1000);
    expect(result.count).toBe(0);
    expect(result.positions.length).toBe(0);
    expect(result.colors.length).toBe(0);
    expect(result.scales.length).toBe(0);
  });

  it('returns correct count for alive files only', () => {
    const files = [
      makeFile({ id: 'a.ts', alive: true }),
      makeFile({ id: 'b.ts', alive: false, lastModified: 500 }),
      makeFile({ id: 'c.ts', alive: true }),
    ];
    const result = buildFileNodeArrays(files, 2000);
    // Alive files are always included; dead files are included only during fadeout
    // b.ts has lastModified 500, currentTime 2000 => 1500ms elapsed > 1000ms fadeout => excluded
    expect(result.count).toBe(2);
  });

  it('includes recently deleted files during fadeout', () => {
    const files = [
      makeFile({ id: 'a.ts', alive: true }),
      makeFile({ id: 'b.ts', alive: false, lastModified: 1500 }),
    ];
    // currentTime 2000, b.ts deleted at 1500, elapsed 500ms < 1000ms fadeout
    const result = buildFileNodeArrays(files, 2000);
    expect(result.count).toBe(2);
  });

  it('outputs correct positions', () => {
    const files = [makeFile({ position: [10, 0, 20] })];
    const result = buildFileNodeArrays(files, 1000);
    expect(result.positions[0]).toBeCloseTo(10);
    expect(result.positions[1]).toBeCloseTo(0);
    expect(result.positions[2]).toBeCloseTo(20);
  });

  it('outputs correct colors from file.color', () => {
    const files = [makeFile({ color: 0xff0000 })];
    const result = buildFileNodeArrays(files, 1000);
    // Red channel
    expect(result.colors[0]).toBeCloseTo(1.0, 1);
    // Green channel
    expect(result.colors[1]).toBeCloseTo(0.0, 1);
    // Blue channel
    expect(result.colors[2]).toBeCloseTo(0.0, 1);
  });

  it('returns stable order across calls with same input', () => {
    const files = [
      makeFile({ id: 'a.ts', position: [1, 0, 0] }),
      makeFile({ id: 'b.ts', position: [2, 0, 0] }),
      makeFile({ id: 'c.ts', position: [3, 0, 0] }),
    ];
    const r1 = buildFileNodeArrays(files, 1000);
    const r2 = buildFileNodeArrays(files, 1000);
    expect(r1.positions).toEqual(r2.positions);
    expect(r1.colors).toEqual(r2.colors);
  });
});

describe('computeGlowScale', () => {
  it('returns 1.0 at elapsed=0 (guard against zero/negative)', () => {
    const scale = computeGlowScale(0);
    expect(scale).toBeCloseTo(1.0);
  });

  it('returns max scale for very recently modified file', () => {
    const scale = computeGlowScale(1);
    expect(scale).toBeGreaterThan(1.0);
    expect(scale).toBeLessThanOrEqual(2.0);
  });

  it('returns 1.0 after pulse duration expires', () => {
    const scale = computeGlowScale(3000);
    expect(scale).toBeCloseTo(1.0, 2);
  });

  it('smoothly decreases over time (for positive elapsed)', () => {
    const s1 = computeGlowScale(1);
    const s2 = computeGlowScale(500);
    const s3 = computeGlowScale(1000);
    const s4 = computeGlowScale(2000);
    expect(s1).toBeGreaterThanOrEqual(s2);
    expect(s2).toBeGreaterThanOrEqual(s3);
    expect(s3).toBeGreaterThanOrEqual(s4);
  });
});

describe('computeGlowEmissive', () => {
  it('returns 0.0 at elapsed=0 (guard against zero/negative)', () => {
    expect(computeGlowEmissive(0)).toBeCloseTo(0.0);
  });

  it('returns high emissive for very recently modified file', () => {
    const em = computeGlowEmissive(1);
    expect(em).toBeGreaterThan(0.5);
  });

  it('returns 0 after pulse duration expires', () => {
    const em = computeGlowEmissive(3000);
    expect(em).toBeCloseTo(0.0, 2);
  });
});

describe('computeFadeOpacity', () => {
  it('returns 1.0 for alive files', () => {
    const opacity = computeFadeOpacity(true, 0);
    expect(opacity).toBeCloseTo(1.0);
  });

  it('returns 1.0 for just-deleted files', () => {
    const opacity = computeFadeOpacity(false, 0);
    expect(opacity).toBeCloseTo(1.0);
  });

  it('returns 0.0 after fadeout duration', () => {
    const opacity = computeFadeOpacity(false, 1500);
    expect(opacity).toBeCloseTo(0.0);
  });

  it('smoothly fades during deletion', () => {
    const o1 = computeFadeOpacity(false, 0);
    const o2 = computeFadeOpacity(false, 250);
    const o3 = computeFadeOpacity(false, 500);
    const o4 = computeFadeOpacity(false, 1000);
    expect(o1).toBeGreaterThanOrEqual(o2);
    expect(o2).toBeGreaterThanOrEqual(o3);
    expect(o3).toBeGreaterThanOrEqual(o4);
  });
});

describe('buildFileNodeArrays scale integration', () => {
  it('recently modified files have scale > 1', () => {
    const files = [makeFile({ lastModified: 900 })];
    const result = buildFileNodeArrays(files, 1000);
    expect(result.scales[0]).toBeGreaterThan(1.0);
  });

  it('old files have scale = 1', () => {
    const files = [makeFile({ lastModified: 100 })];
    const result = buildFileNodeArrays(files, 5000);
    expect(result.scales[0]).toBeCloseTo(1.0, 1);
  });
});
