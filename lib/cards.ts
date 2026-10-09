// Server-only. Concept cards: branded stills drawn as SVG and rendered with resvg, and a
// vertical reel cut from them with ffmpeg. No model in the loop, so a post can be made from
// the site's own concepts (pillar directives, dossier entries, proverbs, research findings)
// in seconds and at no cost, with the text exactly as written.
//
// Two formats: a 4:5 card for the feed (Instagram carousel, Facebook photo, X image) and a
// 9:16 frame for a reel (Instagram Reels, Facebook video, YouTube Shorts, TikTok).

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { Resvg } from '@resvg/resvg-js';
import { FONT_FILE } from './montage';

const run = promisify(execFile);

export type CardFormat = 'feed' | 'reel';
export const CARD_SIZE: Record<CardFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1350 },
  reel: { w: 1080, h: 1920 },
};

export interface CardSpec {
  /** Dossier code shown in the kicker, e.g. "H-01". Optional. */
  code?: string;
  /** Pillar name for the kicker, e.g. "Health". Optional. */
  pillar?: string;
  /** The headline. Two short lines at most read best. */
  title: string;
  /** Body lines. Each is one point; long ones wrap. Up to four. */
  lines: string[];
  /** Small line at the foot, e.g. "vitaegis.com/health". */
  footer?: string;
}

const GREEN = '#00FF00';
const xml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Jost averages about 0.52 em per character. */
const CHAR_EM = 0.52;

/** Greedy word wrap to a pixel width at a font size. Pure, so it can be tested. */
export function wrapLines(text: string, fontSize: number, maxWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * CHAR_EM)));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * One card as SVG. Black field, a faint rain of glyphs, the glass pane with an even rim,
 * the kicker, the title in white, the points in white with a green tick, and the footer.
 * Pure, so the layout can be tested.
 */
