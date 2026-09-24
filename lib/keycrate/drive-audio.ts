import 'server-only';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { driveCredentialsSet, driveReadToken, serviceAccountEmail } from '@/lib/drive';
import { isAudioFile } from './audio';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · audio from Google Drive
   The DJ keeps their WAVs in a Drive folder shared (Viewer) with the site's service
   account. KEYCRATE_DRIVE_FOLDER_ID names it; without it, the shared folder called
   KEYCRATE_DRIVE_FOLDER_NAME (default "USB") is used. The browser never gets a Google token:
   /api/keycrate/audio lists the folder and /api/keycrate/audio/[id] streams one file.
   Both need a signed-in KeyCrate user on KEYCRATE_ALLOWED_EMAILS, because the music is
   private and would otherwise be streamable by anyone.
   ═══════════════════════════════════════════════════════════════════════════════ */

const API = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export const audioFolderName = () => process.env.KEYCRATE_DRIVE_FOLDER_NAME?.trim() || 'USB';

/** Thrown when the folder isn't shared with the service account yet; the UI shows how to fix it. */
export class FolderNotSharedError extends Error {}

let resolvedFolder: { id: string; name: string; at: number } | null = null;

/**
 * The audio folder's id: KEYCRATE_DRIVE_FOLDER_ID when set, otherwise the folder named
 * "USB" (most recently changed, if several) that has been shared with the service account.
 * Cached for 10 minutes so a freshly shared folder is picked up without a redeploy.
 */
export async function audioFolder(): Promise<{ id: string; name: string }> {
  const fixed = process.env.KEYCRATE_DRIVE_FOLDER_ID?.trim();
  if (fixed) return { id: fixed, name: '' };
  if (resolvedFolder && Date.now() - resolvedFolder.at < 10 * 60_000) return resolvedFolder;
  const name = audioFolderName().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const res = await drive('', {
    q: `name = '${name}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '10',
    includeItemsFromAllDrives: 'true',
  });
  if (!res.ok) throw new Error(`Drive search failed (${res.status})`);
  const found = ((await res.json()) as { files: { id: string; name: string }[] }).files[0];
  if (!found) {
    const email = serviceAccountEmail();
    throw new FolderNotSharedError(
      `Share your Google Drive folder "${audioFolderName()}" with ${email ?? 'the site service account'} (Viewer) so KeyCrate can play it.`,
    );
  }
  resolvedFolder = { id: found.id, name: found.name, at: Date.now() };
  return resolvedFolder;
}

export type AudioAuth = { ok: true; email: string } | { ok: false; status: number; error: string };

/** The signed-in KeyCrate user from the Supabase session cookie, checked against the allowlist. */
export async function audioUser(req: NextRequest): Promise<AudioAuth> {
  if (!driveCredentialsSet()) {
    return { ok: false, status: 503, error: 'Google Drive audio is not configured' };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, status: 503, error: 'Sign-in is not configured' };
  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
  });
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return { ok: false, status: 401, error: 'Sign in to play audio from Google Drive' };
  const allowed = (process.env.KEYCRATE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Streaming needs an explicit allowlist: an empty one would let any sign-up play the library.
  if (!allowed.includes(email)) {
    return {
      ok: false,
      status: 403,
      error: 'This account is not allowed to stream the audio library',
    };
  }
  return { ok: true, email };
}

async function drive(path: string, params: Record<string, string>, init?: RequestInit) {
  const token = await driveReadToken();
  const q = new URLSearchParams({ supportsAllDrives: 'true', ...params });
  return fetch(`${API}${path}?${q}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
}

export interface DriveAudioFile {
  id: string;
  name: string;
  size: number | null;
}

/** Every audio file under the folder, recursively (subfolders like /Contents/Artist/Album). */
export async function listAudioFiles(): Promise<{ folderName: string; files: DriveAudioFile[] }> {
  const root = (await audioFolder()).id;
  const meta = await drive(`/${root}`, { fields: 'name' });
  if (!meta.ok)
    throw new Error(
      `Drive folder not reachable (${meta.status}). Share it with the service account.`,
    );
  const folderName = ((await meta.json()) as { name?: string }).name ?? 'Google Drive';

  const files: DriveAudioFile[] = [];
  const queue: { id: string; depth: number }[] = [{ id: root, depth: 0 }];
  while (queue.length && files.length < 50_000) {
    const { id, depth } = queue.shift()!;
    let pageToken: string | undefined;
    do {
      const res = await drive('', {
        q: `'${id}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size)',
        pageSize: '1000',
        includeItemsFromAllDrives: 'true',
        ...(pageToken ? { pageToken } : {}),
      });
      if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
      const json = (await res.json()) as {
        nextPageToken?: string;
        files: { id: string; name: string; mimeType: string; size?: string }[];
      };
      for (const f of json.files) {
        if (f.mimeType === FOLDER_MIME) {
          if (depth < 12) queue.push({ id: f.id, depth: depth + 1 });
        } else if (isAudioFile(f.name)) {
          files.push({ id: f.id, name: f.name, size: f.size ? Number(f.size) : null });
        }
      }
      pageToken = json.nextPageToken;
    } while (pageToken);
  }
  return { folderName, files };
}

interface FileMeta {
  name: string;
  mimeType: string;
  size: number | null;
  parents: string[];
}
const metaCache = new Map<string, FileMeta>();

async function fileMeta(id: string): Promise<FileMeta | null> {
  const hit = metaCache.get(id);
  if (hit) return hit;
  const res = await drive(`/${encodeURIComponent(id)}`, {
    fields: 'name, mimeType, size, parents',
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    name: string;
    mimeType: string;
    size?: string;
    parents?: string[];
  };
  const m = {
    name: j.name,
    mimeType: j.mimeType,
    size: j.size ? Number(j.size) : null,
    parents: j.parents ?? [],
  };
  metaCache.set(id, m);
  return m;
}

/** True when the file sits somewhere under the audio folder, so no other shared file can be read. */
export async function inAudioFolder(id: string): Promise<FileMeta | null> {
  const root = (await audioFolder()).id;
  const meta = await fileMeta(id);
  if (!root || !meta || !isAudioFile(meta.name)) return null;
  let frontier = meta.parents;
  for (let depth = 0; depth < 14 && frontier.length; depth++) {
    if (frontier.includes(root)) return meta;
    const next: string[] = [];
    for (const p of frontier) next.push(...((await fileMeta(p))?.parents ?? []));
    frontier = next;
  }
  return null;
}

export async function fetchAudio(id: string, range: { start: number; end: number } | null) {
  return drive(
    `/${encodeURIComponent(id)}`,
    { alt: 'media' },
    {
      headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {},
    },
  );
}
