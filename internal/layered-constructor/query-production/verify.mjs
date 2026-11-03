import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const vitest = join(core, 'node_modules/vitest/vitest.mjs')
const verification = join(fixture, 'verification')
mkdirSync(verification, { recursive: true })
const artifacts = mkdtempSync(join(verification, 'run-'))
const packagePath = join(artifacts, 'package')
mkdirSync(join(artifacts, 'node_modules'), { recursive: true })
cpSync(join(core, 'dist'), join(packagePath, 'dist'), { recursive: true })
cpSync(join(core, 'package.json'), join(packagePath, 'package.json'))
symlinkSync(packagePath, join(artifacts, 'node_modules/foldkit'))

const dependencies = [
  ['effect', 'node_modules/effect'],
  ['vitest', 'packages/foldkit/node_modules/vitest'],
  ['@effect/vitest', 'packages/foldkit/node_modules/@effect/vitest'],
  ['parse5', 'packages/foldkit/node_modules/parse5'],
  [
    '@effect/platform-browser',
    'packages/foldkit/node_modules/@effect/platform-browser',
  ],
]
const linkDependencies = root => {
  for (const [name, source] of dependencies) {
    mkdirSync(dirname(join(root, 'node_modules', name)), { recursive: true })
    symlinkSync(
      realpathSync(join(repository, source)),
      join(root, 'node_modules', name),
    )
  }
}
linkDependencies(artifacts)

const accepted = [
  'query-block.accepted.ts',
  'query-policy.accepted.ts',
  'query-modes.accepted.ts',
]
const rejected = ['query-block.rejected.ts', 'query-policy.rejected.ts']
const consumers = [
  'query-block.consume.ts',
  'query-policy.consume.ts',
  'query-modes.consume.ts',
]
mkdirSync(join(artifacts, 'src'), { recursive: true })
for (const name of [...accepted, ...rejected, ...consumers]) {
  cpSync(join(core, 'declaration-tests', name), join(artifacts, 'src', name))
}
cpSync(
  join(core, 'declaration-tests/query-modes.accepted.ts'),
  join(artifacts, 'src/modes.ts'),
)
cpSync(join(fixture, 'test'), join(artifacts, 'test'), { recursive: true })
cpSync(join(fixture, 'vitest.config.ts'), join(artifacts, 'vitest.config.ts'))
const publicRuntime = readFileSync(
  join(core, 'src/experimental/query/family.test.ts'),
  'utf8',
)
  .replace("from '../../asyncData/public.js'", "from 'foldkit/asyncData'")
  .replace("from '../../story/public.js'", "from 'foldkit/story'")
  .replace("from './public.js'", "from 'foldkit/experimental/query'")
writeFileSync(join(artifacts, 'test/public.test.ts'), publicRuntime)
writeFileSync(
  join(artifacts, 'package.json'),
  '{"private":true,"type":"module"}',
)

const options = {
  strict: true,
  exactOptionalPropertyTypes: true,
  module: 'ESNext',
  moduleResolution: 'Bundler',
  target: 'ES2022',
  lib: ['ESNext', 'DOM'],
  skipLibCheck: false,
  noEmit: true,
  types: [],
}
writeFileSync(
  join(artifacts, 'tsconfig.json'),
  JSON.stringify({ compilerOptions: options, include: ['src/**/*.ts'] }),
)
writeFileSync(
  join(artifacts, 'tsconfig.emit.json'),
  JSON.stringify({
    compilerOptions: {
      ...options,
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      rootDir: 'src',
      outDir: 'declarations',
    },
    files: accepted.map(name => `src/${name}`),
  }),
)

const results = []
const run = (name, executable, args, failure, cwd = artifacts) => {
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = join(artifacts, `${name}.log`)
  writeFileSync(log, `exit=${result.status}\n${output}`)
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  if (failure === undefined) {
    assert.equal(result.status, 0, `${name}: ${output}`)
  } else {
    assert.notEqual(result.status, 0, `${name} escaped detection`)
    assert.match(output, failure)
  }
  results.push({ name, log, exit: result.status })
  process.stdout.write(`${name}: PASS\n`)
  return output
}
const source = name =>
  run(name, compiler, ['-p', 'tsconfig.json', '--pretty', 'false'])
const runtime = (name, failure) =>
  run(name, vitest, ['run', '--config', 'vitest.config.ts'], failure)
source('source')
runtime('runtime')
run('emission', compiler, ['-p', 'tsconfig.emit.json', '--pretty', 'false'])

