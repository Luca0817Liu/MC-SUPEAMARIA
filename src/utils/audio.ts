/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A fully native 8-bit Sound Synthesizer using Web Audio API.
// Eliminates external asset loading risks and delivers authentic arcade SFX and music.
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeMusicNode: GainNode | null = null;
  private musicSources: { oscs: OscillatorNode[]; gain: GainNode }[] = [];
  private currentTrack: string | null = null;
  private sequencerTimer: number | null = null;

  constructor() {
    // Initialized lazily to comply with browser autoplay policies.
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.resumeMusicForCurrentState();
    }
    return this.isMuted;
  }

  getMutedState(): boolean {
    return this.isMuted;
  }

  // Plays a simple retro sound effect based on type
  playSFX(type: 'JUMP' | 'STOMP' | 'BLOCK_HIT' | 'BLOCK_BREAK' | 'COIN' | 'SPAWN' | 'POWER_UP' | 'FIREBALL' | 'DAMAGE' | 'DEATH' | 'WIN' | 'EXPLODE' | 'BOSS_HIT' | 'CLICK') {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'CLICK': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }
      case 'JUMP': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.16);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

        osc.start(t);
        osc.stop(t + 0.18);
        break;
      }
      case 'STOMP': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(30, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }
      case 'BLOCK_HIT': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.setValueAtTime(130, t + 0.05);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'BLOCK_BREAK': {
        // Fast white noise burst for block explosion
        try {
          const bufferSize = this.ctx.sampleRate * 0.15;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, t);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          noise.start(t);
          noise.stop(t + 0.16);
        } catch (e) {
          // Fallback if buffer creation fails
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(90, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
          osc.start(t);
          osc.stop(t + 0.16);
        }
        break;
      }
      case 'COIN': {
        const osc1 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.type = 'sine';
        // Classic Mario Coin chord: B5 (987.77 Hz) to E6 (1318.51 Hz)
        osc1.frequency.setValueAtTime(987.77, t);
        osc1.frequency.setValueAtTime(1318.51, t + 0.08);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.setValueAtTime(0.12, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc1.start(t);
        osc1.stop(t + 0.35);
        break;
      }
      case 'SPAWN': {
        // Star/Mushroom rising arpeggio (C Major)
        const notes = [330, 392, 659, 523, 587, 784]; // E4, G4, E5, C5, D5, G5
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.05);

          gain.gain.setValueAtTime(0.0, t);
          gain.gain.setValueAtTime(0.12, t + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.15);

          osc.start(t + idx * 0.05);
          osc.stop(t + idx * 0.05 + 0.15);
        });
        break;
      }
      case 'POWER_UP': {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Chromatic/Major sweep
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);

          gain.gain.setValueAtTime(0.0, t);
          gain.gain.setValueAtTime(0.1, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.06 + 0.12);

          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 0.12);
        });
        break;
      }
      case 'FIREBALL': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.12);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }
      case 'DAMAGE': {
        // Downtone slide representing shrink/injury
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.linearRampToValueAtTime(80, t + 0.25);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }
      case 'EXPLODE': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.35);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.36);

        osc.start(t);
        osc.stop(t + 0.37);
        break;
      }
      case 'BOSS_HIT': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.setValueAtTime(180, t + 0.06);
        osc.frequency.setValueAtTime(60, t + 0.12);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }
      case 'DEATH': {
        // Dramatic failing arpeggio
        const notes = [400, 360, 320, 240, 180, 120, 40];
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);

          gain.gain.setValueAtTime(0.0, t);
          gain.gain.setValueAtTime(0.12, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.2);

          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.22);
        });
        break;
      }
      case 'WIN': {
        // Joyful level-completed fanfare (C Major arpeggio + classic rhythm)
        const fanNotes = [
          { f: 261.63, d: 0.12, del: 0.00 }, // C4
          { f: 329.63, d: 0.12, del: 0.12 }, // E4
          { f: 392.00, d: 0.12, del: 0.24 }, // G4
          { f: 523.25, d: 0.12, del: 0.36 }, // C5
          { f: 659.25, d: 0.12, del: 0.48 }, // E5
          { f: 783.99, d: 0.25, del: 0.60 }, // G5
          { f: 783.99, d: 0.12, del: 0.85 }, // G5 (repeated)
          { f: 1046.50, d: 0.50, del: 1.00 } // C6 (long)
        ];

        fanNotes.forEach((n) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.type = 'square';
          osc.frequency.setValueAtTime(n.f, t + n.del);

          gain.gain.setValueAtTime(0.0, t);
          gain.gain.setValueAtTime(0.12, t + n.del);
          gain.gain.exponentialRampToValueAtTime(0.005, t + n.del + n.d);

          osc.start(t + n.del);
          osc.stop(t + n.del + n.d + 0.02);
        });
        break;
      }
    }
  }

  // Starts looping background music tailored to current StageName
  startMusic(trackName: '1-1' | '1-2' | '1-3' | '1-4' | 'GAMEOVER' | 'VICTORY') {
    this.initContext();
    if (!this.ctx) return;

    if (this.currentTrack === trackName && this.musicSources.length > 0) {
      return; // already playing
    }

    this.stopMusic();
    this.currentTrack = trackName;

    if (this.isMuted) return;

    // We build procedural looping tunes!
    if (trackName === '1-1') {
      // 1-1 theme: Happy overworld bouncer
      this.playNoteSequencer([
        261, 329, 392, 523, 392, 523, 0, // C4 E4 G4 C5 G4 C5 REST
        329, 329, 329, 0, 261, 329, 392  // E4 E4 E4 REST C4 E4 G4
      ], 140, 'square', 0.04);
    } else if (trackName === 'GAMEOVER') {
      // Very slow, matching melancholy theme (60 BPM) to align with slow text reading
      this.playNoteSequencer([
        196, 0, 156, 0, 131, 0, 110, 0, // G3, rest, D#3, rest, C3, rest, A2, rest
        98, 0, 110, 0, 131, 0, 147, 0
      ], 60, 'triangle', 0.08);
    } else if (trackName === 'VICTORY') {
      // Relaxed, beautiful victory loop (75 BPM)
      this.playNoteSequencer([
        261, 329, 392, 523, 659, 0, 523, 0,
        349, 440, 523, 587, 698, 0, 587, 0
      ], 75, 'sine', 0.06);
    } else if (trackName === '1-2') {
      // 1-2 theme: Deep, cavernous, underground bassline
      this.playNoteSequencer([
        98, 110, 130, 0, 98, 110, 130, 0,
        146, 146, 130, 110, 98, 0, 82, 98
      ], 115, 'triangle', 0.08);
    } else if (trackName === '1-3') {
      // 1-3 theme: Light, beautiful arpeggios flying in the clouds (Minecraft/Sky)
      this.playNoteSequencer([
        392, 440, 523, 587, 659, 0, 523, 659,
        349, 392, 440, 523, 587, 0, 440, 587
      ], 130, 'sine', 0.05);
    } else if (trackName === '1-4') {
      // 1-4 theme: Urgent Nether boss theme
      this.playNoteSequencer([
        146, 155, 146, 0, 146, 155, 146, 0,
        138, 146, 138, 116, 110, 116, 130, 0
      ], 155, 'sawtooth', 0.04);
    }
  }

  resumeMusicForCurrentState() {
    if (this.currentTrack) {
      const lastTrack = this.currentTrack;
      this.currentTrack = null;
      this.startMusic(lastTrack as any);
    }
  }

  stopMusic() {
    if (this.sequencerTimer) {
      clearInterval(this.sequencerTimer);
      this.sequencerTimer = null;
    }
    this.musicSources.forEach((source) => {
      try {
        source.oscs.forEach((osc) => osc.stop());
      } catch (e) {}
    });
    this.musicSources = [];
  }

  private playNoteSequencer(notes: number[], tempoBpm: number, oscType: 'square' | 'triangle' | 'sine' | 'sawtooth', volume: number) {
    if (!this.ctx) return;
    const intervalMs = (60 / tempoBpm) * 1000 * 0.5; // Eighth note interval
    let step = 0;

    const playStep = () => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const freq = notes[step];

      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const mainGain = this.ctx.createGain();
        osc.connect(mainGain);
        mainGain.connect(this.ctx.destination);

        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, t);

        mainGain.gain.setValueAtTime(0, t);
        mainGain.gain.linearRampToValueAtTime(volume, t + 0.01);
        mainGain.gain.exponentialRampToValueAtTime(0.001, t + (intervalMs / 1000) * 0.95);

        try {
          osc.start(t);
          osc.stop(t + (intervalMs / 1000) * 0.95);

          const srcItem = { oscs: [osc], gain: mainGain };
          this.musicSources.push(srcItem);
          // Keep list small / garbage collection
          if (this.musicSources.length > 32) {
            this.musicSources.shift();
          }
        } catch (e) {}
      }

      step = (step + 1) % notes.length;
    };

    // Play first immediately
    playStep();
    this.sequencerTimer = window.setInterval(playStep, intervalMs);
  }
}

export const audio = new SoundManager();
