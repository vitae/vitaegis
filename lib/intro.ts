// Server-only. The VITAEGIS intro: a few seconds of animation drawn frame by frame as
// SVG, rendered with resvg and encoded with ffmpeg, then put at the head of a montage.
//
// Motion language borrowed from the 2026 console boot-ups (energy converging on a point,
// a bloom, a glossy glass mark with a specular highlight sweeping across, the glow
// bleeding onto black) but the mark is our own: the VITAEGIS wordmark in Jost, #00FF00,
// over Matrix rain, with the series title in glowing white beneath it.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { Resvg } from '@resvg/resvg-js';
import { FONT_FILE, MONTAGE_H as H, MONTAGE_W as W } from './montage';

const run = promisify(execFile);

export const INTRO_SECONDS = 4.5;
export const INTRO_FPS = 24;

const CX = W / 2;
const MARK_Y = 560;
const TITLE_Y = 790; // the series title sits clear under the orb

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** 0 → 1 as t runs from a to b. */
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x * x * x;
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Deterministic noise, so every render of the same frame is identical. */
const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const GLYPHS = '0123456789ABCDEFЖДФЯЭΣΞ$#%@'.split('');
const COL_W = 30;
const ROW_H = 30;

function rain(t: number) {
  const fade = 0.55 * easeOut(span(t, 0, 0.8));
  const cols = Math.ceil(W / COL_W);
  const out: string[] = [];
  for (let c = 0; c < cols; c++) {
    const speed = 260 + hash(c, 1) * 420;
    const len = 9 + Math.floor(hash(c, 2) * 12);
    const head = ((hash(c, 3) * (H + len * ROW_H) + speed * t) % (H + len * ROW_H)) - ROW_H;
    for (let k = 0; k < len; k++) {
      const y = head - k * ROW_H;
      if (y < -ROW_H || y > H + ROW_H) continue;
      const g =
        GLYPHS[Math.floor(hash(c, Math.floor(y / ROW_H), Math.floor(t * 10)) * GLYPHS.length)];
      const a = (k === 0 ? 1 : (1 - k / len) * 0.7) * fade;
      out.push(
        `<text x="${c * COL_W + COL_W / 2}" y="${y.toFixed(1)}" fill="${k === 0 ? '#CCFFCC' : '#00FF00'}" ` +
          `fill-opacity="${a.toFixed(3)}" font-size="24" text-anchor="middle">${xml(g)}</text>`,
      );
    }
  }
  return `<g font-family="Jost">${out.join('')}</g>`;
}

/** Energy streaks converging on the mark, then a bloom and a ring where they meet. */
function convergence(t: number) {
  const parts: string[] = [];
  const defs: string[] = [];
  const p = easeIn(span(t, 0.35, 1.3));
  if (t < 1.45) {
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.4;
      const far = 900;
      const r = far * (1 - p);
      const hx = CX + Math.cos(ang) * r;
      const hy = MARK_Y + Math.sin(ang) * r;
      const tail = Math.min(far + 300, r + 260 + 300 * p);
      const tx = CX + Math.cos(ang) * tail;
      const ty = MARK_Y + Math.sin(ang) * tail;
      const a = span(t, 0.35, 0.6) * (1 - span(t, 1.3, 1.45));
      // Each streak fades from its tail (clear) to a white-hot head.
      defs.push(
        `<linearGradient id="streak${i}" gradientUnits="userSpaceOnUse" x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" ` +
          `x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}"><stop offset="0" stop-color="#00FF00" stop-opacity="0"/>` +
          `<stop offset="0.8" stop-color="#00FF00"/><stop offset="1" stop-color="#EFFFEF"/></linearGradient>`,
      );
      const line = (w: number, extra = '') =>
        `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" ` +
        `stroke="url(#streak${i})" stroke-width="${w}" stroke-linecap="round" opacity="${a.toFixed(3)}" ${extra}/>`;
      parts.push(line(9, 'filter="url(#glowS)"'), line(3));
    }
  }
  const b = span(t, 1.3, 2.0);
  if (b > 0 && b < 1) {
    parts.push(
      `<circle cx="${CX}" cy="${MARK_Y}" r="${(40 + 520 * easeOut(b)).toFixed(1)}" fill="url(#bloom)" opacity="${(1 - b).toFixed(3)}"/>`,
      `<circle cx="${CX}" cy="${MARK_Y}" r="${(30 + 700 * easeOut(b)).toFixed(1)}" fill="none" stroke="#9BFF9B" ` +
        `stroke-width="${(6 * (1 - b) + 1).toFixed(2)}" opacity="${(0.8 * (1 - b)).toFixed(3)}"/>`,
    );
  }
  return { defs: defs.join(''), body: parts.join('') };
}

