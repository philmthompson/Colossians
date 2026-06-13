import { Scene, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
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

function buildGorgeWalls(scene: Scene): void {
  const wallM = smat('gorge', 0x6a5c48, scene);
  wallM.backFaceCulling = false;
  const wallLen = 1000, wallH = 14;
  for (const side of [-1, 1]) {
    const mesh = MeshBuilder.CreatePlane('gorge-wall', { width: wallLen, height: wallH }, scene);
    mesh.rotation.y = side > 0 ? 0 : Math.PI;
    mesh.position.set(0, WATER_Y + wallH / 2 - 1, RIVER_Z + side * 9);
    mesh.material = wallM;
  }
}


export function buildBridge(scene: Scene): void {
  // Deck sits level at the city-side terrain so no ramps are needed.
  const NORTH_Y  = terrainH(92, -98);
  const SOUTH_Y  = terrainH(92, -140);
  const DECK_Y   = Math.max(NORTH_Y, SOUTH_Y);
  const BRIDGE_W = 12;   // matches cardo road width
  const DECK_LEN = 44;
  const stoneMat = smat('bridge-s', 0x9a8870, scene);
  const capMat   = smat('bridge-c', 0xb8a880, scene);

  // Main deck slab
  const deck = MeshBuilder.CreateBox('deck', { width: BRIDGE_W, height: 1.4, depth: DECK_LEN }, scene);
  deck.position.set(92, DECK_Y, -119);
  deck.material = stoneMat;
  deck.checkCollisions = true;

  // Solid stone abutments — deep enough to fill any gap between deck and bank
  for (const [az, bankY] of [[-104, NORTH_Y], [-134, SOUTH_Y]] as [number, number][]) {
    const fill = Math.max(6, DECK_Y - bankY + 4);
    const abt = MeshBuilder.CreateBox('abt', { width: BRIDGE_W + 4, height: fill, depth: 7 }, scene);
    abt.position.set(92, DECK_Y - fill * 0.5, az);
    abt.material = stoneMat;
  }

  // Two piers spanning from chasm floor to deck underside
  for (const pz of [-113, -125]) {
    const pier = MeshBuilder.CreateBox('pier', { width: BRIDGE_W - 2, height: 12, depth: 4 }, scene);
    pier.position.set(92, DECK_Y - 5.5, pz);
    pier.material = stoneMat;
  }

  // Arch haunch blocks
  for (const [hz, rx] of [[-108, 0.28], [-130, -0.28]] as [number, number][]) {
    const haunch = MeshBuilder.CreateBox('haunch', { width: BRIDGE_W, height: 2.5, depth: 6 }, scene);
    haunch.position.set(92, DECK_Y - 2.5, hz);
    haunch.rotation.x = rx;
    haunch.material = stoneMat;
  }

  // Parapets
  for (const side of [-1, 1]) {
    const par = MeshBuilder.CreateBox('par', { width: 0.9, height: 1.1, depth: DECK_LEN - 2 }, scene);
    par.position.set(92 + side * (BRIDGE_W / 2 - 0.45), DECK_Y + 1.1, -119);
    par.material = stoneMat;

    const cap = MeshBuilder.CreateBox('cap', { width: 1.1, height: 0.25, depth: DECK_LEN }, scene);
    cap.position.set(92 + side * (BRIDGE_W / 2 - 0.55), DECK_Y + 1.75, -119);
    cap.material = capMat;

    for (let pz = -110; pz >= -128; pz -= 9) {
      const post = MeshBuilder.CreateBox('post', { width: 1.1, height: 1.5, depth: 1.1 }, scene);
      post.position.set(92 + side * (BRIDGE_W / 2 - 0.55), DECK_Y + 1.55, pz);
      post.material = capMat;
    }
  }
}

export function buildWater(scene: Scene): void {
  buildWestReach(scene);
  buildEastReach(scene);
  buildChasmFloor(scene);
  buildGorgeWalls(scene);
  buildBridge(scene);
}
