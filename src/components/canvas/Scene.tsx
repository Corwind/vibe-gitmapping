import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCameraStore } from '../../store/useCameraStore';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import FileNodes from './FileNodes';
import DirectoryEdges from './DirectoryEdges';
import Contributors from './Contributors';
import Effects from './Effects';
import { useAnimationEngine } from '../../hooks/useAnimationEngine';

const _lerpTarget = new THREE.Vector3();

/** Invisible component that drives the animation engine each frame. */
function AnimationEngine(): null {
  useAnimationEngine();
  return null;
}

export default function Scene(): React.JSX.Element {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const mode = useCameraStore((s) => s.mode);
  const autoTrackTarget = useCameraStore((s) => s.autoTrackTarget);

  // In tracking mode, smoothly lerp the orbit target toward autoTrackTarget
  useFrame(() => {
    if (mode === 'tracking' && controlsRef.current) {
      _lerpTarget.set(autoTrackTarget[0], autoTrackTarget[1], autoTrackTarget[2]);
      controlsRef.current.target.lerp(_lerpTarget, 0.03);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <AnimationEngine />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
        minDistance={5}
        maxDistance={500}
      />
      <FileNodes />
      <DirectoryEdges />
      <Contributors />
      <Effects />
      <gridHelper args={[100, 100, '#222233', '#111122']} />
    </>
  );
}
