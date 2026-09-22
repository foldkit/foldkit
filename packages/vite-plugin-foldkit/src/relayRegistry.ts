import {
  Config,
  Crypto,
  Data,
  Effect,
  Exit,
  FileSystem,
  Option,
  Path,
  type PlatformError,
  Schema,
} from 'effect'
import {
  RELAY_REGISTRY_DIRECTORY_NAME,
  RELAY_REGISTRY_DIRECTORY_VARIABLE,
  RelayRecord,
} from 'foldkit/devtools-protocol'
import { tmpdir } from 'node:os'

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const RECORD_FILE_EXTENSION = '.json'

const REGISTRY_DIRECTORY_MODE = 0o700
const RECORD_FILE_MODE = 0o600
const PERMISSIONS_BEYOND_OWNER = 0o077
const PENDING_RECORD_SUFFIX = '.pending'
const RETIRING_RECORD_SUFFIX = '.retiring'

export type RelayPublisherServices =
  | FileSystem.FileSystem
  | Path.Path
  | Crypto.Crypto

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

const relayRecordPath = (
  root: string,
): Effect.Effect<string, never, RelayPublisherServices> =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const crypto = yield* Crypto.Crypto
    const directory = yield* relayRegistryDirectory
    const digest = yield* crypto
      .digest('SHA-1', new TextEncoder().encode(root))
      .pipe(Effect.orDie)
    return path.join(
      directory,
      `${Buffer.from(digest).toString('hex')}${RECORD_FILE_EXTENSION}`,
    )
  })

export const relayRegistryDirectoryRefusal = (
  info: FileSystem.File.Info,
  maybeCurrentUid: Option.Option<number>,
): Option.Option<string> =>
  Option.match(maybeCurrentUid, {
    onNone: () => Option.some('has ownership that cannot be verified'),
    onSome: currentUid => {
      if (Option.isNone(info.uid)) {
        return Option.some('has ownership that cannot be verified')
      }

      if (info.uid.value !== currentUid) {
        return Option.some('is owned by another user')
      }

      if ((info.mode & PERMISSIONS_BEYOND_OWNER) !== 0) {
        return Option.some('is readable or writable by other users')
      }

      return Option.none()
    },
  })

const maybeProcessUid = Option.map(
  Option.fromNullishOr(process.getuid),
  getuid => getuid(),
)

const ensurePrivateRegistryDirectory = (
  directory: string,
): Effect.Effect<
  void,
  PlatformError.PlatformError | RelayRegistryDirectoryRefused,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    yield* fileSystem.makeDirectory(directory, {
      recursive: true,
      mode: REGISTRY_DIRECTORY_MODE,
    })

    const info = yield* fileSystem.stat(directory)
    const maybeRefusal = relayRegistryDirectoryRefusal(info, maybeProcessUid)
    if (Option.isSome(maybeRefusal)) {
      return yield* Effect.fail(
        new RelayRegistryDirectoryRefused({
          directory,
          reason: maybeRefusal.value,
        }),
      )
    }
  })

export const publishRelayRecord = (
  record: RelayRecord,
): Effect.Effect<
  void,
  PlatformError.PlatformError | RelayRegistryDirectoryRefused,
  RelayPublisherServices
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* relayRegistryDirectory
    yield* ensurePrivateRegistryDirectory(directory)

    const recordPath = yield* relayRecordPath(record.root)
    const pendingPath = `${recordPath}.${record.id}${PENDING_RECORD_SUFFIX}`
    yield* fileSystem.writeFileString(pendingPath, encodeRelayRecord(record), {
      mode: RECORD_FILE_MODE,
    })
    yield* fileSystem.rename(pendingPath, recordPath)
  })

const readRelayRecordAt = (
  recordPath: string,
): Effect.Effect<Option.Option<RelayRecord>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(recordPath)
    return decodeRelayRecord(raw)
  }).pipe(Effect.orElseSucceed(() => Option.none<RelayRecord>()))

export const readRelayRecord = (
  root: string,
): Effect.Effect<Option.Option<RelayRecord>, never, RelayPublisherServices> =>
  Effect.flatMap(relayRecordPath(root), readRelayRecordAt)

export const retireRelayRecord = (
  root: string,
  id: string,
): Effect.Effect<void, never, RelayPublisherServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const recordPath = yield* relayRecordPath(root)
    const retiringPath = `${recordPath}.${id}${RETIRING_RECORD_SUFFIX}`
    const maybeRecord = yield* readRelayRecordAt(recordPath)
    const isPublishedByRelay = Option.exists(
      maybeRecord,
      record => record.id === id,
    )
    if (!isPublishedByRelay) {
      return
    }

    // NOTE: A replacement may publish between the first read and rename. A
    // hard link restores its record only if no newer record occupies the path.
    const renameResult = yield* fileSystem
      .rename(recordPath, retiringPath)
      .pipe(Effect.exit)
    if (Exit.isFailure(renameResult)) {
      return
    }

    const maybeRetiringRecord = yield* readRelayRecordAt(retiringPath)
    const isReplacement = Option.exists(
      maybeRetiringRecord,
      record => record.id !== id,
    )

    if (isReplacement) {
      yield* fileSystem.link(retiringPath, recordPath).pipe(Effect.ignore)
    }

    yield* fileSystem.remove(retiringPath, { force: true }).pipe(Effect.ignore)
  })
