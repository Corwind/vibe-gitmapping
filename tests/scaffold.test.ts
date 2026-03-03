import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR, DEPTH_SPACING } from '../src/utils/constants';

describe('scaffold smoke tests', () => {
  it('constants are defined', () => {
    expect(DEPTH_SPACING).toBeGreaterThan(0);
    expect(DEFAULT_FILE_COLOR).toBe(0xb0b8c0);
  });

  it('colorForExtension returns known color for .ts', () => {
    expect(colorForExtension('ts')).toBe(0x3b82f6);
  });

  it('colorForExtension returns hash-derived color for unknown extension', () => {
    // Unknown extensions get a hash-derived vibrant color, not the grey default
    expect(colorForExtension('xyz')).not.toBe(DEFAULT_FILE_COLOR);
    expect(colorForExtension('xyz')).toBeTypeOf('number');
  });

  it('colorForExtension handles leading dot', () => {
    expect(colorForExtension('.py')).toBe(0x3572a5);
  });

  it('parseHexColor parses valid hex', () => {
    expect(parseHexColor('4488FF')).toBe(0x4488ff);
  });

  it('parseHexColor returns default for invalid input', () => {
    expect(parseHexColor('not-hex')).toBe(DEFAULT_FILE_COLOR);
  });
});
