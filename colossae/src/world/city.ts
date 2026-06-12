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

function buildAgora(scene: Scene): void {
  const AX = 120, AZ = -44;
  const plazaM = mat('plaza', 0xb0a080, scene);
  const woodM  = mat('wood', 0x7a5a38, scene);
  groundedBox(scene, plazaM, AX, AZ, 34, 0.3, 34);

  const stallDefs: [number, number, number][] = [
    [AX - 10, AZ - 10, 0.3], [AX + 10, AZ - 10, -0.3],
    [AX - 10, AZ + 10, 0.8], [AX + 10, AZ + 10, -0.8],
    [AX,      AZ - 14, 0],   [AX,      AZ + 14, Math.PI],
    [AX - 14, AZ,      Math.PI / 2],
  ];
  for (const [sx, sz, rot] of stallDefs) {
    groundedBox(scene, woodM, sx, sz, 5, 2.8, 3.5, 0, rot);
    const awningM = mat('awn-' + sx, Math.random() > 0.5 ? 0xaa3322 : 0x886633, scene);
    awningM.backFaceCulling = false;
    const maxY = footprintMaxY(sx, sz, 5, 3.5);
    const awn = MeshBuilder.CreatePlane('awn', { width: 5.5, height: 3 }, scene);
    awn.rotation.x = -Math.PI / 2;
    awn.rotation.z = rot;
    awn.position.set(sx, maxY + 2.9, sz);
    awn.material = awningM;
    addCollider({ x: sx, z: sz, r: 2.8 });
  }

  const bales: [number, number, number][] = [
    [AX + 3, AZ + 2, 0xa04030], [AX - 3, AZ - 3, 0xe8e0d0],
    [AX + 5, AZ - 5, 0x8a2020], [AX - 5, AZ + 4, 0xe0d8c0],
    [AX + 2, AZ - 6, 0xc03028],
  ];
  for (const [bx, bz, col] of bales) {
    const bm = MeshBuilder.CreateCylinder('bale', { diameter: 1.6, height: 1.4, tessellation: 12 }, scene);
    bm.position.set(bx, terrainH(bx, bz) + 0.7, bz);
    bm.rotation.z = Math.PI / 2;
    bm.material = mat('bale-m', col, scene);
  }
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
  const defs: [number, number, number, number, number][] = [
    [60,-80,8,7,0.1],  [75,-70,9,8,-0.1], [88,-60,7,7,0.2],
    [70,-55,8,6,0],    [100,-80,9,8,0.15],[115,-70,7,7,-0.2],
    [105,-55,8,7,0.1], [130,-78,9,8,0],   [145,-65,7,7,0.3],
    [160,-72,8,7,-0.1],[170,-58,7,6,0.2], [175,-80,8,8,0],
    [185,-68,7,7,-0.15],[65,-35,8,7,0.1], [80,-25,7,6,-0.1],
    [95,-40,8,7,0.2],  [110,-30,9,8,0],   [125,-20,7,7,-0.2],
    [140,-35,8,7,0.15],[155,-25,7,6,0.1], [165,-40,8,7,-0.1],
    [180,-28,7,7,0.2], [188,-18,8,6,0],   [62,-15,7,7,-0.15],
    [78,-8,8,7,0.1],
  ];
  for (const [hx, hz, hw, hd, rot] of defs) house(scene, hx, hz, hw, hd, 3.5, rot, true);
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
  buildAgora(scene);
  buildBaths(scene);
  buildTemple(scene);
  buildLowerCity(scene);
  buildPhilemonHouse(scene);
  buildDyeWorks(scene);
}
