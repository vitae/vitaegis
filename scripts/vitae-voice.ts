// Clone Anthony's voice from the samples in PROJECTS/VITAE/voice/ and print the voice id.
//   npm run vitae:voice
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { ElevenLabs } from '../lib/vitae/elevenlabs';

loadEnv({ path: '.env.local' });

const DIR = join(process.cwd(), 'PROJECTS', 'VITAE', 'voice');
const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
};

async function main() {
  const names = (await readdir(DIR).catch(() => [] as string[])).filter(
    (n) => extname(n).toLowerCase() in MIME,
  );
  if (names.length === 0) {
    throw new Error(`No audio files in ${DIR}. Drop one to three minutes of clean speech there.`);
  }
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      blob: new Blob([await readFile(join(DIR, name))], {
        type: MIME[extname(name).toLowerCase()],
      }),
    })),
  );
  const el = new ElevenLabs(process.env.ELEVENLABS_API_KEY ?? '');
  const voiceId = await el.addVoice('Vitae', files);
  console.log(`Voice created from ${files.length} file(s).
  ELEVENLABS_VOICE_ID=${voiceId}   ← set this in Vercel and .env.local`);
}

main().catch((err) => {
  console.error('[vitae:voice] failed:', err?.message ?? err);
  process.exit(1);
});
