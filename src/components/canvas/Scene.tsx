import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { useCameraStore } from '../../store/useCameraStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import FileNodes from './FileNodes';
import FileLabels from './FileLabels';
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

/** Sets the camera to look straight down at the XZ plane on mount. */
function CameraSetup(): null {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 100, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

export default function Scene(): React.JSX.Element {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const mode = useCameraStore((s) => s.mode);
  const autoTrackTarget = useCameraStore((s) => s.autoTrackTarget);

  // Sync autoCamera setting to camera store mode
  useEffect(() => {
    return useSettingsStore.subscribe((state, prev) => {
      if (state.autoCamera !== prev.autoCamera) {
        useCameraStore.getState().setMode(state.autoCamera ? 'tracking' : 'free');
      }
    });
  }, []);

  // Set initial camera mode from settings
  useEffect(() => {
    if (useSettingsStore.getState().autoCamera) {
      useCameraStore.getState().setMode('tracking');
    }
  }, []);

  // In tracking mode, smoothly lerp the controls target toward autoTrackTarget on XZ plane.
  // With an orthographic camera we also shift camera.position on X/Z to keep it above the target.
  useFrame(({ camera }) => {
    if (mode === 'tracking' && controlsRef.current) {
      _lerpTarget.set(autoTrackTarget[0], 0, autoTrackTarget[2]);
      controlsRef.current.target.lerp(_lerpTarget, 0.03);
      camera.position.x = controlsRef.current.target.x;
      camera.position.z = controlsRef.current.target.z;
      controlsRef.current.update();
    }
  });

  return (
    <>
      <AnimationEngine />
      <CameraSetup />
      <ambientLight intensity={0.6} />
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        screenSpacePanning={true}
        enableDamping
        dampingFactor={0.1}
        zoomSpeed={1.2}
        panSpeed={0.8}
        minZoom={0.5}
        maxZoom={100}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
      <FileNodes />
      <FileLabels />
      <DirectoryEdges />
      <Contributors />
      <Effects />
    </>
  );
}
