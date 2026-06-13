import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Material } from '@babylonjs/core';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';
import {
  makeStuccoMat, makeTerracottaMat, makeLimestoneMat,
  makeColumnMat, makeSandstoneMat, makePavingMat,
} from './materials';

function c3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

function mat(name: string, hex: number, _scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, _scene);
  m.diffuseColor  = c3(hex);
  m.specularColor = Color3.Black();
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
  m: Material,
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

function column(scene: Scene, x: number, z: number, r = 0.45, h = 4.5, yOff = 0, m?: Material): void {
  if (!m) m = mat('col-m', 0xd4c8a8, scene);
  const minY = footprintMinY(x, z, r * 3, r * 3);
  const maxY = footprintMaxY(x, z, r * 3, r * 3);
  const bottom = minY - SINK, top = maxY + h + yOff, totalH = top - bottom;
  const mesh = MeshBuilder.CreateCylinder('col', { diameterTop: r*2, diameterBottom: r*2.16, height: totalH, tessellation: 10 }, scene);
  mesh.position.set(x, bottom + totalH * 0.5, z);
  mesh.material = m;
  addCollider({ x, z, r: r + 0.3 });
}

interface HouseMats { wall: Material; roof: Material; }
let _houseMats: HouseMats | null = null;

function house(
  scene: Scene,
  x: number, z: number,
  w = 8, d = 8, wallH = 3.5,
  rot = 0, collide = true,
): void {
  if (!_houseMats) {
    _houseMats = { wall: makeStuccoMat(scene), roof: makeTerracottaMat(scene) };
  }

  const minY   = footprintMinY(x, z, w, d);
  const maxY   = footprintMaxY(x, z, w, d);
  const bottom = minY - SINK, top = maxY + wallH, totalH = top - bottom;

  const walls = MeshBuilder.CreateBox('hwall', { width: w, height: totalH, depth: d }, scene);
  walls.position.set(x, bottom + totalH * 0.5, z);
  walls.rotation.y = rot;
  walls.material = _houseMats.wall;

  const roofSize = Math.max(w, d) * 0.72;
  const roof = MeshBuilder.CreateCylinder('hroof', { diameterTop: 0, diameterBottom: roofSize * 2, height: wallH * 0.55, tessellation: 4 }, scene);
  roof.position.set(x, top + wallH * 0.18, z);
  roof.rotation.y = Math.PI / 4 + rot;
  roof.material = _houseMats.roof;

  if (collide) addCollider({ x, z, r: Math.max(w, d) * 0.6 });
}

