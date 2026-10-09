// Regenerate the donation QR codes in public/donate/ from the addresses in lib/donate.ts:
//   npx tsx scripts/donate-qr.ts
// Black modules on the rail's colour (Bitcoin orange, Monero orange), with a quiet zone, as
// SVG so they stay crisp at any size. Run it whenever an address in lib/donate.ts changes.
import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import {
  BITCOIN_ORANGE,
  LIGHTNING_URI,
  MONERO_ADDRESS,
  MONERO_ORANGE,
  MONERO_URI,
  ONCHAIN_URI,
} from '../lib/donate';

async function main() {
  await mkdir('public/donate', { recursive: true });
  const jobs: { file: string; text: string; light: string; title: string }[] = [
    { file: 'lightning.svg', text: LIGHTNING_URI, light: BITCOIN_ORANGE, title: 'lightning' },
    { file: 'onchain.svg', text: ONCHAIN_URI, light: BITCOIN_ORANGE, title: 'on-chain bitcoin' },
  ];
  if (MONERO_ADDRESS)
    jobs.push({ file: 'monero.svg', text: MONERO_URI, light: MONERO_ORANGE, title: 'Monero' });
  for (const j of jobs) {
    const svg = await QRCode.toString(j.text, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 3,
      color: { dark: '#000000', light: j.light },
    });
    const titled = svg.replace('<svg ', `<svg data-title="VITAEGIS ${j.title} donation QR" `);
    await writeFile(`public/donate/${j.file}`, titled);
    console.log('wrote public/donate/' + j.file, j.text);
  }
  if (!MONERO_ADDRESS) console.log('MONERO_ADDRESS is empty: no monero.svg written');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
