import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, BufferGeometry, Float32BufferAttribute, Color, Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { useTreeStore } from '../../store/useTreeStore';
import type { Contributor, Vec3 } from '../../types';
import { CONTRIBUTOR_TRAVEL_DURATION_MS } from '../../utils/constants';

/** Maximum number of simultaneously visible contributors */
const MAX_VISIBLE_CONTRIBUTORS = 100;

/** Duration (ms) before an idle contributor fades out */
const IDLE_TIMEOUT_MS = 5000;

/** Duration (ms) for a laser beam to stay visible after a file modify */
const BEAM_DURATION_MS = 1000;

/** Height above the XZ plane for contributor avatars */
const CONTRIBUTOR_Y = 0.5;

/** Module-level pre-allocated vectors for lerp computation */
const _targetVec = new Vector3();
const _currentVec = new Vector3();

/** Module-level reusable Color for beam computation */
const _beamColor = new Color();

/** Module-level pre-allocated beam line arrays */
const beamPositionArray = new Float32Array(MAX_VISIBLE_CONTRIBUTORS * 2 * 3);
const beamColorArray = new Float32Array(MAX_VISIBLE_CONTRIBUTORS * 2 * 3);

/** Per-contributor rendering state (mutable, no allocations in loops) */
interface ContributorRenderState {
  name: string;
  currentPosition: Vec3;
  opacity: number;
  color: number;
  beamTarget: Vec3 | null;
  beamOpacity: number;
}

/** Module-level render state pool */
const renderStatePool: ContributorRenderState[] = Array.from(
  { length: MAX_VISIBLE_CONTRIBUTORS },
  () => ({
    name: '',
    currentPosition: [0, 0, 0] as Vec3,
    opacity: 0,
    color: 0xffffff,
    beamTarget: null,
    beamOpacity: 0,
  }),
);

/** Module-level interpolated position tracking */
const interpolatedPositionMap = new Map<string, Vec3>();

/**
 * Contributors renders contributor avatars as flat circles on the XZ plane
 * with smooth movement animation, name labels, and laser beams to target files.
 * Positioned slightly above Y=0 so they appear above the tree on a top-down view.
 */
