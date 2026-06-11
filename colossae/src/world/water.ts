import * as THREE from 'three';
import { terrainH } from './terrain';

const RIVER_Z     = -120;
const CHASM_X0    =  60;
const CHASM_X1    = 165;
const WATER_Y     = -11.5; // sits just above gorge floor

// ─── Animated water material ──────────────────────────────────────────────────
function waterMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.78, roughness: 0.88, metalness: 0 });
}

// ─── West river reach (x: -500 → CHASM_X0) ───────────────────────────────────
function buildWestReach(scene: THREE.Scene): void {
  const len = CHASM_X0 - (-500); // 560
  const geo = new THREE.PlaneGeometry(len, 16, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = waterMat(0x3a6080);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-500 + len / 2, WATER_Y, RIVER_Z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ─── East river reach (x: CHASM_X1 → 500) ────────────────────────────────────
function buildEastReach(scene: THREE.Scene): void {
  const len = 500 - CHASM_X1; // 335
  const geo = new THREE.PlaneGeometry(len, 16, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = waterMat(0x3a6080);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(CHASM_X1 + len / 2, WATER_Y, RIVER_Z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ─── Chasm floor (dark rock) ──────────────────────────────────────────────────
function buildChasmFloor(scene: THREE.Scene): void {
  const len = CHASM_X1 - CHASM_X0; // 105
  const geo = new THREE.PlaneGeometry(len, 18, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e1a14, roughness: 0.88, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(CHASM_X0 + len / 2, WATER_Y - 2, RIVER_Z);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Travertine blocks scattered in the chasm
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.88, metalness: 0 });
  const blockPositions: [number, number, number, number, number, number][] = [
    [80,  WATER_Y - 0.5, -118, 6, 2, 4],
    [100, WATER_Y + 0.2, -122, 8, 3, 5],
    [120, WATER_Y - 0.8, -119, 5, 2, 3],
    [140, WATER_Y + 0.1, -121, 7, 2.5, 4],
    [155, WATER_Y - 0.3, -118, 4, 1.8, 3],
    [90,  WATER_Y - 0.4, -124, 5, 1.5, 4],
    [110, WATER_Y + 0.3, -116, 6, 2, 5],
  ];
  for (const [bx, by, bz, bw, bh, bd] of blockPositions) {
    const bg = new THREE.BoxGeometry(bw, bh, bd);
    const bm = new THREE.Mesh(bg, blockMat);
    bm.position.set(bx, by, bz);
    bm.rotation.y = Math.random() * 0.6 - 0.3;
    bm.castShadow = true;
    bm.receiveShadow = true;
    scene.add(bm);
  }
}

// ─── Gorge walls — narrow canyon sides ────────────────────────────────────────
function buildGorgeWalls(scene: THREE.Scene): void {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a5c48, roughness: 0.88, metalness: 0 });
  // Two long planes either side of the river, extruded down
  const wallLen = 1000;
  const wallH   = 14;

  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(wallLen, wallH, 1, 1);
    geo.rotateY(side > 0 ? Math.PI : 0);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(0, WATER_Y + wallH / 2 - 1, RIVER_Z + side * 9);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

// ─── Bridge at x=22 ───────────────────────────────────────────────────────────
export function buildBridge(scene: THREE.Scene): void {
  const DECK_Y = -8;
  const DECK_LEN = 42; // z: -140 → -98 (approach ramps included)

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8870, roughness: 0.88, metalness: 0 });

  // Deck slab
  const deckGeo = new THREE.BoxGeometry(8, 1.2, DECK_LEN);
  const deck = new THREE.Mesh(deckGeo, stoneMat);
  deck.position.set(22, DECK_Y, -119);
  deck.castShadow = true;
  deck.receiveShadow = true;
  scene.add(deck);

  // Piers (2 piers straddling gorge)
  const pierPositions: [number, number][] = [
    [22, -114],
    [22, -124],
  ];
  const pierH = 8;
  for (const [px, pz] of pierPositions) {
    const pg = new THREE.BoxGeometry(2.5, pierH, 2.5);
    const pm = new THREE.Mesh(pg, stoneMat);
    pm.position.set(px, DECK_Y - pierH / 2, pz);
    pm.castShadow = true;
    pm.receiveShadow = true;
    scene.add(pm);
  }

  // Parapet walls along each side of bridge
  for (const side of [-1, 1]) {
    const pg = new THREE.BoxGeometry(0.6, 0.9, DECK_LEN - 4);
    const pm = new THREE.Mesh(pg, stoneMat);
    pm.position.set(22 + side * 4.2, DECK_Y + 0.9, -119);
    pm.castShadow = true; pm.receiveShadow = true;
    scene.add(pm);
  }

  // Approach ramps — wedge geometry via BoxGeometry + rotation trick
  // North ramp: z from -140 to -130
  buildRamp(scene, stoneMat, 22, -135,  DECK_Y, terrainH(22, -140), 10);
  // South ramp: z from -108 to -98
  buildRamp(scene, stoneMat, 22, -103, DECK_Y, terrainH(22, -98),  10, true);
}

function buildRamp(
  scene: THREE.Scene,
  mat: THREE.Material,
  rx: number,
  rz: number,
  deckY: number,
  groundY: number,
  len: number,
  flip = false,
) {
  const h = Math.abs(deckY - groundY) + 1;
  const geo = new THREE.BoxGeometry(8, h, len);
  const mesh = new THREE.Mesh(geo, mat);
  // Tilt so one end is at deckY and the other at groundY
  const angle = Math.atan2(deckY - groundY, len) * (flip ? -1 : 1);
  mesh.rotation.x = angle;
  mesh.position.set(rx, (deckY + groundY) / 2, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function buildWater(scene: THREE.Scene): void {
  buildWestReach(scene);
  buildEastReach(scene);
  buildChasmFloor(scene);
  buildGorgeWalls(scene);
  buildBridge(scene);
}
