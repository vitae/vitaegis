// Archive generated media to Google Drive with a service account.
//
// Verified against:
//   developers.google.com/identity/protocols/oauth2/service-account  (JWT bearer flow)
//   developers.google.com/workspace/drive/api/guides/manage-uploads  (multipart + resumable)
//
// A service account has no Drive of its own, so the destination folder must be shared
// with the account's email as Editor. Files then land in your Drive, owned by you.
import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
/** Google's own cutoff between multipart and resumable uploads. */
const MULTIPART_LIMIT = 5 * 1024 * 1024;

/**
 * Credentials come either as the whole downloaded JSON key in
 * GOOGLE_SERVICE_ACCOUNT_JSON, or as the two fields split out. The JSON is what
 * Google actually hands you, so prefer it.
 */
function credentials(): { email: string; key: string } | null {
  const blob = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (blob) {
    try {
      const j = JSON.parse(blob);
      if (j.client_email && j.private_key) return { email: j.client_email, key: j.private_key };
    } catch {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  return email && key ? { email, key } : null;
}

export const driveConfigured = () => Boolean(credentials() && process.env.GDRIVE_FOLDER_ID);

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Cached per scope until shortly before expiry; tokens last an hour. */
const cachedTokens = new Map<string, { token: string; expires: number }>();

async function accessToken(scope = SCOPE): Promise<string> {
  const cached = cachedTokens.get(scope);
  if (cached && cached.expires - 60 > Date.now() / 1000) return cached.token;

  const creds = credentials();
  if (!creds) throw new Error('No Google service account credentials set');
  const email = creds.email;
  // Vercel's UI turns real newlines into \n, so accept either form.
  const key = creds.key.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: email, scope, aud: TOKEN_URL, exp: now + 3600, iat: now }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key))}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Drive token failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }
  cachedTokens.set(scope, { token: json.access_token, expires: now + (json.expires_in ?? 3600) });
  return json.access_token as string;
}

/** Read-only token for files shared with the service account (KeyCrate's audio folder). */
export const driveReadToken = () => accessToken('https://www.googleapis.com/auth/drive.readonly');
export const driveCredentialsSet = () => Boolean(credentials());
/** The service account's address: folders shared with it become readable by the site. */
export const serviceAccountEmail = () => credentials()?.email ?? null;

export interface DriveFile {
  id: string;
  name: string;
  webViewLink?: string;
}

/** Small files: metadata and bytes in one multipart/related request. */
async function uploadMultipart(
  token: string,
  name: string,
  mimeType: string,
  bytes: Buffer,
  parents: string[],
) {
  const boundary = `vitaegis_${Date.now().toString(36)}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name, parents }) +
        `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    `${UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
      cache: 'no-store',
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`Drive upload failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json as DriveFile;
}

/** Anything over 5 MB, which is most Veo clips: open a session, then send the bytes. */
async function uploadResumable(
  token: string,
  name: string,
  mimeType: string,
  bytes: Buffer,
  parents: string[],
) {
  const start = await fetch(
    `${UPLOAD_URL}?uploadType=resumable&fields=id,name,webViewLink&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(bytes.length),
      },
      body: JSON.stringify({ name, parents }),
      cache: 'no-store',
    },
  );
  if (!start.ok)
    throw new Error(`Drive session failed: ${start.status} ${(await start.text()).slice(0, 200)}`);
  const location = start.headers.get('location');
  if (!location) throw new Error('Drive returned no resumable upload URL');

  const put = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType, 'Content-Length': String(bytes.length) },
    body: new Uint8Array(bytes),
    cache: 'no-store',
  });
  const json = await put.json().catch(() => ({}));
  if (!put.ok)
    throw new Error(`Drive upload failed: ${put.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json as DriveFile;
}

export async function uploadToDrive(
  name: string,
  mimeType: string,
  bytes: Buffer,
  folderId = process.env.GDRIVE_FOLDER_ID!,
): Promise<DriveFile> {
  const token = await accessToken();
  const parents = [folderId];
  return bytes.length > MULTIPART_LIMIT
    ? uploadResumable(token, name, mimeType, bytes, parents)
    : uploadMultipart(token, name, mimeType, bytes, parents);
}

/** A readable, sortable filename: date, subject, then the slide number. */
export function driveName(
  caption: string,
  kind: string,
  index: number,
  total: number,
  ext: string,
) {
  const date = new Date().toISOString().slice(0, 10);
  const slug =
    (caption || 'vitaegis')
      .split('\n')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'vitaegis';
  const suffix = total > 1 ? `-${index + 1}of${total}` : '';
  return `${date}-${slug}-${kind}${suffix}.${ext}`;
}
