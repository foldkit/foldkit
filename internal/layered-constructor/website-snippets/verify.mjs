import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = realpathSync(join(fixture, '../../..'))
const snippets = join(repository, 'packages/website/src/snippet')
const core = join(repository, 'packages/foldkit')
const ui = join(repository, 'packages/ui')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const artifacts = mkdtempSync(join(fixture, 'verification-'))
const original = JSON.parse(
  readFileSync(join(fixture, 'original-hashes.json'), 'utf8'),
)
const selected = JSON.parse(
  readFileSync(join(fixture, 'selected.json'), 'utf8'),
)
const base = JSON.parse(
  readFileSync(join(repository, 'tsconfig.base.json'), 'utf8'),
)
const results = {
  node: process.version,
  compiler: realpathSync(compiler),
  checks: [],
}
const digest = value => createHash('sha256').update(value).digest('hex')

for (const [name, packageDirectory] of [
  ['@foldkit/ui', ui],
  ['vitest', join(repository, 'packages/website/node_modules/vitest')],
]) {
  const fixturePackage = join(fixture, 'node_modules', name)
  mkdirSync(dirname(fixturePackage), { recursive: true })
  if (!existsSync(fixturePackage)) symlinkSync(packageDirectory, fixturePackage)
  assert.equal(realpathSync(fixturePackage), realpathSync(packageDirectory))
}

