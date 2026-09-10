import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from './lib/workspace-packages.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pnpm = process.env['FOLDKIT_PNPM_EXECUTABLE'] ?? 'pnpm'
const packages = publicWorkspacePackages(readWorkspacePackages(REPO_ROOT))
const filters = packages.flatMap(pkg => ['--filter', pkg.packageJson.name])
const result = spawnSync(pnpm, [...filters, 'build'], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
