import * as THREE from 'three';
import { terrainH } from '../world/terrain';
const WALK_SPEED = 7.5;
const RUN_SPEED = 14;
const PLAYER_H = 1.75;
const FOV_WALK = 72;
const FOV_RUN = 76;
// ─── Bridge deck profile ─────────────────────────────────────────────────────
// Bridge at x=22, spanning gorge at z≈-120, deck ~6 m above gorge floor
function bridgeDeckY(x, z) {
    if (Math.abs(x - 22) > 4.5)
        return null; // not on bridge width
    const deckZ0 = -140, deckZ1 = -102; // approach ramp extents
    if (z < deckZ0 || z > deckZ1)
        return null;
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
const colliders = [];
export function addCollider(c) { colliders.push(c); }
// ─── State ───────────────────────────────────────────────────────────────────
const keys = {};
let yaw = 0; // radians, controlled by mouse
let pitch = 0;
let running = false;
let bobPhase = 0;
let fovCurrent = FOV_WALK;
export const velocity = new THREE.Vector3();
export let bobOffset = 0;
// ─── Setup ───────────────────────────────────────────────────────────────────
export function initControls(camera, canvas) {
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
        // pointer lock acquired/released — nothing special needed
    });
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== canvas)
            return;
        yaw -= e.movementX * 0.0018;
        pitch -= e.movementY * 0.0018;
        pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
    });
    document.addEventListener('keydown', (e) => { keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    camera.rotation.order = 'YXZ';
}
// ─── Per-frame update ────────────────────────────────────────────────────────
export function updateControls(camera, dt, locked) {
    if (!locked)
        return;
    running = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = running ? RUN_SPEED : WALK_SPEED;
    // Movement direction in camera-yaw space
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp'])
        move.sub(forward);
    if (keys['KeyS'] || keys['ArrowDown'])
        move.add(forward);
    if (keys['KeyA'] || keys['ArrowLeft'])
        move.sub(right);
    if (keys['KeyD'] || keys['ArrowRight'])
        move.add(right);
    if (move.lengthSq() > 0)
        move.normalize();
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
    if (bridge !== null)
        groundY = Math.max(gy, bridge);
    // Head bob
    const moving = move.lengthSq() > 0;
    if (moving) {
        bobPhase += dt * (running ? 9 : 6);
        bobOffset = Math.sin(bobPhase) * (running ? 0.10 : 0.055);
    }
    else {
        bobOffset *= 0.85;
        if (Math.abs(bobOffset) < 0.001)
            bobOffset = 0;
    }
    // FOV ease
    const targetFov = running ? FOV_RUN : FOV_WALK;
    fovCurrent += (targetFov - fovCurrent) * Math.min(1, dt * 6);
    camera.fov = fovCurrent;
    camera.updateProjectionMatrix();
    camera.position.set(nx, groundY + PLAYER_H + bobOffset, nz);
    camera.rotation.set(pitch, yaw, 0);
}
export function isPointerLocked(canvas) {
    return document.pointerLockElement === canvas;
}
export function getYaw() { return yaw; }
export function setYaw(v) { yaw = v; }
