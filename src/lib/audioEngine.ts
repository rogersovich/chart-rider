/**
 * AudioEngine — synthesizes all game sounds via Web Audio API.
 * No audio files needed. All sounds are generated programmatically.
 * Singleton pattern; call AudioEngine.getInstance() to access.
 */

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine hum nodes
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Nitro loop nodes
  private nitroOsc: OscillatorNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroPlaying: boolean = false;

  // Whether audio context has been unlocked by user gesture
  private unlocked: boolean = false;

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /** Must be called on first user interaction (keydown/click) to unlock AudioContext */
  unlock() {
    if (this.unlocked || typeof window === 'undefined') return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
      this.masterGain.connect(this.ctx.destination);
      this.startEngineHum();
      this.unlocked = true;
    } catch {
      // AudioContext not available (SSR or restricted env)
    }
  }

  // ── Engine Hum ───────────────────────────────────────────────────────────────
  private startEngineHum() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 60; // Base idle pitch
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    this.engineOsc = osc;
    this.engineGain = gain;
  }

  /** Update engine pitch based on current speed (0–MAX_SPEED) */
  setEngineSpeed(speed: number) {
    if (!this.ctx || !this.engineOsc) return;
    // Map speed 0–18 → frequency 60–220 Hz
    const freq = 60 + (speed / 18) * 160;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
  }

  // ── Nitro Boost Loop ─────────────────────────────────────────────────────────
  startNitro() {
    if (!this.ctx || !this.masterGain || this.nitroPlaying) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 380;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    // Ramp in
    gain.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.05);
    // Add a slight pitch wobble for that "whoosh" feel
    osc.frequency.setValueCurveAtTime(
      new Float32Array([380, 420, 400, 440, 410]),
      this.ctx.currentTime,
      0.4
    );

    this.nitroOsc = osc;
    this.nitroGain = gain;
    this.nitroPlaying = true;
  }

  stopNitro() {
    if (!this.ctx || !this.nitroGain || !this.nitroOsc || !this.nitroPlaying) return;
    this.nitroGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    const osc = this.nitroOsc;
    setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 200);
    this.nitroOsc = null;
    this.nitroGain = null;
    this.nitroPlaying = false;
  }

  // ── One-shot SFX ─────────────────────────────────────────────────────────────
  private playOneShot(config: {
    type: OscillatorType;
    frequency: number;
    freqEnd?: number;
    gainPeak: number;
    duration: number;
    detune?: number;
  }) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = config.type;
    osc.frequency.value = config.frequency;
    if (config.detune) osc.detune.value = config.detune;

    gain.gain.value = 0;
    gain.gain.setTargetAtTime(config.gainPeak, this.ctx.currentTime, 0.005);
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + config.duration * 0.4, config.duration * 0.3);

    if (config.freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(config.freqEnd, this.ctx.currentTime + config.duration);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + config.duration);
  }

  /** Crash impact sfx */
  playCrash() {
    if (!this.ctx || !this.masterGain) return;
    // White noise burst (crash rumble)
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.05, 0.08);

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    // Also play a low thud
    this.playOneShot({ type: 'sine', frequency: 80, freqEnd: 30, gainPeak: 0.3, duration: 0.25 });
  }

  /** Tire squeak on landing */
  playLand() {
    this.playOneShot({ type: 'sine', frequency: 220, freqEnd: 180, gainPeak: 0.08, duration: 0.12 });
  }

  /** Jump launch pop */
  playJump() {
    this.playOneShot({ type: 'triangle', frequency: 200, freqEnd: 350, gainPeak: 0.06, duration: 0.1 });
  }

  /** Victory fanfare — ascending chord */
  playFinish() {
    if (!this.ctx || !this.masterGain) return;

    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startAt = this.ctx!.currentTime + i * 0.12;
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.12, startAt + 0.04);
      gain.gain.setTargetAtTime(0, startAt + 0.3, 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(startAt);
      osc.stop(startAt + 0.8);
    });
  }

  /** Checkpoint reached soft ding */
  playCheckpoint() {
    this.playOneShot({ type: 'sine', frequency: 880, gainPeak: 0.06, duration: 0.15 });
  }

  // ── Mute Control ─────────────────────────────────────────────────────────────
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  get isMuted() { return this.muted; }
  get isUnlocked() { return this.unlocked; }

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  cleanup() {
    try { this.engineOsc?.stop(); } catch { /* ok */ }
    try { this.nitroOsc?.stop(); } catch { /* ok */ }
    this.nitroPlaying = false;
    // Don't close context — it's a singleton shared across remounts
  }
}
