import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// ─── Shared materials ─────────────────────────────────────────────────────────
const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.88, metalness: 0 });
const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.88, metalness: 0 });
const roofMat   = new THREE.MeshStandardMaterial({ color: 0xa04830, roughness: 0.88, metalness: 0 });
const columnMat = new THREE.MeshStandardMaterial({ color: 0xd4c8a8, roughness: 0.88, metalness: 0 });
const woodMat   = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.88, metalness: 0 });
const redDyeMat = new THREE.MeshStandardMaterial({ color: 0x8a1e1e, roughness: 0.88, metalness: 0 });

// ─── Per-building colour jitter (±8% brightness) ──────────────────────────────
function jitterMat(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const m = base.clone();
  const f = 1 + (Math.random() - 0.5) * 0.16; // ±8%
  m.color.multiplyScalar(f);
  return m;
}

// ─── Sample terrain at all 4 footprint corners, return minimum ────────────────
function footprintMinY(x: number, z: number, w: number, d: number): number {
  const hw = w / 2, hd = d / 2;
  return Math.min(
    terrainH(x - hw, z - hd),
    terrainH(x + hw, z - hd),
    terrainH(x - hw, z + hd),
    terrainH(x + hw, z + hd),
  );
}

// ─── Helper: place a box on the terrain surface ───────────────────────────────
function box(
  scene: THREE.Scene,
  mat: THREE.Material,
  x: number, z: number,
  w: number, h: number, d: number,
  yOff = 0,
  shadow = true,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  const ty = footprintMinY(x, z, w, d);
  mesh.position.set(x, ty + h / 2 + yOff, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
  return mesh;
}

// ─── Column (cylinder) ────────────────────────────────────────────────────────
function column(
  scene: THREE.Scene,
  x: number, z: number,
  r = 0.45, h = 4.5, yOff = 0,
  mat = columnMat,
) {
  const geo = new THREE.CylinderGeometry(r, r * 1.08, h, 10);
  const mesh = new THREE.Mesh(geo, mat);
  const ty = terrainH(x, z);
  mesh.position.set(x, ty + h / 2 + yOff, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  addCollider({ x, z, r: r + 0.3 });
  return mesh;
}

// ─── Simple house (box + pyramidal roof) ─────────────────────────────────────
function house(
  scene: THREE.Scene,
  x: number, z: number,
  w = 8, d = 8, wallH = 3.5,
  rot = 0,
  collide = true,
) {
  const ty = footprintMinY(x, z, w, d);
  const wallsMat = jitterMat(stuccoMat);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallsMat);
  walls.position.set(x, ty + wallH / 2, z);
  walls.rotation.y = rot;
  walls.castShadow = true; walls.receiveShadow = true;
  scene.add(walls);

  const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, wallH * 0.55, 4);
  const roof = new THREE.Mesh(roofGeo, jitterMat(roofMat));
  roof.position.set(x, ty + wallH + wallH * 0.2, z);
  roof.rotation.y = Math.PI / 4 + rot;
  roof.castShadow = true; roof.receiveShadow = true;
  scene.add(roof);

  if (collide) addCollider({ x, z, r: Math.max(w, d) * 0.6 });
}

// ─── Acropolis wall ring ──────────────────────────────────────────────────────
function buildAcropolisWall(scene: THREE.Scene): void {
  const R = 46;
  const CX = 0, CZ = -8;
  const WALL_H = 3.2;
  const WALL_W = 1.8;
  const SEGS = 28;
  const GAP_ANGLE = 0.22; // east gate gap in radians

  for (let i = 0; i < SEGS; i++) {
    const t0 = (i / SEGS) * Math.PI * 2;
    const t1 = ((i + 1) / SEGS) * Math.PI * 2;
    const tMid = (t0 + t1) * 0.5;

    // East gate gap (toward +X direction, angle ~0)
    if (Math.abs(tMid) < GAP_ANGLE || Math.abs(tMid - Math.PI * 2) < GAP_ANGLE) continue;

    const wx = CX + R * Math.cos(tMid);
    const wz = CZ + R * Math.sin(tMid);
    const segLen = R * (Math.PI * 2 / SEGS) + 0.5;

    const angle = tMid + Math.PI / 2;
    const ty = terrainH(wx, wz);
    const geo = new THREE.BoxGeometry(segLen, WALL_H, WALL_W);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(wx, ty + WALL_H / 2, wz);
    mesh.rotation.y = -angle;
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider({ x: wx, z: wz, r: WALL_W + 0.3 });
  }

  // 4–6 houses inside the acropolis
  const acropolisHouses: [number, number, number, number][] = [
    [-15, -5,  7, 0.4],
    [ 10,-18,  8, 0],
    [-30,-12,  6, 0.8],
    [ 20,  5,  7, -0.3],
    [-10, 10,  6, 1.1],
  ];
  for (const [hx, hz, hw, rot] of acropolisHouses) {
    house(scene, hx, hz, hw, hw * 0.9, 3, rot, true);
  }
}