export default function Contributors(): React.JSX.Element {
  const groupRef = useRef<Group>(null);
  const beamGeoRef = useRef<BufferGeometry>(null);
  const activeCountRef = useRef(0);

  useFrame(({ clock }) => {
    const currentTimeMs = clock.getElapsedTime() * 1000;
    const dt = Math.min(clock.getDelta() * 1000, 50);

    const state = useTreeStore.getState();
    const contributors = state.contributors;
    const files = state.files;

    // Sort contributors by activity (most recent first), take top MAX
    const sorted: Contributor[] = [];
    for (const c of contributors.values()) {
      sorted.push(c);
    }
    sorted.sort((a, b) => b.lastActiveTimestamp - a.lastActiveTimestamp);

    const visible = sorted.slice(0, MAX_VISIBLE_CONTRIBUTORS);
    let activeCount = 0;
    let beamVertIdx = 0;

    for (let i = 0; i < visible.length; i++) {
      const contributor = visible[i];
      const idleMs = currentTimeMs - contributor.lastActiveTimestamp;

      if (idleMs > IDLE_TIMEOUT_MS + 1000) continue;

      const rs = renderStatePool[activeCount];
      rs.name = contributor.name;
      rs.color = contributor.color;

      // Compute target position on XZ plane, slightly above it
      let targetPos: Vec3 = contributor.position;
      if (contributor.targetFile) {
        const targetFile = files.get(contributor.targetFile);
        if (targetFile) {
          targetPos = [
            targetFile.position[0],
            CONTRIBUTOR_Y,
            targetFile.position[2],
          ];
        }
      }

      // Smooth lerp toward target
      const prev = interpolatedPositionMap.get(contributor.name) ?? targetPos;
      const lerpFactor = Math.min(1.0, dt / CONTRIBUTOR_TRAVEL_DURATION_MS);

      _currentVec.set(prev[0], prev[1], prev[2]);
      _targetVec.set(targetPos[0], targetPos[1], targetPos[2]);
      _currentVec.lerp(_targetVec, lerpFactor);

      const newPos: Vec3 = [_currentVec.x, _currentVec.y, _currentVec.z];
      interpolatedPositionMap.set(contributor.name, newPos);
      rs.currentPosition = newPos;

      // Fade based on idle time
      if (idleMs < IDLE_TIMEOUT_MS) {
        rs.opacity = 1.0;
      } else {
        rs.opacity = Math.max(0, 1.0 - (idleMs - IDLE_TIMEOUT_MS) / 1000);
      }

      // Laser beam to target file
      if (contributor.targetFile && contributor.active) {
        const targetFile = files.get(contributor.targetFile);
        if (targetFile) {
          const beamAge = currentTimeMs - contributor.lastActiveTimestamp;
          if (beamAge < BEAM_DURATION_MS) {
            rs.beamTarget = targetFile.position;
            rs.beamOpacity = 1.0 - beamAge / BEAM_DURATION_MS;

            _beamColor.setHex(contributor.color);

            // Start vertex (contributor)
            beamPositionArray[beamVertIdx] = newPos[0];
            beamPositionArray[beamVertIdx + 1] = newPos[1];
            beamPositionArray[beamVertIdx + 2] = newPos[2];
            beamColorArray[beamVertIdx] = _beamColor.r * rs.beamOpacity;
            beamColorArray[beamVertIdx + 1] = _beamColor.g * rs.beamOpacity;
            beamColorArray[beamVertIdx + 2] = _beamColor.b * rs.beamOpacity;
            beamVertIdx += 3;

            // End vertex (file)
            beamPositionArray[beamVertIdx] = targetFile.position[0];
            beamPositionArray[beamVertIdx + 1] = targetFile.position[1];
            beamPositionArray[beamVertIdx + 2] = targetFile.position[2];
            beamColorArray[beamVertIdx] = _beamColor.r * rs.beamOpacity * 0.3;
            beamColorArray[beamVertIdx + 1] = _beamColor.g * rs.beamOpacity * 0.3;
            beamColorArray[beamVertIdx + 2] = _beamColor.b * rs.beamOpacity * 0.3;
            beamVertIdx += 3;
          } else {
            rs.beamTarget = null;
            rs.beamOpacity = 0;
          }
        }
      } else {
        rs.beamTarget = null;
        rs.beamOpacity = 0;
      }

      activeCount++;
    }

    activeCountRef.current = activeCount;

    // Update beam geometry
    const beamGeo = beamGeoRef.current;
    if (beamGeo) {
      const posAttr = beamGeo.getAttribute('position') as Float32BufferAttribute;
      const colAttr = beamGeo.getAttribute('color') as Float32BufferAttribute;
      if (posAttr) posAttr.needsUpdate = true;
      if (colAttr) colAttr.needsUpdate = true;
      beamGeo.setDrawRange(0, beamVertIdx / 3);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Contributor sprites — flat circles visible from top-down */}
      {Array.from({ length: MAX_VISIBLE_CONTRIBUTORS }, (_, idx) => (
        <ContributorSprite key={idx} index={idx} />
      ))}

      {/* Laser beams as lineSegments */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={beamGeoRef}>
          <bufferAttribute attach="attributes-position" args={[beamPositionArray, 3]} />
          <bufferAttribute attach="attributes-color" args={[beamColorArray, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          linewidth={2}
        />
      </lineSegments>
    </group>
  );
}

function ContributorSprite({ index }: { index: number }): React.JSX.Element {
  const spriteGroupRef = useRef<Group>(null);

  useFrame(() => {
    const group = spriteGroupRef.current;
    if (!group) return;

    const rs = renderStatePool[index];
    if (!rs || rs.opacity <= 0) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.set(rs.currentPosition[0], rs.currentPosition[1], rs.currentPosition[2]);
  });

  return (
    <group ref={spriteGroupRef} visible={false}>
      {/* Flat circle visible from top-down camera — lies on XZ plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0.9} />
      </mesh>
      {/* Name label positioned to the side, lying flat on XZ plane */}
      <Text
        position={[1.0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color="#dddddd"
        anchorX="left"
        anchorY="middle"
        maxWidth={5}
      >
        {''}
      </Text>
    </group>
  );
}
