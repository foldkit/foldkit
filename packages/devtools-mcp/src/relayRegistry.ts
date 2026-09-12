import { Config, Effect, Exit, FileSystem, Option, Path, Schema } from 'effect'
import { tmpdir } from 'node:os'

// NOTE: `@foldkit/vite-plugin` carries the writing half of this module. The
// two packages release independently and this one bundles without a
// dependency on the plugin, so the record format is a contract between them:
// change `version` when the shape changes, and change both copies.

const REGISTRY_DIRECTORY_NAME = 'foldkit-devtools-relays'
const REGISTRY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'

/**
 * What a running Foldkit dev server publishes while its DevTools MCP relay is
 * listening. One record per Vite project root.
 */
export const RelayRecord = Schema.Struct({
  version: Schema.Literal(1),
  root: Schema.String,
  url: Schema.String,
  pid: Schema.Number,
  startedAt: Schema.Number,
})
/** What a running dev server publishes about its DevTools MCP relay. */
export type RelayRecord = typeof RelayRecord.Type

/**
 * The services the registry is read through. `NodeServices.layer` from
 * `@effect/platform-node` provides both.
 */
export type RelayRegistryServices = FileSystem.FileSystem | Path.Path

const decodeRelayRecord = Schema.decodeUnknownExit(
  Schema.fromJsonString(RelayRecord),
)

/**
 * The directory holding one record per running relay, shared with the Vite
 * plugin: the operating system's temporary directory unless
 * `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` names another.
 */
export const relayRegistryDirectory: Effect.Effect<string, never, Path.Path> =
  Effect.gen(function* () {
    const path = yield* Path.Path
    const maybeConfigured = yield* Config.option(
      Config.string(REGISTRY_DIRECTORY_VARIABLE),
    )
    return Option.getOrElse(maybeConfigured, () =>
      path.join(tmpdir(), REGISTRY_DIRECTORY_NAME),
    )
  }).pipe(Effect.orDie)

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

const readRecordFile = (
  filePath: string,
): Effect.Effect<Option.Option<RelayRecord>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(filePath)
    return Exit.match(decodeRelayRecord(raw), {
      onFailure: () => Option.none<RelayRecord>(),
      onSuccess: Option.some,
    })
  }).pipe(Effect.orElseSucceed(() => Option.none<RelayRecord>()))

/**
 * The relay of the dev server most recently started for a project: a record
 * whose root is the project root or a directory inside it, and whose process
 * is still alive. Records left behind by dev servers that died without
 * retiring them are removed on the way.
 */
export const discoverRelay = (
  projectRoot: string,
): Effect.Effect<Option.Option<RelayRecord>, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = yield* relayRegistryDirectory

    const isWithin = (candidate: string): boolean => {
      const relativePath = path.relative(projectRoot, candidate)
      return (
        relativePath === '' ||
        (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
      )
    }

    const fileNames = yield* fileSystem
      .readDirectory(directory)
      .pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []))

    const candidates: Array<RelayRecord> = []
    for (const fileName of fileNames.filter(name => name.endsWith('.json'))) {
      const filePath = path.join(directory, fileName)
      const maybeRecord = yield* readRecordFile(filePath)
      if (Option.isNone(maybeRecord)) {
        continue
      }
      const record = maybeRecord.value
      if (!isProcessAlive(record.pid)) {
        yield* fileSystem.remove(filePath, { force: true }).pipe(Effect.ignore)
        continue
      }
      if (isWithin(record.root)) {
        candidates.push(record)
      }
    }

    const newestFirst = [...candidates].sort(
      (left, right) => right.startedAt - left.startedAt,
    )
    return Option.fromNullishOr(newestFirst[0])
  })
