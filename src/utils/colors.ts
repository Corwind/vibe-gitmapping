import { DEFAULT_FILE_COLOR } from './constants';

/** Map of file extensions to hex colors, inspired by GitHub language colors */
const EXTENSION_COLORS: Record<string, number> = {
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

/** Returns the color associated with a file extension, or the default color if unknown */
export function colorForExtension(extension: string): number {
  const ext = extension.toLowerCase().replace(/^\./, '');
  return EXTENSION_COLORS[ext] ?? DEFAULT_FILE_COLOR;
}

/** Parses a hex color string (e.g. "4488FF") to a number */
export function parseHexColor(hex: string): number {
  const parsed = parseInt(hex, 16);
  return isNaN(parsed) ? DEFAULT_FILE_COLOR : parsed;
}
