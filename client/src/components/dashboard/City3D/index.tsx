import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Buildings from './Buildings';
import Roads from './Roads';
import Vehicles from './Vehicles';
import Ground from './Ground';

export default function City3D() {
  return (
    <Canvas
      camera={{ position: [700, 560, 700], fov: 45, near: 1, far: 5000 }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
    >
      {/* 雾效，增加层次感 */}
      <fog attach="fog" args={['#0b1f3a', 800, 2400]} />

      {/* 光照：模拟日间城市光 */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[400, 800, 300]}
        intensity={1.1}
        color="#fff5e6"
        castShadow
      />
      <directionalLight position={[-300, 400, -200]} intensity={0.3} color="#93c5fd" />

      {/* 场景内容 */}
      <Ground />
      <Roads />
      <Buildings />
      <Vehicles />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={300}
        maxDistance={1800}
        target={[0, 0, 0]}
        makeDefault
      />
    </Canvas>
  );
}
