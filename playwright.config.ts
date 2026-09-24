import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3111);

// A machine with a pre-installed Chromium (PW_CHROMIUM, or the cloud sandbox default) skips the download.
const chromium = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(chromium) ? { executablePath: chromium } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/keycrate`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
