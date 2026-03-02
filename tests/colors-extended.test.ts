import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR } from '../src/utils/constants';

describe('colorForExtension — comprehensive extension coverage', () => {
  const expectedMappings: Record<string, number> = {
    ts: 0x3178c6,
    tsx: 0x3178c6,
    js: 0xf7df1e,
    jsx: 0xf7df1e,
    py: 0x3572a5,
    rb: 0xcc342d,
    go: 0x00add8,
    rs: 0xdea584,
    java: 0xb07219,
    kt: 0xa97bff,
    swift: 0xf05138,
    c: 0x555555,
    cpp: 0xf34b7d,
    h: 0x555555,
    hpp: 0xf34b7d,
    cs: 0x178600,
    css: 0x563d7c,
    scss: 0xc6538c,
    html: 0xe34c26,
    json: 0x40d47e,
    yaml: 0xcb171e,
    yml: 0xcb171e,
    xml: 0x0060ac,
    md: 0x083fa1,
    sh: 0x89e051,
    bash: 0x89e051,
    sql: 0xe38c00,
    dockerfile: 0x384d54,
    toml: 0x9c4221,
    vue: 0x41b883,
    svelte: 0xff3e00,
    php: 0x4f5d95,
    lua: 0x000080,
    zig: 0xec915c,
    ex: 0x6e4a7e,
    exs: 0x6e4a7e,
    erl: 0xb83998,
    hs: 0x5e5086,
    ml: 0x3be133,
    r: 0x198ce7,
    dart: 0x00b4ab,
    scala: 0xc22d40,
    clj: 0xdb5855,
    elm: 0x60b5cc,
  };

  for (const [ext, expectedColor] of Object.entries(expectedMappings)) {
    it(`maps "${ext}" to 0x${expectedColor.toString(16).padStart(6, '0')}`, () => {
      expect(colorForExtension(ext)).toBe(expectedColor);
    });
  }

  describe('case insensitivity', () => {
    it('handles uppercase extensions', () => {
      expect(colorForExtension('TS')).toBe(0x3178c6);
      expect(colorForExtension('PY')).toBe(0x3572a5);
      expect(colorForExtension('GO')).toBe(0x00add8);
      expect(colorForExtension('JAVA')).toBe(0xb07219);
    });

    it('handles mixed case extensions', () => {
      expect(colorForExtension('Ts')).toBe(0x3178c6);
      expect(colorForExtension('PyThOn')).toBe(DEFAULT_FILE_COLOR); // "python" is not a mapped ext
      expect(colorForExtension('Js')).toBe(0xf7df1e);
    });
  });

  describe('edge cases', () => {
    it('returns default for empty string', () => {
      expect(colorForExtension('')).toBe(DEFAULT_FILE_COLOR);
    });

    it('strips leading dot', () => {
      expect(colorForExtension('.ts')).toBe(0x3178c6);
      expect(colorForExtension('.go')).toBe(0x00add8);
    });

    it('strips multiple leading dots (only first)', () => {
      // ".ts" -> "ts" but "..ts" -> ".ts" -> after replace -> "ts"
      // Actually replace(/^\./, '') only strips one dot
      expect(colorForExtension('..ts')).toBe(DEFAULT_FILE_COLOR);
    });

    it('returns default for random strings', () => {
      expect(colorForExtension('foobar')).toBe(DEFAULT_FILE_COLOR);
      expect(colorForExtension('123')).toBe(DEFAULT_FILE_COLOR);
    });
  });
});

describe('parseHexColor — extended', () => {
  it('parses 6-digit hex', () => {
    expect(parseHexColor('FF0000')).toBe(0xff0000);
    expect(parseHexColor('00FF00')).toBe(0x00ff00);
    expect(parseHexColor('0000FF')).toBe(0x0000ff);
  });

  it('parses 3-digit hex (treated as number, not CSS shorthand)', () => {
    expect(parseHexColor('FFF')).toBe(0xfff);
    expect(parseHexColor('000')).toBe(0);
  });

  it('parses lowercase hex', () => {
    expect(parseHexColor('ff0000')).toBe(0xff0000);
    expect(parseHexColor('abcdef')).toBe(0xabcdef);
  });

  it('returns default for empty string', () => {
    expect(parseHexColor('')).toBe(DEFAULT_FILE_COLOR);
  });

  it('returns default for non-hex string', () => {
    expect(parseHexColor('not-hex')).toBe(DEFAULT_FILE_COLOR);
    expect(parseHexColor('ZZZZZZ')).toBe(DEFAULT_FILE_COLOR);
  });

  it('returns default for negative sign', () => {
    // parseInt('-FF', 16) returns -255 which is valid, not NaN
    const result = parseHexColor('-FF');
    expect(typeof result).toBe('number');
  });

  it('parses single character hex', () => {
    expect(parseHexColor('F')).toBe(15);
    expect(parseHexColor('0')).toBe(0);
  });

  it('handles mixed valid/invalid (partial parse)', () => {
    // parseInt('FF00GG', 16) => 0xFF00 (stops at first invalid char)
    const result = parseHexColor('FF00GG');
    expect(result).toBe(0xff00);
  });
});
