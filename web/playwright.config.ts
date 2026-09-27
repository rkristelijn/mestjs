import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config for the mestjs web frontend.
 *
 * The web app is a Next.js (App Router, MUI + Toolpad + TanStack Query) UI that
 * talks to the NestJS API. We run `next dev` (NOT `next build`) on purpose:
 * the production build has a known, pre-existing prerender error on /_not-found,
 * while `next dev` serves every route fine.
 *
 * Ports:
 *   - The NestJS API listens on :3000 (routes under /api).
 *   - To avoid clashing with the API we serve the web UI on :3100.
 *   - The web client defaults its API base to http://localhost:3000/api, so if
 *     you want the happy-path data (GET /api/items) to load, start the API too:
 *         cd ~/git/hub/mestjs && npx nx serve api
 *     The happy-path spec is written to pass WITHOUT the API running (it asserts
 *     the UI shell renders — form + table container — not live data rows).
 */

const WEB_PORT = Number(process.env.WEB_PORT ?? 3100);
const BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // No browser install with a system channel — use the bundled chromium build.
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `next dev` — dev server works; production build has a known /_not-found
    // prerender error, so we deliberately avoid `next build`.
    command: `pnpm exec next dev --port ${WEB_PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
