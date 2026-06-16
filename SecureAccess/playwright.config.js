// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for the ServeQueue (SecureAccess) web build.
 *
 * Tests run against the exported Expo web bundle in dist/, served by a tiny
 * zero-dependency static server (e2e/static-server.js) on port 8081 — the same
 * port Electron uses in dev, and the same bundle shipped inside the desktop app.
 *
 * The backend is mocked per-test via page.route(), so no live API/DB is needed.
 *
 * Prereq: build the web bundle first → `npm run build:web` (or `npm run test:e2e`
 * which is wired to do nothing extra; build manually if dist/ is stale).
 */
const PORT = 8081;
const baseURL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node e2e/static-server.js',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
