import { Scene, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { terrainH } from '../world/terrain';

interface NPCDef { id: string; x: number; z: number; color: number; cloak: number; }

// Tunic (chiton) colours are undyed wool / earth tones; the cloak (himation)
// is a contrasting draped mantle, as worn in 1st-century Asia Minor.
export const NPC_DEFS: NPCDef[] = [
  { id: 'epaphras',   x: 116, z: -42, color: 0xcabfa2, cloak: 0x8a3a2e }, // off-white tunic, red mantle
  { id: 'shepherd',   x: 300, z: -50, color: 0x9a8255, cloak: 0x5a4a2e }, // brown working tunic
  { id: 'doorkeeper', x: 141, z: -78, color: 0xb8a884, cloak: 0x3a5a6a }, // pale tunic, blue mantle
];

function col3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

export function buildNPCs(scene: Scene): void {
  const skinM = new StandardMaterial('skin', scene);
  skinM.diffuseColor  = new Color3(0.72, 0.53, 0.36); // Mediterranean complexion
  skinM.specularColor = Color3.Black();

  const hairM = new StandardMaterial('npc-hair', scene);
  hairM.diffuseColor  = new Color3(0.16, 0.11, 0.07); // dark brown/black
  hairM.specularColor = Color3.Black();

  for (const def of NPC_DEFS) {
    const ty = terrainH(def.x, def.z);

    const tunicM = new StandardMaterial(`npc-tunic-${def.id}`, scene);
    tunicM.diffuseColor  = col3(def.color);
    tunicM.specularColor = Color3.Black();

    const cloakM = new StandardMaterial(`npc-cloak-${def.id}`, scene);
    cloakM.diffuseColor  = col3(def.cloak);
    cloakM.specularColor = Color3.Black();

    // ── Tunic / long robe to the ankles (wider at hem, as a draped chiton) ──
    const robe = MeshBuilder.CreateCylinder(`npc-robe-${def.id}`,
      { diameterTop: 0.46, diameterBottom: 0.82, height: 1.45, tessellation: 12 }, scene);
    robe.position.set(def.x, ty + 0.72, def.z);
    robe.material = tunicM;

    // ── Shoulders / upper torso ────────────────────────────────────────────
    const torso = MeshBuilder.CreateCylinder(`npc-torso-${def.id}`,
      { diameterTop: 0.5, diameterBottom: 0.5, height: 0.42, tessellation: 12 }, scene);
    torso.position.set(def.x, ty + 1.55, def.z);
    torso.material = tunicM;

    // ── Himation (mantle) draped diagonally across the body ────────────────
    const mantle = MeshBuilder.CreateCylinder(`npc-mantle-${def.id}`,
      { diameterTop: 0.52, diameterBottom: 0.7, height: 1.0, tessellation: 12, arc: 0.62 }, scene);
    mantle.position.set(def.x, ty + 1.05, def.z);
    mantle.rotation.y = 0.6;
    mantle.material = cloakM;

    // A shoulder fold of the mantle
    const shoulder = MeshBuilder.CreateSphere(`npc-shoulder-${def.id}`,
      { diameter: 0.34, segments: 8 }, scene);
    shoulder.scaling.set(1, 0.6, 1);
    shoulder.position.set(def.x + 0.18, ty + 1.7, def.z - 0.05);
    shoulder.material = cloakM;

    // ── Neck, head ─────────────────────────────────────────────────────────
    const neck = MeshBuilder.CreateCylinder(`npc-neck-${def.id}`,
      { diameter: 0.18, height: 0.16, tessellation: 8 }, scene);
    neck.position.set(def.x, ty + 1.82, def.z);
    neck.material = skinM;

    const head = MeshBuilder.CreateSphere(`npc-head-${def.id}`,
      { diameter: 0.42, segments: 10 }, scene);
    head.scaling.set(0.92, 1.05, 0.95);
    head.position.set(def.x, ty + 2.02, def.z);
    head.material = skinM;

    // ── Hair cap + short beard (typical male grooming of the period) ───────
    const hair = MeshBuilder.CreateSphere(`npc-hairtop-${def.id}`,
      { diameter: 0.46, segments: 10 }, scene);
    hair.scaling.set(1, 0.78, 1);
    hair.position.set(def.x, ty + 2.12, def.z);
    hair.material = hairM;

    const beard = MeshBuilder.CreateSphere(`npc-beard-${def.id}`,
      { diameter: 0.3, segments: 8 }, scene);
    beard.scaling.set(1, 0.85, 0.7);
    beard.position.set(def.x, ty + 1.92, def.z + 0.16);
    beard.material = hairM;
  }
}
