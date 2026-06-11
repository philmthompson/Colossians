import * as THREE from 'three';

// ─── Gaussian helpers ────────────────────────────────────────────────────────
function gauss(x: number, z: number, cx: number, cz: number, r: number, h: number) {
  const dx = x - cx, dz = z - cz;
  return h * Math.exp(-(dx * dx + dz * dz) / (2 * r * r));
}

// ─── terrainH: single source of truth used by mesh, player, and all props ───
export function terrainH(x: number, z: number): number {
  let h = 0;

  // Base noise (gentle rolling valley)
  h += 1.2 * Math.sin(x * 0.009 + 0.7) * Math.cos(z * 0.011 + 1.1);
  h += 0.6 * Math.sin(x * 0.021 - 0.3) * Math.cos(z * 0.019 + 0.5);
  h += 0.3 * Math.sin(x * 0.047) * Math.cos(z * 0.043 - 0.9);

  // Acropolis mound — twin peaks
  h += gauss(x, z, -25,  4,  32, 20); // west peak h≈20
  h += gauss(x, z,  32, -20,  28, 15); // east peak h≈15
  h += gauss(x, z,   0,  -8,  55,  8); // shared mound base

  // Theatre hill (east)
  h += gauss(x, z, 224, -48, 28, 13);

  // Mt. Cadmus — far south, towering ridge
  h += gauss(x, z,   0, 750, 320, 250);
  h += gauss(x, z, 200, 720, 280, 220);
  h += gauss(x, z,-200, 780, 260, 200);

  // Northern enclosing hills
  h += gauss(x, z,   0, -580,  220, 95);
  h += gauss(x, z, 300, -620,  180, 90);
  h += gauss(x, z,-300, -560,  200, 88);

  // Smooth Cadmus ramp for z > 140
  if (z > 140) {
    const t = (z - 140) / 200;
    h += t * t * 18;
  }

  // Lycus gorge: negative gaussian channel along z ≈ -120
  const gorgeDepth = 13;
  const dg = z - (-120);
  h -= gorgeDepth * Math.exp(-(dg * dg) / (2 * 8 * 8));

  // Chasm floor extra depression (x 60→165, z ≈ -120)
  if (x > 50 && x < 175) {
    const cx = (x - 50) / 125; // 0→1 across chasm
    const bell = Math.sin(Math.PI * cx);
    const dcz = z - (-120);
    h -= 4 * bell * Math.exp(-(dcz * dcz) / (2 * 6 * 6));
  }

  return h;
}

// ─── Build terrain mesh ──────────────────────────────────────────────────────
const SEGS = 200;
const SIZE = 2000;

export function buildTerrain(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count;

  // Lift vertices by terrainH
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainH(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // Vertex colours
  const colors = new Float32Array(count * 3);
  const colArr = geo.attributes.color as THREE.BufferAttribute | undefined;
  void colArr; // will set below

  const ROAD_Z = -92;
  const ROAD_WIDTH = 7;
  const CARDO_X = 92;
  const CARDO_WIDTH = 6;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);

    let r: number, g: number, b: number;

    // Snow on Cadmus peaks
    if (y > 180) {
      r = 0.92; g = 0.93; b = 0.95;
    } else if (y > 140) {
      const t = (y - 140) / 40;
      r = 0.62 + 0.3 * t; g = 0.58 + 0.35 * t; b = 0.50 + 0.45 * t;
    } else if (y > 30) {
      // Rock
      r = 0.58; g = 0.52; b = 0.44;
    } else if (y > 12) {
      // Dry scrub gold
      r = 0.70; g = 0.62; b = 0.40;
    } else if (y > 3) {
      // Valley grass
      r = 0.46; g = 0.52; b = 0.30;
    } else if (y < -6) {
      // Gorge / water shadow
      r = 0.22; g = 0.26; b = 0.28;
    } else {
      r = 0.42; g = 0.48; b = 0.28;
    }

    // Road tint (dusty tan) — E–W trade road
    const onRoad = Math.abs(z - ROAD_Z) < ROAD_WIDTH;
    // Cardo N–S
    const onCardo = Math.abs(x - CARDO_X) < CARDO_WIDTH && z > -92 && z < 10;
    // Necropolis spur
    const onNecroSpur = Math.abs(x - 22) < 5 && z < -92 && z > -190;

    if (onRoad || onCardo || onNecroSpur) {
      r = r * 0.6 + 0.72 * 0.4;
      g = g * 0.6 + 0.64 * 0.4;
      b = b * 0.6 + 0.44 * 0.4;
    }

    colors[i * 3]     = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'terrain';
  return mesh;
}
