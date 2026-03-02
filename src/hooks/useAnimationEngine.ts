import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationStore } from '../store/useAnimationStore';
import { useTreeStore } from '../store/useTreeStore';
import { FileTree } from '../utils/tree';
import { computeRadialLayout } from '../utils/layout';
import { MAX_COMMITS_PER_FRAME } from '../utils/constants';
import type { Commit, Contributor, FileNode, DirNode, Vec3 } from '../types';

/**
 * Simple numeric hash of a string to produce a deterministic color.
 */
function hashStringToColor(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  // Ensure positive and in 0x000000..0xFFFFFF range
  return ((hash & 0x00ffffff) + 0x333333) & 0x00ffffff;
}

/**
 * Applies layout positions from a LayoutResult to the FileTree's nodes in-place.
 * Returns new Map references so Zustand detects the change.
 */
function applyLayoutToTree(tree: FileTree): {
  files: Map<string, FileNode>;
  dirs: Map<string, DirNode>;
} {
  const layout = computeRadialLayout(tree);

  const filesMap = tree.getFilesMap();
  const dirsMap = tree.getDirsMap();

  // Apply positions from layout entries
  for (let i = 0; i < layout.entries.length; i++) {
    const entry = layout.entries[i];
    const file = filesMap.get(entry.id);
    if (file) {
      file.position = entry.position;
      continue;
    }
    const dir = dirsMap.get(entry.id);
    if (dir) {
      dir.position = entry.position;
      dir.angle = entry.angle;
    }
  }

  // Return new Map references (shallow copy) so Zustand triggers re-renders
  return {
    files: new Map(filesMap),
    dirs: new Map(dirsMap),
  };
}

/**
 * Core animation engine hook. Must be used inside a R3F Canvas (needs useFrame).
 *
 * Connects parsed commits from useAnimationStore to the FileTree,
 * computes radial layout, and syncs results into useTreeStore.
 */
