import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureRoot = join(packageRoot, 'declaration-tests')
const compiler = join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)
const diagnosticFragments = [
  'Connected Step requires its registered Composition: apply inside makeUpdate/makeInit, or defer with Definition.makeStep',
  "Types of property 'outMessage' are incompatible",
  'Block primary view must be authored with this Composition.makeView',
  'Block handler requirements must be provided locally or listed in hostHandlers',
]
const invalidInitFragments = [
  "Property 'model' is missing",
  "Types of property 'outMessage' are incompatible",
]
const commandDiagnosticFiles = [
  'command-diagnostics.invalid-result.ts',
  'command-diagnostics.invalid-args.ts',
  'command-diagnostics.invalid-interrupt.ts',
  'command-diagnostics.invalid-interrupt-generic.ts',
  'command-diagnostics.invalid-interrupt-policy.ts',
  'command-diagnostics.invalid-interrupt-tuple.ts',
  'command-diagnostics.invalid-interrupt-rest.ts',
]

const fail = (message: string): never => {
  throw new Error(message)
}

const runCompiler = (
  cwd: string,
  args: ReadonlyArray<string>,
): Readonly<{ output: string; status: number }> => {
  const result = spawnSync(compiler, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  })

  if (result.error !== undefined) {
    throw result.error
  }

  return {
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status ?? 1,
  }
}

const requireSuccess = (
  label: string,
  result: Readonly<{ output: string; status: number }>,
): void => {
  if (result.status !== 0) {
    fail(`${label} failed:\n${result.output}`)
  }
}

