import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// Theatre at (224, -48) on hill h≈13
// Cavea opens WEST toward the city.

export function buildTheatre(scene: THREE.Scene): void {
  const TX = 224, TZ = -48;
  const baseY = terrainH(TX, TZ);
  const SINK   = 8.0;
  const bottom = baseY - SINK;

  const TIERS       = 8;
  const TIER_H      = 0.9;
  const TIER_W      = 2.2;
  const R_START     = 12;
  const THETA_START = -Math.PI * 0.5;
  const THETA_LEN   = Math.PI;
  const SEG         = 36;

  // ── Wedding-cake solid tiers ─────────────────────────────────────────────────
  // Layer t = solid half-cylinder from `bottom` (underground) to baseY + t*TIER_H.
  // DoubleSide makes inner curved faces (the risers visible from orchestra) render.
  // Alternating light/dark stone makes steps read clearly.
  const lightSeat = new THREE.MeshStandardMaterial({ color: 0xddd4b4, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const darkSeat  = new THREE.MeshStandardMaterial({ color: 0xa89870, roughness: 0.90, metalness: 0, side: THREE.DoubleSide });

  for (let t = TIERS; t >= 0; t--) {
    const r      = R_START + t * TIER_W;
    const topY   = baseY + t * TIER_H;
    const totalH = topY - bottom;
    const mat    = t === 0
      ? new THREE.MeshStandardMaterial({ color: 0xc8bc96, roughness: 0.88, metalness: 0, side: THREE.DoubleSide })
      : (t % 2 === 0 ? lightSeat : darkSeat);

    const geo  = new THREE.CylinderGeometry(r, r, totalH, SEG, 1, false, THETA_START, THETA_LEN);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(TX, bottom + totalH * 0.5, TZ);
    mesh.castShadow   = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ── Orchestra paving ─────────────────────────────────────────────────────────
  const orchMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c0, roughness: 0.82, metalness: 0 });
  const orchGeo = new THREE.CircleGeometry(R_START, SEG, THETA_START, THETA_LEN);
  orchGeo.rotateX(-Math.PI / 2);
  const orch = new THREE.Mesh(orchGeo, orchMat);
  orch.position.set(TX, baseY + 0.07, TZ);
  orch.receiveShadow = true;
  scene.add(orch);

  // ── Outer retaining wall ─────────────────────────────────────────────────────
  // Modest height — just clears the top tier by ~1.5 m.
  const outerR    = R_START + (TIERS + 1) * TIER_W;
  const wallTopY  = baseY + TIERS * TIER_H + 1.5;
  const wallH     = wallTopY - bottom;
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const retainGeo = new THREE.CylinderGeometry(outerR, outerR, wallH, SEG, 1, true, THETA_START, THETA_LEN);
  const retain    = new THREE.Mesh(retainGeo, wallMat);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.castShadow = true; retain.receiveShadow = true;
  scene.add(retain);

  // Solid end-caps at the two straight sides of the arc (plugs the open arc ends)
  for (const side of [-1, 1]) {
    const a    = THETA_START + (side > 0 ? THETA_LEN : 0);
    const ex   = TX + outerR * 0.5 * Math.cos(a);
    const ez   = TZ + outerR * 0.5 * Math.sin(a);
    const capH = wallH;
    const capGeo = new THREE.BoxGeometry(outerR, capH, 1.8);
    const cap    = new THREE.Mesh(capGeo, wallMat);
    cap.position.set(ex, bottom + capH * 0.5, ez);
    cap.rotation.y = -a;
    cap.castShadow = true; cap.receiveShadow = true;
    scene.add(cap);
  }

  // ── Colliders: outer wall arc ────────────────────────────────────────────────
  const colR = outerR + 0.5;
  for (let i = 0; i <= 24; i++) {
    const a = THETA_START + (i / 24) * THETA_LEN;
    addCollider({ x: TX + colR * Math.cos(a), z: TZ + colR * Math.sin(a), r: 2.0 });
  }

  // ── Scaenae frons ────────────────────────────────────────────────────────────
  const scaenaMat = new THREE.MeshStandardMaterial({ color: 0xd4caa8, roughness: 0.88, metalness: 0 });
  const scaenaX   = TX - R_START - 2;
  const sMinY = Math.min(
    terrainH(scaenaX - 2, TZ - 11), terrainH(scaenaX - 2, TZ + 11),
    terrainH(scaenaX + 2, TZ - 11), terrainH(scaenaX + 2, TZ + 11),
    terrainH(scaenaX, TZ),
  );
  const sMaxY = Math.max(
    terrainH(scaenaX, TZ - 11), terrainH(scaenaX, TZ + 11), terrainH(scaenaX, TZ),
  );
  const scaenaH = (sMaxY + 5.5) - (sMinY - SINK);
  const scaena  = new THREE.Mesh(new THREE.BoxGeometry(4, scaenaH, 22), scaenaMat);
  scaena.position.set(scaenaX, (sMinY - SINK) + scaenaH * 0.5, TZ);
  scaena.castShadow = true; scaena.receiveShadow = true;
  scene.add(scaena);
  for (let dz = -10; dz <= 10; dz += 4) {
    addCollider({ x: scaenaX, z: TZ + dz, r: 3.5 });
  }

  // ── Stage platform ────────────────────────────────────────────────────────────
  const stx       = scaenaX + 6;
  const stMinY    = Math.min(
    terrainH(stx - 5, TZ - 5), terrainH(stx - 5, TZ + 5),
    terrainH(stx + 5, TZ - 5), terrainH(stx + 5, TZ + 5),
    terrainH(stx, TZ),
  ) - SINK;
  const stTopY    = baseY + 0.4;
  const stageH    = stTopY - stMinY;
  const stage     = new THREE.Mesh(new THREE.BoxGeometry(12, stageH, 22), scaenaMat);
  stage.position.set(stx, stMinY + stageH * 0.5, TZ);
  stage.castShadow = true; stage.receiveShadow = true;
  scene.add(stage);
}
