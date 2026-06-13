import {
  Scene, MeshBuilder, Mesh, Vector3, Quaternion,
  SolidParticleSystem, SolidParticle, StandardMaterial, Color3,
} from '@babylonjs/core';
import { terrainH } from './terrain';

// Tree generator ported from BabylonJS forum (ribbon + SPS approach)

type BranchSys = { x: Vector3; y: Vector3; z: Vector3 };

function coordSystem(vec3: Vector3): BranchSys {
  const _y = vec3.normalize();
  const _x = (Math.abs(vec3.x) === 0 && Math.abs(vec3.y) === 0)
    ? new Vector3(vec3.z, 0, 0).normalize()
    : new Vector3(vec3.y, -vec3.x, 0).normalize();
  const _z = Vector3.Cross(_x, _y);
  return { x: _x, y: _y, z: _z };
}

function randPct(v: number, p: number): number {
  return p === 0 ? v : (1 + (1 - 2 * Math.random()) * p) * v;
}

function createBranch(
  branchAt: Vector3, sys: BranchSys,
  length: number, taper: number, slices: number,
  bowFreq: number, bowHeight: number, radius: number,
  scene: Scene,
) {
  const SIDES = 12;
  const paths: Vector3[][] = Array.from({ length: SIDES }, () => []);
  const core: Vector3[] = [];
  const radii: number[] = [];

  for (let d = 0; d < slices; d++) {
    const t = d / slices;
    const cp = sys.y.scale(t * length)
      .add(sys.x.scale(bowHeight * Math.exp(-t) * Math.sin(bowFreq * t * Math.PI)))
      .add(branchAt);
    core.push(cp);

    const r = radius * (1 + 0.4 * Math.random() - 0.2) * (1 - (1 - taper) * t);
    radii.push(r);

    for (let a = 0; a < SIDES; a++) {
      const theta = a * Math.PI / 6;
      paths[a].push(sys.x.scale(r * Math.cos(theta)).add(sys.z.scale(r * Math.sin(theta))).add(cp));
    }
  }
  // Cap at tip
  for (let a = 0; a < SIDES; a++) paths[a].push(core[core.length - 1]);

  const branch = MeshBuilder.CreateRibbon('branch', { pathArray: paths, closeArray: true }, scene);
  return { branch, core, radii };
}

function createTreeBase(
  trunkH: number, taper: number, slices: number,
  boughs: number, forks: number, forkAngle: number, forkRatio: number,
  bowFreq: number, bowHeight: number, scene: Scene,
) {
  const PHI = 2 / (1 + Math.sqrt(5));
  const trunkSys = coordSystem(new Vector3(0, 1, 0));
  const branches: Mesh[]     = [];
  const paths: Vector3[][]   = [];
  const radii: number[][]    = [];
  const dirs: BranchSys[]    = [];

  const trunk = createBranch(Vector3.Zero(), trunkSys, trunkH, taper, slices, 1, bowHeight, 1, scene);
  branches.push(trunk.branch); paths.push(trunk.core); radii.push(trunk.radii); dirs.push(trunkSys);

  const top = trunk.core[trunk.core.length - 1];
  const dAngle = 2 * Math.PI / forks;

  for (let f = 0; f < forks; f++) {
    const turn = randPct(f * dAngle, 0.25);
    const fDir = trunkSys.y.scale(Math.cos(randPct(forkAngle, 0.15)))
      .add(trunkSys.x.scale(Math.sin(randPct(forkAngle, 0.15)) * Math.sin(turn)))
      .add(trunkSys.z.scale(Math.sin(randPct(forkAngle, 0.15)) * Math.cos(turn)));
    const fSys = coordSystem(fDir);
    const fb = createBranch(top, fSys, trunkH * forkRatio, taper, slices, bowFreq, bowHeight * PHI, taper, scene);
    branches.push(fb.branch); paths.push(fb.core); radii.push(fb.radii); dirs.push(fSys);

    if (boughs > 1) {
      const fbTop = fb.core[fb.core.length - 1];
      for (let k = 0; k < forks; k++) {
        const bTurn = randPct(k * dAngle, 0.25);
        const bDir = fSys.y.scale(Math.cos(randPct(forkAngle, 0.15)))
          .add(fSys.x.scale(Math.sin(randPct(forkAngle, 0.15)) * Math.sin(bTurn)))
          .add(fSys.z.scale(Math.sin(randPct(forkAngle, 0.15)) * Math.cos(bTurn)));
        const bSys = coordSystem(bDir);
        const bb = createBranch(fbTop, bSys, trunkH * forkRatio * forkRatio, taper, slices, bowFreq, bowHeight * PHI * PHI, taper * taper, scene);
        branches.push(bb.branch); paths.push(bb.core); radii.push(fb.radii); dirs.push(bSys);
      }
    }
  }

  const tree = Mesh.MergeMeshes(branches, true)!;
  return { tree, paths, radii, dirs };
}