const requireDiagnostics = (
  label: string,
  result: Readonly<{ output: string; status: number }>,
  fragments: ReadonlyArray<string> = diagnosticFragments,
): void => {
  if (result.status === 0) {
    fail(`${label} unexpectedly accepted the invalid consumer.`)
  }

  for (const fragment of fragments) {
    if (!result.output.includes(fragment)) {
      fail(
        `${label} did not include ${JSON.stringify(fragment)}:\n${result.output}`,
      )
    }
  }
}

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const main = (): void => {
  const sourceAccepted = runCompiler(packageRoot, [
    '-p',
    join(fixtureRoot, 'tsconfig.compiler-diagnostics.source.json'),
    '--pretty',
    'false',
  ])
  requireSuccess('Source diagnostic acceptance', sourceAccepted)

  const sourceInvalid = runCompiler(packageRoot, [
    '-p',
    join(fixtureRoot, 'tsconfig.compiler-diagnostics.invalid.source.json'),
    '--pretty',
    'false',
  ])
  requireDiagnostics('Source diagnostics', sourceInvalid)
  const sourceInvalidInit = runCompiler(packageRoot, [
    '-p',
    join(fixtureRoot, 'tsconfig.compiler-diagnostics.invalid-init.source.json'),
    '--pretty',
    'false',
  ])
  requireDiagnostics(
    'Source init diagnostics',
    sourceInvalidInit,
    invalidInitFragments,
  )

  if (!existsSync(join(packageRoot, 'dist', 'index.d.ts'))) {
    fail('Build the foldkit package before checking emitted diagnostics.')
  }

  const workspace = mkdtempSync(join(tmpdir(), 'foldkit-compiler-diagnostics-'))

  try {
    const nodeModules = join(workspace, 'node_modules')
    const sources = join(workspace, 'sources')
    const emitted = join(workspace, 'emitted')
    mkdirSync(nodeModules)
    mkdirSync(sources)
    symlinkSync(packageRoot, join(nodeModules, 'foldkit'), 'dir')
    symlinkSync(
      join(packageRoot, 'node_modules', 'effect'),
      join(nodeModules, 'effect'),
      'dir',
    )
    writeJson(join(workspace, 'package.json'), { type: 'module' })

    for (const name of [
      'compiler-diagnostics.fixture.ts',
      'compiler-diagnostics.accepted.ts',
      'compiler-diagnostics.invalid.ts',
      'compiler-diagnostics.invalid-init.ts',
      'command-diagnostics.accepted.ts',
      ...commandDiagnosticFiles,
    ]) {
      copyFileSync(join(fixtureRoot, name), join(sources, name))
    }

    const compilerOptions = {
      strict: true,
      skipLibCheck: false,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      lib: ['ESNext', 'DOM'],
      types: [],
      verbatimModuleSyntax: true,
    }
    const emitConfig = join(workspace, 'emit.json')
    writeJson(emitConfig, {
      compilerOptions: {
        ...compilerOptions,
        declaration: true,
        emitDeclarationOnly: true,
        noEmitOnError: true,
        rootDir: sources,
        outDir: emitted,
      },
      files: [
        join(sources, 'compiler-diagnostics.fixture.ts'),
        join(sources, 'compiler-diagnostics.accepted.ts'),
        join(sources, 'command-diagnostics.accepted.ts'),
      ],
    })
    requireSuccess(
      'External diagnostic declaration emission',
      runCompiler(workspace, ['-p', emitConfig, '--pretty', 'false']),
    )
    const acceptedDeclaration = readFileSync(
      join(emitted, 'compiler-diagnostics.accepted.d.ts'),
      'utf8',
    )
    if (acceptedDeclaration.includes('AssemblyDraft<never>')) {
      fail(
        'A valid diagnostic fixture selected the terminal invalid-assembly overload.',
      )
    }

    copyFileSync(
      join(sources, 'compiler-diagnostics.invalid.ts'),
      join(emitted, 'compiler-diagnostics.invalid.ts'),
    )
    copyFileSync(
      join(sources, 'compiler-diagnostics.invalid-init.ts'),
      join(emitted, 'compiler-diagnostics.invalid-init.ts'),
    )
    const consumerConfig = join(workspace, 'consumer.json')
    writeJson(consumerConfig, {
      compilerOptions: { ...compilerOptions, noEmit: true },
      files: [
        join(emitted, 'compiler-diagnostics.fixture.d.ts'),
        join(emitted, 'compiler-diagnostics.accepted.d.ts'),
        join(emitted, 'command-diagnostics.accepted.d.ts'),
        join(emitted, 'compiler-diagnostics.invalid.ts'),
      ],
    })
    requireDiagnostics(
      'Relocated emitted diagnostics',
      runCompiler(workspace, ['-p', consumerConfig, '--pretty', 'false']),
    )
    const invalidInitConsumerConfig = join(
      workspace,
      'invalid-init-consumer.json',
    )
    writeJson(invalidInitConsumerConfig, {
      compilerOptions: { ...compilerOptions, noEmit: true },
      files: [
        join(emitted, 'compiler-diagnostics.fixture.d.ts'),
        join(emitted, 'compiler-diagnostics.invalid-init.ts'),
      ],
    })
    requireDiagnostics(
      'Relocated emitted init diagnostics',
      runCompiler(workspace, [
        '-p',
        invalidInitConsumerConfig,
        '--pretty',
        'false',
      ]),
      invalidInitFragments,
    )

    const acceptedCommandConsumerConfig = join(
      workspace,
      'accepted-command-consumer.json',
    )
    writeJson(acceptedCommandConsumerConfig, {
      compilerOptions: { ...compilerOptions, noEmit: true },
      files: [join(emitted, 'command-diagnostics.accepted.d.ts')],
    })
    requireSuccess(
      'Relocated emitted Command contract acceptance',
      runCompiler(workspace, [
        '-p',
        acceptedCommandConsumerConfig,
        '--pretty',
        'false',
      ]),
    )

    const sourceCommandConfig = join(workspace, 'source-command.json')
    writeJson(sourceCommandConfig, {
      compilerOptions: {
        ...compilerOptions,
        noEmit: true,
        verbatimModuleSyntax: false,
        paths: { foldkit: [join(packageRoot, 'src/index.ts')] },
      },
      files: [
        join(packageRoot, 'src/vite-env.d.ts'),
        join(sources, 'command-diagnostics.accepted.ts'),
      ],
    })
    requireSuccess(
      'Source Command diagnostic acceptance',
      runCompiler(workspace, ['-p', sourceCommandConfig, '--pretty', 'false']),
    )

    for (const file of commandDiagnosticFiles) {
      for (const kind of ['source', 'emitted']) {
        const config = join(workspace, `${kind}-${file}.json`)
        writeJson(config, {
          compilerOptions: {
            ...compilerOptions,
            noEmit: true,
            ...(kind === 'source'
              ? {
                  verbatimModuleSyntax: false,
                  paths: { foldkit: [join(packageRoot, 'src/index.ts')] },
                }
              : {}),
          },
          files: [
            ...(kind === 'source'
              ? [join(packageRoot, 'src/vite-env.d.ts')]
              : []),
            join(sources, file),
          ],
        })
        const result = runCompiler(workspace, [
          '-p',
          config,
          '--pretty',
          'false',
          '--noErrorTruncation',
        ])
        requireDiagnostics(`${kind} ${file}`, result, [])
        const diagnostics = result.output.match(/error TS\d+:/g) ?? []
        const expectedDiagnostic =
          file === 'command-diagnostics.invalid-interrupt-policy.ts'
            ? 'error TS18048:'
            : 'error TS2769:'
        if (
          diagnostics.length !== 2 ||
          diagnostics.some(diagnostic => diagnostic !== expectedDiagnostic)
        ) {
          fail(
            `${kind} Command diagnostics did not identify both invalid definitions in ${file}:\n${result.output}`,
          )
        }
      }
    }

    process.stdout.write(
      '[compiler-diagnostics] Source and relocated emitted diagnostics passed.\n',
    )
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  const message =
    error instanceof Error ? error.message : globalThis.String(error)
  console.error(`[compiler-diagnostics] ${message}`)
  process.exitCode = 1
}
