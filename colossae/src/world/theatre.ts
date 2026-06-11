import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// Theatre at (224, -48) on hill h≈13
// Cavea on the EAST slope, opening WEST toward the city.
// Sector centered on -X direction (west = -X in three.js +X=east space).

export function buildTheatre(scene: THREE.Scene): void {
  const TX = 224, TZ = -48;
  const baseY = terrainH(TX, TZ);

  const stoneMat  = new THREE.MeshLambertMaterial({ color: 0x9a8c78 });
  const seatMat   = new THREE.MeshLambertMaterial({ color: 0xb0a488 });
  const scaenaMat = new THREE.MeshLambertMaterial({ color: 0xc8b898 });

  // Cavea: 8 stepped tiers, each a partial cylinder arc
  // Opening toward -X (west): theta start = Math.PI * 0.5, theta length = Math.PI
  // This gives a semicircle opening in the -X direction
  const TIERS = 8;
  const TIER_H   = 0.9;
  const TIER_W   = 2.2; // radial depth per step
  const R_START  = 12;  // inner radius (orchestra edge)
  const THETA_START = Math.PI * 0.5;   // start angle (south)
  const THETA_LEN   = Math.PI;         // half-circle arc

  for (let t = 0; t < TIERS; t++) {
    const r0 = R_START + t * TIER_W;
    const r1 = r0 + TIER_W;
    const tierY = baseY + t * TIER_H;

    // Use RingGeometry rotated flat for each tier platform
    const geo = new THREE.RingGeometry(r0, r1, 24, 1, THETA_START, THETA_LEN);
    geo.rotateX(-Math.PI / 2);
    const platform = new THREE.Mesh(geo, seatMat);
    platform.position.set(TX, tierY, TZ);
    platform.receiveShadow = true;
    scene.add(platform);

    // Riser (vertical face)
    const riserGeo = new THREE.CylinderGeometry(r0, r0, TIER_H, 24, 1, true,
      THETA_START, THETA_LEN);
    const riser = new THREE.Mesh(riserGeo, stoneMat);
    riser.position.set(TX, tierY - TIER_H / 2, TZ);
    riser.castShadow = true; riser.receiveShadow = true;
    scene.add(riser);
  }

  // Orchestra floor (half-circle, level)
  const orchGeo = new THREE.CircleGeometry(R_START, 24, THETA_START, THETA_LEN);
  orchGeo.rotateX(-Math.PI / 2);
  const orchMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const orch = new THREE.Mesh(orchGeo, orchMat);
  orch.position.set(TX, baseY + 0.05, TZ);
  orch.receiveShadow = true;
  scene.add(orch);

  // Scaenae (low back wall on the EAST side — opposite the opening)
  // The cavea opens west, so the scaena is on the east (+X) of center
  const scaenaX = TX + R_START + 3;
  const scaena = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 22), scaenaMat);
  scaena.position.set(scaenaX, baseY + 3, TZ);
  scaena.castShadow = true; scaena.receiveShadow = true;
  scene.add(scaena);
  addCollider({ x: scaenaX, z: TZ, r: 4 });

  // Outer retaining wall (curved back of cavea)
  const outerR = R_START + TIERS * TIER_W + 1;
  const retainGeo = new THREE.CylinderGeometry(outerR, outerR, 2, 24, 1, true,
    THETA_START, THETA_LEN);
  const retain = new THREE.Mesh(retainGeo, stoneMat);
  retain.position.set(TX, baseY + TIERS * TIER_H - 1, TZ);
  retain.castShadow = true; retain.receiveShadow = true;
  scene.add(retain);

  addCollider({ x: TX, z: TZ, r: 6 }); // loose collider around orchestra center
}
