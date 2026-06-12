import { Scene, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { terrainH } from '../world/terrain';

interface NPCDef { id: string; x: number; z: number; color: number; }

export const NPC_DEFS: NPCDef[] = [
  { id: 'epaphras',   x: 116, z: -42, color: 0x8a6040 },
  { id: 'shepherd',   x: 300, z: -50, color: 0x6a5030 },
  { id: 'doorkeeper', x: 141, z: -78, color: 0x704830 },
];

export function buildNPCs(scene: Scene): void {
  const skinM = new StandardMaterial('skin', scene);
  skinM.diffuseColor  = new Color3(0.75, 0.56, 0.38);
  skinM.specularColor = Color3.Black();

  for (const def of NPC_DEFS) {
    const ty = terrainH(def.x, def.z);

    const bodyM = new StandardMaterial(`npc-b-${def.id}`, scene);
    bodyM.diffuseColor  = new Color3(((def.color >> 16) & 255) / 255, ((def.color >> 8) & 255) / 255, (def.color & 255) / 255);
    bodyM.specularColor = Color3.Black();

    const body = MeshBuilder.CreateCylinder(`npc-body-${def.id}`, { diameterTop: 0.56, diameterBottom: 0.7, height: 1.65, tessellation: 8 }, scene);
    body.position.set(def.x, ty + 0.82, def.z);
    body.material = bodyM;

    const head = MeshBuilder.CreateSphere(`npc-head-${def.id}`, { diameter: 0.44, segments: 8 }, scene);
    head.position.set(def.x, ty + 1.75, def.z);
    head.material = skinM;
  }
}
