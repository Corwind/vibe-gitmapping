/** Position tuple used throughout the 3D scene */
export type Vec3 = [x: number, y: number, z: number];

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

/** A file node in the tree */
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

/** A directory node in the tree */
export interface DirNode {
  id: string;
  name: string;
  parent: string | null;
  children: string[];
  position: Vec3;
  angle: number;
  depth: number;
}

/** A contributor / author avatar */
export interface Contributor {
  name: string;
  avatar?: string;
  color: number;
  position: Vec3;
  targetFile: string | null;
  active: boolean;
}

/** A single line in the Gource custom log format */
export interface GourceLogEntry {
  timestamp: number;
  username: string;
  action: FileAction;
  filepath: string;
  color?: number;
}

/** Messages sent from the main thread to the parser worker */
export interface ParserWorkerRequest {
  type: 'parse';
  payload: string;
}

/** Messages sent from the parser worker back to the main thread */
export interface ParserWorkerResponse {
  type: 'parsed';
  commits: Commit[];
}
