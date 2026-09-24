'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { safeFilename, toRekordboxXml } from '@/lib/keycrate/export';
import { TRANSITION_LABEL } from '@/lib/keycrate/harmonic';
import { normalizeName } from '@/lib/keycrate/tracklist';
import type { Track } from '@/lib/keycrate/types';
import { downloadText, formatBpm } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import { PlayButton } from './Audio';
import { KeyBadge, TRANSITION_COLOR } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   Playlist table under the Camelot wheel: song, key and BPM in a fixed grid, with
   up / down / delete per row and a + picker to add songs. It edits the current set,
   so the wheel path, the set panel and undo/redo all stay in step.
   ═══════════════════════════════════════════════════════════════════════════════ */

const MAX_RESULTS = 12;

export default function PlaylistTable() {
  const { state, derived, actions } = useKeyCrate();
  const items = state.set.history.present;
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Rows follow the set's items; a track missing from the library keeps its slot so indexes line up.
  const rows = useMemo(
    () => items.map((it) => derived.trackMap.get(it.trackId) ?? null),
    [items, derived.trackMap],
  );
  const inSet = useMemo(() => new Set(items.map((it) => it.trackId)), [items]);

  // Transition into each row, keyed by track id (derived.transitions skips missing tracks).
  const transitionInto = useMemo(() => {
    const m = new Map<string, (typeof derived.transitions)[number]>();
    derived.setTracks.forEach((t, i) => {
      if (i > 0) m.set(t.id, derived.transitions[i - 1]);
    });
    return m;
  }, [derived]);

  const results = useMemo<{ track: Track; note: string | null }[]>(() => {
    const q = normalizeName(query);
    if (!q) {
      // Nothing typed: the harmonic next-track suggestions, or the library start when the set is empty.
      const sugg = derived.suggestions
        .filter((s) => !inSet.has(s.track.id))
        .map((s) => ({ track: s.track, note: TRANSITION_LABEL[s.transition.type] }));
      if (sugg.length) return sugg.slice(0, MAX_RESULTS);
      return state.tracks
        .filter((t) => !inSet.has(t.id))
        .slice(0, MAX_RESULTS)
        .map((track) => ({ track, note: null }));
    }
    const words = q.split(' ');
    const out: { track: Track; note: string | null }[] = [];
    for (const t of state.tracks) {
      const hay = normalizeName(`${t.artist} ${t.title} ${t.camelot ?? ''} ${t.genre ?? ''}`);
      if (words.every((w) => hay.includes(w))) {
        out.push({ track: t, note: null });
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }, [query, derived.suggestions, state.tracks, inSet]);

  useEffect(() => {
    if (adding) searchRef.current?.focus();
  }, [adding]);

  const noLocation = derived.setTracks.filter((t) => !t.location).length;

  /** A rekordbox XML with this playlist: File → Import → rekordbox xml, or the rekordbox xml pane. */
  const exportRekordbox = () => {
    const name = state.set.name.trim() || 'KeyCrate set';
    downloadText(
      `${safeFilename(name)}.xml`,
      toRekordboxXml(name, derived.setTracks),
      'application/xml',
    );
    actions.toast(
      noLocation
        ? `Exported. ${noLocation} track${noLocation === 1 ? ' has' : 's have'} no file path, so rekordbox will show ${noLocation === 1 ? 'it' : 'them'} as missing.`
        : 'Exported. In rekordbox: Preferences → Advanced → rekordbox xml → pick this file, then drag the playlist in.',
    );
  };

  const closePicker = () => {
    setAdding(false);
    setQuery('');
  };

  return (
    <section aria-label="Playlist" className="kc-dense mt-6 w-full" data-testid="kc-playlist">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-medium text-white">
          Playlist{' '}
          <span className="kc-mono text-xs text-[#808880]">
            {items.length} {items.length === 1 ? 'track' : 'tracks'}
          </span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void actions.saveSet()}
            disabled={!items.length || state.busy !== null}
            className="h-8 rounded-md border border-white/15 px-2.5 text-xs text-white hover:border-white/40 disabled:opacity-40"
            data-testid="kc-playlist-save"
          >
            Save
          </button>
          <button
            type="button"
            onClick={exportRekordbox}
            disabled={!derived.setTracks.length}
            title="Download a rekordbox XML of this playlist"
            className="h-8 rounded-md border border-white/15 px-2.5 text-xs text-white hover:border-white/40 disabled:opacity-40"
            data-testid="kc-playlist-rekordbox"
          >
            rekordbox XML
          </button>
          <button
            type="button"
            onClick={() => (adding ? closePicker() : setAdding(true))}
            aria-expanded={adding}
            aria-controls="kc-playlist-add"
            aria-label={adding ? 'Close add songs' : 'Add songs'}
            title="Add songs"
            className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg leading-none ${
              adding
                ? 'border-[#00ff00] bg-[#00ff00] text-black'
                : 'border-[#00ff00]/60 text-[#00ff00] hover:bg-[#00ff00]/10'
            }`}
          >
            {adding ? '×' : '+'}
          </button>
        </div>
      </div>
      <input
        value={state.set.name}
        onChange={(e) => actions.setName(e.target.value)}
        aria-label="Playlist name"
        placeholder="Playlist name"
        className="mb-2 min-h-[34px] w-full rounded border border-white/15 bg-black px-2 text-base text-white placeholder:text-[#808880] focus:border-[#00ff00] sm:text-sm"
      />

      {adding && (
        <div id="kc-playlist-add" className="mb-2 rounded-md border border-[#00ff00]/40 p-2">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closePicker();
              if (e.key === 'Enter' && results[0]) {
                actions.addTrack(results[0].track.id);
                setQuery('');
              }
            }}
            placeholder={
              state.tracks.length ? 'Search song, artist or key' : 'Import your library first'
            }
            aria-label="Search songs to add"
            className="min-h-[36px] w-full rounded border border-white/15 bg-black px-2 text-base text-white placeholder:text-[#808880] focus:border-[#00ff00] sm:text-sm"
          />
          {!query && results.length > 0 && (
            <p className="mt-1.5 text-[11px] text-[#808880]">
              {derived.suggestions.length
                ? 'Mixes well after the last song:'
                : 'From your library:'}
            </p>
          )}
          <ul className="mt-1 max-h-56 overflow-y-auto" role="listbox" aria-label="Songs to add">
            {results.map(({ track, note }) => (
              <li key={track.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => actions.addTrack(track.id)}
                  className="kc-row grid w-full grid-cols-[1.25rem_minmax(0,1fr)_2.75rem_2.5rem] items-center gap-2 rounded px-1.5 py-1 text-left"
                >
                  <span className="text-[#00ff00]" aria-hidden>
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">{track.title}</span>
                    <span className="block truncate text-[11px] text-[#808880]">
                      {track.artist}
                      {note ? ` · ${note}` : ''}
                    </span>
                  </span>
                  <KeyBadge camelot={track.camelot} muted />
                  <span className="kc-mono text-right text-xs text-white">
                    {formatBpm(track.bpm)}
                  </span>
                </button>
              </li>
            ))}
            {query && results.length === 0 && (
              <li className="px-1.5 py-2 text-xs text-[#808880]">No songs match “{query}”.</li>
            )}
          </ul>
        </div>
      )}

      {/* Fixed grid: column widths are locked so rows never shift as songs move. */}
      <div className="max-h-[420px] overflow-y-auto rounded-md border border-white/15">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-7" />
            <col />
            <col className="w-14" />
            <col className="w-12" />
            <col className="w-[5.75rem]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-black">
            <tr className="border-b border-white/15 text-left text-[11px] uppercase tracking-wider text-[#808880]">
              <th scope="col" className="px-1 py-1.5 font-normal">
                <span className="sr-only">Play</span>
              </th>
              <th scope="col" className="px-1 py-1.5 font-normal">
                #
              </th>
              <th scope="col" className="px-2 py-1.5 font-normal">
                Song
              </th>
              <th scope="col" className="px-1 py-1.5 font-normal">
                Key
              </th>
              <th scope="col" className="px-1 py-1.5 text-right font-normal">
                BPM
              </th>
              <th scope="col" className="px-1 py-1.5 font-normal">
                <span className="sr-only">Move or delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-xs text-[#808880]">
                  No songs yet. Tap <span className="text-[#00ff00]">+</span> to add some.
                </td>
              </tr>
            )}
            {rows.map((t, i) => {
              const into = t ? transitionInto.get(t.id) : undefined;
              const name = t?.title ?? 'Missing track';
              return (
                <tr
                  key={`${items[i].trackId}-${i}`}
                  className="kc-row border-b border-white/[0.08] last:border-b-0"
                >
                  <td className="px-1 py-1.5">
                    <PlayButton track={t} />
                  </td>
                  <td className="kc-mono px-1 py-1.5 text-xs text-[#808880]">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className="block truncate text-white"
                      title={t ? `${t.artist} – ${t.title}` : undefined}
                    >
                      {name}
                    </span>
                    <span className="block truncate text-[11px] text-[#808880]">
                      {t?.artist ?? 'not in this library'}
                      {into && (
                        <span style={{ color: TRANSITION_COLOR[into.type] }}>
                          {' '}
                          · {TRANSITION_LABEL[into.type]}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-1 py-1.5">
                    <KeyBadge camelot={t?.camelot ?? null} muted />
                  </td>
                  <td className="kc-mono px-1 py-1.5 text-right text-xs text-white">
                    {formatBpm(t?.bpm)}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => actions.moveItem(i, i - 1)}
                        disabled={i === 0}
                        aria-label={`Move ${name} up`}
                        className="flex h-7 w-7 items-center justify-center rounded text-[#808880] hover:bg-white/10 hover:text-white disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => actions.moveItem(i, i + 1)}
                        disabled={i === rows.length - 1}
                        aria-label={`Move ${name} down`}
                        className="flex h-7 w-7 items-center justify-center rounded text-[#808880] hover:bg-white/10 hover:text-white disabled:opacity-25"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => actions.removeAt(i)}
                        aria-label={`Delete ${name}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-[#808880] hover:bg-[#ff0000]/10 hover:text-[#ff0000]"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
