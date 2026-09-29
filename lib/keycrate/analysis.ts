/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · key and BPM detection for untagged audio
   Runs on ~30 s of mono audio at ~11 kHz (the middle of the track, past the intro).
   - BPM: spectral-flux onset envelope → autocorrelation, scored over the first four
     beat multiples on a 0.05 BPM grid, with a gentle prior around 125 for dance music.
   - Key: chromagram (55 Hz–2.1 kHz) correlated with the Krumhansl–Kessler major and
     minor profiles in all 12 transpositions.
   Estimates, like any detector: DJ software reaches similar accuracy on electronic
   music, worse on tracks with key changes or no steady beat.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeKey } from './camelot';
import type { Camelot } from './types';

/** In-place radix-2 complex FFT; `re.length` must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const hann = (n: number) => {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
};

/** Magnitude spectra of successive windows (only the first n/2 bins). */
function* spectra(x: Float32Array, n: number, hop: number): Generator<Float64Array> {
  const w = hann(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const mag = new Float64Array(n / 2);
  for (let start = 0; start + n <= x.length; start += hop) {
    for (let i = 0; i < n; i++) {
      re[i] = x[start + i] * w[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < n / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    yield mag;
  }
}

/* ── BPM ───────────────────────────────────────────────────────────────── */

export const BPM_MIN = 70;
export const BPM_MAX = 180;

export function detectBpm(x: Float32Array, rate: number): number | null {
  const n = 1024;
  const hop = 128;
  const fps = rate / hop;
  // Onset strength: how much the log spectrum rose since the last frame.
  const env: number[] = [];
  let prev: Float64Array | null = null;
  for (const mag of spectra(x, n, hop)) {
    const log = mag.map((m) => Math.log1p(100 * m));
    let flux = 0;
    if (prev) for (let k = 0; k < log.length; k++) flux += Math.max(0, log[k] - prev[k]);
    env.push(flux);
    prev = log;
  }
  if (env.length < fps * 8) return null;
  // Remove the slow trend (about half a second) so only the pulses remain.
  const win = Math.round(fps / 2);
  const e = new Float64Array(env.length);
  let sum = 0;
  for (let i = 0; i < env.length; i++) {
    sum += env[i];
    if (i >= win) sum -= env[i - win];
    e[i] = Math.max(0, env[i] - sum / Math.min(i + 1, win));
  }

  const maxLag = Math.ceil(((60 * fps) / BPM_MIN) * 4) + 2;
  const ac = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = lag; i < e.length; i++) s += e[i] * e[i - lag];
    ac[lag] = s / (e.length - lag);
  }
  const at = (lag: number) => {
    const i = Math.floor(lag);
    const f = lag - i;
    return i + 1 > maxLag ? 0 : ac[i] * (1 - f) + ac[i + 1] * f;
  };

  let best = 0;
  let bestBpm = 0;
  for (let bpm = BPM_MIN; bpm <= BPM_MAX; bpm += 0.05) {
    const period = (60 * fps) / bpm;
    let s = 0;
    for (let k = 1; k <= 4; k++) s += at(k * period);
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 125) / 0.9) ** 2);
    if (s * prior > best) {
      best = s * prior;
      bestBpm = bpm;
    }
  }
  if (!best) return null;
  const r = Math.round(bestBpm * 10) / 10;
  // Most dance tracks sit on a whole BPM.
  return Math.abs(r - Math.round(r)) <= 0.25 ? Math.round(r) : r;
}

/* ── Key ───────────────────────────────────────────────────────────────── */

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** The 12 pitch-class energies of the signal. */
export function chroma(x: Float32Array, rate: number): number[] {
  const n = 8192;
  const c = new Array(12).fill(0);
  const pcOf: number[] = [];
  for (let k = 0; k < n / 2; k++) {
    const f = (k * rate) / n;
    pcOf.push(
      f < 55 || f > 2100 ? -1 : ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12,
    );
  }
  for (const mag of spectra(x, n, n / 2)) {
    for (let k = 0; k < mag.length; k++) if (pcOf[k] >= 0) c[pcOf[k]] += mag[k];
  }
  return c;
}

export function detectKey(x: Float32Array, rate: number): Camelot | null {
  const c = chroma(x, rate);
  if (!c.some((v) => v > 0)) return null;
  let best = -Infinity;
  let name = '';
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = c.map((_, i) => c[(i + tonic) % 12]);
    const maj = pearson(rotated, MAJOR);
    const min = pearson(rotated, MINOR);
    if (maj > best) {
      best = maj;
      name = NOTES[tonic];
    }
    if (min > best) {
      best = min;
      name = `${NOTES[tonic]}m`;
    }
  }
  return normalizeKey(name);
}

