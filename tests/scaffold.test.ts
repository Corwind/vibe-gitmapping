import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR, DEPTH_SPACING } from '../src/utils/constants';

describe('scaffold smoke tests', () => {
  it('constants are defined', () => {
    expect(DEPTH_SPACING).toBeGreaterThan(0);
    expect(DEFAULT_FILE_COLOR).toBe(0x888888);
  });

  it('colorForExtension returns known color for .ts', () => {
    expect(colorForExtension('ts')).toBe(0x3178c6);
  });

  it('colorForExtension returns default for unknown extension', () => {
    expect(colorForExtension('xyz')).toBe(DEFAULT_FILE_COLOR);
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
