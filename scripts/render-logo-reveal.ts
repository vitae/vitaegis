// Render the VITAEGIS logo reveal with Google Veo and ship it with the site:
//
//   npm run logo:reveal
//   npm run logo:reveal -- --out public/video/vitaegis-logo-reveal.mp4 --resolution 720p
//
// Needs GEMINI_API_KEY (Google AI Studio, billing enabled). The model comes from
// GEMINI_VIDEO_MODEL, defaulting to Veo 3.1. Veo is long-running: this starts the job,
// polls until it finishes, downloads the clip and writes it to --out.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  downloadVideo,
  googleAiConfigured,
  pollVideo,
  startVideo,
  VIDEO_MODEL,
} from '../lib/google-ai';

export const LOGO_REVEAL_PROMPT = `8-second cinematic logo reveal, 16:9, photoreal ray-traced render, pure black void, light rain, palette strictly black, electric green (#00FF00) and white-hot highlights.

0–1.5s: Darkness and soft falling rain. A faint golden spiral of thin green light traces itself across the black. Three small stars of Orion's Belt glint in the upper left.

1.5–3.5s: Two flawless, perfectly transparent glass pyramids rise from a still black water surface, side by side and overlapping to form a V-shaped notch between their slopes. Rain beads on their faces. Two razor-thin green laser beams shoot in from opposite edges of the frame, strike the outer faces and bend sharply inside the glass into thick, liquid glowstick-green cores. Bright star flares appear at each impact point.

3.5–5.5s: The lasers converge beneath the notch, and a brilliant green sun rises and settles into the V between the two pyramids, like the ancient Egyptian horizon hieroglyph. Thin rays fan out from the sun in a spiral pattern, with a horizontal lens-flare streak across it. Concentric rings of light ripple outward from the sun. A faint all-green rainbow arc forms through the rain.

5.5–8s: The lasers pierce the water surface, bending again, and cross beneath it. Below the horizon, the word "VITAEGIS" ignites in clean geometric sans-serif (Jost style), all caps, wide letter spacing: glowstick-green liquid light with white-hot laser-sharp edges and a deep green bloom. The whole scene reflects in the rippling wet floor. The camera slowly settles and holds, perfectly steady.

Camera: slow, smooth push-in from a low angle, ending centered and still.
Audio: soft rain, a deep sub-bass hum rising, crystalline glass chimes as each laser hits, a warm swelling tone as the sun enters the notch, a low cinematic boom on the wordmark reveal, then rain and a fading shimmer. No vocals, no voiceover.
Style: anamorphic lens, 24fps, ultra-sharp, high contrast, luxury tech brand aesthetic.`;

export const LOGO_REVEAL_NEGATIVE_PROMPT =
  'people, faces, hands, voiceover, speech, lyrics, subtitles, captions, watermark, misspelled text, extra words, blue, orange, magenta, purple, daylight, camera shake, cartoon, low resolution';

const DEFAULT_OUT = path.join('public', 'video', 'vitaegis-logo-reveal.mp4');
const POLL_MS = 10_000;
const TIMEOUT_MS = 15 * 60 * 1000;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  if (!googleAiConfigured()) {
    console.error('GEMINI_API_KEY is not set. Add it to the environment and run again.');
    process.exit(1);
  }
  const out = arg('out') ?? DEFAULT_OUT;
  const resolution = (arg('resolution') ?? '1080p') as '720p' | '1080p';

  console.log(`Starting ${VIDEO_MODEL} at ${resolution}, 16:9, 8s...`);
  const op = await startVideo(LOGO_REVEAL_PROMPT, {
    aspectRatio: '16:9',
    resolution,
    durationSeconds: 8,
    // Veo 3.1 Lite rejects negativePrompt outright, so only the full models get it.
    ...(VIDEO_MODEL.includes('lite') ? {} : { negativePrompt: LOGO_REVEAL_NEGATIVE_PROMPT }),
  });
  console.log(`Operation ${op}`);

  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    const r = await pollVideo(op);
    if (r.done) {
      if (r.error || !r.uri) throw new Error(r.error ?? 'Veo returned no video');
      console.log('Rendered. Downloading...');
      const bytes = await downloadVideo(r.uri);
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, bytes);
      console.log(`Wrote ${out} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
      return;
    }
    if (Date.now() > deadline)
      throw new Error(`Veo still running after ${TIMEOUT_MS / 60000} minutes: ${op}`);
    process.stdout.write('.');
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
