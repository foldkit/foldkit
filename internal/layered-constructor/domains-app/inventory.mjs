import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const source = JSON.parse(
  readFileSync(join(root, 'provenance/source.json'), 'utf8'),
)
const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'declarations',
  'build',
  'test-results',
  'playwright-report',
  '.relocated',
  '.mutation',
  '.verify',
  '.wrangler',
  '.git',
  '.vite',
  '.alchemy',
])
const files = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignoredDirectories.has(entry.name) || entry.isSymbolicLink()) {
      return []
    }

    const path = join(directory, entry.name)

    return entry.isDirectory() ? files(path) : [relative(root, path)]
  })
const hash = path =>
  createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex')
const unchanged = []
const modified = []
const absent = []

for (const [path, expected] of Object.entries(source.sha256)) {
  if (!existsSync(join(root, path))) {
    absent.push(path)
  } else if (hash(path) === expected) {
    unchanged.push(path)
  } else {
    modified.push(path)
  }
}

const inventory = {
  originalCommit: source.commit,
  appImplementationModified: modified.filter(
    path => path.startsWith('src/') && !path.endsWith('.test.ts'),
  ),
  appImplementationAdded: ['src/client/children.ts'],
  testsAdaptedForLayerOwnedConstruction: modified.filter(path =>
    path.endsWith('.test.ts'),
  ),
  unchangedSource: unchanged.filter(path => path.startsWith('src/')),
  unchangedBrowserAssertions: unchanged.filter(path => path.startsWith('e2e/')),
  otherModified: modified.filter(path => !path.startsWith('src/')),
  originalFilesMoved: absent.map(path => ({
    from: path,
    to: `provenance/${path.replace('pnpm-lock.yaml', 'pnpm-lock.original.yaml')}`,
  })),
  added: files(root).filter(
    path => !(path in source.sha256) && path !== 'migration-inventory.json',
  ),
  preservedUiPatch: {
    path: 'patches/@foldkit__ui@0.169.0-canary.90746b32d2ca.patch',
    unchanged: unchanged.includes(
      'patches/@foldkit__ui@0.169.0-canary.90746b32d2ca.patch',
    ),
    application:
      'Not applied twice; equivalent fixes are in the isolated UI source.',
  },
  originalCopiedFileCount: unchanged.length + modified.length + absent.length,
  unchangedCopiedFileCount: unchanged.length,
}

writeFileSync(
  join(root, 'migration-inventory.json'),
  `${JSON.stringify(inventory, null, 2)}\n`,
)
console.log(
  `Migration inventory: ${inventory.appImplementationModified.length} implementation files changed, one adapter module added, ${inventory.testsAdaptedForLayerOwnedConstruction.length} test files adapted, ${inventory.unchangedSource.length} source files unchanged.`,
)
