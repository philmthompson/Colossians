import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
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
const R_ORCH   = 11;     // orchestra radius
const ROWS     = 16;     // seat rows
const ROW_RUN  = 1.4;    // radial depth of each row
const ROW_RISE = 0.55;   // height gained per row
const SEG      = 48;     // arc smoothness
// Half-cylinder built with arc=0.5 spans 0→π; rotate −π/2 so it covers
// north→east→south (seats curve around the east, opening faces west).
const ARC_ROT_Y = -Math.PI / 2;

export function buildTheatre(scene: Scene): void {
  const baseY  = terrainH(TX, TZ);
  const SINK   = 10.0;
  const bottom = baseY - SINK;

  // ── Materials ────────────────────────────────────────────────────────────
  const seatLight = smat('seat-l', 0xd8cfb2, scene, true); // weathered limestone
  const seatDark  = smat('seat-d', 0xc4b893, scene, true);
  const seatBase  = smat('seat-b', 0xb8ac88, scene, true);
  const stairMat  = smat('stair',  0xbfb59a, scene, true); // worn stair treads
  const wallMat   = smat('t-wall', 0x9a8c78, scene, true);

  // Scaenae palette (Ephesus-style polychromy)
  const marble = smat('sc-marble', 0xe8e0d6, scene);
  const red    = smat('sc-red',    0xa83828, scene);
  const gold   = smat('sc-gold',   0xcaa642, scene);
  const blue   = smat('sc-blue',   0x3a6a90, scene);
  const stoneL = smat('sc-stone',  0xcfc4a6, scene);
  const statM  = smat('sc-statue', 0xddd6c4, scene);

  // ── Cavea: nested half-cylinders (wedding-cake stepped seating) ───────────
  for (let t = ROWS; t >= 0; t--) {
    const r      = R_ORCH + t * ROW_RUN;
    const topY   = baseY + t * ROW_RISE;
    const totalH = topY - bottom;
    const tierMat = t === 0 ? seatBase : (t % 2 === 0 ? seatLight : seatDark);

    const cyl = MeshBuilder.CreateCylinder(`tier-${t}`, {
      diameterTop:     r * 2,
      diameterBottom:  r * 2,
      height:          totalH,
      tessellation:    SEG,
      arc:             0.5,
      cap:             Mesh.CAP_ALL,
      sideOrientation: Mesh.DOUBLESIDE,
    }, scene);
    cyl.position.set(TX, bottom + totalH * 0.5, TZ);
    cyl.rotation.y = ARC_ROT_Y;
    cyl.material   = tierMat;
  }

  // ── Radial stairways (klimakes) dividing the cavea into wedges (cunei) ─────
  // Treads laid flush on top of each seat row at fixed angles. Two of these sit
  // at the very ends (the side staircases the player climbs from the parodoi).
  const stairAngles = [
    -Math.PI / 2,            // north end  (side stair by the stage)
    -Math.PI / 4,
    0,                       // central axis
    Math.PI / 4,
    Math.PI / 2,             // south end  (side stair by the stage)
  ];
  for (const a of stairAngles) {
    const isSide = Math.abs(Math.abs(a) - Math.PI / 2) < 0.01;
    const treadW = isSide ? 3.0 : 1.6;
    for (let t = 0; t < ROWS; t++) {
      const r    = R_ORCH + (t + 0.5) * ROW_RUN;
      const topY = baseY + t * ROW_RISE;
      const sx   = TX + r * Math.cos(a);
      const sz   = TZ + r * Math.sin(a);
      const step = MeshBuilder.CreateBox(`klimax-${a.toFixed(2)}-${t}`, {
        width: ROW_RUN + 0.1, height: 0.18, depth: treadW,
      }, scene);
      step.position.set(sx, topY + 0.1, sz);
      step.rotation.y = -a;
      step.material = stairMat;
    }
  }

  // ── Orchestra paving ──────────────────────────────────────────────────────
  const orchM = smat('orch', 0xe8e0c0, scene);
  const orch = MeshBuilder.CreateDisc('orch', { radius: R_ORCH, tessellation: SEG, arc: 0.5 }, scene);
  orch.rotation.x = -Math.PI / 2;
  orch.rotation.z = ARC_ROT_Y;
  orch.position.set(TX, baseY + 0.06, TZ);
  orch.material = orchM;

  // ── Outer retaining wall behind the top row ───────────────────────────────
  const outerR   = R_ORCH + ROWS * ROW_RUN + 1.2;
  const wallTopY = baseY + ROWS * ROW_RISE + 2.0;
  const wallH    = wallTopY - bottom;
  const retain = MeshBuilder.CreateCylinder('retain', {
    diameterTop:     outerR * 2,
    diameterBottom:  outerR * 2,
    height:          wallH,
    tessellation:    SEG,
    arc:             0.5,
    cap:             Mesh.NO_CAP,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  retain.position.set(TX, bottom + wallH * 0.5, TZ);
  retain.rotation.y = ARC_ROT_Y;
  retain.material = wallMat;

  // Colliders ringing the outer wall so the player can't walk off the top
  for (let i = 0; i <= 28; i++) {
    const a = -Math.PI / 2 + (i / 28) * Math.PI;
    addCollider({ x: TX + (outerR + 0.5) * Math.cos(a), z: TZ + (outerR + 0.5) * Math.sin(a), r: 1.8 });
  }

  // ── Scaenae frons — two-storey colonnaded stage façade (faces east) ───────
  buildScaenae(scene, baseY, bottom, { marble, red, gold, blue, stoneL, statM, wallMat });
}

interface Sc {
  marble: StandardMaterial; red: StandardMaterial; gold: StandardMaterial;
  blue: StandardMaterial; stoneL: StandardMaterial; statM: StandardMaterial;
  wallMat: StandardMaterial;
}

function buildScaenae(scene: Scene, baseY: number, bottom: number, m: Sc): void {
  // The flat side of the cavea faces west (−X). The stage building stands just
  // west of the orchestra edge, running north–south, its decorated face east.
  const HALF_Z   = 17;                       // half the façade length (along z)
  const backX    = TX - R_ORCH - 3.5;        // rear wall
  const faceX    = TX - R_ORCH - 1.5;        // column face
  const podiumTop = baseY + 1.4;

  // Rear wall (full height, marble) — backdrop for the colonnade
  const story3Top = baseY + 13;
  const backWall = MeshBuilder.CreateBox('sc-back', {
    width: 2.2, height: story3Top - bottom, depth: HALF_Z * 2 + 2,
  }, scene);
  backWall.position.set(backX, bottom + (story3Top - bottom) / 2, TZ);
  backWall.material = m.marble;

  // Podium (red base course)
  const podium = MeshBuilder.CreateBox('sc-podium', {
    width: 2.6, height: podiumTop - (baseY - 1), depth: HALF_Z * 2,
  }, scene);
  podium.position.set(faceX, (baseY - 1 + podiumTop) / 2, TZ);
  podium.material = m.red;

  // Central monumental doorway (valva regia) + two side doors
  for (const [dz, dw] of [[0, 3.2], [-10, 2.0], [10, 2.0]] as [number, number][]) {
    const door = MeshBuilder.CreateBox('sc-door', { width: 1.0, height: 4.2, depth: dw }, scene);
    door.position.set(faceX + 1.1, baseY + 2.1, TZ + dz);
    door.material = m.stoneL;
  }

  const colZs: number[] = [];
  for (let z = -HALF_Z + 1; z <= HALF_Z - 1; z += 4) colZs.push(z);

  // ── Storey 1: gold columns on the podium ──────────────────────────────────
  const s1Bottom = podiumTop;
  const s1Top    = baseY + 6.0;
  for (const z of colZs) {
    const col = MeshBuilder.CreateCylinder('sc1-col', {
      diameterTop: 0.85, diameterBottom: 0.95, height: s1Top - s1Bottom, tessellation: 12,
    }, scene);
    col.position.set(faceX + 0.4, (s1Bottom + s1Top) / 2, TZ + z);
    col.material = m.gold;
    // Statues standing between alternate columns
    if ((Math.round(z) % 8) === 0 && Math.abs(z) < HALF_Z - 2) {
      const torso = MeshBuilder.CreateCylinder('sc-stat-b', { diameterTop: 0.32, diameterBottom: 0.42, height: 1.7, tessellation: 8 }, scene);
      torso.position.set(faceX + 0.6, podiumTop + 0.85, TZ + z + 2);
      torso.material = m.statM;
      const head = MeshBuilder.CreateSphere('sc-stat-h', { diameter: 0.34, segments: 8 }, scene);
      head.position.set(faceX + 0.6, podiumTop + 1.9, TZ + z + 2);
      head.material = m.statM;
    }
  }
  // Storey-1 entablature (marble architrave + blue frieze)
  const arch1 = MeshBuilder.CreateBox('sc1-arch', { width: 2.4, height: 0.7, depth: HALF_Z * 2 }, scene);
  arch1.position.set(faceX + 0.1, s1Top + 0.35, TZ);
  arch1.material = m.marble;
  const frieze1 = MeshBuilder.CreateBox('sc1-frieze', { width: 2.2, height: 0.6, depth: HALF_Z * 2 }, scene);
  frieze1.position.set(faceX, s1Top + 0.95, TZ);
  frieze1.material = m.blue;

  // ── Storey 2: red columns, set back, narrower span ────────────────────────
  const s2Bottom = s1Top + 1.3;
  const s2Top    = baseY + 11.0;
  const face2X   = faceX - 0.7;
  for (const z of colZs) {
    if (Math.abs(z) > HALF_Z - 3) continue; // narrower upper storey
    const col = MeshBuilder.CreateCylinder('sc2-col', {
      diameterTop: 0.7, diameterBottom: 0.8, height: s2Top - s2Bottom, tessellation: 12,
    }, scene);
    col.position.set(face2X + 0.4, (s2Bottom + s2Top) / 2, TZ + z);
    col.material = m.red;
  }
  const arch2 = MeshBuilder.CreateBox('sc2-arch', { width: 2.2, height: 0.6, depth: (HALF_Z - 2) * 2 }, scene);
  arch2.position.set(face2X + 0.1, s2Top + 0.3, TZ);
  arch2.material = m.marble;

  // ── Central pediment over the valva regia ─────────────────────────────────
  const ped = MeshBuilder.CreateCylinder('sc-ped', {
    diameterTop: 0, diameterBottom: 8.5, height: 2.4, tessellation: 3,
  }, scene);
  ped.rotation.x = Math.PI / 2;        // lay the prism on its side
  ped.rotation.y = Math.PI / 2;        // ridge runs along z
  ped.scaling.z  = 0.5;
  ped.position.set(face2X, s2Top + 1.4, TZ);
  ped.material = m.marble;

  // ── Pulpitum (stage platform) projecting east toward the orchestra ────────
  const stageW = 5.0;                  // x-depth of the stage
  const stageX = faceX + 1.3 + stageW / 2;
  const stageTop = baseY + 1.4;
  const stage = MeshBuilder.CreateBox('sc-stage', {
    width: stageW, height: stageTop - (baseY - 1), depth: HALF_Z * 2 - 2,
  }, scene);
  stage.position.set(stageX, (baseY - 1 + stageTop) / 2, TZ);
  stage.material = m.stoneL;

  // Painted relief panels along the stage front (as in the Ephesus reconstruction)
  const panelFrontX = stageX + stageW / 2 + 0.01;
  const panelHexes = [0xa83828, 0xcaa642, 0x3a6a90];
  let pi = 0;
  for (let z = -HALF_Z + 2; z <= HALF_Z - 2; z += 2.2) {
    const panel = MeshBuilder.CreateBox('sc-panel', { width: 0.12, height: 1.0, depth: 1.7 }, scene);
    panel.position.set(panelFrontX, baseY + 0.7, TZ + z);
    panel.material = smat('panel-' + z.toFixed(1), panelHexes[pi++ % panelHexes.length], scene);
  }

  // ── Colliders: stage face + scaenae wall (block walking through the set) ──
  for (let z = -HALF_Z; z <= HALF_Z; z += 2.5) {
    addCollider({ x: stageX + stageW / 2, z: TZ + z, r: 1.6 });
    addCollider({ x: backX,               z: TZ + z, r: 1.6 });
  }
}
