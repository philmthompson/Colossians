/**
 * Procedural PBR materials for Colossae.
 *
 * All albedo and normal textures are generated at startup via canvas — no
 * external image files are required.  Each exported function returns a cached
 * PBRMaterial instance; call it once and share the result across meshes.
 */

import { Scene, PBRMaterial, Texture } from '@babylonjs/core';

// ─── Low-level texture helpers ────────────────────────────────────────────────

type PixelFn = (px: number, py: number) => [number, number, number];

function bakeTexture(scene: Scene, size: number, fn: PixelFn): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const [r, g, b] = fn(px, py);
      const i = (py * size + px) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new Texture(canvas.toDataURL('image/jpeg', 0.95), scene);
  tex.wrapU = tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

// Derive tangent-space normal map from a grayscale height function.
function bakeNormal(scene: Scene, size: number, heightFn: (px: number, py: number) => number, strength = 1.0): Texture {
  const h = (px: number, py: number) => heightFn(
    ((px % size) + size) % size,
    ((py % size) + size) % size,
  );
  return bakeTexture(scene, size, (px, py) => {
    const dX = h(px + 1, py) - h(px - 1, py);
    const dY = h(px, py + 1) - h(px, py - 1);
    // Tangent-space normal: (-dX·s, -dY·s, 1) → remap to [0,255]
    const s  = strength * 4;
    const nx = Math.max(-1, Math.min(1, -dX * s));
    const ny = Math.max(-1, Math.min(1, -dY * s));
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return [
      Math.round((nx * 0.5 + 0.5) * 255),
      Math.round((ny * 0.5 + 0.5) * 255),
      Math.round((nz * 0.5 + 0.5) * 255),
    ];
  });
}

// Minimal deterministic value noise (not seeded, only used for textures).
function hash(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash(xi, yi),     b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (a + (b - a) * u) + ((c - a) + (a - b - c + d) * u) * v;
}

function fbm(x: number, y: number, octaves = 4): number {
  let v = 0, amp = 0.5, freq = 1.0, sum = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq) * amp;
    sum += amp; amp *= 0.5; freq *= 2.1;
  }
  return v / sum;
}

function clamp(v: number, lo = 0, hi = 255): number { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

// ─── PBR builder ─────────────────────────────────────────────────────────────

interface PBRDesc {
  albedo: Texture;
  normal: Texture;
  roughness: number;
  metallic: number;
  uScale: number;
  vScale: number;
}

function buildPBR(scene: Scene, name: string, desc: PBRDesc): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  mat.albedoTexture = desc.albedo;
  mat.bumpTexture   = desc.normal;
  if (mat.bumpTexture) (mat.bumpTexture as Texture).level = 1.0;
  mat.roughness = desc.roughness;
  mat.metallic  = desc.metallic;
  for (const tex of [mat.albedoTexture, mat.bumpTexture]) {
    if (!tex) continue;
    (tex as Texture).uScale = desc.uScale;
    (tex as Texture).vScale = desc.vScale;
  }
  mat.useAmbientOcclusionFromMetallicTextureRed = false;
  return mat;
}

// ─── Material factories ───────────────────────────────────────────────────────
// Each function creates and returns a new PBRMaterial instance. Callers should
// cache the result rather than calling these on every mesh.

const SIZE = 256;

/**
 * Rough lime-plaster stucco — warm cream with subtle aggregate variation.
 * Use for house and insula walls.
 */
export function makeStuccoMat(scene: Scene, name = 'stucco'): PBRMaterial {
  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const f  = fbm(px / SIZE * 6, py / SIZE * 6, 4);
    const f2 = fbm(px / SIZE * 18 + 5, py / SIZE * 18 + 3, 3) * 0.35;
    const base = 198 + f * 28 + f2 * 20;
    // Warm cream: R strong, G medium, B low
    return [
      clamp(base + 8),
      clamp(base - 4),
      clamp(base - 28),
    ];
  });

  const normal = bakeNormal(scene, SIZE, (px, py) =>
    fbm(px / SIZE * 12, py / SIZE * 12, 4) * 0.18
  , 1.4);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.90, metallic: 0.0, uScale: 3, vScale: 3 });
}

