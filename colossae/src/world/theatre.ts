import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// Theatre at (224, -48) on hill h≈13
// Cavea opens WEST toward the city.

export function buildTheatre(scene: THREE.Scene): void {
  const TX = 224, TZ = -48;
  const baseY = terrainH(TX, TZ);
  const SINK  = 8.0;
  const bottom = baseY - SINK;

  const TIERS      = 8;
  const TIER_H     = 0.9;
  const TIER_W     = 2.2;
  const R_START    = 12;
  const THETA_START = -Math.PI * 0.5;
  const THETA_LEN   = Math.PI;
  const SEG        = 32;

  // Materials — light limestone against the sandy terrain
  const baseMat   = new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.92, metalness: 0 });
  const seatMat   = new THREE.MeshStandardMaterial({ color: 0xe0d4b0, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  // BackSide: riser faces inward so they're visible from the orchestra / audience side
  const riserMat  = new THREE.MeshStandardMaterial({ color: 0xb4a888, roughness: 0.90, metalness: 0, side: THREE.BackSide });
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0x9a8c7a, roughness: 0.90, metalness: 0, side: THREE.DoubleSide });
  const orchMat   = new THREE.MeshStandardMaterial({ color: 0xd4c8a0, roughness: 0.88, metalness: 0 });
  const scaenaMat = new THREE.MeshStandardMaterial({ color: 0xd0c8a8, roughness: 0.88, metalness: 0 });

  // ── Solid grounded base ──────────────────────────────────────────────────────
  // One large half-cylinder from `bottom` (8 m underground) to orchestra level.
  // This mass sits firmly in the hillside — no floating.
  const fullR     = R_START + TIERS * TIER_W + 2;
  const baseTotalH = baseY + 0.1 - bottom;
  const baseGeo   = new THREE.CylinderGeometry(fullR, fullR, baseTotalH, SEG, 1, false, THETA_START, THETA_LEN);
  const baseMesh  = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(TX, bottom + baseTotalH * 0.5, TZ);
  baseMesh.receiveShadow = true;
  scene.add(baseMesh);

  // ── Orchestra floor ──────────────────────────────────────────────────────────
  const orchGeo = new THREE.CircleGeometry(R_START, SEG, THETA_START, THETA_LEN);
  orchGeo.rotateX(-Math.PI / 2);
  const orch = new THREE.Mesh(orchGeo, orchMat);
  orch.position.set(TX, baseY + 0.06, TZ);
  orch.receiveShadow = true;
  scene.add(orch);

  // ── Seating tiers ────────────────────────────────────────────────────────────
  // Each tier = flat TREAD ring (faces up, visible from front) +
  //             RISER cylinder (BackSide = faces inward, visible from audience side)
  for (let t = 0; t < TIERS; t++) {
    const rInner = R_START + t * TIER_W;
    const rOuter = R_START + (t + 1) * TIER_W;
    const tierY  = baseY + t * TIER_H;

    // Tread — flat ring, horizontal
    const treadGeo = new THREE.RingGeometry(rInner, rOuter, SEG, 1, THETA_START, THETA_LEN);
    treadGeo.rotateX(-Math.PI / 2);
    const tread = new THREE.Mesh(treadGeo, seatMat);
    tread.position.set(TX, tierY + 0.05, TZ);
    tread.receiveShadow = true;
    scene.add(tread);

    // Riser — vertical cylinder, BackSide so it faces the audience
    const riserH = TIER_H + 0.05;
    const riserGeo = new THREE.CylinderGeometry(rInner, rInner, riserH, SEG, 1, true, THETA_START, THETA_LEN);
    const riser = new THREE.Mesh(riserGeo, riserMat);
    riser.position.set(TX, tierY + riserH * 0.5, TZ);
    riser.castShadow = true;
    scene.add(riser);
  }

  // ── Outer retaining wall ─────────────────────────────────────────────────────
  const outerR   = R_START + (TIERS + 1) * TIER_W;
  const wallTopY = baseY + TIERS * TIER_H + 2.5;
  const wallH    = wallTopY - bottom;
  const retainGeo = new THREE.CylinderGeometry(outerR, outerR, wallH, SEG, 1, true, THETA_START, THETA_LEN);
  const retain   = new THREE.Mesh(retainGeo, wallMat);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.castShadow = true; retain.receiveShadow = true;
  scene.add(retain);

  // ── Outer wall colliders (arc of circles) ────────────────────────────────────
  const COL_R = outerR + 0.5;
  for (let i = 0; i <= 24; i++) {
    const a = THETA_START + (i / 24) * THETA_LEN;
    addCollider({ x: TX + COL_R * Math.cos(a), z: TZ + COL_R * Math.sin(a), r: 2.0 });
  }

  // ── Scaenae frons ────────────────────────────────────────────────────────────
  const scaenaX = TX - R_START - 2;
  const scaenaMinY = Math.min(
    terrainH(scaenaX - 2, TZ - 11), terrainH(scaenaX - 2, TZ + 11),
    terrainH(scaenaX + 2, TZ - 11), terrainH(scaenaX + 2, TZ + 11),
    terrainH(scaenaX, TZ),
  );
  const scaenaBottom = scaenaMinY - SINK;
  const scaenaTop    = Math.max(
    terrainH(scaenaX, TZ - 11), terrainH(scaenaX, TZ + 11), terrainH(scaenaX, TZ),
  ) + 6.0;
  const scaenaH = scaenaTop - scaenaBottom;
  const scaena  = new THREE.Mesh(new THREE.BoxGeometry(4, scaenaH, 22), scaenaMat);
  scaena.position.set(scaenaX, scaenaBottom + scaenaH * 0.5, TZ);
  scaena.castShadow = true; scaena.receiveShadow = true;
  scene.add(scaena);
  for (let dz = -10; dz <= 10; dz += 4) {
    addCollider({ x: scaenaX, z: TZ + dz, r: 3.5 });
  }

  // ── Stage platform ────────────────────────────────────────────────────────────
  const stageMinY  = Math.min(terrainH(scaenaX + 6, TZ - 5), terrainH(scaenaX + 6, TZ + 5)) - SINK;
  const stageTopY  = baseY + 0.3;
  const stageH     = stageTopY - stageMinY;
  const stage      = new THREE.Mesh(new THREE.BoxGeometry(12, stageH, 22), scaenaMat);
  stage.position.set(scaenaX + 6, stageMinY + stageH * 0.5, TZ);
  stage.castShadow = true; stage.receiveShadow = true;
  scene.add(stage);
}
