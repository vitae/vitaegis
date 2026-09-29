/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · reading key / BPM / artist / title from an audio file's tags
   ID3v2 (TKEY, TBPM, TPE1, TIT2), which rekordbox, Mixed In Key and most taggers
   write: at the start of an MP3, or in an "id3 " chunk of a WAV or AIFF. Reads go
   through `read(start, end)` so a Drive file costs a few small byte ranges, not a
   download of the whole WAV.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeKey } from './camelot';
import type { Camelot } from './types';

export type ReadRange = (start: number, end: number) => Promise<Uint8Array>;

export interface FileTags {
  artist?: string;
  title?: string;
  camelot?: Camelot;
  bpm?: number;
}

/** Largest tag read: artwork can make tags big, and the text frames come first anyway. */
const MAX_TAG = 1024 * 1024;

const ascii = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...Array.from(b.subarray(at, at + n)));
const syncsafe = (b: Uint8Array, at: number) =>
  ((b[at] & 0x7f) << 21) |
  ((b[at + 1] & 0x7f) << 14) |
  ((b[at + 2] & 0x7f) << 7) |
  (b[at + 3] & 0x7f);
const u32be = (b: Uint8Array, at: number) =>
  ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3];
const u32le = (b: Uint8Array, at: number) =>
  b[at] + (b[at + 1] << 8) + (b[at + 2] << 16) + ((b[at + 3] << 24) >>> 0);

function decodeText(b: Uint8Array): string {
  if (!b.length) return '';
  const enc = b[0];
  const body = b.subarray(1);
  let s: string;
  if (enc === 1 || enc === 2) {
    let le = enc === 1;
    let data = body;
    if (enc === 1 && data.length >= 2) {
      if (data[0] === 0xff && data[1] === 0xfe) data = data.subarray(2);
      else if (data[0] === 0xfe && data[1] === 0xff) {
        le = false;
        data = data.subarray(2);
      }
    }
    s = new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(data);
  } else if (enc === 3) s = new TextDecoder('utf-8').decode(body);
  else s = new TextDecoder('latin1').decode(body);
  // Multiple values are NUL-separated; the first one is the one to show.
  return s.split('\u0000')[0].trim();
}

/** Parses an ID3v2 tag (header included). */
export function parseId3(tag: Uint8Array): FileTags {
  if (tag.length < 10 || ascii(tag, 0, 3) !== 'ID3') return {};
  const major = tag[3];
  const size = Math.min(syncsafe(tag, 6), tag.length - 10);
  const flags = tag[5];
  let pos = 10;
  // Skip an extended header.
  if (flags & 0x40 && major >= 3) pos += major === 4 ? syncsafe(tag, 10) : u32be(tag, 10) + 4;
  const end = 10 + size;
  const frames: Record<string, string> = {};
  const idLen = major === 2 ? 3 : 4;
  const headLen = major === 2 ? 6 : 10;
  while (pos + headLen <= end) {
    const id = ascii(tag, pos, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break;
    const len =
      major === 2
        ? (tag[pos + 3] << 16) | (tag[pos + 4] << 8) | tag[pos + 5]
        : major === 4
          ? syncsafe(tag, pos + 4)
          : u32be(tag, pos + 4);
    const body = tag.subarray(pos + headLen, pos + headLen + len);
    if (id[0] === 'T' && !(id in frames)) frames[id] = decodeText(body);
    pos += headLen + len;
  }
  const out: FileTags = {};
  const artist = frames.TPE1 ?? frames.TP1;
  const title = frames.TIT2 ?? frames.TT2;
  const key = frames.TKEY ?? frames.TKE;
  const bpm = Number((frames.TBPM ?? frames.TBP ?? '').replace(',', '.'));
  if (artist) out.artist = artist;
  if (title) out.title = title;
  const camelot = key ? normalizeKey(key) : null;
  if (camelot) out.camelot = camelot;
  if (bpm >= 40 && bpm <= 250) out.bpm = Math.round(bpm * 100) / 100;
  return out;
}

async function id3At(read: ReadRange, at: number, limit: number): Promise<FileTags> {
  const head = await read(at, at + 10);
  if (head.length < 10 || ascii(head, 0, 3) !== 'ID3') return {};
  const len = Math.min(10 + syncsafe(head, 6), limit, MAX_TAG);
  return parseId3(await read(at, at + len));
}

/** Walks RIFF (WAV, little-endian) or FORM (AIFF, big-endian) chunks to the ID3 chunk. */
async function chunkedId3(read: ReadRange, size: number, bigEndian: boolean): Promise<FileTags> {
  let pos = 12;
  for (let i = 0; i < 32 && pos + 8 <= size; i++) {
    const h = await read(pos, pos + 8);
    if (h.length < 8) break;
    const id = ascii(h, 0, 4);
    const len = bigEndian ? u32be(h, 4) : u32le(h, 4);
    if (id === 'id3 ' || id === 'ID3 ' || id === 'ID32') return id3At(read, pos + 8, len);
    pos += 8 + len + (len & 1);
  }
  return {};
}

/** Reads tags from an MP3, WAV or AIFF; other formats (and untagged files) give {}. */
export async function readTags(read: ReadRange, size: number | null): Promise<FileTags> {
  const head = await read(0, 12);
  if (head.length < 12) return {};
  const magic = ascii(head, 0, 4);
  if (ascii(head, 0, 3) === 'ID3') return id3At(read, 0, size ?? MAX_TAG);
  if (size === null) return {};
  if (magic === 'RIFF' && ascii(head, 8, 4) === 'WAVE') return chunkedId3(read, size, false);
  if (magic === 'FORM' && /^AIF[FC]$/.test(ascii(head, 8, 4))) return chunkedId3(read, size, true);
  return {};
}