/**
 * Terracotta barrel-tile roof — raked rows of curved interlocking tiles.
 */
export function makeTerracottaMat(scene: Scene, name = 'terracotta'): PBRMaterial {
  const TILE_W = 28, TILE_H = 40;   // pixels per tile in the 256-px atlas

  function tileHeight(px: number, py: number): number {
    const tx = ((px % TILE_W) + TILE_W) % TILE_W;
    const ty = ((py % TILE_H) + TILE_H) % TILE_H;
    const cu = Math.cos((tx / TILE_W - 0.5) * Math.PI);          // barrel curve
    const groove = ty < 3 || ty > TILE_H - 4 ? -0.08 : 0;       // gap between rows
    return cu * 0.12 + groove + fbm(px / SIZE * 40, py / SIZE * 40, 2) * 0.04;
  }

  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const tx = ((px % TILE_W) + TILE_W) % TILE_W;
    const ty = ((py % TILE_H) + TILE_H) % TILE_H;

    const isGroove = ty < 3 || ty > TILE_H - 4;
    const n  = fbm(px / SIZE * 30, py / SIZE * 30, 3);
    const cu = Math.cos((tx / TILE_W - 0.5) * Math.PI);

    const rBase = isGroove ? 95  : lerp(148, 178, n * 0.7 + cu * 0.3);
    const gBase = isGroove ? 48  : lerp(62,  82,  n * 0.5 + cu * 0.15);
    const bBase = isGroove ? 30  : lerp(38,  52,  n * 0.4);
    return [clamp(rBase), clamp(gBase), clamp(bBase)];
  });

  const normal = bakeNormal(scene, SIZE, tileHeight, 2.2);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.92, metallic: 0.0, uScale: 5, vScale: 4 });
}

/**
 * Limestone ashlar — warm beige with subtle horizontal bedding lines and grain.
 * Use for temple, agora, bath, wall, bridge stone.
 */
export function makeLimestoneMat(scene: Scene, name = 'limestone'): PBRMaterial {
  const COURSE_H = 32;

  function blockHeight(px: number, py: number): number {
    const ty = ((py % COURSE_H) + COURSE_H) % COURSE_H;
    const joint = ty < 3 ? -0.12 : 0;
    const rowOffset = Math.floor(py / COURSE_H) % 2 === 0 ? 0 : SIZE * 0.5;
    const BW = 72;
    const tx = ((px + rowOffset) % BW);
    const vjoint = tx < 3 ? -0.06 : 0;
    return joint + vjoint + fbm(px / SIZE * 16, py / SIZE * 16, 3) * 0.06;
  }

  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const ty  = ((py % COURSE_H) + COURSE_H) % COURSE_H;
    const isH = ty < 3;
    const rowOffset = Math.floor(py / COURSE_H) % 2 === 0 ? 0 : SIZE * 0.5;
    const BW  = 72;
    const tx  = ((px + rowOffset) % BW);
    const isV = tx < 3;
    const n   = fbm(px / SIZE * 10, py / SIZE * 10, 4);
    const n2  = fbm(px / SIZE * 40 + 3.1, py / SIZE * 40 + 1.7, 2) * 0.3;
    if (isH || isV) {
      return [clamp(140), clamp(128), clamp(105)];
    }
    const base = 170 + n * 30 + n2 * 14;
    return [clamp(base + 8), clamp(base), clamp(base - 22)];
  });

  const normal = bakeNormal(scene, SIZE, blockHeight, 1.8);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.84, metallic: 0.0, uScale: 4, vScale: 4 });
}

/**
 * Smooth marble-like column stone — light ivory with faint veining.
 * Use for column shafts and entablatures.
 */
