import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureRoot = join(packageRoot, 'declaration-tests')
const compiler = join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)

const fail = (message: string): never => {
  throw new Error(message)
}

const runCompiler = (label: string, args: ReadonlyArray<string>): string => {
  const result = spawnSync(compiler, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: process.env,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

  if (result.status !== 0) {
    return fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }

  return output
}

const assertBuiltEntry = (path: string): void => {
  if (!existsSync(join(packageRoot, path))) {
    fail(
      `Missing ${path}. Build the foldkit package before checking its emitted declarations.`,
    )
  }
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
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
}

const prepareConsumer = (directory: string, name: string): void => {
  mkdirSync(join(directory, 'node_modules'), { recursive: true })
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ name, type: 'module' }),
  )

  const dependencies = [
    { name: 'foldkit', target: packageRoot },
    { name: 'effect', target: join(packageRoot, 'node_modules', 'effect') },
  ]
  for (const { name, target } of dependencies) {
    symlinkSync(
      target,
      join(directory, 'node_modules', name),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
  }
}

const assertPortableDeclarations = (directory: string): void => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      assertPortableDeclarations(path)
      continue
    }

    if (!entry.name.endsWith('.d.ts')) {
      continue
    }

    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g,
    )) {
      const reference = match.at(1)
      if (
        reference !== undefined &&
        (isAbsolute(reference) || reference.startsWith('../'))
      ) {
        fail(
          `Emitted declaration ${entry.name} escapes the consumer package through ${reference}.`,
        )
      }
    }
  }
}

const checks: ReadonlyArray<
  Readonly<{
    name: string
    accepted: ReadonlyArray<string>
    rejected: ReadonlyArray<string>
    consumers: ReadonlyArray<string>
  }>
> = [
  {
    name: 'machine',
    accepted: [
      'machine.contracts.ts',
      'machine.quote-request.ts',
      'machine.accepted.ts',
    ],
    rejected: ['machine.rejected.ts'],
    consumers: ['machine.consume.ts'],
  },
  {
    name: 'command-args',
    accepted: ['command-args.accepted.ts', 'command-args.helper.ts'],
    rejected: ['command-args.rejected.ts'],
    consumers: ['command-args.consume.ts'],
  },
  {
    name: 'story-concurrency',
    accepted: ['story-concurrency.accepted.ts'],
    rejected: ['story-concurrency.rejected.ts'],
    consumers: ['story-concurrency.consume.ts'],
  },
  {
    name: 'route-path',
    accepted: ['route-path.accepted.ts'],
    rejected: ['route-path.rejected.ts'],
    consumers: ['route-path.consume.ts'],
  },
]

const main = async (): Promise<void> => {
  for (const entry of [
    'dist/index.d.ts',
    'dist/blocks/public.d.ts',
    'dist/command/public.d.ts',
    'dist/update/public.d.ts',
  ]) {
    assertBuiltEntry(entry)
  }

  const version = runCompiler('Reading the package TypeScript version', [
    '--version',
  ])
  if (!/^Version 7\./.test(version)) {
    fail(`Expected the package TypeScript 7 compiler, received ${version}.`)
  }

  for (const name of ['command-args', 'story-concurrency', 'machine']) {
    runCompiler(`Checking direct source ${name} contracts`, [
      '-p',
      join(fixtureRoot, `tsconfig.${name}.source.json`),
    ])
  }

  const workspace = mkdtempSync(
    join(tmpdir(), 'foldkit-declaration-consumers-'),
  )

  try {
    const emitter = join(workspace, 'emitter')
    const consumer = join(workspace, 'consumer')
    prepareConsumer(emitter, 'foldkit-declaration-emitter')
    prepareConsumer(consumer, 'foldkit-declaration-consumer')
    const sources = join(emitter, 'fixtures')
    cpSync(fixtureRoot, sources, { recursive: true })

    for (const check of checks) {
      const output = join(emitter, 'emitted', check.name)
      const acceptedConfig = join(emitter, `${check.name}.accepted.json`)
      writeFileSync(
        acceptedConfig,
        JSON.stringify({
          compilerOptions: {
            ...compilerOptions,
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: true,
            noEmitOnError: true,
            rootDir: sources,
            outDir: output,
          },
          files: check.accepted.map(name => join(sources, name)),
        }),
      )
      runCompiler(`Emitting external ${check.name} declarations`, [
        '-p',
        acceptedConfig,
      ])
      assertPortableDeclarations(output)

      const rejectedConfig = join(emitter, `${check.name}.rejected.json`)
      writeFileSync(
        rejectedConfig,
        JSON.stringify({
          compilerOptions: { ...compilerOptions, noEmit: true },
          files: check.rejected.map(name => join(sources, name)),
        }),
      )
      runCompiler(`Rejecting invalid external ${check.name} wiring`, [
        '-p',
        rejectedConfig,
      ])

      const relocated = join(consumer, check.name)
      cpSync(output, relocated, { recursive: true })
      const relocatedFixtures = [...check.consumers, ...check.rejected]
      for (const fixture of relocatedFixtures) {
        copyFileSync(join(fixtureRoot, fixture), join(relocated, fixture))
      }
      const consumerConfig = join(relocated, 'tsconfig.json')
      writeFileSync(
        consumerConfig,
        JSON.stringify({
          compilerOptions: { ...compilerOptions, noEmit: true },
          files: relocatedFixtures,
        }),
      )
      runCompiler(`Consuming relocated ${check.name} declarations`, [
        '-p',
        consumerConfig,
      ])
    }

    process.stdout.write(
      `[emitted-declarations] ${version}; external emission, rejected wiring, and relocation checks passed.\n`,
    )
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

try {
  await main()
} catch (error) {
  const message =
    error instanceof Error ? error.message : globalThis.String(error)
  console.error(`[emitted-declarations] ${message}`)
  process.exitCode = 1
}
