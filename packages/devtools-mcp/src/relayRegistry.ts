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
  type RelayNamespaces,
  RelayRecord,
} from 'foldkit/devtools-protocol'
import { homedir, tmpdir } from 'node:os'

import { checkRelay, readProcessNamespaces } from './relayLiveness.js'
import {
  type RelayRegistryTrust,
  relayRegistryTrust,
} from './relayRegistryTrust.js'

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const RECORD_FILE_EXTENSION = '.json'
const RETIRING_RECORD_SUFFIX = '.retiring'
const AUTOMATIC_RELAY_HOST = '127.0.0.1'
const AUTOMATIC_RELAY_PATH = '/__foldkit/devtools-mcp'
const RELAY_TOKEN_PARAMETER = 'token'
const RELAY_TOKEN_PATTERN = /^[0-9a-f]{64}$/

export type RelayRegistryServices = FileSystem.FileSystem | Path.Path

export type RelayRegistryReader = Readonly<{
  trust: RelayRegistryTrust
  reportedRefusals: Ref.Ref<HashSet.HashSet<string>>
}>

type RootPathApi = Pick<Path.Path, 'isAbsolute' | 'relative' | 'sep'>

const parseUrl = Option.liftThrowable((url: string) => new URL(url))

const hasValidPort = (url: URL): boolean => {
  const port = globalThis.Number(url.port)

  return (
    url.port !== '' &&
    globalThis.Number.isInteger(port) &&
    port > 0 &&
    port <= 65_535
  )
}

const isPublishedRelayUrl = (value: string): boolean =>
  Option.exists(parseUrl(value), url => {
    if (
      url.protocol !== 'ws:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.hash !== '' ||
      !hasValidPort(url)
    ) {
      return false
    }

    const parameters = Array.fromIterable(url.searchParams)

    return (
      url.hostname === AUTOMATIC_RELAY_HOST &&
      url.pathname === AUTOMATIC_RELAY_PATH &&
      Array.length(parameters) === 1 &&
      Option.exists(
        Array.head(parameters),
        ([name, token]) =>
          name === RELAY_TOKEN_PARAMETER && RELAY_TOKEN_PATTERN.test(token),
      )
    )
  })

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
    return Option.getOrElse(maybeConfigured, () => {
      const defaultParent =
        process.platform === 'win32' ? tmpdir() : path.join(homedir(), '.cache')
      return path.join(
        Option.getOrElse(maybeRuntimeDirectory, () => defaultParent),
        RELAY_REGISTRY_DIRECTORY_NAME,
      )
    })
  }).pipe(Effect.orDie)

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
  maybeOwnNamespaces: Option.Option<RelayNamespaces>,
): Effect.Effect<Option.Option<RelayRecord>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const maybeRecord = yield* readRecordFile(filePath)

    if (Option.isNone(maybeRecord)) {
      return maybeRecord
    }

    const record = maybeRecord.value

    if (!isPublishedRelayUrl(record.url)) {
      return Option.none<RelayRecord>()
    }

    const status = yield* checkRelay(record, maybeOwnNamespaces)

    if (status === 'Gone') {
      yield* retireStaleRecord(filePath, record)

      return Option.none<RelayRecord>()
    } else if (status === 'Unreachable') {
      return Option.none<RelayRecord>()
    } else {
      return maybeRecord
    }
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
    const reportedRefusals = yield* Ref.make(HashSet.empty<string>())
    const registryReader: RelayRegistryReader = {
      trust: relayRegistryTrust,
      reportedRefusals,
    }

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

    const inspection = yield* registryReader.trust.inspect(directory)

    if (Option.isSome(inspection.maybeRefusal)) {
      yield* reportRefusal(
        registryReader.reportedRefusals,
        directory,
        inspection.maybeRefusal.value,
      )

      return Option.none()
    }

    return Option.some(inspection.directory)
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
  pipe(
    root,
    String.split(path.sep),
    Array.filter(String.isNonEmpty),
    Array.length,
  )

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
    const maybeOwnNamespaces = yield* readProcessNamespaces
    const records = Array.getSomes(
      yield* Effect.forEach(recordFileNames, recordFileName =>
        readLiveRecordFile(
          path.join(directory, recordFileName),
          maybeOwnNamespaces,
        ),
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
