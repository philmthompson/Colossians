import {
  Scene, MeshBuilder, StandardMaterial, Color3, Mesh,
  TransformNode, Vector3, VertexData, Quaternion,
} from '@babylonjs/core';
import { terrainH } from '../world/terrain';

// ─── NPC definitions ──────────────────────────────────────────────────────────
export const NPC_DEFS = [
  // tunic colour, himation colour
  { id: 'epaphras',   x: 116, z:  -42, tunic: [0.82, 0.76, 0.62], cloak: [0.55, 0.16, 0.11], facing: 0 },
  { id: 'shepherd',   x: 300, z:  -50, tunic: [0.60, 0.50, 0.34], cloak: [0.28, 0.22, 0.14], facing: 0 },
  { id: 'doorkeeper', x: 141, z:  -78, tunic: [0.74, 0.68, 0.54], cloak: [0.22, 0.36, 0.48], facing: Math.PI },
];

// ─── Shared materials (created once) ─────────────────────────────────────────
let skinMat: StandardMaterial;
let hairMat: StandardMaterial;
let eyeMat:  StandardMaterial;
let leatherMat: StandardMaterial;
let bronzeMat:  StandardMaterial;

function sm(name: string, r: number, g: number, b: number, s: number, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(r, g, b);
  m.specularColor = new Color3(s, s, s);
  return m;
}

function ensureShared(scene: Scene): void {
  if (skinMat) return;
  skinMat    = sm('npc-skin',    0.68, 0.46, 0.32, 0.12, scene);
  hairMat    = sm('npc-hair',    0.12, 0.075, 0.045, 0.04, scene);
  eyeMat     = sm('npc-eye',     0.025, 0.018, 0.012, 0.20, scene);
  leatherMat = sm('npc-leather', 0.25, 0.13, 0.055, 0.09, scene);
  bronzeMat  = sm('npc-bronze',  0.72, 0.42, 0.18,  0.25, scene);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sph(name: string, d: number, pos: Vector3, sc: Vector3, mat: StandardMaterial, root: TransformNode, scene: Scene): Mesh {
  const m = MeshBuilder.CreateSphere(name, { diameter: d, segments: 14 }, scene);
  m.position.copyFrom(pos);
  m.scaling.copyFrom(sc);
  m.material = mat;
  m.parent = root;
  return m;
}

function cyl(name: string, h: number, d: number, pos: Vector3, mat: StandardMaterial, root: TransformNode, scene: Scene,
  opts: { dTop?: number; dBot?: number; tess?: number; rotX?: number; rotZ?: number; arc?: number } = {}): Mesh {
  const mesh = MeshBuilder.CreateCylinder(name, {
    height: h,
    diameterTop:    opts.dTop ?? d,
    diameterBottom: opts.dBot ?? d,
    tessellation:   opts.tess ?? 18,
    arc:            opts.arc  ?? 1,
  }, scene);
  mesh.position.copyFrom(pos);
  if (opts.rotX !== undefined) mesh.rotation.x = opts.rotX;
  if (opts.rotZ !== undefined) mesh.rotation.z = opts.rotZ;
  mesh.material = mat;
  mesh.parent = root;
  return mesh;
}

function bx(name: string, pos: Vector3, sc: Vector3, mat: StandardMaterial, root: TransformNode, scene: Scene, rotZ = 0): Mesh {
  const m = MeshBuilder.CreateBox(name, { size: 1 }, scene);
  m.position.copyFrom(pos);
  m.scaling.copyFrom(sc);
  if (rotZ) m.rotation.z = rotZ;
  m.material = mat;
  m.parent = root;
  return m;
}

function cylBetween(name: string, a: Vector3, b: Vector3, r: number, mat: StandardMaterial, root: TransformNode, scene: Scene): Mesh {
  const dist = Vector3.Distance(a, b);
  const mid  = a.add(b).scaleInPlace(0.5);
  const mesh = MeshBuilder.CreateCylinder(name, { height: dist, diameter: r * 2, tessellation: 12 }, scene);
  mesh.position.copyFrom(mid);
  const dir  = b.subtract(a).normalize();
  const axis = Vector3.Cross(Vector3.Up(), dir);
  mesh.rotationQuaternion = axis.length() < 0.0001
    ? Quaternion.Identity()
    : Quaternion.RotationAxis(axis.normalize(), Math.acos(Vector3.Dot(Vector3.Up(), dir)));
  mesh.material = mat;
  mesh.parent = root;
  return mesh;
}

// Cloth panel with subtle folds — for the himation drape
function clothPanel(
  name: string,
  xlTop: number, xrTop: number,
  xlBot: number, xrBot: number,
  yTop: number,  yBot: number,
  z: number,
  mat: StandardMaterial,
  root: TransformNode,
  scene: Scene,
): Mesh {
  const cols = 7, rows = 9;
  const pos: number[] = [], idx: number[] = [], nrm: number[] = [], uvs: number[] = [];

  for (let r = 0; r <= rows; r++) {
    const v  = r / rows;
    const y  = yTop + (yBot - yTop) * v;
    const lx = xlTop + (xlBot - xlTop) * v;
    const rx = xrTop + (xrBot - xrTop) * v;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const x = lx + (rx - lx) * u;
      const fold = Math.sin(u * Math.PI * 4) * 0.03;
      const sag  = Math.sin(v * Math.PI) * 0.02;
      pos.push(x, y, z + fold + sag);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * (cols + 1) + c;
      idx.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1);
    }
  }

  VertexData.ComputeNormals(pos, idx, nrm);

  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  vd.positions = pos;
  vd.indices   = idx;
  vd.normals   = nrm;
  vd.uvs       = uvs;
  vd.applyToMesh(mesh);

  mat.backFaceCulling = false;
  mesh.material = mat;
  mesh.parent = root;
  return mesh;
}

