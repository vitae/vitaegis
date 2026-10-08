import type { Metadata } from 'next';
import Link from 'next/link';
import s from './bitcoin.module.css';
import HalvingClock from './HalvingClock';

export const metadata: Metadata = {
  title: 'Bitcoin | VITAEGIS WEALTH',
  description:
    'Primary sources on Bitcoin, starting with the 2008 whitepaper: the protocol, its economics and its security model, broken down section by section.',
  openGraph: {
    title: 'Bitcoin | VITAEGIS WEALTH',
    description: 'The Bitcoin whitepaper, broken down section by section.',
    type: 'article',
  },
};

const mechanics: { name: string; text: string }[] = [
  {
    name: 'Coin',
    text: "A chain of digital signatures. Each owner signs a hash of the previous transaction plus the next owner's public key.",
  },
  {
    name: 'Timestamp chain',
    text: "Each block's hash includes the previous block's hash, so every new block reinforces the ones before it.",
  },
  {
    name: 'Proof-of-work',
    text: 'Hashcash-style. Increment a nonce until the SHA-256 block hash starts with enough zero bits. One CPU, one vote.',
  },
  {
    name: 'Longest chain',
    text: 'Nodes treat the chain with the most work as correct. Ties resolve when the next block lands.',
  },
  {
    name: 'Incentive',
    text: 'The first transaction in each block mints new coins for its creator, later replaced by transaction fees.',
  },
  {
    name: 'Merkle tree',
    text: 'Transactions hash into a single root, so spent history can be pruned without breaking the block hash.',
  },
];

const sections: { no: string; text: string }[] = [
  {
    no: '§1 · Introduction',
    text: "Trust-based payments are reversible and costly. What's needed is payment based on cryptographic proof.",
  },
  {
    no: '§2 · Transactions',
    text: 'Coins as signature chains. Preventing double-spends without a mint requires a public, agreed transaction order.',
  },
  {
    no: '§3 · Timestamp server',
    text: 'Hash a block of items, publish the hash, and chain each timestamp to the last.',
  },
  {
    no: '§4 · Proof-of-work',
    text: 'Work makes blocks costly to change. Difficulty adjusts to keep a target block rate.',
  },
  {
    no: '§5 · Network',
    text: 'The six steps nodes follow, from broadcasting transactions to building on the accepted block.',
  },
  {
    no: '§6 · Incentive',
    text: 'Block rewards distribute coins and make playing by the rules pay better than attacking.',
  },
  {
    no: '§7 · Reclaiming disk space',
    text: 'Merkle pruning. Headers alone run about 4.2 MB a year.',
  },
  {
    no: '§8 · Simplified payment verification',
    text: "Light clients keep only headers and check a transaction's Merkle branch.",
  },
  {
    no: '§9 · Combining and splitting value',
    text: 'Multiple inputs and outputs, usually one payment output and one change output.',
  },
  {
    no: '§10 · Privacy',
    text: 'Transactions are public but keys are anonymous, like a stock tape. Use a new key pair for each transaction.',
  },
  {
    no: '§11 · Calculations',
    text: "An attacker catching up is a Gambler's Ruin problem. The odds fall exponentially with each confirmation.",
  },
  {
    no: '§12 · Conclusion',
    text: 'Nodes vote with CPU power. Rules and incentives are enforced by that consensus.',
  },
];

const stats: { value: string; label: string }[] = [
  { value: '10 min', label: 'assumed block interval' },
  { value: '80 B', label: 'block header, no transactions' },
  { value: '4.2 MB', label: 'headers per year' },
  { value: '6', label: 'steps to run the network' },
];

const confirmations: { q: string; z: number }[] = [
  { q: '10%', z: 5 },
  { q: '15%', z: 8 },
  { q: '20%', z: 11 },
  { q: '25%', z: 15 },
  { q: '30%', z: 24 },
  { q: '35%', z: 41 },
  { q: '40%', z: 89 },
  { q: '45%', z: 340 },
];

const references = [
  'W. Dai, "b-money," 1998',
  'H. Massias, X.S. Avila, J.-J. Quisquater, secure timestamping with minimal trust, 1999',
  'S. Haber, W.S. Stornetta, "How to time-stamp a digital document," J. Cryptology, 1991',
  'D. Bayer, S. Haber, W.S. Stornetta, improving digital time-stamping, 1993',
  'S. Haber, W.S. Stornetta, "Secure names for bit-strings," ACM CCS, 1997',
  'A. Back, "Hashcash: a denial of service counter-measure," 2002',
  'R.C. Merkle, "Protocols for public key cryptosystems," IEEE S&P, 1980',
  'W. Feller, An Introduction to Probability Theory and Its Applications, 1957',
];

