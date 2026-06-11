import * as THREE from 'three';
import { getSite } from '../data/sites';
import { showPrompt, hidePrompt, setReticleActive, openCard } from '../ui/hud';

export interface InteractEntry {
  id: string;
  x: number;
  z: number;
  radius: number;
}

const registry: InteractEntry[] = [];
const npcCycles: Record<string, number> = {};

export function registerSite(entry: InteractEntry): void {
  registry.push(entry);
}

let nearestId: string | null = null;

export function updateInteract(
  camera: THREE.Camera,
  active: boolean,
): void {
  const px = camera.position.x;
  const pz = camera.position.z;

  let closest: InteractEntry | null = null;
  let closestDist = Infinity;

  for (const entry of registry) {
    const dx = px - entry.x;
    const dz = pz - entry.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < entry.radius && dist < closestDist) {
      closestDist = dist;
      closest = entry;
    }
  }

  if (closest && active) {
    nearestId = closest.id;
    const site = getSite(closest.id);
    if (site) {
      setReticleActive(true);
      showPrompt(`[E] ${site.verb}`);
    }
  } else {
    nearestId = null;
    setReticleActive(false);
    hidePrompt();
  }
}

export function tryInteract(): void {
  if (!nearestId) return;
  const site = getSite(nearestId);
  if (!site) return;

  if (site.lines && site.lines.length > 0) {
    // NPC — cycle lines
    const idx = npcCycles[site.id] ?? 0;
    const line = site.lines[idx];
    npcCycles[site.id] = (idx + 1) % site.lines.length;
    openCard(site.title, `<p>"${line}"</p>`, '', 'Colossae · AD 52');
  } else {
    openCard(site.title, `<p>${site.body}</p>`, site.accuracy, site.era ?? 'Colossae · AD 52');
  }
}

// ─── Register all 16 sites (positions from the world layout table) ───────────
export function registerAllSites(): void {
  const sites: [string, number, number, number][] = [
    // id,             x,    z,    radius
    ['theatre',       224,  -48,   32],
    ['agora',         120,  -44,   18],
    ['dye-works',      53, -104,   14],
    ['cardo',          92,  -44,   12],
    ['temple',         70,  -10,   12],
    ['acropolis',       0,   -8,   52],
    ['silo',          -58,   -6,    7],
    ['chasm',         112, -120,   28],
    ['necropolis',     30, -200,   46],
    ['milestone',     292,  -89,    6],
    ['philemon',      141,  -86,   12],
    ['baths',         156,  -18,   14],
    ['epaphras',      116,  -42,    6], // NPC in agora
    ['shepherd',      300,  -50,   10],
    ['doorkeeper',    141,  -78,    5],
    ['flocks',        300,  -50,   40], // wider region trigger for flock inspect
  ];

  for (const [id, x, z, r] of sites) {
    registerSite({ id, x, z, radius: r });
  }
}
