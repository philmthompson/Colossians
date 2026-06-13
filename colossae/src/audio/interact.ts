/**
 * Audio for site interactions.
 *
 * NPC Talk lines  → Web Speech API (browser TTS), voice pitched to character.
 * Examine/Inspect → Short Web Audio synth chime.
 * No external files required.
 */

// ─── Shared AudioContext ──────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ─── Synth chime (Examine / Inspect / Read / Enter) ──────────────────────────

export function playInteractChime(): void {
  try {
    const ctx  = getCtx();
    const now  = ctx.currentTime;

    // Two sine partials detuned slightly — soft, ancient-feeling tone
    const freqs = [523.25, 659.26];   // C5, E5
    for (const [i, freq] of freqs.entries()) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const attack  = 0.01;
      const sustain = 0.18;
      const release = 0.55;
      const delay   = i * 0.06;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + attack);
      gain.gain.setValueAtTime(0.18, now + delay + sustain);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + sustain + release);

      osc.start(now + delay);
      osc.stop(now + delay + sustain + release + 0.05);
    }
  } catch {
    // AudioContext not available — silent fallback
  }
}

// ─── NPC voice (Talk) ─────────────────────────────────────────────────────────
// Uses Web Speech API. Falls back silently if unavailable.

interface VoiceProfile {
  pitch: number;    // 0-2, default 1
  rate: number;     // 0.1-10, default 1
  volume: number;   // 0-1
}

const NPC_VOICES: Record<string, VoiceProfile> = {
  epaphras:   { pitch: 1.0,  rate: 0.88, volume: 0.9 },
  shepherd:   { pitch: 0.85, rate: 0.80, volume: 0.9 },
  doorkeeper: { pitch: 0.95, rate: 0.82, volume: 0.85 },
};


export function speakNPCLine(npcId: string, text: string): void {
  if (!('speechSynthesis' in window)) return;

  speechSynthesis.cancel();

  const profile = NPC_VOICES[npcId] ?? { pitch: 0.95, rate: 0.85, volume: 0.88 };
  const utt = new SpeechSynthesisUtterance(text);
  utt.pitch  = profile.pitch;
  utt.rate   = profile.rate;
  utt.volume = profile.volume;

  // Prefer a mature male voice if one is available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    /male/i.test(v.name) || /daniel|alex|david|mark|google uk/i.test(v.name)
  );
  if (preferred) utt.voice = preferred;

  // speechSynthesis.speak(utt);  // disabled — re-enable for voice
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
