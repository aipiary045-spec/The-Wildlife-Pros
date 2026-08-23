let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export async function playRegularAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
  const now = ctx.currentTime;
  tone(ctx, 740, now, 0.18, 0.12);
  tone(ctx, 988, now + 0.12, 0.22, 0.1);
}

export async function playEmergencyAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
  const now = ctx.currentTime;
  const pattern = [
    { frequency: 880, offset: 0, duration: 0.16 },
    { frequency: 660, offset: 0.2, duration: 0.16 },
    { frequency: 880, offset: 0.4, duration: 0.16 },
    { frequency: 660, offset: 0.6, duration: 0.2 },
    { frequency: 988, offset: 0.86, duration: 0.28 },
  ];
  for (const step of pattern) {
    tone(ctx, step.frequency, now + step.offset, step.duration, 0.18, "square");
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 90, 180, 90, 280]);
  }
}
