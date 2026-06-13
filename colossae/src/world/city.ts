import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

function c3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

function mat(name: string, hex: number, _scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, _scene);
  m.diffuseColor  = c3(hex);
  m.specularColor = Color3.Black();
  return m;
}

function jitterMat(base: StandardMaterial, _scene: Scene): StandardMaterial {
  const m = base.clone(base.name + '_j' + Math.random().toFixed(4));
  const f = 1 + (Math.random() - 0.5) * 0.16;
  m.diffuseColor.scaleInPlace(f);
  return m;
}

function sampleFootprint(cx: number, cz: number, w: number, d: number): number[] {
  const hw = w * 0.5, hd = d * 0.5;
  return [
    terrainH(cx - hw, cz - hd), terrainH(cx, cz - hd), terrainH(cx + hw, cz - hd),
    terrainH(cx - hw, cz),      terrainH(cx, cz),       terrainH(cx + hw, cz),
    terrainH(cx - hw, cz + hd), terrainH(cx, cz + hd),  terrainH(cx + hw, cz + hd),
  ];
}

function footprintMinY(cx: number, cz: number, w: number, d: number): number {
  return Math.min(...sampleFootprint(cx, cz, w, d));
}
function footprintMaxY(cx: number, cz: number, w: number, d: number): number {
  return Math.max(...sampleFootprint(cx, cz, w, d));
}

const SINK = 5.0;

function groundedBox(
  scene: Scene,
  m: StandardMaterial,
  cx: number, cz: number,
  w: number, h: number, d: number,
  yOff = 0, rot = 0,
): Mesh {
  const minY   = footprintMinY(cx, cz, w, d);
  const maxY   = footprintMaxY(cx, cz, w, d);
  const bottom = minY - SINK;
  const top    = maxY + h + yOff;
  const totalH = top - bottom;

  const mesh = MeshBuilder.CreateBox('box', { width: w, height: totalH, depth: d }, scene);
  mesh.position.set(cx, bottom + totalH * 0.5, cz);
  mesh.rotation.y = rot;
  mesh.material = m;
  return mesh;
}

function column(scene: Scene, x: number, z: number, r = 0.45, h = 4.5, yOff = 0, m?: StandardMaterial): void {
  if (!m) m = mat('col-m', 0xd4c8a8, scene);
  const minY = footprintMinY(x, z, r * 3, r * 3);
  const maxY = footprintMaxY(x, z, r * 3, r * 3);
  const bottom = minY - SINK, top = maxY + h + yOff, totalH = top - bottom;
  const mesh = MeshBuilder.CreateCylinder('col', { diameterTop: r*2, diameterBottom: r*2.16, height: totalH, tessellation: 10 }, scene);
  mesh.position.set(x, bottom + totalH * 0.5, z);
  mesh.material = m;
  addCollider({ x, z, r: r + 0.3 });
}

function house(
  scene: Scene,
  x: number, z: number,
  w = 8, d = 8, wallH = 3.5,
  rot = 0, collide = true,
): void {
  const stucco = mat('stucco', 0xc8b898, scene);
  const roofM  = mat('roof', 0xa04830, scene);

  const minY   = footprintMinY(x, z, w, d);
  const maxY   = footprintMaxY(x, z, w, d);
  const bottom = minY - SINK, top = maxY + wallH, totalH = top - bottom;

  const walls = MeshBuilder.CreateBox('hwall', { width: w, height: totalH, depth: d }, scene);
  walls.position.set(x, bottom + totalH * 0.5, z);
  walls.rotation.y = rot;
  walls.material = jitterMat(stucco, scene);

  const roofSize = Math.max(w, d) * 0.72;
  const roof = MeshBuilder.CreateCylinder('hroof', { diameterTop: 0, diameterBottom: roofSize * 2, height: wallH * 0.55, tessellation: 4 }, scene);
  roof.position.set(x, top + wallH * 0.18, z);
  roof.rotation.y = Math.PI / 4 + rot;
  roof.material = jitterMat(roofM, scene);

  if (collide) addCollider({ x, z, r: Math.max(w, d) * 0.6 });
}

