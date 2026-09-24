import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { setTransitions, TRANSITION_LABEL } from '@/lib/keycrate/harmonic';
import {
  DEFAULT_SETTINGS,
  type Camelot,
  type PlaylistSettings,
  type Track,
} from '@/lib/keycrate/types';
import Timeline from '../../_components/Timeline';
import Wheel from '../../_components/Wheel';
import { KeyBadge, TRANSITION_COLOR } from '../../_components/ui';

/* Read-only share page. Reads with the anon key, so only playlists marked public come back. */

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

async function loadSet(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: playlist } = await sb
    .from('kc_playlists')
    .select('id, name, mode, target_curve, updated_at')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();
  if (!playlist) return null;
  const { data: items } = await sb
    .from('kc_playlist_items')
    .select(
      'position, note, kc_tracks(id, source_id, artist, title, camelot, bpm, duration_s, genre, label, energy)',
    )
    .eq('playlist_id', id)
    .order('position');
  const tracks: Track[] = (items ?? [])
    .map(
      (it) =>
        it.kc_tracks as unknown as {
          id: string;
          source_id: string;
          artist: string;
          title: string;
          camelot: string | null;
          bpm: number | null;
          duration_s: number | null;
          genre: string | null;
          label: string | null;
          energy: number | null;
        } | null,
    )
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({
      id: t.id,
      sourceId: t.source_id,
      artist: t.artist,
      title: t.title,
      camelot: (t.camelot as Camelot | null) ?? null,
      bpm: t.bpm === null ? null : Number(t.bpm),
      durationS: t.duration_s,
      genre: t.genre ?? undefined,
      label: t.label ?? undefined,
      energy: t.energy,
      rating: null,
      tags: [],
    }));
  const settings = (playlist.target_curve as PlaylistSettings | null) ?? DEFAULT_SETTINGS;
  return {
    name: playlist.name as string,
    updatedAt: playlist.updated_at as string,
    settings,
    tracks,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const set = await loadSet(id);
  return { title: set ? `${set.name} · KeyCrate | VITAEGIS` : 'Set not found · KeyCrate' };
}

export default async function SharedSetPage({ params }: Params) {
  const { id } = await params;
  const set = await loadSet(id);
  if (!set) notFound();
  const transitions = setTransitions(set.tracks, set.settings);
  const path = set.tracks.map((t, i) => ({
    key: t.camelot,
    transition: i > 0 ? transitions[i - 1] : null,
  }));
  const total = set.tracks.reduce((s, t) => s + (t.durationS ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-16 pt-4 sm:px-6">
      <Link href="/keycrate" className="text-xs text-[#808880] hover:text-white">
        ← KeyCrate
      </Link>
      <h1 className="mt-1 text-2xl font-medium text-white">{set.name}</h1>
      <p className="text-xs text-[#808880]">
        {set.tracks.length} tracks · {Math.round(total / 60)} min · {set.settings.mode} mode ·
        shared read-only
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-[320px_1fr]">
        <div>
          <Wheel path={path} />
          <Timeline tracks={set.tracks} className="mt-2" />
        </div>
        <ol className="kc-selectable flex flex-col divide-y divide-white/10 rounded-md border border-white/10">
          {set.tracks.map((t, i) => {
            const into = i > 0 ? transitions[i - 1] : null;
            return (
              <li key={`${t.id}-${i}`} className="px-3 py-2 text-sm">
                {into && (
                  <p className="mb-1 text-xs" style={{ color: TRANSITION_COLOR[into.type] }}>
                    ↓ {TRANSITION_LABEL[into.type]}
                    {into.bpmChangePct !== null
                      ? ` · ${into.bpmChangePct >= 0 ? '+' : ''}${into.bpmChangePct.toFixed(1)}% BPM`
                      : ''}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="kc-mono w-5 text-right text-xs text-[#808880]">{i + 1}</span>
                  <KeyBadge camelot={t.camelot} muted />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white">{t.title}</span>
                    <span className="block truncate text-xs text-[#808880]">{t.artist}</span>
                  </span>
                  <span className="kc-mono text-xs text-white">{t.bpm ?? '––'}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
