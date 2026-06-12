import { Scene, MeshBuilder, StandardMaterial, Color3, Matrix, Quaternion, Vector3 } from '@babylonjs/core';
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

export function buildClouds(scene: Scene): void {
  const mat = new StandardMaterial('cloud-mat', scene);
  mat.diffuseColor  = new Color3(1, 0.91, 0.78);
  mat.emissiveColor = new Color3(0.6, 0.55, 0.47);
  mat.alpha = 0.55;
  mat.disableLighting = true;

  const positions: [number, number, number, number, number][] = [
    [-300, 220, -100, 90, 22], [200, 240, -80, 70, 18],
    [-100, 210,  200, 110, 20], [400, 230, -200, 80, 17],
    [50,  200,  350, 120, 25],
  ];
  for (const [cx, cy, cz, rx, ry] of positions) {
    const c = MeshBuilder.CreateSphere('cloud', { diameter: rx * 2, segments: 10 }, scene);
    c.scaling.y = ry / rx;
    c.scaling.z = 0.6;
    c.position.set(cx, cy, cz);
    c.material = mat;
    c.isPickable = false;
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
  for (let cx = -30; cx <= 80; cx += 14) {
    positions.push([cx - 4, -175]);
    positions.push([cx + 4, -175]);
  }
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
