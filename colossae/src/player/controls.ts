import * as THREE from 'three';
import { terrainH } from '../world/terrain';

const WALK_SPEED  = 7.5;
const RUN_SPEED   = 14;
const PLAYER_H    = 1.75;
const FOV_WALK    = 72;
const FOV_RUN     = 76;

// ─── Bridge deck profile ─────────────────────────────────────────────────────
// Bridge at x=22, spanning gorge at z≈-120, deck ~6 m above gorge floor
function bridgeDeckY(x: number, z: number): number | null {
  if (Math.abs(x - 22) > 4.5) return null; // not on bridge width
  const deckZ0 = -140, deckZ1 = -102; // approach ramp extents
  if (z < deckZ0 || z > deckZ1) return null;
  // Deck height: gorge floor at z=-120 is terrainH(22,-120)≈-13
  // Deck sits ~3 m above that
  const DECK_TOP = -8;
  // Ramped approaches
  const rampLen = 10;
  if (z < deckZ0 + rampLen) {
    const t = (z - deckZ0) / rampLen;
    return THREE.MathUtils.lerp(terrainH(22, deckZ0), DECK_TOP, t);
  }
  if (z > deckZ1 - rampLen) {
    const t = (deckZ1 - z) / rampLen;
    return THREE.MathUtils.lerp(terrainH(22, deckZ1), DECK_TOP, t);
  }
  return DECK_TOP;
}

// ─── Circle colliders (set by city/theatre builders) ─────────────────────────
export interface Collider { x: number; z: number; r: number; }
const colliders: Collider[] = [];
export function addCollider(c: Collider) { colliders.push(c); }

// ─── State ───────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
let yaw   = 0; // radians, controlled by mouse
let pitch = 0;
let running = false;

let bobPhase = 0;
let fovCurrent = FOV_WALK;

export const velocity = new THREE.Vector3();
export let bobOffset = 0;

// ─── Touch state ──────────────────────────────────────────────────────────────
const touch = {
  joyId:   -1, joyX: 0,  joyY: 0,   // left joystick
  lookId:  -1, lookPrevX: 0, lookPrevY: 0, // right half drag-look
  joyOriginX: 0, joyOriginY: 0,
};
let touchActive = false;
// Virtual key state driven by touch
const touchKeys = { w: false, a: false, s: false, d: false };

// ─── Setup ───────────────────────────────────────────────────────────────────
export function initControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
): void {
  // Detect coarse pointer → show touch UI
  if (window.matchMedia('(pointer: coarse)').matches) {
    touchActive = true;
    buildTouchHUD();
  }

  canvas.addEventListener('click', () => {
    if (!touchActive) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    // nothing special needed
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw   -= e.movementX * 0.0018;
    pitch -= e.movementY * 0.0018;
    pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  });

  document.addEventListener('keydown', (e) => { keys[e.code] = true; });
  document.addEventListener('keyup',   (e) => { keys[e.code] = false; });

  // Touch handlers
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

  camera.rotation.order = 'YXZ';
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
      touch.joyOriginX = t.clientX;
      touch.joyOriginY = t.clientY;
      touch.joyX = 0; touch.joyY = 0;
    } else if (!isLeft && touch.lookId === -1) {
      touch.lookId = t.identifier;
      touch.lookPrevX = t.clientX;
      touch.lookPrevY = t.clientY;
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
      // Update dot
      const dot = document.getElementById('touch-joy-dot');
      if (dot) {
        dot.style.left = (32 + touch.joyX * max * 0.6) + 'px';
        dot.style.top  = (32 + touch.joyY * max * 0.6) + 'px';
      }
      touchKeys.w = touch.joyY < -0.3;
      touchKeys.s = touch.joyY >  0.3;
      touchKeys.a = touch.joyX < -0.3;
      touchKeys.d = touch.joyX >  0.3;
      // Map to virtual keys
      keys['KeyW'] = touchKeys.w; keys['ArrowUp']    = touchKeys.w;
      keys['KeyS'] = touchKeys.s; keys['ArrowDown']  = touchKeys.s;
      keys['KeyA'] = touchKeys.a; keys['ArrowLeft']  = touchKeys.a;
      keys['KeyD'] = touchKeys.d; keys['ArrowRight'] = touchKeys.d;
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lookPrevX;
      const dy = t.clientY - touch.lookPrevY;
      yaw   -= dx * 0.004;
      pitch -= dy * 0.004;
      pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
      touch.lookPrevX = t.clientX;
      touch.lookPrevY = t.clientY;
    }
  }
}

function onTouchEnd(e: TouchEvent): void {
  for (const t of Array.from(e.changedTouches)) {
    if (t.identifier === touch.joyId) {
      touch.joyId = -1;
      touch.joyX = 0; touch.joyY = 0;
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

// ─── Per-frame update ────────────────────────────────────────────────────────
export function updateControls(
  camera: THREE.PerspectiveCamera,
  dt: number,
  locked: boolean,
): void {
  if (!locked && !touchActive) return;

  running = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = running ? RUN_SPEED : WALK_SPEED;

  // Movement direction in camera-yaw space
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right   = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const move    = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.sub(forward);
  if (keys['KeyS'] || keys['ArrowDown'])  move.add(forward);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);

  if (move.lengthSq() > 0) move.normalize();
  move.multiplyScalar(speed * dt);

  let nx = camera.position.x + move.x;
  let nz = camera.position.z + move.z;

  // Clamp to world bounds
  nx = Math.max(-980, Math.min(980, nx));
  nz = Math.max(-980, Math.min(980, nz));

  // Circle collider pushout
  for (const col of colliders) {
    const dx = nx - col.x, dz = nz - col.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < col.r && dist > 0.001) {
      const push = col.r - dist;
      nx += (dx / dist) * push;
      nz += (dz / dist) * push;
    }
  }

  // Ground clamp + bridge override
  const gy = terrainH(nx, nz);
  const bridge = bridgeDeckY(nx, nz);
  let groundY = gy;
  if (bridge !== null) groundY = Math.max(gy, bridge);

  // Head bob
  const moving = move.lengthSq() > 0;
  if (moving) {
    bobPhase += dt * (running ? 9 : 6);
    bobOffset = Math.sin(bobPhase) * (running ? 0.10 : 0.055);
  } else {
    bobOffset *= 0.85;
    if (Math.abs(bobOffset) < 0.001) bobOffset = 0;
  }

  // FOV ease
  const targetFov = running ? FOV_RUN : FOV_WALK;
  fovCurrent += (targetFov - fovCurrent) * Math.min(1, dt * 6);
  camera.fov = fovCurrent;
  camera.updateProjectionMatrix();

  camera.position.set(nx, groundY + PLAYER_H + bobOffset, nz);
  camera.rotation.set(pitch, yaw, 0);
}

export function isPointerLocked(canvas: HTMLCanvasElement): boolean {
  return document.pointerLockElement === canvas;
}

export function getYaw(): number { return yaw; }
export function setYaw(v: number) { yaw = v; }
