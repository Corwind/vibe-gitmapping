import { Canvas } from '@react-three/fiber';
import Scene from './canvas/Scene';
import Timeline from './ui/Timeline';
import Controls from './ui/Controls';
import RepoInput from './ui/RepoInput';
import InfoPanel from './ui/InfoPanel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFullscreen } from '../hooks/useFullscreen';

export default function App(): React.JSX.Element {
  useKeyboardShortcuts();
  useFullscreen();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        orthographic
        camera={{ position: [0, 100, 0], zoom: 8, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        style={{ background: '#050510' }}
      >
        <Scene />
      </Canvas>

      {/* UI overlay layer - pointer-events none on container, auto on children */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <RepoInput />
        <Controls />
        <InfoPanel />
        <Timeline />
      </div>
    </div>
  );
}
