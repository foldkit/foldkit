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
const ui = join(repository, 'packages/ui')
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
const run = (name, args, cwd, accepted = true, diagnostic) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(artifacts, `${name}.log`), output)
  results.push({ name, accepted, exitCode: result.status })
  save()
  assert.equal(result.error, undefined, `${name}: ${result.error?.message}`)
  assert.equal(result.signal, null, `${name}: interrupted`)
  if (accepted)
    assert.equal(result.status, 0, `${name}: see ${artifacts}/${name}.log`)
  else assert.notEqual(result.status, 0, `${name}: unexpectedly passed`)
  if (diagnostic) assert.match(output, diagnostic, `${name}: wrong failure`)
  process.stdout.write(
    `${name}: ${accepted ? 'passed' : 'failed as expected'}\n`,
  )
}
const link = (root, name, target) => {
  const destination = join(root, 'node_modules', name)
  mkdirSync(dirname(destination), { recursive: true })
  symlinkSync(target, destination, 'dir')
}
const dependencies = root => {
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
  link(
    root,
    '@floating-ui',
    realpathSync(join(ui, 'node_modules/@floating-ui')),
  )
}
const config = root => {
  const base = JSON.parse(
    readFileSync(join(repository, 'tsconfig.base.json'), 'utf8'),
  )
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          ...base.compilerOptions,
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          skipLibCheck: false,
          noEmit: true,
          types: ['node'],
        },
        include: ['src', 'test'],
      },
      null,
      2,
    ),
  )
  writeFileSync(
    join(root, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
}
const mutation = (root, file, before, after, count = 1) => {
  const path = join(root, 'package-core/dist', file)
  const original = readFileSync(path, 'utf8')
  assert.equal(
    original.split(before).length - 1,
    count,
    `${file}: mutation anchor`,
  )
  writeFileSync(path, original.replaceAll(before, after))
  return () => writeFileSync(path, original)
}
try {
  const work = join(artifacts, 'workspace')
  mkdirSync(work, { recursive: true })
  dependencies(work)
  config(work)
  cpSync(join(core, 'dist'), join(work, 'package-core/dist'), {
    recursive: true,
  })
  cpSync(join(core, 'package.json'), join(work, 'package-core/package.json'))
  link(work, 'foldkit', join(work, 'package-core'))
  mkdirSync(join(work, 'package-ui'), { recursive: true })
  cpSync(join(ui, 'package.json'), join(work, 'package-ui/package.json'))
  link(work, '@foldkit/ui', join(work, 'package-ui'))
  const uiBase = JSON.parse(
    readFileSync(join(repository, 'tsconfig.base.json'), 'utf8'),
  )
  writeFileSync(
    join(work, 'tsconfig.ui.json'),
    JSON.stringify(
      {
        compilerOptions: {
          ...uiBase.compilerOptions,
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: false,
          declaration: true,
          declarationMap: false,
          rootDir: join(ui, 'src'),
          outDir: join(work, 'package-ui/dist'),
        },
        files: [
          'fileDrop',
          'hoverIntent',
          'dragAndDrop',
          'tooltip',
          'datePicker',
        ].map(name => join(ui, 'src', name, 'public.ts')),
      },
      null,
      2,
    ),
  )
  run(
    'ui-public-build',
    [compiler, '-p', 'tsconfig.ui.json', '--pretty', 'false'],
    work,
  )
  for (const path of ['src', 'test', 'vitest.config.ts'])
    cpSync(join(fixture, path), join(work, path), { recursive: true })
  run('source', [compiler, '-p', 'tsconfig.json', '--pretty', 'false'], work)
  run('runtime', [vitest, 'run', '--config', 'vitest.config.ts'], work)
  writeFileSync(
    join(work, 'tsconfig.declarations.json'),
    JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: {
          noEmit: false,
          declaration: true,
          emitDeclarationOnly: true,
          rootDir: 'src',
          outDir: 'emitted',
        },
        include: ['src'],
        exclude: ['test'],
      },
      null,
      2,
    ),
  )
  run(
    'declarations',
    [compiler, '-p', 'tsconfig.declarations.json', '--pretty', 'false'],
    work,
  )
  const relocated = join(artifacts, 'relocated')
  mkdirSync(relocated, { recursive: true })
  dependencies(relocated)
  config(relocated)
  for (const name of ['core', 'ui']) {
    cpSync(join(work, `package-${name}`), join(relocated, `package-${name}`), {
      recursive: true,
    })
    link(
      relocated,
      name === 'core' ? 'foldkit' : '@foldkit/ui',
      join(relocated, `package-${name}`),
    )
  }
  cpSync(join(work, 'emitted'), join(relocated, 'emitted'), { recursive: true })
  mkdirSync(join(relocated, 'src'))
  writeFileSync(
    join(relocated, 'src/consumer.ts'),
    "import { Effect } from 'effect'\nimport * as Story from 'foldkit/story'\nimport * as Scene from 'foldkit/scene'\nimport { ApplicationBlock } from '../emitted/application.js'\nimport { VariantParent } from '../emitted/bindings.js'\nimport { DatePickerParent } from '../emitted/datePicker.js'\nexport const initialized: Effect.Effect<void> = Story.story(ApplicationBlock, Story.init())\nexport const variant: Effect.Effect<void> = Story.story(VariantParent, Story.init(3))\nexport const datePicker: Effect.Effect<void> = Scene.scene(DatePickerParent, Scene.init())\n",
  )
  run(
    'relocated-consumer',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    relocated,
  )
  let restore = mutation(
    work,
    'block/variantBinding.d.ts',
    '...Validate<Definition, CoreContract<Child>>,',
    '',
    2,
  )
  run(
    'missing-variant-model-validation',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    work,
    false,
    /TS2578/,
  )
  restore()
  restore = mutation(
    work,
    'experimental/constructed/authoring.d.ts',
    '...validation: ValidateForwardedCases<Cases>',
    '...validation: readonly []',
  )
  run(
    'missing-forwarded-variant-validation',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    work,
    false,
    /TS2578/,
  )
  restore()
  restore = mutation(
    work,
    'block/outMessageHandlers.js',
    '!authoringContracts.has(child)',
    'false',
  )
  run(
    'missing-original-forward-child-validation',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    work,
    false,
    /to throw an error/,
  )
  restore()
  const staticFile = 'experimental/contracted/contract.d.ts'
  restore = mutation(
    work,
    staticFile,
    '...PublishedMountValidation<SourceOf<NoInfer<Body>>, Config>,',
    '',
    2,
  )
  run(
    'missing-registration-check',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    work,
    false,
    /TS2578/,
  )
  restore()
  restore = mutation(
    work,
    staticFile,
    'mountRequirements: Mount.RequirementsOf<PublishedMounts<Config>>;',
    'mountRequirements: never;',
  )
  run(
    'lost-callback-authority',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    work,
    false,
    /not assignable|TS2345/,
  )
  restore()
  restore = mutation(
    work,
    'test/bindingMatcher.js',
    'bindingDeclarationOf(frame.binding) === binding',
    'false',
  )
  run(
    'missing-binding-origin',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    work,
    false,
    /could not find a pending keyboard move/,
  )
  restore()
  restore = mutation(
    work,
    'experimental/contracted/runtime.js',
    'if (!authoredImplementation.mounts.includes(mount))',
    'if (false)',
  )
  run(
    'missing-original-reference-check',
    [vitest, 'run', '--config', 'vitest.config.ts'],
    work,
    false,
    /promise resolved|resolved.*instead of rejecting/,
  )
  restore()
  run(
    'restored-source',
    [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
    work,
  )
  run('restored-runtime', [vitest, 'run', '--config', 'vitest.config.ts'], work)
  report.status = 'passed'
  save()
} catch (error) {
  report.status = 'failed'
  report.error = String(error)
  save()
  throw error
}
