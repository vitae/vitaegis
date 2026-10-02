// Server-only. Stitch several Veo scenes into one vertical video with exact on-screen
// text. Veo cannot be trusted to spell numbers, so prices and dates are drawn here
// instead: each scene's lines are rendered to a transparent PNG in Jost (lib/fonts, SIL
// Open Font License) with resvg, then laid over the clip by ffmpeg. The static ffmpeg
// build has no drawtext filter, which is why the text is not drawn by ffmpeg itself.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { Resvg } from '@resvg/resvg-js';

const run = promisify(execFile);

export const MONTAGE_W = 720;
export const MONTAGE_H = 1280;
export const FONT_FILE = path.join(process.cwd(), 'lib', 'fonts', 'Jost-SemiBold.ttf');

export interface MontageScene {
  /** Prompt for one Veo clip. */
  prompt: string;
  /** On-screen lines: the first is the headline (green), the rest are white. */
  lines: string[];
}

const xml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * SVG for one scene's caption: a soft dark band across the lower third, the headline in
 * green and the rest in white, outlined so they stay legible over any footage. Long
 * lines shrink to fit the frame. Pure, so the layout can be tested.
 */
export function captionSvg(lines: string[]): string {
  const top = Math.round(MONTAGE_H * 0.62);
  let y = top + 70;
  const texts = lines.map((line, j) => {
    const base = j === 0 ? 64 : 42;
    // Jost averages about 0.52 em per character; keep each line inside ~90% of the width.
    const size = Math.min(base, Math.floor((MONTAGE_W * 0.9) / (Math.max(line.length, 1) * 0.52)));
    const el =
      `<text x="${MONTAGE_W / 2}" y="${y}" text-anchor="middle" font-family="Jost" font-weight="600" ` +
      `font-size="${size}" fill="${j === 0 ? '#00FF00' : '#FFFFFF'}" stroke="#000000" ` +
      `stroke-width="${j === 0 ? 8 : 6}" stroke-linejoin="round" paint-order="stroke">${xml(line)}</text>`;
    y += j === 0 ? 72 : 56;
    return el;
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MONTAGE_W}" height="${MONTAGE_H}">` +
    `<defs><linearGradient id="band" x1="0" x2="0" y1="0" y2="1">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.35" stop-color="#000" stop-opacity="0.55"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient></defs>` +
    `<rect x="0" y="${top - 60}" width="${MONTAGE_W}" height="${MONTAGE_H - top + 60}" fill="url(#band)"/>` +
    texts.join('') +
    `</svg>`
  );
}

export function captionPng(lines: string[], font = FONT_FILE): Buffer {
  const r = new Resvg(captionSvg(lines), {
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Jost' },
  });
  return Buffer.from(r.render().asPng());
}

export interface Segment {
  seconds: number;
  hasAudio: boolean;
  /** Whether a caption PNG is laid over this segment (the intro has none). */
  caption: boolean;
}

/**
 * The -filter_complex graph. Inputs 0..n-1 are the clips in order; after them come the
 * caption PNGs (looped stills), one per captioned segment, in the same order. Each clip
 * is cut to its length, scaled and cropped to 9:16, its caption faded in on top, and given
 * a stereo track (its own audio, or silence when there is none); then everything is
 * concatenated. Pure, so the graph can be tested.
 */
export function montageFilter(segments: Segment[]): string {
  const n = segments.length;
  const parts: string[] = [];
  let caption = n;
  segments.forEach((s, i) => {
    const d = s.seconds;
    const base =
      `[${i}:v]trim=0:${d},setpts=PTS-STARTPTS,` +
      `scale=${MONTAGE_W}:${MONTAGE_H}:force_original_aspect_ratio=increase,` +
      `crop=${MONTAGE_W}:${MONTAGE_H},fps=24,setsar=1`;
    if (s.caption) {
      parts.push(`${base}[b${i}]`);
      parts.push(
        `[${caption++}:v]format=rgba,trim=0:${d},setpts=PTS-STARTPTS,fade=t=in:st=0.3:d=0.5:alpha=1[t${i}]`,
      );
      parts.push(`[b${i}][t${i}]overlay=0:0:format=auto,format=yuv420p[v${i}]`);
    } else {
      parts.push(`${base},format=yuv420p[v${i}]`);
    }
    parts.push(
      s.hasAudio
        ? `[${i}:a]atrim=0:${d},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a${i}]`
        : `anullsrc=r=48000:cl=stereo,atrim=0:${d}[a${i}]`,
    );
  });
  const total = segments.reduce((sum, s) => sum + s.seconds, 0);
  parts.push(`${segments.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${n}:v=1:a=1[vc][ac]`);
  parts.push(`[vc]fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6[v]`);
  parts.push(`[ac]afade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6[a]`);
  return parts.join(';');
}

function binary() {
  if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this platform');
  return ffmpegPath;
}

/** `ffmpeg -i` prints the streams and exits non-zero; that is enough to spot an audio track. */
async function hasAudio(file: string) {
  try {
    await run(binary(), ['-hide_banner', '-i', file]);
    return false;
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    return /Stream #\d+:\d+.*: Audio:/.test(stderr);
  }
}

/**
 * Stitch the clips (MP4 bytes, in order) and return the finished MP4. An intro, when
 * given, plays first at its own length with no caption.
 */
export async function stitch(
  clips: Buffer[],
  scenes: MontageScene[],
  seconds: number,
  intro?: { bytes: Buffer; seconds: number },
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'montage-'));
  try {
    const files: string[] = [];
    const segments: Omit<Segment, 'hasAudio'>[] = [];
    if (intro) {
      const f = path.join(dir, 'intro.mp4');
      await writeFile(f, intro.bytes);
      files.push(f);
      segments.push({ seconds: intro.seconds, caption: false });
    }
    const captions: string[] = [];
    for (const [i, bytes] of clips.entries()) {
      const f = path.join(dir, `scene${i}.mp4`);
      await writeFile(f, bytes);
      files.push(f);
      segments.push({ seconds, caption: scenes[i].lines.length > 0 });
      if (scenes[i].lines.length) {
        const c = path.join(dir, `caption${i}.png`);
        await writeFile(c, captionPng(scenes[i].lines));
        captions.push(c);
      }
    }
    const audio = await Promise.all(files.map(hasAudio));
    const graph = montageFilter(segments.map((s, i) => ({ ...s, hasAudio: audio[i] })));
    const out = path.join(dir, 'montage.mp4');
    await run(
      binary(),
      [
        '-hide_banner',
        '-y',
        ...files.flatMap((f) => ['-i', f]),
        ...captions.flatMap((c) => [
          '-loop',
          '1',
          '-framerate',
          '24',
          '-t',
          String(seconds),
          '-i',
          c,
        ]),
        '-filter_complex',
        graph,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '21',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        out,
      ],
      { timeout: 240_000, maxBuffer: 16 * 1024 * 1024 },
    );
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
