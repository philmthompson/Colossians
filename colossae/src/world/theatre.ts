import {
  Scene, Mesh, MeshBuilder, StandardMaterial, Color3,
  VertexData, Vector3,
} from '@babylonjs/core';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

// ─── Theatre of Colossae ──────────────────────────────────────────────────────
// Sited on the hill at (224, -48). Cavea cut into the east slope, opening WEST
// across the valley toward the acropolis. Modelled on the great theatre at
// Ephesus (a colourful multi-storey scaenae frons, a deep stepped cavea divided
// by radial stairways) but at roughly half the scale — Colossae was the smaller
// town. The player enters through the parodoi on either side of the stage and
// climbs the side stairways up into the seating.

const TX = 224, TZ = -48;

function c3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

function smat(name: string, hex: number, scene: Scene, doubleSide = false): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = c3(hex);
  m.specularColor = Color3.Black();
  if (doubleSide) m.backFaceCulling = false;
  return m;
}

// Geometry constants — MUST stay in sync with controls.ts theatreStepH()
export const R_ORCH   = 10;     // orchestra radius
export const ROWS     = 24;     // seat rows
export const ROW_RUN  = 0.75;   // radial depth of each row (tread)
export const ROW_RISE = 0.38;   // height gained per row
const SEG_HALF        = 44;     // arc segments for half-circle (0..π)

// Angles that open the cavea toward the west (–X direction)
// The arc spans from –π/2 to +π/2 around the east side.
const A_MIN = -Math.PI / 2;
const A_MAX =  Math.PI / 2;

