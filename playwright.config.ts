import { defineConfig, devices } from '@playwright/test';

// Set E2E_PORT to run several worktrees' e2e suites at once without clashing.
// With an explicit port we always start our own server, so a server from
// another worktree on that port is never silently reused.
const PORT = Number(process.env.E2E_PORT ?? 5179);
const portOverridden = process.env.E2E_PORT !== undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI && !portOverridden,
  },
});
