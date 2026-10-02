// Render a series intro once and ship it with the site:
//
//   npx tsx scripts/render-intro.ts "Wealth Whispers"
//   npx tsx scripts/render-intro.ts "Wealth Whispers" --music "E:\path\track.wav"
//   npx tsx scripts/render-intro.ts "Wealth Whispers" --music track.wav --start 92.5
//
// Writes lib/assets/intros/<slug>.mp4 (picked up by montages with intro: { title }) and
// lib/assets/intros/<slug>.png (the matching thumbnail). With --music and no --start, the
// most intense stretch of the track is found automatically.

import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { loudestWindow } from '../lib/audio-peak';
import { INTRO_SECONDS, introSlug, renderIntro, thumbnailPng } from '../lib/intro';

const run = promisify(execFile);

async function decodeMono(file: string, rate: number): Promise<Float32Array> {
  const { stdout } = await run(
    ffmpegPath!,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      String(rate),
      '-f',
      'f32le',
      '-',
    ],
    { encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024 },
  );
  const buf = stdout as unknown as Buffer;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

async function main() {
  const args = process.argv.slice(2);
  const title = args.find(
    (a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true,
  );
  if (!title) throw new Error('Usage: render-intro.ts "<title>" [--music file] [--start seconds]');
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const music = flag('music');
  let start = flag('start') !== undefined ? Number(flag('start')) : undefined;

  if (music && start === undefined) {
    const rate = 8000;
    start = loudestWindow(await decodeMono(music, rate), rate, INTRO_SECONDS);
    console.log(
      `Most intense ${INTRO_SECONDS}s of ${path.basename(music)} starts at ${start.toFixed(2)}s`,
    );
  }

  const dir = path.join(process.cwd(), 'lib', 'assets', 'intros');
  await mkdir(dir, { recursive: true });
  const slug = introSlug(title);
  const t = Date.now();
  await writeFile(path.join(dir, `${slug}.mp4`), await renderIntro(title, { music, start }));
  await writeFile(path.join(dir, `${slug}.png`), thumbnailPng(title));
  console.log(
    `Wrote lib/assets/intros/${slug}.mp4 and .png in ${((Date.now() - t) / 1000).toFixed(0)}s`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
