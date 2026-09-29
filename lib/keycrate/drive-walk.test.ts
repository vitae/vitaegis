import { describe, expect, it } from 'vitest';
import { BATCH, FOLDER_MIME, parentsQuery, walkFolder, type DriveEntry } from './drive-walk';

/** A USB-style tree: root/Contents/Artist N/Album N/track.wav. */
function usbTree(artists: number) {
  const children = new Map<string, DriveEntry[]>();
  const add = (parent: string, e: DriveEntry) =>
    children.set(parent, [...(children.get(parent) ?? []), e]);
  add('root', { id: 'contents', name: 'Contents', mimeType: FOLDER_MIME });
  for (let a = 0; a < artists; a++) {
    add('contents', { id: `artist${a}`, name: `Artist ${a}`, mimeType: FOLDER_MIME });
    add(`artist${a}`, { id: `album${a}`, name: `Album ${a}`, mimeType: FOLDER_MIME });
    add(`album${a}`, { id: `track${a}`, name: `Artist ${a} - Song.wav`, mimeType: 'audio/wav' });
  }
  return children;
}

describe('walkFolder', () => {
  it('finds every file with far fewer calls than one per folder', async () => {
    const tree = usbTree(1000);
    let calls = 0;
    const files = await walkFolder('root', async (parents, pageToken) => {
      calls++;
      expect(parents.length).toBeLessThanOrEqual(BATCH);
      const all = parents.flatMap((p) => tree.get(p) ?? []);
      // Pages of 1000, like Drive.
      const start = pageToken ? Number(pageToken) : 0;
      const next = start + 1000;
      return {
        files: all.slice(start, next),
        nextPageToken: next < all.length ? String(next) : undefined,
      };
    });
    expect(files).toHaveLength(1000);
    // 2,002 folders: the old walk made 2,002 calls.
    expect(calls).toBeLessThan(80);
  });

  it('walks a folder that sits in two parents once', async () => {
    const shared: DriveEntry = { id: 'shared', name: 'Shared', mimeType: FOLDER_MIME };
    const tree = new Map<string, DriveEntry[]>([
      [
        'root',
        [
          { id: 'a', name: 'A', mimeType: FOLDER_MIME },
          { id: 'b', name: 'B', mimeType: FOLDER_MIME },
        ],
      ],
      ['a', [shared]],
      ['b', [shared]],
      ['shared', [{ id: 'f', name: 'x.wav', mimeType: 'audio/wav' }]],
    ]);
    const files = await walkFolder('root', async (parents) => ({
      files: parents.flatMap((p) => tree.get(p) ?? []),
    }));
    expect(files.map((f) => f.id)).toEqual(['f']);
  });

  it('builds an OR query over the parents', () => {
    expect(parentsQuery(['a', 'b'])).toBe("('a' in parents or 'b' in parents) and trashed = false");
  });
});
