import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectLibraryFormat, parseLibraryText } from './library';
import { traktorKeyValue } from './traktor';

const TRAKTOR = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19"><HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
<COLLECTION ENTRIES="3">
<ENTRY MODIFIED_DATE="2026/9/1" TITLE="Foxtrot" ARTIST="Lumen &amp; Co">
<LOCATION DIR="/:Users/:dj/:Music/:" FILE="f.mp3" VOLUME="Macintosh HD" VOLUMEID="x"></LOCATION>
<ALBUM TITLE="Night Moves"></ALBUM>
<INFO BITRATE="320000" GENRE="Melodic House" LABEL="Afterlife" KEY="Dm" PLAYTIME="301" PLAYTIME_FLOAT="300.8" RANKING="204" IMPORT_DATE="2026/8/30"></INFO>
<TEMPO BPM="121.998" BPM_QUALITY="100"></TEMPO>
<MUSICAL_KEY VALUE="14"></MUSICAL_KEY>
<CUE_V2 NAME="AutoGrid" DISPL_ORDER="0" TYPE="4" START="12.5" LEN="0" REPEATS="-1" HOTCUE="0"></CUE_V2>
<CUE_V2 NAME="Drop" DISPL_ORDER="0" TYPE="0" START="64000" LEN="0" REPEATS="-1" HOTCUE="1"></CUE_V2>
</ENTRY>
<ENTRY TITLE="Golf -> Hotel" ARTIST="Idris K"><LOCATION DIR="\\:Music\\:" FILE="g.mp3" VOLUME="C:"></LOCATION><INFO GENRE="Techno"></INFO><TEMPO BPM="130"></TEMPO><MUSICAL_KEY VALUE="21"></MUSICAL_KEY></ENTRY>
<ENTRY TITLE="No Key" ARTIST="Vero"><INFO GENRE="House"></INFO></ENTRY>
</COLLECTION>
<PLAYLISTS><NODE TYPE="FOLDER" NAME="$ROOT"><SUBNODES COUNT="1"><NODE TYPE="PLAYLIST" NAME="Warm up"><PLAYLIST ENTRIES="1" TYPE="LIST" UUID="u"><ENTRY><PRIMARYKEY TYPE="TRACK" KEY="Macintosh HD/:Users/:dj/:Music/:f.mp3"></PRIMARYKEY></ENTRY></PLAYLIST></NODE></SUBNODES></NODE></PLAYLISTS>
</NML>`;

describe('traktorKeyValue', () => {
  it('maps 0–11 to major and 12–23 to minor', () => {
    expect(traktorKeyValue('0')).toBe('8B'); // C
    expect(traktorKeyValue('7')).toBe('9B'); // G
    expect(traktorKeyValue('12')).toBe('5A'); // Cm
    expect(traktorKeyValue('21')).toBe('8A'); // Am
    expect(traktorKeyValue('23')).toBe('10A'); // Bm
    expect(traktorKeyValue('24')).toBeNull();
    expect(traktorKeyValue(undefined)).toBeNull();
  });
});

describe('parseLibraryText', () => {
  it('reads a Traktor collection.nml', () => {
    const out = parseLibraryText('\uFEFF' + TRAKTOR);
    expect(out.format).toBe('traktor');
    expect(out.tracks).toHaveLength(3);
    const [fox, golf, nokey] = out.tracks;
    expect(fox).toMatchObject({
      artist: 'Lumen & Co',
      title: 'Foxtrot',
      album: 'Night Moves',
      camelot: '7A',
      bpm: 122,
      durationS: 301,
      genre: 'Melodic House',
      label: 'Afterlife',
      rating: 4,
      location: '/Users/dj/Music/f.mp3',
      addedAt: '2026-8-30',
    });
    expect(fox.cues).toEqual([{ name: 'Drop', start: 64, num: 1 }]);
    expect(golf).toMatchObject({ title: 'Golf -> Hotel', camelot: '8A', bpm: 130 });
    expect(nokey.camelot).toBeNull();
    expect(out.playlists).toEqual([{ name: 'Warm up', trackIds: [fox.id] }]);
  });

  it('gives Traktor tracks the same identity a CSV of them would get, so re-imports merge', () => {
    const again = parseLibraryText(TRAKTOR.replace('GENRE="Techno"', 'GENRE="Hard Techno"'));
    expect(again.tracks.map((t) => t.id)).toEqual(
      parseLibraryText(TRAKTOR).tracks.map((t) => t.id),
    );
  });

  it('detects the format from content, not the file name', () => {
    const fixture = readFileSync(join(process.cwd(), 'fixtures', 'keycrate-sample.xml'), 'utf8');
    expect(detectLibraryFormat(fixture)).toBe('rekordbox');
    expect(detectLibraryFormat(TRAKTOR)).toBe('traktor');
    expect(detectLibraryFormat('artist,title\nA,B\n')).toBe('csv');
    expect(parseLibraryText(fixture).tracks).toHaveLength(24);
  });

  it('explains files it cannot read', () => {
    expect(() => parseLibraryText('')).toThrow(/empty/);
    expect(() => parseLibraryText('<?xml version="1.0"?><plist><dict/></plist>')).toThrow(/iTunes/);
    expect(() => parseLibraryText('<foo/>')).toThrow(/rekordbox or Traktor/);
    expect(() =>
      parseLibraryText('<NML VERSION="19"><COLLECTION ENTRIES="0"></COLLECTION></NML>'),
    ).toThrow(/No tracks found in this Traktor/);
    expect(() => parseLibraryText('just some notes')).toThrow(/No tracks found/);
  });
});
