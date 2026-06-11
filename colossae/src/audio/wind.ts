// WebAudio procedural wind — no asset files required

let ctx: AudioContext | null = null;

export function initWind(): void {
  // Lazily create on first user interaction (autoplay policy)
  const start = () => {
    if (ctx) return;
    ctx = new AudioContext();
    buildWind(ctx);
    document.removeEventListener('click', start);
    document.removeEventListener('keydown', start);
  };
  document.addEventListener('click', start);
  document.addEventListener('keydown', start);
}

function buildWind(ctx: AudioContext): void {
  // White noise source
  const bufLen = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Band-pass filter — shapes noise into wind
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 600;
  bpf.Q.value = 0.5;

  // Low-pass to soften
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 900;

  // Master gain (quiet)
  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  // LFO for slow swell
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08; // ~8s period
  lfo.type = 'sine';
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  source.connect(bpf);
  bpf.connect(lpf);
  lpf.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
