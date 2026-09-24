import { describe, expect, it } from 'vitest';
import { audioMime, buildAudioIndex, CHUNK, findAudio, isAudioFile, planRange } from './audio';
import type { Track } from './types';

const t = (artist: string, title: string, location?: string): Track => ({
  id: `${artist}|${title}`,
  sourceId: title,
  artist,
  title,
  camelot: '8A',
  bpm: 124,
  durationS: 300,
  energy: null,
  rating: null,
  tags: [],
  location,
});

const files = [
  'Contents/Bicep/Isles/Glue.wav',
  'Contents/Overmono/So U Kno.WAV',
  'Music/01 - Four Tet - Baby.aiff',
  'Music/Disclosure_Latch (Extended Mix).mp3',
  'Music/._Glue.wav',
  'Music/cover.jpg',
  'A/Intro.wav',
  'B/Intro.wav',
].map((path) => ({ name: path.split('/').pop()!, file: path }));
const index = buildAudioIndex(files);

describe('audio linking', () => {
  it('ignores non-audio files and macOS resource forks', () => {
    expect(isAudioFile('Glue.wav')).toBe(true);
    expect(isAudioFile('._Glue.wav')).toBe(false);
    expect(isAudioFile('cover.jpg')).toBe(false);
    expect(index.count).toBe(6);
  });

  it('matches by the file name in the library location, whatever the folder', () => {
    expect(findAudio(t('Bicep', 'Glue', '/Users/dj/Music/Glue.wav'), index)).toBe(
      'Contents/Bicep/Isles/Glue.wav',
    );
    expect(findAudio(t('Overmono', 'So U Kno', 'C:/Music/so u kno.wav'), index)).toBe(
      'Contents/Overmono/So U Kno.WAV',
    );
    expect(findAudio(t('Overmono', 'So U Kno', 'C:/Music/So%20U%20Kno.wav'), index)).toBe(
      'Contents/Overmono/So U Kno.WAV',
    );
  });

  it('falls back to artist and title in the file name', () => {
    expect(findAudio(t('Four Tet', 'Baby'), index)).toBe('Music/01 - Four Tet - Baby.aiff');
    expect(findAudio(t('Disclosure', 'Latch (Extended Mix)'), index)).toBe(
      'Music/Disclosure_Latch (Extended Mix).mp3',
    );
    expect(findAudio(t('', 'Four Tet - Baby'), index)).toBe('Music/01 - Four Tet - Baby.aiff');
  });

  it('refuses ambiguous names and unknown tracks', () => {
    expect(findAudio(t('Someone', 'Intro', '/x/Intro.wav'), index)).toBeNull();
    expect(findAudio(t('Nobody', 'Nothing'), index)).toBeNull();
  });
});

describe('streaming ranges', () => {
  const MB = 1024 * 1024;
  it('caps open-ended ranges to 8 MB slices and clamps to the file', () => {
    expect(planRange('bytes=0-', 100 * MB)).toEqual({ start: 0, end: CHUNK - 1 });
    expect(planRange('bytes=96000000-', 100 * MB)).toEqual({
      start: 96000000,
      end: Math.min(96000000 + CHUNK, 100 * MB) - 1,
    });
    expect(planRange('bytes=0-1', 100 * MB)).toEqual({ start: 0, end: 1 });
    expect(planRange('bytes=-500', 1000)).toEqual({ start: 500, end: 999 });
  });
  it('rejects unsatisfiable ranges and passes no-range through', () => {
    expect(planRange(null, 1000)).toBeNull();
    expect(planRange('bytes=2000-', 1000)).toBe('invalid');
    expect(planRange('items=0-1', 1000)).toBe('invalid');
  });
  it('picks a playable content type', () => {
    expect(audioMime('Glue.WAV', 'audio/x-wav')).toBe('audio/wav');
    expect(audioMime('x.flac', 'application/octet-stream')).toBe('audio/flac');
  });
});

describe('WAV, FLAC and MP3', () => {
  it('recognises all three, in any case', () => {
    for (const n of ['a.wav', 'a.WAV', 'a.flac', 'a.FLAC', 'a.mp3', 'a.Mp3'])
      expect(isAudioFile(n)).toBe(true);
    expect(audioMime('a.flac', '')).toBe('audio/flac');
    expect(audioMime('a.mp3', '')).toBe('audio/mpeg');
    expect(audioMime('a.wav', '')).toBe('audio/wav');
  });

  it('prefers WAV, then FLAC, then MP3 when a song is there in several formats', () => {
    const mixed = buildAudioIndex(
      [
        'Bicep - Glue.mp3',
        'Bicep - Glue.wav',
        'Bicep - Glue.flac',
        'Overmono - So U Kno.mp3',
        'Overmono - So U Kno.flac',
        'Four Tet - Baby.mp3',
      ].map((name) => ({ name, file: name })),
    );
    expect(findAudio(t('Bicep', 'Glue'), mixed)).toBe('Bicep - Glue.wav');
    expect(findAudio(t('Overmono', 'So U Kno'), mixed)).toBe('Overmono - So U Kno.flac');
    expect(findAudio(t('Four Tet', 'Baby'), mixed)).toBe('Four Tet - Baby.mp3');
  });

  it('finds the WAV when the library points at an MP3 of the same song', () => {
    const idx = buildAudioIndex([{ name: 'Bicep - Glue.wav', file: 'wav' }]);
    expect(
      findAudio(t('Bicep', 'Glue', 'file://localhost/Users/dj/Music/Bicep%20-%20Glue.mp3'), idx),
    ).toBe('wav');
  });

  it('plays the exact file the library names when it is there', () => {
    const idx = buildAudioIndex([
      { name: 'Bicep - Glue.wav', file: 'wav' },
      { name: 'Bicep - Glue.mp3', file: 'mp3' },
    ]);
    expect(findAudio(t('Bicep', 'Glue', '/Music/Bicep - Glue.mp3'), idx)).toBe('mp3');
  });
});
