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
for (const [name, source] of [
  ['effect', 'node_modules/effect'],
  ['vitest', 'packages/foldkit/node_modules/vitest'],
  ['parse5', 'packages/foldkit/node_modules/parse5'],
  [
    '@effect/platform-browser',
    'packages/foldkit/node_modules/@effect/platform-browser',
  ],
]) {
  mkdirSync(dirname(join(artifacts, 'node_modules', name)), { recursive: true })
  symlinkSync(
    realpathSync(join(repository, source)),
    join(artifacts, 'node_modules', name),
  )
}
cpSync(join(fixture, 'src'), join(artifacts, 'src'), { recursive: true })
cpSync(join(fixture, 'test'), join(artifacts, 'test'), { recursive: true })
cpSync(join(fixture, 'external'), join(artifacts, 'external'), {
  recursive: true,
})
cpSync(join(fixture, 'vitest.config.ts'), join(artifacts, 'vitest.config.ts'))
writeFileSync(
  join(artifacts, 'package.json'),
  '{"private":true,"type":"module"}',
)
const compilerOptions = {
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
  JSON.stringify({
    compilerOptions,
    include: ['src/**/*.ts'],
  }),
)
writeFileSync(
  join(artifacts, 'tsconfig.declarations.json'),
  JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: {
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      rootDir: 'src',
      outDir: 'declarations',
    },
    exclude: ['src/checks.test-d.ts'],
  }),
)
writeFileSync(
  join(artifacts, 'tsconfig.external.json'),
  JSON.stringify({
    compilerOptions,
    files: ['external/consumer.ts'],
  }),
)
const results = []
const run = (name, tool, args, expected) => {
  const result = spawnSync(process.execPath, [tool, ...args], {
    cwd: artifacts,
    encoding: 'utf8',
    timeout: 180_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = join(artifacts, `${name}.log`)
  writeFileSync(log, `exit=${result.status}\n${output}`)
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  if (expected === undefined) {
    assert.equal(result.status, 0, `${name}: ${output}`)
  } else {
    assert.notEqual(result.status, 0, `${name} escaped detection`)
    assert.match(output, expected)
  }
  results.push({ name, exit: result.status, log })
  process.stdout.write(`${name}: PASS\n`)
  return output
}
const source = name =>
  run(name, compiler, ['-p', 'tsconfig.json', '--pretty', 'false'])
source('source')
run('runtime', vitest, ['run', '--config', 'vitest.config.ts'])
run('emitted', compiler, [
  '-p',
  'tsconfig.declarations.json',
  '--pretty',
  'false',
])
const external = run('relocated', compiler, [
  '-p',
  'tsconfig.external.json',
  '--listFiles',
  '--pretty',
  'false',
])
assert.ok(!external.includes(join(repository, 'packages/foldkit/dist')))
assert.ok(!external.includes(join(repository, 'packages/foldkit/src')))
assert.ok(!external.includes(join(fixture, 'src')))

const definitionsPath = join(packagePath, 'dist/block/define.d.ts')
const originalDefinitions = readFileSync(definitionsPath, 'utf8')
const discriminators = /^\s+(?:key|Init)\?: never;\n/gm
assert.equal(originalDefinitions.match(discriminators)?.length, 12)
writeFileSync(definitionsPath, originalDefinitions.replace(discriminators, ''))
try {
  run(
    'missing-native-discriminators',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2578/,
  )
} finally {
  writeFileSync(definitionsPath, originalDefinitions)
}

const viewBuilderPath = join(packagePath, 'dist/block/viewBuilder.d.ts')
const originalBuilder = readFileSync(viewBuilderPath, 'utf8')
assert.ok(
  originalBuilder.includes(': ContractViewBuilderFor<CompositionValue>'),
)
writeFileSync(
  viewBuilderPath,
  originalBuilder.replace(
    ': ContractViewBuilderFor<CompositionValue>',
    ': NativeViewBuilderFor<CompositionValue>',
  ),
)
try {
  run(
    'native-only-builder',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /Property 'p' does not exist on type 'never'/,
  )
} finally {
  writeFileSync(viewBuilderPath, originalBuilder)
}

const dispatcherPath = join(packagePath, 'dist/block/makeDefinition.js')
const originalDispatcher = readFileSync(dispatcherPath, 'utf8')
const discriminator = "('key' in config || 'Init' in config)"
assert.ok(originalDispatcher.includes(discriminator))
writeFileSync(
  dispatcherPath,
  originalDispatcher.replaceAll(
    discriminator,
    "('key' in config && 'Init' in config)",
  ),
)
try {
  run(
    'partial-contract-native-fallback',
    vitest,
    [
      'run',
      '--config',
      'vitest.config.ts',
      '--testNamePattern',
      'incomplete or forged',
    ],
    /requires both/,
  )
} finally {
  writeFileSync(dispatcherPath, originalDispatcher)
}

const constructionPath = join(
  packagePath,
  'dist/experimental/constructed/runtime.js',
)
const originalConstruction = readFileSync(constructionPath, 'utf8')
const sourceOwner = 'sourceDefinition ??'
assert.ok(originalConstruction.includes(sourceOwner))
writeFileSync(
  constructionPath,
  originalConstruction.replace(sourceOwner, 'undefined ??'),
)
try {
  run(
    'lost-namespace-owner',
    vitest,
    [
      'run',
      '--config',
      'vitest.config.ts',
      '--testNamePattern',
      'original namespace owner',
    ],
    /expected .* to be|belongs to a different Block/s,
  )
} finally {
  writeFileSync(constructionPath, originalConstruction)
}
const familyRuntime = join(
  packagePath,
  'dist/experimental/contracted/familyRuntime.js',
)
const originalFamilyRuntime = readFileSync(familyRuntime, 'utf8')
const nativeFamilySource =
  'makeDefinitionRuntime(id, config, false, sourceDefinition)'
assert.ok(originalFamilyRuntime.includes(nativeFamilySource))
writeFileSync(
  familyRuntime,
  originalFamilyRuntime.replace(
    nativeFamilySource,
    'makeDefinitionRuntime(id, config, false, undefined)',
  ),
)
try {
  run(
    'lost-family-namespace-owner',
    vitest,
    [
      'run',
      '--config',
      'vitest.config.ts',
      '--testNamePattern',
      'shared-owner family',
    ],
    /expected .* to be|belongs to a different Block/s,
  )
} finally {
  writeFileSync(familyRuntime, originalFamilyRuntime)
}

const familyTypes = join(
  packagePath,
  'dist/experimental/contracted/family.d.ts',
)
const originalFamilyTypes = readFileSync(familyTypes, 'utf8')
assert.ok(originalFamilyTypes.includes('id: Id | NamespaceIdentity<Id>'))
writeFileSync(
  familyTypes,
  originalFamilyTypes.replace(
    'id: Id | NamespaceIdentity<Id>',
    'id: Id | object',
  ),
)
try {
  run(
    'lost-family-namespace-authentication',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2578/,
  )
} finally {
  writeFileSync(familyTypes, originalFamilyTypes)
}

source('restored-source')
run('restored-runtime', vitest, ['run', '--config', 'vitest.config.ts'])
writeFileSync(
  join(verification, 'latest.json'),
  JSON.stringify({ status: 'passed', artifacts, results }, null, 2),
)
process.stdout.write(
  `Canonical Block namespace proof passed. Artifacts: ${artifacts}\n`,
)
