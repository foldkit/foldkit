import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const proof = dirname(fileURLToPath(import.meta.url))
const framework = resolve(process.argv[2] ?? join(proof, '../../..'))
const work = mkdtempSync(join(tmpdir(), 'foldkit-opaque-capability-verify-'))
const packageSource = join(framework, 'packages/foldkit')
const packageCopy = join(work, 'packages/foldkit')
const app = join(work, 'proof/app')
const relocated = join(work, 'proof/relocated')
const results = []
const provenanceFiles = [
  'package.json',
  'dist/block/runtimeCapability.js',
  'dist/block/runtimeCapability.d.ts',
  'dist/block/scope.js',
  'dist/runtime/compositionRuntime.js',
  'dist/experimental/constructed/runtime.js',
  'dist/experimental/contracted/contract.d.ts',
]
const packageHashes = Object.fromEntries(
  provenanceFiles.map(name => [
    name,
    createHash('sha256')
      .update(readFileSync(join(packageSource, name)))
      .digest('hex'),
  ]),
)
const report = () => ({ framework, work, packageHashes, results })
const saveResults = () => {
  writeFileSync(
    join(work, 'results.json'),
    JSON.stringify(report(), null, 2) + '\n',
  )
  writeFileSync(
    join(proof, 'results.json'),
    JSON.stringify(report(), null, 2) + '\n',
  )
}

mkdirSync(packageCopy, { recursive: true })
cpSync(join(packageSource, 'dist'), join(packageCopy, 'dist'), {
  recursive: true,
})
cpSync(join(packageSource, 'package.json'), join(packageCopy, 'package.json'))
for (const name of provenanceFiles) {
  const copiedHash = createHash('sha256')
    .update(readFileSync(join(packageCopy, name)))
    .digest('hex')
  if (copiedHash !== packageHashes[name]) {
    throw new Error(
      `The built package changed while copying ${name}; rerun after the build finishes`,
    )
  }
}

symlinkSync(
  join(packageSource, 'node_modules'),
  join(packageCopy, 'node_modules'),
)
cpSync(join(framework, 'tsconfig.base.json'), join(work, 'tsconfig.base.json'))
mkdirSync(app, { recursive: true })
for (const name of [
  'src',
  'test',
  'package.json',
  'tsconfig.json',
  'vitest.config.ts',
]) {
  cpSync(join(proof, 'app', name), join(app, name), { recursive: true })
}

const dependencies = directory => {
  mkdirSync(join(directory, 'node_modules'), { recursive: true })
  for (const name of ['effect', 'typescript', 'vitest', 'parse5']) {
    symlinkSync(
      realpathSync(join(packageSource, 'node_modules', name)),
      join(directory, 'node_modules', name),
    )
  }
}
dependencies(app)
symlinkSync(packageCopy, join(app, 'node_modules/foldkit'))
const compiler = join(packageSource, 'node_modules/typescript/bin/tsc')
const vitest = join(packageSource, 'node_modules/vitest/vitest.mjs')

const run = (name, args, cwd, expected = 'success', pattern) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(work, `${name}.log`), output)
  const passed =
    expected === 'success'
      ? result.status === 0
      : result.status !== 0 && pattern.test(output)
  results.push({ name, expected, exitCode: result.status, passed })
  saveResults()

  if (!passed) {
    throw new Error(`${name} failed; inspect ${join(work, `${name}.log`)}`)
  }
}

run('source', [compiler, '-p', 'tsconfig.json', '--pretty', 'false'], app)
run(
  'emit',
  [
    compiler,
    '-p',
    'tsconfig.json',
    '--pretty',
    'false',
    '--noEmit',
    'false',
    '--declaration',
    '--emitDeclarationOnly',
    '--rootDir',
    'src',
    '--outDir',
    'emitted',
  ],
  app,
)
run('runtime', [vitest, 'run', '--config', 'vitest.config.ts'], app)

