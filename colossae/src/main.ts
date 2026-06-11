import * as THREE from 'three';
import { buildTerrain } from './world/terrain';
import { buildSunDisc, buildClouds, buildNature } from './world/nature';
import { buildWater } from './world/water';
import { buildCity } from './world/city';
import { buildTheatre } from './world/theatre';
import { buildNecropolis, buildMilestone } from './world/necropolis';
import {
  initControls,
  updateControls,
  isPointerLocked,
  setYaw,
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

// ─── Renderer ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const FOG_COLOR = 0xc8a87a;
scene.fog = new THREE.Fog(FOG_COLOR, 480, 980);
scene.background = new THREE.Color(FOG_COLOR);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.3, 1200);
// Spawn: western road at (-150, z=-92), y clamped to ground on first frame
camera.position.set(-150, 0, -92);

// ─── Lights ──────────────────────────────────────────────────────────────────
// Warm afternoon sun from the west (low, golden)
const sun = new THREE.DirectionalLight(0xffd58a, 1.8);
sun.position.set(-280, 120, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;
sun.shadow.camera.left   = -140;
sun.shadow.camera.right  =  140;
sun.shadow.camera.top    =  140;
sun.shadow.camera.bottom = -140;
sun.shadow.bias = -0.001;
scene.add(sun);
scene.add(sun.target);

// Hemisphere fill — warm sky / cool earth
const hemi = new THREE.HemisphereLight(0xd4b88a, 0x5a6040, 1.0);
scene.add(hemi);

// Ambient
const amb = new THREE.AmbientLight(0x8a7060, 0.5);
scene.add(amb);

// ─── World ───────────────────────────────────────────────────────────────────
const terrain = buildTerrain();
scene.add(terrain);

buildSunDisc(scene);
buildClouds(scene);
buildNature(scene);
buildWater(scene);
buildCity(scene);
buildTheatre(scene);
buildNecropolis(scene);
buildMilestone(scene);

// ─── HUD + interaction ───────────────────────────────────────────────────────
initHUD();
registerAllSites();

// ─── Actors ──────────────────────────────────────────────────────────────────
buildFlock(scene);
buildNPCs(scene);

// ─── Audio ───────────────────────────────────────────────────────────────────
initWind();

// ─── Controls ────────────────────────────────────────────────────────────────
initControls(camera, canvas);
// Face east on spawn
setYaw(Math.PI / 2);

// ─── Intro screen ────────────────────────────────────────────────────────────
const intro    = document.getElementById('intro')!;
const introBtn = document.getElementById('intro-btn')!;

introBtn.addEventListener('click', () => {
  intro.classList.add('fade-out');
  setTimeout(() => intro.remove(), 1100);
  canvas.requestPointerLock();
});

// ─── Key events (map, esc) ───────────────────────────────────────────────────
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
function closeMap() {
  document.getElementById('map-overlay')!.classList.add('hidden');
}
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

// Minimal map drawing for Phase 1
function drawMap() {
  const cvs = document.getElementById('map-canvas') as HTMLCanvasElement;
  const ctx = cvs.getContext('2d')!;
  const W = cvs.width, H = cvs.height;
  ctx.fillStyle = '#1a1006';
  ctx.fillRect(0, 0, W, H);

  // Transform world coords to canvas coords
  // World x: -500..500 → canvas x: 50..650, world z: -350..150 → canvas y: 50..450
  function wx(x: number) { return 50 + (x + 500) / 1000 * 600; }
  function wz(z: number) { return 50 + (z + 350) / 500 * 400; }

  ctx.strokeStyle = '#c9a55c';
  ctx.lineWidth = 1;

  // Trade road
  ctx.beginPath();
  ctx.moveTo(wx(-500), wz(-92)); ctx.lineTo(wx(500), wz(-92));
  ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;

  // Lycus river (solid west of chasm, dashed over chasm, solid east)
  ctx.strokeStyle = '#5a8aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wx(-500), wz(-120)); ctx.lineTo(wx(60), wz(-120));
  ctx.stroke();

  // Dashed underground reach
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(wx(60), wz(-120)); ctx.lineTo(wx(165), wz(-120));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(wx(165), wz(-120)); ctx.lineTo(wx(500), wz(-120));
  ctx.stroke();

  // Acropolis mound
  ctx.strokeStyle = '#c9a55c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(wx(0), wz(-8), 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#c9a55c';
  ctx.font = 'bold 11px Georgia';
  ctx.fillText('ACROPOLIS', wx(0) + 16, wz(-8));

  // Labels
  const labels: [string, number, number][] = [
    ['Theatre',     224, -48],
    ['Agora',       120, -44],
    ['Baths',       156, -18],
    ['Philemon',    141, -86],
    ['Necropolis',   30,-202],
    ['Chasm',       112,-120],
    ['Dye Works',    53,-104],
    ['Bridge',       22,-120],
    ['Pastures',    300, -50],
    ['Milestone',   292, -89],
  ];

  ctx.fillStyle = '#a89060';
  ctx.font = '10px Georgia';
  for (const [name, lx, lz] of labels) {
    ctx.fillText(name, wx(lx), wz(lz));
  }

  // Player position
  const px = camera.position.x;
  const pz = camera.position.z;
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(wx(px), wz(pz), 4, 0, Math.PI * 2);
  ctx.fill();

  // Laodicea label
  ctx.fillStyle = '#c9a55c';
  ctx.font = 'italic 10px Georgia';
  ctx.fillText('← LAODICEA XII M.P.', wx(-480), wz(-92) - 6);

  // Border
  ctx.strokeStyle = 'rgba(201,165,92,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, W - 4, H - 4);
}

// ─── Sun follows player (tight shadow frustum) ────────────────────────────────
function updateShadow() {
  const p = camera.position;
  sun.position.set(p.x - 280, p.y + 120, p.z + 80);
  sun.target.position.set(p.x, p.y, p.z);
  sun.target.updateMatrixWorld();
}

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Loop ────────────────────────────────────────────────────────────────────
let prev = performance.now();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  const locked = isPointerLocked(canvas);
  const active = locked || window.matchMedia('(pointer: coarse)').matches;
  updateControls(camera, dt, locked);
  updateFlock(dt);
  updateShadow();
  updateHUD(camera);
  if (!isCardOpen()) {
    updateRegions(camera.position);
    updateInteract(camera, active);
  } else {
    setReticleActive(false);
    hidePrompt();
  }

  renderer.render(scene, camera);
}

loop();
