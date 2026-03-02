import type { FileNode } from '../types';
import { FILE_PULSE_DURATION_MS, FILE_FADEOUT_DURATION_MS } from './constants';

/**
 * Pre-built flat arrays for InstancedMesh updates.
 * Avoids object allocations in the render loop.
 */
export interface FileNodeArrays {
  /** Number of active instances to render */
  count: number;
  /** Flat Float32 positions: [x0,y0,z0, x1,y1,z1, ...] */
  positions: Float32Array;
  /** Flat Float32 colors: [r0,g0,b0, r1,g1,b1, ...] */
  colors: Float32Array;
  /** Per-instance scale factors */
  scales: Float32Array;
  /** Per-instance opacity (1.0 = fully visible, 0.0 = invisible) */
  opacities: Float32Array;
  /** The IDs of files in the array, in order (for reverse lookup) */
  ids: string[];
}

/**
 * Compute the glow scale multiplier for a file based on how recently it was modified.
 * @param elapsedMs - milliseconds since last modification
 * @returns scale factor (1.0 = normal, up to 1.8 = freshly modified)
 */
export function computeGlowScale(elapsedMs: number): number {
  if (elapsedMs <= 0 || elapsedMs >= FILE_PULSE_DURATION_MS) return 1.0;
  const t = 1.0 - elapsedMs / FILE_PULSE_DURATION_MS;
  return 1.0 + 0.8 * t * t;
}

/**
 * Compute the emissive intensity for a recently modified file.
 * @param elapsedMs - milliseconds since last modification
 * @returns emissive intensity (0.0 = none, up to 1.0 = bright glow)
 */
export function computeGlowEmissive(elapsedMs: number): number {
  if (elapsedMs <= 0 || elapsedMs >= FILE_PULSE_DURATION_MS) return 0.0;
  const t = 1.0 - elapsedMs / FILE_PULSE_DURATION_MS;
  return t * t;
}

/**
 * Compute the fade-out opacity for a file.
 * Alive files always return 1.0. Deleted files fade from 1.0 to 0.0.
 * @param alive - whether the file is alive
 * @param elapsedSinceDeletion - ms since the file was marked deleted
 * @returns opacity (0.0 to 1.0)
 */
export function computeFadeOpacity(alive: boolean, elapsedSinceDeletion: number): number {
  if (alive) return 1.0;
  if (elapsedSinceDeletion <= 0) return 1.0;
  if (elapsedSinceDeletion >= FILE_FADEOUT_DURATION_MS) return 0.0;
  return 1.0 - elapsedSinceDeletion / FILE_FADEOUT_DURATION_MS;
}

/**
 * Build flat typed arrays from an array of FileNode objects.
 * Used to update InstancedMesh attributes efficiently.
 *
 * @param files - all file nodes (alive and dead)
 * @param currentTimeMs - current animation time in milliseconds
 * @returns FileNodeArrays with pre-computed positions, colors, scales, opacities
 */
export function buildFileNodeArrays(files: FileNode[], currentTimeMs: number): FileNodeArrays {
  // First pass: filter to files that should be rendered
  const visible: FileNode[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.alive) {
      visible.push(file);
    } else {
      // Include deleted files that are still fading out
      const elapsed = currentTimeMs - file.lastModified;
      if (elapsed < FILE_FADEOUT_DURATION_MS) {
        visible.push(file);
      }
    }
  }

  const count = visible.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const opacities = new Float32Array(count);
  const ids: string[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const file = visible[i];
    const idx3 = i * 3;

    // Position
    positions[idx3] = file.position[0];
    positions[idx3 + 1] = file.position[1];
    positions[idx3 + 2] = file.position[2];

    // Color: convert hex number to [r, g, b] normalized floats
    const color = file.color;
    colors[idx3] = ((color >> 16) & 0xff) / 255;
    colors[idx3 + 1] = ((color >> 8) & 0xff) / 255;
    colors[idx3 + 2] = (color & 0xff) / 255;

    // Scale (glow effect for recently modified)
    const elapsedMs = currentTimeMs - file.lastModified;
    scales[i] = computeGlowScale(elapsedMs);

    // Opacity (fade for deleted files)
    if (file.alive) {
      opacities[i] = 1.0;
    } else {
      const elapsedSinceDeletion = currentTimeMs - file.lastModified;
      opacities[i] = computeFadeOpacity(false, elapsedSinceDeletion);
    }

    ids[i] = file.id;
  }

  return { count, positions, colors, scales, opacities, ids };
}
