import { FileSystem, Path } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import {
  Array,
  Console,
  Effect,
  Match as M,
  Option,
  Record,
  pipe,
} from 'effect'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exampleSlugs } from '../packages/website/src/page/example/meta'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..')
const EXAMPLES_DIRECTORY = resolve(REPOSITORY_ROOT, 'examples')
const FOLDKIT_PACKAGE_JSON_PATH = resolve(
  REPOSITORY_ROOT,
  'packages/foldkit/package.json',
)
const VITE_PLUGIN_PACKAGE_JSON_PATH = resolve(
  REPOSITORY_ROOT,
  'packages/vite-plugin-foldkit/package.json',
)
const TSCONFIG_BASE_PATH = resolve(REPOSITORY_ROOT, 'tsconfig.base.json')
const PNPM_VERSION = 'pnpm@10.33.0'
const STACKBLITZ_RC = `{
  "installDependencies": false,
  "startCommand": "pnpm install && pnpm dev"
}
`
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist'])
const VITE_CONFIG_CONTENTS = `import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
})
`

type PackageJson = Readonly<{
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}>

type TsConfig = Readonly<{
  extends?: string
  compilerOptions?: Record<string, unknown>
  include?: ReadonlyArray<string>
  exclude?: ReadonlyArray<string>
  [key: string]: unknown
}>

const readJson = <T>(
  path: string,
): Effect.Effect<T, unknown, FileSystem.FileSystem> =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap(fileSystem => fileSystem.readFileString(path)),
    Effect.map(contents => JSON.parse(contents) as T),
  )

const rewriteDependencySpec =
  (foldkitVersion: string, vitePluginVersion: string) =>
  (name: string, specifier: string): string => {
    if (specifier !== 'workspace:*') {
      return specifier
    } else {
      return M.value(name).pipe(
        M.when('foldkit', () => `^${foldkitVersion}`),
        M.when('@foldkit/vite-plugin', () => `^${vitePluginVersion}`),
        M.orElse(() => specifier),
      )
    }
  }

const rewriteDependencies = (
  dependencies: Record<string, string> | undefined,
  rewriteSpec: (name: string, specifier: string) => string,
): Record<string, string> | undefined =>
  dependencies === undefined
    ? undefined
    : Record.mapEntries(dependencies, (specifier, name) => [
        name,
        rewriteSpec(name, specifier),
      ])

const transformPackageJson = (
  raw: string,
  foldkitVersion: string,
  vitePluginVersion: string,
): string => {
  const packageJson = JSON.parse(raw) as PackageJson
  const rewriteSpec = rewriteDependencySpec(foldkitVersion, vitePluginVersion)
  const transformed: PackageJson = {
    ...packageJson,
    dependencies: rewriteDependencies(packageJson.dependencies, rewriteSpec),
    devDependencies: rewriteDependencies(
      packageJson.devDependencies,
      rewriteSpec,
    ),
    packageManager: PNPM_VERSION,
  }
  return JSON.stringify(transformed, null, 2) + '\n'
}

const transformTsConfig = (
  raw: string,
  baseCompilerOptions: Record<string, unknown>,
  baseExclude: ReadonlyArray<string>,
): string => {
  const tsConfig = JSON.parse(raw) as TsConfig
  const merged: TsConfig = {
    compilerOptions: {
      ...baseCompilerOptions,
      ...(tsConfig.compilerOptions ?? {}),
    },
    ...(tsConfig.include ? { include: tsConfig.include } : {}),
    exclude: Array.dedupe([...baseExclude, ...(tsConfig.exclude ?? [])]),
  }
  return JSON.stringify(merged, null, 2) + '\n'
}

