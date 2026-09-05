import {
  Array,
  Data,
  Effect,
  FileSystem,
  Match,
  Option,
  Order,
  Path,
  Record,
  Schema,
  pipe,
} from 'effect'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { type Scaffold } from '../rendering.js'

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

const RUN_SCRIPT_PREFIXES: Record<PackageManager, string> = {
  pnpm: 'pnpm',
  npm: 'npm run',
  yarn: 'yarn',
  bun: 'bun run',
}

export const runScriptCommand = (
  packageManager: PackageManager,
  script: string,
): string => `${RUN_SCRIPT_PREFIXES[packageManager]} ${script}`

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

const ReleaseManifest = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  channel: Schema.Literals(['stable', 'canary']),
  sourceCommit: Schema.String,
  packages: StringRecord,
  dependencies: StringRecord,
})

const TEMPLATE_DEV_DEPENDENCIES = [
  '@foldkit/devtools',
  '@foldkit/vite-plugin',
  '@foldkit/devtools-mcp',
  '@foldkit/oxlint-plugin',
  '@trivago/prettier-plugin-sort-imports',
  'happy-dom',
  'oxlint',
  'prettier',
  'vitest',
]

const SERVER_RENDERING_DEV_DEPENDENCIES = ['@types/node']

type UnresolvedSpec = Data.TaggedEnum<{
  Keep: { readonly version: string }
  Release: {}
  Workspace: {}
}>

const UnresolvedSpec = Data.taggedEnum<UnresolvedSpec>()
const { Keep, Release, Workspace } = UnresolvedSpec

const toUnresolvedSpec = (spec: string): UnresolvedSpec => {
  if (spec.includes('workspace:')) {
    return Workspace()
  } else {
    return Keep({ version: spec })
  }
}

const preferConcreteSpec = (
  templateSpec: UnresolvedSpec,
  exampleSpec: UnresolvedSpec,
): UnresolvedSpec => (exampleSpec._tag === 'Keep' ? exampleSpec : templateSpec)

/**
 * Build the runtime dependency map for a scaffolded project from an example's
 * raw `dependencies`. Concrete versions are kept and workspace versions are
 * marked for lookup in the CLI release manifest. Workspace packages absent
 * from that public release set are dropped during resolution.
 */
export const buildUnresolvedDeps = (
  exampleDeps: Record<string, string>,
): Record<string, UnresolvedSpec> => Record.map(exampleDeps, toUnresolvedSpec)

/**
 * Build the devDependency map for a scaffolded project by merging the always-on
 * template tooling and any extra scaffold devDependencies with the example's
 * own `devDependencies`. A concrete version from the example wins over a
 * release marker for the same package.
 */
export const buildUnresolvedDevDeps = (
  exampleDevDeps: Record<string, string>,
  extraDevDependencies: ReadonlyArray<string>,
): Record<string, UnresolvedSpec> => {
  const templateSpecs = Record.fromIterableWith(
    [...TEMPLATE_DEV_DEPENDENCIES, ...extraDevDependencies],
    name => [name, Release()],
  )
  const exampleSpecs = Record.map(exampleDevDeps, toUnresolvedSpec)

  return Record.union(templateSpecs, exampleSpecs, preferConcreteSpec)
}

/**
 * The repo example whose `package.json` supplies a scaffold's dependency
 * versions. An SPA scaffold reads from its chosen starter example; the SSG and
 * SSR scaffolds read from the reference apps their overlay files mirror.
 */
export const dependencyExample = (scaffold: Scaffold): string =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: ({ example }) => example,
      Ssg: () => 'ssg',
      Ssr: () => 'ssr',
    }),
  )

/**
 * The devDependencies a scaffold needs beyond the template tooling and the
 * example's own list. The server-rendered scaffolds ship Node build
 * scripts, so they need `@types/node` to typecheck.
 */
export const scaffoldDevDependencies = (
  scaffold: Scaffold,
): ReadonlyArray<string> =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: () => [],
      Ssg: () => SERVER_RENDERING_DEV_DEPENDENCIES,
      Ssr: () => SERVER_RENDERING_DEV_DEPENDENCIES,
    }),
  )

const getTemplateRoot = (currentDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const bundledRoot = path.resolve(currentDir, '..', 'templates')

    if (yield* fs.exists(bundledRoot)) {
      return bundledRoot
    } else {
      return path.resolve(currentDir, '..', '..', 'templates')
    }
  })