function buildAcropolisWall(scene: Scene): void {
  const R = 46, CX = 0, CZ = -8, WALL_H = 3.2, WALL_W = 1.8, SEGS = 28, GAP = 0.22;
  const stoneM = mat('awall', 0x9a8c78, scene);

  for (let i = 0; i < SEGS; i++) {
    const a0 = (i / SEGS) * Math.PI * 2, a1 = ((i + 1) / SEGS) * Math.PI * 2;
    const aMid = (a0 + a1) * 0.5;
    if (Math.abs(aMid) < GAP || Math.abs(aMid - Math.PI * 2) < GAP) continue;
    const wx = CX + R * Math.cos(aMid), wz = CZ + R * Math.sin(aMid);
    const pts = [
      terrainH(CX + R * Math.cos(a0), CZ + R * Math.sin(a0)),
      terrainH(CX + R * Math.cos(a1), CZ + R * Math.sin(a1)),
      terrainH(wx, wz),
      terrainH(CX + (R - WALL_W) * Math.cos(aMid), CZ + (R - WALL_W) * Math.sin(aMid)),
      terrainH(CX + (R + WALL_W) * Math.cos(aMid), CZ + (R + WALL_W) * Math.sin(aMid)),
    ];
    const minY = Math.min(...pts) - SINK, maxY = Math.max(...pts);
    const top = maxY + WALL_H, totalH = top - minY;
    const segLen = R * (Math.PI * 2 / SEGS) + 0.5;
    const seg = MeshBuilder.CreateBox('aw', { width: segLen, height: totalH, depth: WALL_W }, scene);
    seg.position.set(wx, minY + totalH * 0.5, wz);
    seg.rotation.y = -(aMid + Math.PI / 2);
    seg.material = stoneM;
    addCollider({ x: wx, z: wz, r: WALL_W + 0.3 });
  }

  const acropolisHouses: [number, number, number, number][] = [
    [-15, -5, 7, 0.4], [10, -18, 8, 0], [-30, -12, 6, 0.8], [20, 5, 7, -0.3], [-10, 10, 6, 1.1],
  ];
  for (const [hx, hz, hw, rot] of acropolisHouses) house(scene, hx, hz, hw, hw * 0.9, 3, rot, true);
}

function buildSilo(scene: Scene): void {
  const SX = -58, SZ = -6, R = 3.2, WALL_H = 1.4;
  const stoneM = mat('silo-s', 0x9a8c78, scene);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sx = SX + R * Math.cos(a), sz = SZ + R * Math.sin(a);
    const sty = terrainH(sx, sz);
    const seg = MeshBuilder.CreateBox('silo-b', { width: 1.4, height: WALL_H + SINK, depth: 0.9 }, scene);
    seg.position.set(sx, sty - SINK * 0.5 + WALL_H * 0.5, sz);
    seg.rotation.y = -a;
    seg.material = stoneM;
  }
  const pitM = mat('pit', 0x1a1410, scene);
  const pit = MeshBuilder.CreateCylinder('pit', { diameter: (R - 0.2) * 2, height: 0.2, tessellation: 16 }, scene);
  pit.position.set(SX, terrainH(SX, SZ) - 0.05, SZ);
  pit.material = pitM;
  addCollider({ x: SX, z: SZ, r: R + 0.5 });
}

function buildCardo(scene: Scene): void {
  const colM = mat('cardo-col', 0xd4c8a8, scene);
  for (let z = -88; z <= 4; z += 12) {
    column(scene, 86, z, 0.45, 4.5, 0, colM);
    column(scene, 98, z, 0.45, 4.5, 0, colM);
  }
}

function buildDecumanus(scene: Scene): void {
  // East-west colonnaded street at z = -44 (west of the cardo only).
  // East side opens directly into the agora entrance at x = 100.
  const colM = mat('dec-col', 0xd4c8a8, scene);
  for (let x = 64; x <= 84; x += 10) {
    column(scene, x, -39, 0.42, 4.2, 0, colM);
    column(scene, x, -49, 0.42, 4.2, 0, colM);
  }
}

