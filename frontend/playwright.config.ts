import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.BENCH_URL || 'http://videojet.localhost:8000',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  snapshotDir: './e2e/snapshots',
  reporter: [['list'], ['html', { open: 'never' }]],
})
