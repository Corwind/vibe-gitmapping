import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { InstancedMesh, Object3D, CircleGeometry, Color, InstancedBufferAttribute } from 'three';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { FileNode } from '../../types';
import { computeGlowScale, computeFadeOpacity } from '../../utils/fileNodeHelpers';
import { FILE_PULSE_DURATION_MS, FILE_FADEOUT_DURATION_MS } from '../../utils/constants';

/** Maximum number of instances the buffer can hold */
const MAX_INSTANCES = 100_000;

/** Base scale for file node dots — small Gource-style points */
const BASE_SCALE = 0.15;

/** Reusable dummy Object3D for matrix computation — never allocate in loops */
const _dummy = new Object3D();
// Pre-set rotation so circles lie flat on XZ plane (visible from top-down camera)
_dummy.rotation.set(-Math.PI / 2, 0, 0);

/** Reusable Color for instance color updates */
const _color = new Color();

/**
 * FileNodes renders all file nodes in the repository tree as a single InstancedMesh.
 * Uses per-instance color via instanceColor attribute.
 * Glow/pulse for recently modified files, fade-out for deleted files.
 * Supports hover detection via instanceId raycasting.
 */
export default function FileNodes(): React.JSX.Element {
  const meshRef = useRef<InstancedMesh>(null);

  // Track which instance indices are dirty (position changed)
  const prevPositions = useRef<Float32Array>(new Float32Array(MAX_INSTANCES * 3));
  const activeCountRef = useRef(0);

  // Map from instance index to file ID for hover lookup
  const instanceToFileId = useRef<string[]>([]);

  // Flat circle geometry — visible from top-down camera, cheaper than sphere
  const geometry = useMemo(() => new CircleGeometry(1, 24), []);

  // Build a snapshot of all files from the store, applying file filter if set.
  const getVisibleFiles = useCallback((): FileNode[] => {
    const allFiles = Array.from(useTreeStore.getState().files.values());
    const fileFilter = useSettingsStore.getState().fileFilter;
    if (!fileFilter) return allFiles;
    try {
      const re = new RegExp(fileFilter);
      return allFiles.filter((f) => re.test(f.id));
    } catch {
      return allFiles;
    }
  }, []);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && instanceId < instanceToFileId.current.length) {
      const fileId = instanceToFileId.current[instanceId];
      if (fileId) {
        useTreeStore.getState().setHoveredFileId(fileId);
        return;
      }
    }
    useTreeStore.getState().setHoveredFileId(null);
  }, []);

  const handlePointerOut = useCallback(() => {
    useTreeStore.getState().setHoveredFileId(null);
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const currentTimeMs = clock.getElapsedTime() * 1000;
    const files = getVisibleFiles();

    // Ensure instanceColor attribute exists
    if (!mesh.instanceColor) {
      const colorArray = new Float32Array(MAX_INSTANCES * 3);
      mesh.instanceColor = new InstancedBufferAttribute(colorArray, 3);
    }

    const colorAttr = mesh.instanceColor;
    const prev = prevPositions.current;
    const idMapping: string[] = [];
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

      // Emissive boost for recently modified files — bright glow that fades
      if (file.alive && elapsedMs < FILE_PULSE_DURATION_MS) {
        const t = 1.0 - elapsedMs / FILE_PULSE_DURATION_MS;
        const boost = t * t * 0.8;
        _color.r = Math.min(1.0, _color.r + boost);
        _color.g = Math.min(1.0, _color.g + boost);
        _color.b = Math.min(1.0, _color.b + boost);
      }

      colorAttr.setXYZ(visibleIdx, _color.r, _color.g, _color.b);
      idMapping.push(file.id);
      visibleIdx++;
    }

    // Update instance-to-fileId mapping for hover detection
    instanceToFileId.current = idMapping;

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
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, MAX_INSTANCES]}
      frustumCulled={false}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <meshBasicMaterial toneMapped={false} transparent opacity={0.95} />
    </instancedMesh>
  );
}
