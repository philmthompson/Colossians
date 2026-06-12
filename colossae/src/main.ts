import {
  Engine, Scene, UniversalCamera, Vector3, Color3, Color4,
  DirectionalLight, HemisphericLight, ShadowGenerator,
} from '@babylonjs/core';
import { buildTerrain } from './world/terrain';
import { buildSunDisc, buildClouds, buildNature, updateClouds } from './world/nature';
import { buildWater } from './world/water';
import { buildCity } from './world/city';
import { buildTheatre } from './world/theatre';
import { buildNecropolis, buildMilestone } from './world/necropolis';
import {
  initControls, updateControls, isPointerLocked, setYaw, setTouchControlsHidden,
} from './player/controls';
import { initHUD, updateHUD, isCardOpen, setReticleActive, hidePrompt } from './ui/hud';
import { updateRegions } from './game/regions';
import { updateInteract, tryInteract, registerAllSites } from './game/interact';
import { buildFlock, updateFlock } from './actors/sheep';
import { buildNPCs } from './actors/npc';
import { initWind } from './audio/wind';

// ─── Build version stamp ─────────────────────────────────────────────────────
const versionEl = document.getElementById('build-version');
if (versionEl) versionEl.textContent = `build ${__BUILD_DATE__}`;

// ─── Engine + Canvas ─────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 2));

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new Scene(engine);

const FOG_COLOR = new Color3(0.784, 0.659, 0.478); // 0xc8a87a
scene.fogMode    = Scene.FOGMODE_LINEAR;
scene.fogStart   = 480;
scene.fogEnd     = 980;
scene.fogColor   = FOG_COLOR;
scene.clearColor = new Color4(FOG_COLOR.r, FOG_COLOR.g, FOG_COLOR.b, 1);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new UniversalCamera('cam', new Vector3(100, 0, -50), scene);
camera.minZ = 0.3;
camera.maxZ = 1200;
camera.fov  = 72 * Math.PI / 180;

// ─── Lights ──────────────────────────────────────────────────────────────────
const sun = new DirectionalLight('sun', new Vector3(-280, -120, 80).normalize(), scene);
sun.diffuse   = new Color3(1.0, 0.835, 0.541); // 0xffd58a
sun.intensity = 1.8;

const shadow = new ShadowGenerator(2048, sun);
shadow.usePoissonSampling = true;

const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemi.diffuse    = new Color3(0.831, 0.722, 0.541); // 0xd4b88a
hemi.groundColor = new Color3(0.353, 0.376, 0.251); // 0x5a6040
hemi.intensity  = 1.0;

// ─── World ───────────────────────────────────────────────────────────────────
buildTerrain(scene);
buildSunDisc(scene);
buildClouds(scene);
buildNature(scene);
buildWater(scene);
buildCity(scene);
buildTheatre(scene);
buildNecropolis(scene);
buildMilestone(scene);

// Enable shadows on all meshes (except terrain which receives only)
scene.meshes.forEach(m => {
  if (m.name !== 'terrain') shadow.addShadowCaster(m);
  m.receiveShadows = true;
});

// ─── HUD + interaction ───────────────────────────────────────────────────────
initHUD();
registerAllSites();

// ─── Actors ──────────────────────────────────────────────────────────────────
buildFlock(scene);
buildNPCs(scene);

// Register actor shadows after building
scene.meshes.forEach(m => {
  if (m.name.startsWith('sheep') || m.name.startsWith('npc')) {
    shadow.addShadowCaster(m);
    m.receiveShadows = true;
  }
});

// ─── Audio ───────────────────────────────────────────────────────────────────
initWind();

// ─── Controls ────────────────────────────────────────────────────────────────
initControls(camera, canvas);
setYaw(-Math.PI / 2); // face west toward acropolis

// ─── Intro screen ────────────────────────────────────────────────────────────
const intro    = document.getElementById('intro')!;
const introBtn = document.getElementById('intro-btn')!;

introBtn.addEventListener('click', () => {
  intro.classList.add('fade-out');
  setTimeout(() => intro.remove(), 1100);
  canvas.requestPointerLock();
});

// ─── Key events ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    if (isCardOpen()) closeCard();
    else tryInteract();
  }
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'Escape') {
    const card = document.getElementById('card');
    if (card && !card.classList.contains('hidden')) closeCard();
    const map = document.getElementById('map-overlay');
    if (map && !map.classList.contains('hidden')) closeMap();
  }
});