function buildAcropolisWall(scene: Scene): void {
  const R = 46, CX = 0, CZ = -8, WALL_H = 3.2, WALL_W = 1.8, SEGS = 40, GAP = 0.22;
  const stoneM = makeSandstoneMat(scene, 'awall');

  // Find uniform top height across all wall positions so the top is level
  let wallMaxTerrain = -Infinity;
  for (let i = 0; i < SEGS; i++) {
    const aMid = ((i + 0.5) / SEGS) * Math.PI * 2;
    const wx = CX + R * Math.cos(aMid), wz = CZ + R * Math.sin(aMid);
    wallMaxTerrain = Math.max(wallMaxTerrain,
      terrainH(wx, wz),
      terrainH(CX + (R - WALL_W) * Math.cos(aMid), CZ + (R - WALL_W) * Math.sin(aMid)),
      terrainH(CX + (R + WALL_W) * Math.cos(aMid), CZ + (R + WALL_W) * Math.sin(aMid)),
    );
  }
  const uniformTop = wallMaxTerrain + WALL_H;

  for (let i = 0; i < SEGS; i++) {
    const a0 = (i / SEGS) * Math.PI * 2, a1 = ((i + 1) / SEGS) * Math.PI * 2;
    const aMid = (a0 + a1) * 0.5;
    if (Math.abs(aMid) < GAP || Math.abs(aMid - Math.PI * 2) < GAP) continue;
    const wx = CX + R * Math.cos(aMid), wz = CZ + R * Math.sin(aMid);

    // Sample bottom from terrain (sink below lowest point)
    const pts = [
      terrainH(CX + R * Math.cos(a0), CZ + R * Math.sin(a0)),
      terrainH(CX + R * Math.cos(a1), CZ + R * Math.sin(a1)),
      terrainH(wx, wz),
    ];
    const minY = Math.min(...pts) - SINK;
    const totalH = uniformTop - minY;
    const segLen = R * (Math.PI * 2 / SEGS) + 0.3;
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
  const colM = makeColumnMat(scene, 'cardo-col');
  for (let z = -88; z <= 4; z += 12) {
    column(scene, 86, z, 0.45, 4.5, 0, colM);
    column(scene, 98, z, 0.45, 4.5, 0, colM);
  }
}

function buildDecumanus(scene: Scene): void {
  const colM = makeColumnMat(scene, 'dec-col');
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

  const stoneM = makeLimestoneMat(scene, 'ag-s');
  const colM   = makeColumnMat(scene, 'ag-col');

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

  // ── Shallow roof slabs over each stoa (columns + 0.6 beam → top ≈ beamY) ─────
  const roofMat = makeTerracottaMat(scene, 'ag-roof');
  const roofY_N = beamY(AX, NZ) + 0.3;
  const roofY_S = beamY(AX, SZ) + 0.3;
  const roofY_E = beamY(EX, AZ) + 0.3;
  const roofD   = 4.0;   // depth of stoa roof (inward from column line)

  const sN = MeshBuilder.CreateBox('stoa-roof-n', { width: EX - WX + 2, height: 0.5, depth: roofD }, scene);
  sN.position.set(AX, roofY_N, NZ - roofD * 0.5 + 0.5);
  sN.material = roofMat;

  const sS = MeshBuilder.CreateBox('stoa-roof-s', { width: EX - WX + 2, height: 0.5, depth: roofD }, scene);
  sS.position.set(AX, roofY_S, SZ + roofD * 0.5 - 0.5);
  sS.material = roofMat;

  const sE = MeshBuilder.CreateBox('stoa-roof-e', { width: roofD, height: 0.5, depth: SZ - NZ + 2 }, scene);
  sE.position.set(EX - roofD * 0.5 + 0.5, roofY_E, AZ);
  sE.material = roofMat;

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
  const stoneM = makeLimestoneMat(scene, 'bath-s');
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
  const stoneM  = makeLimestoneMat(scene, 'temple-s');
  const colM    = makeColumnMat(scene, 'temple-c');
  const statM   = makeColumnMat(scene, 'stat');

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
  const stuccoM = makeStuccoMat(scene, 'phil-s');
  const roofM   = makeTerracottaMat(scene, 'phil-r');
  const courtM  = makePavingMat(scene, 'phil-c');
  const colM    = makeColumnMat(scene, 'phil-col');

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


function buildAgoraMarket(scene: Scene): void {
  const AX = 112, AZ = -29;
  const woolM = mat('wool', 0xe8dcc0, scene);        // cream/white wool
  const ampM  = mat('amp',  0x8a5830, scene);        // terracotta amphora
  const clothM = mat('cloth', 0xc03820, scene);      // red cloth
  const woodM = mat('wood', 0x6a4020, scene);

  // Wool bundles (torus-stacked spheres at two stall positions)
  const woolStalls: [number, number][] = [[103, -36], [108, -36], [103, -22], [108, -22]];
  for (const [wx, wz] of woolStalls) {
    const ty = terrainH(wx, wz);
    // Stall table
    const table = MeshBuilder.CreateBox(`stall-${wx}`, { width: 2.2, height: 0.7, depth: 1.0 }, scene);
    table.position.set(wx, ty + 0.35, wz);
    table.material = woodM;
    // Wool bundle on table
    for (let b = 0; b < 3; b++) {
      const bundle = MeshBuilder.CreateSphere(`wool-${wx}-${b}`, { diameter: 0.55, segments: 7 }, scene);
      bundle.scaling.y = 0.7;
      bundle.position.set(wx - 0.6 + b * 0.6, ty + 0.7 + 0.2, wz);
      bundle.material = woolM;
    }
  }

  // Amphorae leaning against east stoa (at EX=124 side, against the columns)
  const ampPositions: [number, number][] = [[121, -26], [121, -30], [121, -34], [119, -24], [119, -32]];
  for (const [ax, az] of ampPositions) {
    const ty = terrainH(ax, az);
    const body = MeshBuilder.CreateCylinder(`amp-${ax}-${az}`, {
      diameterTop: 0.1, diameterBottom: 0.56, height: 1.4, tessellation: 10,
    }, scene);
    body.position.set(ax, ty + 0.7, az);
    body.material = ampM;
    const neck = MeshBuilder.CreateCylinder(`amp-n-${ax}`, { diameterTop: 0.28, diameterBottom: 0.14, height: 0.5, tessellation: 10 }, scene);
    neck.position.set(ax, ty + 1.4 + 0.25, az);
    neck.material = ampM;
  }

  // Cloth bolts / fabric draped over a central stand
  const clothStand = MeshBuilder.CreateBox('cloth-stand', { width: 0.15, height: 2.0, depth: 0.15 }, scene);
  clothStand.position.set(AX + 4, terrainH(AX + 4, AZ) + 1.0, AZ);
  clothStand.material = woodM;
  const clothDrape = MeshBuilder.CreateBox('cloth-drape', { width: 2.5, height: 0.04, depth: 1.2 }, scene);
  clothDrape.position.set(AX + 4, terrainH(AX + 4, AZ) + 2.0, AZ);
  clothDrape.material = clothM;
}

function buildChurch(scene: Scene): void {
  // Floor plan (from archaeological record, Dura-Europos house-church):
  //   1 = Courtyard (open air, centre)   5 = Lecture room (north centre)
  //   2 = Portico   (south centre)       6 = Baptistery   (north east)
  //   3 = Small room (south west)        7 = Stairs        (mid east)
  //   4 = Assembly hall (west)           8 = Vestibule     (south east, entrance)
  //
  // Orientation: entrance faces east  (positive-x in game = east)
  // Building centre: CX=158, CZ=-86

  const CX = 158, CZ = -86;
  const T  = 1.0;    // wall thickness
  const WH = 4.2;    // wall height above baseY

  // ── Key coordinate lines ──────────────────────────────────────────────────
  const xW    = CX - 13;   // 145 – outer west wall
  const xDiv  = CX - 4;    // 154 – assembly hall | centre block
  const xEDiv = CX + 5;    // 163 – centre block | east section
  const xE    = CX + 12;   // 170 – outer east wall (entrance side)

  const zN    = CZ - 11;   // -97 – outer north wall
  const zLect = CZ - 5;    // -91 – lecture room south / courtyard north
  const zPort = CZ + 3;    // -83 – courtyard south / portico+south-rooms north
  const zBapt = CZ - 2;    // -88 – baptistery south / stairs north
  const zS    = CZ + 10;   // -76 – outer south wall

  const bW  = xE   - xW;   // building width  = 25
  const bD  = zS   - zN;   // building depth  = 21
  const bCX = (xW  + xE)  / 2;   // 157.5
  const bCZ = (zN  + zS)  / 2;   // -86.5

  const baseY  = footprintMaxY(bCX, bCZ, bW, bD);
  const BOTTOM = footprintMinY(bCX, bCZ, bW, bD) - SINK;
  const top    = baseY + WH;
  const totH   = top - BOTTOM;

  const stuccoM = makeStuccoMat(scene,    'ch-stucco');
  const roofM   = makeTerracottaMat(scene,'ch-roof');
  const courtM  = makePavingMat(scene,    'ch-court');
  const colM    = makeColumnMat(scene,    'ch-col');
  const stoneM  = makeLimestoneMat(scene, 'ch-stone');
  const waterM  = mat('ch-water', 0x3060a0, scene);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Full-height wall segment (centred at cx,cz, width w, depth d)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function wall(cx: number, cz: number, w: number, d: number, m: any = stuccoM) {
    const b = MeshBuilder.CreateBox('cw', { width: w, height: totH, depth: d }, scene);
    b.position.set(cx, BOTTOM + totH * 0.5, cz);
    b.material = m;
    b.checkCollisions = true;
  }
  // Roof slab flush on top of walls
  function roof(cx: number, cz: number, w: number, d: number) {
    const r = MeshBuilder.CreateBox('cr', { width: w, height: 0.4, depth: d }, scene);
    r.position.set(cx, top + 0.2, cz);
    r.material = roofM;
  }
  // Helper: centre between two values
  const mid = (a: number, b: number) => (a + b) / 2;

  // ── LEVEL FOUNDATION ─────────────────────────────────────────────────────
  // Fill entire footprint from below ground to baseY so the interior floor
  // is perfectly level regardless of terrain slope.
  {
    const foundH = baseY - BOTTOM;
    const found = MeshBuilder.CreateBox('ch-found', { width: bW, height: foundH, depth: bD }, scene);
    found.position.set(bCX, BOTTOM + foundH * 0.5, bCZ);
    found.material = stoneM;
  }

  // ── OUTER PERIMETER (stone) ───────────────────────────────────────────────
  wall(bCX, zN, bW, T, stoneM);    // north (full)
  wall(bCX, zS, bW, T, stoneM);    // south (full)
  wall(xW,  bCZ, T, bD, stoneM);   // west  (full)

  // East wall: entrance gap of 3 m in the vestibule face (zPort → zS = 7 m, gap centred at z=-79.5)
  const eDoorC = mid(zPort, zS);   // -79.5
  const eDoorW = 3.0;
  const ARCH_H = 2.8;   // clear opening height
  wall(xE, mid(zN, eDoorC - eDoorW / 2), T, eDoorC - eDoorW / 2 - zN, stoneM);   // north section
  wall(xE, mid(eDoorC + eDoorW / 2, zS), T, zS - (eDoorC + eDoorW / 2), stoneM); // south section

  // Archway: lintel + pilasters protruding OUTWARD (east) from the wall face.
  // Wall outer face = xE + T/2 = 170.5. Frame centred at xE + T/2 + PROJ/2.
  {
    const lintH  = WH - ARCH_H;   // header height ~1.4 m
    const PROJ   = 0.7;            // protrusion beyond wall outer face
    const frameW = T * 0.5 + PROJ; // frame depth: half inside + PROJ outside
    const fcx = xE + T / 2 + PROJ / 2;   // centre of frame, straddles wall outer face

    // Lintel
    const lintel = MeshBuilder.CreateBox('ch-lintel', { width: frameW, height: lintH, depth: eDoorW + 1.4 }, scene);
    lintel.position.set(fcx, baseY + ARCH_H + lintH * 0.5, eDoorC);
    lintel.material = stoneM;

    // Pilasters flanking the gap
    for (const side of [-1, 1]) {
      const jz   = eDoorC + side * (eDoorW / 2 + 0.5);
      const jamb = MeshBuilder.CreateBox('ch-jamb', { width: frameW, height: ARCH_H, depth: 1.0 }, scene);
      jamb.position.set(fcx, baseY + ARCH_H * 0.5, jz);
      jamb.material = stoneM;
    }
  }

  // ── INTERIOR DIVISIONS ────────────────────────────────────────────────────

  // (A) Assembly hall east wall: x=xDiv, full height zN→zPort
  //     Door gap 2.5 m centred at z = mid(zN,zPort) ≈ -90
  {
    const dc = mid(zN, zPort), dh = 2.5;
    wall(xDiv, mid(zN, dc - dh / 2), T, dc - dh / 2 - zN);
    wall(xDiv, mid(dc + dh / 2, zPort), T, zPort - dc - dh / 2);
  }

  // (B) Assembly hall / Room-3 divider: z=zPort, x=xW→xDiv (9 m E-W)
  //     Door gap 2 m centred
  {
    const dc = mid(xW, xDiv), dh = 2.0;
    wall(mid(xW, dc - dh / 2), zPort, dc - dh / 2 - xW, T);
    wall(mid(dc + dh / 2, xDiv), zPort, xDiv - dc - dh / 2, T);
  }

  // (C) Room-3 east wall: x=xDiv, z=zPort→zS (no door — Room 3 accessed via hall)
  wall(xDiv, mid(zPort, zS), T, zS - zPort);

  // (D) Lecture room south wall: z=zLect, x=xDiv→xEDiv (9 m)
  //     Door gap 2.5 m centred
  {
    const dc = mid(xDiv, xEDiv), dh = 2.5;
    wall(mid(xDiv, dc - dh / 2), zLect, dc - dh / 2 - xDiv, T);
    wall(mid(dc + dh / 2, xEDiv), zLect, xEDiv - dc - dh / 2, T);
  }

  // (E) Courtyard south opening → portico: NO wall, just two columns
  column(scene, mid(xDiv, xEDiv) - 2.5, zPort, 0.4, 4.5, 0, colM);
  column(scene, mid(xDiv, xEDiv) + 2.5, zPort, 0.4, 4.5, 0, colM);

  // (F) Centre block east wall: x=xEDiv, zN→zPort
  //     Two door gaps: one into baptistery (near north), one into stairs
  {
    const g1c = mid(zN, zBapt), g2c = mid(zBapt, zPort), gh = 2.0;
    wall(xEDiv, mid(zN, g1c - gh / 2), T, g1c - gh / 2 - zN);
    wall(xEDiv, mid(g1c + gh / 2, g2c - gh / 2), T, g2c - g1c - gh);
    wall(xEDiv, mid(g2c + gh / 2, zPort), T, zPort - g2c - gh / 2);
  }

  // (G) Baptistery south wall: z=zBapt, x=xEDiv→xE
  wall(mid(xEDiv, xE), zBapt, xE - xEDiv, T);

  // (H) Stairs south / Vestibule north: z=zPort, x=xEDiv→xE
  //     Door gap 2 m centred (connect vestibule to stairs)
  {
    const dc = mid(xEDiv, xE), dh = 2.0;
    wall(mid(xEDiv, dc - dh / 2), zPort, dc - dh / 2 - xEDiv, T);
    wall(mid(dc + dh / 2, xE),    zPort, xE - dc - dh / 2,    T);
  }

  // ── ROOFS (all enclosed rooms except courtyard) ───────────────────────────
  roof(mid(xW,    xDiv),  mid(zN,    zPort), xDiv  - xW,    zPort - zN);   // (4) Assembly
  roof(mid(xW,    xDiv),  mid(zPort, zS),    xDiv  - xW,    zS    - zPort);// (3) Room 3
  roof(mid(xDiv,  xEDiv), mid(zN,    zLect), xEDiv - xDiv,  zLect - zN);   // (5) Lecture
  roof(mid(xDiv,  xEDiv), mid(zPort, zS),    xEDiv - xDiv,  zS    - zPort);// (2) Portico
  roof(mid(xEDiv, xE),    mid(zN,    zBapt), xE    - xEDiv, zBapt - zN);   // (6) Baptistery
  roof(mid(xEDiv, xE),    mid(zBapt, zPort), xE    - xEDiv, zPort - zBapt);// (7) Stairs
  roof(mid(xEDiv, xE),    mid(zPort, zS),    xE    - xEDiv, zS    - zPort);// (8) Vestibule

  // ── COURTYARD FLOOR (open air) ─────────────────────────────────────────────
  {
    const cw = xEDiv - xDiv - 0.2, cd = zPort - zLect - 0.2;
    const pave = MeshBuilder.CreateBox('ch-pave', { width: cw, height: 0.18, depth: cd }, scene);
    pave.position.set(mid(xDiv, xEDiv), baseY + 0.09, mid(zLect, zPort));
    pave.material = courtM;
  }

  // ── BAPTISTERY (6): sunken font area ──────────────────────────────────────
  {
    const bx = mid(xEDiv, xE);      // 166.5
    const bz = mid(zN, zBapt) - 1;  // near north end of baptistery
    // Sunken plunge-pool lip (slightly below floor)
    const rim = MeshBuilder.CreateCylinder('font-rim', { diameter: 2.2, height: 0.5, tessellation: 16 }, scene);
    rim.position.set(bx, baseY - 0.25, bz);
    rim.material = stoneM;
    // Water surface
    const water = MeshBuilder.CreateCylinder('font-water', { diameter: 1.8, height: 0.08, tessellation: 16 }, scene);
    water.position.set(bx, baseY - 0.18, bz);
    water.material = waterM;
    // Sunken floor patch
    const sunk = MeshBuilder.CreateBox('font-floor', { width: 3, height: 0.2, depth: 3 }, scene);
    sunk.position.set(bx, baseY - 0.5, bz);
    sunk.material = stoneM;
  }

  // ── STAIRS (7): simple staircase rising northward ─────────────────────────
  {
    const sw = (xE - xEDiv) * 0.7;   // stair width ≈ 5 m
    const sx = mid(xEDiv, xE);
    for (let s = 0; s < 6; s++) {
      const step = MeshBuilder.CreateBox(`ch-step-${s}`, { width: sw, height: 0.28, depth: 0.5 }, scene);
      step.position.set(sx, baseY + 0.14 + s * 0.28, zBapt - 0.4 - s * 0.5);
      step.material = stuccoM;
    }
  }

  // ── COLLIDERS along outer perimeter, gap at east entrance ─────────────────
  // North wall
  for (const cx of [mid(xW, xDiv), mid(xDiv, xEDiv), mid(xEDiv, xE)])
    addCollider({ x: cx, z: zN, r: 1.2 });
  // South wall
  for (const cx of [mid(xW, xDiv), mid(xDiv, xEDiv), mid(xEDiv, xE)])
    addCollider({ x: cx, z: zS, r: 1.2 });
  // West wall
  for (const cz of [mid(zN, zLect), mid(zLect, zPort), mid(zPort, zS)])
    addCollider({ x: xW, z: cz, r: 1.2 });
  // East wall — only north section (gap at vestibule)
  for (const cz of [mid(zN, zBapt), mid(zBapt, zPort)])
    addCollider({ x: xE, z: cz, r: 1.2 });
}

export function buildCity(scene: Scene): void {
  buildAcropolisWall(scene);
  buildSilo(scene);
  buildCardo(scene);
  buildDecumanus(scene);
  buildAgora(scene);
  buildAgoraMarket(scene);
  buildBaths(scene);
  buildTemple(scene);
  buildLowerCity(scene);
  buildPhilemonHouse(scene);
  buildDyeWorks(scene);
  buildChurch(scene);
}
