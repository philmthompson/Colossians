import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// Theatre at (224, -48). Cavea opens WEST toward the city.

function c3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

function smat(name: string, hex: number, scene: Scene, doubleSide = false): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = c3(hex);
  m.specularColor = Color3.Black();
  if (doubleSide) m.backFaceCulling = false;
  return m;
}

export function buildTheatre(scene: Scene): void {
  const TX = 224, TZ = -48;
  const baseY = terrainH(TX, TZ);
  const SINK   = 8.0;
  const bottom = baseY - SINK;

  const TIERS       = 8;
  const TIER_H      = 0.9;
  const TIER_W      = 2.2;
  const R_START     = 12;
  const SEG         = 36;
  // Half-cylinder (π arc) rotated to open WEST.
  // Babylon arc=0.5 goes from 0→π (east→north→west). Rotate -π/2 so it covers south→east→north.
  // Actually: arc starts at +X. We rotate Y by -π/2 so the arc covers -Z→+X→+Z (north→east→south).
  // That matches Three.js THETA_START=-π/2, THETA_LEN=π (east-facing arc, opens west).
  const ARC_ROT_Y = -Math.PI / 2;

  const lightM = smat('ls', 0xddd4b4, scene, true);
  const darkM  = smat('ds', 0xa89870, scene, true);
  const baseM  = smat('bs', 0xc8bc96, scene, true);

  for (let t = TIERS; t >= 0; t--) {
    const r      = R_START + t * TIER_W;
    const topY   = baseY + t * TIER_H;
    const totalH = topY - bottom;
    const tierMat = t === 0 ? baseM : (t % 2 === 0 ? lightM : darkM);

    const cyl = MeshBuilder.CreateCylinder(`tier-${t}`, {
      diameterTop:    r * 2,
      diameterBottom: r * 2,
      height:         totalH,
      tessellation:   SEG,
      arc:            0.5,
      cap:            Mesh.CAP_ALL,
      sideOrientation: Mesh.DOUBLESIDE,
    }, scene);
    cyl.position.set(TX, bottom + totalH * 0.5, TZ);
    cyl.rotation.y = ARC_ROT_Y;
    cyl.material = tierMat;
  }

  // Orchestra paving
  const orchM = smat('orch', 0xe8e0c0, scene);
  const orch = MeshBuilder.CreateDisc('orch', { radius: R_START, tessellation: SEG, arc: 0.5 }, scene);
  orch.rotation.x = -Math.PI / 2;
  orch.rotation.z = ARC_ROT_Y;
  orch.position.set(TX, baseY + 0.07, TZ);
  orch.material = orchM;

  // Outer retaining wall
  const outerR   = R_START + (TIERS + 1) * TIER_W;
  const wallTopY = baseY + TIERS * TIER_H + 1.5;
  const wallH    = wallTopY - bottom;
  const wallM = smat('retain', 0x9a8c78, scene, true);

  const retain = MeshBuilder.CreateCylinder('retain', {
    diameterTop:    outerR * 2,
    diameterBottom: outerR * 2,
    height:         wallH,
    tessellation:   SEG,
    arc:            0.5,
    cap:            Mesh.NO_CAP,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.rotation.y = ARC_ROT_Y;
  retain.material = wallM;

  // End-caps at the two straight arc ends
  for (const side of [-1, 1]) {
    // Arc ends at angles ARC_ROT_Y (start) and ARC_ROT_Y + π (end) from +X
    const a   = ARC_ROT_Y + (side > 0 ? Math.PI : 0);
    const ex  = TX + outerR * 0.5 * Math.cos(a);
    const ez  = TZ + outerR * 0.5 * Math.sin(a);
    const cap = MeshBuilder.CreateBox('cap', { width: outerR, height: wallH, depth: 1.8 }, scene);
    cap.position.set(ex, bottom + wallH * 0.5, ez);
    cap.rotation.y = -a;
    cap.material = wallM;
  }

  // Arc colliders along outer wall
  const colR = outerR + 0.5;
  for (let i = 0; i <= 24; i++) {
    // match Three.js arc: THETA_START=-π/2, going +π
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    addCollider({ x: TX + colR * Math.cos(a), z: TZ + colR * Math.sin(a), r: 2.0 });
  }

  // Scaenae frons
  const scaenaM  = smat('scaena', 0xd4caa8, scene);
  const scaenaX  = TX - R_START - 2;
  const sMinY = Math.min(
    terrainH(scaenaX - 2, TZ - 11), terrainH(scaenaX - 2, TZ + 11),
    terrainH(scaenaX + 2, TZ - 11), terrainH(scaenaX + 2, TZ + 11),
    terrainH(scaenaX, TZ),
  );
  const sMaxY = Math.max(
    terrainH(scaenaX, TZ - 11), terrainH(scaenaX, TZ + 11), terrainH(scaenaX, TZ),
  );
  const scaenaH = (sMaxY + 5.5) - (sMinY - SINK);
  const scaena  = MeshBuilder.CreateBox('scaena', { width: 4, height: scaenaH, depth: 22 }, scene);
  scaena.position.set(scaenaX, (sMinY - SINK) + scaenaH * 0.5, TZ);
  scaena.material = scaenaM;
  for (let dz = -10; dz <= 10; dz += 4) addCollider({ x: scaenaX, z: TZ + dz, r: 3.5 });

  // Stage platform
  const stx    = scaenaX + 6;
  const stMinY = Math.min(
    terrainH(stx - 5, TZ - 5), terrainH(stx - 5, TZ + 5),
    terrainH(stx + 5, TZ - 5), terrainH(stx + 5, TZ + 5),
    terrainH(stx, TZ),
  ) - SINK;
  const stTopY = baseY + 0.4, stageH = stTopY - stMinY;
  const stage  = MeshBuilder.CreateBox('stage', { width: 12, height: stageH, depth: 22 }, scene);
  stage.position.set(stx, stMinY + stageH * 0.5, TZ);
  stage.material = scaenaM;
}
