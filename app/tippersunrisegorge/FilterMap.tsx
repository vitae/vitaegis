import { DURATION, TRACKS } from './data';
import { FILTER_MOVES, KNOB, type FilterMove } from './filters';

const GREEN = '#00FF00';
const MAGENTA = '#FF00FF';
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Knob pointer angle: 0 = centre (12 o'clock), + right, − left, ±135 = fully turned. */
function angle(m: FilterMove): number {
  if (m.side === 'right') return Math.min(135, (135 * Math.log(m.hz / 30)) / Math.log(1000 / 30));
  return -Math.min(135, (135 * Math.log(11000 / m.hz)) / Math.log(11000 / 500));
}

function Dial({ move }: { move: FilterMove }) {
  const a = angle(move);
  const col = move.side === 'right' ? GREEN : MAGENTA;
  const pt = (deg: number, r: number) => [
    40 + r * Math.sin((deg * Math.PI) / 180),
    40 - r * Math.cos((deg * Math.PI) / 180),
  ];
  const [sx, sy] = pt(0, 34);
  const [ex, ey] = pt(a, 34);
  const [px, py] = pt(a, 24);
  const [ax0, ay0] = pt(-135, 34);
  const [ax1, ay1] = pt(135, 34);
  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0" aria-hidden="true">
      <path
        d={`M${ax0},${ay0} A34,34 0 1 1 ${ax1},${ay1}`}
        fill="none"
        stroke="#333"
        strokeWidth={5}
      />
      <path
        d={`M${sx},${sy} A34,34 0 0 ${a > 0 ? 1 : 0} ${ex},${ey}`}
        fill="none"
        stroke={col}
        strokeWidth={5}
      />
      <circle cx={40} cy={40} r={20} fill="#111" stroke="#555" />
      <line x1={40} y1={40} x2={px} y2={py} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <line x1={40} y1={2} x2={40} y2={9} stroke="#808880" strokeWidth={2} />
    </svg>
  );
}

function describe(m: FilterMove): string {
  const side = m.side.toUpperCase();
  if (m.shape === 'turn and return')
    return `Turn ${side} to ~${m.hz} Hz, then back to centre by ${mmss(m.end)}`;
  if (m.shape === 'turn') return `Turn ${side} to ~${m.hz} Hz by ${mmss(m.end)}`;
  return `Already turned ${m.side} (~${m.hz} Hz); back to centre by ${mmss(m.end)}`;
}

function KnobTimeline() {
  const W = 1000;
  const H = 200;
  const MID = 100;
  const x = (s: number) => (s / DURATION) * W;
  const points = KNOB.map(([t, k]) => `${x(t).toFixed(1)},${(MID - k * 80).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 28}`}
      className="mt-6 h-auto w-full"
      role="img"
      aria-label="Filter knob position over the set"
    >
      {TRACKS.map((t) => (
        <g key={t.pos}>
          <line
            x1={x(t.start)}
            x2={x(t.start)}
            y1={10}
            y2={H - 10}
            stroke="#fff"
            strokeOpacity={0.12}
          />
          <text x={x(t.start) + 3} y={H + 4} fill="#808880" fontSize={9}>
            {t.pos}
          </text>
        </g>
      ))}
      {FILTER_MOVES.map((m) => (
        <rect
          key={`${m.side}-${m.start}`}
          x={x(m.start)}
          y={m.side === 'right' ? 20 : MID}
          width={Math.max(3, x(m.end) - x(m.start))}
          height={MID - 20}
          fill={m.side === 'right' ? GREEN : MAGENTA}
          fillOpacity={m.dj ? 0.3 : 0.1}
        />
      ))}
      <line x1={0} x2={W} y1={MID} y2={MID} stroke="#fff" strokeOpacity={0.35} />
      <polyline points={points} fill="none" stroke="#fff" strokeWidth={1.2} />
      <text x={4} y={16} fill={GREEN} fontSize={11}>
        RIGHT · high-pass (thin)
      </text>
      <text x={4} y={H - 6} fill={MAGENTA} fontSize={11}>
        LEFT · low-pass (muffled)
      </text>
      {[0, 10, 20, 30, 40, 50, 60].map((m) => (
        <text key={m} x={Math.min(W - 24, x(m * 60))} y={H + 22} fill="#808880" fontSize={10}>
          {m}:00
        </text>
      ))}
    </svg>
  );
}

export default function FilterMap() {
  const dj = FILTER_MOVES.filter((m) => m.dj);
  const rest = FILTER_MOVES.filter((m) => !m.dj);
  const right = dj.filter((m) => m.side === 'right').length;
  return (
    <section className="mt-16" id="filter">
      <h2 className="text-3xl font-bold">The filter knob</h2>
      <p className="mt-3 max-w-2xl text-lg font-light leading-relaxed text-white/80">
        Where the filter moves and which way the knob turns.{' '}
        <span className="text-[#00FF00]">Right</span> is a high-pass: the bass drains out and the
        sound goes thin. <span className="text-[#FF00FF]">Left</span> is a low-pass: the top end
        goes and the sound gets muffled. At the track changes he turns right {right} times out of{' '}
        {dj.length}, usually to around 200–500 Hz, then brings the knob slowly back to centre over
        10–60 s so the next track&apos;s bass creeps in.
      </p>
      <KnobTimeline />
      <p className="mt-2 text-xs font-light text-white/50">
        White line = estimated knob position; numbers = tracks. Bright bands sit at a track change
        (likely his hand); faint bands are mid-track and may be the production itself.
      </p>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
        {dj.length} moves at the track changes
      </h3>
      <div className="mt-2 divide-y divide-white/10 border-y border-white/10">
        {dj.map((m) => (
          <div key={`${m.side}-${m.start}`} className="flex items-center gap-4 py-3">
            <Dial move={m} />
            <div className="min-w-0">
              <div className="text-lg font-semibold">
                {mmss(m.start)}{' '}
                <span className="text-[15px] font-light text-white/50">{m.track}</span>
              </div>
              <div className="font-light" style={{ color: m.side === 'right' ? GREEN : MAGENTA }}>
                {describe(m)}
              </div>
              <div className="text-sm font-light text-white/50">
                {m.near}{' '}
                {Math.abs(m.dist) <= 5
                  ? 'at the change'
                  : `${Math.abs(m.dist)} s ${m.dist < 0 ? 'before' : 'after'} the change`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <details className="mt-6 text-white/60">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em]">
          {rest.length} mid-track moves (may be the tracks themselves)
        </summary>
        <ul className="mt-3 space-y-1 text-sm font-light">
          {rest.map((m) => (
            <li key={`${m.side}-${m.start}`}>
              <span className="font-mono text-white/50">{mmss(m.start)}</span> {m.track}:{' '}
              <span style={{ color: m.side === 'right' ? GREEN : MAGENTA }}>{describe(m)}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-4 text-xs font-light text-white/40">
        Read from the audio: a filter built into a track sounds the same as one on the mixer, so
        treat these as likely moves.
      </p>
    </section>
  );
}
