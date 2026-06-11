import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// Theatre at (224, -48) on hill h≈13
// Cavea on the EAST slope, opening WEST toward the city.

export function buildTheatre(scene: THREE.Scene): void {
  const TX = 224, TZ = -48;
  const baseY = terrainH(TX, TZ);

  // Sink deeply enough to stay grounded on the hill slope
  const SINK = 8.0;
  const bottom = baseY - SINK;

  const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.9,  metalness: 0 });
  const seatMat   = new THREE.MeshStandardMaterial({ color: 0xb8ac90, roughness: 0.88, metalness: 0 });
  const orchMat   = new THREE.MeshStandardMaterial({ color: 0xc8b888, roughness: 0.88, metalness: 0 });
  const scaenaMat = new THREE.MeshStandardMaterial({ color: 0xd0c4a0, roughness: 0.88, metalness: 0 });

  const TIERS = 8;
  const TIER_H   = 0.9;
  const TIER_W   = 2.2;
  const R_START  = 12;
  const THETA_START = -Math.PI * 0.5;
  const THETA_LEN   = Math.PI;
  const RADIAL_SEGS = 32;

  // ── Wedding-cake approach ────────────────────────────────────────────────────
  // Each layer is a SOLID half-cylinder extending from `bottom` (underground)
  // to its tier's top. Layers go from outermost (tallest) down to orchestra.
  // Because every layer shares the same buried base, nothing can float.
  //
  // Layer count = TIERS + 1 (layers 0..TIERS where 0 = orchestra disc).
  // Layer t has:
  //   radius = R_START + t * TIER_W
  //   topY   = baseY   + t * TIER_H
  //
  // The visible "seat" of seating-tier t is the top cap of layer t.
  // The visible "riser" is the outer curved surface of layer t+1 above layer t.

  for (let t = TIERS; t >= 0; t--) {
    const r   = R_START + t * TIER_W;
    const topY = baseY + t * TIER_H;
    const totalH = topY - bottom;
    const mat = t === 0 ? orchMat : (t % 2 === 0 ? seatMat : stoneMat);

    const geo = new THREE.CylinderGeometry(r, r, totalH, RADIAL_SEGS, 1, false, THETA_START, THETA_LEN);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(TX, bottom + totalH * 0.5, TZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ── Outer retaining wall ─────────────────────────────────────────────────────
  // Curved stone wall behind the top tier, rising above the hillside.
  const outerR  = R_START + (TIERS + 1) * TIER_W;
  const wallTopY = baseY + TIERS * TIER_H + 2.5;
  const wallH    = wallTopY - bottom;
  const retainGeo = new THREE.CylinderGeometry(outerR, outerR, wallH, RADIAL_SEGS, 1, true, THETA_START, THETA_LEN);
  const retain = new THREE.Mesh(retainGeo, stoneMat);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.castShadow = true; retain.receiveShadow = true;
  scene.add(retain);

  // ── Scaenae frons ────────────────────────────────────────────────────────────
  // Stage building on the WEST side (in front of the opening).
  const scaenaX  = TX - R_START - 2;
  const scaenaMinY = Math.min(
    terrainH(scaenaX - 2, TZ - 11),
    terrainH(scaenaX - 2, TZ + 11),
    terrainH(scaenaX + 2, TZ - 11),
    terrainH(scaenaX + 2, TZ + 11),
    terrainH(scaenaX, TZ),
  );
  const scaenaBottom = scaenaMinY - SINK;
  const scaenaTop    = Math.max(
    terrainH(scaenaX, TZ - 11),
    terrainH(scaenaX, TZ + 11),
    terrainH(scaenaX, TZ),
  ) + 6.0;
  const scaenaH = scaenaTop - scaenaBottom;
  const scaena = new THREE.Mesh(new THREE.BoxGeometry(4, scaenaH, 22), scaenaMat);
  scaena.position.set(scaenaX, scaenaBottom + scaenaH * 0.5, TZ);
  scaena.castShadow = true; scaena.receiveShadow = true;
  scene.add(scaena);
  addCollider({ x: scaenaX, z: TZ, r: 4 });

  // ── Stage platform ────────────────────────────────────────────────────────────
  const stageY = baseY + 0.3;
  const stageBottom = Math.min(terrainH(scaenaX + 6, TZ - 5), terrainH(scaenaX + 6, TZ + 5)) - SINK;
  const stageH = stageY - stageBottom;
  const stage = new THREE.Mesh(new THREE.BoxGeometry(12, stageH, 22), scaenaMat);
  stage.position.set(scaenaX + 6, stageBottom + stageH * 0.5, TZ);
  stage.castShadow = true; stage.receiveShadow = true;
  scene.add(stage);
}
