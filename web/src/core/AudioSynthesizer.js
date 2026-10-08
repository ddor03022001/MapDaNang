/**
 * AudioSynthesizer: Procedural Web Audio API sound generator.
 * Synthesizes realistic ocean waves and natural ambient sea breeze
 * without external audio files or network latency.
 */
export class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.noiseNode = null;
    this.lfoNode = null;
  }

  /**
   * Starts generating procedurally synthesized ocean wave surf.
   */
  start() {
    if (this.isPlaying) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // Generate 4-second pink noise buffer
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.12;
      }

      // Looping noise source
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      // Low-pass filter to simulate deep rolling surf
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;

      // Dynamic gain controlled by LFO (approx. 4.5s wave cycle)
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = 0.16;

      this.lfoNode = this.ctx.createOscillator();
      this.lfoNode.frequency.value = 0.22;

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.12;

      this.lfoNode.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      this.noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      this.noiseNode.start();
      this.lfoNode.start();
      this.isPlaying = true;
    } catch (err) {
      console.warn('[AudioSynthesizer] Web Audio playback failed:', err);
    }
  }

  /**
   * Stops audio generation and cleans up the audio context.
   */
  stop() {
    if (!this.isPlaying) return;

    try {
      this.noiseNode?.stop();
      this.lfoNode?.stop();
      this.ctx?.close();
    } catch (err) {
      console.warn('[AudioSynthesizer] Error stopping audio:', err);
    }

    this.isPlaying = false;
  }

  /**
   * Toggles audio state on/off.
   * @returns {boolean} Whether audio is currently playing
   */
  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Synthesizes an authentic deep Buddhist temple bronze bell chime (Đại Hồng Chung).
   * Uses multi-harmonic additive synthesis with exponential decay and beat-frequency vibrato.
   */
  playTempleBell() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const actx = this.ctx || new AudioContextClass();
      if (actx.state === 'suspended') {
        actx.resume();
      }

      const now = actx.currentTime;
      const masterGain = actx.createGain();
      masterGain.gain.setValueAtTime(0.45, now);
      masterGain.connect(actx.destination);

      // Bronze bell harmonic overtone spectrum (fundamental ~216 Hz)
      const partials = [
        { freq: 216.0, gain: 0.55, decay: 4.8 }, // Fundamental body tone
        { freq: 217.4, gain: 0.40, decay: 4.6 }, // Detuned partial creating soothing acoustic beating
        { freq: 432.0, gain: 0.28, decay: 3.5 }, // Octave
        { freq: 596.0, gain: 0.22, decay: 2.8 }, // Hum tierce
        { freq: 864.0, gain: 0.16, decay: 2.0 }, // Upper harmonic
        { freq: 1180.0, gain: 0.10, decay: 1.4 }, // Strike chime
        { freq: 1728.0, gain: 0.05, decay: 0.8 }  // Initial metallic touch
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = actx.createOscillator();
        const oscGain = actx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Immediate soft attack, exponential acoustic decay
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.exponentialRampToValueAtTime(gain, now + 0.012);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    } catch (err) {
      console.warn('[AudioSynthesizer] Temple bell synthesis failed:', err);
    }
  }
}
