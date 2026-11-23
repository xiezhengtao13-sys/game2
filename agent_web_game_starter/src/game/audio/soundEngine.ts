import type { MusicTrack, VoiceId } from "../types";

interface NoteStep {
  lead?: number;
  bass?: number;
  arp?: number;
  kick?: boolean;
  snare?: boolean;
  hat?: boolean;
}

interface TrackSpec {
  bpm: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  arpWave: OscillatorType;
  leadVol: number;
  bassVol: number;
  arpVol: number;
  steps: NoteStep[];
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Hand-composed retro chiptune / synth tracks inspired by Undertale & Deltarune
const TRACKS: Record<Exclude<MusicTrack, "none">, TrackSpec> = {
  // Haunting deep-space title motif (D minor / F major starlight)
  title: {
    bpm: 96,
    leadWave: "triangle",
    bassWave: "sine",
    arpWave: "triangle",
    leadVol: 0.085,
    bassVol: 0.075,
    arpVol: 0.04,
    steps: [
      { lead: 62, bass: 38, arp: 57 }, { arp: 62 }, { lead: 65, arp: 69 }, { arp: 65 },
      { lead: 69, bass: 38, arp: 62 }, { arp: 69 }, { lead: 67, arp: 65 }, { arp: 62 },
      { lead: 65, bass: 41, arp: 60 }, { arp: 65 }, { lead: 69, arp: 72 }, { arp: 69 },
      { lead: 72, bass: 43, arp: 67 }, { arp: 74 }, { lead: 70, arp: 67 }, { arp: 62 },
      { lead: 69, bass: 45, arp: 64 }, { arp: 69 }, { lead: 67, arp: 73 }, { arp: 64 },
      { lead: 65, bass: 38, arp: 62 }, { arp: 69 }, { lead: 64, arp: 60 }, { arp: 57 },
      { lead: 62, bass: 34, arp: 58 }, { arp: 62 }, { lead: 65, arp: 69 }, { arp: 65 },
      { lead: 64, bass: 45, arp: 61 }, { arp: 64 }, { lead: 61, arp: 57 }, { arp: 52 }
    ]
  },

  // Eerie, melancholic wreck exploration (Waterfall / Ruins mood)
  wreck_ambient: {
    bpm: 102,
    leadWave: "triangle",
    bassWave: "triangle",
    arpWave: "sine",
    leadVol: 0.065,
    bassVol: 0.055,
    arpVol: 0.035,
    steps: [
      { lead: 64, bass: 40, arp: 59 }, { arp: 64 }, { arp: 67 }, { lead: 67, arp: 71 },
      { lead: 71, bass: 40, arp: 64 }, { arp: 67 }, { lead: 69, arp: 64 }, { arp: 59 },
      { lead: 67, bass: 36, arp: 60 }, { arp: 64 }, { lead: 64, arp: 67 }, { arp: 60 },
      { lead: 62, bass: 38, arp: 57 }, { arp: 62 }, { lead: 66, arp: 69 }, { arp: 62 },
      { lead: 64, bass: 33, arp: 57 }, { arp: 60 }, { lead: 69, arp: 64 }, { arp: 67 },
      { lead: 66, bass: 35, arp: 59 }, { arp: 63 }, { lead: 63, arp: 66 }, { arp: 59 },
      { lead: 64, bass: 40, arp: 59 }, { arp: 64 }, { lead: 62, arp: 67 }, { arp: 64 },
      { lead: 59, bass: 35, arp: 54 }, { arp: 59 }, { arp: 63 }, { arp: 59 }
    ]
  },

  // Punchy standard encounter battle theme (138 BPM chiptune groove)
  battle_normal: {
    bpm: 138,
    leadWave: "square",
    bassWave: "triangle",
    arpWave: "square",
    leadVol: 0.055,
    bassVol: 0.085,
    arpVol: 0.028,
    steps: [
      { lead: 69, bass: 45, kick: true, hat: true }, { arp: 57 }, { lead: 72, bass: 45, hat: true }, { lead: 76, arp: 64 },
      { lead: 74, bass: 48, snare: true, hat: true }, { lead: 72, arp: 60 }, { lead: 71, bass: 47, kick: true }, { lead: 69, hat: true },
      { lead: 64, bass: 40, kick: true, hat: true }, { arp: 52 }, { lead: 69, bass: 45, hat: true }, { lead: 72, arp: 60 },
      { lead: 76, bass: 43, snare: true, hat: true }, { arp: 67 }, { lead: 74, bass: 43, kick: true }, { lead: 71, hat: true },
      { lead: 72, bass: 41, kick: true, hat: true }, { arp: 65 }, { lead: 76, bass: 41, hat: true }, { lead: 79, arp: 69 },
      { lead: 77, bass: 43, snare: true, hat: true }, { lead: 76, arp: 67 }, { lead: 74, bass: 43, kick: true }, { lead: 72, hat: true },
      { lead: 71, bass: 40, kick: true, hat: true }, { lead: 72, arp: 64 }, { lead: 74, bass: 44, hat: true }, { lead: 76, arp: 68 },
      { lead: 79, bass: 45, snare: true, kick: true }, { arp: 69 }, { lead: 76, bass: 40 }, { lead: 74, hat: true }
    ]
  },

  // Militant high-energy Mid-Boss anthem for Executor Vark (154 BPM Spear-of-Justice drive)
  battle_miniboss: {
    bpm: 154,
    leadWave: "sawtooth",
    bassWave: "square",
    arpWave: "square",
    leadVol: 0.055,
    bassVol: 0.065,
    arpVol: 0.025,
    steps: [
      { lead: 64, bass: 40, kick: true }, { lead: 64, hat: true }, { lead: 67, bass: 40, kick: true }, { lead: 71, hat: true },
      { lead: 72, bass: 43, snare: true }, { lead: 71, hat: true }, { lead: 67, bass: 40, kick: true }, { lead: 64, hat: true },
      { lead: 69, bass: 45, kick: true }, { lead: 69, hat: true }, { lead: 71, bass: 45 }, { lead: 72, hat: true },
      { lead: 74, bass: 47, snare: true }, { lead: 72, arp: 66 }, { lead: 71, bass: 47, kick: true }, { lead: 67, hat: true },
      { lead: 76, bass: 48, kick: true }, { arp: 64 }, { lead: 76, bass: 48, hat: true }, { lead: 79, arp: 67 },
      { lead: 78, bass: 47, snare: true }, { lead: 76, hat: true }, { lead: 74, bass: 45, kick: true }, { lead: 71, hat: true },
      { lead: 72, bass: 45, kick: true }, { lead: 71, hat: true }, { lead: 69, bass: 43, kick: true }, { lead: 67, hat: true },
      { lead: 66, bass: 47, snare: true }, { lead: 67, arp: 59 }, { lead: 71, bass: 47, kick: true }, { lead: 74, snare: true }
    ]
  },

  // Soaring emotional Final Boss theme for Charon-Ω (162 BPM Hopes & Dreams / Finale spirit)
  battle_final: {
    bpm: 162,
    leadWave: "square",
    bassWave: "triangle",
    arpWave: "triangle",
    leadVol: 0.06,
    bassVol: 0.085,
    arpVol: 0.04,
    steps: [
      { lead: 74, bass: 50, arp: 62, kick: true }, { arp: 69, hat: true }, { lead: 76, bass: 50, arp: 66 }, { lead: 78, arp: 69, hat: true },
      { lead: 81, bass: 50, arp: 74, snare: true }, { arp: 69, hat: true }, { lead: 78, bass: 45, arp: 66, kick: true }, { lead: 76, arp: 69 },
      { lead: 74, bass: 47, arp: 62, kick: true }, { arp: 66, hat: true }, { lead: 71, bass: 47, arp: 67 }, { lead: 74, arp: 71, hat: true },
      { lead: 76, bass: 43, arp: 67, snare: true }, { arp: 71, hat: true }, { lead: 74, bass: 43, arp: 62, kick: true }, { lead: 71, arp: 67 },
      { lead: 69, bass: 45, arp: 61, kick: true }, { arp: 64, hat: true }, { lead: 73, bass: 45, arp: 69 }, { lead: 76, arp: 73, hat: true },
      { lead: 81, bass: 45, arp: 69, snare: true }, { lead: 79, arp: 64 }, { lead: 78, bass: 42, arp: 66, kick: true }, { lead: 76, arp: 69 },
      { lead: 74, bass: 43, arp: 62, kick: true }, { lead: 76, arp: 67 }, { lead: 78, bass: 45, arp: 69, kick: true }, { lead: 81, arp: 73 },
      { lead: 86, bass: 50, arp: 74, snare: true, kick: true }, { arp: 81, hat: true }, { lead: 85, bass: 45, arp: 73 }, { lead: 81, arp: 69, snare: true }
    ]
  },

  // Relentless syncopated Ruthless/Genocide Final Boss (176 BPM Megalovania spirit)
  battle_ruthless: {
    bpm: 176,
    leadWave: "square",
    bassWave: "sawtooth",
    arpWave: "square",
    leadVol: 0.06,
    bassVol: 0.06,
    arpVol: 0.028,
    steps: [
      { lead: 62, bass: 38, kick: true }, { lead: 62, hat: true }, { lead: 74, bass: 38 }, { arp: 62, hat: true },
      { lead: 69, bass: 38, snare: true }, { arp: 65 }, { lead: 68, bass: 38, kick: true }, { lead: 67, hat: true },
      { lead: 65, bass: 36, kick: true }, { lead: 62, hat: true }, { lead: 65, bass: 36 }, { lead: 67, hat: true },
      { lead: 60, bass: 36, snare: true }, { lead: 60, hat: true }, { lead: 74, bass: 36, kick: true }, { lead: 69, hat: true },
      { lead: 59, bass: 35, kick: true }, { lead: 59, hat: true }, { lead: 74, bass: 35 }, { arp: 59, hat: true },
      { lead: 69, bass: 35, snare: true }, { arp: 65 }, { lead: 68, bass: 35, kick: true }, { lead: 67, hat: true },
      { lead: 58, bass: 34, kick: true }, { lead: 58, hat: true }, { lead: 74, bass: 34, kick: true }, { lead: 72, hat: true },
      { lead: 74, bass: 33, snare: true }, { lead: 76, hat: true }, { lead: 77, bass: 33, kick: true }, { lead: 79, snare: true }
    ]
  },

  // Warm starlight epilogue theme
  ending: {
    bpm: 88,
    leadWave: "triangle",
    bassWave: "sine",
    arpWave: "sine",
    leadVol: 0.08,
    bassVol: 0.07,
    arpVol: 0.038,
    steps: [
      { lead: 69, bass: 41, arp: 65 }, { arp: 69 }, { lead: 72, arp: 76 }, { arp: 72 },
      { lead: 76, bass: 41, arp: 69 }, { arp: 72 }, { lead: 74, arp: 69 }, { arp: 65 },
      { lead: 72, bass: 48, arp: 64 }, { arp: 67 }, { lead: 76, arp: 72 }, { arp: 67 },
      { lead: 79, bass: 43, arp: 71 }, { arp: 74 }, { lead: 74, arp: 71 }, { arp: 67 },
      { lead: 76, bass: 45, arp: 69 }, { arp: 72 }, { lead: 72, arp: 64 }, { arp: 69 },
      { lead: 74, bass: 38, arp: 65 }, { arp: 69 }, { lead: 72, arp: 65 }, { arp: 62 },
      { lead: 69, bass: 41, arp: 65 }, { arp: 69 }, { lead: 72, arp: 74 }, { arp: 72 },
      { lead: 76, bass: 48, arp: 72 }, { arp: 67 }, { lead: 72, arp: 64 }, { arp: 60 }
    ]
  }
};

const VOICE_PROFILES: Record<VoiceId, { freq: number; jitter: number; wave: OscillatorType; dur: number; vol: number }> = {
  narrator: { freq: 320, jitter: 18, wave: "square", dur: 0.028, vol: 0.035 },
  minerva_v: { freq: 620, jitter: 45, wave: "triangle", dur: 0.034, vol: 0.05 },
  vaughn: { freq: 215, jitter: 18, wave: "triangle", dur: 0.038, vol: 0.055 },
  ailin: { freq: 520, jitter: 32, wave: "sine", dur: 0.035, vol: 0.05 },
  mna01: { freq: 440, jitter: 90, wave: "square", dur: 0.024, vol: 0.04 },
  kiosk: { freq: 720, jitter: 140, wave: "square", dur: 0.026, vol: 0.045 },
  med07: { freq: 560, jitter: 65, wave: "sine", dur: 0.032, vol: 0.045 },
  weaver: { freq: 480, jitter: 110, wave: "triangle", dur: 0.042, vol: 0.05 },
  vark: { freq: 165, jitter: 22, wave: "sawtooth", dur: 0.042, vol: 0.055 },
  charon: { freq: 390, jitter: 120, wave: "triangle", dur: 0.048, vol: 0.06 },
  captain: { freq: 245, jitter: 16, wave: "triangle", dur: 0.036, vol: 0.05 }
};

/**
 * Self-contained WebAudio procedural chiptune & Undertale-style voice/SFX engine.
 * Safely no-ops in headless Node environments without AudioContext.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private currentTrack: MusicTrack = "none";
  private stepIdx = 0;
  private stepTimer = 0;

  get isMuted(): boolean {
    return this.muted;
  }

  get track(): MusicTrack {
    return this.currentTrack;
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return;
    }
    const g = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  setMusic(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stepIdx = 0;
    this.stepTimer = 0;
  }

  /** Advance chiptune sequencer inside the fixed game loop. */
  update(dt: number): void {
    if (this.muted || this.currentTrack === "none" || !this.ctx || this.ctx.state !== "running") return;
    const spec = TRACKS[this.currentTrack];
    const stepDur = 60 / spec.bpm / 2; // 8th-note steps
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer += stepDur;
      const step = spec.steps[this.stepIdx % spec.steps.length];
      this.stepIdx = (this.stepIdx + 1) % spec.steps.length;
      this.playMusicStep(spec, step, stepDur);
    }
  }

  private playMusicStep(spec: TrackSpec, step: NoteStep, dur: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (step.lead !== undefined) {
      this.tone(midiToHz(step.lead), spec.leadWave, spec.leadVol, dur * 0.85, now);
    }
    if (step.bass !== undefined) {
      this.tone(midiToHz(step.bass), spec.bassWave, spec.bassVol, dur * 0.92, now);
    }
    if (step.arp !== undefined) {
      this.tone(midiToHz(step.arp), spec.arpWave, spec.arpVol, dur * 0.55, now);
    }
    if (step.kick) this.drumKick(now);
    if (step.snare) this.drumNoise(now, 0.07, 0.045, 900);
    if (step.hat) this.drumNoise(now, 0.025, 0.02, 4200);
  }

  private tone(freq: number, wave: OscillatorType, vol: number, dur: number, startTime?: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t0 = startTime ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, dur));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + Math.max(0.025, dur + 0.01));
  }

  private drumKick(t0: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.09);
    gain.gain.setValueAtTime(0.11, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.11);
  }

  private drumNoise(t0: number, dur: number, vol: number, hpFreq: number): void {
    if (!this.ctx) return;
    const sampleCount = Math.max(256, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(hpFreq, t0);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t0);
  }

  playVoiceBlip(voice: VoiceId = "narrator"): void {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const p = VOICE_PROFILES[voice] ?? VOICE_PROFILES.narrator;
    const freq = p.freq + (Math.random() - 0.5) * 2 * p.jitter;
    this.tone(Math.max(80, freq), p.wave, p.vol, p.dur);
  }

  playMenuMove(): void {
    this.tone(580, "square", 0.04, 0.032);
  }

  playConfirm(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(660, "square", 0.045, 0.05, t0);
    this.tone(880, "square", 0.045, 0.07, t0 + 0.045);
  }

  playCancel(): void {
    this.tone(310, "square", 0.04, 0.05);
  }

  playEncounterFlash(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(880, "square", 0.07, 0.07, t0);
    this.tone(660, "square", 0.07, 0.07, t0 + 0.09);
    this.tone(990, "square", 0.08, 0.12, t0 + 0.18);
  }

  playSlash(crit: boolean): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.drumNoise(t0, 0.14, crit ? 0.12 : 0.08, 1200);
    this.tone(crit ? 920 : 560, "sawtooth", 0.08, 0.1, t0);
    this.tone(crit ? 220 : 180, "triangle", 0.1, 0.16, t0 + 0.05);
  }

  playHit(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(180, "sawtooth", 0.09, 0.1, t0);
    this.tone(110, "square", 0.09, 0.14, t0 + 0.04);
    this.drumNoise(t0, 0.09, 0.08, 600);
  }

  playParry(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(1180, "square", 0.06, 0.045, t0);
    this.tone(1640, "triangle", 0.055, 0.07, t0 + 0.025);
  }

  playGraze(): void {
    this.tone(1320 + Math.random() * 180, "sine", 0.035, 0.04);
  }

  playLaserShoot(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1100, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.065);
    gain.gain.setValueAtTime(0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  playHeal(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      this.tone(hz, "triangle", 0.065, 0.12, t0 + i * 0.06);
    });
  }

  playSpare(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73].forEach((hz, i) => {
      this.tone(hz, "triangle", 0.07, 0.22, t0 + i * 0.07);
    });
  }

  playVaporize(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.drumNoise(t0, 0.42, 0.09, 500);
    this.tone(240, "sawtooth", 0.07, 0.35, t0);
    this.tone(110, "triangle", 0.07, 0.4, t0 + 0.1);
  }

  playSoulCrack(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(260, "sawtooth", 0.09, 0.08, t0);
    this.drumNoise(t0 + 0.02, 0.12, 0.1, 1400);
  }

  playSoulShatter(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.drumNoise(t0, 0.28, 0.11, 1800);
    [420, 310, 210, 140].forEach((hz, i) => {
      this.tone(hz, "square", 0.065, 0.12, t0 + i * 0.05);
    });
  }

  playPuzzleClick(): void {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime;
    this.tone(480, "triangle", 0.06, 0.06, t0);
    this.tone(720, "triangle", 0.06, 0.09, t0 + 0.05);
  }
}

export const sound = new SoundEngine();
