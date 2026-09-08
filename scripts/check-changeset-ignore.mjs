import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readWorkspacePackages } from './lib/workspace-packages.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(
  readFileSync(resolve(REPO_ROOT, '.changeset/config.json'), 'utf8'),
)
const ignored = new Set(config.ignore)
const workspacePackages = readWorkspacePackages(REPO_ROOT)
const missing = workspacePackages.filter(
  pkg =>
    pkg.packageJson.private === true &&
    pkg.packageJson.name !== 'foldkit-monorepo' &&
    !ignored.has(pkg.packageJson.name),
)

if (missing.length > 0) {
  console.error(
    'ERROR: The following private workspace packages are missing from the Changesets ignore list:',
  )
  for (const pkg of missing) {
    console.error(`  - ${pkg.packageJson.name}`)
  }
  console.error('')
  console.error('Changeset ignore list is out of date.')
  process.exit(1)
}

console.log('Changeset ignore list is up to date.')
