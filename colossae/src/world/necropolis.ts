import { Scene, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { terrainH } from './terrain';
import { addCollider } from '../player/controls';

function smat(name: string, hex: number, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  m.specularColor = Color3.Black();
  return m;
}

export function buildNecropolis(scene: Scene): void {
  const travM = smat('trav', 0xc8b898, scene);
  const lidM  = smat('lid',  0xb8a888, scene);
  const darkM = smat('dark', 0x1a1410, scene);

  const tombs: [number, number, boolean][] = [
    [-30,-185,false],[-18,-185,true], [-6,-185,false],[6,-185,false],
    [18,-185,true],  [30,-185,false], [42,-185,false],[54,-185,true],
    [66,-185,false], [78,-185,false],
    [-24,-197,true], [-12,-197,false],[0,-197,false],  [12,-197,true],
    [24,-197,false], [36,-197,false], [48,-197,true],  [60,-197,false],
    [72,-197,false],
    [-18,-210,false],[0,-210,true],   [18,-210,false], [36,-210,false],
  ];

  for (const [tx, tz, lidAjar] of tombs) {
    const ty  = terrainH(tx, tz);
    const rot = 0.1 * (Math.random() - 0.5);

    // Sarcophagus tub: top rim at ty + 0.8
    const tub = MeshBuilder.CreateBox('tub', { width: 2.0, height: 0.8, depth: 0.9 }, scene);
    tub.position.set(tx, ty + 0.4, tz);
    tub.rotation.y = rot;
    tub.material = travM;

    // Hollow interior — top kept BELOW the tub rim (ty + 0.7) so it never
    // coincides with the lid plane (which caused the z-fighting/dither).
    const interior = MeshBuilder.CreateBox('tub-int', { width: 1.7, height: 0.5, depth: 0.62 }, scene);
    interior.position.set(tx, ty + 0.45, tz);
    interior.rotation.y = rot;
    interior.material = darkM;

    // Lid: a solid, thick block (0.35 high) that rests ON the rim. Its bottom
    // sits at ty + 0.8 (the rim), so the dark interior is fully enclosed and no
    // two surfaces share a plane.
    const lid = MeshBuilder.CreateBox('lid', { width: 2.06, height: 0.35, depth: 0.96 }, scene);
    if (lidAjar) {
      // Slid partly off to one side, but still thick and clearly readable.
      lid.position.set(tx + 0.7, ty + 1.02, tz + 0.18);
      lid.rotation.y = rot + 0.25;
    } else {
      lid.position.set(tx, ty + 0.975, tz);
      lid.rotation.y = rot;
    }
    lid.material = lidM;

    addCollider({ x: tx, z: tz, r: 1.4 });
  }
}

export function buildMilestone(scene: Scene): void {
  const MX = 292, MZ = -89;
  const ty  = terrainH(MX, MZ);
  const m   = smat('ms', 0x7a7060, scene);

  const shaft = MeshBuilder.CreateCylinder('ms-shaft', { diameterTop: 0.5, diameterBottom: 0.6, height: 1.6, tessellation: 10 }, scene);
  shaft.position.set(MX, ty + 0.8, MZ);
  shaft.material = m;

  const cap = MeshBuilder.CreateCylinder('ms-cap', { diameter: 0.64, height: 0.22, tessellation: 10 }, scene);
  cap.position.set(MX, ty + 1.71, MZ);
  cap.material = m;

  addCollider({ x: MX, z: MZ, r: 1 });
}
