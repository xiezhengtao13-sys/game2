/**
 * Retro-SciFi Procedural Web Audio Sound Engine
 *
 * Synthesizes pure 8-bit / 16-bit industrial aerospace sound effects directly
 * through the Web Audio API. Requires zero external audio files or downloads.
 * Gracefully degrades to a no-op in headless/test environments where AudioContext
 * is absent.
 */

export class SoundEffects {
  private ctx: AudioContext | null = null;
  private isAlarmRunning = false;
  private alarmOsc1: OscillatorNode | null = null;
  private alarmOsc2: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;

  private thrusterNode: AudioNode | null = null;
  private thrusterGain: GainNode | null = null;

  /** Initialize or resume the audio context on user interaction. */
  init(): void {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        // Fallback for restricted environments
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Mechanical toggle switch or relay click. */
  playClick(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Electronic terminal typewriter blip or confirmation beep. */
  playBeep(freq = 920): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** High-pressure steam venting hiss through bandpass filter. */
  playSteam(duration = 0.8): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.linearRampToValueAtTime(600, now + duration);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /** Heavy metal latch clank / explosive actuation shock. */
  playClank(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    // High metal ring
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = "sine";
    ring.frequency.setValueAtTime(1850, now);
    ring.frequency.exponentialRampToValueAtTime(900, now + 0.15);

    ringGain.gain.setValueAtTime(0.2, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    ring.connect(ringGain);
    ringGain.connect(this.ctx.destination);

    ring.start(now);
    ring.stop(now + 0.15);
  }

  /** Harmonious sci-fi maglev transit arrival chime. */
  playTransitChime(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /** Research beacon radio chirping signal. */
  playBeaconPulse(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(2400, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Continuous dual-tone Chapter 1 alarm klaxon. */
  startAlarm(): void {
    this.init();
    if (!this.ctx || this.isAlarmRunning) return;
    this.isAlarmRunning = true;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(650, now);

    // LFO modulates frequency between 500 Hz and 800 Hz twice per second
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(2.2, now);
    lfoGain.gain.setValueAtTime(160, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    masterGain.gain.setValueAtTime(0.12, now);

    osc.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    osc.start(now);
    lfo.start(now);

    this.alarmOsc1 = osc;
    this.alarmOsc2 = lfo;
    this.alarmGain = masterGain;
  }

  /** Stop Chapter 1 alarm klaxon. */
  stopAlarm(): void {
    if (!this.isAlarmRunning) return;
    this.isAlarmRunning = false;
    try {
      this.alarmOsc1?.stop();
      this.alarmOsc2?.stop();
      this.alarmOsc1?.disconnect();
      this.alarmOsc2?.disconnect();
      this.alarmGain?.disconnect();
    } catch {
      // Ignore if already stopped
    }
    this.alarmOsc1 = null;
    this.alarmOsc2 = null;
    this.alarmGain = null;
  }

  /** Ion thruster rumble while KeyW is pressed. */
  startThruster(): void {
    this.init();
    if (!this.ctx || this.thrusterNode) return;

    const bufferSize = this.ctx.sampleRate * 1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.thrusterNode = noise;
    this.thrusterGain = gain;
  }

  /** Stop ion thruster rumble. */
  stopThruster(): void {
    if (!this.thrusterNode) return;
    try {
      (this.thrusterNode as AudioBufferSourceNode).stop();
      this.thrusterNode.disconnect();
      this.thrusterGain?.disconnect();
    } catch {
      // Ignore
    }
    this.thrusterNode = null;
    this.thrusterGain = null;
  }
}

export const sounds = new SoundEffects();
