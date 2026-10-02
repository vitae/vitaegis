import type { WatchRow } from '@/lib/crypto/watchlist';
import type { ZoneStatus } from '@/lib/crypto/zones';
import styles from './crypto.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Altcoin watch areas
   One card per coin: price, returns, a 90-day line with the nearest support and
   resistance drawn across it, and a highlight when the price is pressing on a level
   or breaking out of its 30-day range.
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS: Record<ZoneStatus, { label: string; tone: string; hot: boolean }> = {
  breakout: { label: 'Breakout', tone: 'text-black bg-vitae-green', hot: true },
  breakdown: { label: 'Breakdown', tone: 'text-white bg-vitae-red', hot: true },
  'testing-resistance': {
    label: 'At resistance',
    tone: 'text-vitae-green border border-vitae-green',
    hot: true,
  },
  'testing-support': {
    label: 'At support',
    tone: 'text-vitae-red border border-vitae-red',
    hot: true,
  },
  'mid-range': { label: 'Mid-range', tone: 'text-vitae-gray border border-white/20', hot: false },
};

const usd = (n: number) =>
  n >= 1000
    ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : n >= 1
      ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${n.toPrecision(4)}`;

const signed = (n: number | null) =>
  n === null ? '—' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;
const tone = (n: number | null) =>
  n === null ? 'text-vitae-gray' : n >= 0 ? 'text-vitae-green' : 'text-vitae-red';

const W = 300;
const H = 90;

function Spark({ row }: { row: WatchRow }) {
  const s = row.spark;
  if (s.length < 2) return <div className="h-[90px]" />;
  const z = row.zones;
  const bands = [z?.support?.price, z?.resistance?.price].filter(
    (v): v is number => typeof v === 'number',
  );
  let lo = Math.min(...s, ...bands);
  let hi = Math.max(...s, ...bands);
  const pad = (hi - lo) * 0.08 || hi * 0.01;
  lo -= pad;
  hi += pad;
  const x = (i: number) => (i / (s.length - 1)) * W;
  const y = (v: number) => (1 - (v - lo) / (hi - lo)) * H;
  const d = s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const up = s[s.length - 1] >= s[0];
  const band = (v: number, color: string) => {
    // A thin zone, not a hairline: ±1% of the level.
    const top = y(v * 1.01);
    const bottom = y(v * 0.99);
    return (
      <g>
        <rect
          x="0"
          y={top}
          width={W}
          height={Math.max(2, bottom - top)}
          fill={color}
          fillOpacity="0.14"
        />
        <line
          x1="0"
          x2={W}
          y1={y(v)}
          y2={y(v)}
          stroke={color}
          strokeOpacity="0.7"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-[90px] w-full"
      aria-hidden
    >
      {z?.resistance && band(z.resistance.price, '#00ff00')}
      {z?.support && band(z.support.price, '#ff0000')}
      <path
        d={d}
        fill="none"
        stroke={up ? '#00ff00' : '#ff0000'}
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle
        cx={x(s.length - 1)}
        cy={y(s[s.length - 1])}
        r="3"
        fill={up ? '#00ff00' : '#ff0000'}
      />
    </svg>
  );
}

export default function WatchList({ rows }: { rows: WatchRow[] }) {
  const hot = rows.filter((r) => r.zones && STATUS[r.zones.status].hot).length;
  return (
    <section aria-labelledby="watch-heading" className={`mt-14 ${styles.numeric}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="watch-heading" className="text-xl font-medium text-white">
            Watch areas
          </h2>
          <p className="mt-1 text-sm text-vitae-gray">
            {hot
              ? `${hot} of ${rows.length} coins at a level worth watching`
              : 'Nothing pressing on a level right now'}
          </p>
        </div>
        <p className="flex gap-3 text-xs text-vitae-gray">
          <span>
            <span
              className="mr-1 inline-block h-2 w-3 bg-vitae-green/40 align-middle"
              aria-hidden
            />
            resistance
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-3 bg-vitae-red/40 align-middle" aria-hidden />
            support
          </span>
        </p>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const st = r.zones ? STATUS[r.zones.status] : null;
          return (
            <li
              key={r.symbol}
              className={`rounded-xl border p-4 ${
                st?.hot ? `border-vitae-green/60 ${styles.hot}` : 'border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-medium text-white">
                    {r.symbol} <span className="text-sm font-normal text-vitae-gray">{r.name}</span>
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold text-white">
                    {r.price !== null ? usd(r.price) : '—'}
                  </p>
                </div>
                {st && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.tone}`}
                  >
                    {st.label}
                  </span>
                )}
              </div>

              <dl className="mt-2 grid grid-cols-4 gap-1 text-center">
                {(['24h', '7d', '30d', '1y'] as const).map((k) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase text-vitae-gray">{k}</dt>
                    <dd className={`text-sm ${tone(r.change[k])}`}>{signed(r.change[k])}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3">
                <Spark row={r} />
              </div>

              {r.zones ? (
                <>
                  <p className="mt-3 text-sm text-white/80">{r.zones.headline}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <p>
                      <span className="block text-vitae-gray">Resistance</span>
                      {r.zones.resistance ? (
                        <span className="text-vitae-green">
                          {usd(r.zones.resistance.price)} · {signed(r.zones.resistance.distance)}
                          <span className="block text-white/50">{r.zones.resistance.label}</span>
                        </span>
                      ) : (
                        <span className="text-vitae-green">Above every level</span>
                      )}
                    </p>
                    <p>
                      <span className="block text-vitae-gray">Support</span>
                      {r.zones.support ? (
                        <span className="text-vitae-red">
                          {usd(r.zones.support.price)} · {signed(r.zones.support.distance)}
                          <span className="block text-white/50">{r.zones.support.label}</span>
                        </span>
                      ) : (
                        <span className="text-vitae-red">Below every level</span>
                      )}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] text-vitae-gray">
                    Trend{' '}
                    {r.zones.trend === 'up' ? 'up' : r.zones.trend === 'down' ? 'down' : 'mixed'} ·{' '}
                    {r.source === 'chainlink' ? 'price from Chainlink' : 'price from CoinGecko'}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-vitae-gray">Chart data unavailable right now.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
