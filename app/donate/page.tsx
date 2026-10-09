import type { Metadata } from 'next';
import Link from 'next/link';
import s from './donate.module.css';
import CopyButton from '@/components/CopyButton';
import PillarLinks from '@/components/PillarLinks';
import {
  LIGHTNING_ADDRESS,
  LIGHTNING_QR,
  LIGHTNING_URI,
  ONCHAIN_ADDRESS,
  ONCHAIN_QR,
  ONCHAIN_URI,
} from '@/lib/donate';

export const metadata: Metadata = {
  title: 'Donate Bitcoin | VITAEGIS',
  description: `Support VITAEGIS in bitcoin. Lightning: ${LIGHTNING_ADDRESS}.`,
  openGraph: {
    title: 'Donate Bitcoin | VITAEGIS',
    description: `Lightning: ${LIGHTNING_ADDRESS}`,
    type: 'website',
  },
};

const rails = [
  {
    key: 'lightning',
    tag: '⚡ Lightning',
    note: 'Instant, near-zero fees. Any amount, any Lightning wallet. Best for tips.',
    value: LIGHTNING_ADDRESS,
    uri: LIGHTNING_URI,
    qr: LIGHTNING_QR,
  },
  {
    key: 'onchain',
    tag: '₿ On-chain',
    note: 'Regular bitcoin transaction. Network fees apply. Best for larger amounts.',
    value: ONCHAIN_ADDRESS,
    uri: ONCHAIN_URI,
    qr: ONCHAIN_QR,
  },
];

export default function DonatePage() {
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <header>
          <p className={s.kicker}>
            <PillarLinks />
          </p>
          <h1>
            Donate <span>Bitcoin</span>
          </h1>
          <p className={s.lede}>
            Fuel the work. Scan with any Bitcoin wallet, or tap the address to open your wallet
            directly.
          </p>
        </header>

        <div className={s.grid}>
          {rails.map((r) => (
            <section key={r.key} className={s.card}>
              <span className={s.tag}>{r.tag}</span>
              <a href={r.uri} className={s.qr} aria-label={`Open ${r.tag} in your wallet`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.qr} alt={`${r.tag} QR code for ${r.value}`} width={264} height={264} />
              </a>
              <a href={r.uri} className={s.addr}>
                {r.value}
              </a>
              <CopyButton value={r.value} label="Copy address" className={s.copy} />
              <p className={s.note}>{r.note}</p>
            </section>
          ))}
        </div>

        <p className={s.back}>
          <Link href="/bitcoin">Bitcoin library →</Link>
          <Link href="/">VITAEGIS home →</Link>
        </p>
      </div>
    </main>
  );
}
