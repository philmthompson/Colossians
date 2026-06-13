import { UniversalCamera, Scene, Vector3 } from '@babylonjs/core';
import { terrainH } from '../world/terrain';

const WALK_SPEED = 7.5;
const RUN_SPEED  = 14;
const PLAYER_H   = 1.75;
const FOV_WALK   = 72 * Math.PI / 180;
const FOV_RUN    = 76 * Math.PI / 180;

// ─── Bridge deck ─────────────────────────────────────────────────────────────
// Mirrors buildBridge in water.ts: sampled bank heights, linearly interpolated.
const BRIDGE_N_Z = -98,  BRIDGE_S_Z = -142;
const BRIDGE_N_Y = terrainH(92, BRIDGE_N_Z);
const BRIDGE_S_Y = terrainH(92, BRIDGE_S_Z);
function bridgeDeckY(x: number, z: number): number | null {
  if (Math.abs(x - 92) > 6) return null;
  if (z < BRIDGE_S_Z || z > BRIDGE_N_Z) return null;
  const t = (z - BRIDGE_S_Z) / (BRIDGE_N_Z - BRIDGE_S_Z);
  return BRIDGE_S_Y + t * (BRIDGE_N_Y - BRIDGE_S_Y);
}

// ─── Theatre step height — keep in sync with theatre.ts constants ─────────────
const THEATRE_TX = 224, THEATRE_TZ = -48;
const T_R_START  = 10, T_TIER_W = 0.75, T_TIER_H = 0.38, T_TIERS = 24;

function theatreStepH(x: number, z: number): number | null {
  const dx = x - THEATRE_TX, dz = z - THEATRE_TZ;
  const r  = Math.sqrt(dx * dx + dz * dz);
  if (r < T_R_START || r > T_R_START + T_TIERS * T_TIER_W) return null;
  if (Math.abs(Math.atan2(dz, dx)) >= Math.PI * 0.55) return null;
  const tier = Math.max(0, Math.min(T_TIERS - 1, Math.floor((r - T_R_START) / T_TIER_W)));
  return terrainH(THEATRE_TX, THEATRE_TZ) + tier * T_TIER_H;
}

// ─── Temple podium floor (player can walk on top of the podium steps) ─────────
const TEMPLE_TX = 70, TEMPLE_TZ = -10;

// Mirrors footprintMaxY(70,-10,18,12) + 1.2 from city.ts — precomputed once.
const TEMPLE_PODIUM_TOP: number = (() => {
  let max = -Infinity;
  for (const ox of [-9, 0, 9]) for (const oz of [-6, 0, 6]) {
    max = Math.max(max, terrainH(TEMPLE_TX + ox, TEMPLE_TZ + oz));
  }
  return max + 1.2;
})();

function templeFloorY(x: number, z: number): number | null {
  const dx = x - TEMPLE_TX, dz = z - TEMPLE_TZ;
  // On the podium surface (rectangular footprint: 18 wide × 12 deep)
  if (Math.abs(dx) <= 9 && Math.abs(dz) <= 6) return TEMPLE_PODIUM_TOP;
  // Step ramps on BOTH ends — east (city) and west (acropolis) approaches.
  if (Math.abs(dz) <= 6 && Math.abs(dx) <= 12) {
    const t = (Math.abs(dx) - 9) / 3;
    return TEMPLE_PODIUM_TOP * (1 - t) + terrainH(x, z) * t;
  }
  return null;
}

// ─── Building roof / floor heights ───────────────────────────────────────────
// Returns the walkable top surface of raised platforms / building roofs when the
// player is within the footprint. Like the bridge and theatre, these override
// the raw terrain height so the player stands on the structure rather than
// sinking through it.
function buildingFloorY(x: number, z: number): number | null {
  // Baths roof — only when approaching from the hill side (terrain nearly as high)
  {
    const bRoof = terrainH(156, -18) + 7;
    if (Math.abs(x - 156) < 11 && Math.abs(z + 18) < 7.5 && terrainH(x, z) > bRoof - 2) {
      return bRoof;
    }
  }
  // Philemon's house roof
  {
    const pRoof = terrainH(141, -86) + 4.5;
    if (Math.abs(x - 141) < 9 && Math.abs(z + 86) < 8 && terrainH(x, z) > pRoof - 2) {
      return pRoof;
    }
  }
  return null;
}

