import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const packageRoot = join(repository, 'packages/foldkit')
const fixtures = join(packageRoot, 'declaration-tests')
const workspace = mkdtempSync(join(tmpdir(), 'foldkit-binding-declarations-'))
const compilers = [
  join(repository, 'node_modules/typescript/bin/tsc6'),
  join(
    packageRoot,
    'node_modules/.bin',
    process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
  ),
]
const compilerOptions = {
  strict: true,
  skipLibCheck: false,
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  target: 'ES2022',
  lib: ['ESNext', 'DOM'],
  types: [],
  verbatimModuleSyntax: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
}

const run = (compiler, args, cwd) => {
  const result = spawnSync(compiler, args, { cwd, encoding: 'utf8' })

  if (result.error !== undefined) {
    throw result.error
  }

  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  }
}

const requireSuccess = (compiler, args, cwd) => {
  const result = run(compiler, args, cwd)

  if (result.status !== 0) {
    throw new Error(result.output)
  }

  return result.output
}

const makeProject = directory => {
  mkdirSync(join(directory, 'node_modules'), { recursive: true })
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n')
  symlinkSync(packageRoot, join(directory, 'node_modules/foldkit'), 'junction')
  symlinkSync(
    realpathSync(join(packageRoot, 'node_modules/effect')),
    join(directory, 'node_modules/effect'),
    'junction',
  )
}

const writeConfig = (directory, files, options) =>
  writeFileSync(
    join(directory, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { ...compilerOptions, ...options }, files }, null, 2)}\n`,
  )

try {
  if (!existsSync(join(packageRoot, 'dist/block/public.d.ts'))) {
    throw new Error('Build foldkit before checking the external declarations.')
  }

  for (const [index, compiler] of compilers.entries()) {
    const version = requireSuccess(compiler, ['--version'], repository).trim()
    const emitter = join(workspace, `emitter-${index}`)
    const consumer = join(workspace, `consumer-${index}`)
    makeProject(emitter)
    makeProject(consumer)

    for (const file of [
      'binding-relationships.accepted.ts',
      'from-assembly.assertions.ts',
    ]) {
      copyFileSync(join(fixtures, file), join(emitter, file))
    }

    writeConfig(emitter, ['binding-relationships.accepted.ts'], {
      declaration: true,
      declarationMap: false,
      emitDeclarationOnly: true,
      noEmitOnError: true,
      outDir: 'emitted',
    })
    requireSuccess(
      compiler,
      ['-p', join(emitter, 'tsconfig.json'), '--pretty', 'false'],
      emitter,
    )

    for (const file of [
      'binding-relationships.accepted.d.ts',
      'from-assembly.assertions.d.ts',
    ]) {
      copyFileSync(join(emitter, 'emitted', file), join(consumer, file))
    }

    for (const file of [
      'binding-relationships.consume.ts',
      'binding-relationships.rejected.ts',
    ]) {
      copyFileSync(join(fixtures, file), join(consumer, file))
    }

    const declarations = readFileSync(
      join(consumer, 'binding-relationships.accepted.d.ts'),
      'utf8',
    )

    if (/\/dist\/|experimental\/constructed\//.test(declarations)) {
      throw new Error(
        'Exported builder declarations refer to a private implementation path.',
      )
    }

    writeConfig(
      consumer,
      ['binding-relationships.consume.ts', 'binding-relationships.rejected.ts'],
      { noEmit: true },
    )
    const args = ['-p', join(consumer, 'tsconfig.json'), '--pretty', 'false']
    requireSuccess(compiler, args, consumer)

    const rejected = join(consumer, 'binding-relationships.rejected.ts')
    const original = readFileSync(rejected, 'utf8')
    const marker =
      '// @ts-expect-error Completion rejects child Command Services and errors omitted by the parent contract.\n'

    if (!original.includes(marker)) {
      throw new Error(
        'The missing-effects negative-control expectation is absent.',
      )
    }

    try {
      writeFileSync(rejected, original.replace(marker, ''))
      const negative = run(compiler, args, consumer)

      if (
        negative.status === 0 ||
        !negative.output.includes('BindingRelationshipsMissingEffectsParent') ||
        !negative.output.includes('InvalidContractChannel')
      ) {
        throw new Error(
          `The missing-effects control failed for an unexpected reason:\n${negative.output}`,
        )
      }
    } finally {
      writeFileSync(rejected, original)
    }

    requireSuccess(compiler, args, consumer)
    process.stdout.write(
      `${version}: external emission, relocation, rejected wiring and negative control passed.\n`,
    )
  }
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
