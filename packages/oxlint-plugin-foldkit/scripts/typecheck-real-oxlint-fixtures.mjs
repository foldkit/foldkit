import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, '..')
const repoRoot = join(packageRoot, '..', '..')

const result = spawnSync(
  process.execPath,
  [
    join(repoRoot, 'node_modules', '@typescript', 'native', 'bin', 'tsc'),
    '--project',
    join(packageRoot, 'tsconfig.real-oxlint-fixtures.json'),
  ],
  { stdio: 'inherit' },
)

if (result.error !== undefined) {
  throw result.error
}

process.exitCode = result.status ?? 1
