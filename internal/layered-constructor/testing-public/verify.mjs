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
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const vitest = join(core, 'node_modules/vitest/vitest.mjs')
const verification = join(fixture, 'verification')
mkdirSync(verification, { recursive: true })
const artifacts = mkdtempSync(join(verification, 'run-'))
const results = []
const report = { status: 'running', node: process.version, results }
const save = () => {
  writeFileSync(
    join(artifacts, 'results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  writeFileSync(
    join(verification, 'latest.json'),
    `${JSON.stringify({ artifacts, status: report.status }, null, 2)}\n`,
  )
}
const run = (name, args, cwd, expected = true, diagnostic) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(artifacts, `${name}.log`), output)
  const entry = { name, expected, exitCode: result.status, passed: false }
  results.push(entry)
  save()
  assert.equal(result.error, undefined, `${name}: ${result.error?.message}`)
  assert.equal(result.signal, null, `${name}: interrupted`)

  if (expected) {
    assert.equal(result.status, 0, `${name}: see ${artifacts}/${name}.log`)
  } else {
    assert.notEqual(result.status, 0, `${name}: unexpectedly passed`)
  }

  if (diagnostic !== undefined) {
    assert.match(output, diagnostic, `${name}: wrong rejection`)
  }

  entry.passed = true
  save()
  process.stdout.write(
    `${name}: ${expected ? 'passed' : 'failed as expected'}\n`,
  )
}
const files = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)

    return entry.isDirectory() ? files(path) : [path]
  })
const hashes = directory =>
  Object.fromEntries(
    files(directory).map(path => [
      relative(directory, path),
      createHash('sha256').update(readFileSync(path)).digest('hex'),
    ]),
  )