export function useAnimationEngine(): void {
  const treeRef = useRef<FileTree | null>(null);
  const contributorsRef = useRef<Map<string, Contributor>>(new Map());
  // Track the last commit index we applied to the tree
  const appliedCommitIndexRef = useRef(-1);
  // Track commits array identity to detect new loads
  const commitsIdentityRef = useRef<Commit[]>([]);
  // Track if we need a full rebuild (e.g. timeline scrub backward)
  const needsRebuildRef = useRef(false);
  // Track the previous frame's externalCommitIndex to detect scrub
  const prevExternalIndexRef = useRef(0);

  // Watch for commits being loaded
  useEffect(() => {
    const unsub = useAnimationStore.subscribe((state, prevState) => {
      if (state.commits !== prevState.commits && state.commits.length > 0) {
        // New commits loaded: create fresh tree and auto-start
        treeRef.current = new FileTree();
        contributorsRef.current = new Map();
        appliedCommitIndexRef.current = -1;
        commitsIdentityRef.current = state.commits;
        prevExternalIndexRef.current = 0;
        needsRebuildRef.current = false;

        // Reset tree store
        useTreeStore.getState().reset();

        // Auto-start playback
        state.play();
      }
    });
    return unsub;
  }, []);

  useFrame(({ clock }) => {
    const animState = useAnimationStore.getState();
    const { commits, playing, secondsPerDay, currentCommitIndex } = animState;

    if (commits.length === 0) return;

    // If commits identity changed and tree not yet created, create it
    if (!treeRef.current && commits.length > 0) {
      treeRef.current = new FileTree();
      contributorsRef.current = new Map();
      appliedCommitIndexRef.current = -1;
      commitsIdentityRef.current = commits;
      prevExternalIndexRef.current = 0;
    }

    const tree = treeRef.current;
    if (!tree) return;

    const currentTimeMs = clock.getElapsedTime() * 1000;

    // Detect external scrub: currentCommitIndex changed from outside (UI)
    const externalIndex = currentCommitIndex;
    if (externalIndex !== prevExternalIndexRef.current) {
      if (externalIndex < appliedCommitIndexRef.current) {
        // Scrubbed backward: need full rebuild
        needsRebuildRef.current = true;
      }
      prevExternalIndexRef.current = externalIndex;
    }

    // Handle rebuild (scrub backward or reset)
    if (needsRebuildRef.current) {
      needsRebuildRef.current = false;
      // Rebuild tree from scratch up to externalIndex
      treeRef.current = new FileTree();
      const freshTree = treeRef.current;
      contributorsRef.current = new Map();

      for (let i = 0; i <= externalIndex && i < commits.length; i++) {
        freshTree.applyCommit(commits[i]);
        updateContributors(contributorsRef.current, commits[i], currentTimeMs);
      }
      appliedCommitIndexRef.current = externalIndex;

      const { files, dirs } = applyLayoutToTree(freshTree);
      const treeStore = useTreeStore.getState();
      treeStore.setFiles(files);
      treeStore.setDirs(dirs);
      treeStore.setContributors(new Map(contributorsRef.current));
      return;
    }

    // Advance time if playing
    if (playing) {
      const deltaSeconds = clock.getDelta();
      // secondsPerDay: how many real seconds = 1 day of repo history
      // So in deltaSeconds real time, we advance (deltaSeconds / secondsPerDay) days
      // = (deltaSeconds * 86400 / secondsPerDay) repo-seconds
      const advanceRepoSeconds = (deltaSeconds * 86400) / secondsPerDay;
      let newTimestamp = animState.currentTimestamp + advanceRepoSeconds;

      // Clamp to end of time range
      if (animState.timeRange && newTimestamp > animState.timeRange.end) {
        newTimestamp = animState.timeRange.end;
      }

      animState.setCurrentTimestamp(newTimestamp);

      // Find all commits that should be applied between our last applied index and newTimestamp
      let commitsApplied = 0;
      let newIndex = appliedCommitIndexRef.current;

      while (
        newIndex + 1 < commits.length &&
        commits[newIndex + 1].timestamp <= newTimestamp &&
        commitsApplied < MAX_COMMITS_PER_FRAME
      ) {
        newIndex++;
        tree.applyCommit(commits[newIndex]);
        updateContributors(contributorsRef.current, commits[newIndex], currentTimeMs);
        commitsApplied++;
      }

      if (commitsApplied > 0) {
        appliedCommitIndexRef.current = newIndex;
        animState.setCurrentCommitIndex(newIndex);

        const { files, dirs } = applyLayoutToTree(tree);
        const treeStore = useTreeStore.getState();
        treeStore.setFiles(files);
        treeStore.setDirs(dirs);
        treeStore.setContributors(new Map(contributorsRef.current));
      }

      // Check if we reached the end
      if (newIndex >= commits.length - 1) {
        animState.pause();
      }
    } else {
      // Not playing, but check if external index advanced forward (step forward)
      if (externalIndex > appliedCommitIndexRef.current) {
        let commitsApplied = 0;
        while (
          appliedCommitIndexRef.current < externalIndex &&
          appliedCommitIndexRef.current + 1 < commits.length &&
          commitsApplied < MAX_COMMITS_PER_FRAME
        ) {
          appliedCommitIndexRef.current++;
          tree.applyCommit(commits[appliedCommitIndexRef.current]);
          updateContributors(
            contributorsRef.current,
            commits[appliedCommitIndexRef.current],
            currentTimeMs,
          );
          commitsApplied++;
        }

        const { files, dirs } = applyLayoutToTree(tree);
        const treeStore = useTreeStore.getState();
        treeStore.setFiles(files);
        treeStore.setDirs(dirs);
        treeStore.setContributors(new Map(contributorsRef.current));
      }
    }
  });
}

/**
 * Update contributors map based on a commit.
 * Uses Three.js clock time for lastActiveTimestamp so effects sync with rendering.
 */
function updateContributors(
  contributors: Map<string, Contributor>,
  commit: Commit,
  clockTimeMs: number,
): void {
  for (let i = 0; i < commit.files.length; i++) {
    const change = commit.files[i];
    const authorName = commit.author;

    let contributor = contributors.get(authorName);
    if (!contributor) {
      contributor = {
        name: authorName,
        color: hashStringToColor(authorName),
        position: [0, 0, 0] as Vec3,
        targetFile: null,
        active: true,
        lastActiveTimestamp: clockTimeMs,
      };
      contributors.set(authorName, contributor);
    }

    contributor.targetFile = change.path;
    contributor.active = true;
    contributor.lastActiveTimestamp = clockTimeMs;
  }
}
