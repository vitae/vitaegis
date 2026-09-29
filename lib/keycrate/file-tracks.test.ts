import { describe, expect, it } from 'vitest';
import { isFileTrack, newFileTracks, supersededFileTracks, trackFromFileName } from './file-tracks';
import { parseId3, readTags } from './tags';
import type { Track } from './types';

const real = (over: Partial<Track>): Track => ({
  id: 'rb:1',
  sourceId: '1',
  artist: 'Bicep',
  title: 'Glue',
  camelot: '8A',
  bpm: 130,
  durationS: 269,
  energy: null,
  rating: null,
  tags: [],
  ...over,
});

describe('trackFromFileName', () => {
  it('reads artist and title', () => {
    const t = trackFromFileName('Four Tet - Baby (Extended Mix).wav');
    expect(t).toMatchObject({ artist: 'Four Tet', title: 'Baby (Extended Mix)', camelot: null });
    expect(t.location).toBe('Four Tet - Baby (Extended Mix).wav');
    expect(isFileTrack(t)).toBe(true);
  });

  it('reads Mixed In Key style key and BPM', () => {
    expect(trackFromFileName('8A - 124 - Bicep - Glue.mp3')).toMatchObject({
      artist: 'Bicep',
      title: 'Glue',
      camelot: '8A',
      bpm: 124,
    });
    expect(trackFromFileName('01 - Bicep - Glue - 11B - 128bpm.wav')).toMatchObject({
      artist: 'Bicep',
      title: 'Glue',
      camelot: '11B',
      bpm: 128,
    });
  });

  it('keeps a bare title and gives the same file the same id', () => {
    const t = trackFromFileName('Untitled_Loop.wav');
    expect(t).toMatchObject({ artist: '', title: 'Untitled Loop' });
    expect(trackFromFileName('untitled_loop.WAV').id).toBe(t.id);
  });
});

describe('newFileTracks', () => {
  const files = [{ name: 'Bicep - Glue.wav' }, { name: 'Four Tet - Baby.wav' }];

  it('skips files an imported track already plays and files already added', () => {
    const added = newFileTracks(files, [
      real({ location: 'file://localhost/Music/Bicep - Glue.wav' }),
    ]);
    expect(added.map((t) => t.title)).toEqual(['Baby']);
    expect(newFileTracks(files, [real({}), ...added])).toEqual([]);
  });

  it('adds everything to an empty library', () => {
    expect(newFileTracks(files, [])).toHaveLength(2);
  });
});

describe('supersededFileTracks', () => {
  it('maps a file track to the imported track for the same file', () => {
    const file = trackFromFileName('Bicep - Glue.wav');
    const map = supersededFileTracks([
      file,
      real({ id: 'rb:9', location: 'C:/USB/Bicep - Glue.wav' }),
    ]);
    expect(map.get(file.id)).toBe('rb:9');
  });
});

/* ── Tags ──────────────────────────────────────────────────────────────── */

function frame(id: string, text: string): number[] {
  const body = [3, ...new TextEncoder().encode(text)];
  const n = body.length;
  return [...Array.from(id, (c) => c.charCodeAt(0)), 0, 0, 0, n, 0, 0, ...body];
}

function id3(frames: number[][]): Uint8Array {
  const body = frames.flat();
  const n = body.length;
  const size = [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];
  return new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, ...size, ...body]);
}

const tag = id3([
  frame('TPE1', 'Bicep'),
  frame('TIT2', 'Glue'),
  frame('TKEY', 'Am'),
  frame('TBPM', '130'),
]);

const reader = (bytes: Uint8Array) => async (s: number, e: number) => bytes.subarray(s, e);

describe('readTags', () => {
  it('parses ID3v2.4 text frames', () => {
    expect(parseId3(tag)).toEqual({ artist: 'Bicep', title: 'Glue', camelot: '8A', bpm: 130 });
  });

  it('reads the tag at the start of an MP3', async () => {
    const mp3 = new Uint8Array([...tag, 0xff, 0xfb, 0, 0]);
    expect(await readTags(reader(mp3), mp3.length)).toMatchObject({ camelot: '8A', bpm: 130 });
  });

  it('finds the id3 chunk after the audio in a WAV', async () => {
    const le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
    const chunk = (id: string, body: number[]) => [
      ...Array.from(id, (c) => c.charCodeAt(0)),
      ...le(body.length),
      ...body,
      ...(body.length & 1 ? [0] : []),
    ];
    const body = [
      ...Array.from('WAVE', (c) => c.charCodeAt(0)),
      ...chunk('fmt ', new Array(16).fill(0)),
      ...chunk('data', new Array(101).fill(128)),
      ...chunk('id3 ', Array.from(tag)),
    ];
    const wav = new Uint8Array([
      ...Array.from('RIFF', (c) => c.charCodeAt(0)),
      ...le(body.length),
      ...body,
    ]);
    expect(await readTags(reader(wav), wav.length)).toMatchObject({
      artist: 'Bicep',
      camelot: '8A',
      bpm: 130,
    });
  });

  it('gives nothing for an untagged file', async () => {
    const flac = new TextEncoder().encode('fLaC0000000000000000');
    expect(await readTags(reader(flac), flac.length)).toEqual({});
  });
});
