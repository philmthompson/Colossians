import * as THREE from 'three';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// ─── Shared materials ─────────────────────────────────────────────────────────
const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.9,  metalness: 0 });
const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.92, metalness: 0 });
const roofMat   = new THREE.MeshStandardMaterial({ color: 0xa04830, roughness: 0.88, metalness: 0 });
const columnMat = new THREE.MeshStandardMaterial({ color: 0xd4c8a8, roughness: 0.88, metalness: 0 });
const woodMat   = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.92, metalness: 0 });
const redDyeMat = new THREE.MeshStandardMaterial({ color: 0x8a1e1e, roughness: 0.88, metalness: 0 });

function jitterMat(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const m = base.clone();
  m.color.multiplyScalar(1 + (Math.random() - 0.5) * 0.16);
  return m;
}

// ─── Terrain sampling helpers ─────────────────────────────────────────────────
// 9-point grid: 4 corners + 4 edge midpoints + center
function sampleFootprint(cx: number, cz: number, w: number, d: number): number[] {
  const hw = w * 0.5, hd = d * 0.5;
  return [
    terrainH(cx - hw, cz - hd),
    terrainH(cx,      cz - hd),
    terrainH(cx + hw, cz - hd),
    terrainH(cx - hw, cz),
    terrainH(cx,      cz),
    terrainH(cx + hw, cz),
    terrainH(cx - hw, cz + hd),
    terrainH(cx,      cz + hd),
    terrainH(cx + hw, cz + hd),
  ];
}

function footprintMinY(cx: number, cz: number, w: number, d: number): number {
  return Math.min(...sampleFootprint(cx, cz, w, d));
}

function footprintMaxY(cx: number, cz: number, w: number, d: number): number {
  return Math.max(...sampleFootprint(cx, cz, w, d));
}

// ─── Core grounded box builder ────────────────────────────────────────────────
// bottom = minY - SINK  (always buried into ground on the downhill side)
// top    = maxY + h     (always clears the ground on the uphill side)
// This guarantees no gap and no floating on any slope.
const SINK = 5.0;

function groundedBox(
  scene: THREE.Scene,
  mat: THREE.Material,
  cx: number, cz: number,
  w: number, h: number, d: number,
  yOff = 0,
  rot  = 0,
  shadow = true,
): THREE.Mesh {
  const minY   = footprintMinY(cx, cz, w, d);
  const maxY   = footprintMaxY(cx, cz, w, d);
  const bottom = minY - SINK;
  const top    = maxY + h + yOff;
  const totalH = top - bottom;

  const geo  = new THREE.BoxGeometry(w, totalH, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, bottom + totalH * 0.5, cz);
  mesh.rotation.y = rot;
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
  return mesh;
}

// ─── Column ───────────────────────────────────────────────────────────────────
function column(
  scene: THREE.Scene,
  x: number, z: number,
  r = 0.45, h = 4.5, yOff = 0,
  mat = columnMat,
): void {
  // Sample a small footprint around the column base
  const minY = footprintMinY(x, z, r * 3, r * 3);
  const maxY = footprintMaxY(x, z, r * 3, r * 3);
  const bottom = minY - SINK;
  const top    = maxY + h + yOff;
  const totalH = top - bottom;
  const geo  = new THREE.CylinderGeometry(r, r * 1.08, totalH, 10);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, bottom + totalH * 0.5, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  addCollider({ x, z, r: r + 0.3 });
}

// ─── House (walls + pyramidal roof) ──────────────────────────────────────────
function house(
  scene: THREE.Scene,
  x: number, z: number,
  w = 8, d = 8, wallH = 3.5,
  rot = 0,
  collide = true,
): void {
  const minY   = footprintMinY(x, z, w, d);
  const maxY   = footprintMaxY(x, z, w, d);
  const bottom = minY - SINK;
  const top    = maxY + wallH;
  const totalH = top - bottom;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d), jitterMat(stuccoMat));
  walls.position.set(x, bottom + totalH * 0.5, z);
  walls.rotation.y = rot;
  walls.castShadow = true; walls.receiveShadow = true;
  scene.add(walls);

  const roofSize = Math.max(w, d) * 0.72;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(roofSize, wallH * 0.55, 4),
    jitterMat(roofMat),
  );
  roof.position.set(x, top + wallH * 0.18, z);
  roof.rotation.y = Math.PI / 4 + rot;
  roof.castShadow = true; roof.receiveShadow = true;
  scene.add(roof);

  if (collide) addCollider({ x, z, r: Math.max(w, d) * 0.6 });
}

