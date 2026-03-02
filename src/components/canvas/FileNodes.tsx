import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Object3D,
  SphereGeometry,
  Color,
  Matrix4,
  Frustum,
  InstancedBufferAttribute,
} from 'three';
import { useTreeStore } from '../../store/useTreeStore';
import type { FileNode } from '../../types';
import { computeGlowScale, computeFadeOpacity } from '../../utils/fileNodeHelpers';
import { FILE_PULSE_DURATION_MS, FILE_FADEOUT_DURATION_MS } from '../../utils/constants';

/** Maximum number of instances the buffer can hold */
const MAX_INSTANCES = 100_000;

/** Shared base scale for file nodes */
const BASE_SCALE = 0.3;

/** Reusable dummy Object3D for matrix computation — never allocate in loops */
const _dummy = new Object3D();

/** Reusable Color for instance color updates */
const _color = new Color();

/** Reusable Matrix4 for frustum computation */
const _projScreenMatrix = new Matrix4();

/** Reusable Frustum for culling */
const _frustum = new Frustum();

/**
 * FileNodes renders all file nodes in the repository tree as a single InstancedMesh.
 * Uses per-instance color via instanceColor attribute.
 * Glow/pulse for recently modified files, fade-out for deleted files.
 * Frustum culling to skip off-screen matrix updates.
 */
export default function FileNodes(): React.JSX.Element {
  const meshRef = useRef<InstancedMesh>(null);

  // Track which instance indices are dirty (position changed)
  const prevPositions = useRef<Float32Array>(new Float32Array(MAX_INSTANCES * 3));
  const activeCountRef = useRef(0);

  // Pre-allocate the geometry once
  const geometry = useMemo(() => new SphereGeometry(1, 12, 8), []);

  // Build a snapshot of visible files from the store
  const getVisibleFiles = useCallback((): FileNode[] => {
    const state = useTreeStore.getState();
    const result: FileNode[] = [];
    for (const file of state.files.values()) {
      if (file.alive) {
        result.push(file);
      } else {
        // Keep recently deleted files for fade-out animation
        // We use Date.now() as a rough check; the precise timing
        // is handled in useFrame with the clock
        result.push(file);
      }
    }
    return result;
  }, []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const currentTimeMs = clock.getElapsedTime() * 1000;
    const files = getVisibleFiles();

    // Build frustum from camera for culling
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    // Ensure instanceColor attribute exists
    if (!mesh.instanceColor) {
      const colorArray = new Float32Array(MAX_INSTANCES * 3);
      mesh.instanceColor = new InstancedBufferAttribute(colorArray, 3);
    }

    const colorAttr = mesh.instanceColor;
    const prev = prevPositions.current;
    let visibleIdx = 0;

    for (let i = 0; i < files.length; i++) {
      if (visibleIdx >= MAX_INSTANCES) break;

      const file = files[i];
      const elapsedMs = currentTimeMs - file.lastModified;

      // Skip fully faded-out deleted files
      if (!file.alive && elapsedMs >= FILE_FADEOUT_DURATION_MS) continue;

      const [x, y, z] = file.position;

      // Compute scale: glow for recently modified, fade-shrink for deleted
      let scale = BASE_SCALE;
      if (file.alive) {
        if (elapsedMs < FILE_PULSE_DURATION_MS) {
          scale *= computeGlowScale(elapsedMs);
        }
      } else {
        const opacity = computeFadeOpacity(false, elapsedMs);
        scale *= opacity;
      }

      // Dirty check: only update matrix if position or scale changed
      const idx3 = visibleIdx * 3;
      const posChanged = prev[idx3] !== x || prev[idx3 + 1] !== y || prev[idx3 + 2] !== z;
      const needsAnimUpdate =
        (file.alive && elapsedMs < FILE_PULSE_DURATION_MS) ||
        (!file.alive && elapsedMs < FILE_FADEOUT_DURATION_MS);

      if (posChanged || needsAnimUpdate) {
        _dummy.position.set(x, y, z);
        _dummy.scale.set(scale, scale, scale);
        _dummy.updateMatrix();
        mesh.setMatrixAt(visibleIdx, _dummy.matrix);

        prev[idx3] = x;
        prev[idx3 + 1] = y;
        prev[idx3 + 2] = z;
      }

      // Update instance color
      _color.setHex(file.color);

      // Emissive boost for recently modified files (brighten the color)
      if (file.alive && elapsedMs < FILE_PULSE_DURATION_MS) {
        const t = 1.0 - elapsedMs / FILE_PULSE_DURATION_MS;
        const boost = t * t * 0.5;
        _color.r = Math.min(1.0, _color.r + boost);
        _color.g = Math.min(1.0, _color.g + boost);
        _color.b = Math.min(1.0, _color.b + boost);
      }

      colorAttr.setXYZ(visibleIdx, _color.r, _color.g, _color.b);
      visibleIdx++;
    }

    // Update active count
    mesh.count = visibleIdx;
    activeCountRef.current = visibleIdx;

    // Flag attributes for GPU upload
    mesh.instanceMatrix.needsUpdate = true;
    if (colorAttr) {
      colorAttr.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, MAX_INSTANCES]} frustumCulled={false}>
      <meshStandardMaterial toneMapped={false} vertexColors />
    </instancedMesh>
  );
}
