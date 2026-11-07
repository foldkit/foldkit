import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const workspace = '/private/tmp/foldkit-record-release-rendering-xpwmm820'
const repository = '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103'
const candidate = join(workspace, 'candidate')
const main = join(workspace, 'main')
const harness = join(workspace, 'harness')
const sha = value => createHash('sha256').update(value).digest('hex')
const files = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const path = join(root, entry.name)
  return entry.isDirectory() ? files(path) : [path]
})
const inventory = (root, paths) => paths.map(file => ({ file, sha256: sha(readFileSync(join(root, file))) }))
const digest = rows => sha([...rows].sort((left, right) => left.file < right.file ? -1 : 1).map(row => `${row.file}\0${row.sha256}\n`).join(''))
const source = JSON.parse(readFileSync(join(candidate, 'source.json')))
const sourceInputs = source.files.map(({ file, sha256 }) => ({ file, sha256 }))
for (const row of sourceInputs) {
  assert.equal(sha(readFileSync(join(candidate, row.file))), row.sha256)
  assert.equal(sha(readFileSync(join(repository, row.file))), row.sha256)
}
const preparationBytes = readFileSync(join(workspace, 'preparation.json'))
const preparation = JSON.parse(preparationBytes)
const userHarness = '/Users/devinjameson/Repos/lustre-benchmark'
const archive = execFileSync('git', ['archive', preparation.harnessRevision], { cwd: userHarness, maxBuffer: 128 * 1024 * 1024 })
assert.equal(sha(archive), preparation.harnessArchiveSHA256)
const harnessNames = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', preparation.harnessRevision], { cwd: userHarness }).toString().split('\0').filter(Boolean)
const harnessFiles = inventory(harness, harnessNames)
const mainCommit = source.mainCommit
const mainEntries = execFileSync('git', ['ls-tree', '-r', '-z', mainCommit, '--', 'packages/foldkit/src', 'packages/vite-plugin-foldkit/src', 'packages/foldkit/package.json', 'packages/vite-plugin-foldkit/package.json'], { cwd: repository }).toString().split('\0').filter(Boolean)
const mainSource = mainEntries.map(entry => {
  const [, mode, kind, expected, file] = /^(\d+) (\S+) ([a-f0-9]+)\t(.+)$/.exec(entry)
  assert.equal(kind, 'blob')
  const bytes = readFileSync(join(main, file))
  const object = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  assert.equal(object, expected, `Main source mismatch: ${file}`)
  return { file, sha256: sha(bytes), gitBlob: expected }
})
const artifactChecks = ['foldkit', 'vite-plugin-foldkit'].map(component => {
  const relative = `packages/${component}`
  const canonicalRoot = join(repository, relative)
  const frozenRoot = join(candidate, relative)
  const names = ['package.json', ...files(join(canonicalRoot, 'dist')).map(file => file.slice(canonicalRoot.length + 1))]
  const rows = inventory(canonicalRoot, names)
  for (const row of rows) assert.equal(sha(readFileSync(join(frozenRoot, row.file))), row.sha256)
  return { component, canonicalRoot, frozenRoot, files: rows, sha256: digest(rows) }
})
const configurations = [
  ['foldkit-main', 'main-naive', main, 'naive'],
  ['foldkit-preview-final', 'candidate-naive', candidate, 'naive'],
  ['foldkit-main-optimised', 'main-optimized', main, 'optimised'],
  ['foldkit-preview-final-optimised', 'candidate-optimized', candidate, 'optimised'],
]
const slots = Object.fromEntries(configurations.map(([slot, role, root, variant]) => {
  const sourceRoot = join(root, 'internal/lustre-benchmark/dist', variant)
  const target = join(harness, 'priv/implementations', slot, 'dist')
  assert(!existsSync(target), `Refusing to overwrite slot ${target}`)
  cpSync(sourceRoot, target, { recursive: true })
  const optimizedEntry = join(target, 'index.optimised.html')
  if (existsSync(optimizedEntry)) renameSync(optimizedEntry, join(target, 'index.html'))
  assert(existsSync(join(target, 'index.html')))
  return [slot, { role, files: files(target).map(path => {
    const bytes = readFileSync(path)
    return { file: path.slice(target.length + 1), sha256: sha(bytes), bytes: bytes.length, gzipBytes: gzipSync(bytes).length }
  }) }]
}))
for (const name of ['todo.ts', 'view.optimised.ts']) {
  assert.equal(sha(readFileSync(join(candidate, 'internal/lustre-benchmark/src', name))), sha(readFileSync(join(main, 'internal/lustre-benchmark/src', name))), name)
}
const result = {
  schemaVersion: 1,
  evidenceKind: 'measured',
  candidateCommit: source.sourceHead,
  sourceHead: source.sourceHead,
  mainCommit,
  frozenAt: new Date().toISOString(),
  sourceRoot: candidate,
  sourceInputs,
  sourceInputsSha256: digest(sourceInputs),
  harnessRoot: harness,
  harnessFiles,
  harnessFilesSha256: digest(harnessFiles),
  driverRoot: join(workspace, 'driver'),
  preparation: { file: 'preparation.json', sha256: sha(preparationBytes) },
  artifactChecks,
  slots,
  mainSource: { commit: mainCommit, files: mainSource, sha256: digest(mainSource), gitBlobChecksPassed: true },
  adapter: 'The identical Todo workload and optimized view use each branch’s existing completion API. Main uses Runtime.makeApplication; the candidate uses Block.make/makeLayer and a Program pair. Each optimized slot renames only its HTML entry to index.html for the unchanged driver.',
  toolchain: { node: process.version, typescript: '7.1.0-beta', vite: '8.3.5', effect: '4.1.0', playwright: '1.63.0' },
  baselineReuse: JSON.parse(readFileSync(join(workspace, 'baseline-preparation.json'))),
  dependencies: JSON.parse(readFileSync(join(workspace, 'candidate-dependencies.json'))),
  limitations: [
    'Matched cached dependencies, not independent fresh installs from branch lockfiles',
    'The copied harness has no Git metadata; its archive and tracked files are pinned independently',
    'The actual-main build was copied byte-for-byte from the independently reviewed November 4 batch, with Git-blob Source checks and fresh functional preflights',
  ],
}
writeFileSync(join(workspace, 'final-artifact-receipt.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ candidateCommit: result.candidateCommit, mainCommit, sourceInputs: sourceInputs.length, sourceInputsSha256: result.sourceInputsSha256, mainSources: mainSource.length, slots }, null, 2))
