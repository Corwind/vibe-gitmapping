// ─── Geometry ────────────────────────────────────────────────────────────────

/** Position tuple used throughout the 3D scene */
export type Vec3 = [x: number, y: number, z: number];

// ─── Git Log / Parsing ───────────────────────────────────────────────────────

/** Actions that can be performed on a file in a commit */
export type FileAction = 'A' | 'M' | 'D';

/** A single file change within a commit */
export interface FileChange {
  action: FileAction;
  path: string;
  color?: number;
}

/** A parsed commit from the git log */
export interface Commit {
  timestamp: number;
  author: string;
  files: FileChange[];
}

/** A single line in the Gource custom log format */
export interface GourceLogEntry {
  timestamp: number;
  username: string;
  action: FileAction;
  filepath: string;
  color?: number;
}

// ─── Tree Data Structure ─────────────────────────────────────────────────────

/** A file node (leaf) in the repository tree */
export interface FileNode {
  id: string;
  name: string;
  parent: string;
  extension: string;
  color: number;
  position: Vec3;
  lastModified: number;
  lastAuthor: string;
  alive: boolean;
}

/** A directory node (branch) in the repository tree */
export interface DirNode {
  id: string;
  name: string;
  parent: string | null;
  children: string[];
  position: Vec3;
  angle: number;
  depth: number;
}

/** Union type for any node in the tree */
export type TreeNode = FileNode | DirNode;

/** Type guard: checks if a TreeNode is a FileNode */
export function isFileNode(node: TreeNode): node is FileNode {
  return 'extension' in node;
}

/** Type guard: checks if a TreeNode is a DirNode */
export function isDirNode(node: TreeNode): node is DirNode {
  return 'children' in node;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/** Output of the radial layout engine for a single node */
export interface LayoutEntry {
  id: string;
  position: Vec3;
  angle: number;
}

/** Complete layout result from the layout engine */
export interface LayoutResult {
  entries: LayoutEntry[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

// ─── Contributors ────────────────────────────────────────────────────────────

/** A contributor / author avatar in the scene */
export interface Contributor {
  name: string;
  avatar?: string;
  color: number;
  position: Vec3;
  targetFile: string | null;
  active: boolean;
  lastActiveTimestamp: number;
}

// ─── Animation / Playback ────────────────────────────────────────────────────

/** Playback state of the timeline */
export type PlaybackState = 'playing' | 'paused' | 'stopped';

/** A time-window batch of commits for temporal batching */
export interface CommitBatch {
  startTimestamp: number;
  endTimestamp: number;
  commits: Commit[];
}

// ─── Worker Messages ─────────────────────────────────────────────────────────

/** Messages sent from the main thread to the parser worker */
export type ParserWorkerRequest =
  | { type: 'parse'; payload: string }
  | { type: 'parse-chunk'; payload: string; chunkIndex: number; isLast: boolean };

/** Messages sent from the parser worker back to the main thread */
export type ParserWorkerResponse =
  | { type: 'parsed'; commits: Commit[] }
  | { type: 'chunk-parsed'; commits: Commit[]; chunkIndex: number; isLast: boolean }
  | { type: 'error'; message: string };

// ─── Input Source ────────────────────────────────────────────────────────────

/** How the git log data was provided */
export type InputSource =
  | { type: 'file'; filename: string }
  | { type: 'paste' }
  | { type: 'url'; url: string };
