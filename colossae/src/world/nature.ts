import { Scene, MeshBuilder, StandardMaterial, Color3, Matrix, Quaternion, Vector3, TransformNode } from '@babylonjs/core';
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

// Cloud state — roots moved each frame by updateClouds()
interface CloudGroup { root: TransformNode; speed: number; }
const cloudGroups: CloudGroup[] = [];

export function buildClouds(scene: Scene): void {
  // Two materials: bright top and slightly darker underside
  const topMat = new StandardMaterial('cloud-top', scene);
  topMat.diffuseColor  = new Color3(1, 0.97, 0.93);
  topMat.emissiveColor = new Color3(0.72, 0.68, 0.62);
  topMat.alpha = 0.88;
  topMat.disableLighting = true;
  topMat.backFaceCulling = false;

  const botMat = new StandardMaterial('cloud-bot', scene);
  botMat.diffuseColor  = new Color3(0.78, 0.72, 0.65);
  botMat.emissiveColor = new Color3(0.48, 0.44, 0.40);
  botMat.alpha = 0.75;
  botMat.disableLighting = true;
  botMat.backFaceCulling = false;

  // Each entry: [cx, cy, cz, mainR, speed]
  const defs: [number, number, number, number, number][] = [
    [-300, 220, -100,  55, 1.4],
    [ 200, 240,  -80,  45, 1.1],
    [-100, 210,  200,  60, 1.6],
    [ 400, 230, -200,  42, 1.3],
    [  50, 200,  350,  68, 1.0],
    [-500, 215,  100,  50, 1.5],
    [ 600, 225, -300,  38, 1.7],
    [ 100, 235,  500,  58, 1.2],
  ];

  for (const [cx, cy, cz, r, speed] of defs) {
    const root = new TransformNode('cloud-root', scene);
    root.position.set(cx, cy, cz);

    // Main body — flattened ellipsoid
    const main = MeshBuilder.CreateSphere('cloud-m', { diameter: r * 2, segments: 12 }, scene);
    main.scaling.set(1, 0.45, 0.72);
    main.position.set(0, 0, 0);
    main.material = topMat;
    main.isPickable = false;
    main.parent = root;

    // Flat dark underside disc
    const belly = MeshBuilder.CreateSphere('cloud-b', { diameter: r * 1.7, segments: 10 }, scene);
    belly.scaling.set(1, 0.18, 0.68);
    belly.position.set(0, -r * 0.18, 0);
    belly.material = botMat;
    belly.isPickable = false;
    belly.parent = root;

    // Bumps — 3-4 puffs on top
    const bumpCount = 3 + Math.floor(Math.random() * 2);
    for (let b = 0; b < bumpCount; b++) {
      const br     = r * (0.4 + Math.random() * 0.35);
      const angle  = (b / bumpCount) * Math.PI * 2;
      const spread = r * 0.55;
      const bump = MeshBuilder.CreateSphere(`cloud-bump-${cx}-${b}`, { diameter: br * 2, segments: 10 }, scene);
      bump.scaling.set(1, 0.55, 0.8);
      bump.position.set(Math.cos(angle) * spread * 0.6, r * 0.12, Math.sin(angle) * spread * 0.3);
      bump.material = topMat;
      bump.isPickable = false;
      bump.parent = root;
    }

    cloudGroups.push({ root, speed });
  }
}

export function updateClouds(dt: number): void {
  for (const g of cloudGroups) {
    g.root.position.x -= g.speed * dt;
    if (g.root.position.x < -900) g.root.position.x = 900;
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

  // Hillside scatter (existing)
  for (let i = 0; i < 20; i++) positions.push([-100 + Math.random() * 200, 80 + Math.random() * 80]);

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
  buildReeds(scene);
}