// ─── Stone-lined silo pit (west slope) ───────────────────────────────────────
function buildSilo(scene: THREE.Scene): void {
  const SX = -58, SZ = -6;
  const ty = terrainH(SX, SZ);
  const R = 3.2;
  const WALL_H = 1.2;

  // Stone ring
  const SEGS = 14;
  for (let i = 0; i < SEGS; i++) {
    const a = (i / SEGS) * Math.PI * 2;
    const sx = SX + R * Math.cos(a);
    const sz = SZ + R * Math.sin(a);
    const sg = new THREE.BoxGeometry(1.4, WALL_H, 0.8);
    const sm = new THREE.Mesh(sg, stoneMat);
    sm.position.set(sx, ty + WALL_H / 2, sz);
    sm.rotation.y = -a;
    sm.castShadow = true;
    scene.add(sm);
  }

  // Dark pit floor
  const pitGeo = new THREE.CylinderGeometry(R - 0.2, R - 0.2, 0.2, 16);
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x1a1410 });
  const pit = new THREE.Mesh(pitGeo, pitMat);
  pit.position.set(SX, ty - 0.05, SZ);
  scene.add(pit);

  addCollider({ x: SX, z: SZ, r: R + 0.5 });
}

// ─── Cardo columns ────────────────────────────────────────────────────────────
function buildCardo(scene: THREE.Scene): void {
  const CX = 92;
  const Z_START = -88, Z_END = 4;
  const SPACING = 12;

  for (let z = Z_START; z <= Z_END; z += SPACING) {
    column(scene, CX - 6, z);
    column(scene, CX + 6, z);
  }
}

// ─── Agora ────────────────────────────────────────────────────────────────────
function buildAgora(scene: THREE.Scene): void {
  const AX = 120, AZ = -44;
  const ty = terrainH(AX, AZ);

  // Paved plaza floor
  const plazaGeo = new THREE.CylinderGeometry(17, 17, 0.25, 20);
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xb0a080 });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(AX, ty + 0.1, AZ);
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Stalls around the agora
  const stallPositions: [number, number, number][] = [
    [AX - 10, AZ - 10, 0.3],
    [AX + 10, AZ - 10, -0.3],
    [AX - 10, AZ + 10, 0.8],
    [AX + 10, AZ + 10, -0.8],
    [AX,      AZ - 14, 0],
    [AX,      AZ + 14, Math.PI],
    [AX - 14, AZ,      Math.PI / 2],
  ];

  for (const [sx, sz, rot] of stallPositions) {
    const sty = terrainH(sx, sz);
    // Stall frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 3.5), woodMat);
    frame.position.set(sx, sty + 1.4, sz);
    frame.rotation.y = rot;
    frame.castShadow = true; scene.add(frame);

    // Awning (flat plane tilted)
    const awningMat = new THREE.MeshStandardMaterial({
      color: (Math.random() > 0.5 ? 0xaa3322 : 0x886633),
      side: THREE.DoubleSide,
    });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3), awningMat);
    awning.rotation.x = -Math.PI / 2;
    awning.rotation.z = rot;
    awning.position.set(sx, sty + 2.85, sz);
    scene.add(awning);

    addCollider({ x: sx, z: sz, r: 2.8 });
  }

  // Wool bales (red + white)
  const balePositions: [number, number, number][] = [
    [AX + 3,  AZ + 2,  0xa04030],
    [AX - 3,  AZ - 3,  0xe8e0d0],
    [AX + 5,  AZ - 5,  0x8a2020],
    [AX - 5,  AZ + 4,  0xe0d8c0],
    [AX + 2,  AZ - 6,  0xc03028],
  ];
  const baleMat0 = new THREE.MeshStandardMaterial({ color: 0 });
  for (const [bx, bz, col] of balePositions) {
    const bMat = baleMat0.clone();
    bMat.color.set(col);
    const bg = new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12);
    const bm = new THREE.Mesh(bg, bMat);
    const bty = terrainH(bx, bz);
    bm.position.set(bx, bty + 0.7, bz);
    bm.rotation.z = Math.PI / 2;
    bm.castShadow = true;
    scene.add(bm);
  }
}

