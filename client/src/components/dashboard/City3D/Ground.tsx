import { useMemo } from 'react';

// 地面 + 水系 + 绿地
export default function Ground() {
  // 一块水系（右下角湖）+ 几块绿地
  const waters = useMemo(
    () => [
      { pos: [350, 0.1, 350] as [number, number, number], size: [220, 220] as [number, number] },
    ],
    []
  );

  const parks = useMemo(
    () => [
      { pos: [-350, 0.1, -300] as [number, number, number], size: [160, 160] as [number, number] },
      { pos: [200, 0.1, -380] as [number, number, number], size: [120, 100] as [number, number] },
    ],
    []
  );

  return (
    <group>
      {/* 主地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#dde4ec" roughness={1} metalness={0} />
      </mesh>

      {/* 细网格叠加（增强城市肌理） */}
      <gridHelper
        args={[2000, 40, '#b8c5d6', '#c9d4e0']}
        position={[0, 0, 0]}
      />

      {/* 水系 */}
      {waters.map((w, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={w.pos}>
          <planeGeometry args={w.size} />
          <meshStandardMaterial color="#5db8e6" roughness={0.2} metalness={0.3} transparent opacity={0.85} />
        </mesh>
      ))}

      {/* 绿地 */}
      {parks.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={p.pos}>
          <planeGeometry args={p.size} />
          <meshStandardMaterial color="#9ccc8a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
