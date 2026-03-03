import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useTreeStore } from '../../store/useTreeStore';

/**
 * Maximum distance (world units) from the pointer to a file dot for hover detection.
 * With FILE_CLUSTER_SPACING=0.35, this gives comfortable hover zones without ambiguity.
 */
const HOVER_THRESHOLD_SQ = 0.5 * 0.5;

/**
 * HoverDetector is a large invisible ground plane on the XZ plane that catches
 * all pointer events. On pointer move it finds the nearest alive file to the
 * intersection point and sets it as hovered. This is far more reliable than
 * raycasting tiny InstancedMesh circles (which are only ~2px at default zoom).
 */
export default function HoverDetector(): React.JSX.Element {
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { x, z } = e.point;

    const files = useTreeStore.getState().files;
    let nearestId: string | null = null;
    let nearestDistSq = HOVER_THRESHOLD_SQ;

    for (const file of files.values()) {
      if (!file.alive) continue;
      const dx = file.position[0] - x;
      const dz = file.position[2] - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestId = file.id;
      }
    }

    useTreeStore.getState().setHoveredFileId(nearestId);
  }, []);

  const handlePointerOut = useCallback(() => {
    useTreeStore.getState().setHoveredFileId(null);
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { x, z } = e.point;

    const files = useTreeStore.getState().files;
    let nearestId: string | null = null;
    let nearestDistSq = HOVER_THRESHOLD_SQ;

    for (const file of files.values()) {
      if (!file.alive) continue;
      const dx = file.position[0] - x;
      const dz = file.position[2] - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestId = file.id;
      }
    }

    useTreeStore.getState().setSelectedFileId(nearestId);
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