/* ── PCM WAV ───────────────────────────────────────────────────────────── */

export interface WavInfo {
  rate: number;
  channels: number;
  bits: number;
  float: boolean;
  blockAlign: number;
  dataStart: number;
  dataLength: number;
}

type ReadRange = (start: number, end: number) => Promise<Uint8Array>;

const ascii = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...Array.from(b.subarray(at, at + n)));
const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) =>
  b[at] + (b[at + 1] << 8) + (b[at + 2] << 16) + ((b[at + 3] << 24) >>> 0);

/** The format and where the samples sit, for uncompressed PCM or float WAVs; null otherwise. */
export async function readWavInfo(read: ReadRange, size: number | null): Promise<WavInfo | null> {
  const head = await read(0, 12);
  if (head.length < 12 || ascii(head, 0, 4) !== 'RIFF' || ascii(head, 8, 4) !== 'WAVE') return null;
  const total = size ?? u32(head, 4) + 8;
  let fmt: Omit<WavInfo, 'dataStart' | 'dataLength'> | null = null;
  let pos = 12;
  for (let i = 0; i < 32 && pos + 8 <= total; i++) {
    const h = await read(pos, pos + 8);
    if (h.length < 8) break;
    const id = ascii(h, 0, 4);
    const len = u32(h, 4);
    if (id === 'fmt ') {
      const b = await read(pos + 8, pos + 8 + Math.min(len, 40));
      let tag = u16(b, 0);
      if (tag === 0xfffe && b.length >= 26) tag = u16(b, 24); // WAVE_FORMAT_EXTENSIBLE
      const bits = u16(b, 14);
      if (tag !== 1 && tag !== 3) return null;
      fmt = {
        channels: u16(b, 2),
        rate: u32(b, 4),
        blockAlign: u16(b, 12),
        bits,
        float: tag === 3,
      };
    } else if (id === 'data') {
      if (!fmt || !fmt.channels || !fmt.blockAlign) return null;
      return { ...fmt, dataStart: pos + 8, dataLength: Math.min(len, total - pos - 8) };
    }
    pos += 8 + len + (len & 1);
  }
  return null;
}

/** Interleaved PCM bytes → mono floats, then averaged down by `factor` (a crude low-pass). */
export function decodeMono(bytes: Uint8Array, info: WavInfo, factor: number): Float32Array {
  const frames = Math.floor(bytes.length / info.blockAlign);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bps = info.bits / 8;
  const sample = (at: number): number => {
    if (info.float) return info.bits === 64 ? view.getFloat64(at, true) : view.getFloat32(at, true);
    switch (info.bits) {
      case 8:
        return (bytes[at] - 128) / 128;
      case 16:
        return view.getInt16(at, true) / 32768;
      case 24: {
        const v = bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
        return (v & 0x800000 ? v - 0x1000000 : v) / 8388608;
      }
      default:
        return view.getInt32(at, true) / 2147483648;
    }
  };
  const out = new Float32Array(Math.floor(frames / factor));
  for (let o = 0; o < out.length; o++) {
    let s = 0;
    for (let f = o * factor; f < (o + 1) * factor; f++) {
      const base = f * info.blockAlign;
      for (let c = 0; c < info.channels; c++) s += sample(base + c * bps);
    }
    out[o] = s / (factor * info.channels);
  }
  return out;
}

/** Target rate for analysis: plenty for beats and pitch up to ~2 kHz. */
export const ANALYSIS_RATE = 11025;
/** Seconds analysed, and the most bytes fetched (Drive ranges are capped at 8 MB). */
const SECONDS = 30;
const MAX_BYTES = 7.5 * 1024 * 1024;

/** The byte range to analyse: ~30 s starting 35% in, whole frames only. */
export function analysisWindow(info: WavInfo): { start: number; end: number } {
  const frames = Math.floor(info.dataLength / info.blockAlign);
  const want = Math.min(
    frames,
    Math.floor(SECONDS * info.rate),
    Math.floor(MAX_BYTES / info.blockAlign),
  );
  const first = frames - want > 0 ? Math.min(Math.floor(frames * 0.35), frames - want) : 0;
  const start = info.dataStart + first * info.blockAlign;
  return { start, end: start + want * info.blockAlign };
}

export interface Detected {
  camelot: Camelot | null;
  bpm: number | null;
}

/** Key and BPM from a slice of WAV sample bytes. */
export function analyzeWavBytes(bytes: Uint8Array, info: WavInfo): Detected {
  const factor = Math.max(1, Math.round(info.rate / ANALYSIS_RATE));
  const x = decodeMono(bytes, info, factor);
  const rate = info.rate / factor;
  return { bpm: detectBpm(x, rate), camelot: detectKey(x, rate) };
}
