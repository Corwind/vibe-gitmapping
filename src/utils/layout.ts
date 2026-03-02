import type { Vec3, LayoutEntry, LayoutResult } from '../types';
import { DEPTH_SPACING, MIN_ANGULAR_SEPARATION } from './constants';
import { FileTree } from './tree';

/**
 * Computes a radial tree layout for the given FileTree.
 *
 * Algorithm:
 * - Root is placed at the origin (0, 0, 0).
 * - Each directory's children are spread radially around it.
 * - Depth determines the distance from the center.
 * - Files and subdirectories are placed at leaf positions.
 * - All positions are on the XZ plane (Y=0).
 *
 * This is designed to be fast enough for incremental updates:
 * layout for 70k files should compute well within 16ms.
 */
export function computeRadialLayout(tree: FileTree): LayoutResult {
  const entries: LayoutEntry[] = [];
  let minX = 0;
  let maxX = 0;
  let minZ = 0;
  let maxZ = 0;

  // Track angle allocations per node
  const nodeAngles = new Map<string, number>();
  const nodePositions = new Map<string, Vec3>();

  // Root at origin
  nodePositions.set('', [0, 0, 0]);
  nodeAngles.set('', 0);
  entries.push({ id: '', position: [0, 0, 0], angle: 0 });

  // BFS to lay out the tree level by level
  const queue: string[] = [''];

  while (queue.length > 0) {
    const dirId = queue.shift()!;
    const dir = tree.getDir(dirId);
    if (!dir) continue;

    const parentAngle = nodeAngles.get(dirId)!;
    const children = dir.children;

    if (children.length === 0) continue;

    const childDepth = dir.depth + 1;
    const radius = childDepth * DEPTH_SPACING;

    // Calculate angular spread for children
    // For the root, children span the full circle.
    // For deeper nodes, children get a proportional arc.
    const totalArc =
      dirId === '' ? Math.PI * 2 : computeArcForChildren(children.length, childDepth);

    const startAngle = dirId === '' ? 0 : parentAngle - totalArc / 2;
    const step = children.length === 1 ? 0 : totalArc / (children.length - 1);

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const angle = children.length === 1 ? parentAngle : startAngle + i * step;

      // Position relative to parent (for root) or absolute from center
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const position: Vec3 = [x, 0, z];

      nodeAngles.set(childId, angle);
      nodePositions.set(childId, position);
      entries.push({ id: childId, position, angle });

      // Track bounds
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;

      // If this child is a directory, add it to the queue
      if (tree.getDir(childId)) {
        queue.push(childId);
      }
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
  // Base arc decreases with depth to prevent overcrowding
  const baseArc = Math.PI / Math.max(depth, 1);
  const neededArc = childCount * MIN_ANGULAR_SEPARATION;
  return Math.max(baseArc, neededArc);
}
