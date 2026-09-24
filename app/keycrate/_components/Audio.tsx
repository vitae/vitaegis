'use client';

import type { Track } from '@/lib/keycrate/types';
import { useAudio } from '../_state/audio';
import { useKeyCrate } from '../_state/store';

/* Play buttons, the audio-source controls and the now-playing bar. */

export function PlayButton({
  track,
  className = '',
}: {
  track: Track | null | undefined;
  className?: string;
}) {
  const audio = useAudio();
  if (!track) return <span className={`inline-block w-8 shrink-0 ${className}`} aria-hidden />;
  const current = audio.currentId === track.id;
  const playable = audio.canPlay(track);
  const anyLinked = audio.status === 'ready' || audio.drive.status === 'ready';
  const label = current && audio.playing ? `Pause ${track.title}` : `Play ${track.title}`;
  const title = playable
    ? label
    : audio.status === 'reconnect'
      ? `Reconnect ${audio.folderName ?? 'your music folder'} to play`
      : anyLinked
        ? `No audio file found for ${track.title}`
        : 'Link your music (Google Drive or a USB folder) to play';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        audio.toggle(track);
      }}
      disabled={anyLinked && !playable && audio.status !== 'reconnect'}
      aria-label={playable ? label : title}
      aria-pressed={current && audio.playing}
      title={title}
      data-testid="kc-play"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
        current
          ? 'border-[#00ff00] bg-[#00ff00] text-black'
          : playable
            ? 'border-[#00ff00]/60 text-[#00ff00] hover:bg-[#00ff00]/10'
            : 'border-white/20 text-[#808880] hover:text-white'
      } ${className}`}
    >
      <span aria-hidden>{current && audio.playing ? '❚❚' : '▶'}</span>
    </button>
  );
}

/** Where the audio comes from: Google Drive (when signed in) and/or a local folder / USB drive. */
export function AudioSources() {
  const audio = useAudio();
  const { state } = useKeyCrate();
  const { drive } = audio;
  const chip = 'rounded-md border px-2.5 py-1.5 text-xs transition-colors';
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Audio sources">
      {state.session ? (
        <button
          type="button"
          onClick={audio.linkDrive}
          disabled={drive.status === 'loading'}
          title={drive.error ?? 'Re-read the Google Drive folder'}
          className={`${chip} ${
            drive.status === 'ready'
              ? 'border-[#00ff00]/50 text-[#00ff00]'
              : drive.status === 'error'
                ? 'border-[#ff0000]/60 text-[#ff0000]'
                : 'border-white/15 text-white hover:border-white/40'
          }`}
          data-testid="kc-drive"
        >
          {drive.status === 'loading'
            ? 'Google Drive…'
            : drive.status === 'ready'
              ? `▶ Drive · ${drive.fileCount.toLocaleString()} files`
              : drive.status === 'error'
                ? 'Google Drive: retry'
                : 'Link Google Drive'}
        </button>
      ) : null}
      {audio.status === 'ready' ? (
        <span className={`${chip} flex items-center gap-2 border-[#00ff00]/50 text-[#00ff00]`}>
          ▶ {audio.folderName} · {audio.fileCount.toLocaleString()} files
          <button
            type="button"
            onClick={audio.unlink}
            className="text-[#808880] hover:text-white"
            aria-label="Unlink folder"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={audio.status === 'reconnect' ? audio.reconnect : audio.linkFolder}
          disabled={audio.status === 'scanning'}
          className={`${chip} border-white/15 text-white hover:border-white/40`}
          data-testid="kc-link-folder"
        >
          {audio.status === 'scanning'
            ? `Scanning… ${audio.scanned.toLocaleString()}`
            : audio.status === 'reconnect'
              ? `Reconnect ${audio.folderName ?? 'USB'}`
              : 'Link USB / music folder'}
        </button>
      )}
      {(audio.status === 'ready' || drive.status === 'ready') && (
        <span className="text-[#808880]">
          {audio.playableCount.toLocaleString()} of {state.tracks.length.toLocaleString()} tracks
          playable
        </span>
      )}
    </div>
  );
}

const fmt = (s: number) =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    : '–:––';

/** Fixed player bar: above the set bar on phones, bottom-centre on desktop. */
export function NowPlaying() {
  const audio = useAudio();
  const { derived } = useKeyCrate();
  if (!audio.currentId && !audio.error) return null;
  const track = audio.currentId ? derived.trackMap.get(audio.currentId) : undefined;
  return (
    <div
      role="region"
      aria-label="Now playing"
      className="fixed inset-x-2 z-40 mx-auto max-w-xl rounded-lg border border-[#00ff00]/40 bg-black/95 px-3 py-2 shadow-[0_0_24px_rgba(0,255,0,0.15)] lg:bottom-4"
      style={{ bottom: 'calc(var(--nav-bottom) + var(--sab) + 56px)' }}
      data-testid="kc-now-playing"
    >
      {audio.error ? (
        <div className="flex items-center gap-2 text-xs text-[#ff0000]">
          <span className="flex-1">{audio.error}</span>
          <button
            type="button"
            onClick={audio.stop}
            className="text-[#808880] hover:text-white"
            aria-label="Close player"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {track && <PlayButton track={track} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {track?.title ?? '…'} <span className="text-[#808880]">· {track?.artist}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="kc-mono w-9 text-[10px] text-[#808880]">{fmt(audio.time)}</span>
              <input
                type="range"
                min={0}
                max={audio.duration || 0}
                step={0.1}
                value={Math.min(audio.time, audio.duration || 0)}
                onChange={(e) => audio.seek(Number(e.target.value))}
                aria-label="Seek"
                className="h-4 min-w-0 flex-1"
              />
              <span className="kc-mono w-9 text-right text-[10px] text-[#808880]">
                {fmt(audio.duration)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={audio.stop}
            className="text-lg text-[#808880] hover:text-white"
            aria-label="Stop"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
