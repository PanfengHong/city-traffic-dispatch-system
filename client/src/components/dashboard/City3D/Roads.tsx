import { useMemo } from 'react';
import { useTrafficStore } from '../../../store/trafficStore';
import type { RoadData } from '../../../types';

const ROAD_THICKNESS = 6;

// 拥堵度 -> 颜色：畅通(青) -> 缓行(黄) -> 拥堵(红)
function congestionColor(c: number): string {
  if (c < 0.3) return '#4ade80'; // 畅通 绿
  if (c < 0.6) return '#facc15'; // 缓行 黄
  return '#f87171'; // 拥堵 红
}

interface RoadMeshProps {
  road: RoadData;
}

function RoadMesh({ road }: RoadMeshProps) {
  const { from, to, isMain } = road;
  // 3D 坐标：x->x, y->z
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const length = Math.hypot(dx, dz);
  const midX = (from.x + to.x) / 2;
  const midZ = (from.y + to.y) / 2;
  const angle = Math.atan2(dz, dx); // 绕 Y 轴旋转
  const thickness = isMain ? ROAD_THICKNESS + 2 : ROAD_THICKNESS;

  const color = congestionColor(road.congestion);

  return (
    <mesh position={[midX, 0.3, midZ]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, 0.4, thickness]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.9} />
    </mesh>
  );
}

export default function Roads() {
  const roads = useTrafficStore((s) => s.snapshot?.roads);

  const roadList = useMemo(() => roads || [], [roads]);

  return (
    <group>
      {roadList.map((r) => (
        <RoadMesh key={r.id} road={r} />
      ))}
    </group>
  );
}
