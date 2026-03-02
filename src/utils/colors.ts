import { DEFAULT_FILE_COLOR } from './constants';

/** Map of file extensions to pastel hex colors for a soft, visually pleasing palette */
const EXTENSION_COLORS: Record<string, number> = {
  // TypeScript / JavaScript — soft blue / soft yellow
  ts: 0x7cb3e0,
  tsx: 0x7cb3e0,
  js: 0xe8d87c,
  jsx: 0xe8d87c,
  // Python — soft lavender
  py: 0x9bb3d6,
  // Ruby — soft coral
  rb: 0xe09090,
  // Go — soft teal
  go: 0x7ccece,
  // Rust — soft peach
  rs: 0xe8c4a0,
  // Java — soft orange
  java: 0xd4a06a,
  // Kotlin — soft purple
  kt: 0xc4a8e8,
  // Swift — soft salmon
  swift: 0xe89898,
  // C / C++ — soft grey / soft pink
  c: 0xb0b0b0,
  cpp: 0xe0a0b8,
  h: 0xb0b0b0,
  hpp: 0xe0a0b8,
  // C# — soft green
  cs: 0x88c888,
  // CSS / SCSS — soft violet / soft rose
  css: 0xb098c8,
  scss: 0xd8a0b8,
  // HTML — soft red-orange
  html: 0xe8a888,
  // JSON — soft mint
  json: 0x90d8b0,
  // YAML — soft coral
  yaml: 0xd89898,
  yml: 0xd89898,
  // XML — soft blue
  xml: 0x88b0d8,
  // Markdown — soft indigo
  md: 0x8898c8,
  // Shell — soft lime
  sh: 0xb8d890,
  bash: 0xb8d890,
  // SQL — soft amber
  sql: 0xd8c088,
  // Docker — soft steel blue
  dockerfile: 0x90a8b8,
  // TOML — soft brown
  toml: 0xc8a888,
  // Vue — soft mint green
  vue: 0x90d0a8,
  // Svelte — soft red
  svelte: 0xe8a090,
  // PHP — soft periwinkle
  php: 0xa0a8c8,
  // Lua — soft navy
  lua: 0x8888b0,
  // Zig — soft tangerine
  zig: 0xe0b898,
  // Elixir — soft plum
  ex: 0xb098b8,
  exs: 0xb098b8,
  // Erlang — soft magenta
  erl: 0xc898b0,
  // Haskell — soft purple
  hs: 0xa898b8,
  // OCaml — soft green
  ml: 0x90d090,
  // R — soft sky blue
  r: 0x88c0e0,
  // Dart — soft cyan
  dart: 0x88d0c8,
  // Scala — soft rose
  scala: 0xd098a8,
  // Clojure — soft red
  clj: 0xd0a0a0,
  // Elm — soft cyan
  elm: 0xa8d0d8,
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
