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
const repositoryRoot = resolve(packageRoot, '../..')
const foldkitRoot = join(repositoryRoot, 'packages', 'foldkit')
const fixtureRoot = join(packageRoot, 'declaration-tests')
const compiler = join(
  foldkitRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)

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

const fail = (message: string): never => {
  throw new Error(message)
}

const runCompiler = (label: string, args: ReadonlyArray<string>): string => {
  const result = spawnSync(compiler, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: process.env,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

  if (result.status !== 0) {
    return fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }

  return output
}

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, 'utf8'))

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const coreDeclarationPaths = (coreDist: string): Record<string, string[]> => {
  const packageJson = readJson(join(foldkitRoot, 'package.json')) as Readonly<{
    exports: Readonly<Record<string, Readonly<{ types: string }>>>
  }>

  return globalThis.Object.fromEntries(
    globalThis.Object.entries(packageJson.exports).map(([subpath, entry]) => [
      subpath === '.' ? 'foldkit' : `foldkit/${subpath.slice(2)}`,
      [join(coreDist, entry.types.replace('./dist/', ''))],
    ]),
  )
}

const materializePackage = (
  consumerRoot: string,
  packageName: string,
  sourceRoot: string,
  distRoot: string,
): void => {
  const packagePath = join(
    consumerRoot,
    'node_modules',
    ...packageName.split('/'),
  )
  mkdirSync(packagePath, { recursive: true })
  copyFileSync(
    join(sourceRoot, 'package.json'),
    join(packagePath, 'package.json'),
  )
  cpSync(distRoot, join(packagePath, 'dist'), { recursive: true })
}

const linkDependency = (
  consumerRoot: string,
  dependencyName: string,
  target: string,
): void => {
  const dependencyPath = join(
    consumerRoot,
    'node_modules',
    ...dependencyName.split('/'),
  )
  mkdirSync(dirname(dependencyPath), { recursive: true })
  symlinkSync(
    target,
    dependencyPath,
    process.platform === 'win32' ? 'junction' : 'dir',
  )
}