const ACID = '#B4FF1A';
const ORB_R = 250;
const ORB_Y = MARK_Y - 10;

/** One frame of the intro as SVG. Pure, so the timeline can be tested. */
export function introFrameSvg(t: number, title: string, brand = 'VITAEGIS'): string {
  const m = span(t, 1.3, 2.3);
  const spacing = 34 - 22 * easeOut(m); // letters gather in as the mark resolves
  const scale = 1.18 - 0.18 * easeOut(m);
  const markA = easeOut(span(t, 1.3, 1.7));
  // The orb swells out of the bloom just before the letters land on it.
  const orbP = easeOut(span(t, 1.15, 2.0));
  const orbR = ORB_R * (0.2 + 0.8 * orbP);
  // Specular sweep crossing orb and letters together, then again near the end.
  const sweep = Math.max(span(t, 2.0, 3.0), span(t, 3.6, 4.4) * 0.6);
  const sx = -200 + (W + 400) * easeOut(sweep);
  // The caustic pool drifts around the lower half of the orb.
  const cx = 0.5 + 0.1 * Math.sin(t * 0.9);
  const cy = 0.76 - 0.06 * Math.cos(t * 0.7);
  const titleP = easeOut(span(t, 2.6, 3.3));
  const tagA = easeOut(span(t, 3.1, 3.7));
  const out = 1 - span(t, INTRO_SECONDS - 0.35, INTRO_SECONDS);
  const streaks = convergence(t);
  const breathe = 0.8 + 0.2 * Math.sin(t * 1.4);

  const mark = (fill: string, extra = '') =>
    `<text x="${CX}" y="${MARK_Y}" text-anchor="middle" dominant-baseline="middle" font-family="Jost" ` +
    `font-weight="600" font-size="112" letter-spacing="${spacing.toFixed(2)}" fill="${fill}" ${extra}>${xml(brand)}</text>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs>` +
    streaks.defs +
    `<radialGradient id="bloom"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.25" stop-color="#9BFF9B"/>` +
    `<stop offset="1" stop-color="#00FF00" stop-opacity="0"/></radialGradient>` +
    // Orb body lit from the upper left, dark glass through the middle, bright far rim.
    `<radialGradient id="body" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#2BFF2B"/>` +
    `<stop offset="0.25" stop-color="#0FB80F"/><stop offset="0.6" stop-color="#064D06"/>` +
    `<stop offset="0.92" stop-color="#031F03"/><stop offset="1" stop-color="#0A8A0A"/></radialGradient>` +
    `<radialGradient id="caustic" cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="0.42"><stop offset="0" stop-color="${ACID}" stop-opacity="0.55"/>` +
    `<stop offset="0.5" stop-color="#00FF00" stop-opacity="0.18"/><stop offset="1" stop-color="#00FF00" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="rim" cx="0.5" cy="0.5" r="0.5"><stop offset="0.86" stop-color="${ACID}" stop-opacity="0"/>` +
    `<stop offset="0.96" stop-color="${ACID}" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.9"/></radialGradient>` +
    `<radialGradient id="hot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>` +
    `<stop offset="0.4" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="bleed" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="${ACID}" stop-opacity="${(0.5 * breathe).toFixed(3)}"/>` +
    `<stop offset="0.6" stop-color="#00FF00" stop-opacity="0.14"/><stop offset="1" stop-color="#00FF00" stop-opacity="0"/></radialGradient>` +
    // White glass letters.
    `<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/>` +
    `<stop offset="0.55" stop-color="#F4FFF2"/><stop offset="0.85" stop-color="#C9FFC9"/><stop offset="1" stop-color="#7DFF7D"/></linearGradient>` +
    `<linearGradient id="spec" gradientUnits="userSpaceOnUse" x1="${(sx - 120).toFixed(1)}" y1="${ORB_Y - ORB_R}" ` +
    `x2="${(sx + 120).toFixed(1)}" y2="${ORB_Y + ORB_R}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="${(0.8 * (sweep > 0 && sweep < 1 ? 1 : 0)).toFixed(2)}"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="orb"><circle cx="${CX}" cy="${ORB_Y}" r="${orbR.toFixed(1)}"/></clipPath>` +
    `<filter id="glowG" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="16"/></filter>` +
    `<filter id="glowS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>` +
    `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<filter id="glowW" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="9"/></filter>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="#000"/>` +
    `<g opacity="${out.toFixed(3)}">` +
    rain(t) +
    // A dark pool so the rain never fights the orb and the lettering.
    `<ellipse cx="${CX}" cy="${ORB_Y}" rx="${(orbR * 1.6).toFixed(1)}" ry="${(orbR * 1.3).toFixed(1)}" fill="#000" opacity="${(0.85 * orbP).toFixed(3)}" filter="url(#glowG)"/>` +
    streaks.body +
    // The orb: acid bleed, body, caustic, rim, hot-spot, sweep.
    `<g opacity="${orbP.toFixed(3)}">` +
    `<circle cx="${CX}" cy="${ORB_Y}" r="${(orbR * 1.9).toFixed(1)}" fill="url(#bleed)"/>` +
    `<circle cx="${CX}" cy="${ORB_Y}" r="${orbR.toFixed(1)}" fill="url(#body)"/>` +
    `<circle cx="${CX}" cy="${ORB_Y}" r="${orbR.toFixed(1)}" fill="url(#caustic)"/>` +
    `<circle cx="${CX}" cy="${ORB_Y}" r="${orbR.toFixed(1)}" fill="url(#rim)"/>` +
    `<ellipse cx="${(CX - orbR * 0.35).toFixed(1)}" cy="${(ORB_Y - orbR * 0.56).toFixed(1)}" rx="${(orbR * 0.42).toFixed(1)}" ry="${(orbR * 0.2).toFixed(1)}" ` +
    `fill="url(#hot)" filter="url(#soft)" transform="rotate(-18 ${(CX - orbR * 0.35).toFixed(1)} ${(ORB_Y - orbR * 0.56).toFixed(1)})"/>` +
    `<circle cx="${CX}" cy="${ORB_Y}" r="${orbR.toFixed(1)}" fill="url(#spec)" clip-path="url(#orb)" opacity="0.55"/>` +
    `</g>` +
    // The letters: soft green glow, white glass, the sweep over them.
    `<g opacity="${markA.toFixed(3)}" transform="translate(${CX} ${MARK_Y}) scale(${scale.toFixed(4)}) translate(${-CX} ${-MARK_Y})">` +
    mark('#00FF00', 'filter="url(#glowW)" opacity="0.55"') +
    mark('url(#glass)') +
    mark('url(#spec)') +
    `</g>` +
    `<g opacity="${titleP.toFixed(3)}" transform="translate(0 ${(24 * (1 - titleP)).toFixed(2)})">` +
    `<text x="${CX}" y="${TITLE_Y + 40}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="58" ` +
    `letter-spacing="6" fill="#FFFFFF" filter="url(#glowW)" opacity="0.9">${xml(title.toUpperCase())}</text>` +
    `<text x="${CX}" y="${TITLE_Y + 40}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="58" ` +
    `letter-spacing="6" fill="#FFFFFF">${xml(title.toUpperCase())}</text>` +
    `</g>` +
    `<text x="${CX}" y="${TITLE_Y + 104}" text-anchor="middle" font-family="Jost" font-size="26" letter-spacing="8" ` +
    `fill="#00FF00" opacity="${(0.75 * tagA).toFixed(3)}">HEALTH · STEALTH · WEALTH</text>` +
    `</g></svg>`
  );
}

