import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/* Smoke: import the sample XML fixture, build a 5-track set, export rekordbox XML. */

test('import a rekordbox XML, build a five-track set, export it', async ({ page, isMobile }) => {
  await page.goto('/keycrate');
  await expect(page.getByRole('heading', { name: 'KeyCrate' })).toBeVisible();

  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');
  await expect(page.getByTestId('kc-library')).toContainText('Glue');

  // Filter to one key from the wheel, then clear it.
  await page.getByRole('button', { name: '8A, A minor' }).click();
  await expect(page.getByTestId('kc-library').getByTestId('kc-track')).toHaveCount(5);
  await page.getByRole('button', { name: 'Clear key filter' }).click();

  // Search and tap five tracks into the set.
  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby', 'Latch', 'Rev8617', 'Nanana']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  const openSheet = async () => {
    if (isMobile) await page.getByTestId('kc-open-sheet').click();
  };
  await openSheet();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(5);
  await expect(page.getByTestId('kc-transition')).toHaveCount(4);
  // Glue (8A) into Baby (8B) is the relative major.
  await expect(page.getByTestId('kc-transition').first()).toContainText('Relative');
  await expect(page.getByTestId('kc-suggestions')).toBeVisible();
  await expect(page.getByTestId('kc-suggestion').first()).toBeVisible();

  // Undo removes the last track, redo brings it back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(5);

  await page.getByTestId('kc-set-name').fill('Smoke set');
  await page.getByTestId('kc-save').click();
  await expect(page.getByTestId('kc-toast')).toContainText('Saved “Smoke set”');

  await page.getByTestId('kc-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('kc-export-xml').click(),
  ]);
  expect(download.suggestedFilename()).toBe('Smoke_set.xml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml).toContain('<NODE Name="Smoke set" Type="1"');
  expect(xml.match(/<TRACK Key="\d+"\/>/g)?.length).toBe(5);
  expect(xml).toContain('TrackID="1"');
});

test('selecting a playlist song suggests what follows it and inserts under it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The Next track list sits beside the playlist on desktop');
  await page.goto('/keycrate');
  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');

  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby', 'Latch']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  const rows = page.getByTestId('kc-playlist-row');
  await expect(rows).toHaveCount(3);

  // Pick the first song: suggestions now follow Glue.
  await rows.nth(0).getByRole('button', { name: 'Build after Glue' }).click();
  await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');
  const suggestions = page.getByTestId('kc-suggestions');
  await expect(suggestions).toContainText('After Glue');

  // A pick lands right under Glue and becomes the new selection, so picks chain.
  const pick = suggestions.getByTestId('kc-suggestion').first();
  const label = (await pick.getAttribute('aria-label')) ?? '';
  const title = label.replace(/^Add .+? – /, '').replace(/:.*$/, '');
  await pick.click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toContainText(title);
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(rows.nth(3)).toContainText('Latch');

  // Back to end: suggestions follow the last track again.
  await page.getByTestId('kc-anchor-clear').click();
  await expect(suggestions).not.toContainText('After Glue');
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'false');
});

/** A short silent 8 kHz mono WAV, so playback runs through to the end quickly. */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const data = Math.round(rate * seconds);
  const b = Buffer.alloc(44 + data);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(data, 40);
  b.fill(128, 44); // 8-bit silence
  return b;
}

test('when a playlist song ends, the next one plays', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Playback is the same on phones; the playlist layout differs');
  await page.goto('/keycrate');
  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');

  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  // The folder input only takes a directory, so write the two songs into one first.
  const dir = test.info().outputPath('music');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'Bicep - Glue.wav'), silentWav(1));
  writeFileSync(path.join(dir, 'Four Tet - Baby.wav'), silentWav(1));
  await page.getByTestId('kc-audio-files').setInputFiles(dir);
  await expect(page.getByTestId('kc-toast')).toContainText('Linked 2 audio files');

  const rows = page.getByTestId('kc-playlist-row');
  await rows.nth(0).getByRole('button', { name: 'Play Glue' }).click();
  const bar = page.getByTestId('kc-now-playing');
  await expect(bar).toContainText('Glue');
  // Glue is one second long; Baby follows without a click.
  await expect(bar).toContainText('Baby', { timeout: 10_000 });
  await expect(rows.nth(1).getByRole('button', { name: 'Pause Baby' })).toBeVisible();
});
