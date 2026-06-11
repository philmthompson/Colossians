import * as THREE from 'three';
import { terrainH } from '../world/terrain';

const FLOCK_CENTER = new THREE.Vector3(300, 0, -50);
const LEASH_RADIUS = 26;
const WANDER_SPEED = 0.8;

interface SheepState {
  pos: THREE.Vector3;
  heading: number; // radians
  timer: number;   // seconds until next direction change
}

const states: SheepState[] = [];
let bodyInst:  THREE.InstancedMesh;
let headInst:  THREE.InstancedMesh;

export function buildFlock(scene: THREE.Scene): void {
  const woolMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
  const legMat  = new THREE.MeshLambertMaterial({ color: 0x605040 });

  const bodyGeo = new THREE.SphereGeometry(0.7, 8, 6);
  const headGeo = new THREE.SphereGeometry(0.35, 7, 5);
  const COUNT = 12;

  bodyInst = new THREE.InstancedMesh(bodyGeo, woolMat, COUNT);
  headInst = new THREE.InstancedMesh(headGeo, woolMat, COUNT);
  bodyInst.castShadow = true;
  headInst.castShadow = true;

  // Leg pairs as thin boxes — static offset from body, regenerated each frame
  void legMat;

  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2;
    const r = 8 + Math.random() * 14;
    states.push({
      pos: new THREE.Vector3(
        FLOCK_CENTER.x + r * Math.cos(angle),
        0,
        FLOCK_CENTER.z + r * Math.sin(angle),
      ),
      heading: Math.random() * Math.PI * 2,
      timer: Math.random() * 4 + 2,
    });
  }

  scene.add(bodyInst);
  scene.add(headInst);
}

const dummy = new THREE.Object3D();

export function updateFlock(dt: number): void {
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    s.timer -= dt;
    if (s.timer < 0) {
      // Wander: new heading biased back toward center
      const toCenterX = FLOCK_CENTER.x - s.pos.x;
      const toCenterZ = FLOCK_CENTER.z - s.pos.z;
      const dist = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ);
      const bias = dist > LEASH_RADIUS * 0.7 ? 0.6 : 0.1;
      const centerAngle = Math.atan2(toCenterX, toCenterZ);
      s.heading = centerAngle + (Math.random() - 0.5) * Math.PI * (1 - bias) * 2;
      s.timer = 2 + Math.random() * 4;
    }

    // Move
    const step = WANDER_SPEED * dt;
    s.pos.x += Math.sin(s.heading) * step;
    s.pos.z += Math.cos(s.heading) * step;

    // Leash
    const dx = s.pos.x - FLOCK_CENTER.x;
    const dz = s.pos.z - FLOCK_CENTER.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > LEASH_RADIUS) {
      s.pos.x = FLOCK_CENTER.x + (dx / d) * LEASH_RADIUS;
      s.pos.z = FLOCK_CENTER.z + (dz / d) * LEASH_RADIUS;
    }

    s.pos.y = terrainH(s.pos.x, s.pos.z);

    // Body
    dummy.position.set(s.pos.x, s.pos.y + 0.75, s.pos.z);
    dummy.rotation.y = s.heading;
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bodyInst.setMatrixAt(i, dummy.matrix);

    // Head (forward)
    dummy.position.set(
      s.pos.x + Math.sin(s.heading) * 0.85,
      s.pos.y + 0.95,
      s.pos.z + Math.cos(s.heading) * 0.85,
    );
    dummy.rotation.y = s.heading;
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    headInst.setMatrixAt(i, dummy.matrix);
  }

  bodyInst.instanceMatrix.needsUpdate = true;
  headInst.instanceMatrix.needsUpdate = true;
}
