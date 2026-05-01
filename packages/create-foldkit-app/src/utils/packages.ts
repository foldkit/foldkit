// @ts-nocheck
import { Array, Effect, Match, Record, Schema, pipe } from 'effect'
import { Command, HttpClient, HttpClientRequest } from 'effect/unstable/http'

type PackageManager = 'pnpm' | 'npm' | 'yarn'

const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/foldkit/foldkit/main/examples'

const isWindows = process.platform === 'win32'

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
  dependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
  devDependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
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
    const packageJson = yield* Schema.decodeUnknownEffect(PackageJson)(json)

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
      Command.runInShell(isWindows),
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
      '@foldkit/devtools-mcp',
      'vitest',
      'happy-dom',
      ...exampleDeps.devDependencies,
    ).pipe(
      Command.runInShell(isWindows),
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDevDeps)
  })