const copyDirectoryRecursive = (
  sourceDirectory: string,
  targetDirectory: string,
): Effect.Effect<void, unknown, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* fileSystem.makeDirectory(targetDirectory, { recursive: true })
    const entries = yield* fileSystem.readDirectory(sourceDirectory)

    yield* Effect.forEach(entries, entry =>
      Effect.gen(function* () {
        const sourceEntry = path.join(sourceDirectory, entry)
        const targetEntry = path.join(targetDirectory, entry)
        const info = yield* fileSystem.stat(sourceEntry)
        if (info.type === 'Directory') {
          if (EXCLUDED_DIRECTORIES.has(entry)) {
            return
          }
          yield* copyDirectoryRecursive(sourceEntry, targetEntry)
        } else {
          yield* fileSystem.copyFile(sourceEntry, targetEntry)
        }
      }),
    )
  })

const rewriteTsConfigFile = (
  tsConfigPath: string,
  baseCompilerOptions: Record<string, unknown>,
  baseExclude: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const exists = yield* fileSystem.exists(tsConfigPath)
    if (!exists) {
      return
    }
    const raw = yield* fileSystem.readFileString(tsConfigPath)
    yield* fileSystem.writeFileString(
      tsConfigPath,
      transformTsConfig(raw, baseCompilerOptions, baseExclude),
    )
  })

const rewritePackageJsonFile = (
  packageJsonPath: string,
  foldkitVersion: string,
  vitePluginVersion: string,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(packageJsonPath)
    yield* fileSystem.writeFileString(
      packageJsonPath,
      transformPackageJson(raw, foldkitVersion, vitePluginVersion),
    )
  })

const generateExample = (
  slug: string,
  outputDirectory: string,
  foldkitVersion: string,
  vitePluginVersion: string,
  baseCompilerOptions: Record<string, unknown>,
  baseExclude: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const sourceDirectory = resolve(EXAMPLES_DIRECTORY, slug)
    const targetDirectory = path.join(outputDirectory, slug)

    yield* Console.log(`Generating ${slug}`)
    yield* copyDirectoryRecursive(sourceDirectory, targetDirectory)

    yield* rewritePackageJsonFile(
      path.join(targetDirectory, 'package.json'),
      foldkitVersion,
      vitePluginVersion,
    )
    yield* rewriteTsConfigFile(
      path.join(targetDirectory, 'tsconfig.json'),
      baseCompilerOptions,
      baseExclude,
    )
    yield* fileSystem.writeFileString(
      path.join(targetDirectory, 'vite.config.ts'),
      VITE_CONFIG_CONTENTS,
    )
    yield* fileSystem.writeFileString(
      path.join(targetDirectory, '.stackblitzrc'),
      STACKBLITZ_RC,
    )
  })

const outputDirectoryArgument = pipe(
  Option.fromNullable(process.argv[2]),
  Option.getOrElse(() => {
    console.error(
      'Usage: tsx scripts/generate-stackblitz-examples.ts <output-directory>',
    )
    process.exit(1)
  }),
)

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const foldkitPackageJson = yield* readJson<PackageJson>(
    FOLDKIT_PACKAGE_JSON_PATH,
  )
  const vitePluginPackageJson = yield* readJson<PackageJson>(
    VITE_PLUGIN_PACKAGE_JSON_PATH,
  )
  const tsConfigBase = yield* readJson<TsConfig>(TSCONFIG_BASE_PATH)

  yield* fileSystem
    .remove(outputDirectoryArgument, { recursive: true, force: true })
    .pipe(Effect.catchAll(() => Effect.void))
  yield* fileSystem.makeDirectory(outputDirectoryArgument, { recursive: true })

  yield* Effect.forEach(
    exampleSlugs,
    slug =>
      generateExample(
        slug,
        outputDirectoryArgument,
        foldkitPackageJson.version,
        vitePluginPackageJson.version,
        tsConfigBase.compilerOptions ?? {},
        tsConfigBase.exclude ?? [],
      ),
    { concurrency: 'unbounded' },
  )

  yield* Console.log(
    `Generated ${exampleSlugs.length} examples into ${outputDirectoryArgument}`,
  )
})

NodeRuntime.runMain(Effect.provide(program, NodeContext.layer))
