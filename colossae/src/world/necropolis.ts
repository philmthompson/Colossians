import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

export function buildNecropolis(scene: THREE.Scene): void {
  // ~22 bathtub-type tombs: x -35→95, z -180→-225 (north bank)
  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.88, metalness: 0 });
  const lidMat        = new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.88, metalness: 0 });
  const darkMat       = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.88, metalness: 0 });

  const tombPositions: [number, number, boolean][] = [
    [-30, -185, false],
    [-18, -185, true],
    [ -6, -185, false],
    [  6, -185, false],
    [ 18, -185, true],
    [ 30, -185, false],
    [ 42, -185, false],
    [ 54, -185, true],
    [ 66, -185, false],
    [ 78, -185, false],

    [-24, -197, true],
    [-12, -197, false],
    [  0, -197, false],
    [ 12, -197, true],
    [ 24, -197, false],
    [ 36, -197, false],
    [ 48, -197, true],
    [ 60, -197, false],
    [ 72, -197, false],

    [-18, -210, false],
    [  0, -210, true],
    [ 18, -210, false],
    [ 36, -210, false],
  ];

  for (const [tx, tz, lidAjar] of tombPositions) {
    const ty = terrainH(tx, tz);
    const ROT = 0.1 * (Math.random() - 0.5);

    // Tub body (carved stone box, rounded sides)
    const tub = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.9), travertineMat);
    tub.position.set(tx, ty + 0.4, tz);
    tub.rotation.y = ROT;
    tub.castShadow = true; tub.receiveShadow = true;
    scene.add(tub);

    // Interior (dark, slightly inset)
    const interior = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.65), darkMat);
    interior.position.set(tx, ty + 0.7, tz);
    interior.rotation.y = ROT;
    scene.add(interior);

    // Lid
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.25, 0.95), lidMat);
    if (lidAjar) {
      // Displaced lid — slid to the side and tilted
      lid.position.set(tx + 0.6, ty + 0.85, tz + 0.2);
      lid.rotation.z = 0.25;
      lid.rotation.y = ROT + 0.3;
    } else {
      lid.position.set(tx, ty + 0.85, tz);
      lid.rotation.y = ROT;
    }
    lid.castShadow = true; lid.receiveShadow = true;
    scene.add(lid);

    addCollider({ x: tx, z: tz, r: 1.4 });
  }

  // Cypress avenue (cypresses added in nature.ts, but flag positions here)
  // Milestone path from bridge (x=22, z=-92) to necropolis
}

// ─── Road milestone ───────────────────────────────────────────────────────────
export function buildMilestone(scene: THREE.Scene): void {
  const MX = 292, MZ = -89;
  const ty = terrainH(MX, MZ);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.88, metalness: 0 });

  // Column milestone
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 10), mat);
  shaft.position.set(MX, ty + 0.8, MZ);
  shaft.castShadow = true;
  scene.add(shaft);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), mat);
  cap.position.set(MX, ty + 1.71, MZ);
  scene.add(cap);

  addCollider({ x: MX, z: MZ, r: 1 });
}
