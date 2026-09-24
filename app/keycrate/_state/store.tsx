'use client';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · app state
   One provider holds the library, the set being built (with undo/redo), saved
   playlists, filters and the Supabase session. Local IndexedDB is the source of
   truth; the cloud is an opt-in copy.
   ═══════════════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  currentSession,
  deleteCloudPlaylist,
  loadPlaylists,
  pullTracks,
  pushTracks,
  savePlaylist as cloudSavePlaylist,
  setPlaylistPublic,
  signOut as cloudSignOut,
  supabaseBrowser,
  updateTrackFields,
} from '@/lib/keycrate/cloud';
import { localDb, newId } from '@/lib/keycrate/db';
import {
  EMPTY_FILTERS,
  filterTracks,
  indexTracks,
  type LibraryFilters,
} from '@/lib/keycrate/filters';
import { setTransitions, type Transition } from '@/lib/keycrate/harmonic';
import {
  canRedo,
  canUndo,
  createHistory,
  push,
  redo,
  reset,
  undo,
  type History,
} from '@/lib/keycrate/history';
import { mergeTracks } from '@/lib/keycrate/merge';
import { suggestNext, type Suggestion } from '@/lib/keycrate/suggest';
import {
  DEFAULT_SETTINGS,
  type Camelot,
  type Playlist,
  type PlaylistItem,
  type PlaylistSettings,
  type SetStudy,
  type Track,
} from '@/lib/keycrate/types';
import { parseLibraryText } from '@/lib/keycrate/library';
import type { ImportMessage, ImportRequest } from '../_lib/import.worker';

export interface CurrentSet {
  id: string;
  cloudId?: string;
  name: string;
  isPublic: boolean;
  settings: PlaylistSettings;
  history: History<PlaylistItem[]>;
  createdAt: string;
}

export interface State {
  ready: boolean;
  tracks: Track[];
  playlists: Playlist[];
  studies: SetStudy[];
  set: CurrentSet;
  filters: LibraryFilters;
  importing: { parsed: number; total: number | null } | null;
  toast: string | null;
  session: Session | null;
  cloudIds: Map<string, string>;
  busy: string | null;
  /** Something asked for the cloud while signed out. */
  signInPrompt: boolean;
  /** Set when on-device storage (IndexedDB) can't be used: the library then lives in memory. */
  storageError: string | null;
}

const freshSet = (): CurrentSet => ({
  id: newId(),
  name: 'Untitled set',
  isPublic: false,
  settings: DEFAULT_SETTINGS,
  history: createHistory<PlaylistItem[]>([]),
  createdAt: new Date().toISOString(),
});

type Action =
  | {
      type: 'hydrate';
      tracks: Track[];
      playlists: Playlist[];
      studies: SetStudy[];
      set: CurrentSet | null;
      session: Session | null;
    }
  | { type: 'tracks'; tracks: Track[] }
  | { type: 'track'; track: Track }
  | { type: 'playlists'; playlists: Playlist[] }
  | { type: 'studies'; studies: SetStudy[] }
  | { type: 'items'; items: PlaylistItem[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set'; set: CurrentSet }
  | {
      type: 'setMeta';
      patch: Partial<Pick<CurrentSet, 'name' | 'settings' | 'cloudId' | 'isPublic'>>;
    }
  | { type: 'filters'; filters: LibraryFilters }
  | { type: 'importing'; importing: State['importing'] }
  | { type: 'toast'; toast: string | null }
  | { type: 'session'; session: Session | null }
  | { type: 'cloudIds'; cloudIds: Map<string, string> }
  | { type: 'busy'; busy: string | null }
  | { type: 'signInPrompt'; open: boolean }
  | { type: 'storageError'; message: string | null };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'hydrate':
      return {
        ...s,
        ready: true,
        tracks: a.tracks,
        playlists: a.playlists,
        studies: a.studies,
        set: a.set ?? s.set,
        session: a.session,
      };
    case 'tracks':
      return { ...s, tracks: a.tracks };
    case 'track':
      return { ...s, tracks: s.tracks.map((t) => (t.id === a.track.id ? a.track : t)) };
    case 'playlists':
      return { ...s, playlists: a.playlists };
    case 'studies':
      return { ...s, studies: a.studies };
    case 'items':
      return { ...s, set: { ...s.set, history: push(s.set.history, a.items) } };
    case 'undo':
      return { ...s, set: { ...s.set, history: undo(s.set.history) } };
    case 'redo':
      return { ...s, set: { ...s.set, history: redo(s.set.history) } };
    case 'set':
      return { ...s, set: a.set };
    case 'setMeta':
      return { ...s, set: { ...s.set, ...a.patch } };
    case 'filters':
      return { ...s, filters: a.filters };
    case 'importing':
      return { ...s, importing: a.importing };
    case 'toast':
      return { ...s, toast: a.toast };
    case 'session':
      return { ...s, session: a.session };
    case 'cloudIds':
      return { ...s, cloudIds: a.cloudIds };
    case 'busy':
      return { ...s, busy: a.busy };
    case 'signInPrompt':
      return { ...s, signInPrompt: a.open };
    case 'storageError':
      return { ...s, storageError: a.message };
  }
}

