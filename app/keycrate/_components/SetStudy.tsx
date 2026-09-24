'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newId } from '@/lib/keycrate/db';
import { setTransitions, TRANSITION_LABEL } from '@/lib/keycrate/harmonic';
import { buildFromCurve } from '@/lib/keycrate/suggest';
import { matchTracklist, parseTracklist, type LineMatch } from '@/lib/keycrate/tracklist';
import type { Camelot, JourneyCurve, Track } from '@/lib/keycrate/types';
import { formatBpm } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import AuthPanel from './AuthPanel';
import Timeline from './Timeline';
import Wheel from './Wheel';
import { Button, inputClass, KeyBadge, SectionTitle, TRANSITION_COLOR } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   Set Study: paste any tracklist, match it to the crate, read the transitions,
   and rebuild the same shape from your own tracks.
   ═══════════════════════════════════════════════════════════════════════════════ */

const SAMPLE = `0:00 Bonobo – Kerala
4:10 Caribou – Odessa
9:30 Bicep – Glue
13:40 Four Tet – Baby
18:05 Disclosure feat. Sam Smith – Latch (Extended Mix)
23:00 ID – ID
27:15 Peggy Gou – It Goes Like (Nanana)
31:00 Overmono – So U Kno
36:20 Goldie – Inner City Life`;