// ─── Circle colliders ─────────────────────────────────────────────────────────
export interface Collider { x: number; z: number; r: number; }
const colliders: Collider[] = [];
export function addCollider(c: Collider) { colliders.push(c); }

// ─── Developer flight mode ────────────────────────────────────────────────────
let _flightMode = false;
const FLIGHT_SPEED = 45;
export function toggleFlightMode(): void { _flightMode = !_flightMode; }
export function isFlightMode(): boolean  { return _flightMode; }

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
// Examine action swapped onto the action button while near a site
let touchExamineHandler: (() => void) | null = null;

// Called by interact.ts when the player is near an interactive site
export function setTouchExamine(verb: string, handler: () => void): void {
  const btn = document.getElementById('touch-use');
  if (btn) { btn.textContent = verb.toUpperCase(); btn.style.display = ''; }
  touchExamineHandler = handler;
}
export function clearTouchExamine(): void {
  const btn = document.getElementById('touch-use');
  if (btn) btn.style.display = 'none';
  touchExamineHandler = null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initControls(camera: UniversalCamera, canvas: HTMLCanvasElement): void {
  camera.inputs.clear();
  camera.minZ = 0.3;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.4, 0.85, 0.4);

  if (window.matchMedia('(pointer: coarse)').matches) {
    touchActive = true;
    buildTouchHUD();
  }

  canvas.addEventListener('click', () => {
    if (!touchActive) canvas.requestPointerLock();
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw   += e.movementX * 0.0018;
    pitch -= e.movementY * 0.0018;
    // In flight mode allow full vertical range so you can look straight down
    const pitchLimit = _flightMode ? Math.PI * 0.49 : Math.PI / 3;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
  });

  document.addEventListener('keydown', (e) => { keys[e.code] = true; });
  document.addEventListener('keyup',   (e) => { keys[e.code] = false; });

  // Listen on document, not canvas: the joystick / dot are overlay divs layered
  // above the canvas, so touches on them never bubble to a canvas listener.
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: false });
  document.addEventListener('touchcancel', onTouchEnd,  { passive: false });
}

// Hide / show the on-screen touch controls (joystick, USE, MAP) — called when a
// modal opens so the controls don't sit on top of the card or map.
let touchHidden = false;
export function setTouchControlsHidden(hidden: boolean): void {
  if (!touchActive || hidden === touchHidden) return;
  touchHidden = hidden;
  for (const id of ['touch-joy', 'touch-use', 'touch-map']) {
    const el = document.getElementById(id);
    if (el) el.style.display = hidden ? 'none' : '';
  }
  if (hidden) {
    // Release any in-progress joystick so the player stops moving
    touch.joyId = -1; touch.joyX = 0; touch.joyY = 0;
    touch.lookId = -1;
    const dot = document.getElementById('touch-joy-dot');
    if (dot) { dot.style.left = '35px'; dot.style.top = '35px'; }
  }
}

