import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Matrix, Quaternion, Vector3, Texture } from '@babylonjs/core';
import { terrainH } from './terrain';

function lmat(name: string, hex: number, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  m.specularColor = Color3.Black();
  return m;
}

function thinMatrix(px: number, py: number, pz: number, ry: number, sx: number, sy: number, sz: number): Matrix {
  return Matrix.Compose(
    new Vector3(sx, sy, sz),
    Quaternion.RotationAxis(Vector3.Up(), ry),
    new Vector3(px, py, pz),
  );
}

export function buildSunDisc(scene: Scene): void {
  const mat = new StandardMaterial('sun-mat', scene);
  mat.diffuseColor  = new Color3(1, 0.94, 0.75);
  mat.emissiveColor = new Color3(1, 0.94, 0.75);
  mat.disableLighting = true;
  const disc = MeshBuilder.CreateSphere('sun', { diameter: 56, segments: 16 }, scene);
  disc.scaling.y = 0.55;
  disc.position.set(-600, 180, 300);
  disc.material = mat;
  disc.isPickable = false;
}

// ─── Lightweight sprite clouds ────────────────────────────────────────────────
// 12 billboard planes total, 1 shared material, group-level drift only.

interface SpriteCloud { mesh: Mesh; speed: number; }
const spriteClouds: SpriteCloud[] = [];

