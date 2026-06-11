import * as THREE from 'three';
import { terrainH } from './terrain';

// Sun disc
export function buildSunDisc(scene: THREE.Scene): THREE.Mesh {
  const geo = new THREE.SphereGeometry(28, 16, 8);
  geo.scale(1, 0.55, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false, depthWrite: false });
  const disc = new THREE.Mesh(geo, mat);
  disc.renderOrder = -1;
  disc.position.set(-600, 180, 300);
  scene.add(disc);
  return disc;
}

// Clouds
export function buildClouds(scene: THREE.Scene): void {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe8c8, fog: false, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const positions: [number, number, number, number, number][] = [
    [-300, 220, -100, 90, 22],
    [ 200, 240,  -80, 70, 18],
    [-100, 210,  200, 110, 20],
    [ 400, 230, -200, 80, 17],
    [  50, 200,  350, 120, 25],
  ];
  for (const [cx, cy, cz, rx, ry] of positions) {
    const geo = new THREE.SphereGeometry(rx, 10, 6);
    geo.scale(1, ry / rx, 0.6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, cz);
    mesh.renderOrder = -1;
    scene.add(mesh);
  }
}

// ─── Cypress tree (tall, narrow) ──────────────────────────────────────────────
function makeCypressTemplate(): THREE.InstancedMesh {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3820 });
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2a4020 });

  // Merge trunk + foliage into one instanced mesh for the foliage cone
  // (trunk handled separately as a simple cylinder in a group)
  const geo = new THREE.CylinderGeometry(0, 1.2, 8, 7);
  const foliage = new THREE.InstancedMesh(geo, foliageMat, 1); // placeholder — count set at placement
  foliage.name = 'cypress-template';
  void trunkMat;
  return foliage;
}
void makeCypressTemplate;

// ─── Build all nature ─────────────────────────────────────────────────────────
export function buildNature(scene: THREE.Scene): void {
  buildOliveGroves(scene);
  buildCypresses(scene);
  buildReeds(scene);
}

function buildOliveGroves(scene: THREE.Scene): void {
  // West grove (x: -200→-80, z: -60→20) and east grove (x: 220→360, z: -70→10)
  const positions: [number, number][] = [];

  // West olive grove
  for (let i = 0; i < 30; i++) {
    const ox = -200 + Math.random() * 120;
    const oz = -60 + Math.random() * 80;
    positions.push([ox, oz]);
  }
  // East olive grove
  for (let i = 0; i < 25; i++) {
    const ox = 230 + Math.random() * 120;
    const oz = -70 + Math.random() * 70;
    positions.push([ox, oz]);
  }

  const trunkMat   = new THREE.MeshLambertMaterial({ color: 0x6a5030 });
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x4a6030 });
  const trunkGeo   = new THREE.CylinderGeometry(0.2, 0.3, 3, 7);
  const foliageGeo = new THREE.SphereGeometry(2.2, 7, 5);

  const trunkInst   = new THREE.InstancedMesh(trunkGeo,   trunkMat,   positions.length);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, positions.length);
  trunkInst.castShadow   = true;
  foliageInst.castShadow = true;
  foliageInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < positions.length; i++) {
    const [ox, oz] = positions[i];
    const ty = terrainH(ox, oz);
    const scale = 0.85 + Math.random() * 0.3;

    dummy.position.set(ox, ty + 1.5, oz);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(ox, ty + 3 + scale * 1.2, oz);
    dummy.scale.set(scale, scale * 0.9, scale);
    dummy.updateMatrix();
    foliageInst.setMatrixAt(i, dummy.matrix);
  }
  scene.add(trunkInst);
  scene.add(foliageInst);
}

function buildCypresses(scene: THREE.Scene): void {
  // Necropolis avenue (x: -35→80, z: -175) and south slopes
  const positions: [number, number][] = [];

  // Necropolis avenue — two rows flanking necropolis spur path
  for (let cx = -30; cx <= 80; cx += 14) {
    positions.push([cx - 4, -175]);
    positions.push([cx + 4, -175]);
  }
  // South slope cypresses
  for (let i = 0; i < 20; i++) {
    const cx = -100 + Math.random() * 200;
    const cz = 80 + Math.random() * 80;
    positions.push([cx, cz]);
  }

  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x1e3018 });
  const trunkMat   = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });
  const foliageGeo = new THREE.CylinderGeometry(0, 1.5, 10, 7);
  const trunkGeo   = new THREE.CylinderGeometry(0.2, 0.25, 3.5, 7);

  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, positions.length);
  const trunkInst   = new THREE.InstancedMesh(trunkGeo,   trunkMat,   positions.length);
  foliageInst.castShadow = true;
  trunkInst.castShadow   = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < positions.length; i++) {
    const [cx, cz] = positions[i];
    const ty = terrainH(cx, cz);
    const h = 0.85 + Math.random() * 0.3;

    dummy.position.set(cx, ty + 1.75, cz);
    dummy.scale.setScalar(h);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(cx, ty + 3.5 + h * 3, cz);
    dummy.scale.set(h, h, h);
    dummy.updateMatrix();
    foliageInst.setMatrixAt(i, dummy.matrix);
  }
  scene.add(trunkInst);
  scene.add(foliageInst);
}

function buildReeds(scene: THREE.Scene): void {
  // Reed beds along the riverbank either side of the chasm
  const reedPositions: [number, number][] = [];
  // West bank reeds
  for (let i = 0; i < 40; i++) {
    const rx = -200 + Math.random() * 240;
    const rz = -128 + Math.random() * 8;
    if (rx > 50 && rx < 175) continue; // skip chasm
    reedPositions.push([rx, rz]);
  }
  // East bank reeds
  for (let i = 0; i < 30; i++) {
    const rx = 170 + Math.random() * 200;
    const rz = -128 + Math.random() * 8;
    reedPositions.push([rx, rz]);
  }

  const reedMat = new THREE.MeshLambertMaterial({ color: 0x8a8040 });
  const reedGeo = new THREE.CylinderGeometry(0.04, 0.06, 2.8, 5);
  const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedPositions.length);
  reedInst.castShadow = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < reedPositions.length; i++) {
    const [rx, rz] = reedPositions[i];
    const ty = terrainH(rx, rz);
    dummy.position.set(rx, ty + 1.4, rz);
    dummy.scale.setScalar(0.7 + Math.random() * 0.6);
    dummy.rotation.z = (Math.random() - 0.5) * 0.25;
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    reedInst.setMatrixAt(i, dummy.matrix);
  }
  scene.add(reedInst);
}