function buildTouchHUD(): void {
  const style = document.createElement('style');
  style.textContent = `
    #touch-joy { position:fixed; left:40px; bottom:80px; width:110px; height:110px;
      border:2px solid rgba(201,165,92,0.5); border-radius:50%;
      background:rgba(0,0,0,0.28); touch-action:none; z-index:50; }
    #touch-joy-dot { position:absolute; width:40px; height:40px; border-radius:50%;
      background:rgba(201,165,92,0.65); top:35px; left:35px;
      transition: none; }
    #touch-use { position:fixed; right:40px; bottom:80px; padding:16px 24px;
      background:rgba(0,0,0,0.38); border:1px solid rgba(201,165,92,0.55);
      color:#c9a55c; font-family:Georgia,serif; font-size:0.82rem;
      letter-spacing:0.12em; border-radius:4px; z-index:50; touch-action:none;
      user-select:none; -webkit-user-select:none; }
    #touch-map { position:fixed; right:40px; bottom:172px; padding:12px 18px;
      background:rgba(0,0,0,0.35); border:1px solid rgba(201,165,92,0.4);
      color:#c9a55c; font-family:Georgia,serif; font-size:0.75rem;
      letter-spacing:0.1em; border-radius:4px; z-index:50;
      user-select:none; -webkit-user-select:none; }
  `;
  document.head.appendChild(style);

  const joy = document.createElement('div'); joy.id = 'touch-joy';
  joy.innerHTML = '<div id="touch-joy-dot"></div>';
  document.body.appendChild(joy);

  const useBtn = document.createElement('div'); useBtn.id = 'touch-use';
  useBtn.textContent = 'USE';
  useBtn.style.display = 'none';   // hidden until near an interactive site
  document.body.appendChild(useBtn);
  useBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (touchExamineHandler) {
      touchExamineHandler();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }
  });

  const mapBtn = document.createElement('div'); mapBtn.id = 'touch-map';
  mapBtn.textContent = 'MAP';
  document.body.appendChild(mapBtn);
  mapBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
  });
}

// Joystick circle radius in CSS pixels (matches width/height above ÷ 2)
const JOY_R = 55;
// Max dot travel from centre in CSS pixels (≈ circle_r − half_dot_size)
const JOY_DOT_TRAVEL = 32;

// True when the touch target is one of the action buttons (let them self-handle)
function onButton(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const id = el.id || el.closest?.('#touch-use, #touch-map')?.id;
  return id === 'touch-use' || id === 'touch-map';
}

function onTouchStart(e: TouchEvent): void {
  if (touchHidden) return;
  let handled = false;
  for (const t of Array.from(e.changedTouches)) {
    if (onButton(t.target)) continue;   // button has its own handler
    handled = true;

    // Activate joystick only when the touch lands inside the joystick circle
    if (touch.joyId === -1) {
      const joyEl = document.getElementById('touch-joy');
      if (joyEl) {
        const rect = joyEl.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        const d  = Math.sqrt((t.clientX - cx) ** 2 + (t.clientY - cy) ** 2);
        if (d <= JOY_R + 10) {            // small tolerance for fat fingers
          touch.joyId = t.identifier;
          touch.joyOriginX = cx;          // fixed at circle centre
          touch.joyOriginY = cy;
          touch.joyX = 0; touch.joyY = 0;
          continue;
        }
      }
    }
    // Everything else is a look touch
    if (touch.lookId === -1) {
      touch.lookId = t.identifier;
      touch.lookPrevX = t.clientX; touch.lookPrevY = t.clientY;
    }
  }
  if (handled) e.preventDefault();
}

