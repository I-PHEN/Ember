/* ------------------------------------------------------------------
   Ember Launch Film: Procedural Web Audio Score + SFX + Real Voice
   Generates a 48.0-second 120 BPM warm cinematic electronic score
   (deep sub-bass pulse, warm Rhodes chords in D minor, crisp typing
   clicks, camera whooshes, chalk texture, and Ember's real voice).
   Can render offline via OfflineAudioContext into a WAV/AudioBuffer
   so every MP4 export has sample-accurate studio audio!
------------------------------------------------------------------- */

export const FILM_DURATION_SEC = 48.0;
export const SAMPLE_RATE = 44100;

/**
 * Renders the complete 48.0-second master stereo soundtrack offline
 * (including procedural score, UI sound effects, and optional voice sample)
 * in < 0.5 seconds using OfflineAudioContext.
 */
export async function buildMasterAudioBuffer(
  voiceArrayBuffer?: ArrayBuffer | null
): Promise<AudioBuffer> {
  const totalSamples = Math.floor(FILM_DURATION_SEC * SAMPLE_RATE);
  const offline = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE);

  // Master compressor to glue the mix
  const comp = offline.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 18;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.005;
  comp.release.value = 0.18;
  comp.connect(offline.destination);

  //Master gain with smooth fade-out at 46.5s -> 48.0s
  const master = offline.createGain();
  master.gain.setValueAtTime(0.85, 0);
  master.gain.setValueAtTime(0.85, 46.2);
  master.gain.linearRampToValueAtTime(0.0001, 47.95);
  master.connect(comp);

  // ------------------------------------------------------------------
  // 1. Warm Cinematic Chord Progression (Dm9 -> Bbmaj7 -> Fmaj7 -> Asus4/A7)
  //    4-bar loop (8 seconds per progression at 120 BPM)
  // ------------------------------------------------------------------
  const chords: Array<{ t: number; dur: number; notes: number[] }> = [];
  const prog = [
    [146.83, 220.0, 261.63, 329.63, 440.0], // Dm9
    [116.54, 174.61, 220.0, 293.66, 349.23], // Bbmaj7
    [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj7
    [110.0, 164.81, 220.0, 277.18, 329.63], // A7sus4
  ];

  for (let bar = 0; bar < 24; bar++) {
    const t = bar * 2.0;
    if (t >= FILM_DURATION_SEC) break;
    const notes = prog[bar % prog.length];
    chords.push({ t, dur: 2.0, notes });
  }

  for (const c of chords) {
    // Duck music slightly during voiceover window (23s -> 35s)
    const inVoice = c.t >= 22.5 && c.t <= 35.5;
    const padLevel = inVoice ? 0.032 : 0.055;

    for (const freq of c.notes) {
      const osc = offline.createOscillator();
      const osc2 = offline.createOscillator();
      osc.type = "sine";
      osc2.type = "triangle";
      osc.frequency.setValueAtTime(freq, c.t);
      osc2.frequency.setValueAtTime(freq * 1.002, c.t); // warm chorus detune

      const filter = offline.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(inVoice ? 680 : 1100, c.t);

      const g = offline.createGain();
      g.gain.setValueAtTime(0.0001, c.t);
      g.gain.linearRampToValueAtTime(padLevel, c.t + 0.18);
      g.gain.exponentialRampToValueAtTime(padLevel * 0.6, c.t + c.dur - 0.1);
      g.gain.linearRampToValueAtTime(0.0001, c.t + c.dur + 0.15);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(g);
      g.connect(master);

      osc.start(c.t);
      osc2.start(c.t);
      osc.stop(c.t + c.dur + 0.2);
      osc2.stop(c.t + c.dur + 0.2);
    }
  }

  // ------------------------------------------------------------------
  // 2. 120 BPM Driving Sub-Bass & Soft Kick Pulse (every 0.5s after 5.0s)
  // ------------------------------------------------------------------
  for (let beat = 0; beat < 92; beat++) {
    const t = beat * 0.5;
    if (t >= 47.0) break;

    // Gentle heartbeat before 5s, full groove from 5s onward
    const isIntro = t < 5.0;
    const inVoice = t >= 23.0 && t <= 35.0;
    if (isIntro && beat % 2 !== 0) continue;

    // Soft sub kick
    const kick = offline.createOscillator();
    const kGain = offline.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(115, t);
    kick.frequency.exponentialRampToValueAtTime(38, t + 0.11);

    const kVol = isIntro ? 0.16 : inVoice ? 0.14 : 0.24;
    kGain.gain.setValueAtTime(kVol, t);
    kGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    kick.connect(kGain);
    kGain.connect(master);
    kick.start(t);
    kick.stop(t + 0.24);

    // Off-beat warm pluck / arpeggio on eighth notes (after 5s)
    if (!isIntro) {
      const arpNotes = [440, 523.25, 587.33, 659.25, 880, 659.25, 587.33, 523.25];
      for (let sub = 0; sub < 2; sub++) {
        const at = t + sub * 0.25;
        const note = arpNotes[(beat * 2 + sub) % arpNotes.length];
        const pluck = offline.createOscillator();
        const pFilter = offline.createBiquadFilter();
        const pGain = offline.createGain();

        pluck.type = "triangle";
        pluck.frequency.setValueAtTime(note, at);
        pFilter.type = "lowpass";
        pFilter.frequency.setValueAtTime(1600, at);
        pFilter.frequency.exponentialRampToValueAtTime(420, at + 0.18);

        const pVol = inVoice ? 0.022 : 0.048;
        pGain.gain.setValueAtTime(0.0001, at);
        pGain.gain.linearRampToValueAtTime(pVol, at + 0.01);
        pGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.21);

        pluck.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(master);
        pluck.start(at);
        pluck.stop(at + 0.22);
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. Synchronized Sound Effects (Spark, Typing, Clicks, Whooshes)
  // ------------------------------------------------------------------
  // Spark chime at 5.2s and 44.8s
  for (const chimeT of [5.2, 44.8]) {
    const freqs = [587.33, 880.0, 1174.66, 1760.0];
    freqs.forEach((f, idx) => {
      const t = chimeT + idx * 0.055;
      const osc = offline.createOscillator();
      const g = offline.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 1.45);
    });
  }

  // Mechanical keystroke clicks during Composer typing (9.8s -> 13.8s)
  for (let kt = 9.8; kt < 13.8; kt += 0.075) {
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200 + ((kt * 1000) % 400), kt);
    osc.frequency.exponentialRampToValueAtTime(220, kt + 0.022);
    g.gain.setValueAtTime(0.055, kt);
    g.gain.exponentialRampToValueAtTime(0.0001, kt + 0.025);
    osc.connect(g);
    g.connect(master);
    osc.start(kt);
    osc.stop(kt + 0.03);
  }

  // Button click pop at 14.8s ("Start lesson ->")
  {
    const ct = 14.8;
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ct);
    osc.frequency.exponentialRampToValueAtTime(880, ct + 0.06);
    g.gain.setValueAtTime(0.14, ct);
    g.gain.exponentialRampToValueAtTime(0.0001, ct + 0.09);
    osc.connect(g);
    g.connect(master);
    osc.start(ct);
    osc.stop(ct + 0.1);
  }

  // Scene transition whooshes at every cut boundary
  const cutTimes = [3.0, 5.0, 9.0, 16.0, 23.0, 34.0, 41.0, 44.5];
  for (const wt of cutTimes) {
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, wt - 0.12);
    osc.frequency.exponentialRampToValueAtTime(260, wt + 0.04);
    osc.frequency.exponentialRampToValueAtTime(70, wt + 0.22);
    g.gain.setValueAtTime(0.0001, wt - 0.12);
    g.gain.linearRampToValueAtTime(0.11, wt);
    g.gain.exponentialRampToValueAtTime(0.0001, wt + 0.24);
    osc.connect(g);
    g.connect(master);
    osc.start(Math.max(0, wt - 0.12));
    osc.stop(wt + 0.25);
  }

  // ------------------------------------------------------------------
  // 4. Professor Ember's Real Voice Excerpt (during Blackboard 23.2s -> 33.8s)
  // ------------------------------------------------------------------
  if (voiceArrayBuffer && voiceArrayBuffer.byteLength > 0) {
    try {
      const decoded = await offline.decodeAudioData(voiceArrayBuffer.slice(0));
      const src = offline.createBufferSource();
      src.buffer = decoded;
      const vGain = offline.createGain();
      vGain.gain.setValueAtTime(0.0001, 23.1);
      vGain.gain.linearRampToValueAtTime(0.95, 23.4);
      vGain.gain.setValueAtTime(0.95, 33.0);
      vGain.gain.linearRampToValueAtTime(0.0001, 33.8);
      src.connect(vGain);
      vGain.connect(master);
      src.start(23.1, 0, 10.8);
    } catch {
      // Ignore if browser cannot decode optional voice snippet
    }
  }

  return await offline.startRendering();
}
