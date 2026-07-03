import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/app/',
  plugins: [vue()],
  resolve: {
    conditions: ['browser'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    // Playwright specs under e2e/ are driven by `playwright test`, not Vitest.
    // Without this exclude, Vitest tries to collect them and fails on the
    // '@playwright/test' import.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