const cycles: {
  halving: string;
  peak: string;
  toPeak: string;
  top: string;
  bottom: string;
  drawdown: string;
}[] = [
  {
    halving: '28 Nov 2012',
    peak: 'Dec 2013',
    toPeak: '~371',
    top: '~$1,150',
    bottom: 'Jan 2015 · ~$150',
    drawdown: '−87%',
  },
  {
    halving: '9 Jul 2016',
    peak: '17 Dec 2017',
    toPeak: '~525',
    top: '~$19,700',
    bottom: 'Dec 2018 · $3,122',
    drawdown: '−84%',
  },
  {
    halving: '11 May 2020',
    peak: '10 Nov 2021',
    toPeak: '~547',
    top: '~$69,000',
    bottom: 'Nov 2022 · $15,476',
    drawdown: '−78%',
  },
  {
    halving: '20 Apr 2024',
    peak: '6 Oct 2025',
    toPeak: '~534',
    top: '$126,198',
    bottom: 'Low so far: 5 Jun 2026 · ~$59,100',
    drawdown: '−53% so far',
  },
];

const watch: { date: string; what: string }[] = [
  {
    date: 'Oct – Nov 2026',
    what: 'Pattern bottom window. Past bears bottomed 364–406 days after the peak, which puts this one between about 5 Oct and 16 Nov 2026.',
  },
  {
    date: '~Apr 2028',
    what: 'Fifth halving at block 1,050,000. Block reward drops from 3.125 to 1.5625 BTC.',
  },
  {
    date: '~Sep – Oct 2029',
    what: 'Pattern peak window. The last three peaks came 525–547 days after their halving.',
  },
  {
    date: '$200,000',
    what: 'Needs about 1.6× the $126k high. Each peak has beaten the last by less: about 17×, then 3.5×, then 1.8×. If that keeps shrinking, $200k lands at the very top of the 2029 peak, or not at all this cycle.',
  },
];

const trackers: { href: string; label: string; what: string }[] = [
  {
    href: 'https://www.bitcoinmagazinepro.com/charts/',
    label: 'Bitcoin Magazine Pro',
    what: 'Halving-cycle overlays, Pi Cycle Top, MVRV Z-Score, 200-week MA. Formerly LookIntoBitcoin.',
  },
  {
    href: 'https://charts.bitbo.io/',
    label: 'Bitbo Charts',
    what: 'Cycle repeat and halving progress charts, plus a halving countdown.',
  },
  {
    href: 'https://www.blockchaincenter.net/en/bitcoin-rainbow-chart/',
    label: 'Rainbow Chart',
    what: 'Log-regression bands showing where price sits in the cycle.',
  },
  {
    href: 'https://alternative.me/crypto/fear-and-greed-index/',
    label: 'Fear & Greed Index',
    what: 'Daily sentiment score. Extreme fear has marked past dips.',
  },
  {
    href: 'https://mempool.space/',
    label: 'mempool.space',
    what: 'Live block height and the halving progress used for the countdown above.',
  },
];

const links: { href: string; label: string }[] = [
  { href: 'https://bitcoin.org/bitcoin.pdf', label: 'Read the PDF' },
  { href: 'http://www.weidai.com/bmoney.txt', label: 'b-money · 1998' },
  { href: 'http://www.hashcash.org/papers/hashcash.pdf', label: 'Hashcash · 2002' },
];