function buildAgora(scene: Scene): void {
  // Single-story Hellenistic agora opening west directly onto the Cardo.
  // West face is open (enter straight from the street).
  // Three enclosed stoa sides: N, S, E — each a row of columns + entablature + back wall.
  const WX = 100, EX = 124;          // west (open entry) / east back wall
  const NZ = -40, SZ = -18;          // north / south walls
  const AX = (WX + EX) * 0.5;       // 112
  const AZ = (NZ + SZ) * 0.5;       // -29

  const plazaM = mat('plaza',  0xb8a880, scene);
  const stoneM = mat('ag-s',   0x9a8c78, scene);
  const colM   = mat('ag-col', 0xd4c8a8, scene);

  // ── Paved limestone court ────────────────────────────────────────────────────
  groundedBox(scene, plazaM, AX, AZ, EX - WX, 0.25, SZ - NZ);

  // ── Stoa columns ─────────────────────────────────────────────────────────────
  const COL_SPACING = 5.5;
  // North stoa
  for (let cx = WX + 2; cx <= EX + 0.5; cx += COL_SPACING)
    column(scene, cx, NZ, 0.38, 4.0, 0, colM);
  // South stoa
  for (let cx = WX + 2; cx <= EX + 0.5; cx += COL_SPACING)
    column(scene, cx, SZ, 0.38, 4.0, 0, colM);
  // East stoa
  for (let cz = NZ + 2; cz <= SZ + 0.5; cz += COL_SPACING)
    column(scene, EX, cz, 0.38, 4.0, 0, colM);

  // West entry: two framing columns at the corners of the opening
  column(scene, WX, NZ + 2, 0.44, 4.5, 0, colM);
  column(scene, WX, SZ - 2, 0.44, 4.5, 0, colM);

  // ── Entablature beams (cap column rows) ──────────────────────────────────────
  const beamY = (x: number, z: number) => footprintMaxY(x, z, 2, 2) + 4.0 + 0.3;
  function beam(name: string, w: number, d: number, bx: number, bz: number) {
    const b = MeshBuilder.CreateBox(name, { width: w, height: 0.6, depth: d }, scene);
    b.position.set(bx, beamY(bx, bz), bz);
    b.material = stoneM;
  }
  beam('n-beam', EX - WX + 2, 0.9, AX, NZ);
  beam('s-beam', EX - WX + 2, 0.9, AX, SZ);
  beam('e-beam', 0.9, SZ - NZ + 2, EX, AZ);

  // ── Stoa back walls ───────────────────────────────────────────────────────────
  groundedBox(scene, stoneM, AX,     NZ - 1.2, EX - WX,   4.2, 0.8);
  groundedBox(scene, stoneM, AX,     SZ + 1.2, EX - WX,   4.2, 0.8);
  groundedBox(scene, stoneM, EX + 1, AZ,       0.8,        4.2, SZ - NZ);

  // Circle-chain colliders approximating the three closed walls
  for (let cz = NZ; cz <= SZ; cz += 4) addCollider({ x: EX + 1,  z: cz, r: 1.2 });
  for (let cx = WX; cx <= EX; cx += 4) addCollider({ x: cx, z: NZ - 1.5, r: 1.2 });
  for (let cx = WX; cx <= EX; cx += 4) addCollider({ x: cx, z: SZ + 1.5, r: 1.2 });

  // ── Central altar ─────────────────────────────────────────────────────────────
  const altY = footprintMaxY(AX, AZ, 3, 3) + 0.25;
  const altBase = MeshBuilder.CreateBox('alt-base', { width: 3.2, height: 0.9, depth: 3.2 }, scene);
  altBase.position.set(AX, altY + 0.45, AZ);
  altBase.material = stoneM;
  const altTop = MeshBuilder.CreateBox('alt-top', { width: 2.3, height: 0.4, depth: 2.3 }, scene);
  altTop.position.set(AX, altY + 0.9 + 0.2, AZ);
  altTop.material = mat('alt-top', 0xd8caa8, scene);
}

function buildBaths(scene: Scene): void {
  const BX = 156, BZ = -18;
  const stoneM = mat('bath-s', 0x9a8c78, scene);
  const BH = 7;
  groundedBox(scene, stoneM, BX, BZ, 22, BH, 15);
  const roofY = footprintMaxY(BX, BZ, 22, 15) + BH;
  // Hemispherical dome resting flush on the centre of the roof. Build a full
  // sphere flattened to a half-height, with its equator at the roof line so the
  // lower hemisphere is hidden inside the building and only the dome shows.
  const dome = MeshBuilder.CreateSphere('dome', { diameter: 14, segments: 18 }, scene);
  dome.scaling.y = 0.55;
  dome.position.set(BX, roofY, BZ);
  dome.material = stoneM;
  // Small finial lantern at the apex
  const finial = MeshBuilder.CreateCylinder('dome-finial', { diameter: 1.0, height: 0.8, tessellation: 10 }, scene);
  finial.position.set(BX, roofY + 7 * 0.55 + 0.4, BZ);
  finial.material = stoneM;
  addCollider({ x: BX, z: BZ, r: 12 });
}

