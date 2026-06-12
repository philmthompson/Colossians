import { UniversalCamera, Scene } from '@babylonjs/core';
import { terrainH } from '../world/terrain';

const WALK_SPEED = 7.5;
const RUN_SPEED  = 14;
const PLAYER_H   = 1.75;
const FOV_WALK   = 72 * Math.PI / 180;
const FOV_RUN    = 76 * Math.PI / 180;

// ─── Bridge deck ─────────────────────────────────────────────────────────────
function bridgeDeckY(x: number, z: number): number | null {
  if (Math.abs(x - 22) > 4.5) return null;
  const deckZ0 = -140, deckZ1 = -102;
  if (z < deckZ0 || z > deckZ1) return null;
  const DECK_TOP = -8;
  const rampLen  = 10;
  if (z < deckZ0 + rampLen) {
    const t = (z - deckZ0) / rampLen;
    return terrainH(22, deckZ0) + (DECK_TOP - terrainH(22, deckZ0)) * t;
  }
  if (z > deckZ1 - rampLen) {
    const t = (deckZ1 - z) / rampLen;
    return terrainH(22, deckZ1) + (DECK_TOP - terrainH(22, deckZ1)) * t;
  }
  return DECK_TOP;
}

// ─── Theatre step height ──────────────────────────────────────────────────────
const THEATRE_TX = 224, THEATRE_TZ = -48;
const T_R_START  = 12, T_TIER_W = 2.2, T_TIER_H = 0.9, T_TIERS = 8;

function theatreStepH(x: number, z: number): number | null {
  const dx = x - THEATRE_TX, dz = z - THEATRE_TZ;
  const r  = Math.sqrt(dx * dx + dz * dz);
  if (r < T_R_START || r > T_R_START + T_TIERS * T_TIER_W) return null;
  if (Math.abs(Math.atan2(dz, dx)) >= Math.PI * 0.55) return null;
  const tier = Math.max(0, Math.min(T_TIERS - 1, Math.floor((r - T_R_START) / T_TIER_W)));
  return terrainH(THEATRE_TX, THEATRE_TZ) + tier * T_TIER_H;
}

// ─── Circle colliders ─────────────────────────────────────────────────────────
export interface Collider { x: number; z: number; r: number; }
const colliders: Collider[] = [];
export function addCollider(c: Collider) { colliders.push(c); }

// ─── State ────────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
let yaw = 0, pitch = 0, running = false;
let bobPhase = 0, fovCurrent = FOV_WALK;
export let bobOffset = 0;

// ─── Touch ────────────────────────────────────────────────────────────────────
const touch = {
  joyId: -1, joyX: 0, joyY: 0,
  lookId: -1, lookPrevX: 0, lookPrevY: 0,
  joyOriginX: 0, joyOriginY: 0,
};
let touchActive = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initControls(camera: UniversalCamera, canvas: HTMLCanvasElement): void {
  camera.inputs.clear();
  camera.minZ = 0.3;

  if (window.matchMedia('(pointer: coarse)').matches) {
    touchActive = true;
    buildTouchHUD();
  }

  canvas.addEventListener('click', () => {
    if (!touchActive) canvas.requestPointerLock();
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw   -= e.movementX * 0.0018;
    pitch -= e.movementY * 0.0018;
    pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  });

  document.addEventListener('keydown', (e) => { keys[e.code] = true; });
  document.addEventListener('keyup',   (e) => { keys[e.code] = false; });

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function buildTouchHUD(): void {
  const style = document.createElement('style');
  style.textContent = `
    #touch-joy { position:fixed; left:40px; bottom:80px; width:100px; height:100px;
      border:2px solid rgba(201,165,92,0.5); border-radius:50%;
      background:rgba(0,0,0,0.25); touch-action:none; z-index:50; }
    #touch-joy-dot { position:absolute; width:36px; height:36px; border-radius:50%;
      background:rgba(201,165,92,0.6); top:32px; left:32px; }
    #touch-use { position:fixed; right:40px; bottom:80px; padding:14px 22px;
      background:rgba(0,0,0,0.35); border:1px solid rgba(201,165,92,0.5);
      color:#c9a55c; font-family:Georgia,serif; font-size:0.8rem;
      letter-spacing:0.1em; border-radius:4px; z-index:50; touch-action:none; }
    #touch-map { position:fixed; right:40px; bottom:160px; padding:10px 16px;
      background:rgba(0,0,0,0.35); border:1px solid rgba(201,165,92,0.4);
      color:#c9a55c; font-family:Georgia,serif; font-size:0.75rem;
      letter-spacing:0.1em; border-radius:4px; z-index:50; }
  `;
  document.head.appendChild(style);
  const joy = document.createElement('div'); joy.id = 'touch-joy';
  joy.innerHTML = '<div id="touch-joy-dot"></div>';
  document.body.appendChild(joy);
  const useBtn = document.createElement('div'); useBtn.id = 'touch-use';
  useBtn.textContent = 'USE';
  document.body.appendChild(useBtn);
  useBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  });
  const mapBtn = document.createElement('div'); mapBtn.id = 'touch-map';
  mapBtn.textContent = 'MAP';
  document.body.appendChild(mapBtn);
  mapBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
  });
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  for (const t of Array.from(e.changedTouches)) {
    const isLeft = t.clientX < window.innerWidth / 2;
    if (isLeft && touch.joyId === -1) {
      touch.joyId = t.identifier;
      touch.joyOriginX = t.clientX; touch.joyOriginY = t.clientY;
      touch.joyX = 0; touch.joyY = 0;
    } else if (!isLeft && touch.lookId === -1) {
      touch.lookId = t.identifier;
      touch.lookPrevX = t.clientX; touch.lookPrevY = t.clientY;
    }
  }
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  for (const t of Array.from(e.changedTouches)) {
    if (t.identifier === touch.joyId) {
      const dx = t.clientX - touch.joyOriginX;
      const dy = t.clientY - touch.joyOriginY;
      const max = 40;
      touch.joyX = Math.max(-1, Math.min(1, dx / max));
      touch.joyY = Math.max(-1, Math.min(1, dy / max));
      const dot = document.getElementById('touch-joy-dot');
      if (dot) { dot.style.left = (32 + touch.joyX * max * 0.6) + 'px'; dot.style.top = (32 + touch.joyY * max * 0.6) + 'px'; }
      keys['KeyW'] = touch.joyY < -0.3; keys['ArrowUp']    = keys['KeyW'];
      keys['KeyS'] = touch.joyY >  0.3; keys['ArrowDown']  = keys['KeyS'];
      keys['KeyA'] = touch.joyX < -0.3; keys['ArrowLeft']  = keys['KeyA'];
      keys['KeyD'] = touch.joyX >  0.3; keys['ArrowRight'] = keys['KeyD'];
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lookPrevX;
      const dy = t.clientY - touch.lookPrevY;
      yaw   -= dx * 0.004;
      pitch -= dy * 0.004;
      pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
      touch.lookPrevX = t.clientX; touch.lookPrevY = t.clientY;
    }
  }
}