// ─── Baths ────────────────────────────────────────────────────────────────────
function buildBaths(scene: THREE.Scene): void {
  const BX = 156, BZ = -18;
  box(scene, stoneMat, BX, BZ, 20, 6, 14);
  addCollider({ x: BX, z: BZ, r: 11 });

  // Half-dome
  const domeGeo = new THREE.SphereGeometry(7, 14, 8, 0, Math.PI);
  const dome = new THREE.Mesh(domeGeo, stoneMat);
  dome.position.set(BX, terrainH(BX, BZ) + 6, BZ - 3);
  dome.rotation.y = Math.PI;
  dome.castShadow = true;
  scene.add(dome);
}

// ─── Tyche Protogeneia sanctuary ─────────────────────────────────────────────
function buildTemple(scene: THREE.Scene): void {
  const TX = 70, TZ = -10;
  const ty = terrainH(TX, TZ);

  // Podium
  const podium = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 12), stoneMat);
  podium.position.set(TX, ty + 0.6, TZ);
  podium.castShadow = true; podium.receiveShadow = true;
  scene.add(podium);

  // 4×2 columns
  for (let col = 0; col < 4; col++) {
    for (const row of [-1, 1]) {
      column(scene, TX - 6 + col * 4, TZ + row * 4, 0.4, 5.5, 1.2);
    }
  }

  // Entablature
  const entab = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), stoneMat);
  entab.position.set(TX, ty + 1.2 + 5.5 + 0.4, TZ);
  entab.castShadow = true; scene.add(entab);

  // Pediment (triangular)
  const pedGeo = new THREE.CylinderGeometry(0, 10, 2.5, 3);
  const ped = new THREE.Mesh(pedGeo, stoneMat);
  ped.position.set(TX, ty + 1.2 + 5.5 + 0.8 + 1.25, TZ);
  ped.rotation.y = Math.PI / 6;
  ped.scale.set(1, 1, 0.5);
  ped.castShadow = true;
  scene.add(ped);

  // Cult statue (simplified humanoid)
  const statMat = new THREE.MeshStandardMaterial({ color: 0xd0c8a8 });
  const statBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.8, 8), statMat);
  statBody.position.set(TX, ty + 1.2 + 1.4, TZ);
  statBody.castShadow = true;
  scene.add(statBody);
  const statHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), statMat);
  statHead.position.set(TX, ty + 1.2 + 2.8 + 0.3, TZ);
  scene.add(statHead);

  addCollider({ x: TX, z: TZ, r: 10 });
}

// ─── Lower city houses (~25) ──────────────────────────────────────────────────
function buildLowerCity(scene: THREE.Scene): void {
  const houseGrid: [number, number, number, number, number][] = [
    // x, z, w, d, rot
    [60,  -80, 8, 7, 0.1],
    [75,  -70, 9, 8, -0.1],
    [88,  -60, 7, 7, 0.2],
    [70,  -55, 8, 6, 0],
    [100, -80, 9, 8, 0.15],
    [115, -70, 7, 7, -0.2],
    [105, -55, 8, 7, 0.1],
    [130, -78, 9, 8, 0],
    [145, -65, 7, 7, 0.3],
    [160, -72, 8, 7, -0.1],
    [170, -58, 7, 6, 0.2],
    [175, -80, 8, 8, 0],
    [185, -68, 7, 7, -0.15],
    [65,  -35, 8, 7, 0.1],
    [80,  -25, 7, 6, -0.1],
    [95,  -40, 8, 7, 0.2],
    [110, -30, 9, 8, 0],
    [125, -20, 7, 7, -0.2],
    [140, -35, 8, 7, 0.15],
    [155, -25, 7, 6, 0.1],
    [165, -40, 8, 7, -0.1],
    [180, -28, 7, 7, 0.2],
    [188, -18, 8, 6, 0],
    [62,  -15, 7, 7, -0.15],
    [78,  -8,  8, 7, 0.1],
  ];

  for (const [hx, hz, hw, hd, rot] of houseGrid) {
    house(scene, hx, hz, hw, hd, 3.5, rot, true);
  }
}

