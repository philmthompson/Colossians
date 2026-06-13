import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Matrix, Quaternion, Vector3, TransformNode, Texture, Material } from '@babylonjs/core';
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

// ─── Procedural cloud system ──────────────────────────────────────────────────

interface CloudMaterials {
  white: StandardMaterial;
  bright: StandardMaterial;
  gray: StandardMaterial;
  dark: StandardMaterial;
  wispy: StandardMaterial;
  baseShadow: StandardMaterial;
}

interface CloudPreset {
  minPuffs: number; maxPuffs: number;
  minSize: number;  maxSize: number;
  minSquash: number; maxSquash: number;
  width: number; depth: number; height: number;
  verticalBias: number;
  baseWidth: number; baseDepth: number; baseDrop: number;
  materials: (keyof CloudMaterials)[];
}

interface CloudGroupMeta { type: string; speed: number; originalX: number; originalZ: number; }
interface PuffMeta { base: Vector3; phase: number; wobble: number; }

interface CloudOptions {
  cloudCount: number;
  areaSize: number;
  minHeight: number;
  maxHeight: number;
  wind: Vector3;
  textureSize: number;
  renderCloudBases: boolean;
  seed: number;
}

class ProceduralCloudSystem {
  #scene: Scene;
  #options: CloudOptions;
  #root: TransformNode;
  #cloudGroups: TransformNode[] = [];
  #materials: CloudMaterials;
  #rngState: number;

