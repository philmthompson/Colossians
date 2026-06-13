import { Scene, Mesh, VertexData } from '@babylonjs/core';
import { makeTerrainMat } from './materials';

function gauss(x: number, z: number, cx: number, cz: number, r: number, h: number) {
  const dx = x - cx, dz = z - cz;
  return h * Math.exp(-(dx * dx + dz * dz) / (2 * r * r));
}

export function terrainH(x: number, z: number): number {
  let h = 0;
  h += 1.2 * Math.sin(x * 0.009 + 0.7) * Math.cos(z * 0.011 + 1.1);
  h += 0.6 * Math.sin(x * 0.021 - 0.3) * Math.cos(z * 0.019 + 0.5);
  h += 0.3 * Math.sin(x * 0.047) * Math.cos(z * 0.043 - 0.9);
  h += gauss(x, z, -25,  4,  32, 20);
  h += gauss(x, z,  32, -20,  28, 15);
  h += gauss(x, z,   0,  -8,  55,  8);
  h += gauss(x, z, 224, -48, 28, 13);
  h += gauss(x, z,   0, 750, 320, 250);
  h += gauss(x, z, 200, 720, 280, 220);
  h += gauss(x, z,-200, 780, 260, 200);
  h += gauss(x, z,   0, -520, 200, 160);   // main peak (Cadmus/Honaz)
  h += gauss(x, z, 180, -560, 160, 130);
  h += gauss(x, z,-180, -500, 170, 120);
  h += gauss(x, z, 380, -600, 140,  90);
  h += gauss(x, z,-360, -580, 150,  85);
  if (z > 140) { const t = (z - 140) / 200; h += t * t * 18; }
  const dg = z - (-120);
  h -= 13 * Math.exp(-(dg * dg) / (2 * 8 * 8));
  if (x > 50 && x < 175) {
    const cx2 = (x - 50) / 125;
    const bell = Math.sin(Math.PI * cx2);
    const dcz = z - (-120);
    h -= 4 * bell * Math.exp(-(dcz * dcz) / (2 * 6 * 6));
  }
  return h;
}

const SEGS = 200;
const SIZE = 2000;

export function buildTerrain(scene: Scene): Mesh {
  const step = SIZE / SEGS;
  const N = SEGS + 1;
  const vertCount = N * N;
  const positions = new Float32Array(vertCount * 3);
  const indices: number[] = [];

  for (let row = 0; row <= SEGS; row++) {
    for (let col = 0; col <= SEGS; col++) {
      const i = row * N + col;
      const x = -SIZE / 2 + col * step;
      const z = -SIZE / 2 + row * step;
      positions[i * 3]     = x;
      positions[i * 3 + 1] = terrainH(x, z);
      positions[i * 3 + 2] = z;
    }
  }

  for (let row = 0; row < SEGS; row++) {
    for (let col = 0; col < SEGS; col++) {
      const a = row * N + col;
      const b = a + 1;
      const c = (row + 1) * N + col;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const normals = new Float32Array(vertCount * 3);
  VertexData.ComputeNormals(positions, indices, normals);

  const uvs = new Float32Array(vertCount * 2);
  for (let row = 0; row <= SEGS; row++) {
    for (let col = 0; col <= SEGS; col++) {
      const i = row * N + col;
      uvs[i * 2]     = col / SEGS;
      uvs[i * 2 + 1] = row / SEGS;
    }
  }

  const ROAD_Z = -92, ROAD_W = 7;
  const CARDO_X = 92, CARDO_W = 6;
  const colors = new Float32Array(vertCount * 4);

  for (let i = 0; i < vertCount; i++) {
    const x  = positions[i * 3];
    const y  = positions[i * 3 + 1];
    const z  = positions[i * 3 + 2];
    const ny = normals[i * 3 + 1];

    let r: number, g: number, b: number;

    if (ny < 0.55) {
      r = 0.35; g = 0.30; b = 0.25;
    } else if (ny < 0.78) {
      const blend = (ny - 0.55) / 0.23;
      let hr: number, hg: number, hb: number;
      if (y > 180)     { hr = 0.92; hg = 0.93; hb = 0.95; }
      else if (y > 30) { hr = 0.58; hg = 0.52; hb = 0.44; }
      else              { hr = 0.46; hg = 0.52; hb = 0.30; }
      r = 0.35 + (hr - 0.35) * blend;
      g = 0.30 + (hg - 0.30) * blend;
      b = 0.25 + (hb - 0.25) * blend;
    } else {
      if (y > 180)      { r = 0.92; g = 0.93; b = 0.95; }
      else if (y > 140) { const t = (y-140)/40; r = 0.62+0.3*t; g = 0.58+0.35*t; b = 0.50+0.45*t; }
      else if (y > 30)  { r = 0.58; g = 0.52; b = 0.44; }
      else if (y > 12) {
        const isPasture = x > 180 && z > -90 && z < 50;
        r = isPasture ? 0.52 : 0.70;
        g = isPasture ? 0.65 : 0.62;
        b = isPasture ? 0.32 : 0.40;
      }
      else if (y > 3) {
        const isPasture = x > 180 && z > -90 && z < 50;
        r = isPasture ? 0.36 : 0.46;
        g = isPasture ? 0.58 : 0.52;
        b = isPasture ? 0.28 : 0.30;
      }
      else if (y < -6) {
        const inChasmRiver = (x > 50 && x < 175) && (z > -132 && z < -108);
        const riverBlend = inChasmRiver ? Math.min(1, (-6 - y) / 6) : 0;
        r = 0.22 - riverBlend * 0.08;
        g = 0.26 + riverBlend * 0.04;
        b = 0.28 + riverBlend * 0.22;
      }
      else               { r = 0.42; g = 0.48; b = 0.28; }
    }

    const onRoad      = Math.abs(z - ROAD_Z) < ROAD_W;
    const onCardo     = Math.abs(x - CARDO_X) < CARDO_W && z > -92 && z < 10;
    const onNecroSpur = Math.abs(x - 22) < 5 && z < -92 && z > -190;

    if (onRoad || onCardo || onNecroSpur) {
      r = r * 0.6 + 0.72 * 0.4;
      g = g * 0.6 + 0.64 * 0.4;
      b = b * 0.6 + 0.44 * 0.4;
    }

    colors[i * 4]     = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 1;
  }

  const vd = new VertexData();
  vd.positions = positions;
  vd.indices   = indices;
  vd.normals   = normals;
  vd.colors    = colors;
  vd.uvs       = uvs;

  const mesh = new Mesh('terrain', scene);
  vd.applyToMesh(mesh);
  mesh.checkCollisions = true;

  const mat = makeTerrainMat(scene);
  mesh.material = mat;

  return mesh;
}
