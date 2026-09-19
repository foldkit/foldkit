import {
  Array,
  Config,
  Effect,
  Exit,
  FileSystem,
  Option,
  Order,
  Path,
  Schema,
  pipe,
} from 'effect'
import {
  RELAY_REGISTRY_DIRECTORY_NAME,
  RELAY_REGISTRY_DIRECTORY_VARIABLE,
  RelayRecord,
} from 'foldkit/devtools-protocol'
import { tmpdir } from 'node:os'

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const RECORD_FILE_EXTENSION = '.json'

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
 * plugin: the directory named by `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY`;
 * otherwise `foldkit-devtools-relays` under `XDG_RUNTIME_DIR`; otherwise
 * under the operating system's temporary directory.
 */
const relayRegistryDirectory: Effect.Effect<string, never, Path.Path> =
  Effect.gen(function* () {
    const path = yield* Path.Path
    const maybeConfigured = yield* Config.option(
      Config.String(RELAY_REGISTRY_DIRECTORY_VARIABLE),
    )
    const maybeRuntimeDirectory = yield* Config.option(
      Config.String(RUNTIME_DIRECTORY_VARIABLE),
    )
    return Option.getOrElse(maybeConfigured, () =>
      path.join(
        Option.getOrElse(maybeRuntimeDirectory, tmpdir),
        RELAY_REGISTRY_DIRECTORY_NAME,
      ),
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

const readLiveRecordFile = (
  filePath: string,
): Effect.Effect<Option.Option<RelayRecord>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const maybeRecord = yield* readRecordFile(filePath)
    const isStale = Option.exists(
      maybeRecord,
      record => !isProcessAlive(record.pid),
    )

    if (isStale) {
      yield* fileSystem.remove(filePath, { force: true }).pipe(Effect.ignore)
      return Option.none<RelayRecord>()
    }

    return maybeRecord
  })

const newestFirst: Order.Order<RelayRecord> = Order.mapInput(
  Order.flip(Order.Number),
  record => record.startedAt,
)

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
        (relativePath !== '..' &&
          !relativePath.startsWith(`..${path.sep}`) &&
          !path.isAbsolute(relativePath))
      )
    }

    const fileNames = yield* fileSystem
      .readDirectory(directory)
      .pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []))
    const recordFileNames = Array.filter(fileNames, fileName =>
      fileName.endsWith(RECORD_FILE_EXTENSION),
    )
    const maybeRecords = yield* Effect.forEach(recordFileNames, fileName =>
      readLiveRecordFile(path.join(directory, fileName)),
    )

    return pipe(
      maybeRecords,
      Array.getSomes,
      Array.filter(record => isWithin(record.root)),
      Array.sort(newestFirst),
      Array.head,
    )
  })