const prepareConsumer = (
  consumerRoot: string,
  name: string,
  coreDist: string,
  uiDist: string,
): void => {
  mkdirSync(join(consumerRoot, 'node_modules'), { recursive: true })
  writeJson(join(consumerRoot, 'package.json'), { name, type: 'module' })
  materializePackage(consumerRoot, 'foldkit', foldkitRoot, coreDist)
  materializePackage(consumerRoot, '@foldkit/ui', packageRoot, uiDist)
  linkDependency(
    consumerRoot,
    'effect',
    join(foldkitRoot, 'node_modules', 'effect'),
  )
  linkDependency(
    consumerRoot,
    'parse5',
    join(foldkitRoot, 'node_modules', 'parse5'),
  )
  linkDependency(
    consumerRoot,
    '@floating-ui/dom',
    join(packageRoot, 'node_modules', '@floating-ui', 'dom'),
  )
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
    if (source.includes('@foldkit/ui/dist/')) {
      fail(`Emitted declaration ${entry.name} references a private UI module.`)
    }

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

const main = (): void => {
  for (const fixture of [
    'generic-composition.accepted.ts',
    'generic-composition.rejected.ts',
    'generic-composition.consume.ts',
    'test-namespaces.accepted.ts',
    'kernel-operation-channels.accepted.ts',
    'kernel-operation-channels.consume.ts',
    'shared-dialog-renderer.ts',
    'shared-dialog-renderer.accepted.ts',
    'shared-dialog-renderer.rejected.ts',
    'shared-dialog-renderer.consume.ts',
  ]) {
    if (!existsSync(join(fixtureRoot, fixture))) {
      fail(`Missing declaration fixture ${fixture}.`)
    }
  }

  const version = runCompiler('Reading the package TypeScript version', [
    '--version',
  ])
  if (!/^Version 7\./.test(version)) {
    fail(`Expected the package TypeScript 7 compiler, received ${version}.`)
  }

  runCompiler('Checking shared Dialog renderer source contracts', [
    '-p',
    join(fixtureRoot, 'tsconfig.shared-dialog-renderer.source.json'),
  ])

  const workspace = mkdtempSync(join(tmpdir(), 'foldkit-ui-declarations-'))

  try {
    const coreDist = join(workspace, 'packages', 'foldkit', 'dist')
    const uiDist = join(workspace, 'packages', 'ui', 'dist')
    const coreConfig = join(workspace, 'foldkit.build.json')
    const uiConfig = join(workspace, 'ui.build.json')
    writeJson(coreConfig, {
      extends: join(foldkitRoot, 'tsconfig.build.json'),
      compilerOptions: {
        outDir: coreDist,
        tsBuildInfoFile: join(workspace, 'foldkit.tsbuildinfo'),
        declarationMap: false,
      },
    })
    runCompiler('Building isolated foldkit declarations', ['-p', coreConfig])

    writeJson(uiConfig, {
      extends: join(packageRoot, 'tsconfig.build.json'),
      compilerOptions: {
        paths: {
          ...coreDeclarationPaths(coreDist),
          effect: [
            join(packageRoot, 'node_modules', 'effect', 'dist', 'index.d.ts'),
          ],
        },
        outDir: uiDist,
        tsBuildInfoFile: join(workspace, 'ui.tsbuildinfo'),
        declarationMap: false,
      },
    })
    runCompiler('Building isolated UI declarations', ['-p', uiConfig])

    const emitter = join(workspace, 'emitter')
    const consumer = join(workspace, 'consumer')
    prepareConsumer(emitter, 'foldkit-ui-declaration-emitter', coreDist, uiDist)
    prepareConsumer(
      consumer,
      'foldkit-ui-declaration-consumer',
      coreDist,
      uiDist,
    )

    const sources = join(emitter, 'fixtures')
    mkdirSync(sources, { recursive: true })
    for (const fixture of [
      'generic-composition.accepted.ts',
      'generic-composition.rejected.ts',
      'test-namespaces.accepted.ts',
      'kernel-operation-channels.accepted.ts',
      'shared-dialog-renderer.ts',
      'shared-dialog-renderer.accepted.ts',
      'shared-dialog-renderer.rejected.ts',
    ]) {
      copyFileSync(join(fixtureRoot, fixture), join(sources, fixture))
    }

    const output = join(emitter, 'emitted')
    const acceptedConfig = join(emitter, 'accepted.json')
    writeJson(acceptedConfig, {
      compilerOptions: {
        ...compilerOptions,
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: true,
        noEmitOnError: true,
        rootDir: sources,
        outDir: output,
      },
      files: [
        join(sources, 'generic-composition.accepted.ts'),
        join(sources, 'test-namespaces.accepted.ts'),
        join(sources, 'kernel-operation-channels.accepted.ts'),
        join(sources, 'shared-dialog-renderer.accepted.ts'),
      ],
    })
    runCompiler('Emitting external generic UI declarations', [
      '-p',
      acceptedConfig,
    ])
    assertPortableDeclarations(output)

    const acceptedDeclaration = readFileSync(
      join(output, 'generic-composition.accepted.d.ts'),
      'utf8',
    )
    if (
      !acceptedDeclaration.includes(
        'Combobox.Completed<"Apple" | "Pear", "Apple" | "Pear">',
      )
    ) {
      fail(
        'The generic Combobox export did not retain its public Completed type.',
      )
    }

    if (!acceptedDeclaration.includes('Combobox.Completed<string, number>')) {
      fail(
        'The generic Combobox export did not retain a transformed Item Codec encoded type.',
      )
    }

    const rejectedConfig = join(emitter, 'rejected.json')
    writeJson(rejectedConfig, {
      compilerOptions: { ...compilerOptions, noEmit: true },
      files: [
        join(sources, 'generic-composition.rejected.ts'),
        join(sources, 'shared-dialog-renderer.rejected.ts'),
      ],
    })
    runCompiler('Rejecting invalid generic UI wiring', ['-p', rejectedConfig])

    const relocated = join(consumer, 'generic-composition')
    cpSync(output, relocated, { recursive: true })
    copyFileSync(
      join(fixtureRoot, 'generic-composition.consume.ts'),
      join(relocated, 'generic-composition.consume.ts'),
    )
    for (const fixture of [
      'kernel-operation-channels.consume.ts',
      'shared-dialog-renderer.consume.ts',
      'shared-dialog-renderer.rejected.ts',
    ]) {
      copyFileSync(join(fixtureRoot, fixture), join(relocated, fixture))
    }
    const consumerConfig = join(relocated, 'tsconfig.json')
    writeJson(consumerConfig, {
      compilerOptions: { ...compilerOptions, noEmit: true },
      files: [
        'generic-composition.consume.ts',
        'kernel-operation-channels.consume.ts',
        'shared-dialog-renderer.consume.ts',
        'shared-dialog-renderer.rejected.ts',
      ],
    })
    runCompiler('Consuming relocated generic UI declarations', [
      '-p',
      consumerConfig,
    ])

    process.stdout.write(
      `[ui-emitted-declarations] ${version}; shared Dialog source contracts, isolated package build, external emission, exact kernel operation channels, rejected wiring, and relocation checks passed.\n`,
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
  console.error(`[ui-emitted-declarations] ${message}`)
  process.exitCode = 1
}