export default function BitcoinPage() {
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <Link href="/" className={s.back}>
          ← Vitaegis
        </Link>

        <header className={s.header}>
          <div className={s.brand}>
            <b>VITAEGIS</b>
            <span>
              Health · Stealth · <span className={s.wealth}>Wealth</span>
            </span>
          </div>
          <h1>
            Bit<span>coin</span>
          </h1>
          <p className={s.lede}>
            Primary sources on Bitcoin: the protocol, its economics and its security model, with the
            key mechanics and numbers pulled out of each paper.
          </p>
          <span className={s.count}>Cycle tracker + 1 entry · updated 2026-10-08</span>
        </header>

        <article className={s.entry} id="cycle">
          <div className={s.entryHead}>
            <div className={s.tags}>
              <span className={s.tagAlt}>Cycle tracker</span>
              <span className={s.tag}>Halvings</span>
              <span className={s.tag}>Bull · Dip</span>
            </div>
            <h2>Halving clock and the four-year cycle</h2>
            <div className={s.meta}>
              <span>Price on 8 Oct 2026: ~$82,600</span>
              <span>All-time high: $126,198 · 6 Oct 2025</span>
              <span>~35% below the high</span>
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Next halving · live</span>
            <HalvingClock />
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>What to watch</span>
            <div className={s.chain}>
              {watch.map((w) => (
                <div key={w.date} className={s.block}>
                  <span className={s.no}>{w.date}</span>
                  <p>{w.what}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Past cycles</span>
            <div className={s.tablewrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Halving</th>
                    <th>Peak</th>
                    <th>Days to peak</th>
                    <th>Peak price</th>
                    <th>Bear bottom</th>
                    <th>Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => (
                    <tr key={c.halving}>
                      <td>{c.halving}</td>
                      <td>{c.peak}</td>
                      <td className={s.warn}>{c.toPeak}</td>
                      <td className={s.good}>{c.top}</td>
                      <td>{c.bottom}</td>
                      <td className={s.warn}>{c.drawdown}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={s.note}>
            <b>Pattern, not a promise</b>
            Four cycles is a small sample, and the 2024 cycle already broke the mold: Bitcoin set a
            new high before its halving, thanks to the spot ETFs. The dates above are where the old
            pattern points, not a forecast. Not financial advice.
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Sites that track the cycle</span>
            <div className={s.grid2}>
              {trackers.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.card}
                >
                  <span className={s.who}>{t.label} ↗</span>
                  <p>{t.what}</p>
                </a>
              ))}
            </div>
          </div>
        </article>

        <article className={s.entry} id="whitepaper">
          <div className={s.entryHead}>
            <div className={s.tags}>
              <span className={s.tagAlt}>Whitepaper</span>
              <span className={s.tag}>Protocol</span>
              <span className={s.tag}>Primary source</span>
            </div>
            <h2>Bitcoin: A Peer-to-Peer Electronic Cash System</h2>
            <div className={s.meta}>
              <span>Satoshi Nakamoto</span>
              <span>bitcoin.org</span>
              <span>31 Oct 2008</span>
              <span>9 pages · 12 sections · 8 references</span>
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>The problem it solves</span>
            <div className={s.prose}>
              <p>
                Online payments depend on banks and processors acting as trusted third parties. That
                makes payments reversible, which pushes up costs, kills small transactions, and
                forces merchants to collect more information and accept some fraud. Digital
                signatures can prove who owns a coin, but without a central mint nobody can stop the
                same coin being spent twice.
              </p>
              <p>
                <strong>The proposal:</strong> a peer-to-peer network that timestamps transactions
                into a chain of hash-based proof-of-work. The chain with the most work behind it is
                both the record of what happened and proof that the largest pool of CPU power agreed
                to it. The system stays secure as long as honest nodes control more CPU power than
                any group of cooperating attackers.
              </p>
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Core mechanics</span>
            <div className={s.mech}>
              {mechanics.map((m) => (
                <div key={m.name}>
                  <b>{m.name}</b>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Section by section</span>
            <div className={s.chain}>
              {sections.map((b) => (
                <div key={b.no} className={s.block}>
                  <span className={s.no}>{b.no}</span>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>Numbers in the paper</span>
            <div className={s.stat}>
              {stats.map((st) => (
                <div key={st.label}>
                  <b>{st.value}</b>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>How many confirmations? (§11)</span>
            <div className={s.prose}>
              <p>
                Confirmations (z) a recipient should wait for an attacker&apos;s chance of rewriting
                the payment to fall below <strong>0.1%</strong>, by the attacker&apos;s share of
                network hash power (q). Results from the paper&apos;s own C code.
              </p>
            </div>
            <div className={s.tablewrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Attacker hash share (q)</th>
                    <th>Confirmations needed (z)</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmations.map((c) => (
                    <tr key={c.q}>
                      <td>{c.q}</td>
                      <td className={c.z <= 15 ? s.good : s.warn}>{c.z}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.grid2}>
              <div className={s.card}>
                <span className={s.who}>Attacker with 10% of hash power</span>
                <p>
                  Success chance drops from 20.5% at 1 confirmation to 0.09% at 5 and about 0.0001%
                  at 10.
                </p>
              </div>
              <div className={s.card}>
                <span className={s.who}>Attacker with 30% of hash power</span>
                <p>
                  Still 17.7% at 5 confirmations and 4.2% at 10. It takes about 24 to get under
                  0.1%.
                </p>
              </div>
            </div>
          </div>

          <div className={s.note}>
            <b>Reading notes</b>
            The paper never uses the word &ldquo;blockchain&rdquo;; it says &ldquo;chain of
            blocks.&rdquo; The 10-minute interval and the moving-average difficulty target are
            stated as assumptions here, and the fixed 21 million supply and halving schedule are not
            in the paper at all; they came with the software released in January 2009. The SPV alert
            idea in §8 was never built as described. The 2008 storage estimate assumed 2 GB of RAM
            in a typical computer.
          </div>

          <div className={s.section}>
            <span className={s.eyebrow}>What it builds on · references</span>
            <ol className={s.refs}>
              {references.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </div>

          <div className={s.links}>
            {links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </div>

          <p className={s.cite}>
            Nakamoto S. Bitcoin: A Peer-to-Peer Electronic Cash System. 2008.
            https://bitcoin.org/bitcoin.pdf. Summary and figures taken from the PDF at that address.
          </p>
        </article>

        <footer className={s.footer}>
          <span>Vitaegis · Wealth library</span>
          <span>Bitcoin</span>
        </footer>
      </div>
    </main>
  );
}