export default function SetStudy() {
  const { state, actions } = useKeyCrate();
  const router = useRouter();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Untitled study');
  const [matches, setMatches] = useState<LineMatch[] | null>(null);

  const analyse = () => {
    const lines = parseTracklist(text);
    setMatches(matchTracklist(lines, state.tracks));
  };

  const matched = useMemo(() => (matches ?? []).filter((m) => m.track).map((m) => m.track as Track), [matches]);
  const transitions = useMemo(() => setTransitions(matched, state.set.settings), [matched, state.set.settings]);
  const summary = useMemo(() => {
    if (!matches) return null;
    const bpms = matched.map((t) => t.bpm).filter((b): b is number => !!b);
    const dramatic = transitions.map((t, i) => ({ t, i })).filter((x) => x.t.dramatic || x.t.clash);
    const genres: string[] = [];
    matched.forEach((t) => {
      if (t.genre && genres[genres.length - 1] !== t.genre) genres.push(t.genre);
    });
    return {
      counts: {
        matched: matches.filter((m) => m.status === 'matched').length,
        missing: matches.filter((m) => m.status === 'missing').length,
        id: matches.filter((m) => m.status === 'id').length,
      },
      bpmPath: bpms.length ? `${bpms[0]} → ${Math.max(...bpms)} → ${bpms[bpms.length - 1]}` : 'unknown',
      keyPath: matched.map((t) => t.camelot ?? '?').join(' → '),
      dramatic,
      genres,
    };
  }, [matches, matched, transitions]);

  const curveFromStudy = (): JourneyCurve | null => {
    if (matched.length < 2) return null;
    const bpm = matched.map((t) => t.bpm ?? 0);
    const energy = matched.map((t) => t.energy ?? Math.round(5 + ((t.bpm ?? 125) - 125) / 4));
    return { bpm, energy: energy.map((e) => Math.min(10, Math.max(1, e))), length: matched.length };
  };

  const buildSimilar = () => {
    const curve = curveFromStudy();
    if (!curve) return;
    const set = buildFromCurve(state.tracks, curve, { ...state.set.settings, mode: 'journey', journey: curve });
    if (!set.length) {
      actions.toast('Nothing in the crate fits that shape');
      return;
    }
    actions.newSet();
    actions.setName(`Like ${title}`);
    actions.setSettings({ ...state.set.settings, mode: 'journey', journey: curve });
    actions.replaceItems(set.map((t) => ({ trackId: t.id })));
    router.push('/keycrate');
  };

  const path = matched.map((t, i) => ({ key: t.camelot, transition: i > 0 ? transitions[i - 1] : null }));
  const available = new Set(state.tracks.map((t) => t.camelot).filter((k): k is Camelot => !!k));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/keycrate" className="text-xs text-[#808880] hover:text-white">
            ← KeyCrate
          </Link>
          <h1 className="text-2xl font-medium text-white">Set Study</h1>
          <p className="text-xs text-[#808880]">Paste a tracklist in any format. Lines are matched to your library of {state.tracks.length.toLocaleString()} tracks.</p>
        </div>
        <AuthPanel />
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Study title" className={inputClass} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={'0:00 Artist – Title (Remix)\n1. Artist - Title\nw/ Artist - Title [Label]'}
            aria-label="Tracklist"
            className={`${inputClass} min-h-[200px] py-2 font-mono text-sm`}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={analyse} disabled={!text.trim()}>
              Analyse
            </Button>
            <Button onClick={() => setText(SAMPLE)}>Paste a sample</Button>
            <Button
              onClick={() => actions.saveStudy({ id: newId(), title, sourceText: text, createdAt: new Date().toISOString() })}
              disabled={!text.trim()}
            >
              Save study
            </Button>
            <Button onClick={buildSimilar} disabled={matched.length < 2}>
              Build similar from my crate
            </Button>
          </div>
          {state.studies.length > 0 && (
            <details className="text-xs text-[#808880]">
              <summary className="cursor-pointer">Saved studies ({state.studies.length})</summary>
              <ul className="mt-1 flex flex-col gap-1">
                {state.studies.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-white underline"
                      onClick={() => {
                        setTitle(s.title);
                        setText(s.sourceText);
                        setMatches(null);
                      }}
                    >
                      {s.title}
                    </button>
                    <button type="button" onClick={() => actions.deleteStudy(s.id)} aria-label={`Delete ${s.title}`} className="hover:text-[#ff0000]">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div>
          <Wheel path={path} available={available} />
          {matched.length > 0 && <Timeline tracks={matched} className="mt-2" />}
        </div>
      </div>

      {matches && summary && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          <section aria-label="Matched lines">
            <SectionTitle
              right={
                <span className="text-xs">
                  <span className="text-[#00ff00]">{summary.counts.matched} matched</span> · <span className="text-[#808880]">{summary.counts.missing} not in library</span> ·{' '}
                  <span className="text-[#808880]">{summary.counts.id} IDs</span>
                </span>
              }
            >
              Tracklist
            </SectionTitle>
            <ol className="flex flex-col divide-y divide-white/10 rounded-md border border-white/10">
              {matches.map((m, i) => {
                const prevIdx = matched.indexOf(m.track as Track);
                const into = m.track && prevIdx > 0 ? transitions[prevIdx - 1] : null;
                return (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="kc-mono w-12 shrink-0 text-xs text-[#808880]">{m.line.timestamp !== null ? fmtTs(m.line.timestamp) : `${i + 1}.`}</span>
                    {m.status === 'matched' && m.track ? (
                      <>
                        <KeyBadge camelot={m.track.camelot} muted />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-white">
                            {m.track.title} <span className="text-[#808880]">· {m.track.artist}</span>
                          </span>
                          {into && (
                            <span className="block text-xs" style={{ color: TRANSITION_COLOR[into.type] }}>
                              {TRANSITION_LABEL[into.type]}
                              {into.bpmChangePct !== null ? ` · ${into.bpmChangePct >= 0 ? '+' : ''}${into.bpmChangePct.toFixed(1)}% BPM` : ''}
                            </span>
                          )}
                        </span>
                        <span className="kc-mono shrink-0 text-xs text-white">{formatBpm(m.track.bpm)}</span>
                      </>
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-white">
                          {m.line.artist} – {m.line.title}
                          {m.line.remix ? ` (${m.line.remix})` : ''}
                        </span>
                        <span className={`block text-xs ${m.status === 'id' ? 'text-[#808880]' : 'text-[#ff0000]'}`}>{m.status === 'id' ? 'unreleased ID' : 'not in library'}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <aside aria-label="Summary" className="text-sm">
            <SectionTitle>Summary</SectionTitle>
            <dl className="flex flex-col gap-2 text-xs">
              <div>
                <dt className="text-[#808880]">BPM path</dt>
                <dd className="kc-mono text-white">{summary.bpmPath}</dd>
              </div>
              <div>
                <dt className="text-[#808880]">Key path</dt>
                <dd className="kc-mono break-words text-white">{summary.keyPath || '–'}</dd>
              </div>
              <div>
                <dt className="text-[#808880]">Dramatic moves and clashes</dt>
                <dd className="text-white">
                  {summary.dramatic.length === 0
                    ? 'none'
                    : summary.dramatic.map(({ t, i }) => (
                        <span key={i} className="block" style={{ color: TRANSITION_COLOR[t.type] }}>
                          {i + 1} → {i + 2}: {TRANSITION_LABEL[t.type]}
                        </span>
                      ))}
                </dd>
              </div>
              <div>
                <dt className="text-[#808880]">Genre changes</dt>
                <dd className="text-white">{summary.genres.length ? summary.genres.join(' → ') : 'untagged'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}

const fmtTs = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