// ─── Acropolis wall ring ──────────────────────────────────────────────────────
function buildAcropolisWall(scene: THREE.Scene): void {
  const R  = 46, CX = 0, CZ = -8;
  const WALL_H = 3.2, WALL_W = 1.8;
  const SEGS = 28;
  const GAP  = 0.22;

  for (let i = 0; i < SEGS; i++) {
    const a0   = (i       / SEGS) * Math.PI * 2;
    const a1   = ((i + 1) / SEGS) * Math.PI * 2;
    const aMid = (a0 + a1) * 0.5;

    if (Math.abs(aMid) < GAP || Math.abs(aMid - Math.PI * 2) < GAP) continue;

    const wx = CX + R * Math.cos(aMid);
    const wz = CZ + R * Math.sin(aMid);

    // Sample terrain at both arc endpoints, midpoint, and inward/outward points
    const pts = [
      terrainH(CX + R * Math.cos(a0), CZ + R * Math.sin(a0)),
      terrainH(CX + R * Math.cos(a1), CZ + R * Math.sin(a1)),
      terrainH(wx, wz),
      terrainH(CX + (R - WALL_W) * Math.cos(aMid), CZ + (R - WALL_W) * Math.sin(aMid)),
      terrainH(CX + (R + WALL_W) * Math.cos(aMid), CZ + (R + WALL_W) * Math.sin(aMid)),
    ];
    const minY = Math.min(...pts) - SINK;
    const maxY = Math.max(...pts);
    const top    = maxY + WALL_H;
    const totalH = top - minY;
    const segLen  = R * (Math.PI * 2 / SEGS) + 0.5;

    const geo  = new THREE.BoxGeometry(segLen, totalH, WALL_W);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(wx, minY + totalH * 0.5, wz);
    mesh.rotation.y = -(aMid + Math.PI / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider({ x: wx, z: wz, r: WALL_W + 0.3 });
  }

  // Houses inside acropolis
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

// ─── Stone silo pit ───────────────────────────────────────────────────────────
function buildSilo(scene: THREE.Scene): void {
  const SX = -58, SZ = -6;
  const ty  = terrainH(SX, SZ);
  const R   = 3.2, WALL_H = 1.4;

  for (let i = 0; i < 14; i++) {
    const a  = (i / 14) * Math.PI * 2;
    const sx = SX + R * Math.cos(a), sz = SZ + R * Math.sin(a);
    const sty = terrainH(sx, sz);
    const geo  = new THREE.BoxGeometry(1.4, WALL_H + SINK, 0.9);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(sx, sty - SINK * 0.5 + WALL_H * 0.5, sz);
    mesh.rotation.y = -a;
    mesh.castShadow = true;
    scene.add(mesh);
  }

  const pitMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.95, metalness: 0 });
  const pit    = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.2, R - 0.2, 0.2, 16), pitMat);
  pit.position.set(SX, ty - 0.05, SZ);
  scene.add(pit);
  addCollider({ x: SX, z: SZ, r: R + 0.5 });
}

// ─── Cardo columns ────────────────────────────────────────────────────────────
function buildCardo(scene: THREE.Scene): void {
  for (let z = -88; z <= 4; z += 12) {
    column(scene, 86, z);
    column(scene, 98, z);
  }
}

