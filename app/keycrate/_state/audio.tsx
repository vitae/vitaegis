'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildAudioIndex, findAudio, isAudioFile, type AudioIndex } from '@/lib/keycrate/audio';
import { localDb } from '@/lib/keycrate/db';
import type { Track } from '@/lib/keycrate/types';
import { useKeyCrate } from './store';

/* ═══════════════════════════════════════════════════════════════════════════════
   Audio playback from two places, through one shared <audio> element:
   - Google Drive: WAVs in the Drive folder shared with the site's service account,
     streamed by /api/keycrate/audio/[id] for signed-in, allowlisted users.
   - A local folder or USB drive the DJ picks: nothing is uploaded; Chrome/Edge keep
     the folder between visits, other browsers use a picker each visit. Local files win
     when both have a track (no network needed at a gig).
   ═══════════════════════════════════════════════════════════════════════════════ */

type Source = File | FileSystemFileHandle | { driveId: string };
type Status = 'none' | 'scanning' | 'ready' | 'reconnect';
type DriveStatus = 'off' | 'loading' | 'ready' | 'error';

interface DirHandle {
  name: string;
  kind: 'directory';
  values(): AsyncIterable<{ kind: 'file' | 'directory'; name: string }>;
  queryPermission?(o: { mode: 'read' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'read' }): Promise<PermissionState>;
}

export interface AudioApi {
  status: Status;
  drive: {
    status: DriveStatus;
    folderName: string | null;
    fileCount: number;
    error: string | null;
  };
  linkDrive: () => void;
  folderName: string | null;
  fileCount: number;
  scanned: number;
  playableCount: number;
  currentId: string | null;
  playing: boolean;
  time: number;
  duration: number;
  error: string | null;
  canPlay: (track: Track | null | undefined) => boolean;
  toggle: (track: Track) => void;
  stop: () => void;
  seek: (seconds: number) => void;
  linkFolder: () => void;
  reconnect: () => void;
  unlink: () => void;
}

const Ctx = createContext<AudioApi | null>(null);

const pickerSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

