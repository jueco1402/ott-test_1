import { defineConfig } from '@playwright/test'
import process from 'node:process'
export default defineConfig({
  testDir: './tests', testMatch: 'sports.ui.spec.js', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {} },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI },
})