const activeComparisons = new Set([
  'blockStepBranchesBefore.ts',
  'updateConnectedStepBefore.ts',
])
const historical = name =>
  name.startsWith('release') ||
  (name.includes('Before') && !activeComparisons.has(name)) ||
  ['serverRenderingScaffoldSsr.ts', 'serverRenderingServerEntry.ts'].includes(
    name,
  )
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  )
}
function hashes(directory) {
  return Object.fromEntries(
    files(directory).map(file => [
      relative(directory, file),
      digest(readFileSync(file)),
    ]),
  )
}
function config(name, roots, options = {}) {
  const file = join(artifacts, name)
  writeFileSync(
    file,
    JSON.stringify(
      {
        compilerOptions: {
          ...base.compilerOptions,
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          skipLibCheck: false,
          ...options,
        },
        files: roots,
      },
      null,
      2,
    ),
  )
  return file
}
function run(name, executable, args, expected = 0, pattern) {
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd: repository,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(join(artifacts, `${name}.log`), output)
  results.checks.push({ name, status: result.status })
  if (expected === 0) assert.equal(result.status, 0, `${name}\n${output}`)
  else assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
  if (pattern) assert.match(output, pattern)
}
function check(name, project, expected = 0, pattern) {
  run(name, compiler, ['-p', project, '--pretty', 'false'], expected, pattern)
}
const initialCore = hashes(join(core, 'dist'))
try {
  const preserved = Object.keys(original).filter(historical)
  for (const name of preserved)
    assert.equal(
      digest(readFileSync(join(snippets, name))),
      original[name],
      name,
    )
  results.preservedHistoricalFiles = preserved.length
  const activeFiles = readdirSync(snippets).filter(
    name => name.endsWith('.ts') && !historical(name),
  )
  for (const name of activeFiles) {
    const source = readFileSync(join(snippets, name), 'utf8')
    assert.doesNotMatch(
      source,
      /prepareBlock|Block\.assemble|FromAssembly|replaceEffectsLayer/,
      name,
    )
    assert.doesNotMatch(
      source,
      /\w+Composition\.Message|\w+Namespace\.makeFamilyDefinition/,
      name,
    )
  }
  results.activeFilesAudited = activeFiles.length
  results.selectedCompleteRoots = selected.length
  const source = config(
    'source.json',
    [
      ...selected.map(name => join(snippets, name)),
      join(fixture, 'fixtures/messageOf.ts'),
    ],
    { module: 'ESNext', moduleResolution: 'bundler' },
  )
  check('source', source)
  run(
    'runtime',
    join(repository, 'packages/website/node_modules/vitest/vitest.mjs'),
    ['run', '--config', join(fixture, 'vitest.config.ts')],
    0,
    /9 passed/,
  )
  const emitted = join(artifacts, 'emitted')
  check(
    'declarations',
    config('declarations.json', [join(fixture, 'fixtures/messageOf.ts')], {
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      rootDir: join(fixture, 'fixtures'),
      outDir: emitted,
    }),
  )
  const relocated = join(artifacts, 'relocated')
  mkdirSync(join(relocated, 'node_modules/@foldkit'), { recursive: true })
  mkdirSync(join(relocated, 'packages'), { recursive: true })
  for (const [name, sourcePackage] of [
    ['foldkit', core],
    ['ui', ui],
  ]) {
    cpSync(
      join(sourcePackage, 'dist'),
      join(relocated, 'packages', name, 'dist'),
      { recursive: true },
    )
    cpSync(
      join(sourcePackage, 'package.json'),
      join(relocated, 'packages', name, 'package.json'),
    )
  }
  cpSync(emitted, join(relocated, 'emitted'), { recursive: true })
  symlinkSync('../packages/foldkit', join(relocated, 'node_modules/foldkit'))
  symlinkSync('../../packages/ui', join(relocated, 'node_modules/@foldkit/ui'))
  for (const name of ['effect', '@types'])
    symlinkSync(
      realpathSync(join(repository, 'node_modules', name)),
      join(relocated, 'node_modules', name),
    )
  symlinkSync(
    realpathSync(join(ui, 'node_modules/@floating-ui')),
    join(relocated, 'node_modules/@floating-ui'),
  )
  writeFileSync(
    join(relocated, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
  const external = join(relocated, 'checks.test-d.ts')
  writeFileSync(
    external,
    `import type * as Html from 'foldkit/html'\nimport type {ApplicationViewBuilder,ApplicationViewMessage} from './emitted/messageOf.js'\n\nexport const local: Html.MessageOf<ApplicationViewBuilder> = {_tag:'ChangedCount',value:4}\nexport const preservesChild: 'GotTabsMessage' extends ApplicationViewMessage['_tag'] ? true:false = true\n// @ts-expect-error Number payload remains precise in the relocated consumer.\nexport const wrongPayload: ApplicationViewMessage = {_tag:'ChangedCount',value:'wrong'}\n// @ts-expect-error Unrelated Messages stay rejected.\nexport const wrongTag: Html.MessageOf<ApplicationViewBuilder> = {_tag:'Unknown'}\n`,
  )
  const relocatedConfig = config('relocated.json', [external])
  assert.equal(existsSync(join(relocated, 'packages/foldkit/src')), false)
  assert.equal(existsSync(join(relocated, 'packages/ui/src')), false)
  check('relocated', relocatedConfig)
  const contract = join(relocated, 'packages/foldkit/dist/html/index.d.ts')
  const originalContract = readFileSync(contract, 'utf8')
  const expression = /export type MessageOf<Builder> = [\s\S]*?;/
  assert.match(originalContract, expression)
  writeFileSync(
    contract,
    originalContract.replace(
      expression,
      'export type MessageOf<Builder> = never;',
    ),
  )
  check('lost-message-control', relocatedConfig, 1, /TS2322/)
  writeFileSync(contract, originalContract)
  check('restored-after-loss', relocatedConfig)
  writeFileSync(
    contract,
    originalContract.replace(
      expression,
      'export type MessageOf<Builder> = any;',
    ),
  )
  check('widened-message-control', relocatedConfig, 1, /TS2578/)
  writeFileSync(contract, originalContract)
  check('restored-after-widening', relocatedConfig)
  assert.deepEqual(hashes(join(core, 'dist')), initialCore)
  results.oneEffectRuntime = realpathSync(
    join(repository, 'node_modules/effect'),
  )
  results.status = 'passed'
} finally {
  writeFileSync(
    join(artifacts, 'results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  process.stdout.write(artifacts + '\n')
}
