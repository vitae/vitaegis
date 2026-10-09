// Render a sample concept card and reel to a folder, to eyeball the design or to check that
// resvg and ffmpeg work on this machine:
//   npx tsx scripts/render-cards.ts <outDir>
import { mkdir, writeFile } from 'node:fs/promises';
import { cardPng, cardsReel, type CardSpec } from '../lib/cards';

async function main() {
  const out = process.argv[2] ?? '.tmp-cards';
  await mkdir(out, { recursive: true });

  const specs: CardSpec[] = [
    {
      id: 'H-01.01',
      pillar: 'Health',
      title: 'Circadian Rhythm',
      lines: [
        'Sunlight in your eyes within an hour of waking. Every day.',
        'Same wake time seven days a week. Sleep is scheduled, not found.',
      ],
      footer: 'vitaegis.com/health',
    },
    {
      id: 'H-01.03',
      pillar: 'Health',
      title: 'Try it today',
      lines: ['Ten minutes outside before your first screen.', 'No sunglasses. No phone.'],
      footer: 'vitaegis.com/health',
    },
  ];

  const t0 = Date.now();
  const feed = cardPng(specs[0], 'feed', 0, specs.length);
  await writeFile(`${out}/feed.png`, feed);
  const frames = specs.map((s, i) => cardPng(s, 'reel', i, specs.length));
  await writeFile(`${out}/reel-frame.png`, frames[0]);
  const t1 = Date.now();
  const mp4 = await cardsReel(frames, 3);
  await writeFile(`${out}/reel.mp4`, mp4);
  console.log(
    JSON.stringify({
      out,
      feedBytes: feed.length,
      reelBytes: mp4.length,
      cardsMs: t1 - t0,
      reelMs: Date.now() - t1,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
