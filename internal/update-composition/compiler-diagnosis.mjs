import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const framework = join(repository, 'packages/foldkit')
const workspace = mkdtempSync('/private/tmp/foldkit-update-compiler-')
const copiedPackage = join(workspace, 'package')

for (const entry of ['dist', 'declaration-tests', 'type-performance']) {
  cpSync(join(framework, entry), join(copiedPackage, entry), {
    recursive: true,
  })
}

cpSync(join(framework, 'package.json'), join(copiedPackage, 'package.json'))
symlinkSync(
  join(framework, 'node_modules'),
  join(copiedPackage, 'node_modules'),
)

const compiler = join(framework, 'node_modules/typescript/bin/tsc')
const typescriptVersion = JSON.parse(
  readFileSync(join(framework, 'node_modules/typescript/package.json'), 'utf8'),
).version
assert.equal(typescriptVersion, '7.1.0-beta')
const originalOrder = [
  "export * as Machine from './machine/index.js';",
  "export * as Query from './query/public.js';",
  "export * as Server from './server/public.js';",
].join('\n')
const legacyOrder = [
  "export * as Machine from './machine/index.js';",
  "export * as Server from './server/public.js';",
  "export * as Query from './query/public.js';",
].join('\n')
const canonicalPublic = [
  "export * as Machine from './machine/public.js';",
  "export * as Query from './query/public.js';",
  "export * as Server from './server/public.js';",
].join('\n')
const index = join(copiedPackage, 'dist/experimental/index.d.ts')
const runtimeIndex = join(copiedPackage, 'dist/experimental/index.js')
const builtDeclarationSha256 = createHash('sha256')
  .update(readFileSync(index))
  .digest('hex')
const measure = (label, file, singleThreaded = false) => {
  const config = join(workspace, `${label}.json`)
  writeFileSync(
    config,
    JSON.stringify({
      extends: join(copiedPackage, 'type-performance/tsconfig.json'),
      files: [join(copiedPackage, 'type-performance', file)],
      include: [],
      compilerOptions: { incremental: false, composite: false, noEmit: true },
    }),
  )
  const args = [
    compiler,
    '-p',
    config,
    '--extendedDiagnostics',
    '--pretty',
    'false',
  ]
  if (singleThreaded) {
    args.push('--singleThreaded')
  }

  const result = spawnSync(process.execPath, args, {
    cwd: copiedPackage,
    encoding: 'utf8',
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(workspace, `${label}.log`), output)
  assert.ifError(result.error)
  assert.equal(result.status, 0, output)

  const metric = name => {
    const matched = output.match(new RegExp(`^${name}:\\s*(\\d+)`, 'm'))
    assert.notEqual(matched, null)
    return Number(matched.at(1))
  }

  return { instantiations: metric('Instantiations'), types: metric('Types') }
}
const baseline = measure('baseline', 'baseline.ts')
const singleBaseline = measure('baseline-single', 'baseline.ts', true)
const delta = (value, base = baseline) => ({
  instantiations: value.instantiations - base.instantiations,
  types: value.types - base.types,
})
const budgets = JSON.parse(
  readFileSync(join(copiedPackage, 'type-performance/budgets.json'), 'utf8'),
).fixtures
const withinBudget = (name, value) =>
  value.instantiations <= budgets[name].maxInstantiationsDelta &&
  value.types <= budgets[name].maxTypesDelta

writeFileSync(index, originalOrder)
const original = delta(measure('original-order', 'machine-search.ts'))
assert.equal(withinBudget('machine-search', original), false)
const originalSingle = delta(
  measure('original-single', 'machine-search.ts', true),
  singleBaseline,
)
writeFileSync(index, legacyOrder)
const legacy = delta(
  measure('legacy-machine-server-query-order', 'machine-search.ts'),
)
const legacySingle = delta(
  measure('legacy-machine-server-query-single', 'machine-search.ts', true),
  singleBaseline,
)
writeFileSync(index, canonicalPublic)
const canonical = delta(measure('canonical-public', 'machine-search.ts'))
assert.equal(withinBudget('machine-search', canonical), true)
const canonicalSingle = delta(
  measure('canonical-public-single', 'machine-search.ts', true),
  singleBaseline,
)
assert.deepEqual(canonicalSingle, originalSingle)
assert.deepEqual(legacySingle, originalSingle)

const fixtures = JSON.parse(
  readFileSync(join(copiedPackage, 'type-performance/fixtures.json'), 'utf8'),
).fixtures
const final = {}
for (const fixture of fixtures) {
  final[fixture.name] = delta(
    measure(`canonical-${fixture.name}`, fixture.file),
  )
  assert.ok(withinBudget(fixture.name, final[fixture.name]), fixture.name)
}

const runtimeSurface = order => {
  writeFileSync(runtimeIndex, order)
  const script = `
    const namespaces = await import(process.argv[1]);
    const surface = Object.fromEntries(Object.entries(namespaces).map(
      ([name, namespace]) => [name, Object.fromEntries(Object.entries(namespace)
        .map(([member, value]) => [member, typeof value]))],
    ));
    process.stdout.write(JSON.stringify(surface));
  `
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script, pathToFileURL(runtimeIndex).href],
    { cwd: copiedPackage, encoding: 'utf8' },
  )
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}
const originalRuntime = runtimeSurface(originalOrder)
const legacyRuntime = runtimeSurface(legacyOrder)
const canonicalRuntime = runtimeSurface(canonicalPublic)
assert.deepEqual(canonicalRuntime, originalRuntime)
assert.deepEqual(legacyRuntime, originalRuntime)
assert.deepEqual(Object.keys(canonicalRuntime).sort(), [
  'Machine',
  'Query',
  'Server',
])

const hash = path =>
  createHash('sha256').update(readFileSync(path)).digest('hex')
const results = {
  workspace,
  node: process.version,
  typescript: typescriptVersion,
  declarationControl: {
    originalOrder,
    legacyOrder,
    canonicalPublic,
    original,
    originalSingle,
    legacy,
    legacyWithinBudget: withinBudget('machine-search', legacy),
    legacySingle,
    canonical,
    canonicalSingle,
    sameSingleThreadedWork: true,
  },
  sourceIndexSha256: hash(join(framework, 'src/experimental/index.ts')),
  builtDeclarationSha256,
  builtTypeAlgebraSha256: hash(
    join(framework, 'dist/experimental/hybrid/updateComposition.d.ts'),
  ),
  baseline,
  singleBaseline,
  final,
  budgets,
  runtimeNamespaces: canonicalRuntime,
}
const serializedResults = `${JSON.stringify(results, null, 2)}\n`
writeFileSync(join(workspace, 'results.json'), serializedResults)
const receipt = join(
  repository,
  'internal/update-composition/compiler-diagnosis.json',
)
const pendingReceipt = `${receipt}.pending`
writeFileSync(pendingReceipt, serializedResults)
renameSync(pendingReceipt, receipt)
console.log(JSON.stringify(results, null, 2))
