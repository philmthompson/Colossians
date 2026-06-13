import { Vector3 } from '@babylonjs/core';
import { showBanner } from '../ui/hud';

interface Region {
  name: string;
  subtitle: string;
  test: (pos: Vector3) => boolean;
}

const REGIONS: Region[] = [
  {
    name: 'The Lycus Valley', subtitle: 'Phrygia · Asia Minor',
    test: pos => pos.x < -120 && Math.abs(pos.z - (-92)) < 15,
  },
  {
    name: 'The Acropolis', subtitle: 'Höyük · Colossae',
    test: pos => {
      const dx = pos.x, dz = pos.z - (-8);
      return Math.sqrt(dx * dx + dz * dz) < 50;
    },
  },
  {
    name: 'The Lower City', subtitle: 'Colossae · AD 52',
    test: pos => pos.x > 55 && pos.x < 195 && pos.z > -95 && pos.z < 0,
  },
  {
    name: 'The Theatre', subtitle: 'Cavea of Colossae',
    test: pos => {
      const dx = pos.x - 224, dz = pos.z - (-48);
      return Math.sqrt(dx * dx + dz * dz) < 38;
    },
  },
  {
    name: 'The Necropolis', subtitle: 'North of the Lycus',
    test: pos => pos.x > -40 && pos.x < 100 && pos.z < -175 && pos.z > -230,
  },
  {
    name: 'Mount Cadmus', subtitle: 'Honaz Dağı · 2,571 m',
    test: pos => Math.abs(pos.x) < 120 && pos.z > 280,
  },
  {
    name: 'The Chasm', subtitle: 'Herodotus 7.30',
    test: pos => pos.x > 55 && pos.x < 170 && Math.abs(pos.z - (-120)) < 22,
  },
  {
    name: 'Eastern Pastures', subtitle: 'The Flock of the Lycus',
    test: pos => {
      const dx = pos.x - 300, dz = pos.z - (-50);
      return Math.sqrt(dx * dx + dz * dz) < 40;
    },
  },
];

const visited = new Set<string>();
let lastRegion = '';

export function updateRegions(pos: Vector3): void {
  for (const region of REGIONS) {
    if (region.test(pos)) {
      if (lastRegion !== region.name) {
        lastRegion = region.name;
        if (!visited.has(region.name)) {
          visited.add(region.name);
          showBanner(region.name, region.subtitle);
        }
      }
      return;
    }
  }
  lastRegion = '';
}
