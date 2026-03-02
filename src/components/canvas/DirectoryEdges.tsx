import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Color } from 'three';
import { useTreeStore } from '../../store/useTreeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { DirNode } from '../../types';

/** Maximum number of edges we can render */
const MAX_EDGES = 50_000;

/** Pre-allocated position buffer: 2 vertices per edge, 3 floats each */
const MAX_FLOATS = MAX_EDGES * 2 * 3;

/** Module-level pre-allocated typed arrays (mutable, never re-created) */
const edgePositionArray = new Float32Array(MAX_FLOATS);
const edgeColorArray = new Float32Array(MAX_FLOATS);

/** Depth-based colors for directory edges */
const DEPTH_COLORS = [
  new Color(0x4466aa),
  new Color(0x338866),
  new Color(0x886633),
  new Color(0x664488),
  new Color(0x448888),
  new Color(0x886644),
  new Color(0x668844),
  new Color(0x884466),
];

/** Reusable Color for vertex color writes */
const _col = new Color();

function depthColor(depth: number): Color {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

/**
 * DirectoryEdges renders ALL tree edges in a single lineSegments primitive.
 * Uses a pre-allocated BufferGeometry with vertex colors matching directory depth.
 */
export default function DirectoryEdges(): React.JSX.Element | null {
  const geoRef = useRef<BufferGeometry>(null);
  const showEdges = useSettingsStore((s) => s.showEdges);

  useFrame(() => {
    if (!showEdges) return;
    const geo = geoRef.current;
    if (!geo) return;

    const state = useTreeStore.getState();
    const dirs = state.dirs;

    let vertexIdx = 0;

    for (const dir of dirs.values()) {
      if (dir.parent === null) continue;

      const parentDir: DirNode | undefined = dirs.get(dir.parent);
      if (!parentDir) continue;

      if (vertexIdx / 3 >= MAX_FLOATS / 3 - 6) break;

      // Parent vertex
      edgePositionArray[vertexIdx] = parentDir.position[0];
      edgePositionArray[vertexIdx + 1] = parentDir.position[1];
      edgePositionArray[vertexIdx + 2] = parentDir.position[2];

      _col.copy(depthColor(parentDir.depth));
      edgeColorArray[vertexIdx] = _col.r;
      edgeColorArray[vertexIdx + 1] = _col.g;
      edgeColorArray[vertexIdx + 2] = _col.b;

      vertexIdx += 3;

      // Child vertex
      edgePositionArray[vertexIdx] = dir.position[0];
      edgePositionArray[vertexIdx + 1] = dir.position[1];
      edgePositionArray[vertexIdx + 2] = dir.position[2];

      _col.copy(depthColor(dir.depth));
      edgeColorArray[vertexIdx] = _col.r;
      edgeColorArray[vertexIdx + 1] = _col.g;
      edgeColorArray[vertexIdx + 2] = _col.b;

      vertexIdx += 3;
    }

    // Dir-to-file edges
    const files = state.files;
    for (const file of files.values()) {
      if (!file.alive) continue;
      const parentDir = dirs.get(file.parent);
      if (!parentDir) continue;

      if (vertexIdx / 3 >= MAX_FLOATS / 3 - 6) break;

      edgePositionArray[vertexIdx] = parentDir.position[0];
      edgePositionArray[vertexIdx + 1] = parentDir.position[1];
      edgePositionArray[vertexIdx + 2] = parentDir.position[2];

      _col.copy(depthColor(parentDir.depth));
      edgeColorArray[vertexIdx] = _col.r;
      edgeColorArray[vertexIdx + 1] = _col.g;
      edgeColorArray[vertexIdx + 2] = _col.b;

      vertexIdx += 3;

      edgePositionArray[vertexIdx] = file.position[0];
      edgePositionArray[vertexIdx + 1] = file.position[1];
      edgePositionArray[vertexIdx + 2] = file.position[2];

      _col.copy(depthColor(parentDir.depth + 1));
      edgeColorArray[vertexIdx] = _col.r;
      edgeColorArray[vertexIdx + 1] = _col.g;
      edgeColorArray[vertexIdx + 2] = _col.b;

      vertexIdx += 3;
    }

    const posAttr = geo.getAttribute('position') as Float32BufferAttribute;
    const colAttr = geo.getAttribute('color') as Float32BufferAttribute;

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.setDrawRange(0, vertexIdx / 3);
  });

  if (!showEdges) return null;

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[edgePositionArray, 3]} />
        <bufferAttribute attach="attributes-color" args={[edgeColorArray, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.4} depthWrite={false} />
    </lineSegments>
  );
}
