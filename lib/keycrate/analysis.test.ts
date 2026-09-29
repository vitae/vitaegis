import { describe, expect, it } from 'vitest';
import {
  analysisWindow,
  analyzeWavBytes,
  detectBpm,
  detectKey,
  fft,
  readWavInfo,
} from './analysis';

const RATE = 11025;

/** A kick-like thump on every beat plus a hat on the off-beat, for `seconds`. */
function beat(bpm: number, seconds: number, rate = RATE): Float32Array {
  const x = new Float32Array(Math.round(seconds * rate));
  const period = (60 / bpm) * rate;
  for (let b = 0; b * period < x.length; b++) {
    const at = Math.round(b * period);
    for (let i = 0; i < rate * 0.08 && at + i < x.length; i++) {
      const t = i / rate;
      x[at + i] += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 40);
    }
    const off = Math.round(at + period / 2);
    for (let i = 0; i < rate * 0.02 && off + i < x.length; i++) {
      x[off + i] += 0.3 * (Math.random() * 2 - 1) * Math.exp(-(i / rate) * 200);
    }
  }
  return x;
}

/** Sustained notes (Hz), each with a couple of harmonics. */
function chord(freqs: number[], seconds: number, rate = RATE): Float32Array {
  const x = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < x.length; i++) {
    const t = i / rate;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    x[i] = s / freqs.length;
  }
  return x;
}

const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

describe('fft', () => {
  it('puts a pure tone in its bin', () => {
    const n = 64;
    const re = Float64Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * 5 * i) / n));
    const im = new Float64Array(n);
    fft(re, im);
    const mags = Array.from(re, (r, i) => Math.hypot(r, im[i]));
    expect(mags.indexOf(Math.max(...mags.slice(0, n / 2)))).toBe(5);
  });
});

describe('detectBpm', () => {
  it.each([124, 128, 174 / 2, 140])('finds %s BPM', (bpm) => {
    expect(detectBpm(beat(bpm, 30), RATE)).toBeCloseTo(bpm, 0);
  });

  it('gives up on silence and very short clips', () => {
    expect(detectBpm(new Float32Array(RATE * 30), RATE)).toBeNull();
    expect(detectBpm(beat(128, 3), RATE)).toBeNull();
  });
});

describe('detectKey', () => {
  it('hears A minor (8A) in an Am – Dm – E progression', () => {
    const am = chord([110, 220, 261.63, 329.63], 4);
    const dm = chord([146.83, 293.66, 349.23, 440], 4);
    const e = chord([164.81, 329.63, 415.3, 493.88], 2);
    expect(detectKey(concat(am, dm, am, e, am), RATE)).toBe('8A');
  });

  it('hears C major (8B) in a C – F – G progression', () => {
    const c = chord([130.81, 261.63, 329.63, 392], 4);
    const f = chord([174.61, 349.23, 440, 523.25], 4);
    const g = chord([196, 392, 493.88, 587.33], 2);
    expect(detectKey(concat(c, f, c, g, c), RATE)).toBe('8B');
  });
});

/** A 16-bit stereo PCM WAV of `x` (same signal in both channels). */
function wav(x: Float32Array, rate: number): Uint8Array {
  const data = x.length * 4;
  const b = new Uint8Array(44 + data);
  const v = new DataView(b.buffer);
  const str = (at: number, s: string) => [...s].forEach((c, i) => (b[at + i] = c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + data, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, data, true);
  for (let i = 0; i < x.length; i++) {
    const s = Math.max(-1, Math.min(1, x[i])) * 32767;
    v.setInt16(44 + i * 4, s, true);
    v.setInt16(46 + i * 4, s, true);
  }
  return b;
}

describe('WAV analysis', () => {
  it('reads the format, picks a window and detects key and BPM', async () => {
    const rate = 44100;
    const music = concat(beat(126, 60, rate));
    const tone = chord([110, 220, 261.63, 329.63], 60, rate);
    for (let i = 0; i < music.length; i++) music[i] = 0.6 * music[i] + 0.4 * tone[i];
    const bytes = wav(music, rate);
    const read = async (s: number, e: number) => bytes.subarray(s, e);
    const info = await readWavInfo(read, bytes.length);
    expect(info).toMatchObject({ rate, channels: 2, bits: 16, float: false, dataStart: 44 });
    const w = analysisWindow(info!);
    expect((w.end - w.start) / info!.blockAlign / rate).toBeCloseTo(30, 0);
    expect(analyzeWavBytes(bytes.subarray(w.start, w.end), info!)).toEqual({
      bpm: 126,
      camelot: '8A',
    });
  });

  it('skips compressed and non-WAV files', async () => {
    const mp3 = new TextEncoder().encode('ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000');
    expect(await readWavInfo(async (s, e) => mp3.subarray(s, e), mp3.length)).toBeNull();
  });
});