dependencies(relocated)
mkdirSync(join(relocated, 'node_modules/foldkit'), { recursive: true })
cpSync(
  join(packageCopy, 'dist'),
  join(relocated, 'node_modules/foldkit/dist'),
  { recursive: true },
)
cpSync(
  join(packageCopy, 'package.json'),
  join(relocated, 'node_modules/foldkit/package.json'),
)
cpSync(join(app, 'emitted'), join(relocated, 'node_modules/chat-proof'), {
  recursive: true,
})
writeFileSync(
  join(relocated, 'node_modules/chat-proof/package.json'),
  JSON.stringify({
    name: 'chat-proof',
    type: 'module',
    exports: { './*': { types: './*.d.ts' } },
  }) + '\n',
)
for (const name of ['consumer.ts', 'tsconfig.json', 'package.json']) {
  cpSync(join(proof, 'relocated', name), join(relocated, name))
}
run(
  'relocated',
  [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
  relocated,
)

const ownerFile = join(
  relocated,
  'node_modules/foldkit/dist/block/runtimeCapability.d.ts',
)
const ownerOriginal = readFileSync(ownerFile, 'utf8')
const ownerMember =
  'readonly [RuntimeCapabilityTypeId]: (owner: Owner) => Owner;'
if (!ownerOriginal.includes(ownerMember)) {
  throw new Error('Owner control does not match this artifact')
}
try {
  writeFileSync(
    ownerFile,
    ownerOriginal.replace(
      ownerMember,
      'readonly [RuntimeCapabilityTypeId]: unknown;',
    ),
  )
  run(
    'control-owner',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    relocated,
    'rejection',
    /TS2578/,
  )
} finally {
  writeFileSync(ownerFile, ownerOriginal)
}

const runtimeFile = join(packageCopy, 'dist/runtime/compositionRuntime.js')
const runtimeOriginal = readFileSync(runtimeFile, 'utf8')
const install =
  'node.resources = Context.merge(node.resources, installRuntimeCapability(childBlock, node, runtimeAcquisitionIsActive(childBlock)));'
if (!runtimeOriginal.includes(install)) {
  throw new Error('Runtime installation control does not match this artifact')
}
try {
  writeFileSync(
    runtimeFile,
    runtimeOriginal.replace(
      install,
      'node.resources = Context.merge(node.resources, Context.empty());',
    ),
  )
  run(
    'control-runtime',
    [vitest, 'run', '--config', 'vitest.config.ts', '-t', 'uses real separate'],
    app,
    'rejection',
    /Service not found: foldkit\/RuntimeCapability\//,
  )
} finally {
  writeFileSync(runtimeFile, runtimeOriginal)
}

const phaseFile = join(packageCopy, 'dist/block/scope.js')
const phaseOriginal = readFileSync(phaseFile, 'utf8')
const guard =
  'const construction = Context.add(Context.makeUnsafe(entries), IsConstructingHandler, true);'
if (!phaseOriginal.includes(guard)) {
  throw new Error('Construction guard control does not match this artifact')
}
try {
  writeFileSync(
    phaseFile,
    phaseOriginal.replace(guard, guard.replace('true);', 'false);')),
  )
  run(
    'control-construction',
    [
      vitest,
      'run',
      '--config',
      'vitest.config.ts',
      '-t',
      'denies public resource',
    ],
    app,
    'rejection',
    /denies public resource access/,
  )
} finally {
  writeFileSync(phaseFile, phaseOriginal)
}

const wrapperFile = join(
  packageCopy,
  'dist/experimental/constructed/runtime.js',
)
const wrapperOriginal = readFileSync(wrapperFile, 'utf8')
const invocationPhase = /IsConstructingHandler,(\s*)false([,)])/
if (!invocationPhase.test(wrapperOriginal)) {
  throw new Error('Invocation phase control does not match this artifact')
}
try {
  writeFileSync(
    wrapperFile,
    wrapperOriginal.replace(invocationPhase, 'IsConstructingHandler,$1true$2'),
  )
  run(
    'control-invocation-phase',
    [vitest, 'run', '--config', 'vitest.config.ts', '-t', 'uses real separate'],
    app,
    'rejection',
    /cannot be read while constructing a handler/,
  )
} finally {
  writeFileSync(wrapperFile, wrapperOriginal)
}

console.log(JSON.stringify(report(), null, 2))
