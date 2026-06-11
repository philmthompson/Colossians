import * as THREE from 'three';

// Sun disc — not affected by fog
export function buildSunDisc(scene: THREE.Scene): THREE.Mesh {
  const geo = new THREE.SphereGeometry(28, 16, 8);
  geo.scale(1, 0.55, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    fog: false,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.renderOrder = -1;
  disc.position.set(-600, 180, 300);
  scene.add(disc);
  return disc;
}

// Simple flattened-sphere clouds
export function buildClouds(scene: THREE.Scene): void {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe8c8,
    fog: false,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
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

// Placeholder — full tree instancing comes in Phase 4
export function buildNature(_scene: THREE.Scene): void {
  // Phase 4 will populate olive groves, cypresses, reeds
}