function onTouchMove(e: TouchEvent): void {
  if (touchHidden) return;
  if (touch.joyId !== -1 || touch.lookId !== -1) e.preventDefault();
  for (const t of Array.from(e.changedTouches)) {
    if (t.identifier === touch.joyId) {
      const dx   = t.clientX - touch.joyOriginX;
      const dy   = t.clientY - touch.joyOriginY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Normalise direction, clamp magnitude to [0, 1] based on circle radius
      const ratio = Math.min(dist / JOY_R, 1);
      if (dist > 0) {
        touch.joyX = (dx / dist) * ratio;
        touch.joyY = (dy / dist) * ratio;
      } else {
        touch.joyX = 0; touch.joyY = 0;
      }
      // Move dot
      const dot = document.getElementById('touch-joy-dot');
      if (dot) {
        dot.style.left = (35 + touch.joyX * JOY_DOT_TRAVEL) + 'px';
        dot.style.top  = (35 + touch.joyY * JOY_DOT_TRAVEL) + 'px';
      }
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lookPrevX;
      const dy = t.clientY - touch.lookPrevY;
      yaw   += dx * 0.004;
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
      const dot = document.getElementById('touch-joy-dot');
      if (dot) { dot.style.left = '35px'; dot.style.top = '35px'; }
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

  // ── Developer flight mode (toggled by '0' key in main.ts) ──────────────────
  if (_flightMode) {
    const sp = (keys['ShiftLeft'] || keys['ShiftRight']) ? FLIGHT_SPEED * 3 : FLIGHT_SPEED;
    const sinP = Math.sin(pitch), cosP = Math.cos(pitch);
    const sinY2 = Math.sin(yaw), cosY2 = Math.cos(yaw);
    let mx = 0, my = 0, mz = 0;
    // WASD: full 3-D camera-relative movement
    if (keys['KeyW'] || keys['ArrowUp'])    { mx -= sinY2 * cosP; my += sinP; mz -= cosY2 * cosP; }
    if (keys['KeyS'] || keys['ArrowDown'])  { mx += sinY2 * cosP; my -= sinP; mz += cosY2 * cosP; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { mx += cosY2; mz -= sinY2; }
    if (keys['KeyD'] || keys['ArrowRight']) { mx -= cosY2; mz += sinY2; }
    // E / Space = fly up, Q / C = fly down (independent of look direction)
    if (keys['KeyE'] || keys['Space'])     my += 1;
    if (keys['KeyQ'] || keys['KeyC'])      my -= 1;
    const len = Math.sqrt(mx * mx + my * my + mz * mz);
    if (len > 0) { mx /= len; my /= len; mz /= len; }
    camera.position.x += mx * sp * dt;
    camera.position.y += my * sp * dt;
    camera.position.z += mz * sp * dt;
    camera.rotation.set(-pitch, yaw + Math.PI, 0);
    return;
  }

  const jx = touch.joyX, jy = touch.joyY;
  const jlen = Math.sqrt(jx * jx + jy * jy);

  // Sprint when joystick is pushed >85% of full range, or Shift on keyboard
  running = keys['ShiftLeft'] || keys['ShiftRight'] || (touchActive && jlen > 0.85);
  const speed = running ? RUN_SPEED : WALK_SPEED;

  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  let moveX = 0, moveZ = 0;

  if (touchActive) {
    // Analog joystick: jy < 0 = stick pushed up = forward; jx > 0 = right = strafe right.
    // Speed scales linearly with how far the stick is pushed.
    if (jlen > 0.05) {
      const fwd = -jy, str = -jx;   // negate jx: joystick right = strafe right in camera space
      const wx = fwd * (-sinY) + str * cosY;
      const wz = fwd * (-cosY) + str * (-sinY);
      const wl = Math.sqrt(wx * wx + wz * wz);
      if (wl > 0) {
        const spd = speed * jlen * dt;
        moveX = (wx / wl) * spd;
        moveZ = (wz / wl) * spd;
      }
    }
  } else {
    if (keys['KeyW'] || keys['ArrowUp'])    { moveX -= sinY; moveZ -= cosY; }
    if (keys['KeyS'] || keys['ArrowDown'])  { moveX += sinY; moveZ += cosY; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { moveX += cosY; moveZ -= sinY; }
    if (keys['KeyD'] || keys['ArrowRight']) { moveX -= cosY; moveZ += sinY; }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) { moveX /= len; moveZ /= len; }
    moveX *= speed * dt;
    moveZ *= speed * dt;
  }

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

  const gy       = terrainH(nx, nz);
  const bridge   = bridgeDeckY(nx, nz);
  const theatre  = theatreStepH(nx, nz);
  const temple   = templeFloorY(nx, nz);
  const building = buildingFloorY(nx, nz);
  let groundY    = gy;
  if (bridge   !== null) groundY = Math.max(groundY, bridge);
  if (theatre  !== null) groundY = Math.max(groundY, theatre);
  if (temple   !== null) groundY = Math.max(groundY, temple);
  if (building !== null) groundY = Math.max(groundY, building);

  const moving = moveX !== 0 || moveZ !== 0;
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

// suppress unused import
export const _sceneRef: Scene | null = null;
