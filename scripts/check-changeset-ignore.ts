import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PUBLISHABLE_PACKAGES = [
  'foldkit',
  'create-foldkit-app',
  '@foldkit/vite-plugin',
  '@foldkit/devtools-mcp',
]

interface PnpmListEntry {
  readonly name: string
}

interface ChangesetConfig {
  readonly ignore: ReadonlyArray<string>
}

const listWorkspacePackages = (): ReadonlyArray<string> => {
  const output = execSync('pnpm ls -r --depth -1 --json', {
    encoding: 'utf8',
  })
  const entries = JSON.parse(output) as ReadonlyArray<PnpmListEntry>
  return entries.map(entry => entry.name)
}

const readIgnoreList = (): ReadonlyArray<string> => {
  const raw = readFileSync('.changeset/config.json', 'utf8')
  const config = JSON.parse(raw) as ChangesetConfig
  return config.ignore
}

const workspacePackages = listWorkspacePackages()
const ignoreList = readIgnoreList()

const missing = workspacePackages.filter(
  name =>
    !PUBLISHABLE_PACKAGES.includes(name) &&
    !ignoreList.includes(name) &&
    name !== 'foldkit-monorepo',
)

if (missing.length > 0) {
  console.error(
    'ERROR: The following packages are missing from .changeset/config.json ignore list:',
  )
  for (const name of missing) {
    console.error(`  - ${name}`)
  }
  console.error('')
  console.error(
    'Add them to .changeset/config.json or to PUBLISHABLE_PACKAGES in this script.',
  )
  console.error('Changeset ignore list is out of date.')
  process.exit(1)
}

console.log('Changeset ignore list is up to date.')