function toggleMap() {
  const mapOverlay = document.getElementById('map-overlay')!;
  mapOverlay.classList.toggle('hidden');
  if (!mapOverlay.classList.contains('hidden')) {
    drawMap();
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
function closeMap() { document.getElementById('map-overlay')!.classList.add('hidden'); }
function closeCard() {
  document.getElementById('card')!.classList.add('hidden');
  document.getElementById('lb-top')!.classList.remove('open');
  document.getElementById('lb-bot')!.classList.remove('open');
  setTimeout(() => {
    document.getElementById('lb-top')!.classList.add('hidden');
    document.getElementById('lb-bot')!.classList.add('hidden');
  }, 350);
}
document.getElementById('card-close')!.addEventListener('click', closeCard);
document.getElementById('map-close')!.addEventListener('click', closeMap);

function drawMap() {
  const cvs = document.getElementById('map-canvas') as HTMLCanvasElement;
  const ctx = cvs.getContext('2d')!;
  const W = cvs.width, H = cvs.height;
  ctx.fillStyle = '#1a1006';
  ctx.fillRect(0, 0, W, H);

  function wx(x: number) { return 50 + (x + 500) / 1000 * 600; }
  function wz(z: number) { return 50 + (z + 350) / 500 * 400; }

  ctx.strokeStyle = '#c9a55c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(wx(-500), wz(-92)); ctx.lineTo(wx(500), wz(-92));
  ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;

  ctx.strokeStyle = '#5a8aaa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wx(-500), wz(-120)); ctx.lineTo(wx(60), wz(-120)); ctx.stroke();
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(wx(60), wz(-120)); ctx.lineTo(wx(165), wz(-120)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(wx(165), wz(-120)); ctx.lineTo(wx(500), wz(-120)); ctx.stroke();

  ctx.strokeStyle = '#c9a55c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(wx(0), wz(-8), 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c9a55c'; ctx.font = 'bold 11px Georgia';
  ctx.fillText('ACROPOLIS', wx(0) + 16, wz(-8));

  const labels: [string, number, number][] = [
    ['Theatre',224,-48],['Agora',120,-44],['Baths',156,-18],
    ['Philemon',141,-86],['Necropolis',30,-202],['Chasm',112,-120],
    ['Dye Works',53,-104],['Bridge',22,-120],['Pastures',300,-50],['Milestone',292,-89],
  ];
  ctx.fillStyle = '#a89060'; ctx.font = '10px Georgia';
  for (const [name, lx, lz] of labels) ctx.fillText(name, wx(lx), wz(lz));

  const px = camera.position.x, pz = camera.position.z;
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.arc(wx(px), wz(pz), 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#c9a55c'; ctx.font = 'italic 10px Georgia';
  ctx.fillText('← LAODICEA XII M.P.', wx(-480), wz(-92) - 6);

  // Cardinal direction labels on the edges
  ctx.fillStyle = '#c9a55c';
  ctx.font = 'bold 13px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('N', W / 2, 18);
  ctx.fillText('S', W / 2, H - 6);
  ctx.textAlign = 'left';
  ctx.fillText('W', 6, H / 2 + 5);
  ctx.textAlign = 'right';
  ctx.fillText('E', W - 6, H / 2 + 5);
  ctx.textAlign = 'left';   // reset

  ctx.strokeStyle = 'rgba(201,165,92,0.4)'; ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, W - 4, H - 4);
}

// ─── Sun follows player ───────────────────────────────────────────────────────
function updateShadow() {
  const p = camera.position;
  sun.direction = new Vector3(-280, -120, 80).normalize();
  // Move sun target with player for tight shadow frustum
  sun.position.set(p.x - 280, p.y + 120, p.z + 80);
}

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => engine.resize());

// ─── Render loop ─────────────────────────────────────────────────────────────
engine.runRenderLoop(() => {
  const dt      = Math.min(engine.getDeltaTime() / 1000, 0.05);
  const locked  = isPointerLocked(canvas);
  const active  = locked || window.matchMedia('(pointer: coarse)').matches;

  // Hide the touch controls whenever a modal (info card, map, or intro) is up
  const mapOpen   = !document.getElementById('map-overlay')?.classList.contains('hidden');
  const introUp   = !!document.getElementById('intro');
  setTouchControlsHidden(isCardOpen() || mapOpen || introUp);

  updateControls(camera, dt, locked);
  updateFlock(dt);
  updateClouds(dt);
  updateShadow();
  updateHUD(camera);

  if (!isCardOpen()) {
    updateRegions(camera.position);
    updateInteract(camera, active);
  } else {
    setReticleActive(false);
    hidePrompt();
  }

  scene.render();
});
