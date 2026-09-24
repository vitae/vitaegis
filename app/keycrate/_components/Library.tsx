'use client';

import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { classifyKeys, TRANSITION_LABEL } from '@/lib/keycrate/harmonic';
import { isFiltering } from '@/lib/keycrate/filters';
import { needsAnalysis } from '@/lib/keycrate/merge';
import type { Track } from '@/lib/keycrate/types';
import { formatBpm, formatDuration } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import { Button, inputClass, KeyBadge, SectionTitle, TRANSITION_COLOR } from './ui';
import { PlayButton } from './Audio';

/* ═══════════════════════════════════════════════════════════════════════════════
   Library: search, filters and a virtualized list. Tap a row to append it to the set.
   ═══════════════════════════════════════════════════════════════════════════════ */

const ROW = 56;

export default function Library() {
  const { state, derived, actions } = useKeyCrate();
  const { filters, tracks } = state;
  const { filtered, setTracks, usedIds, genres } = derived;
  const last = setTracks[setTracks.length - 1] ?? null;
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW,
    overscan: 12,
  });

  const untagged = useMemo(() => tracks.filter(needsAnalysis).length, [tracks]);
  const filtering = isFiltering(filters);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Library">
      <SectionTitle
        right={
          <span className="kc-mono text-xs text-[#808880]">
            {filtered.length.toLocaleString()} / {tracks.length.toLocaleString()}
          </span>
        }
      >
        Library
      </SectionTitle>

      <div className="flex gap-2">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => actions.setFilters({ query: e.target.value })}
          placeholder="Search artist, title, label, tag"
          aria-label="Search library"
          className={inputClass}
        />
        <Button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="kc-filters"
          className="shrink-0"
        >
          Filters{filtering ? ' •' : ''}
        </Button>
      </div>

      {showFilters && (
        <div
          id="kc-filters"
          className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-white/10 p-2 text-xs sm:grid-cols-3"
        >
          <label className="flex flex-col gap-1 text-[#808880]">
            BPM min
            <input
              type="number"
              inputMode="decimal"
              value={filters.bpmMin ?? ''}
              onChange={(e) =>
                actions.setFilters({
                  bpmMin: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-[#808880]">
            BPM max
            <input
              type="number"
              inputMode="decimal"
              value={filters.bpmMax ?? ''}
              onChange={(e) =>
                actions.setFilters({
                  bpmMax: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-[#808880]">
            Genre
            <select
              value={Array.from(filters.genres)[0] ?? ''}
              onChange={(e) =>
                actions.setFilters({
                  genres: e.target.value ? new Set([e.target.value]) : new Set(),
                })
              }
              className={inputClass}
            >
              <option value="">Any</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[#808880]">
            Energy at least
            <select
              value={filters.energyMin ?? ''}
              onChange={(e) =>
                actions.setFilters({
                  energyMin: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={inputClass}
            >
              <option value="">Any</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[#808880]">
            Rating at least
            <select
              value={filters.ratingMin ?? ''}
              onChange={(e) =>
                actions.setFilters({
                  ratingMin: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={inputClass}
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={filters.unusedOnly}
                onChange={(e) => actions.setFilters({ unusedOnly: e.target.checked })}
                className="h-4 w-4 accent-[#00ff00]"
              />
              Not in any playlist
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={filters.needsAnalysisOnly}
                onChange={(e) => actions.setFilters({ needsAnalysisOnly: e.target.checked })}
                className="h-4 w-4 accent-[#00ff00]"
              />
              Needs analysis{' '}
              {untagged ? <span className="text-[#ff0000]">({untagged})</span> : null}
            </label>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-3">
            {Array.from(filters.keys).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => actions.toggleKey(k)}
                className="min-h-0 rounded border border-[#00ff00]/60 px-2 py-0.5 text-[#00ff00]"
                aria-label={`Remove key filter ${k}`}
              >
                {k} ×
              </button>
            ))}
            {filtering && (
              <Button size="sm" variant="quiet" onClick={actions.clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}

      {last && (
        <p className="mt-2 text-xs text-[#808880]">
          Mixing out of <span className="text-white">{last.camelot ?? '?'}</span> at{' '}
          <span className="text-white">{formatBpm(last.bpm)}</span>. Left edge shows the move.
        </p>
      )}

      <div
        ref={parentRef}
        className="kc-dense mt-2 min-h-[240px] flex-1 overflow-y-auto rounded-md border border-white/10"
        role="list"
        aria-label="Tracks"
        data-testid="kc-library"
      >
        {tracks.length === 0 ? (
          <p className="p-4 text-sm text-[#808880]">
            Nothing here yet. Import a rekordbox XML or CSV above, or load the sample library.
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-[#808880]">No tracks match these filters.</p>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((v) => {
              const t = filtered[v.index];
              const type = last ? classifyKeys(last.camelot, t.camelot) : null;
              const color = type ? TRANSITION_COLOR[type] : 'transparent';
              return (
                <div
                  key={t.id}
                  role="listitem"
                  className="absolute left-0 top-0 flex w-full items-stretch"
                  style={{ height: v.size, transform: `translateY(${v.start}px)` }}
                >
                  <span className="flex shrink-0 items-center pl-2">
                    <PlayButton track={t} />
                  </span>
                  <button
                    type="button"
                    onClick={() => actions.addTrack(t.id)}
                    className="kc-row flex min-w-0 flex-1 items-center gap-3 px-3 text-left"
                    style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                    aria-label={`Add ${t.artist} – ${t.title}${type ? `, ${TRANSITION_LABEL[type]}` : ''}`}
                    data-testid="kc-track"
                  >
                    <KeyBadge
                      camelot={t.camelot}
                      muted={
                        !!type &&
                        type !== 'same' &&
                        type !== 'fifth' &&
                        type !== 'relative' &&
                        type !== 'diagonal'
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{t.title}</span>
                      <span className="block truncate text-xs text-[#808880]">
                        {t.artist}
                        {t.label ? ` · ${t.label}` : ''}
                        {usedIds.has(t.id) ? ' · in a set' : ''}
                      </span>
                    </span>
                    <span className="kc-mono shrink-0 text-right text-xs text-[#808880]">
                      <span className={`block ${t.bpm ? 'text-white' : 'text-[#ff0000]'}`}>
                        {formatBpm(t.bpm)}
                      </span>
                      <span className="block">{formatDuration(t.durationS)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="flex w-10 shrink-0 items-center justify-center text-xs text-[#808880] hover:text-white"
                    aria-label={`Edit energy and tags for ${t.title}`}
                  >
                    {t.energy ?? '·'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && <TrackEditor track={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function TrackEditor({ track, onClose }: { track: Track; onClose: () => void }) {
  const { actions } = useKeyCrate();
  const [energy, setEnergy] = useState<number>(track.energy ?? 5);
  const [tags, setTags] = useState(track.tags.join(', '));
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${track.title}`}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await actions.updateTrack(track.id, {
            energy,
            tags: tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          });
          onClose();
        }}
        className="w-full max-w-sm rounded-lg border border-white/15 bg-black p-4"
      >
        <p className="truncate text-sm text-white">{track.title}</p>
        <p className="truncate text-xs text-[#808880]">
          {track.artist} · {track.camelot ?? 'no key'} · {formatBpm(track.bpm)}
        </p>
        <label className="mt-4 block text-xs text-[#808880]">
          Energy <span className="text-white">{energy}</span>
          <input
            type="range"
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="mt-3 block text-xs text-[#808880]">
          Tags, comma separated
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={`${inputClass} mt-1`}
            placeholder="opener, peak, closer"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
