import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTrafficStore } from '../../../store/trafficStore';
import type { VehicleData } from '../../../types';

const MAX_VEHICLES = 300;

interface VehicleState {
  x: number;
  z: number;
  angle: number;
}

export default function Vehicles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const vehicles = useTrafficStore((s) => s.snapshot?.vehicles);

  const current = useRef<VehicleState[]>([]);
  const target = useRef<VehicleState[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const colorObj = useRef(new THREE.Color());

  // 快照到达 -> 更新目标位置与颜色
  useEffect(() => {
    const mesh = meshRef.current;
    if (!vehicles || !mesh) return;
    target.current = vehicles.map((v) => ({ x: v.x, z: v.y, angle: v.angle }));
    if (current.current.length === 0) {
      current.current = vehicles.map((v) => ({ x: v.x, z: v.y, angle: v.angle }));
    }
    // 设置每辆车颜色
    vehicles.forEach((v, i) => {
      if (i < MAX_VEHICLES) {
        mesh.setColorAt(i, colorObj.current.set(v.color));
      }
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [vehicles]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const lerpFactor = Math.min(delta * 5, 1);
    const tgt = target.current;
    const cur = current.current;
    const count = Math.min(tgt.length, MAX_VEHICLES);

    for (let i = 0; i < MAX_VEHICLES; i++) {
      if (i < count) {
        cur[i] = cur[i] || { ...tgt[i] };
        cur[i].x += (tgt[i].x - cur[i].x) * lerpFactor;
        cur[i].z += (tgt[i].z - cur[i].z) * lerpFactor;
        // 角度插值（处理 π 环绕）
        let da = tgt[i].angle - cur[i].angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        cur[i].angle += da * lerpFactor;

        dummy.current.position.set(cur[i].x, 1.8, cur[i].z);
        dummy.current.rotation.set(0, -cur[i].angle, 0);
        dummy.current.scale.set(1, 1, 1);
        dummy.current.updateMatrix();
        mesh.setMatrixAt(i, dummy.current.matrix);
      } else {
        dummy.current.position.set(0, -9999, 0);
        dummy.current.scale.set(0, 0, 0);
        dummy.current.updateMatrix();
        mesh.setMatrixAt(i, dummy.current.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_VEHICLES]} castShadow>
      <boxGeometry args={[3.2, 1.4, 1.6]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#38bdf8"
        emissiveIntensity={0.5}
        roughness={0.4}
        metalness={0.3}
      />
    </instancedMesh>
  );
}
