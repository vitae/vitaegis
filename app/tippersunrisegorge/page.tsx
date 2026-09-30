import type { Metadata } from 'next';
import Link from 'next/link';
import { DURATION, TRACKS, TRANSITIONS, type SetTrack, type SetTransition } from './data';

const title = 'Tipper · Sunrise at the Gorge | VITAEGIS';
const description =
  'A track-by-track study of Tipper’s Sunrise set at the Gorge (6 July 2025): every key, tempo and transition, and how to mix it yourself.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/tippersunrisegorge' },
  openGraph: { title, description, type: 'article' },
  twitter: { card: 'summary_large_image', title, description },
};

const BANDCAMP = 'https://tipper.bandcamp.com/album/sunrise-at-the-gorge-2';
const NUNU = 'https://nunu.tips/shows';

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Camelot wheel colour: hue walks the wheel; minor (A) darker, major (B) brighter. */
function keyColor(camelot: string): string {
  const n = parseInt(camelot, 10);
  const major = camelot.endsWith('B');
  return `hsl(${((n - 1) * 30 + 90) % 360} ${major ? 90 : 75}% ${major ? 62 : 48}%)`;
}

const TAG_STYLE: Record<string, string> = {
  CUT: 'border-[#FF0000] text-[#FF0000]',
  BLEND: 'border-[#00FF00] text-[#00FF00]',
  ECHO: 'border-[#FF00FF] text-[#FF00FF]',
  HPF: 'border-[#FFFF00] text-[#FFFF00]',
  LPF: 'border-[#FFFF00] text-[#FFFF00]',
  RISER: 'border-[#FFFF00] text-[#FFFF00]',
  REVERB: 'border-[#FF00FF] text-[#FF00FF]',
};
const tagStyle = (t: string) => TAG_STYLE[t.split(' ')[0]] ?? 'border-white/30 text-white/70';

const TAG_NAME: Record<string, string> = {
  'NO SYNC': 'no beatmatch',
  'BASS SWAP': 'bass swap',
  'TEMPO RAMP': 'tempo ramp',
  '½×/2× TEMPO': 'half/double time',
  'HPF in': 'high-pass in',
  'HPF out': 'high-pass out',
  'LPF in': 'low-pass in',
  'LPF out': 'low-pass out',
  REVERB: 'reverb tail',
  RISER: 'riser',
};
const tagName = (t: string) =>
  TAG_NAME[t] ?? t.replace('BLEND', 'blend').replace('CUT', 'cut').replace('ECHO', 'echo');