const readReleaseManifest = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const templateRoot = yield* getTemplateRoot(currentDir)
  const content = yield* fs.readFileString(
    path.join(templateRoot, 'release.json'),
  )

  return yield* Schema.decodeUnknownEffect(ReleaseManifest)(JSON.parse(content))
})

/**
 * The git ref in the Foldkit repository that matches a CLI release manifest.
 * A stable release is tagged `foldkit@<version>` at promotion, so the ref is
 * that tag for the manifest's `foldkit` package. A canary release is
 * commit-addressed and never tagged, so the ref is its source commit.
 */
export const foldkitSubtreeRef = (
  manifest: typeof ReleaseManifest.Type,
): string =>
  Match.value(manifest.channel).pipe(
    Match.when('stable', () =>
      Option.match(Record.get(manifest.packages, 'foldkit'), {
        onNone: () => manifest.sourceCommit,
        onSome: version => `foldkit@${version}`,
      }),
    ),
    Match.when('canary', () => manifest.sourceCommit),
    Match.exhaustive,
  )

/**
 * The subtree ref for the release manifest bundled with this CLI. The create
 * command resolves it before scaffolding, so a broken manifest fails before
 * any files are created, then prints it in the success message so the user
 * vendors the Foldkit repository at the release the scaffold installs.
 */
export const readFoldkitSubtreeRef = Effect.map(
  readReleaseManifest,
  foldkitSubtreeRef,
)

const releaseVersions = (manifest: typeof ReleaseManifest.Type) =>
  Record.union(
    manifest.dependencies,
    manifest.packages,
    (_, version) => version,
  )

const resolveReleaseVersion = (
  versions: Record<string, string>,
  name: string,
) =>
  Option.match(Record.get(versions, name), {
    onNone: () => Effect.fail(`The CLI release does not declare ${name}.`),
    onSome: Effect.succeed,
  })

const resolveEntry = (
  versions: Record<string, string>,
  name: string,
  spec: UnresolvedSpec,
) =>
  Match.value(spec).pipe(
    Match.withReturnType<
      Effect.Effect<Option.Option<readonly [string, string]>, string>
    >(),
    Match.tagsExhaustive({
      Keep: ({ version }) => Effect.succeed(Option.some([name, version])),
      Release: () =>
        Effect.map(resolveReleaseVersion(versions, name), version =>
          Option.some([name, version]),
        ),
      Workspace: () =>
        Effect.succeed(
          Option.map(Record.get(versions, name), version => [name, version]),
        ),
    }),
  )

const resolveSpecs = (
  versions: Record<string, string>,
  unresolved: Record<string, UnresolvedSpec>,
) =>
  Effect.gen(function* () {
    const entries = Record.toEntries(unresolved)

    const resolved = yield* Effect.forEach(
      entries,
      ([name, spec]) => resolveEntry(versions, name, spec),
      { concurrency: 'unbounded' },
    )

    return Record.fromEntries(Array.getSomes(resolved))
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

const readExamplePackageJson = (
  example: string,
  maybeDependencyManifestsDirectory: Option.Option<string>,
) =>
  Option.match(maybeDependencyManifestsDirectory, {
    onNone: () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const currentDir = path.dirname(fileURLToPath(import.meta.url))
        const templateRoot = yield* getTemplateRoot(currentDir)
        const content = yield* fs.readFileString(
          path.join(templateRoot, 'examples', example, 'package.json'),
        )

        return yield* Schema.decodeUnknownEffect(PackageJson)(
          JSON.parse(content),
        )
      }),
    onSome: directory =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const content = yield* fs.readFileString(
          path.join(directory, example, 'package.json'),
        )

        return yield* Schema.decodeUnknownEffect(PackageJson)(
          JSON.parse(content),
        )
      }),
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
  scaffold: Scaffold,
  maybeDependencyManifestsDirectory: Option.Option<string>,
) =>
  Effect.gen(function* () {
    const releaseManifest = yield* readReleaseManifest
    const versions = releaseVersions(releaseManifest)
    const examplePackageJson = yield* readExamplePackageJson(
      dependencyExample(scaffold),
      maybeDependencyManifestsDirectory,
    )

    const dependencies = yield* resolveSpecs(
      versions,
      buildUnresolvedDeps(examplePackageJson.dependencies),
    )
    const devDependencies = yield* resolveSpecs(
      versions,
      buildUnresolvedDevDeps(
        examplePackageJson.devDependencies,
        scaffoldDevDependencies(scaffold),
      ),
    )

    yield* writeManifest(
      projectPath,
      sortDependencies(dependencies),
      sortDependencies(devDependencies),
    )

    yield* runCommand(packageManager, ['install'], projectPath)
  })
