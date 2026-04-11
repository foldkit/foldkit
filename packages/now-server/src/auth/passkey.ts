import { FileSystem, Path } from '@effect/platform'
import { NodeFileSystem, NodePath } from '@effect/platform-node'
import { Effect, Schema as S } from 'effect'

const StoredPasskeySchema = S.Struct({
  credentialId: S.String,
  publicKey: S.String,
  counter: S.Number,
  transports: S.optional(S.Array(S.String)),
  label: S.String,
  registeredAt: S.Number,
})
export type StoredPasskey = typeof StoredPasskeySchema.Type

const StoredPasskeyListSchema = S.Array(StoredPasskeySchema)

export const parseStoredPasskeys = (
  json: string,
): Effect.Effect<ReadonlyArray<StoredPasskey>, Error> =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(json),
      catch: () => new Error('passkey store is not valid JSON'),
    })
    return yield* S.decodeUnknown(StoredPasskeyListSchema)(parsed).pipe(
      Effect.mapError(
        error => new Error(`passkey store validation failed: ${String(error)}`),
      ),
    )
  })

export const readPasskeysFromDisk = (
  filePath: string,
): Effect.Effect<ReadonlyArray<StoredPasskey>, never, never> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs
      .exists(filePath)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (!exists) {
      return []
    }
    const contents = yield* fs
      .readFileString(filePath)
      .pipe(Effect.catchAll(() => Effect.succeed('')))
    if (contents === '') {
      return []
    }
    return yield* parseStoredPasskeys(contents).pipe(
      Effect.tapError(error =>
        Effect.logWarning('passkey file decode failed; using empty list', {
          error: String(error),
        }),
      ),
      Effect.catchAll(() => Effect.succeed([])),
    )
  }).pipe(Effect.provide(NodeFileSystem.layer))

export const writePasskeysToDisk = (
  filePath: string,
  passkeys: ReadonlyArray<StoredPasskey>,
): Effect.Effect<void, Error, never> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = path.dirname(filePath)
    yield* fs
      .makeDirectory(directory, { recursive: true })
      .pipe(Effect.catchAll(() => Effect.void))
    const tempPath = `${filePath}.tmp`
    const json = JSON.stringify(passkeys, null, 2)
    yield* fs.writeFileString(tempPath, json)
    yield* fs.rename(tempPath, filePath)
  }).pipe(
    Effect.mapError(error => new Error(String(error))),
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodePath.layer),
  )
