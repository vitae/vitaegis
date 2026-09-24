import type { Track } from '@/lib/keycrate/types';

/* Two small lines under the set: BPM (green) and energy (gray) across the tracks. */

const W = 320;
const H = 72;
const PAD = 6;

function line(values: Array<number | null>, min: number, max: number): string {
  const n = values.length;
  const pts: string[] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    const x = n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / Math.max(max - min, 1)) * (H - PAD * 2);
    pts.push(`${pts.length ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
  });
  return pts.join(' ');
}

export default function Timeline({ tracks, className = '' }: { tracks: Track[]; className?: string }) {
  if (tracks.length === 0) return null;
  const bpms = tracks.map((t) => (t.bpm ? t.bpm : null));
  const energies = tracks.map((t) => t.energy);
  const known = bpms.filter((b): b is number => b !== null);
  const bmin = known.length ? Math.min(...known) - 2 : 0;
  const bmax = known.length ? Math.max(...known) + 2 : 1;
  const hasEnergy = energies.some((e) => e !== null);
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="BPM and energy across the set">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.12)" />
        <path d={line(bpms, bmin, bmax)} fill="none" stroke="#00ff00" strokeWidth={1.5} strokeLinejoin="round" />
        {hasEnergy && <path d={line(energies, 1, 10)} fill="none" stroke="#808880" strokeWidth={1.5} strokeDasharray="3 3" strokeLinejoin="round" />}
      </svg>
      <figcaption className="kc-mono flex justify-between text-[11px] text-[#808880]">
        <span>
          <span className="text-[#00ff00]">—</span> BPM {known.length ? `${Math.min(...known)}–${Math.max(...known)}` : '(none)'}
        </span>
        <span>
          <span>- -</span> energy {hasEnergy ? '1–10' : '(unrated)'}
        </span>
      </figcaption>
    </figure>
  );
}
