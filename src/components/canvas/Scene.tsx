import { OrbitControls } from '@react-three/drei';

export default function Scene(): React.JSX.Element {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={500}
      />
      {/* Placeholder: a simple sphere at center to verify rendering */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#4488ff" emissive="#1144aa" emissiveIntensity={0.5} />
      </mesh>
      <gridHelper args={[100, 100, '#222233', '#111122']} />
    </>
  );
}
