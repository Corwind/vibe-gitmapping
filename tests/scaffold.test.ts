import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR, DEPTH_SPACING } from '../src/utils/constants';

describe('scaffold smoke tests', () => {
  it('constants are defined', () => {
    expect(DEPTH_SPACING).toBeGreaterThan(0);
    expect(DEFAULT_FILE_COLOR).toBe(0xb0b8c0);
  });

  it('colorForExtension returns known color for .ts', () => {
    expect(colorForExtension('ts')).toBe(0x7cb3e0);
  });

  it('colorForExtension returns default for unknown extension', () => {
    expect(colorForExtension('xyz')).toBe(DEFAULT_FILE_COLOR);
  });

  it('colorForExtension handles leading dot', () => {
    expect(colorForExtension('.py')).toBe(0x9bb3d6);
  });

  it('parseHexColor parses valid hex', () => {
    expect(parseHexColor('4488FF')).toBe(0x4488ff);
  });

  it('parseHexColor returns default for invalid input', () => {
    expect(parseHexColor('not-hex')).toBe(DEFAULT_FILE_COLOR);
  });
});
