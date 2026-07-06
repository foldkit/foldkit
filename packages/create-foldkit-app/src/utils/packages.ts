import {
  Array,
  Effect,
  FileSystem,
  Match,
  Order,
  Path,
  Record,
  Result,
  Schema,
  pipe,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { spawn } from 'node:child_process'

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export const installCommand = (packageManager: PackageManager): string =>
  `${packageManager} install`

const DEV_COMMANDS: Record<PackageManager, string> = {
  pnpm: 'pnpm dev',
  npm: 'npm run dev',
  yarn: 'yarn dev',
  bun: 'bun dev',
}

export const devCommand = (packageManager: PackageManager): string =>
  DEV_COMMANDS[packageManager]

const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/foldkit/foldkit/main/examples'

const NPM_REGISTRY_BASE_URL = 'https://registry.npmjs.org'

const FOLDKIT_SCOPE_PREFIX = '@foldkit/'

const isWindows = process.platform === 'win32'

const StringRecord = Schema.Record(Schema.String, Schema.String)

const PackageJson = Schema.Struct({
  dependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
  devDependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
})

const ProjectPackageJson = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  type: Schema.String,
  scripts: StringRecord,
})

const NpmPackument = Schema.Struct({
  version: Schema.String,
})

const TEMPLATE_DEV_DEPENDENCIES = [
  '@foldkit/vite-plugin',
  '@foldkit/devtools-mcp',
  '@foldkit/oxlint-plugin',
  '@trivago/prettier-plugin-sort-imports',
  'happy-dom',
  'oxlint',
  'prettier',
  'vitest',
]

const isFoldkitPackage = (name: string): boolean =>
  name === 'foldkit' || name.startsWith(FOLDKIT_SCOPE_PREFIX)

type UnresolvedSpec =
  | Readonly<{ _tag: 'Keep'; version: string }>
  | Readonly<{ _tag: 'Latest' }>

const Keep = (version: string): UnresolvedSpec => ({ _tag: 'Keep', version })
const Latest: UnresolvedSpec = { _tag: 'Latest' }

const toUnresolvedSpec = (
  spec: string,
  name: string,
): Result.Result<UnresolvedSpec, void> => {
  if (spec.includes('workspace:')) {
    return isFoldkitPackage(name) ? Result.succeed(Latest) : Result.failVoid
  } else {
    return Result.succeed(Keep(spec))
  }
}

/**
 * Build the runtime dependency map for a scaffolded project from an example's
 * raw `dependencies`. Concrete versions are kept, Foldkit monorepo packages are
 * marked for latest-version resolution, and any other workspace packages (which
 * are not published) are dropped.
 */
export const buildUnresolvedDeps = (
  exampleDeps: Record<string, string>,
): Record<string, UnresolvedSpec> =>
  Record.filterMap(exampleDeps, toUnresolvedSpec)

/**
 * Build the devDependency map for a scaffolded project by merging the always-on
 * template tooling with the example's own `devDependencies`. A concrete version
 * from the example wins over the template's latest marker for the same package.
 */
export const buildUnresolvedDevDeps = (
  exampleDevDeps: Record<string, string>,
): Record<string, UnresolvedSpec> => {
  const templateSpecs = Record.fromIterableWith(
    TEMPLATE_DEV_DEPENDENCIES,
    name => [name, Latest],
  )
  const exampleSpecs = Record.filterMap(exampleDevDeps, toUnresolvedSpec)
  return Record.union(
    templateSpecs,
    exampleSpecs,
    (_templateSpec, exampleSpec) => exampleSpec,
  )
}

const resolveLatestVersion = (name: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const encodedName = name.replace('/', '%2F')
    const url = `${NPM_REGISTRY_BASE_URL}/${encodedName}/latest`
    const response = yield* client.execute(HttpClientRequest.get(url))
    const json = yield* response.json
    const packument = yield* Schema.decodeUnknownEffect(NpmPackument)(json)
    return `^${packument.version}`
  })

const resolveEntry = (name: string, spec: UnresolvedSpec) =>
  Match.value(spec).pipe(
    Match.tagsExhaustive({
      Keep: ({ version }) => Effect.succeed([name, version] as const),
      Latest: () =>
        Effect.map(
          resolveLatestVersion(name),
          version => [name, version] as const,
        ),
    }),
  )

const resolveSpecs = (unresolved: Record<string, UnresolvedSpec>) =>
  Effect.gen(function* () {
    const entries = Record.toEntries(unresolved)
    const resolved = yield* Effect.forEach(
      entries,
      ([name, spec]) => resolveEntry(name, spec),
      { concurrency: 'unbounded' },
    )
    return Record.fromEntries(resolved)
  })

const byPackageName = Order.mapInput(
  Order.String,
  ([name]: readonly [string, string]) => name,
)

const sortDependencies = (
  dependencies: Record<string, string>,
): Record<string, string> =>
  pipe(
    dependencies,
    Record.toEntries,
    Array.sort(byPackageName),
    Record.fromEntries,
  )

const fetchExamplePackageJson = (example: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const url = `${GITHUB_RAW_BASE_URL}/${example}/package.json`
    const response = yield* client.execute(HttpClientRequest.get(url))
    const json = yield* response.json
    return yield* Schema.decodeUnknownEffect(PackageJson)(json)
  })

const writeManifest = (
  projectPath: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const packageJsonPath = path.join(projectPath, 'package.json')
    const content = yield* fs.readFileString(packageJsonPath)
    const packageJson = yield* Schema.decodeUnknownEffect(ProjectPackageJson)(
      JSON.parse(content),
    )

    const updated = {
      ...packageJson,
      dependencies,
      devDependencies,
    }

    yield* fs.writeFileString(
      packageJsonPath,
      `${JSON.stringify(updated, null, 2)}\n`,
    )
  })

const runCommand = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<void, Error> =>
  Effect.callback<void, Error>(
    (resume: (effect: Effect.Effect<void, Error>) => void) => {
      const child = spawn(command, [...args], {
        cwd,
        shell: isWindows,
        stdio: 'inherit',
      })
      child.on('error', error => resume(Effect.fail(error)))
      child.on('exit', code => {
        if (code === 0) {
          resume(Effect.void)
        } else {
          resume(Effect.fail(new Error(`${command} exited with code ${code}`)))
        }
      })
      // NOTE: SIGTERM only — the Effect.callback finalizer is sync so we
      // can't escalate to SIGKILL. On Windows with shell:true the signal
      // hits cmd.exe but doesn't propagate to the package manager.
      return Effect.sync(() => {
        if (child.exitCode === null && !child.killed) {
          child.kill()
        }
      })
    },
  )

export const installDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  example: string,
) =>
  Effect.gen(function* () {
    const examplePackageJson = yield* fetchExamplePackageJson(example)

    const dependencies = yield* resolveSpecs(
      buildUnresolvedDeps(examplePackageJson.dependencies),
    )
    const devDependencies = yield* resolveSpecs(
      buildUnresolvedDevDeps(examplePackageJson.devDependencies),
    )

    yield* writeManifest(
      projectPath,
      sortDependencies(dependencies),
      sortDependencies(devDependencies),
    )

    yield* runCommand(packageManager, ['install'], projectPath)
  })
