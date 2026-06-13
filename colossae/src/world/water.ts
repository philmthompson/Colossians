import { Scene, MeshBuilder, StandardMaterial, Color3, Quaternion } from '@babylonjs/core';
import { terrainH } from './terrain';

const RIVER_Z  = -120;
const CHASM_X0 =  60;
const CHASM_X1 = 165;
const WATER_Y  = -11.5;

function wmat(name: string, hex: number, alpha: number, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  m.specularColor = Color3.Black();
  m.alpha = alpha;
  return m;
}

function smat(name: string, hex: number, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  m.specularColor = Color3.Black();
  return m;
}

function buildWestReach(scene: Scene): void {
  const len = CHASM_X0 - (-500);
  const mesh = MeshBuilder.CreateGround('west-river', { width: len, height: 16, subdivisions: 1 }, scene);
  mesh.position.set(-500 + len / 2, WATER_Y, RIVER_Z);
  mesh.material = wmat('ww', 0x3a6080, 0.78, scene);
}

function buildEastReach(scene: Scene): void {
  const len = 500 - CHASM_X1;
  const mesh = MeshBuilder.CreateGround('east-river', { width: len, height: 16, subdivisions: 1 }, scene);
  mesh.position.set(CHASM_X1 + len / 2, WATER_Y, RIVER_Z);
  mesh.material = wmat('ew', 0x3a6080, 0.78, scene);
}

function buildChasmFloor(scene: Scene): void {
  const len = CHASM_X1 - CHASM_X0;
  const floor = MeshBuilder.CreateGround('chasm-floor', { width: len, height: 18, subdivisions: 1 }, scene);
  floor.position.set(CHASM_X0 + len / 2, WATER_Y - 2, RIVER_Z);
  floor.material = smat('cf', 0x1e1a14, scene);

  const blockM = smat('blk', 0x8a7a60, scene);
  const blocks: [number, number, number, number, number, number][] = [
    [80, WATER_Y-0.5, -118, 6, 2, 4], [100, WATER_Y+0.2, -122, 8, 3, 5],
    [120, WATER_Y-0.8, -119, 5, 2, 3],[140, WATER_Y+0.1, -121, 7, 2.5, 4],
    [155, WATER_Y-0.3, -118, 4, 1.8, 3],[90, WATER_Y-0.4, -124, 5, 1.5, 4],
    [110, WATER_Y+0.3, -116, 6, 2, 5],
  ];
  for (const [bx, by, bz, bw, bh, bd] of blocks) {
    const bm = MeshBuilder.CreateBox('blk', { width: bw, height: bh, depth: bd }, scene);
    bm.position.set(bx, by, bz);
    bm.rotation.y = Math.random() * 0.6 - 0.3;
    bm.material = blockM;
  }
}


export function buildBridge(scene: Scene): void {
  const BRIDGE_X = 92;
  const BRIDGE_W = 12;
  const DECK_H   = 1.4;

  // Sample terrain at both banks, well clear of the chasm Gaussian (sigma≈8).
  const NORTH_Z = -98;   // city-side bank (less negative z = south in game)
  const SOUTH_Z = -142;  // necropolis-side bank
  const NORTH_Y = terrainH(BRIDGE_X, NORTH_Z);
  const SOUTH_Y = terrainH(BRIDGE_X, SOUTH_Z);

  const DECK_LEN = Math.abs(SOUTH_Z - NORTH_Z);           // 44
  const DECK_Z   = (NORTH_Z + SOUTH_Z) / 2;               // -120
  // Set centre so the deck TOP (not centre) lands at terrain height on each end.
  // Deck top at centre = DECK_Y + DECK_H/2 = (NORTH_Y+SOUTH_Y)/2  →  DECK_Y = avg - DECK_H/2
  const DECK_Y   = (NORTH_Y + SOUTH_Y) / 2 - DECK_H / 2;
  // Positive X-pitch (Babylon left-handed) LOWERS the +Z end of the box.
  // +Z end = NORTH_Z (city side, higher terrain) → negate to raise it.
  const pitch    = -Math.atan2(NORTH_Y - SOUTH_Y, DECK_LEN);

  const stoneMat = smat('bridge-s', 0x9a8870, scene);
  const capMat   = smat('bridge-c', 0xb8a880, scene);

  // Deck slab — centre lowered so the top surface meets the banks
  const deck = MeshBuilder.CreateBox('deck', { width: BRIDGE_W, height: DECK_H, depth: DECK_LEN }, scene);
  deck.position.set(BRIDGE_X, DECK_Y, DECK_Z);
  deck.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, pitch, 0);
  deck.material = stoneMat;
  deck.checkCollisions = true;

  // Abutments: fill from bank terrain surface down into the ground
  for (const [az, bankY] of [[NORTH_Z + 4, NORTH_Y], [SOUTH_Z - 4, SOUTH_Y]] as [number, number][]) {
    const fill = Math.max(12, Math.abs(bankY) + 10);
    const abt = MeshBuilder.CreateBox('abt', { width: BRIDGE_W + 4, height: fill, depth: 8 }, scene);
    abt.position.set(BRIDGE_X, bankY - fill * 0.5, az);
    abt.material = stoneMat;
  }

  // Piers: rise from just above WATER_Y to nearly flush with deck underside.
  const pierTopY = DECK_Y - DECK_H / 2 - 0.2;
  const pierH    = Math.max(4, pierTopY - WATER_Y);
  for (const pz of [-110, -128]) {
    const pier = MeshBuilder.CreateBox('pier', { width: BRIDGE_W - 2, height: pierH, depth: 4 }, scene);
    pier.position.set(BRIDGE_X, pierTopY - pierH / 2, pz);
    pier.material = stoneMat;
  }

  // Parapets sit on the deck top surface, rotating with the same pitch
  const deckTopY = DECK_Y + DECK_H / 2;
  for (const side of [-1, 1]) {
    const xOff = side * (BRIDGE_W / 2 - 0.45);
    const par = MeshBuilder.CreateBox('par', { width: 0.9, height: 1.1, depth: DECK_LEN - 2 }, scene);
    par.position.set(BRIDGE_X + xOff, deckTopY + 0.55, DECK_Z);
    par.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, pitch, 0);
    par.material = stoneMat;

    const cap = MeshBuilder.CreateBox('cap', { width: 1.1, height: 0.25, depth: DECK_LEN }, scene);
    cap.position.set(BRIDGE_X + xOff, deckTopY + 1.225, DECK_Z);
    cap.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, pitch, 0);
    cap.material = capMat;
  }
}

export function buildWater(scene: Scene): void {
  buildWestReach(scene);
  buildEastReach(scene);
  buildChasmFloor(scene);
  buildBridge(scene);
}
