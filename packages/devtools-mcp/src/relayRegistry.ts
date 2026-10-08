import {
  Array,
  Config,
  Console,
  Effect,
  FileSystem,
  HashSet,
  Option,
  Order,
  Path,
  Ref,
  Schema,
  String,
  pipe,
} from 'effect'
import type { ChildProcessSpawner } from 'effect/process'
import {
  RELAY_REGISTRY_DIRECTORY_NAME,
  RELAY_REGISTRY_DIRECTORY_VARIABLE,
  RelayRecord,
} from 'foldkit/devtools-protocol'
import { tmpdir } from 'node:os'

import {
  type RelayRegistryTrust,
  makeRelayRegistryTrust,
} from './relayRegistryTrust.js'

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const RECORD_FILE_EXTENSION = '.json'
const RETIRING_RECORD_SUFFIX = '.retiring'

export type RelayRegistryServices = FileSystem.FileSystem | Path.Path

export type RelayRegistryReader = Readonly<{
  trust: RelayRegistryTrust
  reportedRefusals: Ref.Ref<HashSet.HashSet<string>>
}>

type RootPathApi = Pick<Path.Path, 'isAbsolute' | 'relative' | 'sep'>

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

export const isWithinRoot = (
  root: string,
  candidate: string,
  pathApi: RootPathApi,
): boolean => {
  const relativePath = pathApi.relative(root, candidate)
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${pathApi.sep}`) &&
      !pathApi.isAbsolute(relativePath))
  )
}

export const makeRelayRegistryReader: Effect.Effect<RelayRegistryReader> =
  Effect.gen(function* () {
    const trust = yield* makeRelayRegistryTrust
    const reportedRefusals = yield* Ref.make(HashSet.empty<string>())
    const registryReader: RelayRegistryReader = { trust, reportedRefusals }
    return registryReader
  })

const reportRefusal = (
  reportedRefusals: Ref.Ref<HashSet.HashSet<string>>,
  directory: string,
  reason: string,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const line = `[foldkit-devtools-mcp] ignoring the relay registry at ${directory}: it ${reason}`
    const isFirstReport = yield* Ref.modify(reportedRefusals, reported => [
      !HashSet.has(reported, line),
      HashSet.add(reported, line),
    ])

    if (isFirstReport) {
      yield* Console.error(line)
    }
  })

const trustedRegistryDirectory = (
  registryReader: RelayRegistryReader,
): Effect.Effect<
  Option.Option<string>,
  never,
  RelayRegistryServices | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* relayRegistryDirectory
    const isPresent = yield* fileSystem
      .exists(directory)
      .pipe(Effect.orElseSucceed(() => false))
    if (!isPresent) {
      return Option.none()
    }

    const maybeRefusal = yield* registryReader.trust.refusal(directory)
    if (Option.isSome(maybeRefusal)) {
      yield* reportRefusal(
        registryReader.reportedRefusals,
        directory,
        maybeRefusal.value,
      )
      return Option.none()
    }

    return Option.some(directory)
  }).pipe(Effect.orElseSucceed(() => Option.none<string>()))

const realRoot = (
  root: string,
): Effect.Effect<string, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const resolvedRoot = path.resolve(root)
    return yield* fileSystem
      .realPath(resolvedRoot)
      .pipe(Effect.orElseSucceed(() => resolvedRoot))
  })

const segmentCount = (root: string, path: Path.Path): number =>
  pipe(root, String.split(path.sep), Array.filter(String.isNonEmpty)).length

export const discoverRelays = (
  projectRoot: string,
  registryReader: RelayRegistryReader,
): Effect.Effect<
  ReadonlyArray<RelayRecord>,
  never,
  RelayRegistryServices | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const maybeDirectory = yield* trustedRegistryDirectory(registryReader)
    if (Option.isNone(maybeDirectory)) {
      return []
    }

    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = maybeDirectory.value
    const fileNames = yield* fileSystem
      .readDirectory(directory)
      .pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []))
    const recordFileNames = Array.filter(
      fileNames,
      String.endsWith(RECORD_FILE_EXTENSION),
    )
    const records = Array.getSomes(
      yield* Effect.forEach(recordFileNames, recordFileName =>
        readLiveRecordFile(path.join(directory, recordFileName)),
      ),
    )

    const realProjectRoot = yield* realRoot(projectRoot)
    const rootedRecords = yield* Effect.forEach(records, record =>
      Effect.map(realRoot(record.root), root => ({ record, root })),
    )

    const recordsInside = Array.filter(rootedRecords, ({ root }) =>
      isWithinRoot(realProjectRoot, root, path),
    )
    const recordsEnclosing = Array.filter(rootedRecords, ({ root }) =>
      isWithinRoot(root, realProjectRoot, path),
    )
    const nearestDepth = Array.reduce(recordsEnclosing, 0, (depth, { root }) =>
      Math.max(depth, segmentCount(root, path)),
    )
    const selected = Array.match(recordsInside, {
      onEmpty: () =>
        Array.filter(
          recordsEnclosing,
          ({ root }) => segmentCount(root, path) === nearestDepth,
        ),
      onNonEmpty: inside => inside,
    })

    return pipe(
      selected,
      Array.map(({ record }) => record),
      Array.sort(newestFirst),
    )
  })
