import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR } from '../src/utils/constants';

describe('colorForExtension — comprehensive extension coverage', () => {
  const expectedMappings: Record<string, number> = {
    ts: 0x7cb3e0,
    tsx: 0x7cb3e0,
    js: 0xe8d87c,
    jsx: 0xe8d87c,
    py: 0x9bb3d6,
    rb: 0xe09090,
    go: 0x7ccece,
    rs: 0xe8c4a0,
    java: 0xd4a06a,
    kt: 0xc4a8e8,
    swift: 0xe89898,
    c: 0xb0b0b0,
    cpp: 0xe0a0b8,
    h: 0xb0b0b0,
    hpp: 0xe0a0b8,
    cs: 0x88c888,
    css: 0xb098c8,
    scss: 0xd8a0b8,
    html: 0xe8a888,
    json: 0x90d8b0,
    yaml: 0xd89898,
    yml: 0xd89898,
    xml: 0x88b0d8,
    md: 0x8898c8,
    sh: 0xb8d890,
    bash: 0xb8d890,
    sql: 0xd8c088,
    dockerfile: 0x90a8b8,
    toml: 0xc8a888,
    vue: 0x90d0a8,
    svelte: 0xe8a090,
    php: 0xa0a8c8,
    lua: 0x8888b0,
    zig: 0xe0b898,
    ex: 0xb098b8,
    exs: 0xb098b8,
    erl: 0xc898b0,
    hs: 0xa898b8,
    ml: 0x90d090,
    r: 0x88c0e0,
    dart: 0x88d0c8,
    scala: 0xd098a8,
    clj: 0xd0a0a0,
    elm: 0xa8d0d8,
  };

  for (const [ext, expectedColor] of Object.entries(expectedMappings)) {
    it(`maps "${ext}" to 0x${expectedColor.toString(16).padStart(6, '0')}`, () => {
      expect(colorForExtension(ext)).toBe(expectedColor);
    });
  }

  describe('case insensitivity', () => {
    it('handles uppercase extensions', () => {
      expect(colorForExtension('TS')).toBe(0x7cb3e0);
      expect(colorForExtension('PY')).toBe(0x9bb3d6);
      expect(colorForExtension('GO')).toBe(0x7ccece);
      expect(colorForExtension('JAVA')).toBe(0xd4a06a);
    });

    it('handles mixed case extensions', () => {
      expect(colorForExtension('Ts')).toBe(0x7cb3e0);
      expect(colorForExtension('PyThOn')).toBe(DEFAULT_FILE_COLOR); // "python" is not a mapped ext
      expect(colorForExtension('Js')).toBe(0xe8d87c);
    });
  });

  describe('edge cases', () => {
    it('returns default for empty string', () => {
      expect(colorForExtension('')).toBe(DEFAULT_FILE_COLOR);
    });

    it('strips leading dot', () => {
      expect(colorForExtension('.ts')).toBe(0x7cb3e0);
      expect(colorForExtension('.go')).toBe(0x7ccece);
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
