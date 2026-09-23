import {
  Array,
  Config,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Schema,
  String,
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
const RETIRING_RECORD_SUFFIX = '.retiring'

export type RelayRegistryServices = FileSystem.FileSystem | Path.Path

const decodeRelayRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(RelayRecord),
)

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
    return decodeRelayRecord(raw)
  }).pipe(Effect.orElseSucceed(() => Option.none<RelayRecord>()))

const retireStaleRecord = (
  filePath: string,
  record: RelayRecord,
): Effect.Effect<void, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const retiringPath = `${filePath}.${encodeURIComponent(record.id)}${RETIRING_RECORD_SUFFIX}`
    const wasRecordMoved = yield* fileSystem
      .rename(filePath, retiringPath)
      .pipe(
        Effect.as(true),
        Effect.orElseSucceed(() => false),
      )

    if (!wasRecordMoved) {
      return
    }

    const maybeRetiringRecord = yield* readRecordFile(retiringPath)
    const isOriginalRecord = Option.exists(
      maybeRetiringRecord,
      retiringRecord => retiringRecord.id === record.id,
    )

    if (!isOriginalRecord) {
      yield* fileSystem.link(retiringPath, filePath).pipe(Effect.ignore)
    }

    yield* fileSystem.remove(retiringPath, { force: true }).pipe(Effect.ignore)
  })

const readLiveRecordFile = (
  filePath: string,
): Effect.Effect<Option.Option<RelayRecord>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const maybeRecord = yield* readRecordFile(filePath)

    if (Option.isSome(maybeRecord) && !isProcessAlive(maybeRecord.value.pid)) {
      yield* retireStaleRecord(filePath, maybeRecord.value)

      return Option.none<RelayRecord>()
    }

    return maybeRecord
  })

const newestFirst: Order.Order<RelayRecord> = Order.mapInput(
  Order.flip(Order.Number),
  record => record.startedAt,
)

export const discoverRelay = (
  projectRoot: string,
): Effect.Effect<Option.Option<RelayRecord>, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = yield* relayRegistryDirectory

    const isWithinProjectRoot = (candidatePath: string): boolean => {
      const relativePath = path.relative(projectRoot, candidatePath)
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
    const recordFileNames = Array.filter(
      fileNames,
      String.endsWith(RECORD_FILE_EXTENSION),
    )
    const maybeRecords = yield* Effect.forEach(
      recordFileNames,
      recordFileName =>
        readLiveRecordFile(path.join(directory, recordFileName)),
    )

    return pipe(
      maybeRecords,
      Array.getSomes,
      Array.filter(record => isWithinProjectRoot(record.root)),
      Array.sort(newestFirst),
      Array.head,
    )
  })
