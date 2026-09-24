import { expect, test } from '@playwright/test';
import path from 'node:path';

/* Smoke: import the sample XML fixture, build a 5-track set, export rekordbox XML. */

test('import a rekordbox XML, build a five-track set, export it', async ({ page, isMobile }) => {
  await page.goto('/keycrate');
  await expect(page.getByRole('heading', { name: 'KeyCrate' })).toBeVisible();

  await page.getByTestId('kc-file').setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
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
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('kc-export-xml').click()]);
  expect(download.suggestedFilename()).toBe('Smoke_set.xml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml).toContain('<NODE Name="Smoke set" Type="1"');
  expect(xml.match(/<TRACK Key="\d+"\/>/g)?.length).toBe(5);
  expect(xml).toContain('TrackID="1"');
});
