'use client';

import { useRef, useState } from 'react';
import { useKeyCrate } from '../_state/store';
import { Button } from './ui';

/* Import bar: rekordbox XML or CSV through the worker, the sample library, saved playlists. */

export default function ImportPanel() {
  const { state, actions } = useKeyCrate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const { importing, tracks, playlists } = state;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xml,.csv,text/xml,application/xml,text/csv"
        className="sr-only"
        data-testid="kc-file"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await actions.importFile(f);
          e.target.value = '';
        }}
      />
      <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={!!importing}>
        {importing ? `Parsing ${importing.parsed.toLocaleString()}${importing.total ? ` / ${importing.total.toLocaleString()}` : ''}…` : tracks.length ? 'Import again' : 'Import rekordbox XML or CSV'}
      </Button>
      {tracks.length === 0 && (
        <Button onClick={actions.loadSample} disabled={!!importing} data-testid="kc-sample">
          Load sample library
        </Button>
      )}
      {playlists.length > 0 && (
        <div className="relative">
          <Button onClick={() => setShowPlaylists((v) => !v)} aria-expanded={showPlaylists}>
            Playlists ({playlists.length})
          </Button>
          {showPlaylists && (
            <ul className="absolute left-0 top-full z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-white/15 bg-black p-1" role="menu">
              {playlists.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      actions.loadPlaylist(p.id);
                      setShowPlaylists(false);
                    }}
                    className="kc-row min-w-0 flex-1 rounded px-2 py-1.5 text-left"
                  >
                    <span className="block truncate text-sm text-white">{p.name}</span>
                    <span className="block text-xs text-[#808880]">
                      {p.items.length} tracks · {p.settings.mode}
                      {p.cloudId ? ' · cloud' : ''}
                    </span>
                  </button>
                  <button type="button" onClick={() => actions.deletePlaylist(p.id)} className="px-2 text-[#808880] hover:text-[#ff0000]" aria-label={`Delete playlist ${p.name}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {tracks.length > 0 && (
        <Button
          variant="quiet"
          onClick={() => {
            if (window.confirm('Clear the local library? Saved playlists stay but lose their tracks until you re-import.')) void actions.clearLibrary();
          }}
        >
          Clear library
        </Button>
      )}
    </div>
  );
}
