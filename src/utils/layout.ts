import type { Vec3, LayoutEntry, LayoutResult } from '../types';
import { DEPTH_SPACING, FILE_CLUSTER_SPACING, MIN_ANGULAR_SEPARATION } from './constants';
import { FileTree } from './tree';

/**
 * Computes a Gource-style layout for the given FileTree.
 *
 * Algorithm:
 * - Root is placed at the origin (0, 0, 0).
 * - Directories are spread radially from their parents (like branches).
 * - Files are NOT placed on the radial tree. Instead, they are packed in
 *   tight honeycomb clusters at their parent directory's position.
 * - All positions are on the XZ plane (Y=0).
 *
 * This produces the characteristic Gource look: dense clusters of file dots
 * at branch tips, connected by long edges from the center.
 */
export function computeRadialLayout(tree: FileTree): LayoutResult {
  const entries: LayoutEntry[] = [];
  let minX = 0;
  let maxX = 0;
  let minZ = 0;
  let maxZ = 0;

  const nodeAngles = new Map<string, number>();
  const nodePositions = new Map<string, Vec3>();

  // Root at origin
  nodePositions.set('', [0, 0, 0]);
  nodeAngles.set('', 0);
  entries.push({ id: '', position: [0, 0, 0], angle: 0 });

  // Collect file children per directory for honeycomb packing later
  const fileChildrenPerDir = new Map<string, string[]>();

  // BFS: lay out directories only on the radial tree
  const queue: string[] = [''];

  while (queue.length > 0) {
    const dirId = queue.shift()!;
    const dir = tree.getDir(dirId);
    if (!dir) continue;

    const children = dir.children;
    if (children.length === 0) continue;

    // Separate directory children from file children
    const subdirChildren: string[] = [];
    const fileChildren: string[] = [];

    for (const childId of children) {
      if (tree.getDir(childId)) {
        subdirChildren.push(childId);
      } else {
        fileChildren.push(childId);
      }
    }

    // Store file children for honeycomb packing
    if (fileChildren.length > 0) {
      fileChildrenPerDir.set(dirId, fileChildren);
    }

    // Position subdirectory children radially
    if (subdirChildren.length > 0) {
      const parentAngle = nodeAngles.get(dirId)!;
      const childDepth = dir.depth + 1;
      const radius = childDepth * DEPTH_SPACING;

      // Angular spread: only count subdirectory children
      const totalArc =
        dirId === ''
          ? Math.PI * 2
          : computeArcForChildren(subdirChildren.length, childDepth);

      const startAngle =
        dirId === '' ? 0 : parentAngle - totalArc / 2;
      const step =
        subdirChildren.length === 1 ? 0 : totalArc / (subdirChildren.length - 1);

      for (let i = 0; i < subdirChildren.length; i++) {
        const childId = subdirChildren[i];
        const angle =
          subdirChildren.length === 1 ? parentAngle : startAngle + i * step;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const position: Vec3 = [x, 0, z];

        nodeAngles.set(childId, angle);
        nodePositions.set(childId, position);
        entries.push({ id: childId, position, angle });

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;

        queue.push(childId);
      }
    }
  }

  // Pack file children in honeycomb clusters at their parent directory positions
  for (const [dirId, fileChildren] of fileChildrenPerDir) {
    const dirPos = nodePositions.get(dirId)!;
    const dirAngle = nodeAngles.get(dirId)!;
    const offsets = hexagonalPackOffsets(fileChildren.length);

    for (let i = 0; i < fileChildren.length; i++) {
      const fileId = fileChildren[i];
      const [ox, oz] = offsets[i];
      const x = dirPos[0] + ox;
      const z = dirPos[2] + oz;
      const position: Vec3 = [x, 0, z];

      entries.push({ id: fileId, position, angle: dirAngle });

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  return {
    entries,
    bounds: { minX, maxX, minZ, maxZ },
  };
}

/**
 * Computes the arc (in radians) to allocate for a set of children at a given depth.
 * Deeper nodes get narrower arcs; more children get wider arcs.
 * The arc is clamped to avoid overlap and ensure minimum separation.
 */
function computeArcForChildren(childCount: number, depth: number): number {
  const baseArc = Math.PI / Math.max(depth, 1);
  const neededArc = childCount * MIN_ANGULAR_SEPARATION;
  return Math.max(baseArc, neededArc);
}

/**
 * Computes hexagonal packing offsets for N items around the origin.
 *
 * Places items in concentric hexagonal rings:
 *   Ring 0: 1 item at center
 *   Ring 1: 6 items
 *   Ring 2: 12 items
 *   Ring k: 6*k items
 *
 * Returns [x, z] offsets scaled by FILE_CLUSTER_SPACING.
 */
function hexagonalPackOffsets(count: number): [number, number][] {
  if (count === 0) return [];

  const offsets: [number, number][] = [];
  const spacing = FILE_CLUSTER_SPACING;

  // Ring 0: center
  offsets.push([0, 0]);
  if (offsets.length >= count) return offsets.slice(0, count);

  // Hexagonal direction vectors (unit steps in hex grid)
  // These move along the 6 edges of a hexagon
  const hexDirs: [number, number][] = [
    [1, 0],
    [0.5, Math.sqrt(3) / 2],
    [-0.5, Math.sqrt(3) / 2],
    [-1, 0],
    [-0.5, -Math.sqrt(3) / 2],
    [0.5, -Math.sqrt(3) / 2],
  ];

  let ring = 1;
  while (offsets.length < count) {
    // Start position for this ring: move `ring` steps in the first hex direction
    let cx = ring * spacing;
    let cz = 0;

    // Walk along 6 sides of the hexagon
    for (let side = 0; side < 6 && offsets.length < count; side++) {
      // Each side has `ring` steps, but the first step of side 0
      // is the starting position we already set
      const steps = ring;
      // Direction for this side: rotate 120 degrees from the start direction
      // Side 0 goes in direction hexDirs[2], side 1 in hexDirs[3], etc.
      const dirIdx = (side + 2) % 6;
      const [dx, dz] = hexDirs[dirIdx];

      for (let step = 0; step < steps && offsets.length < count; step++) {
        offsets.push([cx, cz]);
        cx += dx * spacing;
        cz += dz * spacing;
      }
    }

    ring++;
  }

  return offsets.slice(0, count);
}
