import { Canvas } from '@react-three/fiber';
import Scene from './canvas/Scene';

export default function App(): React.JSX.Element {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a0f' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