export function buildTheatre(scene: Scene): void {
  const baseY  = terrainH(TX, TZ);
  const SINK   = 10.0;
  const bottom = baseY - SINK;

  // ── Materials ────────────────────────────────────────────────────────────
  const treadMat = smat('tread',  0xd8cfb2, scene, true); // limestone treads
  const riserMat = smat('riser',  0xbfb08a, scene, true); // slightly darker risers
  const fillMat  = smat('fill',   0xa89870, scene, true); // solid fill beneath
  const stairMat = smat('stair',  0xcfc4a6, scene, true);
  const wallMat  = smat('t-wall', 0x9a8c78, scene, true);
  const orchMat  = smat('orch',   0xe8e0c0, scene);

  // Scaenae palette
  const marble = smat('sc-marble', 0xe8e0d6, scene);
  const red    = smat('sc-red',    0xa83828, scene);
  const gold   = smat('sc-gold',   0xcaa642, scene);
  const blue   = smat('sc-blue',   0x3a6a90, scene);
  const stoneL = smat('sc-stone',  0xcfc4a6, scene);
  const statM  = smat('sc-statue', 0xddd6c4, scene);

  // ── Solid fill under the seating (one big half-cylinder fill) ────────────
  // CAP_BOTTOM only — no top disc, otherwise a flat "roof" hovers over the cavea.
  const fillR = R_ORCH + ROWS * ROW_RUN;
  const fillTopY = baseY + ROWS * ROW_RISE;       // top flush with highest tread
  const fill = MeshBuilder.CreateCylinder('seat-fill', {
    diameterTop:     fillR * 2,
    diameterBottom:  fillR * 2,
    height:          fillTopY - bottom,
    tessellation:    SEG_HALF * 2,
    arc:             0.5,
    cap:             Mesh.CAP_START,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  fill.position.set(TX, bottom + (fillTopY - bottom) / 2, TZ);
  fill.rotation.y = -Math.PI / 2;
  fill.material   = fillMat;
  fill.checkCollisions = true;

  // Close the open north and south flat sides of the half-cylinder
  const fillH = fillTopY - bottom;
  const northFill = MeshBuilder.CreateBox('seat-fill-north', {
    width: fillR, height: fillH, depth: 0.5,
  }, scene);
  northFill.position.set(TX + fillR / 2, bottom + fillH / 2, TZ - fillR);
  northFill.material = fillMat;
  northFill.checkCollisions = true;

  const southFill = MeshBuilder.CreateBox('seat-fill-south', {
    width: fillR, height: fillH, depth: 0.5,
  }, scene);
  southFill.position.set(TX + fillR / 2, bottom + fillH / 2, TZ + fillR);
  southFill.material = fillMat;
  southFill.checkCollisions = true;

  // ── Stadium-style stepped seating (custom VertexData) ────────────────────
  // Each row produces a tread (horizontal top surface) and a riser (vertical
  // front face). We build two large merged meshes: one for treads, one for risers.
  //
  // For each row t (0..ROWS-1):
  //   inner radius = R_ORCH + t * ROW_RUN
  //   outer radius = R_ORCH + (t+1) * ROW_RUN
  //   treadY       = baseY + t * ROW_RISE         (horizontal surface)
  //   riserBottomY = baseY + (t-1) * ROW_RISE     (for t>0; else baseY)
  //
  // Stairways cut at 5 angles; we leave a gap (±0.75 rad around each stair angle).
  // Each arc segment between gaps becomes one strip of quads.

  const stairAngles = [A_MIN, -Math.PI / 4, 0, Math.PI / 4, A_MAX];
  const gapHalf = 0.075; // radians each side of stairway centre to omit

  // Build angle ranges (arcs) that have seating (skip stair gaps)
  const arcRanges: [number, number][] = [];
  let prev = A_MIN;
  for (const sa of stairAngles) {
    const gapStart = sa - gapHalf;
    const gapEnd   = sa + gapHalf;
    if (gapStart > prev + 0.01) arcRanges.push([prev, gapStart]);
    prev = gapEnd;
  }
  if (prev < A_MAX - 0.01) arcRanges.push([prev, A_MAX]);

  // Helper: add a quad (2 triangles) to a growing mesh buffer
  // Babylon.js left-handed: for UP normal, vertices in CW order from above.
  function addTreadQuad(
    pos: number[], idx: number[],
    ix: number, iy: number, iz: number,
    ox: number, oy: number, oz: number,
    ix2: number, iy2: number, iz2: number,
    ox2: number, oy2: number, oz2: number,
  ) {
    const b = pos.length / 3;
    pos.push(ix, iy, iz, ox, oy, oz, ox2, oy2, oz2, ix2, iy2, iz2);
    // CW from above (left-handed, UP normal): b, b+1, b+3, b+1, b+2, b+3
    idx.push(b, b+1, b+3, b+1, b+2, b+3);
  }

  function addRiserQuad(
    pos: number[], idx: number[],
    x0: number, yb: number, yt: number, z0: number,
    x1: number, z1: number,
  ) {
    // Riser: vertical quad. For inward-facing normal (facing orchestra, –X dir):
    // vertices: bottom-a, bottom-b, top-a, top-b
    const b = pos.length / 3;
    pos.push(x0, yb, z0,  x1, yb, z1,  x0, yt, z0,  x1, yt, z1);
    // CW for inward normal: b, b+2, b+1, b+1, b+2, b+3
    idx.push(b, b+2, b+1, b+1, b+2, b+3);
  }

  const treadPos: number[] = [], treadIdx: number[] = [];
  const riserPos: number[] = [], riserIdx: number[] = [];

  for (const [aStart, aEnd] of arcRanges) {
    // Number of sub-segments in this arc range
    const arcFrac = (aEnd - aStart) / Math.PI;
    const nSegs   = Math.max(2, Math.round(SEG_HALF * arcFrac));

    for (let t = 0; t < ROWS; t++) {
      const rInner  = R_ORCH + t * ROW_RUN;
      const rOuter  = R_ORCH + (t + 1) * ROW_RUN;
      const treadY  = baseY + t * ROW_RISE;
      // Lowest row's riser is sunk well into the ground so nothing hovers.
      const riserBY = t > 0 ? baseY + (t - 1) * ROW_RISE : baseY - 3.0;

      for (let s = 0; s < nSegs; s++) {
        const a0 = aStart + (s / nSegs) * (aEnd - aStart);
        const a1 = aStart + ((s + 1) / nSegs) * (aEnd - aStart);

        const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
        const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

        // Tread: inner arc at a0, outer arc at a0, outer arc at a1, inner arc at a1
        addTreadQuad(
          treadPos, treadIdx,
          TX + rInner * cos0, treadY, TZ + rInner * sin0,
          TX + rOuter * cos0, treadY, TZ + rOuter * sin0,
          TX + rInner * cos1, treadY, TZ + rInner * sin1,
          TX + rOuter * cos1, treadY, TZ + rOuter * sin1,
        );

        // Riser: at inner radius, spanning the riser height
        addRiserQuad(
          riserPos, riserIdx,
          TX + rInner * cos0, riserBY, treadY, TZ + rInner * sin0,
          TX + rInner * cos1, TZ + rInner * sin1,
        );
      }
    }
  }

  // Apply tread mesh
  {
    const vd = new VertexData();
    vd.positions = new Float32Array(treadPos);
    vd.indices   = treadIdx;
    const normals = new Float32Array(treadPos.length);
    VertexData.ComputeNormals(vd.positions, vd.indices, normals);
    vd.normals = normals;
    const m = new Mesh('seat-treads', scene);
    vd.applyToMesh(m);
    m.material = treadMat;
    m.checkCollisions = true;
  }

  // Apply riser mesh
  {
    const vd = new VertexData();
    vd.positions = new Float32Array(riserPos);
    vd.indices   = riserIdx;
    const normals = new Float32Array(riserPos.length);
    VertexData.ComputeNormals(vd.positions, vd.indices, normals);
    vd.normals = normals;
    const m = new Mesh('seat-risers', scene);
    vd.applyToMesh(m);
    m.material = riserMat;
    m.checkCollisions = true;
  }

  // ── Radial stairways (klimakes) ───────────────────────────────────────────
  for (const a of stairAngles) {
    const isSide = Math.abs(Math.abs(a) - Math.PI / 2) < 0.01;
    const treadW = isSide ? 3.0 : 1.8;
    for (let t = 0; t < ROWS; t++) {
      const r    = R_ORCH + (t + 0.5) * ROW_RUN;
      const topY = baseY + t * ROW_RISE;
      const sx   = TX + r * Math.cos(a);
      const sz   = TZ + r * Math.sin(a);
      const step = MeshBuilder.CreateBox(`klimax-${a.toFixed(2)}-${t}`, {
        width: ROW_RUN + 0.05, height: 0.14, depth: treadW,
      }, scene);
      step.position.set(sx, topY + 0.07, sz);
      step.rotation.y = -a;
      step.material = stairMat;
      step.checkCollisions = true;
    }
  }

  // ── Orchestra paving ──────────────────────────────────────────────────────
  const orch = MeshBuilder.CreateDisc('orch', { radius: R_ORCH, tessellation: SEG_HALF * 2, arc: 0.5 }, scene);
  orch.rotation.x = -Math.PI / 2;
  orch.rotation.z = -Math.PI / 2;
  orch.position.set(TX, baseY + 0.06, TZ);
  orch.material = orchMat;

  // ── Outer retaining wall behind the top row ───────────────────────────────
  const outerR   = R_ORCH + ROWS * ROW_RUN + 1.2;
  const wallTopY = baseY + ROWS * ROW_RISE + 2.0;
  const wallH    = wallTopY - bottom;
  const retain = MeshBuilder.CreateCylinder('retain', {
    diameterTop:     outerR * 2,
    diameterBottom:  outerR * 2,
    height:          wallH,
    tessellation:    SEG_HALF * 2,
    arc:             0.5,
    cap:             Mesh.NO_CAP,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.rotation.y = -Math.PI / 2;
  retain.material = wallMat;
  retain.checkCollisions = true;

  // Colliders ringing the outer wall
  for (let i = 0; i <= 28; i++) {
    const a = A_MIN + (i / 28) * Math.PI;
    addCollider({ x: TX + (outerR + 0.5) * Math.cos(a), z: TZ + (outerR + 0.5) * Math.sin(a), r: 1.8 });
  }

  // ── Scaenae frons — two-storey colonnaded stage façade ────────────────────
  buildScaenae(scene, baseY, bottom, { marble, red, gold, blue, stoneL, statM, wallMat });

  // suppress unused import warning
  void Vector3;
}

interface Sc {
  marble: StandardMaterial; red: StandardMaterial; gold: StandardMaterial;
  blue: StandardMaterial; stoneL: StandardMaterial; statM: StandardMaterial;
  wallMat: StandardMaterial;
}

function buildScaenae(scene: Scene, baseY: number, bottom: number, m: Sc): void {
  const HALF_Z   = 17;
  const backX    = TX - R_ORCH - 3.5;
  const faceX    = TX - R_ORCH - 1.5;
  const podiumTop = baseY + 1.4;

  const story3Top = baseY + 13;
  const backWall = MeshBuilder.CreateBox('sc-back', {
    width: 2.2, height: story3Top - bottom, depth: HALF_Z * 2 + 2,
  }, scene);
  backWall.position.set(backX, bottom + (story3Top - bottom) / 2, TZ);
  backWall.material = m.marble;
  backWall.checkCollisions = true;

  const podium = MeshBuilder.CreateBox('sc-podium', {
    width: 2.6, height: podiumTop - (baseY - 1), depth: HALF_Z * 2,
  }, scene);
  podium.position.set(faceX, (baseY - 1 + podiumTop) / 2, TZ);
  podium.material = m.red;
  podium.checkCollisions = true;

  for (const [dz, dw] of [[0, 3.2], [-10, 2.0], [10, 2.0]] as [number, number][]) {
    const door = MeshBuilder.CreateBox('sc-door', { width: 1.0, height: 4.2, depth: dw }, scene);
    door.position.set(faceX + 1.1, baseY + 2.1, TZ + dz);
    door.material = m.stoneL;
  }

  const colZs: number[] = [];
  for (let z = -HALF_Z + 1; z <= HALF_Z - 1; z += 4) colZs.push(z);

  const s1Bottom = podiumTop;
  const s1Top    = baseY + 6.0;
  for (const z of colZs) {
    const col = MeshBuilder.CreateCylinder('sc1-col', {
      diameterTop: 0.85, diameterBottom: 0.95, height: s1Top - s1Bottom, tessellation: 12,
    }, scene);
    col.position.set(faceX + 0.4, (s1Bottom + s1Top) / 2, TZ + z);
    col.material = m.gold;
    col.checkCollisions = true;

    if ((Math.round(z) % 8) === 0 && Math.abs(z) < HALF_Z - 2) {
      const torso = MeshBuilder.CreateCylinder('sc-stat-b', { diameterTop: 0.32, diameterBottom: 0.42, height: 1.7, tessellation: 8 }, scene);
      torso.position.set(faceX + 0.6, podiumTop + 0.85, TZ + z + 2);
      torso.material = m.statM;
      const head = MeshBuilder.CreateSphere('sc-stat-h', { diameter: 0.34, segments: 8 }, scene);
      head.position.set(faceX + 0.6, podiumTop + 1.9, TZ + z + 2);
      head.material = m.statM;
    }
  }

  const arch1 = MeshBuilder.CreateBox('sc1-arch', { width: 2.4, height: 0.7, depth: HALF_Z * 2 }, scene);
  arch1.position.set(faceX + 0.1, s1Top + 0.35, TZ);
  arch1.material = m.marble;

  const frieze1 = MeshBuilder.CreateBox('sc1-frieze', { width: 2.2, height: 0.6, depth: HALF_Z * 2 }, scene);
  frieze1.position.set(faceX, s1Top + 0.95, TZ);
  frieze1.material = m.blue;

  const s2Bottom = s1Top + 1.3;
  const s2Top    = baseY + 11.0;
  const face2X   = faceX - 0.7;
  for (const z of colZs) {
    if (Math.abs(z) > HALF_Z - 3) continue;
    const col = MeshBuilder.CreateCylinder('sc2-col', {
      diameterTop: 0.7, diameterBottom: 0.8, height: s2Top - s2Bottom, tessellation: 12,
    }, scene);
    col.position.set(face2X + 0.4, (s2Bottom + s2Top) / 2, TZ + z);
    col.material = m.red;
    col.checkCollisions = true;
  }

  const arch2 = MeshBuilder.CreateBox('sc2-arch', { width: 2.2, height: 0.6, depth: (HALF_Z - 2) * 2 }, scene);
  arch2.position.set(face2X + 0.1, s2Top + 0.3, TZ);
  arch2.material = m.marble;

  const ped = MeshBuilder.CreateCylinder('sc-ped', {
    diameterTop: 0, diameterBottom: 8.5, height: 2.4, tessellation: 3,
  }, scene);
  ped.rotation.x = Math.PI / 2;
  ped.rotation.y = Math.PI / 2;
  ped.scaling.z  = 0.5;
  ped.position.set(face2X, s2Top + 1.4, TZ);
  ped.material = m.marble;

  // ── Pulpitum (stage platform) ─────────────────────────────────────────────
  const stageW        = 5.0;
  const stageX        = faceX + 1.3 + stageW / 2;
  const stageTop      = baseY + 1.4;
  const stageTerrain  = Math.min(terrainH(stageX, TZ), baseY - 2);
  const stageBottom   = stageTerrain - 6;
  const stage = MeshBuilder.CreateBox('sc-stage', {
    width: stageW, height: stageTop - stageBottom, depth: HALF_Z * 2 - 2,
  }, scene);
  stage.position.set(stageX, (stageBottom + stageTop) / 2, TZ);
  stage.material = m.stoneL;
  stage.checkCollisions = true;

  const panelFrontX = stageX + stageW / 2 + 0.01;
  const panelHexes = [0xa83828, 0xcaa642, 0x3a6a90];
  let pi = 0;
  for (let z = -HALF_Z + 2; z <= HALF_Z - 2; z += 2.2) {
    const panel = MeshBuilder.CreateBox('sc-panel', { width: 0.12, height: 1.0, depth: 1.7 }, scene);
    panel.position.set(panelFrontX, baseY + 0.7, TZ + z);
    panel.material = smat('panel-' + z.toFixed(1), panelHexes[pi++ % panelHexes.length], scene);
    panel.checkCollisions = true;
  }

  // Colliders: stage face + scaenae wall
  for (let z = -HALF_Z; z <= HALF_Z; z += 2.5) {
    addCollider({ x: stageX + stageW / 2, z: TZ + z, r: 1.6 });
    addCollider({ x: backX,               z: TZ + z, r: 1.6 });
  }
}
