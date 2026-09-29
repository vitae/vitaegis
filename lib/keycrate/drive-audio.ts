import 'server-only';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { driveCredentialsSet, driveReadToken, serviceAccountEmail } from '@/lib/drive';
import { isAudioFile } from './audio';
import { FOLDER_MIME, parentsQuery, walkFolder } from './drive-walk';
import { userDriveToken, type UserDrive } from './google-user';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · audio from Google Drive
   Two ways in, tried in order:
   1. The DJ's own Drive: signed in with Google and allowed read-only Drive access,
      the folder named KEYCRATE_DRIVE_FOLDER_NAME (default "USB") in their Drive.
   2. The site's service account: a folder shared (Viewer) with it, or the one pinned
      by KEYCRATE_DRIVE_FOLDER_ID.
   The browser never gets a Google token: /api/keycrate/audio lists the folder and
   /api/keycrate/audio/[id] streams one file. Both need a signed-in KeyCrate user on
   KEYCRATE_ALLOWED_EMAILS, because the music is private.
   ═══════════════════════════════════════════════════════════════════════════════ */

const API = 'https://www.googleapis.com/drive/v3/files';

export const audioFolderName = () => process.env.KEYCRATE_DRIVE_FOLDER_NAME?.trim() || 'USB';

/** Thrown when no Drive can be read or the folder isn't there; the UI offers Google sign-in. */
export class NeedsDriveLoginError extends Error {}

/** Whose Drive the calls run as; `key` scopes the caches so one Drive never answers for another. */
export interface DriveAccess {
  key: string;
  token: string;
  mine: boolean;
  user?: UserDrive;
}

export type AudioAuth = { ok: true; email: string } | { ok: false; status: number; error: string };

/** The signed-in KeyCrate user from the Supabase session cookie, checked against the allowlist. */
export async function audioUser(req: NextRequest): Promise<AudioAuth> {
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

/** The user's own Drive when they've connected it, else the service account, else null. */
export async function driveAccess(req: NextRequest, email: string): Promise<DriveAccess | null> {
  const user = await userDriveToken(req, email);
  if (user) return { key: `user:${email}`, token: user.token, mine: true, user };
  if (driveCredentialsSet()) return { key: 'sa', token: await driveReadToken(), mine: false };
  return null;
}

function drive(
  access: DriveAccess,
  path: string,
  params: Record<string, string>,
  init?: RequestInit,
) {
  const q = new URLSearchParams({ supportsAllDrives: 'true', ...params });
  return fetch(`${API}${path}?${q}`, {
    ...init,
    headers: { Authorization: `Bearer ${access.token}`, ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
}

const folders = new Map<string, { id: string; name: string; at: number }>();

/**
 * The audio folder's id. With the user's Drive: their folder named "USB". With the service
 * account: KEYCRATE_DRIVE_FOLDER_ID, or the "USB" folder shared with it. Cached for 10 minutes
 * so a newly made or shared folder is picked up without a redeploy.
 */
export async function audioFolder(access: DriveAccess): Promise<{ id: string; name: string }> {
  const fixed = process.env.KEYCRATE_DRIVE_FOLDER_ID?.trim();
  if (fixed && !access.mine) return { id: fixed, name: '' };
  const hit = folders.get(access.key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit;
  const name = audioFolderName().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const res = await drive(access, '', {
    q: `name = '${name}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '10',
    includeItemsFromAllDrives: 'true',
  });
  if (!res.ok) throw new Error(`Drive search failed (${res.status})`);
  const found = ((await res.json()) as { files: { id: string; name: string }[] }).files[0];
  if (!found) {
    throw new NeedsDriveLoginError(
      access.mine
        ? `No folder named "${audioFolderName()}" in your Google Drive. Upload your USB folder there.`
        : `Sign in to Google Drive to play your "${audioFolderName()}" folder, or share it with ${serviceAccountEmail() ?? 'the site service account'} (Viewer).`,
    );
  }
  const entry = { id: found.id, name: found.name, at: Date.now() };
  folders.set(access.key, entry);
  return entry;
}

export interface DriveAudioFile {
  id: string;
  name: string;
  size: number | null;
}

/** Every audio file under the folder, recursively (subfolders like /Contents/Artist/Album). */
export async function listAudioFiles(
  access: DriveAccess,
): Promise<{ folderName: string; files: DriveAudioFile[]; mine: boolean }> {
  const root = await audioFolder(access);
  let folderName = root.name;
  if (!folderName) {
    const meta = await drive(access, `/${root.id}`, { fields: 'name' });
    if (!meta.ok)
      throw new Error(
        `Drive folder not reachable (${meta.status}). Share it with the service account.`,
      );
    folderName = ((await meta.json()) as { name?: string }).name ?? 'Google Drive';
  }

  const entries = await walkFolder(root.id, async (parents, pageToken) => {
    const res = await drive(access, '', {
      q: parentsQuery(parents),
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: '1000',
      includeItemsFromAllDrives: 'true',
      ...(pageToken ? { pageToken } : {}),
    });
    if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
    return (await res.json()) as {
      nextPageToken?: string;
      files: { id: string; name: string; mimeType: string; size?: string }[];
    };
  });
  const files = entries
    .filter((f) => isAudioFile(f.name))
    .map((f) => ({ id: f.id, name: f.name, size: f.size ? Number(f.size) : null }));
  return { folderName, files, mine: access.mine };
}

interface FileMeta {
  name: string;
  mimeType: string;
  size: number | null;
  parents: string[];
}
const metaCache = new Map<string, FileMeta>();

async function fileMeta(access: DriveAccess, id: string): Promise<FileMeta | null> {
  const cacheKey = `${access.key}:${id}`;
  const hit = metaCache.get(cacheKey);
  if (hit) return hit;
  const res = await drive(access, `/${encodeURIComponent(id)}`, {
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
  metaCache.set(cacheKey, m);
  return m;
}

/** True when the file sits somewhere under the audio folder, so no other file can be read. */
export async function inAudioFolder(access: DriveAccess, id: string): Promise<FileMeta | null> {
  const root = (await audioFolder(access)).id;
  const meta = await fileMeta(access, id);
  if (!root || !meta || !isAudioFile(meta.name)) return null;
  let frontier = meta.parents;
  for (let depth = 0; depth < 14 && frontier.length; depth++) {
    if (frontier.includes(root)) return meta;
    const next: string[] = [];
    for (const p of frontier) next.push(...((await fileMeta(access, p))?.parents ?? []));
    frontier = next;
  }
  return null;
}

export async function fetchAudio(
  access: DriveAccess,
  id: string,
  range: { start: number; end: number } | null,
) {
  return drive(
    access,
    `/${encodeURIComponent(id)}`,
    { alt: 'media' },
    {
      headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {},
    },
  );
}