// ─── Build one NPC ────────────────────────────────────────────────────────────
function buildNPC(
  id: string, x: number, z: number,
  tunicRGB: number[], cloakRGB: number[],
  facing: number,
  scene: Scene,
): void {
  ensureShared(scene);
  const ty = terrainH(x, z);

  // All geometry built at native scale (≈ 3.5 units tall) then root scaled to 0.5
  // so the final character is ~1.75m — matching PLAYER_H.
  const root = new TransformNode(`npc-${id}`, scene);
  root.position.set(x, ty, z);
  root.scaling.setAll(0.5);

  const tunicMat = sm(`npc-tunic-${id}`, tunicRGB[0], tunicRGB[1], tunicRGB[2], 0.05, scene);
  const trimMat  = sm(`npc-trim-${id}`,  0.86, 0.58, 0.22, 0.08, scene);
  const cloakMat = sm(`npc-cloak-${id}`, cloakRGB[0], cloakRGB[1], cloakRGB[2], 0.06, scene);

  // ── Tunic body (chiton — wide at hem) ────────────────────────────────────
  const torso = cyl('torso', 1.55, 0.95, new Vector3(0, 1.95, 0), tunicMat, root, scene,
    { dTop: 0.82, dBot: 1.08, tess: 18 });
  const hem = cyl('hem', 0.06, 1.16, new Vector3(0, 1.18, 0), trimMat, root, scene,
    { dTop: 1.14, dBot: 1.18 });
  void hem;

  // Belt
  const belt = MeshBuilder.CreateTorus('belt', { diameter: 0.98, thickness: 0.055, tessellation: 48 }, scene);
  belt.position.set(0, 1.86, 0);
  belt.scaling.z = 0.78;
  belt.material = leatherMat;
  belt.parent = root;

  // Neck
  cyl('neck', 0.28, 0.22, new Vector3(0, 2.78, -0.02), skinMat, root, scene);

  // Head (slightly elongated)
  const head = sph('head', 0.68, new Vector3(0, 3.18, -0.04), new Vector3(0.9, 1.08, 0.82), skinMat, root, scene);

  // ── Hair ─────────────────────────────────────────────────────────────────
  sph('hair-back', 0.72, new Vector3(0, 3.24, 0.08), new Vector3(0.92, 0.9, 0.7), hairMat, root, scene);
  sph('hair-front', 0.58, new Vector3(0, 3.45, -0.13), new Vector3(0.9, 0.42, 0.55), hairMat, root, scene);
  // Side curls
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      sph(`curl-${side}-${i}`, 0.16, new Vector3(side * 0.31, 3.25 - i * 0.13, -0.05),
        new Vector3(0.85, 1.05, 0.85), hairMat, root, scene);
    }
  }

  // ── Beard & face ─────────────────────────────────────────────────────────
  sph('beard', 0.38, new Vector3(0, 3.02, -0.34), new Vector3(0.82, 0.58, 0.38), hairMat, root, scene);

  // Brows
  for (const side of [-1, 1] as const) {
    bx(`brow-${side}`, new Vector3(side * 0.13, 3.35, -0.39), new Vector3(0.12, 0.018, 0.025),
      hairMat, root, scene, side * 0.12);
  }

  // Eyes
  sph('eye-l', 0.055, new Vector3(-0.13, 3.27, -0.37), Vector3.One(), eyeMat, root, scene);
  sph('eye-r', 0.055, new Vector3( 0.13, 3.27, -0.37), Vector3.One(), eyeMat, root, scene);

  // Nose
  const nose = MeshBuilder.CreateCylinder('nose', { height: 0.18, diameterTop: 0.015, diameterBottom: 0.075, tessellation: 10 }, scene);
  nose.position.set(0, 3.19, -0.42);
  nose.rotation.x = -Math.PI / 2;
  nose.material = skinMat;
  nose.parent = root;

  // ── Arms ─────────────────────────────────────────────────────────────────
  const rHand = sph('rhand', 0.19, new Vector3(0.46, 1.57, -0.47), new Vector3(0.8, 1, 0.75), skinMat, root, scene);
  const lHand = sph('lhand', 0.19, new Vector3(-0.84, 1.56, -0.12), new Vector3(0.8, 1, 0.75), skinMat, root, scene);

  cylBetween('r-upper', new Vector3(0.48, 2.55, -0.03), new Vector3(0.75, 2.08, -0.24), 0.105, skinMat, root, scene);
  cylBetween('r-fore',  new Vector3(0.75, 2.08, -0.24), new Vector3(0.48, 1.66, -0.45), 0.09,  skinMat, root, scene);
  cylBetween('l-upper', new Vector3(-0.48, 2.55, -0.02), new Vector3(-0.77, 2.08, -0.10), 0.105, skinMat, root, scene);
  cylBetween('l-fore',  new Vector3(-0.77, 2.08, -0.10), new Vector3(-0.84, 1.67, -0.12), 0.09,  skinMat, root, scene);

  // Short tunic sleeves
  cylBetween('r-sleeve', new Vector3(0.43, 2.58, -0.03), new Vector3(0.58, 2.34, -0.13), 0.15, tunicMat, root, scene);
  cylBetween('l-sleeve', new Vector3(-0.43, 2.58, -0.03), new Vector3(-0.58, 2.34, -0.08), 0.15, tunicMat, root, scene);

  // ── Legs & sandals ────────────────────────────────────────────────────────
  for (const side of [-1, 1] as const) {
    cylBetween(`leg-${side}`, new Vector3(side * 0.23, 1.15, 0.02), new Vector3(side * 0.23, 0.35, -0.05), 0.105, skinMat, root, scene);
    bx(`foot-${side}`,        new Vector3(side * 0.23, 0.12, -0.20), new Vector3(0.16, 0.07, 0.33), skinMat, root, scene);
    bx(`sandal-${side}`,      new Vector3(side * 0.23, 0.055, -0.20), new Vector3(0.19, 0.025, 0.37), leatherMat, root, scene);
    bx(`strap1-${side}`,      new Vector3(side * 0.23, 0.16, -0.30), new Vector3(0.19, 0.025, 0.035), leatherMat, root, scene);
    bx(`strap2-${side}`,      new Vector3(side * 0.23, 0.34, -0.03), new Vector3(0.15, 0.025, 0.035), leatherMat, root, scene);
  }

  // ── Himation (draped mantle) ───────────────────────────────────────────────
  const frontDrape = clothPanel('front-drape',
    -0.62, 0.28, -0.72, 0.52, 2.74, 1.04, -0.53,
    cloakMat, root, scene);

  clothPanel('back-drape',
    -0.58, 0.58, -0.68, 0.68, 2.65, 0.95, 0.47,
    cloakMat, root, scene);

  // Fold accents
  for (let i = 0; i < 5; i++) {
    const fx = -0.48 + i * 0.23;
    bx(`fold-${i}`, new Vector3(fx, 1.86, -0.565), new Vector3(0.018, 0.78, 0.01), trimMat, root, scene);
  }

  // Trim bands on mantle edge
  bx('cloak-trim-t', new Vector3(-0.13, 2.73, -0.575), new Vector3(0.78, 0.035, 0.015), trimMat, root, scene);
  bx('cloak-trim-b', new Vector3(-0.10, 1.04, -0.575), new Vector3(1.12, 0.035, 0.015), trimMat, root, scene);

  // Shoulder brooch
  const brooch = MeshBuilder.CreateTorus('brooch', { diameter: 0.18, thickness: 0.025, tessellation: 24 }, scene);
  brooch.position.set(-0.43, 2.67, -0.47);
  brooch.rotation.x = Math.PI / 2;
  brooch.material = bronzeMat;
  brooch.parent = root;
  sph('brooch-c', 0.06, new Vector3(-0.43, 2.67, -0.49), Vector3.One(), bronzeMat, root, scene);

  // ── Idle breathing / sway animation ──────────────────────────────────────
  const phase = Math.random() * Math.PI * 2; // offset each NPC
  const headY0 = head.position.y;
  const rHandY0 = rHand.position.y;
  const lHandY0 = lHand.position.y;

  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.001 + phase;
    root.rotation.y = facing + Math.sin(t * 0.55) * 0.02;
    head.position.y = headY0 + Math.sin(t * 1.1) * 0.01;
    torso.scaling.y = 1 + Math.sin(t * 1.1) * 0.012;
    frontDrape.rotation.z = Math.sin(t * 0.75) * 0.012;
    rHand.position.y = rHandY0 + Math.sin(t * 1.2)       * 0.012;
    lHand.position.y = lHandY0 + Math.sin(t * 1.0 + 0.8) * 0.010;
  });
}

// ─── Public entry point ───────────────────────────────────────────────────────
export function buildNPCs(scene: Scene): void {
  for (const def of NPC_DEFS) {
    buildNPC(def.id, def.x, def.z, def.tunic, def.cloak, def.facing, scene);
  }
}