export function cardSvg(spec: CardSpec, format: CardFormat, index = 0, total = 1): string {
  const { w, h } = CARD_SIZE[format];
  const pad = 96;
  const paneX = pad;
  const paneW = w - pad * 2;
  const inner = paneW - 88;
  const titleSize = format === 'reel' ? 84 : 76;
  const bodySize = format === 'reel' ? 46 : 42;
  const titleLines = wrapLines(spec.title, titleSize, inner).slice(0, 3);
  const points = spec.lines.slice(0, 4).map((l) => wrapLines(l, bodySize, inner - 56));
  const kicker = [spec.code, spec.pillar?.toUpperCase()].filter(Boolean).join(' · ');

  // Content height, so the pane can be centred vertically in the frame.
  const titleH = titleLines.length * (titleSize * 1.12);
  const bodyH = points.reduce((sum, ls) => sum + ls.length * (bodySize * 1.35) + 26, 0);
  const contentH = 72 + (kicker ? 54 : 0) + titleH + 40 + bodyH + 70;
  const paneH = Math.min(h - pad * 2, Math.max(520, contentH));
  const paneY = Math.round((h - paneH) / 2);

  let y = paneY + 72;
  const parts: string[] = [];
  if (kicker) {
    parts.push(
      `<text x="${paneX + 44}" y="${y}" font-family="Jost" font-weight="600" font-size="26" letter-spacing="7" fill="${GREEN}">${xml(kicker)}</text>`,
    );
    y += 54;
  }
  for (const line of titleLines) {
    y += titleSize * 0.95;
    parts.push(
      `<text x="${paneX + 44}" y="${y}" font-family="Jost" font-weight="600" font-size="${titleSize}" fill="#FFFFFF">${xml(line)}</text>`,
    );
    y += titleSize * 0.17;
  }
  y += 40;
  for (const ls of points) {
    const top = y + bodySize * 0.9;
    parts.push(
      `<rect x="${paneX + 44}" y="${top - bodySize * 0.55}" width="10" height="${Math.round(ls.length * bodySize * 1.35 - bodySize * 0.4)}" rx="5" fill="${GREEN}" opacity="0.9"/>`,
    );
    for (const line of ls) {
      y += bodySize * 1.35;
      parts.push(
        `<text x="${paneX + 44 + 56}" y="${y - bodySize * 0.45}" font-family="Jost" font-weight="600" font-size="${bodySize}" fill="#F2FFF2">${xml(line)}</text>`,
      );
    }
    y += 26;
  }
  const footer = spec.footer ?? 'vitaegis.com';
  const foot = paneY + paneH - 40;

  // A quiet rain of glyphs behind the pane, deterministic per card.
  const glyphs = '0123456789ABCDEF'.split('');
  const rain: string[] = [];
  for (let c = 0; c < Math.ceil(w / 54); c++) {
    for (let r = 0; r < Math.ceil(h / 54); r++) {
      const n = (c * 7919 + r * 104729 + index * 31) % 97;
      if (n % 5 !== 0) continue;
      rain.push(
        `<text x="${c * 54 + 20}" y="${r * 54 + 30}" font-family="Jost" font-size="22" fill="${GREEN}" fill-opacity="${(0.06 + (n % 7) * 0.012).toFixed(3)}">${glyphs[n % 16]}</text>`,
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs>` +
    `<radialGradient id="sheen" cx="0.5" cy="0.5" r="0.72"><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0.08"/></radialGradient>` +
    `<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12"/></filter>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="#000"/>` +
    rain.join('') +
    // The pane: even neon rim with a bloom, a clear face with an even edge sheen.
    `<rect x="${paneX}" y="${paneY}" width="${paneW}" height="${paneH}" rx="36" fill="none" stroke="${GREEN}" stroke-width="10" opacity="0.35" filter="url(#glow)"/>` +
    `<rect x="${paneX}" y="${paneY}" width="${paneW}" height="${paneH}" rx="36" fill="#000" fill-opacity="0.72"/>` +
    `<rect x="${paneX}" y="${paneY}" width="${paneW}" height="${paneH}" rx="36" fill="url(#sheen)"/>` +
    `<rect x="${paneX}" y="${paneY}" width="${paneW}" height="${paneH}" rx="36" fill="none" stroke="${GREEN}" stroke-width="3"/>` +
    `<rect x="${paneX + 6}" y="${paneY + 6}" width="${paneW - 12}" height="${paneH - 12}" rx="31" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>` +
    parts.join('') +
    `<text x="${paneX + 44}" y="${foot}" font-family="Jost" font-weight="600" font-size="24" letter-spacing="4" fill="${GREEN}" opacity="0.85">${xml(footer)}</text>` +
    (total > 1
      ? `<text x="${paneX + paneW - 44}" y="${foot}" text-anchor="end" font-family="Jost" font-weight="600" font-size="24" letter-spacing="3" fill="#FFFFFF" opacity="0.5">${index + 1} / ${total}</text>`
      : '') +
    // Wordmark and tagline outside the pane.
    `<text x="${w / 2}" y="${paneY - 44}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="34" letter-spacing="12" fill="${GREEN}">VITAEGIS</text>` +
    `<text x="${w / 2}" y="${paneY + paneH + 64}" text-anchor="middle" font-family="Jost" font-size="22" letter-spacing="8" fill="${GREEN}" opacity="0.6">HEALTH · STEALTH · WEALTH</text>` +
    `</svg>`
  );
}

export function cardPng(
  spec: CardSpec,
  format: CardFormat,
  index = 0,
  total = 1,
  font = FONT_FILE,
): Buffer {
  const r = new Resvg(cardSvg(spec, format, index, total), {
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Jost' },
  });
  return Buffer.from(r.render().asPng());
}

export const REEL_FPS = 24;

/**
 * The -filter_complex graph for a reel: each still held for `seconds` with a slow push-in,
 * a short fade between cards, a silent stereo track, and a fade out. Pure, so it can be
 * tested. Inputs 0..n-1 are the card PNGs.
 */
export function reelFilter(n: number, seconds: number, w = 1080, h = 1920): string {
  const frames = Math.round(seconds * REEL_FPS);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    parts.push(
      `[${i}:v]scale=${w * 2}:${h * 2},zoompan=z='min(zoom+0.0006,1.06)':d=${frames}:s=${w}x${h}:fps=${REEL_FPS},` +
        `format=yuv420p,fade=t=in:st=0:d=0.4${i === n - 1 ? '' : `,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4`}[v${i}]`,
    );
  }
  parts.push(`${Array.from({ length: n }, (_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[vc]`);
  const total = n * seconds;
  parts.push(`[vc]fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6[v]`);
  parts.push(`anullsrc=r=48000:cl=stereo,atrim=0:${total}[a]`);
  return parts.join(';');
}

/** Cut the card PNGs into one vertical MP4 and return its bytes. */
export async function cardsReel(pngs: Buffer[], seconds = 4): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this platform');
  if (!pngs.length) throw new Error('No cards to cut');
  const dir = await mkdtemp(path.join(tmpdir(), 'reel-'));
  try {
    const inputs: string[] = [];
    for (const [i, png] of pngs.entries()) {
      const file = path.join(dir, `card${i}.png`);
      await writeFile(file, png);
      // One frame in; zoompan makes the `seconds` of motion from it.
      inputs.push('-i', file);
    }
    const out = path.join(dir, 'reel.mp4');
    await run(
      ffmpegPath,
      [
        '-hide_banner',
        '-y',
        ...inputs,
        '-filter_complex',
        reelFilter(pngs.length, seconds),
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        '-shortest',
        out,
      ],
      { timeout: 240_000, maxBuffer: 32 * 1024 * 1024 },
    );
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
