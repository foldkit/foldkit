import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../..')
const core = join(repository, 'packages/foldkit')
const base = 'b02e43a97d6856e24afe7ac18d54d1ce7a3647f0'
const workspace = mkdtempSync('/private/tmp/foldkit-inmessage-compiler-proof-')
const logs = join(workspace, 'logs')
mkdirSync(logs)
const run = (name, executable, args, cwd, expected = 0, input) => {
  const result = spawnSync(executable, args, {
    cwd,
    input,
    encoding: input === undefined ? 'utf8' : undefined,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(logs, `${name}.log`), output)
  assert.ifError(result.error)
  assert.equal(result.status, expected, output)
  return output
}
const baselineRepository = join(workspace, 'baseline')
mkdirSync(baselineRepository)
const archive = spawnSync(
  'git',
  ['archive', base, 'packages/foldkit', 'tsconfig.base.json'],
  { cwd: repository, maxBuffer: 32 * 1024 * 1024 },
)
assert.equal(archive.status, 0)
run(
  'extract-base',
  'tar',
  ['-x', '-C', baselineRepository],
  workspace,
  0,
  archive.stdout,
)
symlinkSync(
  join(repository, 'node_modules'),
  join(baselineRepository, 'node_modules'),
)
const baselineCore = join(baselineRepository, 'packages/foldkit')
const linkDependencies = packageRoot => {
  const modules = join(packageRoot, 'node_modules')
  mkdirSync(modules, { recursive: true })
  for (const name of readdirSync(join(core, 'node_modules'))) {
    if (name === '.bin') continue
    symlinkSync(
      realpathSync(join(core, 'node_modules', name)),
      join(modules, name),
    )
  }
  const bin = join(modules, '.bin')
  mkdirSync(bin)
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`
  const tsc = join(bin, 'tsc')
  writeFileSync(
    tsc,
    `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(realpathSync(join(core, 'node_modules/typescript/bin/tsc')))} "$@"\n`,
  )
  chmodSync(tsc, 0o755)
}
linkDependencies(baselineCore)
run(
  'build-base',
  process.execPath,
  [
    join(core, 'node_modules/typescript/bin/tsc'),
    '-b',
    join(baselineCore, 'tsconfig.build.json'),
    '--force',
  ],
  baselineRepository,
)
const candidateCore = join(workspace, 'candidate')
mkdirSync(candidateCore)
for (const path of [
  'dist',
  'declaration-tests',
  'type-performance',
  'scripts',
  'package.json',
])
  cpSync(join(core, path), join(candidateCore, path), { recursive: true })
linkDependencies(candidateCore)
const budgets = JSON.parse(
  readFileSync(join(core, 'type-performance/budgets.json')),
)
const workloads = []
const fixtureManifest = JSON.parse(
  readFileSync(join(core, 'type-performance/fixtures.json')),
)
const pending = [
  'type-performance/baseline.ts',
  ...fixtureManifest.fixtures.map(entry => `type-performance/${entry.file}`),
]
const seen = new Set([
  'type-performance/budgets.json',
  'type-performance/fixtures.json',
  'type-performance/tsconfig.json',
])
while (pending.length !== 0) {
  const relative = pending.pop()
  if (seen.has(relative)) continue
  seen.add(relative)
  const source = readFileSync(join(candidateCore, relative), 'utf8')
  for (const match of source.matchAll(
    /(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g,
  )) {
    const target = resolve(
      candidateCore,
      dirname(relative),
      match[1].replace(/\.js$/, '.ts'),
    )
    const next = target.replace(`${candidateCore}/`, '')
    if (
      next.startsWith('type-performance/') ||
      next.startsWith('declaration-tests/')
    )
      pending.push(next)
  }
}
for (const relative of [...seen].sort()) {
  const before = readFileSync(join(baselineCore, relative))
  const after = readFileSync(join(candidateCore, relative))
  assert.deepEqual(after, before, `${relative} changed`)
  workloads.push({
    path: relative,
    sha256: createHash('sha256').update(after).digest('hex'),
  })
}

assert.deepEqual(
  readFileSync(join(baselineCore, 'scripts/check-block-type-performance.ts')),
  readFileSync(join(candidateCore, 'scripts/check-block-type-performance.ts')),
)
const measure = (name, packageRoot, expected = 0) => {
  const output = run(
    name,
    process.execPath,
    [join(packageRoot, 'scripts/check-block-type-performance.ts')],
    packageRoot,
    expected,
  )
  const rows = [
    ...output.matchAll(
      /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
    ),
  ].map(match => ({
    name: match[1],
    instantiations: Number(match[2].replaceAll(',', '')),
    maxInstantiations: Number(match[3].replaceAll(',', '')),
    types: Number(match[4].replaceAll(',', '')),
    maxTypes: Number(match[5].replaceAll(',', '')),
    status: match[7],
  }))
  assert.equal(rows.length, 7, output)
  return rows
}
const baseline = measure('baseline-seven', baselineCore)
const candidate = measure('candidate-seven', candidateCore)
const authoring = join(candidateCore, 'dist/experimental/hybrid/authoring.d.ts')
const input = join(
  candidateCore,
  'dist/experimental/contracted/inMessageUpdate.d.ts',
)
const authoringText = readFileSync(authoring, 'utf8')
const inputText = readFileSync(input, 'utf8')
const passive = readFileSync(
  join(candidateCore, 'dist/experimental/hybrid/planComposer.d.ts'),
  'utf8',
)
const declarations = passive.slice(
  passive.indexOf('/** @internal Erased passive builder protocol'),
)
assert.ok(declarations.includes('makeComposablePlanFactory'))
writeFileSync(authoring, `${authoringText}\n${declarations}`)
assert.ok(
  inputText.includes('import("../hybrid/planComposer.js").RuntimePlanComposer'),
)
writeFileSync(
  input,
  inputText.replace(
    'import("../hybrid/planComposer.js").RuntimePlanComposer',
    'import("../hybrid/authoring.js").RuntimePlanComposer',
  ),
)
const ownershipControl = measure(
  'rich-owner-regression-control',
  candidateCore,
  1,
)
assert.equal(
  ownershipControl
    .find(row => row.name === 'machine-search')
    ?.status.startsWith('failed'),
  true,
)
writeFileSync(authoring, authoringText)
writeFileSync(input, inputText)
const restored = measure('restored-seven', candidateCore)
assert.deepEqual(restored, candidate)
const receipt = {
  workspace,
  base,
  compiler: JSON.parse(
    readFileSync(join(core, 'node_modules/typescript/package.json')),
  ).version,
  node: process.version,
  baseline,
  candidate,
  ownershipControl,
  restored,
  budgets,
  workloads,
}
writeFileSync(join(workspace, 'receipt.json'), JSON.stringify(receipt, null, 2))
mkdirSync(join(fixture, 'verification'), { recursive: true })
writeFileSync(
  join(fixture, 'verification/compiler-latest.json'),
  JSON.stringify(
    { workspace, receipt: join(workspace, 'receipt.json') },
    null,
    2,
  ),
)
console.log(join(workspace, 'receipt.json'))
