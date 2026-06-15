import { Array, Effect, Match, Record, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { spawn } from 'node:child_process'

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

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
    Match.when('bun', () => ['add']),
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

// NOTE: foldkit workspace packages an example may depend on that aren't
// already installed at `latest` by the hardcoded commands below. They ship
// from the same monorepo, so pin them to `latest` like `foldkit` itself.
const PASS_THROUGH_WORKSPACE_PACKAGES = new Set([
  '@foldkit/ui',
  '@foldkit/devtools',
])

const formatDeps = (deps: Record<string, string>): ReadonlyArray<string> =>
  pipe(
    deps,
    Record.toEntries,
    Array.filter(
      ([name, version]) =>
        !version.includes('workspace:') ||
        PASS_THROUGH_WORKSPACE_PACKAGES.has(name),
    ),
    Array.map(([name, version]) =>
      version.includes('workspace:') ? `${name}@latest` : `${name}@${version}`,
    ),
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