/** A 1080×1920 thumbnail: the intro's final frame, scaled up so it stays crisp. */
export function thumbnailPng(title: string, font = FONT_FILE): Buffer {
  const svg = introFrameSvg(INTRO_SECONDS - 0.5, title);
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1080 },
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Jost' },
  });
  return Buffer.from(r.render().asPng());
}

/** Riser into a low boom on the bloom, as a lavfi expression (no audio files to ship). */
export const INTRO_AUDIO =
  `aevalsrc=exprs='0.22*(random(0)*2-1)*pow(min(t/1.3\\,1)\\,2)*lt(t\\,1.32)` +
  `+0.75*sin(2*PI*46*t)*exp(-2.4*(t-1.3))*gte(t\\,1.3)` +
  `+0.25*sin(2*PI*92*t)*exp(-3.5*(t-1.3))*gte(t\\,1.3)':s=48000:d=${INTRO_SECONDS}`;

/**
 * Render the intro to an MP4 (720×1280, 24 fps, stereo) and return its bytes. With
 * `music`, the soundtrack is that file from `start` seconds instead of the built-in
 * riser and boom.
 */
export async function renderIntro(
  title: string,
  opts: { music?: string; start?: number; font?: string } = {},
): Promise<Buffer> {
  const font = opts.font ?? FONT_FILE;
  if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this platform');
  const dir = await mkdtemp(path.join(tmpdir(), 'intro-'));
  try {
    const frames = Math.round(INTRO_SECONDS * INTRO_FPS);
    for (let f = 0; f < frames; f++) {
      const r = new Resvg(introFrameSvg(f / INTRO_FPS, title), {
        font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Jost' },
      });
      await writeFile(path.join(dir, `f${String(f).padStart(4, '0')}.png`), r.render().asPng());
    }
    const out = path.join(dir, 'intro.mp4');
    await run(
      ffmpegPath,
      [
        '-hide_banner',
        '-y',
        '-framerate',
        String(INTRO_FPS),
        '-i',
        path.join(dir, 'f%04d.png'),
        ...(opts.music
          ? ['-ss', String(opts.start ?? 0), '-t', String(INTRO_SECONDS), '-i', opts.music]
          : ['-f', 'lavfi', '-i', INTRO_AUDIO]),
        '-filter_complex',
        `[0:v]format=yuv420p[v];[1:a]${opts.music ? 'afade=t=in:d=0.08,' : 'lowpass=f=2600,'}` +
          `aformat=channel_layouts=stereo,aresample=48000,afade=t=out:st=${INTRO_SECONDS - 0.5}:d=0.5[a]`,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-c:a',
        'aac',
        '-shortest',
        out,
      ],
      { timeout: 120_000, maxBuffer: 16 * 1024 * 1024 },
    );
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const introSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The intro clip for a series. Rendering takes a minute or two of CPU, too long to do
 * inside the content worker alongside a montage, so each series is rendered once with
 * `npx tsx scripts/render-intro.ts "<title>"` into lib/assets/intros/<slug>.mp4 and
 * shipped with the site. A title without a file is rendered on the spot as a fallback.
 */
export async function introFor(title: string): Promise<{ bytes: Buffer; seconds: number }> {
  const file = path.join(process.cwd(), 'lib', 'assets', 'intros', `${introSlug(title)}.mp4`);
  const bytes = existsSync(file) ? await readFile(file) : await renderIntro(title);
  return { bytes, seconds: INTRO_SECONDS };
}