const relocated = join(artifacts, 'relocated')
cpSync(
  join(packagePath, 'dist'),
  join(relocated, 'node_modules/foldkit/dist'),
  { recursive: true },
)
cpSync(
  join(core, 'package.json'),
  join(relocated, 'node_modules/foldkit/package.json'),
)
linkDependencies(relocated)
cpSync(join(artifacts, 'declarations'), join(relocated, 'fixtures'), {
  recursive: true,
})
for (const name of consumers)
  cpSync(
    join(core, 'declaration-tests', name),
    join(relocated, 'fixtures', name),
  )
writeFileSync(
  join(relocated, 'package.json'),
  '{"private":true,"type":"module"}',
)
writeFileSync(
  join(relocated, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: options,
    files: consumers.map(name => `fixtures/${name}`),
  }),
)
const external = run(
  'relocated',
  compiler,
  ['-p', 'tsconfig.json', '--listFiles', '--pretty', 'false'],
  undefined,
  relocated,
)
assert.ok(!external.includes(join(repository, 'packages/foldkit/dist')))
assert.ok(!external.includes(join(repository, 'packages/foldkit/src')))
assert.ok(!external.includes(join(artifacts, 'src')))

const familyTypes = join(
  packagePath,
  'dist/experimental/contracted/family.d.ts',
)
const originalTypes = readFileSync(familyTypes, 'utf8')
const coverage = 'handlers: Selected & ValidateFamilyHandlers<Hosts, Selected>'
assert.ok(originalTypes.includes(coverage))
writeFileSync(
  familyTypes,
  originalTypes.replace(coverage, 'handlers: Selected'),
)
try {
  run(
    'lost-host-identity',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2578/,
  )
} finally {
  writeFileSync(familyTypes, originalTypes)
}

const contractTypes = join(
  packagePath,
  'dist/experimental/contracted/contract.d.ts',
)
const originalContractTypes = readFileSync(contractTypes, 'utf8')
const projectedInputUpdate =
  /\[InputUpdateOf<Body>\] extends \[never\] \? unknown : CompiledInputs<In, Extract<PlanOutput<InputUpdateOf<Body>>, AnyFunction>/
assert.ok(projectedInputUpdate.test(originalContractTypes))
const redundantInputCheck = originalContractTypes
  .replace(
    projectedInputUpdate,
    "Body extends ConstructorBody & Readonly<{ inMessageUpdate: Plan<infer InputUpdate, 'InMessageUpdate', AuthoringSource> }> ? CompiledInputs<In, Extract<InputUpdate, AnyFunction>",
  )
  .replace(
    /(Extract<InputUpdate, AnyFunction>, SourceOf<Body>\['Message'\]\['Type'\], SourceOf<Body>>) : unknown\)/,
    '$1 : unknown : unknown)',
  )
writeFileSync(contractTypes, redundantInputCheck)

try {
  run(
    'redundant-generic-recheck',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /query-block\.accepted\.ts\(\d+,\d+\): error TS2345/,
  )
} finally {
  writeFileSync(contractTypes, originalContractTypes)
}

const implementation = join(
  packagePath,
  'dist/experimental/query/queryImplementation.js',
)
const originalImplementation = readFileSync(implementation, 'utf8')
const notifyingCompletion =
  'CompletedFetch: api.notifyingUpdateHandlers.CompletedFetch'
assert.ok(originalImplementation.includes(notifyingCompletion))
writeFileSync(
  implementation,
  originalImplementation.replace(
    notifyingCompletion,
    'CompletedFetch: api.updateHandlers.CompletedFetch',
  ),
)
try {
  runtime('lost-notification', /OutMessage|outMessage/)
} finally {
  writeFileSync(implementation, originalImplementation)
}

const layer = join(packagePath, 'dist/experimental/query/layer.js')
const originalLayer = readFileSync(layer, 'utf8')
assert.ok(originalLayer.includes('Layer.mergeAll(QueryLayer, KeyedQueryLayer)'))
writeFileSync(
  layer,
  originalLayer.replace(
    'Layer.mergeAll(QueryLayer, KeyedQueryLayer)',
    'QueryLayer',
  ),
)
try {
  runtime('lost-keyed-provider', /KeyedQuery|Service not found/)
} finally {
  writeFileSync(layer, originalLayer)
}
source('restored-source')
runtime('restored-runtime')
writeFileSync(
  join(verification, 'latest.json'),
  JSON.stringify({ status: 'passed', artifacts, results }, null, 2),
)
process.stdout.write(`Production Query proof passed. Artifacts: ${artifacts}\n`)
