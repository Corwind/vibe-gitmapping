import { DEFAULT_FILE_COLOR } from './constants';

/**
 * Vibrant file extension color map — saturated colors that pop against a dark
 * background, matching the Gource visual style (bright greens, oranges, pinks,
 * blues, teals, purples).
 */
const EXTENSION_COLORS: Record<string, number> = {
  // TypeScript / JavaScript
  ts: 0x3b82f6,
  tsx: 0x3b82f6,
  js: 0xfacc15,
  jsx: 0xfacc15,
  mjs: 0xfacc15,
  cjs: 0xfacc15,
  // Python
  py: 0x3572a5,
  pyw: 0x3572a5,
  pyi: 0x3572a5,
  // Ruby
  rb: 0xe0115f,
  erb: 0xe0115f,
  rake: 0xe0115f,
  gemspec: 0xe0115f,
  // Go
  go: 0x00add8,
  // Rust
  rs: 0xf74c00,
  // Java
  java: 0xf89820,
  // Kotlin
  kt: 0xa97bff,
  kts: 0xa97bff,
  // Swift
  swift: 0xf05138,
  // C / C++ / Objective-C
  c: 0x555555,
  cpp: 0xf34b7d,
  cc: 0xf34b7d,
  cxx: 0xf34b7d,
  h: 0x555555,
  hpp: 0xf34b7d,
  hxx: 0xf34b7d,
  m: 0x438eff,
  mm: 0x438eff,
  // C#
  cs: 0x178600,
  // CSS / SCSS / Less
  css: 0x563d7c,
  scss: 0xc6538c,
  sass: 0xc6538c,
  less: 0x1d365d,
  // HTML / Templates
  html: 0xe34c26,
  htm: 0xe34c26,
  ejs: 0xa91e50,
  hbs: 0xf0772b,
  pug: 0xa86454,
  // Data formats
  json: 0x40d47e,
  jsonc: 0x40d47e,
  yaml: 0xcb171e,
  yml: 0xcb171e,
  xml: 0x0060ac,
  csv: 0x237346,
  // Markdown / Docs
  md: 0x083fa1,
  mdx: 0x083fa1,
  rst: 0x141414,
  txt: 0x6e7681,
  // Shell
  sh: 0x89e051,
  bash: 0x89e051,
  zsh: 0x89e051,
  fish: 0x89e051,
  // SQL
  sql: 0xe38c00,
  // Docker / Infra
  dockerfile: 0x384d54,
  // Config
  toml: 0x9c4221,
  ini: 0x9c4221,
  cfg: 0x9c4221,
  conf: 0x9c4221,
  env: 0xecd53f,
  // Vue / Svelte / Angular
  vue: 0x41b883,
  svelte: 0xff3e00,
  // PHP
  php: 0x4f5d95,
  // Lua
  lua: 0x000080,
  // Zig
  zig: 0xec915c,
  // Elixir / Erlang
  ex: 0x6e4a7e,
  exs: 0x6e4a7e,
  erl: 0xb83998,
  // Haskell / OCaml / F#
  hs: 0x5e5086,
  ml: 0x3be133,
  fs: 0xb845fc,
  fsx: 0xb845fc,
  // R
  r: 0x198ce7,
  // Dart / Flutter
  dart: 0x00b4ab,
  // Scala
  scala: 0xc22d40,
  // Clojure
  clj: 0xdb5855,
  cljs: 0xdb5855,
  // Elm
  elm: 0x60b5cc,
  // Terraform / HCL
  tf: 0x5c4ee5,
  hcl: 0x5c4ee5,
  // Protobuf / GraphQL
  proto: 0xe5e5e5,
  graphql: 0xe10098,
  gql: 0xe10098,
  // Images
  svg: 0xffb13b,
  png: 0x66cdaa,
  jpg: 0x66cdaa,
  jpeg: 0x66cdaa,
  gif: 0x66cdaa,
  ico: 0x66cdaa,
  webp: 0x66cdaa,
  // Fonts
  woff: 0xaaaa77,
  woff2: 0xaaaa77,
  ttf: 0xaaaa77,
  otf: 0xaaaa77,
  // Lock files
  lock: 0x776644,
  // Nix
  nix: 0x7ebae4,
  // Makefile
  makefile: 0x427819,
  mk: 0x427819,
  // Gradle
  gradle: 0x02303a,
};

/** Returns the color associated with a file extension, or a hash-derived color if unknown */
export function colorForExtension(extension: string): number {
  const ext = extension.toLowerCase().replace(/^\./, '');
  return EXTENSION_COLORS[ext] ?? hashColor(ext);
}

/**
 * Derive a consistent, vibrant color from an arbitrary string by hashing it
 * to a hue and using fixed saturation/lightness. This ensures unknown
 * extensions always get a colorful (not grey) dot.
 */
function hashColor(str: string): number {
  if (str.length === 0) return DEFAULT_FILE_COLOR;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return hslToHex(hue, 65, 55);
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to a hex number */
function hslToHex(h: number, s: number, l: number): number {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

/** Parses a hex color string (e.g. "4488FF") to a number */
export function parseHexColor(hex: string): number {
  const parsed = parseInt(hex, 16);
  return isNaN(parsed) ? DEFAULT_FILE_COLOR : parsed;
}
