import { Command, HttpClient, HttpClientRequest } from '@effect/platform'
import { Array, Effect, Match, Record, Schema, pipe } from 'effect'

type PackageManager = 'pnpm' | 'npm' | 'yarn'

const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/foldkit/foldkit/main/examples'

const shouldRunCommandInShell = process.platform === 'win32'

const getInstallArgs = (
  packageManager: PackageManager,
  isDev = false,
): ReadonlyArray<string> =>
  pipe(
    Match.value(packageManager),
    Match.when('npm', () => ['install']),
    Match.when('yarn', () => ['add']),
    Match.when('pnpm', () => ['add']),
    Match.exhaustive,
    args => (isDev ? [...args, '-D'] : args),
  )

const StringRecord = Schema.Record({ key: Schema.String, value: Schema.String })

const PackageJson = Schema.Struct({
  dependencies: Schema.optionalWith(StringRecord, { default: () => ({}) }),
  devDependencies: Schema.optionalWith(StringRecord, { default: () => ({}) }),
})

const formatDeps = (deps: Record<string, string>): ReadonlyArray<string> =>
  pipe(
    deps,
    Record.toEntries,
    Array.filter(([_, version]) => !version.includes('workspace:')),
    Array.map(([name, version]) => `${name}@${version}`),
  )

const fetchExampleDeps = (example: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const url = `${GITHUB_RAW_BASE_URL}/${example}/package.json`
    const response = yield* client.execute(HttpClientRequest.get(url))
    const json = yield* response.json
    const packageJson = yield* Schema.decodeUnknown(PackageJson)(json)

    return {
      dependencies: formatDeps(packageJson.dependencies),
      devDependencies: formatDeps(packageJson.devDependencies),
    }
  })

export const installDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  example: string,
) =>
  Effect.gen(function* () {
    const exampleDeps = yield* fetchExampleDeps(example)

    const installArgs = getInstallArgs(packageManager)
    const installDeps = Command.make(
      packageManager,
      ...installArgs,
      'foldkit',
      ...exampleDeps.dependencies,
    ).pipe(
      Command.runInShell(shouldRunCommandInShell),
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDeps)

    const installDevArgs = getInstallArgs(packageManager, true)
    const installDevDeps = Command.make(
      packageManager,
      ...installDevArgs,
      '@foldkit/vite-plugin',
      'vitest',
      'happy-dom',
      ...exampleDeps.devDependencies,
    ).pipe(
      Command.runInShell(shouldRunCommandInShell),
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDevDeps)
  })