function buildTemple(scene: Scene): void {
  const TX2 = 70, TZ2 = -10;
  const stoneM  = mat('temple-s', 0x9a8c78, scene);
  const colM    = mat('temple-c', 0xd4c8a8, scene);
  const statM   = mat('stat', 0xd0c8a8, scene);

  groundedBox(scene, stoneM, TX2, TZ2, 18, 1.2, 12);
  const podiumTop = footprintMaxY(TX2, TZ2, 18, 12) + 1.2;

  for (let c2 = 0; c2 < 4; c2++) {
    for (const row of [-1, 1]) {
      const cx = TX2 - 6 + c2 * 4, cz = TZ2 + row * 4;
      const colBase = footprintMaxY(cx, cz, 0.9, 0.9);
      const bottom  = colBase - SINK, top = podiumTop + 5.5, totalH = top - bottom;
      const cyl = MeshBuilder.CreateCylinder('tcol', { diameterTop: 0.8, diameterBottom: 0.86, height: totalH, tessellation: 10 }, scene);
      cyl.position.set(cx, bottom + totalH * 0.5, cz);
      cyl.material = colM;
      addCollider({ x: cx, z: cz, r: 0.7 });
    }
  }

  const entab = MeshBuilder.CreateBox('entab', { width: 18, height: 0.9, depth: 12 }, scene);
  entab.position.set(TX2, podiumTop + 5.5 + 0.45, TZ2);
  entab.material = stoneM;

  const ped = MeshBuilder.CreateCylinder('ped', { diameterTop: 0, diameterBottom: 20, height: 2.5, tessellation: 3 }, scene);
  ped.position.set(TX2, podiumTop + 5.5 + 0.9 + 1.25, TZ2);
  ped.rotation.y = Math.PI / 6;
  ped.scaling.z = 0.5;
  ped.material = stoneM;

  const statBody = MeshBuilder.CreateCylinder('stat-b', { diameterTop: 0.7, diameterBottom: 0.9, height: 2.8, tessellation: 8 }, scene);
  statBody.position.set(TX2, podiumTop + 1.4, TZ2);
  statBody.material = statM;

  const statHead = MeshBuilder.CreateSphere('stat-h', { diameter: 0.6, segments: 8 }, scene);
  statHead.position.set(TX2, podiumTop + 2.8 + 0.3, TZ2);
  statHead.material = statM;

  // Entry stairways on BOTH ends so the temple can be climbed from the east
  // (city) and the west (acropolis) approaches. Three broad steps each side.
  const STEPS = 3;
  for (const side of [1, -1]) {            // +1 = east, -1 = west (acropolis)
    for (let s = 0; s < STEPS; s++) {
      const stepTopY = podiumTop - (s + 1) * (podiumTop - footprintMaxY(TX2, TZ2, 18, 12)) / STEPS;
      const reach    = 9 + (STEPS - s) * 0.9;   // outer steps wider
      const sx       = TX2 + side * (9 + (STEPS - s - 0.5) * 0.9);
      const h        = Math.max(0.2, stepTopY - (footprintMaxY(TX2, TZ2, 18, 12) - 1));
      const step = MeshBuilder.CreateBox('temple-step', { width: 0.9, height: h, depth: 12 }, scene);
      step.position.set(sx, stepTopY - h / 2, TZ2);
      step.material = stoneM;
      void reach;
    }
  }

  // No central blocking collider — the columns each have their own, and the
  // podium floor is walkable via templeFloorY() in controls.ts.
}

function buildLowerCity(scene: Scene): void {
  // Roman grid: N-S streets at x≈62, 92(cardo), 126, 158, 190
  //             E-W streets at z≈-72, -44(decumanus), -16, 6
  // Insulae: 4 houses (2×2) per block. Skip temple, agora, Philemon, baths zones.
  const insulae: [number, number][] = [
    [77, -86],  [77, -58],  [77, -30],          // west of cardo
    [111, -86], [111, -58], [111, -5],           // east block 1 (agora at z≈-29, skip)
    [142, -58], [142, -30],                      // east block 2 (Philemon at -86; baths near -18)
    [174, -86], [174, -58], [174, -30],          // east block 3
  ];
  for (const [ix, iz] of insulae) {
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]] as [number, number][]) {
      house(scene, ix + dx, iz + dz, 9, 7.5, 3.5, 0);
    }
  }
}

