/** Original 52-second composition: slow suspended harmony, a soft low pulse,
 * and a sparse descending motif. No samples, speech, or sound effects. */
export function scoreSample(t: number, channel: number): number {
  if (!Number.isFinite(t) || t <= 0 || t >= 52) return 0;
  const fade = Math.min(1, t / 2.5, (52 - t) / 3.5);
  const chords = [[146.832, 220, 277.183, 329.628], [130.813, 196, 261.626, 329.628], [110, 164.814, 220, 293.665], [146.832, 220, 293.665, 369.994]];
  let pad = 0;
  for (let bar = 0; bar < 8; bar++) {
    const age = t - bar * 7;
    if (age < 0 || age > 10) continue;
    const env = Math.min(1, age / 2, (10 - age) / 3);
    for (const hz of chords[bar % chords.length]) {
      pad += Math.sin(2 * Math.PI * hz * (1 + channel * .0006) * t) * env * .023;
      pad += Math.sin(2 * Math.PI * hz * 2 * t + .4) * env * .004;
    }
  }
  const pulseAge = t % 1.75;
  const pulse = Math.sin(2 * Math.PI * 73.416 * t) * Math.sin(Math.min(1, pulseAge / .08) * Math.PI / 2) * Math.exp(-pulseAge * 4) * .045;
  const notes = [440, 369.994, 329.628, 293.665, 329.628, 277.183];
  const age = (t + channel * .02) % 3.5;
  const motif = Math.sin(2 * Math.PI * notes[Math.floor(t / 3.5) % notes.length] * age) * Math.min(1, age / .11) * Math.exp(-age * 1.8) * .038;
  return (pad + pulse + motif) * fade;
}

export function createScoreWav(rate = 48000): Buffer {
  const frames = rate * 52;
  const wav = Buffer.alloc(44 + frames * 4);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) wav.writeInt16LE(Math.round(scoreSample(i / rate, ch) * 32767), 44 + i * 4 + ch * 2);
  return wav;
}
