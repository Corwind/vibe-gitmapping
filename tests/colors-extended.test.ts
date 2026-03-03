import { describe, it, expect } from 'vitest';
import { colorForExtension, parseHexColor } from '../src/utils/colors';
import { DEFAULT_FILE_COLOR } from '../src/utils/constants';

describe('colorForExtension — known extensions have vibrant colors', () => {
  const knownExtensions = [
    'ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'kt',
    'swift', 'c', 'cpp', 'h', 'hpp', 'cs', 'css', 'scss', 'html',
    'json', 'yaml', 'yml', 'xml', 'md', 'sh', 'bash', 'sql',
    'dockerfile', 'toml', 'vue', 'svelte', 'php', 'lua', 'zig',
    'ex', 'exs', 'erl', 'hs', 'ml', 'r', 'dart', 'scala', 'clj', 'elm',
    'svg', 'png', 'jpg', 'lock', 'env', 'proto', 'graphql', 'tf',
  ];

  for (const ext of knownExtensions) {
    it(`maps "${ext}" to a specific color (not default/hash)`, () => {
      const color = colorForExtension(ext);
      expect(color).toBeTypeOf('number');
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThanOrEqual(0xffffff);
    });
  }

  it('maps distinct language families to different colors', () => {
    const ts = colorForExtension('ts');
    const js = colorForExtension('js');
    const py = colorForExtension('py');
    const go = colorForExtension('go');
    const rs = colorForExtension('rs');
    const rb = colorForExtension('rb');
    // All should be different
    const unique = new Set([ts, js, py, go, rs, rb]);
    expect(unique.size).toBe(6);
  });

  it('groups related extensions with the same color', () => {
    expect(colorForExtension('ts')).toBe(colorForExtension('tsx'));
    expect(colorForExtension('js')).toBe(colorForExtension('jsx'));
    expect(colorForExtension('yaml')).toBe(colorForExtension('yml'));
    expect(colorForExtension('sh')).toBe(colorForExtension('bash'));
    expect(colorForExtension('ex')).toBe(colorForExtension('exs'));
    expect(colorForExtension('cpp')).toBe(colorForExtension('hpp'));
  });
});

describe('colorForExtension — unknown extensions get hash-derived colors', () => {
  it('returns a consistent color for the same unknown extension', () => {
    const color1 = colorForExtension('xyz123');
    const color2 = colorForExtension('xyz123');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different unknown extensions', () => {
    const a = colorForExtension('foobar');
    const b = colorForExtension('bazqux');
    expect(a).not.toBe(b);
  });

  it('returns a valid color (not grey default) for unknown extensions', () => {
    const color = colorForExtension('weirdext');
    expect(color).toBeTypeOf('number');
    expect(color).toBeGreaterThanOrEqual(0);
    expect(color).toBeLessThanOrEqual(0xffffff);
    // Should NOT be the grey default since hash generates a vibrant color
    expect(color).not.toBe(DEFAULT_FILE_COLOR);
  });

  it('returns default grey only for empty string', () => {
    expect(colorForExtension('')).toBe(DEFAULT_FILE_COLOR);
  });
});

describe('colorForExtension — case insensitivity', () => {
  it('handles uppercase extensions', () => {
    expect(colorForExtension('TS')).toBe(colorForExtension('ts'));
    expect(colorForExtension('PY')).toBe(colorForExtension('py'));
    expect(colorForExtension('GO')).toBe(colorForExtension('go'));
    expect(colorForExtension('JAVA')).toBe(colorForExtension('java'));
  });

  it('handles mixed case extensions', () => {
    expect(colorForExtension('Ts')).toBe(colorForExtension('ts'));
    expect(colorForExtension('Js')).toBe(colorForExtension('js'));
  });
});

describe('colorForExtension — edge cases', () => {
  it('strips leading dot', () => {
    expect(colorForExtension('.ts')).toBe(colorForExtension('ts'));
    expect(colorForExtension('.go')).toBe(colorForExtension('go'));
  });

  it('treats double dot as unknown (only strips first dot)', () => {
    // "..ts" -> ".ts" after strip -> not in map -> hash-derived
    const result = colorForExtension('..ts');
    expect(result).not.toBe(colorForExtension('ts'));
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
    const result = parseHexColor('-FF');
    expect(typeof result).toBe('number');
  });

  it('parses single character hex', () => {
    expect(parseHexColor('F')).toBe(15);
    expect(parseHexColor('0')).toBe(0);
  });

  it('handles mixed valid/invalid (partial parse)', () => {
    const result = parseHexColor('FF00GG');
    expect(result).toBe(0xff00);
  });
});