function safeRotAxis(axis: Vector3, angle: number): Quaternion {
  const len = axis.length();
  return len < 0.0001 ? Quaternion.Identity() : Quaternion.RotationAxis(axis.scale(1 / len), angle);
}

function createTree(
  trunkH: number, taper: number, slices: number,
  trunkMat: StandardMaterial,
  boughs: number, forks: number, forkAngle: number, forkRatio: number,
  branchCount: number, branchAngle: number,
  bowFreq: number, bowHeight: number,
  leavesOnBranch: number, leafWHRatio: number,
  leafMat: StandardMaterial,
  scene: Scene,
): Mesh {
  if (boughs !== 1 && boughs !== 2) boughs = 1;
  const base = createTreeBase(trunkH, taper, slices, boughs, forks, forkAngle, forkRatio, bowFreq, bowHeight, scene);
  base.tree.material = trunkMat;

  const branchLen  = trunkH * Math.pow(forkRatio, boughs);
  const leafGap    = branchLen / (2 * leavesOnBranch);
  const leafWidth  = 1.5 * Math.pow(taper, boughs - 1);
  const leafDisc   = MeshBuilder.CreateDisc('leaf', { radius: leafWidth / 2, tessellation: 12, sideOrientation: Mesh.DOUBLESIDE }, scene);

  const leavesSPS = new SolidParticleSystem('leaveSPS', scene, { updatable: false });
  leavesSPS.addShape(leafDisc, 2 * leavesOnBranch * Math.pow(forks, boughs), {
    positionFunction: (p: SolidParticle, _i: number, s: number) => {
      let a = Math.floor(s / (2 * leavesOnBranch));
      a = boughs === 1 ? a + 1 : 2 + a % forks + Math.floor(a / forks) * (forks + 1);
      a = Math.min(a, base.paths.length - 1);
      const j  = s % (2 * leavesOnBranch);
      const g  = (j * leafGap + 1.5 * leafGap) / branchLen;
      let upper = Math.ceil(slices * g);
      if (upper >= base.paths[a].length) upper = base.paths[a].length - 1;
      const lower = Math.max(0, upper - 1);
      const gl = lower / (slices - 1), gu = upper / (slices - 1);
      const f  = gu === gl ? 0 : (g - gl) / (gu - gl);
      const px = base.paths[a][lower].x + (base.paths[a][upper].x - base.paths[a][lower].x) * f;
      const py = base.paths[a][lower].y + (base.paths[a][upper].y - base.paths[a][lower].y) * f;
      const pz = base.paths[a][lower].z + (base.paths[a][upper].z - base.paths[a][lower].z) * f;
      const rad = base.radii[a][upper] ?? 0;
      p.position = new Vector3(px, py + (0.6 * leafWidth / leafWHRatio + rad) * (2 * (s % 2) - 1), pz);
      p.rotation.z = Math.random() * Math.PI / 4;
      p.rotation.y = Math.random() * Math.PI / 2;
    },
  });
  const leavesBase = leavesSPS.buildMesh();
  leavesBase.billboardMode = Mesh.BILLBOARDMODE_ALL;
  leafDisc.dispose();

  // SPS for mini-trees and leaves placed at branch tips and along branches
  const UP     = new Vector3(0, 1, 0);
  const dAngle = 2 * Math.PI / forks;
  const turns  = Array.from({ length: Math.pow(forks, boughs + 1) },
    (_, i) => randPct(Math.floor(i / Math.pow(forks, boughs)) * dAngle, 0.2));

  const setMini = (p: SolidParticle, _i: number, s: number) => {
    let a = s % Math.pow(forks, boughs);
    a = boughs === 1 ? a + 1 : 2 + a % forks + Math.floor(a / forks) * (forks + 1);
    a = Math.min(a, base.dirs.length - 1);
    const sys  = base.dirs[a];
    const pos  = base.paths[a][base.paths[a].length - 1].clone();
    const turn = turns[s % turns.length];
    const dir  = sys.y.scale(Math.cos(forkAngle))
      .add(sys.x.scale(Math.sin(forkAngle) * Math.sin(turn)))
      .add(sys.z.scale(Math.sin(forkAngle) * Math.cos(turn)));
    const sc = Math.pow(taper, boughs + 1);
    p.scale.setAll(sc);
    p.rotationQuaternion = safeRotAxis(Vector3.Cross(UP, dir), Math.acos(Math.min(1, Vector3.Dot(dir.normalize(), UP))));
    p.position = pos;
  };

  const bTurns: number[]  = Array.from({ length: branchCount }, () => 2 * Math.PI * Math.random() - Math.PI);
  const places: [number, number][] = Array.from({ length: branchCount }, () => [
    Math.floor(Math.random() * base.paths.length),
    Math.max(1, Math.floor(Math.random() * (base.paths[0].length - 1) + 1)),
  ]);

  const setBranch = (p: SolidParticle, _i: number, s: number) => {
    const [ai, bi] = places[s];
    const a   = Math.min(ai, base.dirs.length - 1);
    const b   = Math.min(bi, base.paths[a].length - 1);
    const sys = base.dirs[a];
    const pos = base.paths[a][b].clone().add(sys.z.scale((base.radii[a][b] ?? 0) / 2));
    const dir = sys.y.scale(Math.cos(branchAngle))
      .add(sys.x.scale(Math.sin(branchAngle) * Math.sin(bTurns[s])))
      .add(sys.z.scale(Math.sin(branchAngle) * Math.cos(bTurns[s])));
    const sc = Math.pow(taper, boughs + 1);
    p.scale.setAll(sc);
    p.rotationQuaternion = safeRotAxis(Vector3.Cross(UP, dir), Math.acos(Math.min(1, Vector3.Dot(dir.normalize(), UP))));
    p.position = pos;
  };

  const crownSPS  = new SolidParticleSystem('miniSPS',  scene, { updatable: false });
  const lCrownSPS = new SolidParticleSystem('minilSPS', scene, { updatable: false });
  const nMini = Math.pow(forks, boughs + 1);
  crownSPS.addShape(base.tree,   nMini,       { positionFunction: setMini });
  crownSPS.addShape(base.tree,   branchCount, { positionFunction: setBranch });
  const crown = crownSPS.buildMesh();
  crown.material = trunkMat;

  lCrownSPS.addShape(leavesBase, nMini,       { positionFunction: setMini });
  lCrownSPS.addShape(leavesBase, branchCount, { positionFunction: setBranch });
  const lCrown = lCrownSPS.buildMesh();
  leavesBase.dispose();
  lCrown.material = leafMat;

  const root = MeshBuilder.CreateBox('tree-root', { size: 0.01 }, scene);
  root.isVisible = false;
  base.tree.parent = root; crown.parent = root; lCrown.parent = root;
  return root;
}