  constructor(scene: Scene, options: Partial<CloudOptions> = {}) {
    this.#scene = scene;
    this.#options = {
      cloudCount:        options.cloudCount        ?? 55,
      areaSize:          options.areaSize          ?? 1400,
      minHeight:         options.minHeight         ?? 120,
      maxHeight:         options.maxHeight         ?? 260,
      wind:              options.wind              ?? new Vector3(0.6, 0, 0.15),
      textureSize:       options.textureSize       ?? 256,
      renderCloudBases:  options.renderCloudBases  ?? true,
      seed:              options.seed              ?? 42,
    };
    this.#rngState  = this.#options.seed;
    this.#root      = new TransformNode('cloud-system-root', scene);
    this.#materials = this.#createMaterials();
    this.#generate();
    this.#animate();
  }

  dispose() {
    this.#root.dispose();
    for (const mat of Object.values(this.#materials)) mat.dispose();
  }

  // ---------- Core generation ----------

  #generate() {
    const types: CloudPreset['materials'][0][] = [];
    const typeNames = ['cumulus', 'cumulus', 'stratus', 'cirrus', 'storm'] as const;
    for (let i = 0; i < this.#options.cloudCount; i++) {
      const type = typeNames[Math.floor(this.#rand() * typeNames.length)];
      const x = this.#randRange(-this.#options.areaSize / 2, this.#options.areaSize / 2);
      const z = this.#randRange(-this.#options.areaSize / 2, this.#options.areaSize / 2);
      const y = this.#randRange(this.#options.minHeight, this.#options.maxHeight);
      this.#createCloud(type, new Vector3(x, y, z), this.#randRange(0.75, 1.8));
    }
    void types;
  }

  #createCloud(type: string, position: Vector3, scale: number) {
    const group = new TransformNode(`cloud-${type}`, this.#scene);
    group.position.copyFrom(position);
    group.parent = this.#root;

    const preset = this.#getPreset(type);
    const puffCount = Math.floor(this.#randRange(preset.minPuffs, preset.maxPuffs) * scale);

    for (let i = 0; i < puffCount; i++) {
      const local = this.#cloudLocalPosition(type, preset, scale);
      const size  = this.#randRange(preset.minSize, preset.maxSize) * scale;
      const squash = this.#randRange(preset.minSquash, preset.maxSquash);

      const plane = MeshBuilder.CreatePlane(`cloud-puff-${type}`, {
        width: size, height: size * squash,
        sideOrientation: Mesh.DOUBLESIDE,
      }, this.#scene);

      plane.parent = group;
      plane.position.copyFrom(local);
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.rotation.z = this.#randRange(-Math.PI, Math.PI);
      plane.isPickable = false;

      const mKey = preset.materials[Math.floor(this.#rand() * preset.materials.length)];
      plane.material = this.#materials[mKey];

      const meta: PuffMeta = { base: local.clone(), phase: this.#randRange(0, Math.PI * 2), wobble: this.#randRange(0.05, 0.25) };
      plane.metadata = meta;
    }

    if (this.#options.renderCloudBases && type !== 'cirrus') {
      this.#addCloudBase(group, preset, scale);
    }

    const meta: CloudGroupMeta = { type, speed: this.#randRange(0.6, 1.4), originalX: position.x, originalZ: position.z };
    group.metadata = meta;
    this.#cloudGroups.push(group);
  }

  #addCloudBase(group: TransformNode, preset: CloudPreset, scale: number) {
    const base = MeshBuilder.CreatePlane('cloud-soft-base', {
      width: preset.baseWidth * scale, height: preset.baseDepth * scale,
      sideOrientation: Mesh.DOUBLESIDE,
    }, this.#scene);
    base.parent = group;
    base.position.y -= preset.baseDrop * scale;
    base.rotation.x = Math.PI / 2;
    base.material = this.#materials.baseShadow;
    base.isPickable = false;
  }

  // ---------- Materials and textures ----------

  #createMaterials(): CloudMaterials {
    const cloudWhite = this.#makeCloudTexture('cloud-white', { contrast: 1.25, density: 0.72, edgeSoftness: 1.15, streak: 0.0 });
    const cloudGray  = this.#makeCloudTexture('cloud-gray',  { contrast: 1.45, density: 0.82, edgeSoftness: 1.0,  streak: 0.0 });
    const cloudWispy = this.#makeCloudTexture('cloud-wispy', { contrast: 1.6,  density: 0.42, edgeSoftness: 1.6,  streak: 0.75 });
    const baseShadTex = this.#makeCloudTexture('cloud-base-shadow', { contrast: 1.1, density: 0.55, edgeSoftness: 1.35, streak: 0.2 });

    return {
      white:      this.#makeMaterial('mat-cloud-white',  cloudWhite,  new Color3(1.0,  0.98, 0.92), new Color3(0.42, 0.45, 0.5),  0.82),
      bright:     this.#makeMaterial('mat-cloud-bright', cloudWhite,  new Color3(1.0,  1.0,  0.98), new Color3(0.55, 0.58, 0.62), 0.68),
      gray:       this.#makeMaterial('mat-cloud-gray',   cloudGray,   new Color3(0.72, 0.72, 0.76), new Color3(0.22, 0.24, 0.28), 0.74),
      dark:       this.#makeMaterial('mat-cloud-dark',   cloudGray,   new Color3(0.42, 0.43, 0.48), new Color3(0.12, 0.13, 0.16), 0.78),
      wispy:      this.#makeMaterial('mat-cloud-wispy',  cloudWispy,  new Color3(0.96, 0.98, 1.0),  new Color3(0.48, 0.52, 0.58), 0.48),
      baseShadow: this.#makeMaterial('mat-cloud-base-shadow', baseShadTex, new Color3(0.35, 0.36, 0.4), new Color3(0.08, 0.09, 0.11), 0.28),
    };
  }

  #makeMaterial(name: string, texture: Texture, diffuse: Color3, emissive: Color3, alpha: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.#scene);
    mat.diffuseTexture  = texture;
    mat.opacityTexture  = texture;
    mat.useAlphaFromDiffuseTexture = true;
    mat.diffuseColor    = diffuse;
    mat.emissiveColor   = emissive;
    mat.alpha           = alpha;
    mat.backFaceCulling = false;
    mat.needDepthPrePass = false;
    mat.separateCullingPass = false;
    mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
    return mat;
  }

  #makeCloudTexture(name: string, settings: { contrast: number; density: number; edgeSoftness: number; streak: number }): Texture {
    const size = this.#options.textureSize;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(size, size);
    const data  = image.data;
    const { contrast, density, edgeSoftness, streak } = settings;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 2 - 1, ny = (py / size) * 2 - 1;
        const r  = Math.sqrt(nx * nx + ny * ny);
        const edge = Math.max(0, 1 - Math.pow(r, edgeSoftness));

        let n = 0, amp = 1, freq = 2.5, total = 0;
        for (let o = 0; o < 5; o++) {
          n += this.#valueNoise(px / size * freq, py / size * freq * (1 + streak * 2.5)) * amp;
          total += amp;
          amp *= 0.52; freq *= 2.1;
        }
        n /= total;

        if (streak > 0) {
          const h = this.#valueNoise(px / size * 8, py / size * 1.2);
          n = n + (h - n) * streak;
        }

        let alpha = Math.pow(Math.max(0, n * contrast - (1 - density)), 1.25) * edge;
        alpha = Math.min(1, Math.max(0, alpha));

        const idx   = (py * size + px) * 4;
        const shade = Math.floor(235 + n * 20);
        data[idx] = data[idx + 1] = data[idx + 2] = shade;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);

    const tex = new Texture(canvas.toDataURL('image/png'), this.#scene, false, true);
    tex.hasAlpha = true;
    tex.wrapU = tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    void name;
    return tex;
  }

  // ---------- Presets ----------

  #getPreset(type: string): CloudPreset {
    const presets: Record<string, CloudPreset> = {
      cumulus: { minPuffs:16,maxPuffs:34, minSize:34,maxSize:85, minSquash:0.65,maxSquash:1.15, width:140,depth:70,height:42, verticalBias:0.8, baseWidth:190,baseDepth:75,baseDrop:24, materials:['white','bright','white','gray'] },
      stratus: { minPuffs:22,maxPuffs:48, minSize:55,maxSize:145, minSquash:0.28,maxSquash:0.55, width:320,depth:80,height:18, verticalBias:0.2, baseWidth:400,baseDepth:95,baseDrop:12, materials:['white','gray','gray','bright'] },
      cirrus:  { minPuffs:10,maxPuffs:22, minSize:85,maxSize:220, minSquash:0.16,maxSquash:0.34, width:360,depth:40,height:16, verticalBias:0.1, baseWidth:0,baseDepth:0,baseDrop:0, materials:['wispy','wispy','bright'] },
      storm:   { minPuffs:32,maxPuffs:70, minSize:60,maxSize:155, minSquash:0.5,maxSquash:1.2, width:260,depth:130,height:78, verticalBias:0.6, baseWidth:340,baseDepth:140,baseDrop:36, materials:['gray','dark','gray','white'] },
    };
    return presets[type] ?? presets['cumulus'];
  }

  #cloudLocalPosition(type: string, preset: CloudPreset, scale: number): Vector3 {
    const x = this.#randGaussian() * preset.width * 0.35 * scale;
    const z = this.#randGaussian() * preset.depth * 0.35 * scale;
    let y: number;
    if (type === 'cumulus') {
      y = (Math.pow(this.#rand(), 0.55) * preset.height - preset.height * 0.32) * scale;
    } else if (type === 'storm') {
      y = this.#randGaussian() * preset.height * 0.35 * scale;
    } else {
      y = this.#randGaussian() * preset.height * 0.18 * scale;
    }
    return new Vector3(x, y, z);
  }

  // ---------- Animation ----------

  #animate() {
    this.#scene.onBeforeRenderObservable.add(() => {
      const dt   = this.#scene.getEngine().getDeltaTime() / 1000;
      const time = performance.now() * 0.001;
      const half = this.#options.areaSize / 2;

      for (const group of this.#cloudGroups) {
        const meta = group.metadata as CloudGroupMeta;
        const w = this.#options.wind;
        group.position.x += w.x * dt * meta.speed;
        group.position.z += w.z * dt * meta.speed;
        if (group.position.x >  half) group.position.x = -half;
        if (group.position.x < -half) group.position.x =  half;
        if (group.position.z >  half) group.position.z = -half;
        if (group.position.z < -half) group.position.z =  half;

        for (const child of group.getChildMeshes()) {
          const m = child.metadata as PuffMeta | null;
          if (!m?.base) continue;
          child.position.y = m.base.y + Math.sin(time * 0.45 + m.phase) * m.wobble * 3.0;
        }
      }
    });
  }

  // ---------- Deterministic RNG ----------

  #rand(): number {
    let t = (this.#rngState += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  #randRange(min: number, max: number): number { return min + this.#rand() * (max - min); }

  #randGaussian(): number {
    const u = 1 - this.#rand(), v = this.#rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  #valueNoise(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const a = this.#hash2(xi,     yi),     b = this.#hash2(xi + 1, yi);
    const c = this.#hash2(xi,     yi + 1), d = this.#hash2(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const lerp = (p: number, q: number, t: number) => p + (q - p) * t;
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  #hash2(x: number, y: number): number {
    let n = x * 374761393 + y * 668265263 + this.#options.seed * 1442695041;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
}

export function buildClouds(scene: Scene): void {
  new ProceduralCloudSystem(scene, {
    cloudCount: 45, areaSize: 1200,
    minHeight: 90,  maxHeight: 160,
    wind: new Vector3(0.45, 0, 0.08),
    seed: 10,
  });
  new ProceduralCloudSystem(scene, {
    cloudCount: 35, areaSize: 1800,
    minHeight: 260, maxHeight: 430,
    wind: new Vector3(1.1, 0, 0.22),
    seed: 99,
  });
}

// Self-animating via onBeforeRenderObservable — no per-frame call needed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function updateClouds(_dt: number): void { /* no-op */ }

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
