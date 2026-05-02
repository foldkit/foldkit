import { Array, Effect, Match, Record, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { spawn } from 'node:child_process'

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

const StringRecord = Schema.Record(Schema.String, Schema.String)

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
    const packageJson = yield* Schema.decodeUnknownEffect(PackageJson)(
      json as Record<string, unknown>,
    )

    return {
      dependencies: formatDeps(packageJson.dependencies),
      devDependencies: formatDeps(packageJson.devDependencies),
    }
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
    },
  )

export const installDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  example: string,
) =>
  Effect.gen(function* () {
    const exampleDeps = yield* fetchExampleDeps(example)

    const installArgs = getInstallArgs(packageManager)
    yield* runCommand(
      packageManager,
      [...installArgs, 'foldkit', ...exampleDeps.dependencies],
      projectPath,
    )

    const installDevArgs = getInstallArgs(packageManager, true)
    yield* runCommand(
      packageManager,
      [
        ...installDevArgs,
        '@foldkit/vite-plugin',
        '@foldkit/devtools-mcp',
        'vitest',
        'happy-dom',
        ...exampleDeps.devDependencies,
      ],
      projectPath,
    )
  })
