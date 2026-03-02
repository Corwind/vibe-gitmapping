import type { GourceLogEntry, FileAction, Commit, FileChange } from '../types';

const VALID_ACTIONS = new Set<string>(['A', 'M', 'D']);

/**
 * Parses a single line of Gource custom log format.
 * Format: timestamp|username|action|filepath|color
 * Returns null if the line is malformed or empty.
 */
export function parseGourceLogEntry(line: string): GourceLogEntry | null {
  if (!line || line.length === 0) return null;

  const parts = line.split('|');
  if (parts.length < 4) return null;

  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) return null;

  const username = parts[1];
  const action = parts[2];
  if (!VALID_ACTIONS.has(action)) return null;

  const filepath = parts[3];
  if (!filepath) return null;

  const colorStr = parts.length > 4 ? parts[4] : undefined;
  const color = colorStr && colorStr.length > 0 ? parseInt(colorStr, 16) : undefined;

  return {
    timestamp,
    username,
    action: action as FileAction,
    filepath,
    color: color !== undefined && isNaN(color) ? undefined : color,
  };
}

/**
 * Groups an array of GourceLogEntry into Commit objects.
 * Entries with the same timestamp and author are merged into a single Commit.
 * The result is sorted by timestamp ascending.
 */
export function groupEntriesToCommits(entries: GourceLogEntry[]): Commit[] {
  if (entries.length === 0) return [];

  const commitMap = new Map<string, Commit>();

  for (const entry of entries) {
    const key = `${entry.timestamp}|${entry.username}`;
    let commit = commitMap.get(key);
    if (!commit) {
      commit = {
        timestamp: entry.timestamp,
        author: entry.username,
        files: [],
      };
      commitMap.set(key, commit);
    }

    const fileChange: FileChange = {
      action: entry.action,
      path: entry.filepath,
    };
    if (entry.color !== undefined) {
      fileChange.color = entry.color;
    }
    commit.files.push(fileChange);
  }

  const commits = Array.from(commitMap.values());
  commits.sort((a, b) => a.timestamp - b.timestamp);
  return commits;
}

/**
 * Parses a full Gource custom log string into an array of Commits.
 * Handles both Unix and Windows line endings.
 * Skips blank lines, comments (lines starting with #), and malformed entries.
 */
export function parseGourceLog(input: string): Commit[] {
  if (!input || input.length === 0) return [];

  const lines = input.split(/\r?\n/);
  const entries: GourceLogEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const entry = parseGourceLogEntry(trimmed);
    if (entry) {
      entries.push(entry);
    }
  }

  return groupEntriesToCommits(entries);
}