const link = (root, name, target) => {
  const destination = join(root, 'node_modules', name)
  mkdirSync(dirname(destination), { recursive: true })
  symlinkSync(target, destination, 'dir')
}
const packages = (root, packageSource = core) => {
  mkdirSync(join(root, 'package-core'), { recursive: true })
  cpSync(join(packageSource, 'dist'), join(root, 'package-core/dist'), {
    recursive: true,
  })
  cpSync(
    join(packageSource, 'package.json'),
    join(root, 'package-core/package.json'),
  )
  link(root, 'foldkit', join(root, 'package-core'))

  for (const name of [
    'effect',
    'parse5',
    '@effect/platform-browser',
    'vitest',
    'happy-dom',
  ]) {
    link(root, name, realpathSync(join(core, 'node_modules', name)))
  }

  link(root, '@types', realpathSync(join(repository, 'node_modules/@types')))
  assert.equal(existsSync(join(root, 'package-core/src')), false)
  const base = JSON.parse(
    readFileSync(join(repository, 'tsconfig.base.json'), 'utf8'),
  )
  writeFileSync(
    join(root, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { ...base.compilerOptions, moduleResolution: 'Bundler', noEmit: true, skipLibCheck: false, types: ['node'] }, include: ['src', 'test'] }, null, 2)}\n`,
  )
  writeFileSync(
    join(root, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
}
const mutate = (file, before, after) => {
  const source = readFileSync(file, 'utf8')
  assert.equal(
    source.split(before).length,
    2,
    `${file}: mutation must match once`,
  )
  writeFileSync(file, source.replace(before, after))

  return () => writeFileSync(file, source)
}

try {
  report.inputs = hashes(join(core, 'dist'))
  const workspace = join(artifacts, 'workspace')
  packages(workspace)

  for (const file of [
    'src',
    'test',
    'tsconfig.declarations.json',
    'vitest.config.ts',
  ]) {
    cpSync(join(fixture, file), join(workspace, file), { recursive: true })
  }

  run(
    'source',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    workspace,
  )
  run('runtime', [vitest, 'run', '--config', 'vitest.config.ts'], workspace)
  run(
    'declarations',
    [compiler, '-p', 'tsconfig.declarations.json', '--pretty', 'false'],
    workspace,
  )
  const resultContract = join(
    workspace,
    'package-core/dist/experimental/constructed/contract.d.ts',
  )
  const restoreResultName = mutate(
    resultContract,
    '? ExecutableReturn<',
    '? Update.Return<',
  )
  run(
    'unnamed-init-result-control',
    [
      compiler,
      '-p',
      'tsconfig.declarations.json',
      '--outDir',
      'emitted-control',
      '--pretty',
      'false',
    ],
    workspace,
    false,
    /TS4023.*RegistrationEvidenceTypeId/,
  )
  restoreResultName()
  run(
    'restored-result-emission',
    [compiler, '-p', 'tsconfig.declarations.json', '--pretty', 'false'],
    workspace,
  )
  mkdirSync(join(workspace, 'external'))
  writeFileSync(
    join(workspace, 'external/accepted.ts'),
    readFileSync(join(workspace, 'src/accepted.ts'), 'utf8').replace(
      "from './fixture.js'",
      "from '../emitted/fixture.js'",
    ),
  )
  writeFileSync(
    join(workspace, 'external/tsconfig.json'),
    '{"extends":"../tsconfig.json","include":["accepted.ts"]}\n',
  )
  run(
    'emitted',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    workspace,
  )

  const relocated = join(artifacts, 'relocated')
  packages(relocated, join(workspace, 'package-core'))

  for (const directory of ['emitted', 'external']) {
    cpSync(join(workspace, directory), join(relocated, directory), {
      recursive: true,
    })
  }

  assert.equal(existsSync(join(relocated, 'src')), false)
  run(
    'relocated',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
  )
  const storyType = join(relocated, 'package-core/dist/story/story.d.ts')
  const restoreScoped = mutate(
    storyType,
    'typeof ScopedStory.story & typeof CoreStory.story',
    'typeof CoreStory.story',
  )
  run(
    'lost-scoped-overload-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2769|TS2344/,
  )
  restoreScoped()
  const restoreNative = mutate(
    storyType,
    'typeof ScopedStory.story & typeof CoreStory.story',
    'typeof ScopedStory.story',
  )
  run(
    'lost-native-overload-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2769/,
  )
  restoreNative()
  const nativeSceneType = join(relocated, 'package-core/dist/test/scene.d.ts')
  const restoreNativeMode = mutate(nativeSceneType, 'block?: never;', '')
  run(
    'lost-native-mode-reservation-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2578/,
  )
  restoreNativeMode()
  const scopedSubjectType = join(
    relocated,
    'package-core/dist/experimental/layered/testing/subject.d.ts',
  )
  const scopedSubjectBefore = readFileSync(scopedSubjectType, 'utf8')
  assert.ok(scopedSubjectBefore.includes('update?: never;'))
  assert.ok(scopedSubjectBefore.includes('view?: never;'))
  writeFileSync(
    scopedSubjectType,
    scopedSubjectBefore
      .replace('update?: never;', '')
      .replace('view?: never;', ''),
  )
  run(
    'lost-scoped-mode-reservation-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2578/,
  )
  writeFileSync(scopedSubjectType, scopedSubjectBefore)
  const scopedType = join(
    relocated,
    'package-core/dist/experimental/layered/testing/story.d.ts',
  )
  const scopedBefore = readFileSync(scopedType, 'utf8')
  assert.ok(scopedBefore.includes('Effect.Services<TestEffect<Block, void>>'))
  writeFileSync(
    scopedType,
    scopedBefore.replaceAll(
      'Effect.Services<TestEffect<Block, void>>',
      'never',
    ),
  )
  run(
    'lost-provider-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2344|TS2578/,
  )
  writeFileSync(scopedType, scopedBefore)
  const storyPublicType = join(relocated, 'package-core/dist/story/public.d.ts')
  const restoreInspectionExport = mutate(storyPublicType, 'withBlock,', '')
  run(
    'lost-inspection-export-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2339/,
  )
  restoreInspectionExport()
  const mapperTypes = join(
    relocated,
    'package-core/dist/test/toParentMessageFor.d.ts',
  )
  const restoreAcquiredEvidence = mutate(
    mapperTypes,
    'type Parent = AcquiredTestBlock<unknown> &',
    'type Parent =',
  )
  run(
    'lost-acquired-parent-evidence-control',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
    false,
    /TS2578/,
  )
  restoreAcquiredEvidence()
  run(
    'restored-relocated',
    [compiler, '-p', 'external/tsconfig.json', '--pretty', 'false'],
    relocated,
  )

  const storyRuntime = join(workspace, 'package-core/dist/story/story.js')
  const restoreStoryDispatch = mutate(
    storyRuntime,
    'Predicate.isFunction(subject) ? CoreStory.story : ScopedStory.story',
    'CoreStory.story',
  )
  run(
    'wrong-runtime-dispatch-control',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    workspace,
    false,
    /failed|FAIL/,
  )
  restoreStoryDispatch()
  const mapperRuntime = join(
    workspace,
    'package-core/dist/test/toParentMessageFor.js',
  )
  const restoreSelectedGraph = mutate(
    mapperRuntime,
    ': runtimeBindingOf(resolve(implementation, child)).block;',
    ': implementation;',
  )
  run(
    'lost-selected-child-graph-control',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    workspace,
    false,
    /FAIL|failed/,
  )
  restoreSelectedGraph()
  run(
    'restored-runtime',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    workspace,
  )
  assert.deepEqual(hashes(join(workspace, 'package-core/dist')), report.inputs)
  report.status = 'passed'
  save()
  process.stdout.write(`Results: ${join(artifacts, 'results.json')}\n`)
} catch (error) {
  report.status = 'failed'
  report.failure =
    error instanceof Error ? error.message : globalThis.String(error)
  save()
  throw error
}