export function makeColumnMat(scene: Scene, name = 'column-stone'): PBRMaterial {
  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const n   = fbm(px / SIZE * 4, py / SIZE * 12, 4);
    const n2  = fbm(px / SIZE * 2 + 7, py / SIZE * 6 + 3, 3) * 0.5;
    const vein = Math.max(0, 1 - Math.abs(n - 0.5) * 6) * 0.12;   // faint vein
    const base = 212 + n * 18 + n2 * 10;
    return [
      clamp(base + 6 - vein * 30),
      clamp(base + 2 - vein * 20),
      clamp(base - 14 - vein * 12),
    ];
  });

  const normal = bakeNormal(scene, SIZE, (px, py) =>
    fbm(px / SIZE * 8, py / SIZE * 8, 3) * 0.06
  , 0.8);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.55, metallic: 0.0, uScale: 2, vScale: 6 });
}

/**
 * Worn sandstone — darker, orange-tan with more surface pitting.
 * Use for the acropolis wall, bridge, older utilitarian structures.
 */
export function makeSandstoneMat(scene: Scene, name = 'sandstone'): PBRMaterial {
  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const n  = fbm(px / SIZE * 14, py / SIZE * 14, 5);
    const n2 = fbm(px / SIZE * 50, py / SIZE * 50, 2) * 0.2;
    const base = 155 + n * 38 + n2 * 18;
    return [
      clamp(base + 10),
      clamp(base - 12),
      clamp(base - 38),
    ];
  });

  const normal = bakeNormal(scene, SIZE, (px, py) =>
    fbm(px / SIZE * 20, py / SIZE * 20, 5) * 0.22
  , 2.0);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.95, metallic: 0.0, uScale: 4, vScale: 4 });
}

/**
 * Paved limestone plaza — flat ashlar slabs, polished by foot traffic.
 */
export function makePavingMat(scene: Scene, name = 'paving'): PBRMaterial {
  const SLAB = 48;

  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const tx = ((px % SLAB) + SLAB) % SLAB;
    const ty = ((py % SLAB) + SLAB) % SLAB;
    const isJoint = tx < 3 || ty < 3;
    const n   = fbm(px / SIZE * 6, py / SIZE * 6, 3);
    if (isJoint) return [clamp(140), clamp(130), clamp(108)];
    const base = 182 + n * 22;
    return [clamp(base + 6), clamp(base), clamp(base - 18)];
  });

  const normal = bakeNormal(scene, SIZE, (px, py) => {
    const tx = ((px % SLAB) + SLAB) % SLAB;
    const ty = ((py % SLAB) + SLAB) % SLAB;
    const joint = (tx < 3 || ty < 3) ? -0.06 : 0;
    return joint + fbm(px / SIZE * 8, py / SIZE * 8, 3) * 0.03;
  }, 1.2);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.65, metallic: 0.0, uScale: 5, vScale: 5 });
}

/**
 * Varied earthy ground — sandy soil with subtle fbm grain variation.
 * Used on the terrain mesh. Large uScale/vScale so it tiles across 2000 units.
 */
export function makeTerrainMat(scene: Scene, name = 'terrain-ground'): PBRMaterial {
  const albedo = bakeTexture(scene, SIZE, (px, py) => {
    const f1 = fbm(px / SIZE * 4, py / SIZE * 4, 5);
    const f2 = fbm(px / SIZE * 12 + 3.7, py / SIZE * 12 + 1.9, 4) * 0.4;
    const f3 = fbm(px / SIZE * 32 + 9.1, py / SIZE * 32 + 6.3, 3) * 0.15;
    const base = 155 + f1 * 42 + f2 * 28 + f3 * 14;
    // Warm sandy earth: R dominant, G moderate, B low
    return [
      clamp(base + 12),
      clamp(base - 8),
      clamp(base - 32),
    ];
  });

  const normal = bakeNormal(scene, SIZE, (px, py) =>
    fbm(px / SIZE * 16, py / SIZE * 16, 5) * 0.14
  , 1.6);

  return buildPBR(scene, name, { albedo, normal, roughness: 0.97, metallic: 0.0, uScale: 80, vScale: 80 });
}
