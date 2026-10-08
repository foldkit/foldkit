import {
  Array,
  Config,
  Data,
  Effect,
  FileSystem,
  Option,
  Path,
  type PlatformError,
  Schema,
  String,
} from 'effect'
import type { ChildProcessSpawner } from 'effect/process'
import {
  RELAY_REGISTRY_DIRECTORY_NAME,
  RELAY_REGISTRY_DIRECTORY_VARIABLE,
  RelayRecord,
} from 'foldkit/devtools-protocol'
import { tmpdir } from 'node:os'

import type { RelayRegistryTrust } from './relayRegistryTrust.js'

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const RECORD_FILE_EXTENSION = '.json'

const REGISTRY_DIRECTORY_MODE = 0o700
const RECORD_FILE_MODE = 0o600
const PENDING_RECORD_SUFFIX = '.pending'
const RETIRING_RECORD_SUFFIX = '.retiring'

type RelayRegistryServices = FileSystem.FileSystem | Path.Path

export type RelayPublisherServices =
  | RelayRegistryServices
  | ChildProcessSpawner.ChildProcessSpawner

export class RelayRegistryDirectoryRefused extends Data.TaggedError(
  'RelayRegistryDirectoryRefused',
)<{
  readonly directory: string
  readonly reason: string
}> {}

const decodeRelayRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(RelayRecord),
)
const encodeRelayRecord = Schema.encodeUnknownSync(
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

const relayRecordPath = (id: string): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const directory = yield* relayRegistryDirectory
    return path.join(
      directory,
      `${encodeURIComponent(id)}${RECORD_FILE_EXTENSION}`,
    )
  })

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

const recordFilePaths = (
  directory: string,
): Effect.Effect<ReadonlyArray<string>, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const fileNames = yield* fileSystem
      .readDirectory(directory)
      .pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []))
    return Array.map(
      Array.filter(fileNames, String.endsWith(RECORD_FILE_EXTENSION)),
      fileName => path.join(directory, fileName),
    )
  })

// NOTE: A relay from an older plugin names its record by its root and can
// republish that path between the rename and the read. A hard link restores
// the republished record only if no newer record occupies the path.
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

const removeDeadRecords = (
  directory: string,
): Effect.Effect<void, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const filePaths = yield* recordFilePaths(directory)
    yield* Effect.forEach(
      filePaths,
      filePath =>
        Effect.gen(function* () {
          const maybeRecord = yield* readRecordFile(filePath)
          if (
            Option.isSome(maybeRecord) &&
            !isProcessAlive(maybeRecord.value.pid)
          ) {
            yield* retireStaleRecord(filePath, maybeRecord.value)
          }
        }),
      { discard: true },
    )
  })

export const publishRelayRecord = (
  record: RelayRecord,
  trust: RelayRegistryTrust,
): Effect.Effect<
  void,
  PlatformError.PlatformError | RelayRegistryDirectoryRefused,
  RelayPublisherServices
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* relayRegistryDirectory
    yield* fileSystem.makeDirectory(directory, {
      recursive: true,
      mode: REGISTRY_DIRECTORY_MODE,
    })

    const maybeRefusal = yield* trust.refusal(directory)
    if (Option.isSome(maybeRefusal)) {
      return yield* Effect.fail(
        new RelayRegistryDirectoryRefused({
          directory,
          reason: maybeRefusal.value,
        }),
      )
    }

    yield* removeDeadRecords(directory)

    const recordPath = yield* relayRecordPath(record.id)
    const pendingPath = `${recordPath}${PENDING_RECORD_SUFFIX}`
    yield* fileSystem.writeFileString(pendingPath, encodeRelayRecord(record), {
      mode: RECORD_FILE_MODE,
    })
    yield* fileSystem.rename(pendingPath, recordPath)
  })

export const readRelayRecords: Effect.Effect<
  ReadonlyArray<RelayRecord>,
  never,
  RelayRegistryServices
> = Effect.gen(function* () {
  const directory = yield* relayRegistryDirectory
  const filePaths = yield* recordFilePaths(directory)
  const maybeRecords = yield* Effect.forEach(filePaths, readRecordFile)
  return Array.getSomes(maybeRecords)
})

export const retireRelayRecord = (
  id: string,
): Effect.Effect<void, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const recordPath = yield* relayRecordPath(id)
    yield* fileSystem.remove(recordPath, { force: true }).pipe(Effect.ignore)
  })
