import type { Metadata } from 'next';
import Link from 'next/link';
import s from './donate.module.css';
import CopyButton from '@/components/CopyButton';
import PillarLinks from '@/components/PillarLinks';
import { DONATION_RAILS as rails, LIGHTNING_ADDRESS, MONERO_ADDRESS } from '@/lib/donate';

export const metadata: Metadata = {
  title: MONERO_ADDRESS ? 'Donate Bitcoin or Monero | VITAEGIS' : 'Donate Bitcoin | VITAEGIS',
  description: `Support VITAEGIS. Lightning: ${LIGHTNING_ADDRESS}.`,
  openGraph: {
    title: 'Donate Bitcoin | VITAEGIS',
    description: `Lightning: ${LIGHTNING_ADDRESS}`,
    type: 'website',
  },
};

export default function DonatePage() {
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <header>
          <p className={s.kicker}>
            <PillarLinks />
          </p>
          <h1>
            Donate <span>{MONERO_ADDRESS ? 'Bitcoin or Monero' : 'Bitcoin'}</span>
          </h1>
          <p className={s.lede}>
            Fuel the work. Scan with your wallet, or tap the address to open it directly.
          </p>
        </header>

        <div className={s.grid}>
          {rails.map((r) => (
            <section key={r.key} className={s.card}>
              <span className={s.tag} style={{ color: r.color, borderColor: `${r.color}66` }}>
                {r.tag}
              </span>
              <a href={r.uri} className={s.qr} aria-label={`Open ${r.tag} in your wallet`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.qr} alt={`${r.tag} QR code for ${r.value}`} width={264} height={264} />
              </a>
              <a href={r.uri} className={s.addr} style={{ color: r.color }}>
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
