/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · walking a Drive folder tree fast
   A copied rekordbox USB has a Contents/Artist/Album folder for nearly every album,
   so one Drive call per folder meant thousands of calls and a timed-out request.
   Here each call asks for the children of up to BATCH folders at once
   ("'a' in parents or 'b' in parents …") and PARALLEL calls run together.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Folder ids per query: keeps the URL well under Drive's length limit. */
export const BATCH = 40;
/** Queries in flight at once. */
export const PARALLEL = 6;

export interface DriveEntry {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

/** One page of the children of `parents`. */
export type ListChildren = (
  parents: string[],
  pageToken?: string,
) => Promise<{ files: DriveEntry[]; nextPageToken?: string }>;

export function parentsQuery(parents: string[]): string {
  return `(${parents.map((p) => `'${p}' in parents`).join(' or ')}) and trashed = false`;
}

/** Every non-folder file under `root`, down to `maxDepth` levels, stopping at `maxFiles`. */
export async function walkFolder(
  root: string,
  list: ListChildren,
  { maxDepth = 12, maxFiles = 50_000 }: { maxDepth?: number; maxFiles?: number } = {},
): Promise<DriveEntry[]> {
  const files: DriveEntry[] = [];
  const seen = new Set([root]);
  let level = [root];
  for (let depth = 0; level.length && depth <= maxDepth && files.length < maxFiles; depth++) {
    const batches: string[][] = [];
    for (let i = 0; i < level.length; i += BATCH) batches.push(level.slice(i, i + BATCH));
    const next: string[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < batches.length) {
        const batch = batches[cursor++];
        let pageToken: string | undefined;
        do {
          const page = await list(batch, pageToken);
          for (const f of page.files) {
            if (f.mimeType === FOLDER_MIME) {
              // A folder can sit in several parents; walk it once.
              if (!seen.has(f.id)) {
                seen.add(f.id);
                next.push(f.id);
              }
            } else files.push(f);
          }
          pageToken = page.nextPageToken;
        } while (pageToken && files.length < maxFiles);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));
    level = next;
  }
  return files.slice(0, maxFiles);
}