function onTouchEnd(e: TouchEvent): void {
  for (const t of Array.from(e.changedTouches)) {
    if (t.identifier === touch.joyId) {
      touch.joyId = -1; touch.joyX = 0; touch.joyY = 0;
      keys['KeyW'] = false; keys['ArrowUp']    = false;
      keys['KeyS'] = false; keys['ArrowDown']  = false;
      keys['KeyA'] = false; keys['ArrowLeft']  = false;
      keys['KeyD'] = false; keys['ArrowRight'] = false;
      const dot = document.getElementById('touch-joy-dot');
      if (dot) { dot.style.left = '32px'; dot.style.top = '32px'; }
    }
    if (t.identifier === touch.lookId) touch.lookId = -1;
  }
}

// ─── Per-frame update ─────────────────────────────────────────────────────────
export function updateControls(
  camera: UniversalCamera,
  dt: number,
  locked: boolean,
): void {
  if (!locked && !touchActive) return;

  running = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = running ? RUN_SPEED : WALK_SPEED;

  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  let moveX = 0, moveZ = 0;

  if (keys['KeyW'] || keys['ArrowUp'])    { moveX -= sinY; moveZ -= cosY; }
  if (keys['KeyS'] || keys['ArrowDown'])  { moveX += sinY; moveZ += cosY; }
  if (keys['KeyA'] || keys['ArrowLeft'])  { moveX -= cosY; moveZ += sinY; }
  if (keys['KeyD'] || keys['ArrowRight']) { moveX += cosY; moveZ -= sinY; }

  const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (len > 0) { moveX /= len; moveZ /= len; }
  moveX *= speed * dt;
  moveZ *= speed * dt;

  let nx = camera.position.x + moveX;
  let nz = camera.position.z + moveZ;

  nx = Math.max(-980, Math.min(980, nx));
  nz = Math.max(-980, Math.min(980, nz));

  for (const col of colliders) {
    const dx = nx - col.x, dz = nz - col.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < col.r && dist > 0.001) {
      const push = col.r - dist;
      nx += (dx / dist) * push;
      nz += (dz / dist) * push;
    }
  }

  const gy      = terrainH(nx, nz);
  const bridge  = bridgeDeckY(nx, nz);
  const theatre = theatreStepH(nx, nz);
  let groundY   = gy;
  if (bridge  !== null) groundY = Math.max(groundY, bridge);
  if (theatre !== null) groundY = Math.max(groundY, theatre);

  const moving = len > 0;
  if (moving) {
    bobPhase += dt * (running ? 9 : 6);
    bobOffset = Math.sin(bobPhase) * (running ? 0.10 : 0.055);
  } else {
    bobOffset *= 0.85;
    if (Math.abs(bobOffset) < 0.001) bobOffset = 0;
  }

  const targetFov = running ? FOV_RUN : FOV_WALK;
  fovCurrent += (targetFov - fovCurrent) * Math.min(1, dt * 6);
  camera.fov = fovCurrent;

  camera.position.set(nx, groundY + PLAYER_H + bobOffset, nz);
  // Babylon.js FreeCamera default forward is +Z; offset yaw by π to match Three.js (-Z) convention.
  // Negate pitch because Babylon positive rotation.x = look down (opposite of Three.js).
  camera.rotation.set(-pitch, yaw + Math.PI, 0);
}

export function isPointerLocked(canvas: HTMLCanvasElement): boolean {
  return document.pointerLockElement === canvas;
}

export function getYaw(): number { return yaw; }
export function setYaw(v: number) { yaw = v; }

// unused Scene import guard
export const _sceneRef: Scene | null = null;