/* ── Timeline: each track is a bar (x = time, height = tempo, colour = key) ─────────────────── */
function Timeline() {
  const W = 1000;
  const H = 220;
  const top = 20;
  const base = 190;
  const y = (bpm: number) => base - ((Math.min(bpm, 180) - 60) / 120) * (base - top);
  const x = (s: number) => (s / DURATION) * W;
  return (
    <figure className="mt-10">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Set timeline: tempo and key of each track"
      >
        {[60, 90, 120, 150, 180].map((b) => (
          <g key={b}>
            <line x1={0} x2={W} y1={y(b)} y2={y(b)} stroke="#ffffff" strokeOpacity={0.08} />
            <text x={4} y={y(b) - 3} fill="#808880" fontSize={10}>
              {b}
            </text>
          </g>
        ))}
        {TRACKS.map((t) => {
          const bpm = t.bpm ?? 60;
          return (
            <g key={t.pos}>
              <rect
                x={x(t.start) + 1}
                y={y(bpm)}
                width={Math.max(2, x(t.end) - x(t.start) - 2)}
                height={base - y(bpm)}
                fill={keyColor(t.camelot)}
                fillOpacity={t.beatless ? 0.25 : 0.85}
                stroke={keyColor(t.camelot)}
                strokeDasharray={t.beatless ? '3 3' : undefined}
              />
              <text x={x(t.start) + 4} y={y(bpm) - 5} fill="#ffffff" fontSize={11} fontWeight={600}>
                {t.camelot}
              </text>
            </g>
          );
        })}
        {TRANSITIONS.map((tr) => (
          <line
            key={tr.n}
            x1={x(tr.at)}
            x2={x(tr.at)}
            y1={base}
            y2={base + 10}
            stroke={tr.cut ? '#FF0000' : '#00FF00'}
            strokeWidth={2}
          />
        ))}
        {[0, 10, 20, 30, 40, 50, 60].map((m) => (
          <text key={m} x={Math.min(W - 24, x(m * 60))} y={H - 4} fill="#808880" fontSize={10}>
            {m}:00
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 text-xs font-light text-white/50">
        Bar height = measured BPM, colour = Camelot key, dashed = beatless passage. Ticks under the
        bars mark each change: <span className="text-[#00FF00]">green = blend</span>,{' '}
        <span className="text-[#FF0000]">red = cut</span>.
      </figcaption>
    </figure>
  );
}

function Stat({ value, text }: { value: string; text: string }) {
  return (
    <div className="border-l border-[#00FF00]/40 pl-4">
      <div className="text-3xl font-light text-[#00FF00]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{text}</div>
    </div>
  );
}

function TrackRow({ t }: { t: SetTrack }) {
  return (
    <tr className="border-t border-white/10">
      <td className="py-2 pr-3 text-white/40">{t.pos}</td>
      <td className="py-2 pr-3 font-mono text-white/60">{mmss(t.start)}</td>
      <td className="py-2 pr-3">{t.title}</td>
      <td className="py-2 pr-3 whitespace-nowrap">
        <span
          className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
          style={{ background: keyColor(t.camelot) }}
        />
        {t.camelot} <span className="text-white/50">{t.key}</span>
      </td>
      <td className="py-2 text-right font-mono text-white/80">
        {t.beatless ? <span className="text-white/40">beatless</span> : t.bpm}
      </td>
    </tr>
  );
}

function TransitionCard({ tr }: { tr: SetTransition }) {
  return (
    <article id={`t${tr.n}`} className="grid gap-4 py-8 sm:grid-cols-[6rem_1fr]">
      <div className="flex items-baseline gap-3 sm:flex-col sm:gap-1">
        <span className="text-2xl font-light text-[#00FF00]">T{tr.n}</span>
        <span className="font-mono text-sm text-white/50">{mmss(tr.at)}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-xl font-semibold leading-snug">
          {tr.frm} <span className="text-white/40">→</span> {tr.to}
        </h3>
        <p className="mt-1 text-sm font-light text-white/60">
          {tr.keys} · {tr.move} · {tr.tempo || 'tempo n/a'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tr.tags.map((t) => (
            <span
              key={t}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tagStyle(t)}`}
            >
              {tagName(t)}
            </span>
          ))}
        </div>
        <ol className="mt-4 space-y-1.5 text-[15px] font-light leading-relaxed text-white/80">
          {tr.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-xs leading-6 text-[#00FF00]/70">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export default function TipperSunriseGorgePage() {
  const cuts = TRANSITIONS.filter((t) => t.cut).length;
  const halves = TRANSITIONS.filter((t) => t.half).length;
  const clashes = TRANSITIONS.filter((t) => t.move === 'clash').length;
  const smooth = TRANSITIONS.filter((t) => /same|relative|perfect/.test(t.move)).length;
  const blends = TRANSITIONS.filter((t) => !t.cut);
  const longest = blends.reduce((a, b) => (b.secs > a.secs ? b : a), blends[0]);

  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', Arial, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-14">
          <p className={label}>Set study · KeyCrate</p>
          <h1 className="mt-4 text-5xl font-bold uppercase leading-[0.95] tracking-[0.08em] text-[#00FF00] sm:text-7xl">
            Sunrise at the Gorge
          </h1>
          <p className="mt-4 text-lg font-light text-white/70">
            Tipper · The Gorge Amphitheatre, George WA · 6 July 2025 · Night 3, ambient set ·{' '}
            {mmss(DURATION)}
          </p>
          <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-white/90">
            The third night of Tipper &amp; Friends at the Gorge ended at dawn with an hour of
            ambient VIPs: sixteen tracks and fifteen changes. We measured the key and tempo of every
            track and every transition from the audio of the official release, to see how he moves
            an amphitheatre through sunrise without breaking the spell.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={String(TRACKS.length)} text="tracks" />
          <Stat value={`${smooth}/${TRANSITIONS.length}`} text="same key or ±1" />
          <Stat value={String(halves)} text="half/double-time switches" />
          <Stat value={String(cuts)} text="quick cuts" />
        </section>

        <Timeline />

        <section className="mt-16">
          <h2 className="text-3xl font-bold">The write-up</h2>
          <div className="mt-6 max-w-2xl space-y-5 text-lg font-light leading-relaxed text-white/85">
            <p>
              <strong className="font-semibold text-white">
                Two kinds of move, never mixed up.
              </strong>{' '}
              Inside a mood, Tipper blends: keys that sit next to each other on the Camelot wheel,
              tempos within a few percent, and overlaps that run from ten seconds up to{' '}
              {longest ? `${longest.secs} s (${longest.frm} → ${longest.to})` : 'half a minute'}.
              When the mood changes, he switches: a key clash or a minor-third jump, a tempo that
              halves or doubles, and a handover of a few seconds. Of the fifteen changes, {cuts} are
              quick cuts and {halves} are half- or double-time switches.
            </p>
            <p>
              <strong className="font-semibold text-white">Clashes are never naked.</strong> All{' '}
              {clashes} key clashes in the set land on a tempo change or a beatless passage. Apex of
              the Vortex VIP (7A) into Loosies VIP (9B) drops from a 175 BPM double-time groove into
              a beatless wash; Tethers VIP (9A) into Ever Decreasing Circles VIP (5B) halves the
              tempo from 148 to 70. By the time a new key could fight the old one, the old beat has
              already gone.
            </p>
            <p>
              <strong className="font-semibold text-white">The wheel walks in small steps.</strong>{' '}
              The run from Ambergris VIP to Apex of the Vortex VIP moves 7A → 5A → 7A, and the last
              half hour opens and closes on 2B (F♯ major): Flares at Dawn VIP at 34:17, Virga VIP at
              the end. Energy steps (±2 on the wheel) come up four times, twice as often as the
              textbook ±1 move, and three changes jump a minor third.
            </p>
            <p>
              <strong className="font-semibold text-white">Tempo is a texture, not a grid.</strong>{' '}
              The measured tempos swing from about 70 to 175 BPM, but most of that is the same pulse
              felt at half or double speed. Out Of Here VIP (86) into Apex of the Vortex VIP (175)
              doubles it; Ever Decreasing Circles VIP (70) into Virga VIP (136) nearly doubles it
              again, with a riser and a high-pass sweep to carry the last minute of the set.
            </p>
            <p>
              <strong className="font-semibold text-white">Effects stay out of the way.</strong>{' '}
              Echo repeats on the beat or quarter beat as a track leaves, high-pass filters that let
              a new track&apos;s bass in slowly, and bass swaps on the phrase. No wobble of gear for
              its own sake: every effect in this set exists to hide a seam.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">Tracklist</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className={label}>
                  <th className="pb-2 pr-3 font-semibold">#</th>
                  <th className="pb-2 pr-3 font-semibold">Start</th>
                  <th className="pb-2 pr-3 font-semibold">Track</th>
                  <th className="pb-2 pr-3 font-semibold">Key</th>
                  <th className="pb-2 text-right font-semibold">BPM</th>
                </tr>
              </thead>
              <tbody>
                {TRACKS.map((t) => (
                  <TrackRow key={t.pos} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">How to mix it</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="border border-[#00FF00]/30 p-5">
              <h3 className="text-lg font-semibold text-[#00FF00]">Blend · same mood</h3>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 font-light text-white/80">
                <li>Master Tempo (key lock) and Quantize on.</li>
                <li>Start the next track on the phrase, fader down, low EQ cut.</li>
                <li>Bring it up over 10–20 s, opening a high-pass filter if it has one.</li>
                <li>Swap the bass on the downbeat: outgoing low down, incoming low up.</li>
                <li>Fade the outgoing track, with an echo on the way out.</li>
              </ol>
            </div>
            <div className="border border-[#FF0000]/40 p-5">
              <h3 className="text-lg font-semibold text-[#FF0000]">Switch · mood change</h3>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 font-light text-white/80">
                <li>Let the outgoing track finish its phrase.</li>
                <li>Throw an echo (1 beat or ¼ beat) or a reverb tail.</li>
                <li>Pull its fader and drop the next track on the downbeat.</li>
                <li>Don&apos;t beatmatch: the new key and tempo arrive together, in 2–6 s.</li>
                <li>Settle back into a same-key or ±1 move for the next change.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">Every transition</h2>
          <p className="mt-3 max-w-2xl font-light text-white/60">
            Times are on the official release. Steps describe what the audio shows and how to
            recreate it on two decks.
          </p>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {TRANSITIONS.map((tr) => (
              <TransitionCard key={tr.n} tr={tr} />
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-4 text-sm font-light leading-relaxed text-white/60">
          <h2 className="text-xl font-bold text-white">Method and sources</h2>
          <p>
            Keys and tempos were measured from the audio with{' '}
            <Link href="/keycrate" className="text-[#00FF00] underline-offset-4 hover:underline">
              KeyCrate
            </Link>
            : chromagram key detection (Krumhansl profiles) and onset autocorrelation for tempo, per
            track and around each change. Track order comes from the fan archive at{' '}
            <a
              href={NUNU}
              className="text-[#00FF00] underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              nunu.tips
            </a>
            ; start times from a fan-timestamped tracklist, checked against the audio (seven tracks
            were also matched to their studio originals). Effects are inferred from what the audio
            does (filter sweeps, echo repeats, bass dips), not seen on the mixer, so read them as
            likely. Beatless passages have no meaningful tempo. VIPs can differ in key from their
            originals.
          </p>
          <p>
            An independent fan study, not affiliated with Tipper. Get the release on{' '}
            <a
              href={BANDCAMP}
              className="text-[#00FF00] underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Bandcamp
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
