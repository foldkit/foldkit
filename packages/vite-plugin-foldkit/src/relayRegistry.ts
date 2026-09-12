import {
  Config,
  Crypto,
  Effect,
  Exit,
  FileSystem,
  Option,
  Path,
  type PlatformError,
  Schema,
} from 'effect'
import { tmpdir } from 'node:os'

// NOTE: `@foldkit/devtools-mcp` carries the reading half of this module. The
// two packages release independently and the MCP server bundles without a
// dependency on this one, so the record format is a contract between them:
// change `version` when the shape changes, and change both copies.

const REGISTRY_DIRECTORY_NAME = 'foldkit-devtools-relays'
const REGISTRY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'

/**
 * What a running Foldkit dev server publishes while its DevTools MCP relay is
 * listening, so the MCP server can find the relay for a project without a
 * configured port. One record per Vite project root.
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
 * The services the registry is read and written through. `NodeServices.layer`
 * from `@effect/platform-node` provides all of them.
 */
export type RelayRegistryServices =
  | FileSystem.FileSystem
  | Path.Path
  | Crypto.Crypto

const decodeRelayRecord = Schema.decodeUnknownExit(
  Schema.fromJsonString(RelayRecord),
)
const encodeRelayRecord = Schema.encodeUnknownSync(
  Schema.fromJsonString(RelayRecord),
)

/**
 * The directory holding one record per running relay. Under the operating
 * system's temporary directory, which is private to the user on macOS and
 * Windows, unless `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` names another, for
 * sandboxes and tests.
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

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')

/** The record file for a Vite project root. */
export const relayRecordPath = (
  root: string,
): Effect.Effect<string, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const crypto = yield* Crypto.Crypto
    const directory = yield* relayRegistryDirectory
    const digest = yield* crypto
      .digest('SHA-1', new TextEncoder().encode(root))
      .pipe(Effect.orDie)
    return path.join(directory, `${toHex(digest)}.json`)
  })

/** Writes the record for its root, replacing any earlier one. */
export const publishRelayRecord = (
  record: RelayRecord,
): Effect.Effect<void, PlatformError.PlatformError, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* relayRegistryDirectory
    yield* fileSystem.makeDirectory(directory, { recursive: true })
    yield* fileSystem.writeFileString(
      yield* relayRecordPath(record.root),
      encodeRelayRecord(record),
    )
  })

/** Reads the record for a root, or none when there is no readable record. */
export const readRelayRecord = (
  root: string,
): Effect.Effect<Option.Option<RelayRecord>, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(yield* relayRecordPath(root))
    return Exit.match(decodeRelayRecord(raw), {
      onFailure: () => Option.none<RelayRecord>(),
      onSuccess: Option.some,
    })
  }).pipe(Effect.orElseSucceed(() => Option.none<RelayRecord>()))

/**
 * Removes the record for a root, but only while it still names this relay.
 * In middleware mode a dev server restart binds the replacement's relay,
 * which publishes its own record, before the server it replaces shuts
 * down; retiring unconditionally would erase the live relay's record.
 */
export const retireRelayRecord = (
  root: string,
  url: string,
): Effect.Effect<void, never, RelayRegistryServices> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const maybeRecord = yield* readRelayRecord(root)
    const isOwn = Option.exists(maybeRecord, record => record.url === url)
    if (isOwn) {
      yield* fileSystem
        .remove(yield* relayRecordPath(root), { force: true })
        .pipe(Effect.ignore)
    }
  })
