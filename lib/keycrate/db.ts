/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · local storage (IndexedDB)
   Everything works signed out: the library, playlists and set studies live here.
   Signing in only adds a cloud copy on top.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Playlist, SetStudy, Track } from './types';

interface KcDb extends DBSchema {
  tracks: { key: string; value: Track };
  playlists: { key: string; value: Playlist; indexes: { updatedAt: string } };
  studies: { key: string; value: SetStudy };
  meta: { key: string; value: { key: string; value: unknown } };
}

let dbPromise: Promise<IDBPDatabase<KcDb>> | null = null;

function db(): Promise<IDBPDatabase<KcDb>> {
  if (!dbPromise) {
    dbPromise = openDB<KcDb>('keycrate', 1, {
      upgrade(d) {
        d.createObjectStore('tracks', { keyPath: 'id' });
        const p = d.createObjectStore('playlists', { keyPath: 'id' });
        p.createIndex('updatedAt', 'updatedAt');
        d.createObjectStore('studies', { keyPath: 'id' });
        d.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

export const localDb = {
  async getTracks(): Promise<Track[]> {
    return (await db()).getAll('tracks');
  },
  /** Writes every track in one transaction; a full replace when `replace` is set. */
  async putTracks(tracks: Track[], replace = false): Promise<void> {
    const d = await db();
    const tx = d.transaction('tracks', 'readwrite');
    if (replace) await tx.store.clear();
    for (const t of tracks) void tx.store.put(t);
    await tx.done;
  },
  async putTrack(track: Track): Promise<void> {
    await (await db()).put('tracks', track);
  },
  async clearTracks(): Promise<void> {
    await (await db()).clear('tracks');
  },

  async getPlaylists(): Promise<Playlist[]> {
    const all = await (await db()).getAll('playlists');
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async putPlaylist(p: Playlist): Promise<void> {
    await (await db()).put('playlists', p);
  },
  async deletePlaylist(id: string): Promise<void> {
    await (await db()).delete('playlists', id);
  },

  async getStudies(): Promise<SetStudy[]> {
    const all = await (await db()).getAll('studies');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async putStudy(s: SetStudy): Promise<void> {
    await (await db()).put('studies', s);
  },
  async deleteStudy(id: string): Promise<void> {
    await (await db()).delete('studies', id);
  },

  async getMeta<T>(key: string): Promise<T | undefined> {
    const row = await (await db()).get('meta', key);
    return row?.value as T | undefined;
  },
  async setMeta(key: string, value: unknown): Promise<void> {
    await (await db()).put('meta', { key, value });
  },
};

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
