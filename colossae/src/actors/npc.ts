import * as THREE from 'three';
import { terrainH } from '../world/terrain';

interface NPCDef {
  id: string;
  x: number;
  z: number;
  color: number;
}

const NPC_DEFS: NPCDef[] = [
  { id: 'epaphras',   x: 116, z: -42, color: 0x8a6040 }, // agora
  { id: 'shepherd',   x: 300, z: -50, color: 0x6a5030 }, // pastures
  { id: 'doorkeeper', x: 141, z: -78, color: 0x704830 }, // philemon's house
];

export function buildNPCs(scene: THREE.Scene): void {
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0 });

  for (const def of NPC_DEFS) {
    const ty = terrainH(def.x, def.z);
    const mat = bodyMat.clone();
    mat.color.set(def.color);

    // Body (draped cylinder)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 1.65, 8),
      mat,
    );
    body.position.set(def.x, ty + 0.82, def.z);
    body.castShadow = true;
    scene.add(body);

    // Head
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xc09060 });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      skinMat,
    );
    head.position.set(def.x, ty + 1.75, def.z);
    scene.add(head);
  }
}

// Stub for 3D position reference (colliders registered by interact.ts)
export { NPC_DEFS };
export const _three = THREE;
