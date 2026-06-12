import { Scene, MeshBuilder, StandardMaterial, Color3, InstancedMesh } from '@babylonjs/core';
import { terrainH } from '../world/terrain';

const FLOCK_CX = 300, FLOCK_CZ = -50;
const LEASH_RADIUS = 26;
const WANDER_SPEED = 0.8;
const COUNT = 12;

interface SheepState {
  x: number; z: number;
  heading: number;
  timer: number;
}

const states: SheepState[] = [];
const bodies: InstancedMesh[] = [];
const heads:  InstancedMesh[] = [];

export function buildFlock(scene: Scene): void {
  const woolM = new StandardMaterial('wool', scene);
  woolM.diffuseColor  = new Color3(0.91, 0.88, 0.82);
  woolM.specularColor = Color3.Black();

  const bodySrc = MeshBuilder.CreateSphere('sheep-body-src', { diameter: 1.4, segments: 8 }, scene);
  const headSrc = MeshBuilder.CreateSphere('sheep-head-src', { diameter: 0.7, segments: 7 }, scene);
  bodySrc.material = headSrc.material = woolM;
  bodySrc.isVisible = headSrc.isVisible = false;

  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2;
    const r = 8 + Math.random() * 14;
    states.push({
      x: FLOCK_CX + r * Math.cos(angle),
      z: FLOCK_CZ + r * Math.sin(angle),
      heading: Math.random() * Math.PI * 2,
      timer: Math.random() * 4 + 2,
    });
    bodies.push(bodySrc.createInstance(`sheep-b-${i}`));
    heads.push(headSrc.createInstance(`sheep-h-${i}`));
  }
}

export function updateFlock(dt: number): void {
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    s.timer -= dt;
    if (s.timer < 0) {
      const toCenterX = FLOCK_CX - s.x, toCenterZ = FLOCK_CZ - s.z;
      const dist = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ);
      const bias = dist > LEASH_RADIUS * 0.7 ? 0.6 : 0.1;
      const centerAngle = Math.atan2(toCenterX, toCenterZ);
      s.heading = centerAngle + (Math.random() - 0.5) * Math.PI * (1 - bias) * 2;
      s.timer = 2 + Math.random() * 4;
    }

    s.x += Math.sin(s.heading) * WANDER_SPEED * dt;
    s.z += Math.cos(s.heading) * WANDER_SPEED * dt;

    const dx = s.x - FLOCK_CX, dz = s.z - FLOCK_CZ;
    const d  = Math.sqrt(dx * dx + dz * dz);
    if (d > LEASH_RADIUS) { s.x = FLOCK_CX + (dx / d) * LEASH_RADIUS; s.z = FLOCK_CZ + (dz / d) * LEASH_RADIUS; }

    const y = terrainH(s.x, s.z);
    bodies[i].position.set(s.x, y + 0.75, s.z);
    bodies[i].rotation.y = s.heading;
    heads[i].position.set(
      s.x + Math.sin(s.heading) * 0.85,
      y + 0.95,
      s.z + Math.cos(s.heading) * 0.85,
    );
    heads[i].rotation.y = s.heading;
  }
}
