'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Camelot } from '@/lib/keycrate/types';
import { useKeyCrate } from '../_state/store';
import { AudioSources } from './Audio';
import AuthPanel from './AuthPanel';
import ImportPanel from './ImportPanel';
import PlaylistTable from './PlaylistTable';
import Library from './Library';
import SetPanel from './SetPanel';
import Wheel from './Wheel';
import { Button } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   Main screen. Desktop: library | wheel | set. Mobile: library and wheel stack,
   the set lives in a bottom sheet.
   ═══════════════════════════════════════════════════════════════════════════════ */

/** True at the lg breakpoint and up; false until mounted so the server renders one set panel at most. */
function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

export default function KeyCrateApp() {
  const { state, derived, actions } = useKeyCrate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const desktop = useDesktop();
  const items = state.set.history.present;

  const available = useMemo(
    () => new Set(state.tracks.map((t) => t.camelot).filter((k): k is Camelot => !!k)),
    [state.tracks],
  );
  const path = useMemo(
    () =>
      derived.setTracks.map((t, i) => ({
        key: t.camelot,
        transition: i > 0 ? derived.transitions[i - 1] : null,
      })),
    [derived.setTracks, derived.transitions],
  );

  // Escape closes the sheet.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  return (
    <div
      className="relative mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:pb-6"
      // Drop a rekordbox XML, Traktor NML or CSV anywhere on the page to import it.
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        if (!state.importing) void actions.importFile(e.dataTransfer.files[0]);
      }}
    >
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-2 border-dashed border-[#00ff00] bg-black/80 text-lg text-[#00ff00]"
        >
          Drop your rekordbox XML, Traktor NML or CSV to import
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-[#808880] hover:text-white">
            ← Vitaegis
          </Link>
          <h1 className="text-2xl font-medium text-white">KeyCrate</h1>
          <p className="text-xs text-[#808880]">Harmonic set builder for your rekordbox library.</p>
        </div>
        <nav className="flex items-center gap-2 text-sm" aria-label="KeyCrate pages">
          <Link
            href="/keycrate/study"
            className="rounded-md border border-white/15 px-3 py-2 hover:border-white/40"
          >
            Set Study
          </Link>
        </nav>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <ImportPanel />
        <AuthPanel />
      </div>
      <div className="mt-2">
        <AudioSources />
      </div>

      {state.storageError && (
        <p
          role="alert"
          data-testid="kc-storage-error"
          className="mt-3 rounded-md border border-[#ff0000]/60 px-3 py-2 text-sm text-[#ff0000]"
        >
          Couldn&apos;t open on-device storage. {state.storageError}
        </p>
      )}

      {!state.ready ? (
        <p className="mt-6 text-sm text-[#808880]">Opening your crate…</p>
      ) : (
        <div className="mt-4 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_400px_minmax(0,1.1fr)] lg:gap-8">
          <div className="min-h-[60vh] lg:h-[calc(100vh-var(--nav-top)-220px)] lg:min-h-[520px]">
            <Library />
          </div>

          <div className="flex flex-col items-center">
            <h2 className="mb-2 self-start text-base font-medium">Camelot wheel</h2>
            <Wheel
              selected={state.filters.keys}
              onToggle={actions.toggleKey}
              path={path}
              available={available}
            />
            <p className="mt-2 text-center text-xs text-[#808880]">
              Outer ring major (B), inner ring minor (A). Neighbours mix; the set&apos;s path is
              drawn on top.
            </p>
            {state.filters.keys.size > 0 && (
              <Button
                size="sm"
                variant="quiet"
                onClick={() => actions.setFilters({ keys: new Set() })}
                className="mt-1"
              >
                Clear key filter
              </Button>
            )}
            <PlaylistTable />
          </div>

          {/* The set panel is mounted once: here on desktop, in the sheet on mobile. */}
          <div className="hidden lg:block lg:h-[calc(100vh-var(--nav-top)-220px)] lg:min-h-[520px]">
            {desktop && <SetPanel />}
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-0 z-30 flex items-center justify-between border-t border-white/15 bg-black px-4 py-3 text-sm"
          style={{ bottom: 'calc(var(--nav-bottom) + var(--sab))' }}
          aria-expanded={sheetOpen}
          aria-controls="kc-sheet"
          data-testid="kc-open-sheet"
        >
          <span className="text-white">{state.set.name || 'Set'}</span>
          <span className="text-[#808880]">{items.length} tracks · open</span>
        </button>
        <div
          id="kc-sheet"
          className={`kc-sheet fixed inset-x-0 z-40 flex flex-col rounded-t-xl border-t border-white/20 bg-black px-4 pt-2 ${sheetOpen ? '' : 'pointer-events-none'}`}
          style={{
            top: 'calc(var(--sat) + 48px)',
            bottom: 0,
            transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
            paddingBottom: 'calc(var(--nav-bottom) + var(--sab) + 12px)',
          }}
          role="dialog"
          aria-modal={sheetOpen}
          aria-label="Set"
          aria-hidden={!sheetOpen}
        >
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mx-auto mb-2 flex h-8 w-full items-center justify-center"
            aria-label="Close set"
          >
            <span className="h-1 w-12 rounded-full bg-white/40" />
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sheetOpen && !desktop && <SetPanel />}
          </div>
        </div>
      </div>

      {state.toast && (
        <div
          role={state.toast.startsWith('Import failed') ? 'alert' : 'status'}
          data-testid="kc-toast"
          className={`fixed left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border bg-black px-4 py-2 text-sm ${
            state.toast.startsWith('Import failed')
              ? 'border-[#ff0000] text-[#ff0000]'
              : 'border-white/20 text-white'
          }`}
          style={{ bottom: 'calc(var(--nav-bottom) + var(--sab) + 64px)' }}
        >
          {state.toast}
        </div>
      )}
    </div>
  );
}