// ─── Agora ────────────────────────────────────────────────────────────────────
function buildAgora(scene: THREE.Scene): void {
  const AX = 120, AZ = -44;

  // Paved plaza — grounded slab so it hugs the terrain on slopes
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.88, metalness: 0 });
  groundedBox(scene, plazaMat, AX, AZ, 34, 0.3, 34);

  // Stalls
  const stallDefs: [number, number, number][] = [
    [AX - 10, AZ - 10, 0.3],
    [AX + 10, AZ - 10, -0.3],
    [AX - 10, AZ + 10, 0.8],
    [AX + 10, AZ + 10, -0.8],
    [AX,      AZ - 14, 0],
    [AX,      AZ + 14, Math.PI],
    [AX - 14, AZ,      Math.PI / 2],
  ];
  for (const [sx, sz, rot] of stallDefs) {
    groundedBox(scene, woodMat, sx, sz, 5, 2.8, 3.5, 0, rot);
    const awningMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0xaa3322 : 0x886633,
      side: THREE.DoubleSide, roughness: 0.9, metalness: 0,
    });
    const maxY = footprintMaxY(sx, sz, 5, 3.5);
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3), awningMat);
    awning.rotation.x = -Math.PI / 2;
    awning.rotation.z = rot;
    awning.position.set(sx, maxY + 2.9, sz);
    scene.add(awning);
    addCollider({ x: sx, z: sz, r: 2.8 });
  }

  // Wool bales
  const bales: [number, number, number][] = [
    [AX + 3, AZ + 2,  0xa04030],
    [AX - 3, AZ - 3,  0xe8e0d0],
    [AX + 5, AZ - 5,  0x8a2020],
    [AX - 5, AZ + 4,  0xe0d8c0],
    [AX + 2, AZ - 6,  0xc03028],
  ];
  for (const [bx, bz, col] of bales) {
    const bMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, metalness: 0 });
    const bm   = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12), bMat);
    bm.position.set(bx, terrainH(bx, bz) + 0.7, bz);
    bm.rotation.z = Math.PI / 2;
    bm.castShadow = true;
    scene.add(bm);
  }
}

// ─── Baths ────────────────────────────────────────────────────────────────────
function buildBaths(scene: THREE.Scene): void {
  const BX = 156, BZ = -18;
  groundedBox(scene, stoneMat, BX, BZ, 22, 7, 15);

  const maxY = footprintMaxY(BX, BZ, 22, 15);
  const domeGeo = new THREE.SphereGeometry(8, 14, 8, 0, Math.PI);
  const dome    = new THREE.Mesh(domeGeo, stoneMat);
  dome.position.set(BX, maxY + 7, BZ - 3);
  dome.rotation.y = Math.PI;
  dome.castShadow = true;
  scene.add(dome);
  addCollider({ x: BX, z: BZ, r: 12 });
}

// ─── Tyche Protogeneia sanctuary ──────────────────────────────────────────────
function buildTemple(scene: THREE.Scene): void {
  const TX = 70, TZ = -10;

  // Podium — grounded; top clears highest footprint corner
  groundedBox(scene, stoneMat, TX, TZ, 18, 1.2, 12);
  const podiumTop = footprintMaxY(TX, TZ, 18, 12) + 1.2;

  // Columns rise from the podium top
  for (let c = 0; c < 4; c++) {
    for (const row of [-1, 1]) {
      const cx = TX - 6 + c * 4, cz = TZ + row * 4;
      const colBase = footprintMaxY(cx, cz, 0.9, 0.9);
      const bottom = colBase - SINK;
      const colH   = 5.5;
      const top    = podiumTop + colH;
      const totalH = top - bottom;
      const geo  = new THREE.CylinderGeometry(0.4, 0.43, totalH, 10);
      const mesh = new THREE.Mesh(geo, columnMat);
      mesh.position.set(cx, bottom + totalH * 0.5, cz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      addCollider({ x: cx, z: cz, r: 0.7 });
    }
  }

  // Entablature — sits on column tops
  const entab = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 12), stoneMat);
  entab.position.set(TX, podiumTop + 5.5 + 0.45, TZ);
  entab.castShadow = true; scene.add(entab);

  // Pediment
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0, 10, 2.5, 3), stoneMat);
  ped.position.set(TX, podiumTop + 5.5 + 0.9 + 1.25, TZ);
  ped.rotation.y = Math.PI / 6;
  ped.scale.set(1, 1, 0.5);
  ped.castShadow = true; scene.add(ped);

  // Cult statue
  const statMat  = new THREE.MeshStandardMaterial({ color: 0xd0c8a8, roughness: 0.88, metalness: 0 });
  const statBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.8, 8), statMat);
  statBody.position.set(TX, podiumTop + 1.4, TZ);
  statBody.castShadow = true; scene.add(statBody);
  const statHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), statMat);
  statHead.position.set(TX, podiumTop + 2.8 + 0.3, TZ);
  scene.add(statHead);

  addCollider({ x: TX, z: TZ, r: 10 });
}

