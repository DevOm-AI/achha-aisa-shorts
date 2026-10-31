// Synthesizes the soundtrack stems for the PaperToMoon short into public/music.
// Run: node scripts/synth-audio.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 44100;
const OUT = new URL("../public/music/", import.meta.url);
mkdirSync(OUT, { recursive: true });

let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;

const writeWav = (name, left, right = left) => {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(left[i] * gain * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(right[i] * gain * 32767), 46 + i * 4);
  }
  writeFileSync(new URL(name, OUT), buf);
  console.log(name, (n / SR).toFixed(2) + "s");
};

const lowpass = (x, cutoff) => {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    s += a * (x[i] - s);
    y[i] = s;
  }
  return y;
};
const highpass = (x, cutoff) => {
  const lp = lowpass(x, cutoff);
  return x.map((v, i) => v - lp[i]);
};
// Simple stereo reverb from a few feedback delay lines.
const reverb = (x, mix = 0.3, decay = 0.6) => {
  const taps = [[1557, 1617], [1491, 1422], [1277, 1356], [1116, 1188]];
  const L = new Float32Array(x.length);
  const R = new Float32Array(x.length);
  for (const [dl, dr] of taps) {
    const bl = new Float32Array(dl);
    const br = new Float32Array(dr);
    for (let i = 0; i < x.length; i++) {
      const ol = bl[i % dl];
      const or = br[i % dr];
      bl[i % dl] = x[i] + ol * decay;
      br[i % dr] = x[i] + or * decay;
      L[i] += ol / taps.length;
      R[i] += or / taps.length;
    }
  }
  return [x.map((v, i) => v * (1 - mix) + L[i] * mix), x.map((v, i) => v * (1 - mix) + R[i] * mix)];
};
const buffer = (seconds) => new Float32Array(Math.round(seconds * SR));

// --- Pad: Am - F - C - G, two seconds per chord (120 bpm), warm detuned saws
{
  const chords = [
    [110, 220, 261.63, 329.63],
    [87.31, 174.61, 220, 261.63],
    [130.81, 196, 261.63, 329.63],
    [98, 196, 246.94, 293.66],
  ];
  const x = buffer(30);
  const phases = new Float64Array(16);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const pos = t % 2;
    const chord = chords[Math.floor(t / 2) % 4];
    const env = Math.min(1, pos * 8, (2 - pos) * 8);
    let v = 0;
    chord.forEach((f, k) => {
      for (const [d, j] of [[0.997, 0], [1.003, 1]]) {
        const idx = k * 2 + j;
        phases[idx] = (phases[idx] + (f * d) / SR) % 1;
        v += (phases[idx] * 2 - 1) * (k === 0 ? 0.5 : 0.3);
      }
    });
    x[i] = v * env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t));
  }
  const [l, r] = reverb(lowpass(lowpass(x, 1400), 1800), 0.35, 0.55);
  writeWav("pad.wav", l, r);
}

// --- Beat: kick on every beat, offbeat hats, 16th hats layer (separate stems for volume control)
{
  const kick = buffer(30);
  const hat = buffer(30);
  for (let i = 0; i < kick.length; i++) {
    const t = i / SR;
    const tb = t % 0.5;
    const phase = 45 * tb + (110 / 22) * (1 - Math.exp(-22 * tb));
    kick[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-6 * tb) + 0.3 * noise() * Math.exp(-200 * tb);
    const off = (t + 0.25) % 0.5;
    const sixteenth = t % 0.125;
    hat[i] = noise() * (0.55 * Math.exp(-55 * off) + 0.2 * Math.exp(-120 * sixteenth));
  }
  writeWav("kick.wav", lowpass(kick, 4000));
  writeWav("hat.wav", highpass(highpass(hat, 6000), 6000));
}

// --- Riser: 3.8 s noise + rising tone
{
  const d = 3.8;
  const x = buffer(d);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 150 * Math.pow(1100 / 150, t / d);
    ph += f / SR;
    const amp = Math.pow(t / d, 2.2) * Math.min(1, (d - t) * 30);
    x[i] = amp * (0.35 * Math.sin(2 * Math.PI * ph) + 0.4 * noise());
  }
  const [l, r] = reverb(lowpass(x, 6000), 0.25, 0.5);
  writeWav("riser.wav", l, r);
}

// --- Boom: deep sub drop with a noise crack
{
  const x = buffer(3.5);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const phase = 32 * t + (60 / 5) * (1 - Math.exp(-5 * t));
    x[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-1.3 * t) + 0.6 * noise() * Math.exp(-10 * t);
  }
  const [l, r] = reverb(lowpass(x, 700), 0.3, 0.6);
  writeWav("boom.wav", l, r);
}

// --- Moon swell: shimmering A-major-add9 chord
{
  const freqs = [110, 220, 277.18, 329.63, 493.88, 659.26, 987.77];
  const x = buffer(6);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.08) * Math.exp(-0.5 * t);
    let v = 0;
    freqs.forEach((f, k) => {
      v += Math.sin(2 * Math.PI * f * t + 0.3 * Math.sin(2 * Math.PI * 5 * t)) / (1 + k * 0.35);
    });
    x[i] = v * env * 0.3;
  }
  const [l, r] = reverb(x, 0.5, 0.7);
  writeWav("moon.wav", l, r);
}

// --- Rewind: fast descending tape-warble chirps
{
  const d = 1.2;
  const x = buffer(d);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 2400 * Math.pow(250 / 2400, t / d) * (1 + 0.25 * Math.sin(2 * Math.PI * 18 * t));
    ph += f / SR;
    x[i] = (0.5 * Math.sin(2 * Math.PI * ph) + 0.15 * noise()) * Math.min(1, t * 30, (d - t) * 12);
  }
  writeWav("rewind.wav", highpass(x, 200));
}
