import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

/** A port of its own, so the e2e run never reuses a dev server started with other settings. */
const PORT = Number(process.env.E2E_PORT ?? 5179);
const baseURL = `http://localhost:${PORT}`;

/** The app under test always talks to the emulators (project demo-todo), whatever `.env.local` holds. */
const demoEnv = parseEnv(readFileSync('.env.ci', 'utf8')) as Record<string, string>;
const inherited = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  testDir: 'e2e',
  // The tests share one set of emulators and reset them, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: baseURL,
    // Environment variables set before Vite starts win over every .env file.
    env: { ...inherited, ...demoEnv },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
