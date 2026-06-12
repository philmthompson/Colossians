import { getYaw } from '../player/controls';

const COMPASS_CARDS = [
  { label: 'N', deg: 0 }, { label: 'NE', deg: 45 }, { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 }, { label: 'S', deg: 180 }, { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 }, { label: 'NW', deg: 315 }, { label: 'N', deg: 360 },
];
const CARD_PX = 52;
let compassStrip: HTMLElement | null = null;

export function initCompass(): void {
  compassStrip = document.getElementById('compass-strip');
  if (!compassStrip) return;
  const cards = [...COMPASS_CARDS, ...COMPASS_CARDS, ...COMPASS_CARDS];
  compassStrip.innerHTML = cards
    .map(c => `<span class="compass-card${c.label.length === 1 ? ' major' : ''}">${c.label}</span>`)
    .join('');
}

export function updateCompass(): void {
  if (!compassStrip) return;
  const yaw = getYaw();
  let headingDeg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
  const TOTAL_PX = 8 * CARD_PX;
  const offset   = (headingDeg / 360) * TOTAL_PX;
  const centerX  = TOTAL_PX + offset;
  const stripW   = compassStrip.parentElement?.clientWidth ?? 260;
  compassStrip.style.transform = `translateX(${-centerX + stripW / 2}px)`;
}

let promptEl: HTMLElement | null = null;
export function initPrompt(): void { promptEl = document.getElementById('prompt-box'); }
export function showPrompt(text: string): void { if (!promptEl) return; promptEl.textContent = text; promptEl.classList.remove('hidden'); }
export function hidePrompt(): void { if (!promptEl) return; promptEl.classList.add('hidden'); }

let reticleEl: HTMLElement | null = null;
export function initReticle(): void { reticleEl = document.getElementById('reticle'); }
export function setReticleActive(active: boolean): void {
  if (!reticleEl) return;
  if (active) reticleEl.classList.add('active');
  else reticleEl.classList.remove('active');
}

let cardEl: HTMLElement | null = null;
let cardEraEl: HTMLElement | null = null;
let cardTitleEl: HTMLElement | null = null;
let cardBodyEl: HTMLElement | null = null;
let cardAccEl: HTMLElement | null = null;

export function initCard(): void {
  cardEl      = document.getElementById('card');
  cardEraEl   = document.getElementById('card-era');
  cardTitleEl = document.getElementById('card-title');
  cardBodyEl  = document.getElementById('card-body');
  cardAccEl   = document.getElementById('card-accuracy');
}

export function openCard(title: string, body: string, accuracy: string, era = 'Colossae · AD 52'): void {
  if (!cardEl || !cardEraEl || !cardTitleEl || !cardBodyEl || !cardAccEl) return;
  cardEraEl.textContent   = era;
  cardTitleEl.textContent = title;
  cardBodyEl.innerHTML    = body;
  cardAccEl.innerHTML     = accuracy ? `<em>What we know: ${accuracy}</em>` : '';
  cardEl.classList.remove('hidden');
  const lbTop = document.getElementById('lb-top')!;
  const lbBot = document.getElementById('lb-bot')!;
  lbTop.classList.remove('hidden'); lbBot.classList.remove('hidden');
  requestAnimationFrame(() => { lbTop.classList.add('open'); lbBot.classList.add('open'); });
  if (document.pointerLockElement) document.exitPointerLock();
}

export function isCardOpen(): boolean { return !!cardEl && !cardEl.classList.contains('hidden'); }

let bannerEl: HTMLElement | null = null;
let bannerTitle: HTMLElement | null = null;
let bannerSub: HTMLElement | null = null;
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

export function initBanner(): void {
  bannerEl    = document.getElementById('banner');
  bannerTitle = document.getElementById('banner-title');
  bannerSub   = document.getElementById('banner-sub');
}

export function showBanner(title: string, subtitle: string): void {
  if (!bannerEl || !bannerTitle || !bannerSub) return;
  if (isCardOpen()) return;
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTitle.textContent = title;
  bannerSub.textContent   = subtitle;
  bannerEl.classList.remove('hidden');
  bannerEl.offsetHeight;
  bannerEl.classList.add('show');
  bannerTimer = setTimeout(() => {
    bannerEl!.classList.remove('show');
    setTimeout(() => bannerEl!.classList.add('hidden'), 1300);
  }, 5200);
}

export function initHUD(): void {
  initCompass(); initPrompt(); initReticle(); initCard(); initBanner();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function updateHUD(_camera: any): void {
  updateCompass();
}