async function scanDirectory(
  dir: DirHandle,
  onProgress: (n: number) => void,
): Promise<{ name: string; file: Source }[]> {
  const out: { name: string; file: Source }[] = [];
  const walk = async (d: DirHandle, depth: number) => {
    if (depth > 12) return;
    for await (const entry of d.values()) {
      // Skip hidden and system folders (".Trashes", ".Spotlight-V100", "System Volume Information").
      if (entry.name.startsWith('.') || entry.name === 'System Volume Information') continue;
      if (entry.kind === 'directory') await walk(entry as unknown as DirHandle, depth + 1);
      else if (isAudioFile(entry.name)) {
        out.push({ name: entry.name, file: entry as unknown as FileSystemFileHandle });
        if (out.length % 200 === 0) onProgress(out.length);
      }
    }
  };
  await walk(dir, 0);
  return out;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const { state, actions } = useKeyCrate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<DirHandle | null>(null);

  const [index, setIndex] = useState<AudioIndex<Source> | null>(null);
  const [driveIndex, setDriveIndex] = useState<AudioIndex<Source> | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus>('off');
  const [driveName, setDriveName] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('none');
  const [folderName, setFolderName] = useState<string | null>(null);
  const [scanned, setScanned] = useState(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track → file, recomputed only when the library or a folder changes. Local first, then Drive.
  const sources = useMemo(() => {
    const m = new Map<string, Source>();
    if (!index && !driveIndex) return m;
    for (const t of state.tracks) {
      const f = (index && findAudio(t, index)) || (driveIndex && findAudio(t, driveIndex));
      if (f) m.set(t.id, f);
    }
    return m;
  }, [index, driveIndex, state.tracks]);

  /** Lists the Drive folder. Quiet on the automatic run; toasts when the DJ asked for it. */
  const loadDrive = useCallback(
    async (quiet: boolean) => {
      setDriveStatus('loading');
      setDriveError(null);
      try {
        const res = await fetch('/api/keycrate/audio', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          folderName?: string;
          files?: { id: string; name: string }[];
        };
        if (!res.ok || !json.files)
          throw Object.assign(new Error(json.error ?? `HTTP ${res.status}`), {
            status: res.status,
          });
        setDriveIndex(
          buildAudioIndex(
            json.files.map((f) => ({ name: f.name, file: { driveId: f.id } as Source })),
          ),
        );
        setDriveName(json.folderName ?? 'Google Drive');
        setDriveStatus('ready');
        if (!quiet)
          actions.toast(
            `Linked ${json.files.length.toLocaleString()} audio files from Google Drive`,
          );
      } catch (err) {
        const status = (err as { status?: number }).status;
        // Not configured or not signed in: stay out of the way on the automatic run.
        setDriveStatus(quiet && (status === 401 || status === 503) ? 'off' : 'error');
        const msg = err instanceof Error ? err.message : String(err);
        setDriveError(msg);
        if (!quiet) actions.toast(`Google Drive: ${msg}`);
      }
    },
    [actions],
  );

  // Signed in: link the Drive folder automatically.
  const signedIn = !!state.session;
  useEffect(() => {
    if (signedIn) void loadDrive(true);
    else {
      setDriveIndex(null);
      setDriveStatus('off');
    }
  }, [signedIn, loadDrive]);

  const applyFiles = useCallback((files: { name: string; file: Source }[], name: string) => {
    setIndex(buildAudioIndex(files));
    setFolderName(name);
    setStatus('ready');
  }, []);

  const scanHandle = useCallback(
    async (dir: DirHandle) => {
      setStatus('scanning');
      setScanned(0);
      try {
        const files = await scanDirectory(dir, setScanned);
        dirRef.current = dir;
        applyFiles(files, dir.name);
        actions.toast(`Linked ${files.length.toLocaleString()} audio files from ${dir.name}`);
      } catch (err) {
        setStatus('none');
        actions.toast(`Couldn't read that folder: ${err instanceof Error ? err.message : err}`);
      }
    },
    [actions, applyFiles],
  );

  // A folder linked on an earlier visit: reuse it if the browser still allows it.
  useEffect(() => {
    if (!pickerSupported()) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await localDb.getMeta<DirHandle>('audioDir');
        if (!saved || cancelled) return;
        dirRef.current = saved;
        setFolderName(saved.name);
        const perm = (await saved.queryPermission?.({ mode: 'read' })) ?? 'prompt';
        if (cancelled) return;
        if (perm === 'granted') void scanHandle(saved);
        else setStatus('reconnect');
      } catch {
        /* storage unavailable: the DJ links the folder again */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanHandle]);

  const linkFolder = useCallback(async () => {
    if (!pickerSupported()) {
      inputRef.current?.click();
      return;
    }
    try {
      const dir = (await (
        window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }
      ).showDirectoryPicker({ id: 'keycrate-audio', mode: 'read' })) as DirHandle;
      await localDb.setMeta('audioDir', dir).catch(() => undefined);
      await scanHandle(dir);
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        actions.toast(`Couldn't open that folder: ${err instanceof Error ? err.message : err}`);
      }
    }
  }, [actions, scanHandle]);

  const reconnect = useCallback(async () => {
    const dir = dirRef.current;
    if (!dir) return linkFolder();
    const perm = (await dir.requestPermission?.({ mode: 'read' })) ?? 'denied';
    if (perm === 'granted') await scanHandle(dir);
    else actions.toast('Allow access to the folder to play its tracks');
  }, [actions, linkFolder, scanHandle]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    a?.pause();
    if (a) a.removeAttribute('src');
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setCurrentId(null);
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, []);

  const unlink = useCallback(() => {
    stop();
    setIndex(null);
    setFolderName(null);
    setStatus('none');
    dirRef.current = null;
    void localDb.setMeta('audioDir', null).catch(() => undefined);
  }, [stop]);

  const toggle = useCallback(
    async (track: Track) => {
      const a = audioRef.current;
      if (!a) return;
      if (currentId === track.id) {
        if (a.paused) void a.play().catch(() => undefined);
        else a.pause();
        return;
      }
      const src = sources.get(track.id);
      if (!src) {
        if (status === 'reconnect') return reconnect();
        if (status !== 'ready' && driveStatus !== 'ready') return linkFolder();
        actions.toast(`No audio file found for ${track.title}`);
        return;
      }
      try {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        if ('driveId' in src) {
          // Streamed in byte ranges by the server, so seeking works without downloading the WAV.
          a.src = `/api/keycrate/audio/${encodeURIComponent(src.driveId)}`;
        } else {
          const file = src instanceof File ? src : await src.getFile();
          urlRef.current = URL.createObjectURL(file);
          a.src = urlRef.current;
        }
        setError(null);
        setCurrentId(track.id);
        setTime(0);
        await a.play();
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' && status === 'ready') {
          // The folder permission lapsed: ask again.
          setStatus('reconnect');
          return;
        }
        if (name !== 'AbortError') {
          setError(`Can't play ${track.title} in this browser`);
        }
      }
    },
    [actions, currentId, driveStatus, linkFolder, reconnect, sources, status],
  );

  const seek = useCallback((s: number) => {
    const a = audioRef.current;
    if (a && Number.isFinite(s)) a.currentTime = s;
  }, []);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const api = useMemo<AudioApi>(
    () => ({
      status,
      drive: {
        status: driveStatus,
        folderName: driveName,
        fileCount: driveIndex?.count ?? 0,
        error: driveError,
      },
      linkDrive: () => void loadDrive(false),
      folderName,
      fileCount: index?.count ?? 0,
      scanned,
      playableCount: sources.size,
      currentId,
      playing,
      time,
      duration,
      error,
      canPlay: (t) => !!t && sources.has(t.id),
      toggle: (t) => void toggle(t),
      stop,
      seek,
      linkFolder: () => void linkFolder(),
      reconnect: () => void reconnect(),
      unlink,
    }),
    [
      status,
      driveStatus,
      driveName,
      driveIndex,
      driveError,
      loadDrive,
      folderName,
      index,
      scanned,
      sources,
      currentId,
      playing,
      time,
      duration,
      error,
      toggle,
      stop,
      seek,
      linkFolder,
      reconnect,
      unlink,
    ],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          if (!currentId) return;
          const t = state.tracks.find((x) => x.id === currentId);
          setError(
            `This browser can't play ${t?.title ?? 'that file'}. WAV, MP3, AAC and FLAC play everywhere; AIFF only in Safari.`,
          );
          setPlaying(false);
        }}
        hidden
      />
      {/* Fallback for browsers without the folder picker: pick a folder, or several files on iOS. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="kc-audio-files"
        {...({ webkitdirectory: '' } as Record<string, string>)}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!list.length) return;
          const first = list[0] as File & { webkitRelativePath?: string };
          const folder = first.webkitRelativePath?.split('/')[0] || 'selected files';
          const files = list.map((f) => ({ name: f.name, file: f as Source }));
          applyFiles(files, folder);
          actions.toast(
            `Linked ${files.filter((f) => isAudioFile(f.name)).length.toLocaleString()} audio files from ${folder}`,
          );
        }}
      />
    </Ctx.Provider>
  );
}

export function useAudio(): AudioApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAudio outside AudioProvider');
  return v;
}