function makeCloudSpriteMat(scene: Scene): StandardMaterial {
  const SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const nx = (px / SIZE) * 2 - 1, ny = (py / SIZE) * 2 - 1;
      const r  = Math.sqrt(nx * nx + ny * ny);
      // Soft radial falloff with a few fbm-style bumps
      const bump = 0.18 * Math.sin(nx * 6.2) * Math.cos(ny * 5.1)
                 + 0.10 * Math.sin(nx * 13 + 1) * Math.cos(ny * 11 - 0.5);
      const a = Math.max(0, Math.min(1, 1.1 - r * 1.35 + bump));
      const shade = Math.floor(240 + bump * 30);
      const i = (py * SIZE + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
      img.data[i + 3] = Math.floor(a * 220);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new Texture(canvas.toDataURL('image/png'), scene);
  tex.hasAlpha = true;

  const m = new StandardMaterial('cloud-sprite-mat', scene);
  m.diffuseTexture  = tex;
  m.opacityTexture  = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.diffuseColor  = new Color3(1.0, 1.0, 1.0);
  m.emissiveColor = new Color3(0.62, 0.63, 0.66);
  m.alpha = 0.82;
  m.backFaceCulling = false;
  m.disableLighting = true;
  return m;
}

export function buildClouds(scene: Scene): void {
  const mat = makeCloudSpriteMat(scene);

  // [x, y, z, w, h, speed]
  const defs: [number, number, number, number, number, number][] = [
    [-320, 180, -80,  200, 80,  0.9],
    [ 150, 200,  60,  180, 70,  1.1],
    [-100, 165, 200,  220, 85,  0.8],
    [ 380, 190, -180, 160, 60,  1.3],
    [  40, 175, 340,  240, 90,  0.7],
    [-460, 185, 110,  190, 72,  1.2],
    [ 560, 195, -260, 150, 58,  1.4],
    [ 100, 170, 480,  210, 80,  1.0],
    [-200, 210, -300, 280, 60,  0.6],
    [ 300, 220, 200,  240, 55,  1.1],
    [-50,  160, -400, 200, 70,  0.9],
    [ 450, 175,  80,  170, 65,  1.2],
  ];

  for (const [x, y, z, w, h, speed] of defs) {
    const plane = MeshBuilder.CreatePlane('cloud', { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.position.set(x, y, z);
    plane.billboardMode = Mesh.BILLBOARDMODE_Y;
    plane.material = mat;
    plane.isPickable = false;
    spriteClouds.push({ mesh: plane, speed });
  }
}

export function updateClouds(dt: number): void {
  for (const c of spriteClouds) {
    c.mesh.position.x -= c.speed * dt;
    if (c.mesh.position.x < -700) c.mesh.position.x = 700;
  }
}

function buildOliveGroves(scene: Scene): void {
  const positions: [number, number][] = [];
  for (let i = 0; i < 30; i++) positions.push([-200 + Math.random() * 120, -60 + Math.random() * 80]);
  for (let i = 0; i < 25; i++) positions.push([230 + Math.random() * 120, -70 + Math.random() * 70]);

  const trunkSrc   = MeshBuilder.CreateCylinder('ol-trunk-src', { diameterTop: 0.4, diameterBottom: 0.6, height: 3, tessellation: 7 }, scene);
  const foliageSrc = MeshBuilder.CreateSphere('ol-foliage-src', { diameter: 4.4, segments: 7 }, scene);
  trunkSrc.isVisible   = false;
  foliageSrc.isVisible = false;
  trunkSrc.material   = lmat('ol-t', 0x6a5030, scene);
  foliageSrc.material = lmat('ol-f', 0x4a6030, scene);

  const tM: number[] = [], fM: number[] = [];
  for (const [ox, oz] of positions) {
    const ty    = terrainH(ox, oz);
    const scale = 0.85 + Math.random() * 0.3;
    const ry    = Math.random() * Math.PI * 2;
    tM.push(...thinMatrix(ox, ty + 1.5,         oz, ry, scale, scale, scale).m);
    fM.push(...thinMatrix(ox, ty + 3 + scale * 1.2, oz, ry, scale, scale * 0.9, scale).m);
  }

  trunkSrc.thinInstanceSetBuffer('matrix',   new Float32Array(tM), 16);
  foliageSrc.thinInstanceSetBuffer('matrix', new Float32Array(fM), 16);
}

function buildCypresses(scene: Scene): void {
  const positions: [number, number][] = [];

  // Original row flanking the necropolis field at z = -175
  for (let cx = -30; cx <= 80; cx += 14) {
    positions.push([cx - 4, -175]);
    positions.push([cx + 4, -175]);
  }

  // Cypress avenue flanking the cardo approach (x ≈ 92) from bridge to necropolis
  for (let az = -128; az >= -170; az -= 13) {
    positions.push([92 - 9, az]);
    positions.push([92 + 9, az]);
  }

  // Dense cypresses ringing the necropolis perimeter
  const necroSpots: [number, number][] = [
    [-44,-183],[-32,-183],[-20,-183],[-8,-183],[4,-183],[16,-183],[28,-183],[40,-183],[52,-183],[68,-183],[80,-183],
    [-38,-225],[- 22,-228],[0,-228],[18,-228],[38,-228],[56,-228],[72,-225],
    [-40,-200],[-40,-212],[78,-198],[78,-210],
    [10,-230],[30,-232],[50,-230],
  ];
  for (const sp of necroSpots) positions.push(sp);

  // Cypresses near the chasm viewpoint and bridge approaches
  const chasmSpots: [number, number][] = [
    [78,-110],[84,-113],[100,-108],[106,-112],
    [70,-130],[66,-122],[112,-110],[118,-115],
  ];
  for (const sp of chasmSpots) positions.push(sp);

  // Hillside scatter
  for (let i = 0; i < 20; i++) positions.push([-100 + Math.random() * 200, 80 + Math.random() * 80]);

  // City approaches: lining the main north–south route through lower city
  for (let az = -30; az >= -92; az -= 10) {
    positions.push([88,  az]);
    positions.push([96,  az]);
  }

  // Theatre district: scattered around the cavea
  for (let i = 0; i < 10; i++) positions.push([198 + Math.random() * 40, -30 + Math.random() * 40]);

  // Agora surrounds
  const agoraRing: [number, number][] = [
    [105,-28],[130,-28],[115,-50],[125,-50],[98,-38],[138,-38],
  ];
  for (const sp of agoraRing) positions.push(sp);

  const foliageSrc = MeshBuilder.CreateCylinder('cy-f-src', { diameterTop: 0, diameterBottom: 3, height: 10, tessellation: 7 }, scene);
  const trunkSrc   = MeshBuilder.CreateCylinder('cy-t-src', { diameterTop: 0.4, diameterBottom: 0.5, height: 3.5, tessellation: 7 }, scene);
  foliageSrc.isVisible = trunkSrc.isVisible = false;
  foliageSrc.material = lmat('cy-f', 0x1e3018, scene);
  trunkSrc.material   = lmat('cy-t', 0x3a2a18, scene);

  const fM: number[] = [], tM: number[] = [];
  for (const [cx, cz] of positions) {
    const ty = terrainH(cx, cz);
    const h  = 0.85 + Math.random() * 0.3;
    const ry = Math.random() * Math.PI * 2;
    tM.push(...thinMatrix(cx, ty + 1.75,      cz, ry, h, h, h).m);
    fM.push(...thinMatrix(cx, ty + 3.5 + h*3, cz, ry, h, h, h).m);
  }
  trunkSrc.thinInstanceSetBuffer('matrix',   new Float32Array(tM), 16);
  foliageSrc.thinInstanceSetBuffer('matrix', new Float32Array(fM), 16);
}

// Oriental plane trees (Platanus orientalis) — broad domed canopy, near water and town squares
function buildPlaneTrees(scene: Scene): void {
  const positions: [number, number][] = [
    // Along the river banks east and west of the chasm
    [-180,-118],[-160,-118],[-140,-120],[-120,-118],
    [175,-118],[190,-116],[210,-120],[230,-118],
    // Town square / agora area
    [108,-44],[122,-44],[108,-52],[122,-52],
    // Philemon's courtyard surrounds
    [134,-82],[148,-82],[134,-92],[148,-92],
    // Acropolis base
    [-28,-20],[-14,-24],[18,-20],[32,-24],
  ];

  const trunkSrc   = MeshBuilder.CreateCylinder('pl-trunk-src', { diameterTop: 0.55, diameterBottom: 0.7, height: 4.5, tessellation: 9 }, scene);
  const foliageSrc = MeshBuilder.CreateSphere('pl-foliage-src', { diameter: 7, segments: 7 }, scene);
  trunkSrc.isVisible   = false;
  foliageSrc.isVisible = false;
  trunkSrc.material   = lmat('pl-t', 0x7a6040, scene);
  foliageSrc.material = lmat('pl-f', 0x3a5828, scene);

  const tM: number[] = [], fM: number[] = [];
  for (const [ox, oz] of positions) {
    const ty    = terrainH(ox, oz);
    const scale = 0.8 + Math.random() * 0.4;
    const ry    = Math.random() * Math.PI * 2;
    tM.push(...thinMatrix(ox, ty + 2.25,             oz, ry, scale, scale, scale).m);
    fM.push(...thinMatrix(ox, ty + 5 + scale * 0.8,  oz, ry, scale * 1.2, scale * 0.8, scale * 1.2).m);
  }
  trunkSrc.thinInstanceSetBuffer('matrix',   new Float32Array(tM), 16);
  foliageSrc.thinInstanceSetBuffer('matrix', new Float32Array(fM), 16);
}

// Aleppo / Turkish red pines (Pinus brutia) — conical, on drier hillsides and slopes
function buildPines(scene: Scene): void {
  const positions: [number, number][] = [];
  // Northern slopes toward Cadmus
  for (let i = 0; i < 22; i++) positions.push([-60 + Math.random() * 120, -230 - Math.random() * 60]);
  // Eastern hill flanks
  for (let i = 0; i < 18; i++) positions.push([220 + Math.random() * 80, -60 + Math.random() * 60]);
  // Western valley walls
  for (let i = 0; i < 14; i++) positions.push([-160 + Math.random() * 40, -40 + Math.random() * 80]);

  const trunkSrc   = MeshBuilder.CreateCylinder('pn-trunk-src', { diameterTop: 0.3, diameterBottom: 0.5, height: 5, tessellation: 7 }, scene);
  const can1Src    = MeshBuilder.CreateCylinder('pn-can1-src',  { diameterTop: 0, diameterBottom: 4.5, height: 5, tessellation: 8 }, scene);
  const can2Src    = MeshBuilder.CreateCylinder('pn-can2-src',  { diameterTop: 0, diameterBottom: 3,   height: 4, tessellation: 8 }, scene);
  trunkSrc.isVisible = can1Src.isVisible = can2Src.isVisible = false;
  trunkSrc.material = lmat('pn-t', 0x5a3818, scene);
  can1Src.material  = lmat('pn-c1', 0x2a4420, scene);
  can2Src.material  = lmat('pn-c2', 0x304e26, scene);

  const tM: number[] = [], c1M: number[] = [], c2M: number[] = [];
  for (const [ox, oz] of positions) {
    const ty    = terrainH(ox, oz);
    const scale = 0.75 + Math.random() * 0.45;
    const ry    = Math.random() * Math.PI * 2;
    tM.push( ...thinMatrix(ox, ty + 2.5,          oz, ry, scale, scale, scale).m);
    c1M.push(...thinMatrix(ox, ty + 4.5 + scale,  oz, ry, scale, scale, scale).m);
    c2M.push(...thinMatrix(ox, ty + 7.5 + scale,  oz, ry, scale, scale, scale).m);
  }
  trunkSrc.thinInstanceSetBuffer('matrix',  new Float32Array(tM),  16);
  can1Src.thinInstanceSetBuffer('matrix',   new Float32Array(c1M), 16);
  can2Src.thinInstanceSetBuffer('matrix',   new Float32Array(c2M), 16);
}

function buildReeds(scene: Scene): void {
  const reedPositions: [number, number][] = [];
  for (let i = 0; i < 40; i++) {
    const rx = -200 + Math.random() * 240, rz = -128 + Math.random() * 8;
    if (rx > 50 && rx < 175) continue;
    reedPositions.push([rx, rz]);
  }
  for (let i = 0; i < 30; i++) reedPositions.push([170 + Math.random() * 200, -128 + Math.random() * 8]);

  const reedSrc = MeshBuilder.CreateCylinder('reed-src', { diameterTop: 0.08, diameterBottom: 0.12, height: 2.8, tessellation: 5 }, scene);
  reedSrc.isVisible = false;
  reedSrc.material = lmat('reed', 0x8a8040, scene);

  const rM: number[] = [];
  for (const [rx, rz] of reedPositions) {
    const ty = terrainH(rx, rz);
    const s  = 0.7 + Math.random() * 0.6;
    const ry = Math.random() * Math.PI * 2;
    const tiltZ = (Math.random() - 0.5) * 0.25;
    const q = Quaternion.RotationYawPitchRoll(ry, 0, tiltZ);
    rM.push(...Matrix.Compose(new Vector3(s, s, s), q, new Vector3(rx, ty + 1.4, rz)).m);
  }
  reedSrc.thinInstanceSetBuffer('matrix', new Float32Array(rM), 16);
}

export function buildNature(scene: Scene): void {
  buildOliveGroves(scene);
  buildCypresses(scene);
  buildPlaneTrees(scene);
  buildPines(scene);
  buildReeds(scene);

  // Snow cap on Mount Cadmus (southern peak, visible looking south along the cardo)
  // Terrain at (0, 750) reaches ~420 u; sphere sits just below summit.
  const snowMat = new StandardMaterial('snow', scene);
  snowMat.diffuseColor  = new Color3(0.95, 0.97, 1.0);
  snowMat.specularColor = new Color3(0.3, 0.3, 0.3);
  const snow = MeshBuilder.CreateSphere('cadmus-snow', { diameter: 200, segments: 12 }, scene);
  snow.scaling.y = 0.28;
  snow.position.set(0, 360, 700);
  snow.material = snowMat;
  snow.isPickable = false;
}