function buildPhilemonHouse(scene: Scene): void {
  const PX = 141, PZ = -86;
  const stuccoM = mat('phil-s', 0xc8b898, scene);
  const roofM   = mat('phil-r', 0xa04830, scene);
  const courtM  = mat('phil-c', 0x9a8068, scene);
  const colM    = mat('phil-col', 0xd4c8a8, scene);

  const minY = footprintMinY(PX, PZ, 18, 16);
  const maxY = footprintMaxY(PX, PZ, 18, 16);
  const bottom = minY - SINK, top = maxY + 4.5, totalH = top - bottom;

  const walls = MeshBuilder.CreateBox('phil-w', { width: 18, height: totalH, depth: 16 }, scene);
  walls.position.set(PX, bottom + totalH * 0.5, PZ);
  walls.material = stuccoM;

  const roof = MeshBuilder.CreateCylinder('phil-roof', { diameterTop: 0, diameterBottom: 28, height: 3.5, tessellation: 4 }, scene);
  roof.position.set(PX, top + 1.5, PZ);
  roof.rotation.y = Math.PI / 4;
  roof.material = roofM;

  for (let i = 0; i < 4; i++) column(scene, PX - 6 + i * 4, PZ + 8, 0.4, 5, 0, colM);

  const court = MeshBuilder.CreateBox('phil-court', { width: 10, height: 0.3, depth: 10 }, scene);
  court.position.set(PX, terrainH(PX, PZ) + 0.15, PZ);
  court.material = courtM;
  addCollider({ x: PX, z: PZ, r: 10 });
}

function buildDyeWorks(scene: Scene): void {
  const stoneM = mat('vat-s', 0x9a8c78, scene);
  const dyeM   = mat('dye', 0x8a1e1e, scene);
  const rackM  = mat('rack', 0x6a4a28, scene);
  const hankM  = mat('hank', 0x8a1820, scene);

  const vatDefs: [number, number][] = [
    [44,-104],[50,-104],[56,-104],[62,-104],
    [47,-109],[53,-109],[59,-109],
  ];
  for (const [vx, vz] of vatDefs) {
    const vty = terrainH(vx, vz);
    const vat = MeshBuilder.CreateCylinder('vat', { diameter: 3.2, height: 1.5 + SINK, tessellation: 12 }, scene);
    vat.position.set(vx, vty - SINK * 0.5 + 0.75, vz);
    vat.material = stoneM;
    const dye = MeshBuilder.CreateCylinder('dye-top', { diameter: 2.8, height: 0.22, tessellation: 12 }, scene);
    dye.position.set(vx, vty + 1.5 + 0.11, vz);
    dye.material = dyeM;
    addCollider({ x: vx, z: vz, r: 2 });
  }

  const RACK_Z = -99;
  for (let i = 0; i < 4; i++) {
    const rx = 44 + i * 5, rty = terrainH(rx, RACK_Z);
    const pole = MeshBuilder.CreateCylinder('pole', { diameter: 0.2, height: 4.5 + SINK, tessellation: 6 }, scene);
    pole.position.set(rx, rty - SINK * 0.5 + 2.25, RACK_Z);
    pole.material = rackM;
    const bar = MeshBuilder.CreateCylinder('bar', { diameter: 0.16, height: 4, tessellation: 6 }, scene);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(rx, rty + 4.0, RACK_Z);
    bar.material = rackM;
    for (let h = 0; h < 3; h++) {
      const hank = MeshBuilder.CreateTorus('hank', { diameter: 1.0, thickness: 0.24, tessellation: 10 }, scene);
      hank.rotation.x = Math.PI / 2;
      hank.position.set(rx - 1.2 + h * 1.2, rty + 3.7, RACK_Z + 0.2);
      hank.material = hankM;
    }
  }
}

export function buildCity(scene: Scene): void {
  buildAcropolisWall(scene);
  buildSilo(scene);
  buildCardo(scene);
  buildDecumanus(scene);
  buildAgora(scene);
  buildBaths(scene);
  buildTemple(scene);
  buildLowerCity(scene);
  buildPhilemonHouse(scene);
  buildDyeWorks(scene);
}