// ─── Lower city ───────────────────────────────────────────────────────────────
function buildLowerCity(scene: THREE.Scene): void {
  const defs: [number, number, number, number, number][] = [
    [60,  -80, 8, 7, 0.1],  [75,  -70, 9, 8, -0.1], [88,  -60, 7, 7, 0.2],
    [70,  -55, 8, 6, 0],    [100, -80, 9, 8, 0.15],  [115, -70, 7, 7, -0.2],
    [105, -55, 8, 7, 0.1],  [130, -78, 9, 8, 0],     [145, -65, 7, 7, 0.3],
    [160, -72, 8, 7, -0.1], [170, -58, 7, 6, 0.2],   [175, -80, 8, 8, 0],
    [185, -68, 7, 7, -0.15],[65,  -35, 8, 7, 0.1],   [80,  -25, 7, 6, -0.1],
    [95,  -40, 8, 7, 0.2],  [110, -30, 9, 8, 0],     [125, -20, 7, 7, -0.2],
    [140, -35, 8, 7, 0.15], [155, -25, 7, 6, 0.1],   [165, -40, 8, 7, -0.1],
    [180, -28, 7, 7, 0.2],  [188, -18, 8, 6, 0],     [62,  -15, 7, 7, -0.15],
    [78,   -8, 8, 7, 0.1],
  ];
  for (const [hx, hz, hw, hd, rot] of defs) {
    house(scene, hx, hz, hw, hd, 3.5, rot, true);
  }
}

// ─── House of Philemon ────────────────────────────────────────────────────────
function buildPhilemonHouse(scene: THREE.Scene): void {
  const PX = 141, PZ = -86;

  const minY   = footprintMinY(PX, PZ, 18, 16);
  const maxY   = footprintMaxY(PX, PZ, 18, 16);
  const bottom = minY - SINK;
  const top    = maxY + 4.5;
  const totalH = top - bottom;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(18, totalH, 16), stuccoMat);
  walls.position.set(PX, bottom + totalH * 0.5, PZ);
  walls.castShadow = true; walls.receiveShadow = true;
  scene.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(14, 3.5, 4), roofMat);
  roof.position.set(PX, top + 1.5, PZ);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true; scene.add(roof);

  for (let i = 0; i < 4; i++) {
    column(scene, PX - 6 + i * 4, PZ + 8, 0.4, 5, 0);
  }

  const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a8068, roughness: 0.9, metalness: 0 });
  const court    = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 10), courtMat);
  court.position.set(PX, terrainH(PX, PZ) + 0.15, PZ);
  scene.add(court);
  addCollider({ x: PX, z: PZ, r: 10 });
}

// ─── Dye works ────────────────────────────────────────────────────────────────
function buildDyeWorks(scene: THREE.Scene): void {
  const vatDefs: [number, number][] = [
    [44,-104],[50,-104],[56,-104],[62,-104],
    [47,-109],[53,-109],[59,-109],
  ];
  for (const [vx, vz] of vatDefs) {
    const vty  = terrainH(vx, vz);
    const vatGeo  = new THREE.CylinderGeometry(1.6, 1.6, 1.5 + SINK, 12);
    const vatMesh = new THREE.Mesh(vatGeo, stoneMat);
    vatMesh.position.set(vx, vty - SINK * 0.5 + 0.75, vz);
    scene.add(vatMesh);
    const dyeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.22, 12),
      redDyeMat,
    );
    dyeMesh.position.set(vx, vty + 1.5 + 0.11, vz);
    scene.add(dyeMesh);
    addCollider({ x: vx, z: vz, r: 2 });
  }

  const rackMat = new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: 0.92, metalness: 0 });
  const hankMat = new THREE.MeshStandardMaterial({ color: 0x8a1820, roughness: 0.88, metalness: 0 });
  const RACK_Z  = -99;

  for (let i = 0; i < 4; i++) {
    const rx  = 44 + i * 5;
    const rty = terrainH(rx, RACK_Z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5 + SINK, 6), rackMat);
    pole.position.set(rx, rty - SINK * 0.5 + 2.25, RACK_Z);
    scene.add(pole);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), rackMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(rx, rty + 4.0, RACK_Z);
    scene.add(bar);
    for (let h = 0; h < 3; h++) {
      const hank = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 10), hankMat);
      hank.rotation.x = Math.PI / 2;
      hank.position.set(rx - 1.2 + h * 1.2, rty + 3.7, RACK_Z + 0.2);
      scene.add(hank);
    }
  }
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