const initial: State = {
  ready: false,
  tracks: [],
  playlists: [],
  studies: [],
  set: freshSet(),
  filters: EMPTY_FILTERS,
  importing: null,
  toast: null,
  session: null,
  cloudIds: new Map(),
  busy: null,
  signInPrompt: false,
  storageError: null,
};

/** Rejects if `p` hasn't settled in `ms`: IndexedDB can hang when another tab blocks it. */
function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out`)), ms)),
  ]);
}

const STORAGE_HELP =
  "Your library won't be kept on this device after you close the page. Private browsing and in-app browsers often block storage; open vitaegis.com/keycrate in Safari or Chrome directly, or close other KeyCrate tabs.";

/** On-device writes never block an action: on failure the crate carries on in memory. */
async function persist(write: Promise<unknown>, dispatch: (a: Action) => void): Promise<void> {
  try {
    await write;
  } catch (err) {
    console.error('[keycrate] on-device save failed', err);
    dispatch({ type: 'storageError', message: STORAGE_HELP });
  }
}

/** Parses in a Web Worker; rejects with `workerFailed` set when the worker itself can't run. */
function parseInWorker(
  text: string,
  onProgress: (parsed: number, total: number | null) => void,
): Promise<{ tracks: Track[] }> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../_lib/import.worker.ts', import.meta.url));
    } catch (err) {
      reject(Object.assign(new Error(String(err)), { workerFailed: true }));
      return;
    }
    // A worker that fails to load or crashes (e.g. out of memory) never posts a message.
    worker.onerror = (e) => {
      e.preventDefault();
      worker.terminate();
      reject(Object.assign(new Error(e.message || 'import worker failed'), { workerFailed: true }));
    };
    worker.onmessage = (e: MessageEvent<ImportMessage>) => {
      const m = e.data;
      if (m.type === 'progress') return onProgress(m.parsed, m.total);
      worker.terminate();
      if (m.type === 'error') reject(new Error(m.message));
      else resolve({ tracks: m.tracks });
    };
    worker.postMessage({ text } satisfies ImportRequest);
  });
}

export interface Derived {
  trackMap: Map<string, Track>;
  filtered: Track[];
  setTracks: Track[];
  transitions: Transition[];
  suggestions: Suggestion[];
  usedIds: Set<string>;
  genres: string[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface Actions {
  importFile: (file: File) => Promise<void>;
  loadSample: () => Promise<void>;
  clearLibrary: () => Promise<void>;
  updateTrack: (id: string, patch: Partial<Pick<Track, 'energy' | 'tags'>>) => Promise<void>;
  addTrack: (id: string) => void;
  removeAt: (index: number) => void;
  moveItem: (from: number, to: number) => void;
  setNote: (index: number, note: string) => void;
  replaceItems: (items: PlaylistItem[]) => void;
  undo: () => void;
  redo: () => void;
  newSet: () => void;
  setName: (name: string) => void;
  setSettings: (settings: PlaylistSettings) => void;
  saveSet: () => Promise<void>;
  loadPlaylist: (id: string) => void;
  deletePlaylist: (id: string) => Promise<void>;
  setFilters: (patch: Partial<LibraryFilters>) => void;
  toggleKey: (key: Camelot) => void;
  clearFilters: () => void;
  toast: (message: string | null) => void;
  requestSignIn: (open: boolean) => void;
  signOut: () => Promise<void>;
  syncLibrary: () => Promise<void>;
  saveToCloud: () => Promise<void>;
  share: () => Promise<string | null>;
  saveStudy: (study: SetStudy) => Promise<void>;
  deleteStudy: (id: string) => Promise<void>;
}

const Ctx = createContext<{ state: State; derived: Derived; actions: Actions } | null>(null);

export function KeyCrateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* ── Hydrate from IndexedDB and Supabase ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await withTimeout(currentSession(), 5000, 'Sign-in check').catch(() => null);
      try {
        const [tracks, playlists, studies, saved] = await withTimeout(
          Promise.all([
            localDb.getTracks(),
            localDb.getPlaylists(),
            localDb.getStudies(),
            localDb.getMeta<Omit<CurrentSet, 'history'> & { items: PlaylistItem[] }>('current'),
          ]),
          8000,
          'Opening on-device storage',
        );
        if (cancelled) return;
        const set = saved ? { ...saved, history: createHistory(saved.items) } : null;
        dispatch({ type: 'hydrate', tracks, playlists, studies, set, session });
      } catch (err) {
        // Never leave the page on "Opening your crate…": carry on with an in-memory crate.
        if (cancelled) return;
        console.error('[keycrate] IndexedDB unavailable', err);
        dispatch({ type: 'hydrate', tracks: [], playlists: [], studies: [], set: null, session });
        dispatch({ type: 'storageError', message: STORAGE_HELP });
      }
    })();
    const sb = supabaseBrowser();
    const sub = sb?.auth.onAuthStateChange((_event, session) =>
      dispatch({ type: 'session', session }),
    );
    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  /* ── Persist the working set ─────────────────────────────────────────── */
  const { set, ready } = state;
  useEffect(() => {
    if (!ready) return;
    const { history, ...rest } = set;
    void persist(localDb.setMeta('current', { ...rest, items: history.present }), dispatch);
  }, [set, ready]);

  useEffect(() => {
    if (!state.toast) return;
    // Failures carry instructions, so they stay up long enough to read.
    const ms = state.toast.startsWith('Import failed') ? 10000 : 3500;
    const t = setTimeout(() => dispatch({ type: 'toast', toast: null }), ms);
    return () => clearTimeout(t);
  }, [state.toast]);

  /* ── Derived data ────────────────────────────────────────────────────── */
  const trackMap = useMemo(() => new Map(state.tracks.map((t) => [t.id, t])), [state.tracks]);
  const index = useMemo(() => indexTracks(state.tracks), [state.tracks]);
  const items = state.set.history.present;
  const usedIds = useMemo(() => {
    const used = new Set<string>();
    for (const p of state.playlists) for (const it of p.items) used.add(it.trackId);
    for (const it of items) used.add(it.trackId);
    return used;
  }, [state.playlists, items]);
  const filtered = useMemo(
    () => filterTracks(index, state.filters, usedIds),
    [index, state.filters, usedIds],
  );
  const setTracks = useMemo(
    () => items.map((it) => trackMap.get(it.trackId)).filter((t): t is Track => !!t),
    [items, trackMap],
  );
  const transitions = useMemo(
    () => setTransitions(setTracks, state.set.settings),
    [setTracks, state.set.settings],
  );
  const suggestions = useMemo(
    () =>
      suggestNext(setTracks, state.tracks, state.set.settings, {
        exclude: new Set(items.map((i) => i.trackId)),
      }),
    [setTracks, state.tracks, state.set.settings, items],
  );
  const genres = useMemo(
    () =>
      Array.from(new Set(state.tracks.map((t) => t.genre).filter((g): g is string => !!g))).sort(),
    [state.tracks],
  );

  const derived: Derived = useMemo(
    () => ({
      trackMap,
      filtered,
      setTracks,
      transitions,
      suggestions,
      usedIds,
      genres,
      canUndo: canUndo(state.set.history),
      canRedo: canRedo(state.set.history),
    }),
    [trackMap, filtered, setTracks, transitions, suggestions, usedIds, genres, state.set.history],
  );

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const toast = useCallback(
    (message: string | null) => dispatch({ type: 'toast', toast: message }),
    [],
  );

  const importText = useCallback(
    async (text: string) => {
      const progress = (parsed: number, total: number | null) =>
        dispatch({ type: 'importing', importing: { parsed, total } });
      progress(0, null);
      try {
        let parsed: Track[];
        try {
          parsed = (await parseInWorker(text, progress)).tracks;
        } catch (err) {
          if (!(err as { workerFailed?: boolean }).workerFailed) throw err;
          // The worker couldn't run in this browser: parse here instead (the page may pause).
          console.warn('[keycrate] import worker failed, parsing on the main thread', err);
          await new Promise((r) => setTimeout(r, 30));
          parsed = parseLibraryText(text).tracks;
        }

        const { tracks, added, updated, remapped } = mergeTracks(stateRef.current.tracks, parsed);
        dispatch({ type: 'tracks', tracks });
        // Playlists that pointed at a CSV hash now point at the merged row.
        let fixed: Playlist[] | null = null;
        if (remapped.size) {
          fixed = stateRef.current.playlists.map((p) => ({
            ...p,
            items: p.items.map((it) => ({
              ...it,
              trackId: remapped.get(it.trackId) ?? it.trackId,
            })),
          }));
          dispatch({ type: 'playlists', playlists: fixed });
        }
        const summary = `Imported ${parsed.length.toLocaleString()} tracks: ${added.toLocaleString()} new, ${updated.toLocaleString()} updated`;
        try {
          await withTimeout(localDb.putTracks(tracks, true), 20000, 'Saving the library');
          if (fixed) for (const p of fixed) await localDb.putPlaylist(p);
          toast(summary);
        } catch (err) {
          // The crate still works for this visit; say plainly that it won't be kept.
          console.error('[keycrate] could not save the library', err);
          dispatch({ type: 'storageError', message: STORAGE_HELP });
          toast(`${summary}. Couldn't save them on this device.`);
        }
      } catch (err) {
        toast(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        dispatch({ type: 'importing', importing: null });
      }
    },
    [toast],
  );

  const importFile = useCallback(
    async (file: File) => {
      let text: string;
      try {
        text = await file.text();
      } catch (err) {
        toast(
          `Import failed: couldn't read ${file.name} (${err instanceof Error ? err.message : err})`,
        );
        return;
      }
      // The format is read from the content, so .xml, .nml, .csv or no extension all work.
      await importText(text);
    },
    [importText, toast],
  );

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch('/api/keycrate/sample');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await importText(await res.text());
    } catch (err) {
      toast(
        `Import failed: couldn't load the sample (${err instanceof Error ? err.message : err})`,
      );
    }
  }, [importText, toast]);

  const clearLibrary = useCallback(async () => {
    await persist(localDb.clearTracks(), dispatch);
    dispatch({ type: 'tracks', tracks: [] });
    dispatch({ type: 'cloudIds', cloudIds: new Map() });
  }, []);

  const updateTrack = useCallback(
    async (id: string, patch: Partial<Pick<Track, 'energy' | 'tags'>>) => {
      const track = stateRef.current.tracks.find((t) => t.id === id);
      if (!track) return;
      const next = { ...track, ...patch };
      dispatch({ type: 'track', track: next });
      await persist(localDb.putTrack(next), dispatch);
      const sb = supabaseBrowser();
      const cloudId = stateRef.current.cloudIds.get(id);
      if (sb && stateRef.current.session && cloudId) {
        await updateTrackFields(sb, cloudId, patch).catch(() => undefined);
      }
    },
    [],
  );

  const setItems = useCallback(
    (next: PlaylistItem[]) => dispatch({ type: 'items', items: next }),
    [],
  );
  const addTrack = useCallback(
    (id: string) => setItems([...stateRef.current.set.history.present, { trackId: id }]),
    [setItems],
  );
  const removeAt = useCallback(
    (i: number) => setItems(stateRef.current.set.history.present.filter((_, j) => j !== i)),
    [setItems],
  );
  const moveItem = useCallback(
    (from: number, to: number) => {
      const cur = stateRef.current.set.history.present;
      if (from === to || from < 0 || to < 0 || from >= cur.length || to >= cur.length) return;
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setItems(next);
    },
    [setItems],
  );
  const setNote = useCallback(
    (i: number, note: string) =>
      setItems(
        stateRef.current.set.history.present.map((it, j) =>
          j === i ? { ...it, note: note || undefined } : it,
        ),
      ),
    [setItems],
  );

  const newSet = useCallback(() => dispatch({ type: 'set', set: freshSet() }), []);
  const setName = useCallback((name: string) => dispatch({ type: 'setMeta', patch: { name } }), []);
  const setSettings = useCallback(
    (settings: PlaylistSettings) => dispatch({ type: 'setMeta', patch: { settings } }),
    [],
  );

  const currentAsPlaylist = useCallback((): Playlist => {
    const s = stateRef.current.set;
    return {
      id: s.id,
      cloudId: s.cloudId,
      name: s.name.trim() || 'Untitled set',
      settings: s.settings,
      items: s.history.present,
      isPublic: s.isPublic,
      createdAt: s.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const saveSet = useCallback(async () => {
    const p = currentAsPlaylist();
    await persist(localDb.putPlaylist(p), dispatch);
    const rest = stateRef.current.playlists.filter((x) => x.id !== p.id);
    dispatch({ type: 'playlists', playlists: [p, ...rest] });
    toast(`Saved “${p.name}”`);
  }, [currentAsPlaylist, toast]);

  const loadPlaylist = useCallback((id: string) => {
    const p = stateRef.current.playlists.find((x) => x.id === id);
    if (!p) return;
    dispatch({
      type: 'set',
      set: {
        id: p.id,
        cloudId: p.cloudId,
        name: p.name,
        isPublic: p.isPublic ?? false,
        settings: p.settings,
        history: reset(p.items),
        createdAt: p.createdAt,
      },
    });
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    const p = stateRef.current.playlists.find((x) => x.id === id);
    await persist(localDb.deletePlaylist(id), dispatch);
    dispatch({
      type: 'playlists',
      playlists: stateRef.current.playlists.filter((x) => x.id !== id),
    });
    const sb = supabaseBrowser();
    if (p?.cloudId && sb && stateRef.current.session)
      await deleteCloudPlaylist(sb, p.cloudId).catch(() => undefined);
  }, []);

  const setFilters = useCallback(
    (patch: Partial<LibraryFilters>) =>
      dispatch({ type: 'filters', filters: { ...stateRef.current.filters, ...patch } }),
    [],
  );
  const toggleKey = useCallback(
    (key: Camelot) => {
      const keys = new Set(stateRef.current.filters.keys);
      if (keys.has(key)) keys.delete(key);
      else keys.add(key);
      setFilters({ keys });
    },
    [setFilters],
  );
  const clearFilters = useCallback(() => dispatch({ type: 'filters', filters: EMPTY_FILTERS }), []);
  const requestSignIn = useCallback(
    (open: boolean) => dispatch({ type: 'signInPrompt', open }),
    [],
  );

  const signOut = useCallback(async () => {
    await cloudSignOut();
    dispatch({ type: 'session', session: null });
    dispatch({ type: 'cloudIds', cloudIds: new Map() });
  }, []);

  /** Push the library up in chunks of 500 and pull cloud playlists down. */
  const syncLibrary = useCallback(async () => {
    const sb = supabaseBrowser();
    const session = stateRef.current.session;
    if (!sb || !session) {
      requestSignIn(true);
      return;
    }
    try {
      dispatch({ type: 'busy', busy: 'Uploading library…' });
      const tracks = stateRef.current.tracks;
      let cloudIds = new Map<string, string>();
      if (tracks.length) {
        cloudIds = await pushTracks(sb, session.user.id, tracks, (done, total) =>
          dispatch({
            type: 'busy',
            busy: `Uploading ${done.toLocaleString()} / ${total.toLocaleString()}…`,
          }),
        );
      }
      dispatch({ type: 'busy', busy: 'Pulling cloud copy…' });
      const pulled = await pullTracks(sb);
      if (pulled.tracks.length) {
        const merged = mergeTracks(stateRef.current.tracks, pulled.tracks);
        // Keep local energy/tags, but add tracks that only exist in the cloud.
        if (merged.added) {
          await persist(localDb.putTracks(merged.tracks, true), dispatch);
          dispatch({ type: 'tracks', tracks: merged.tracks });
        }
        for (const [local, cloud] of pulled.cloudIds)
          cloudIds.set(merged.remapped.get(local) ?? local, cloud);
      }
      dispatch({ type: 'cloudIds', cloudIds });
      const cloudToLocal = new Map(Array.from(cloudIds, ([l, c]) => [c, l]));
      const remote = await loadPlaylists(sb, cloudToLocal);
      const localById = new Map(stateRef.current.playlists.map((p) => [p.cloudId ?? p.id, p]));
      const merged: Playlist[] = [...stateRef.current.playlists];
      for (const r of remote) {
        const local = localById.get(r.cloudId!);
        if (!local) {
          merged.push(r);
          await persist(localDb.putPlaylist(r), dispatch);
        }
      }
      dispatch({
        type: 'playlists',
        playlists: merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      });
      toast(`Synced ${tracks.length.toLocaleString()} tracks and ${remote.length} playlists`);
    } catch (e) {
      toast(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      dispatch({ type: 'busy', busy: null });
    }
  }, [requestSignIn, toast]);

  const saveToCloud = useCallback(async () => {
    const sb = supabaseBrowser();
    const session = stateRef.current.session;
    if (!sb || !session) {
      requestSignIn(true);
      return;
    }
    try {
      // Every track in the set must exist in the cloud first.
      const missing = stateRef.current.set.history.present.some(
        (it) => !stateRef.current.cloudIds.has(it.trackId),
      );
      if (missing) await syncLibrary();
      dispatch({ type: 'busy', busy: 'Saving playlist…' });
      const p = currentAsPlaylist();
      const types = setTransitions(
        p.items.map((it) => trackMap.get(it.trackId)).filter((t): t is Track => !!t),
        p.settings,
      ).map((t) => t.type);
      const cloudId = await cloudSavePlaylist(
        sb,
        session.user.id,
        p,
        stateRef.current.cloudIds,
        types,
      );
      const saved: Playlist = { ...p, cloudId };
      await persist(localDb.putPlaylist(saved), dispatch);
      dispatch({ type: 'setMeta', patch: { cloudId } });
      dispatch({
        type: 'playlists',
        playlists: [saved, ...stateRef.current.playlists.filter((x) => x.id !== saved.id)],
      });
      toast('Saved to the cloud');
    } catch (e) {
      toast(`Cloud save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      dispatch({ type: 'busy', busy: null });
    }
  }, [currentAsPlaylist, requestSignIn, syncLibrary, toast, trackMap]);

  const share = useCallback(async (): Promise<string | null> => {
    const sb = supabaseBrowser();
    if (!sb || !stateRef.current.session) {
      requestSignIn(true);
      return null;
    }
    dispatch({ type: 'setMeta', patch: { isPublic: true } });
    await saveToCloud();
    const cloudId = stateRef.current.set.cloudId;
    if (!cloudId) return null;
    await setPlaylistPublic(sb, cloudId, true).catch(() => undefined);
    return `${window.location.origin}/keycrate/set/${cloudId}`;
  }, [requestSignIn, saveToCloud]);

  const saveStudy = useCallback(async (study: SetStudy) => {
    await persist(localDb.putStudy(study), dispatch);
    dispatch({
      type: 'studies',
      studies: [study, ...stateRef.current.studies.filter((s) => s.id !== study.id)],
    });
  }, []);
  const deleteStudy = useCallback(async (id: string) => {
    await persist(localDb.deleteStudy(id), dispatch);
    dispatch({ type: 'studies', studies: stateRef.current.studies.filter((s) => s.id !== id) });
  }, []);

  const actions: Actions = useMemo(
    () => ({
      importFile,
      loadSample,
      clearLibrary,
      updateTrack,
      addTrack,
      removeAt,
      moveItem,
      setNote,
      replaceItems: setItems,
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      newSet,
      setName,
      setSettings,
      saveSet,
      loadPlaylist,
      deletePlaylist,
      setFilters,
      toggleKey,
      clearFilters,
      toast,
      requestSignIn,
      signOut,
      syncLibrary,
      saveToCloud,
      share,
      saveStudy,
      deleteStudy,
    }),
    [
      importFile,
      loadSample,
      clearLibrary,
      updateTrack,
      addTrack,
      removeAt,
      moveItem,
      setNote,
      setItems,
      newSet,
      setName,
      setSettings,
      saveSet,
      loadPlaylist,
      deletePlaylist,
      setFilters,
      toggleKey,
      clearFilters,
      toast,
      requestSignIn,
      signOut,
      syncLibrary,
      saveToCloud,
      share,
      saveStudy,
      deleteStudy,
    ],
  );

  const value = useMemo(() => ({ state, derived, actions }), [state, derived, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKeyCrate() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKeyCrate must be used inside KeyCrateProvider');
  return ctx;
}