// ─── House of Philemon (larger peristyle) ─────────────────────────────────────
function buildPhilemonHouse(scene: THREE.Scene): void {
  const PX = 141, PZ = -86;
  const ty = terrainH(PX, PZ);

  // Main building — larger
  const walls = new THREE.Mesh(new THREE.BoxGeometry(18, 4.5, 16), stuccoMat);
  walls.position.set(PX, ty + 2.25, PZ);
  walls.castShadow = true; walls.receiveShadow = true;
  scene.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(13, 3.5, 4), roofMat);
  roof.position.set(PX, ty + 4.5 + 1.5, PZ);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  // Porch columns (south face)
  for (let i = 0; i < 4; i++) {
    column(scene, PX - 6 + i * 4, PZ + 8, 0.4, 5, 0);
  }

  // Peristyle courtyard hint — low inner walls
  const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a8068 });
  const courtGeo = new THREE.BoxGeometry(10, 0.3, 10);
  const court = new THREE.Mesh(courtGeo, courtMat);
  court.position.set(PX, ty + 0.15, PZ);
  scene.add(court);

  addCollider({ x: PX, z: PZ, r: 10 });
}

// ─── Dye works (riverbank) ────────────────────────────────────────────────────
function buildDyeWorks(scene: THREE.Scene): void {
  const DX = 53, DZ = -104;
  const ty = terrainH(DX, DZ);

  // Dye vats (low cylinders)
  const vatPositions: [number, number][] = [
    [44, -104], [50, -104], [56, -104], [62, -104],
    [47, -109], [53, -109], [59, -109],
  ];
  for (const [vx, vz] of vatPositions) {
    const vty = terrainH(vx, vz);
    const vatGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.5, 12);
    const vatMesh = new THREE.Mesh(vatGeo, stoneMat);
    vatMesh.position.set(vx, vty + 0.75, vz);
    scene.add(vatMesh);

    const dyeGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.25, 12);
    const dyeMesh = new THREE.Mesh(dyeGeo, redDyeMat);
    dyeMesh.position.set(vx, vty + 1.5 + 0.12, vz);
    scene.add(dyeMesh);

    addCollider({ x: vx, z: vz, r: 2 });
  }

  // Drying racks (horizontal poles with crimson hanks)
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x6a4a28 });
  const hankMat = new THREE.MeshStandardMaterial({ color: 0x8a1820 });
  const rackZOffset = -99;

  for (let i = 0; i < 4; i++) {
    const rx = 44 + i * 5;
    const rty = terrainH(rx, rackZOffset);
    // Upright poles
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 6), rackMat);
    pole.position.set(rx, rty + 2.25, rackZOffset);
    scene.add(pole);

    // Horizontal bar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6), rackMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(rx, rty + 4.0, rackZOffset);
    scene.add(bar);

    // Crimson hanks
    for (let h = 0; h < 3; h++) {
      const hank = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 10), hankMat);
      hank.rotation.x = Math.PI / 2;
      hank.position.set(rx - 1.2 + h * 1.2, rty + 3.7, rackZOffset + 0.2);
      scene.add(hank);
    }
  }

  void ty; void DX;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function buildCity(scene: THREE.Scene): void {
  buildAcropolisWall(scene);
  buildSilo(scene);
  buildCardo(scene);
  buildAgora(scene);
  buildBaths(scene);
  buildTemple(scene);
  buildLowerCity(scene);
  buildPhilemonHouse(scene);
  buildDyeWorks(scene);
}
