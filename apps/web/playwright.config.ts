import { defineConfig, devices } from '@playwright/test';

/**
 * E2E lokal Fase 1:
 *   1. DATABASE_URL=postgres://kasir:kasir@localhost:5432/kasir_e2e pnpm --filter @kasir/api db:migrate
 *   2. pnpm --filter @kasir/web e2e
 * API dan web dijalankan otomatis oleh webServer di bawah.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @kasir/api exec tsx src/index.ts',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ?? 'postgres://kasir:kasir@localhost:5432/kasir_e2e',
        SESSION_SECRET: 'e2e-test-secret-minimal-32-karakter-aman',
        PORT: '8080',
      },
    },
    {
      command: 'pnpm --filter @kasir/web exec vite --port 5173 --strictPort',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: 'http://localhost:8080' },
    },
  ],
});
