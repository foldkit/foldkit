import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const workspace = '/private/tmp/foldkit-html-definition-twins-20261107'
const retained = '/private/tmp/foldkit-mount-iterative-20261107-32wcjI'
const harness = join(workspace, 'harness')
const driver = join(workspace, 'driver')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

assert(!existsSync(harness), `${harness} already exists`)
assert(!existsSync(driver), `${driver} already exists`)
cpSync(join(retained, 'harness'), harness, { recursive: true })
cpSync(join(retained, 'driver'), driver, { recursive: true })

const slots = [
  ['html-baseline-naive-a', 'baseline', 'naive'],
  ['html-candidate-naive', 'candidate', 'naive'],
  ['html-baseline-optimised-a', 'baseline', 'optimised'],
  ['html-candidate-optimised', 'candidate', 'optimised'],
  ['html-baseline-naive-b', 'baseline', 'naive'],
  ['html-baseline-optimised-b', 'baseline', 'optimised'],
]

const filesUnder = root => {
  const result = []
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) result.push(path)
    }
  }
  visit(root)
  return result.sort()
}

const slotRecords = {}
for (const [slot, tree, variant] of slots) {
  const source = join(workspace, tree, 'internal/lustre-benchmark/dist', variant)
  const target = join(harness, 'priv/implementations', slot, 'dist')
  assert(existsSync(source), source)
  assert(!existsSync(join(harness, 'priv/implementations', slot)), slot)
  mkdirSync(target, { recursive: true })
  cpSync(source, target, { recursive: true })
  const files = filesUnder(target).map(path => {
    const bytes = readFileSync(path)
    return {
      file: relative(target, path),
      bytes: bytes.length,
      gzipBytes: path.endsWith('.js') ? gzipSync(bytes).length : undefined,
      sha256: sha(bytes),
    }
  })
  slotRecords[slot] = { tree, variant, files }
}

assert.deepEqual(
  slotRecords['html-baseline-naive-a'].files,
  slotRecords['html-baseline-naive-b'].files,
)
assert.deepEqual(
  slotRecords['html-baseline-optimised-a'].files,
  slotRecords['html-baseline-optimised-b'].files,
)

const paths = {
  node: '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node',
  vitePackage: '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm/vite@8.3.5_@types+node@26.4.0_jiti@2.7.0_yaml@2.9.1/node_modules/vite/package.json',
  rolldownPackage: '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm/rolldown@1.2.15/node_modules/rolldown/package.json',
  rolldownBinding: '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm/@rolldown+binding-darwin-arm64@1.2.15/node_modules/@rolldown/binding-darwin-arm64/rolldown-binding.darwin-arm64.node',
  lockfile: join(workspace, 'baseline/pnpm-lock.yaml'),
  viteConfig: join(workspace, 'baseline/internal/lustre-benchmark/vite.config.ts'),
  aliases: join(workspace, 'baseline/examples/vite.aliases.ts'),
  baselineHtmlSource: join(workspace, 'baseline/packages/foldkit/src/html/index.ts'),
  candidateHtmlSource: join(workspace, 'candidate/packages/foldkit/src/html/index.ts'),
  driver: join(driver, 'run.mjs'),
  verifier: join(driver, 'verify.mjs'),
  buildRecipe: '/private/tmp/build-html-definition-twins.mjs',
}

const receipt = {
  schemaVersion: 1,
  completedAt: new Date().toISOString(),
  workspace,
  inheritedHarness: retained,
  timingStarted: false,
  slots: slotRecords,
  build: {
    invocation: [paths.node, '.../vite/bin/vite.js', 'build', '--mode', 'production'],
    environment: {
      NODE_ENV: null,
      VITE_USER_NODE_ENV: null,
      MODE: null,
      BUILD_VARIANT: 'unset for naive; optimised for optimised',
      CI: '1',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      NO_COLOR: '1',
    },
    resolvedConfig: {
      base: './',
      mode: 'production',
      target: 'es2022',
      minify: 'oxc',
      sourcemap: false,
      outDir: 'dist/<variant>',
      input: '<variant HTML entry>',
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash][extname]',
    },
  },
  inputs: Object.fromEntries(
    Object.entries(paths).map(([name, path]) => [
      name,
      { path, bytes: statSync(path).size, sha256: sha(readFileSync(path)) },
    ]),
  ),
  timingPlan: {
    implementations: slots.map(([slot]) => slot),
    runs: 12,
    retainedSamples: 72,
    cyclicOrdinalVisitsPerSlot: 2,
    timingStarted: false,
  },
}

writeFileSync(
  join(workspace, 'artifact-receipt.json'),
  `${JSON.stringify(receipt, null, 2)}\n`,
  { flag: 'wx' },
)
console.log(JSON.stringify({ slots: slots.map(([slot]) => slot), receipt: basename(join(workspace, 'artifact-receipt.json')) }, null, 2))
