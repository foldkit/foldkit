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
  ['happy-dom', 'packages/foldkit/node_modules/happy-dom'],
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

const accepted = ['view-plans.accepted.ts']
const rejected = ['view-plans.rejected.ts']
const consumers = ['view-plans.consume.ts']
mkdirSync(join(artifacts, 'src'), { recursive: true })
for (const name of [...accepted, ...rejected, ...consumers]) {
  cpSync(join(core, 'declaration-tests', name), join(artifacts, 'src', name))
}
mkdirSync(join(artifacts, 'test'), { recursive: true })
writeFileSync(
  join(artifacts, 'vitest.config.ts'),
  "import { defineConfig } from 'vitest/config'\nexport default defineConfig({test:{environment:'happy-dom',include:['test/**/*.test.ts']}})\n",
)
const publicRuntime = readFileSync(
  join(core, 'src/experimental/contracted/viewComposition.test.ts'),
  'utf8',
)
  .replace("from '../../block/public.js'", "from 'foldkit/block'")
  .replace("from '../../message/index.js'", "from 'foldkit/message'")
  .replace("from '../../scene/public.js'", "from 'foldkit/scene'")
  .replace("from '../../block/bindingInit.js'", "from 'foldkit/bindingInit'")
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

const authoring = join(packagePath, 'dist/experimental/hybrid/authoring.js')
const originalAuthoring = readFileSync(authoring, 'utf8')
assert.ok(originalAuthoring.includes('context.composition !== composition'))
writeFileSync(
  authoring,
  originalAuthoring.replace('context.composition !== composition', 'false'),
)
try {
  runtime(
    'lost-source-identity',
    /another static Composition|did not throw|promise resolved/,
  )
} finally {
  writeFileSync(authoring, originalAuthoring)
}

const contract = join(packagePath, 'dist/experimental/contracted/contract.d.ts')
const originalContract = readFileSync(contract, 'utf8')
const localInputs =
  "BlockView<Source['Model']['Type'], Source['Message']['Type'], LocalInputs, ViewRequirements<Source>>"
assert.ok(originalContract.includes(localInputs))
writeFileSync(
  contract,
  originalContract.replace(
    localInputs,
    "BlockView<Source['Model']['Type'], Source['Message']['Type'], unknown, ViewRequirements<Source>>",
  ),
)
try {
  run(
    'lost-helper-inputs',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2578/,
  )
} finally {
  writeFileSync(contract, originalContract)
}
const viewScope = join(packagePath, 'dist/block/viewScope.js')
const originalScope = readFileSync(viewScope, 'utf8')
assert.ok(originalScope.includes('return compile(block);'))
writeFileSync(
  viewScope,
  originalScope.replace('return compile(block);', 'return view;'),
)
try {
  runtime(
    'lost-selected-view-compilation',
    /acquired Composition view|promise resolved/,
  )
} finally {
  writeFileSync(viewScope, originalScope)
}

const binding = join(
  packagePath,
  'dist/experimental/constructed/authoring.d.ts',
)
const originalBinding = readFileSync(binding, 'utf8')
const ownerCheck = 'View extends AnyBlockView & EmbeddedViewPlan<OwnerValue>'
assert.ok(originalBinding.includes(ownerCheck))
writeFileSync(
  binding,
  originalBinding.replace(ownerCheck, 'View extends AnyBlockView'),
)
try {
  run(
    'lost-selected-view-owner',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2578/,
  )
} finally {
  writeFileSync(binding, originalBinding)
}

const descriptorBindings = join(
  packagePath,
  'dist/experimental/constructed/authoring.d.ts',
)
const originalDescriptorBindings = readFileSync(descriptorBindings, 'utf8')
const projectionStart = originalDescriptorBindings.indexOf(
  'export interface DescriptorViewExtension<',
)
const projectionEnd = originalDescriptorBindings.indexOf(
  '/** Creates passive child Bindings',
  projectionStart,
)
assert.ok(projectionStart >= 0 && projectionEnd > projectionStart)
const projection = originalDescriptorBindings.slice(
  projectionStart,
  projectionEnd,
)
const fieldsStart = projection.indexOf('readonly embedView:')
assert.ok(fieldsStart >= 0)
const brokenProjection = `
type BrokenPlanProjection<Child extends AnyDescriptor, ModelSchema extends AnySchema, MessageSchema extends AnySchema, Source> =
  BindChildConstructorResult<CoreContract<Child>, ModelSchema, MessageSchema, undefined, Source, never> extends Readonly<{ embedView: (...args: ReadonlyArray<any>) => infer Embedded }>
    ? Embedded extends BoundBlockConfig<infer NativeView, infer ParentMessage>
      ? DescriptorEmbedView<Child['owner'], Child['Model']['Type'], ParentMessage, NativeView['__blockMountRequirements'], BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['key']>
      : never
    : never;
`
const changedProjection =
  projection.slice(0, fieldsStart) +
  'readonly embedView: BrokenPlanProjection<Child, ModelSchema, MessageSchema, Source>;\n}\n'
writeFileSync(
  descriptorBindings,
  originalDescriptorBindings.slice(0, projectionStart) +
    brokenProjection +
    changedProjection +
    originalDescriptorBindings.slice(projectionEnd),
)
try {
  run(
    'lost-viewless-projection',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /TS2349|Type .never. has no call signatures/,
  )
} finally {
  writeFileSync(descriptorBindings, originalDescriptorBindings)
}

const compactBindings = join(
  packagePath,
  'dist/experimental/constructed/bindingContract.d.ts',
)
const originalCompactBindings = readFileSync(compactBindings, 'utf8')
const alternateView =
  "DescriptorViewExtension<Child, ModelSchema, MessageSchema, Config>['embedView']"
const defaultView =
  "NativeDescriptorBinding<Child, ModelSchema, MessageSchema, OutSchema, Config, InitSchema, Policy>['embedView']"
const defaultLast = `readonly embedView: ${alternateView} & ${defaultView};`
assert.equal(originalCompactBindings.split(defaultLast).length, 2)
writeFileSync(
  compactBindings,
  originalCompactBindings.replace(
    defaultLast,
    `readonly embedView: ${defaultView} & ${alternateView};`,
  ),
)
try {
  run(
    'lost-default-view-reflection',
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    /view-plans.accepted.ts[\s\S]*TS2322/,
  )
} finally {
  writeFileSync(compactBindings, originalCompactBindings)
}

source('restored-source')
runtime('restored-runtime')
writeFileSync(
  join(verification, 'latest.json'),
  JSON.stringify({ status: 'passed', artifacts, results }, null, 2),
)
process.stdout.write(
  `Callable view-plan proof passed. Artifacts: ${artifacts}\n`,
)
