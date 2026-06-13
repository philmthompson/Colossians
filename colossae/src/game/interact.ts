import { getSite } from '../data/sites';
import { showPrompt, hidePrompt, setReticleActive, openCard } from '../ui/hud';
import { setTouchExamine, clearTouchExamine } from '../player/controls';
import { playInteractChime, speakNPCLine } from '../audio/interact';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  camera: any,
  active: boolean,
): void {
  const px = camera.position.x;
  const pz = camera.position.z;

  let closest: InteractEntry | null = null;
  let closestDist = Infinity;

  for (const entry of registry) {
    const dx = px - entry.x, dz = pz - entry.z;
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
      setTouchExamine(site.verb, tryInteract);
    }
  } else {
    nearestId = null;
    setReticleActive(false);
    hidePrompt();
    clearTouchExamine();
  }
}

export function tryInteract(): void {
  if (!nearestId) return;
  const site = getSite(nearestId);
  if (!site) return;
  if (site.lines && site.lines.length > 0) {
    const idx  = npcCycles[site.id] ?? 0;
    npcCycles[site.id] = (idx + 1) % site.lines.length;
    const line = site.lines[idx];
    openCard(site.title, `<p>${line}</p>`, '', 'Colossae · AD 52');
    speakNPCLine(site.id, line);
  } else {
    playInteractChime();
    openCard(site.title, `<p>${site.body}</p>`, site.accuracy, site.era ?? 'Colossae · AD 52');
  }
}

export function registerAllSites(): void {
  const sites: [string, number, number, number][] = [
    ['theatre',   224, -48, 32], ['agora',      112, -29, 14],
    ['dye-works',  53,-104, 14], ['cardo',       92, -44, 12],
    ['temple',     70, -10, 12], ['acropolis',    0,  -8, 52],
    ['silo',      -58,  -6,  7], ['chasm',      112,-120, 28],
    ['necropolis', 30,-200, 46], ['necropolis-dig', 30,-212, 12],
    ['milestone',  292, -89,  6], ['cadmus',      0, -300, 55],
    ['philemon',  141, -86, 12], ['baths',      156, -18, 14],
    ['aristarchus', 116, -42,  6], ['shepherd',   300, -50, 10],
    ['doorkeeper',141, -78,  5], ['flocks',     300, -50, 40],
  ];
  for (const [id, x, z, r] of sites) registerSite({ id, x, z, radius: r });
}
