import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BuildingData {
  position: [number, number, number];
  size: [number, number, number];
  color: THREE.Color;
}

const CITY_HALF = 500;
const BLOCK = 100;
const ROAD_WIDTH = 14;

// 水系 / 绿地范围（与 Ground 对应，避免在其上方生成建筑）
const WATER_BOUNDS = [{ x: 350, z: 350, w: 220, d: 220 }];
const PARK_BOUNDS = [
  { x: -350, z: -300, w: 160, d: 160 },
  { x: 200, z: -380, w: 120, d: 100 },
];

function inBounds(x: number, z: number, bounds: { x: number; z: number; w: number; d: number }[]) {
  return bounds.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);
}

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = [];
  const colorPalette = ['#ffffff', '#f1f5f9', '#e2e8f0', '#f8fafc', '#eef2f7'];

  const blocks = Math.floor((CITY_HALF * 2) / BLOCK); // 10
  for (let i = 0; i < blocks; i++) {
    for (let j = 0; j < blocks; j++) {
      const blockX = -CITY_HALF + i * BLOCK + BLOCK / 2;
      const blockZ = -CITY_HALF + j * BLOCK + BLOCK / 2;

      if (inBounds(blockX, blockZ, WATER_BOUNDS) || inBounds(blockX, blockZ, PARK_BOUNDS)) continue;

      // 每个街区 1~3 栋建筑
      const count = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const offsetX = (Math.random() - 0.5) * (BLOCK - ROAD_WIDTH * 2 - 20);
        const offsetZ = (Math.random() - 0.5) * (BLOCK - ROAD_WIDTH * 2 - 20);
        const w = 20 + Math.random() * 40;
        const d = 20 + Math.random() * 40;
        // 主干道旁建筑更高
        const nearMain = i % 3 === 0 || j % 3 === 0;
        const h = (nearMain ? 40 : 15) + Math.random() * (nearMain ? 120 : 50);
        const color = new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
        buildings.push({
          position: [blockX + offsetX, h / 2, blockZ + offsetZ],
          size: [w, h, d],
          color,
        });
      }
    }
  }
  return buildings;
}

export default function Buildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const buildings = useMemo(() => generateBuildings(), []);

  // 设置每个实例的矩阵与颜色（ref 在渲染后可用，使用 useEffect）
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((b, idx) => {
      dummy.position.set(...b.position);
      dummy.scale.set(...b.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, b.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [buildings]);

  // 轻微呼吸效果（可选，提升科技感）
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.02 + Math.sin(t * 0.5) * 0.01;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.7}
        metalness={0.1}
        emissive="#1e3a5f"
        emissiveIntensity={0.02}
      />
    </instancedMesh>
  );
}
