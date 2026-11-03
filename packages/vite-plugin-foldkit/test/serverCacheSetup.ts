import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'

const CLEANUP_RETRIES = 5
const CLEANUP_RETRY_DELAY = 100

export const setup = (project: TestProject) => {
  const cacheRoot = mkdtempSync(join(tmpdir(), 'foldkit-vite-test-cache-'))

  project.provide('serverCacheRoot', cacheRoot)

  // NOTE: Vite optimizer writes can outlive server.close(). Retain their caches
  // until the test runner's workers have exited.
  process.once('exit', () =>
    rmSync(cacheRoot, {
      recursive: true,
      force: true,
      maxRetries: CLEANUP_RETRIES,
      retryDelay: CLEANUP_RETRY_DELAY,
    }),
  )
}
