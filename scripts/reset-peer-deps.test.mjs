import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FOLDKIT_FLOOR_MANIFESTS = [
  'packages/ui/package.json',
  'packages/devtools/package.json',
  'packages/devtools-mcp/package.json',
  'packages/markdown/package.json',
  'packages/vite-plugin-foldkit/package.json',
]

const runResetPeerDeps = () => {
  const result = spawnSync('npx', ['tsx', 'scripts/reset-peer-deps.ts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.equal(
    result.status,
    0,
    `reset-peer-deps.ts exited ${result.status}: ${result.stderr}`,
  )
}

const readManifest = path =>
  JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'))

// `version-packages` runs this script. Every Foldkit minimum must survive it.
test('leaves Foldkit peer floors alone', () => {
  const before = new Map(
    FOLDKIT_FLOOR_MANIFESTS.map(manifest => [
      manifest,
      readFileSync(resolve(REPO_ROOT, manifest), 'utf8'),
    ]),
  )

  try {
    runResetPeerDeps()

    for (const manifest of FOLDKIT_FLOOR_MANIFESTS) {
      const peer = readManifest(manifest).peerDependencies.foldkit
      assert.match(
        peer,
        /^>=\d+\.\d+\.\d+$/,
        `expected a ">=" floor in ${manifest}, got ${peer}`,
      )
    }
  } finally {
    for (const [manifest, contents] of before) {
      writeFileSync(resolve(REPO_ROOT, manifest), contents)
    }
  }
})

test('restores the broad range on packages that declare one', () => {
  const manifestPath = 'packages/devtools/package.json'
  const before = readFileSync(resolve(REPO_ROOT, manifestPath), 'utf8')

  try {
    const manifest = readManifest(manifestPath)
    manifest.peerDependencies['@foldkit/ui'] = '0.147.0'
    writeFileSync(
      resolve(REPO_ROOT, manifestPath),
      JSON.stringify(manifest, null, 2) + '\n',
    )

    runResetPeerDeps()

    assert.equal(
      readManifest(manifestPath).peerDependencies['@foldkit/ui'],
      'workspace:^0',
    )
  } finally {
    writeFileSync(resolve(REPO_ROOT, manifestPath), before)
  }
})