// ─── Public: scatter ~30 organic trees around the game world ─────────────────
export function buildForestTrees(scene: Scene): void {
  const trunkMat = new StandardMaterial('ftree-trunk', scene);
  trunkMat.diffuseColor  = new Color3(0.32, 0.20, 0.09);
  trunkMat.specularColor = Color3.Black();

  const leafMat = new StandardMaterial('ftree-leaf', scene);
  leafMat.diffuseColor  = new Color3(0.22, 0.46, 0.14);
  leafMat.specularColor = Color3.Black();
  leafMat.backFaceCulling = false;

  // ~30 positions spread across city surrounds, necropolis, pastures, valley
  const spots: [number, number][] = [
    // City environs
    [55, -15], [75,  5], [108,  12], [50, -60], [160,  5], [48, -20],
    // Near theatre
    [240, -70], [210, -62], [252, -35],
    // Necropolis belt
    [-15,-155], [28,-158], [55,-153], [-22,-170], [60,-165], [5,-162],
    // Eastern pastures
    [265, -15], [290,  12], [325, -28], [305,  22], [350, -5],
    // Acropolis western slopes
    [-38,  18], [-55,   5], [-22,  38], [12,  28],
    // Valley / road flanks
    [-88, -48], [-108, -28], [-65, -60],
    // Bridge/chasm periphery
    [68, -95], [120, -96], [66,-148], [114,-148],
  ];

  for (const [x, z] of spots) {
    try {
      const tree = createTree(
        3.5, 0.5, 6,
        trunkMat,
        1, 3, Math.PI / 4, 0.65,
        2, Math.PI / 3,
        2, 0.5,
        3, 0.4,
        leafMat, scene,
      );
      tree.position.set(x, terrainH(x, z), z);
      tree.scaling.setAll(0.7 + Math.random() * 0.55);
    } catch {
      // skip individual tree failures — don't break the whole world build
    }
  }
}
