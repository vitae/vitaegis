import { TRANSITIONS, type SetTransition } from './data';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

type Mode = 'sync' | 'free' | 'beatless';

/**
 * Sync only when the two grooves can actually lock: tempos within ~8% and a beat on both sides.
 * Half/double-time jumps and big tempo changes are dropped by ear on a downbeat; beatless passages
 * have nothing to lock to.
 */
function plan(t: SetTransition): { mode: Mode; what: string } {
  if (t.tags.includes('NO SYNC'))
    return {
      mode: 'beatless',
      what: 'Sync off. One side is beatless, so there is nothing to lock to: ride the faders by ear.',
    };
  if (t.half)
    return {
      mode: 'free',
      what: `Sync off. Half/double-time jump (${t.tempo.split(' (')[0]}): sync would drag the new track to the wrong speed. Drop it on a downbeat and let the new groove take over.`,
    };
  if (Math.abs(t.pct) <= 8)
    return {
      mode: 'sync',
      what: `Press BEAT SYNC on the incoming deck before you start it${t.cut ? ', then cut on the downbeat' : ` at ${mmss(t.start)}; keep it on until the blend is done (${mmss(t.end)})`}.`,
    };
  return {
    mode: 'free',
    what: `Sync off. The tempo jumps ${t.pct > 0 ? '+' : ''}${t.pct}%, too far to beatmatch: change on a downbeat${t.cut ? '' : ' and keep the overlap atmospheric'}.`,
  };
}

const STYLE: Record<Mode, { label: string; cls: string }> = {
  sync: { label: 'SYNC ON', cls: 'border-[#00FF00] bg-[#00FF00] text-black' },
  free: { label: 'SYNC OFF', cls: 'border-[#FF0000] text-[#FF0000]' },
  beatless: { label: 'NO BEAT', cls: 'border-white/40 text-white/70' },
};

export default function SyncPlan() {
  const rows = TRANSITIONS.map((t) => ({ t, ...plan(t) }));
  const on = rows.filter((r) => r.mode === 'sync').length;
  return (
    <section className="mt-16" id="sync">
      <h2 className="text-3xl font-bold">Beat sync, change by change</h2>
      <p className="mt-3 max-w-2xl text-lg font-light leading-relaxed text-white/80">
        Only {on} of the {rows.length} changes{' '}
        {on === 1 ? 'is a true beatmatch' : 'are true beatmatches'}. The rest are half/double-time
        jumps, big tempo moves or beatless passages, where sync would pull the new track to the
        wrong speed. Keep Master Tempo (key lock) on throughout.
      </p>
      <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
        {rows.map(({ t, mode, what }) => (
          <div key={t.n} className="grid gap-2 py-3 sm:grid-cols-[4rem_7rem_1fr] sm:items-center">
            <a href={`#t${t.n}`} className="font-mono text-sm text-white/50 hover:text-white">
              T{t.n} · {mmss(t.at)}
            </a>
            <span
              className={`w-fit rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.15em] ${STYLE[mode].cls}`}
            >
              {STYLE[mode].label}
            </span>
            <div className="min-w-0">
              <div className="font-semibold">
                {t.frm} <span className="text-white/40">→</span> {t.to}
              </div>
              <div className="text-sm font-light text-white/70">{what}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
