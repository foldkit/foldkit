import { defineConfig, devices } from '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.js'

const root = '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103'
const port = 38662

export default defineConfig({
  testDir: `${root}/packages/website/e2e`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  globalSetup: `${root}/packages/website/e2e/globalSetup.ts`,
  webServer: {
    command: `/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node ${root}/node_modules/.pnpm/vite@8.3.5_@types+node@26.4.0_jiti@2.7.0_yaml@2.9.1/node_modules/vite/bin/vite.js --port ${port} --strictPort`,
    cwd: `${root}/packages/website`,
    url: `http://localhost:${port}/theme-init.js`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
