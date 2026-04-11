import { FileSystem, Path } from '@effect/platform'
import { NodeFileSystem, NodePath } from '@effect/platform-node'
import {
  StatusBanner,
  type StatusBanner as StatusBannerType,
} from '@foldkit/now-shared'
import {
  Context,
  Effect,
  HashMap,
  Layer,
  Ref,
  Schema as S,
  SubscriptionRef,
} from 'effect'

import { type NonceTracker, makeNonceTracker } from './auth/nonceTracker.js'
import {
  type StoredPasskey,
  readPasskeysFromDisk,
  writePasskeysToDisk,
} from './auth/passkey.js'
import { type RateLimiter, makeRateLimiter } from './auth/rateLimit.js'
import { AppConfig } from './config.js'

// DEFAULT BANNER

export const DEFAULT_STATUS_BANNER: StatusBannerType = S.decodeUnknownSync(
  StatusBanner,
)({
  message: 'Building Foldkit',
  avatarUrl: 'https://github.com/devinjameson.png',
  profileHandle: '@devinjameson',
  profileUrl: 'https://x.com/devinjameson',
})

// BANNER STORE

export type BannerStoreService = Readonly<{
  ref: SubscriptionRef.SubscriptionRef<StatusBannerType>
  persist: (banner: StatusBannerType) => Effect.Effect<void>
}>

export class BannerStore extends Context.Tag('BannerStore')<
  BannerStore,
  BannerStoreService
>() {}

const readBannerFromDisk = (
  filePath: string,
): Effect.Effect<StatusBannerType, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs
      .exists(filePath)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (!exists) {
      return DEFAULT_STATUS_BANNER
    }
    const contents = yield* fs
      .readFileString(filePath)
      .pipe(Effect.catchAll(() => Effect.succeed('')))
    if (contents === '') {
      return DEFAULT_STATUS_BANNER
    }
    return yield* Effect.try({
      try: () => JSON.parse(contents),
      catch: () => new Error('banner file is not valid JSON'),
    }).pipe(
      Effect.flatMap(S.decodeUnknown(StatusBanner)),
      Effect.tapError(error =>
        Effect.logWarning('banner file decode failed; using default', {
          error: String(error),
        }),
      ),
      Effect.catchAll(() => Effect.succeed(DEFAULT_STATUS_BANNER)),
    )
  })

const writeBannerToDisk = (
  filePath: string,
  banner: StatusBannerType,
): Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const directory = path.dirname(filePath)
    yield* fs
      .makeDirectory(directory, { recursive: true })
      .pipe(Effect.catchAll(() => Effect.void))
    const tempPath = `${filePath}.tmp`
    const json = JSON.stringify(banner, null, 2)
    yield* fs.writeFileString(tempPath, json)
    yield* fs.rename(tempPath, filePath)
  }).pipe(Effect.mapError(error => new Error(String(error))))

export const BannerStoreLive = Layer.effect(
  BannerStore,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const initial = yield* readBannerFromDisk(config.bannerFilePath)
    const ref = yield* SubscriptionRef.make(initial)

    const persist = (banner: StatusBannerType): Effect.Effect<void> =>
      writeBannerToDisk(config.bannerFilePath, banner).pipe(
        Effect.tapError(error =>
          Effect.logError('banner persist failed', {
            error: String(error),
          }),
        ),
        Effect.catchAll(() => Effect.void),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      )

    return { ref, persist }
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)

// CHALLENGES

export type ChallengeRecord = Readonly<{
  challenge: string
  createdAtMillis: number
}>

export class ChallengeStore extends Context.Tag('ChallengeStore')<
  ChallengeStore,
  Ref.Ref<HashMap.HashMap<string, ChallengeRecord>>
>() {}

export const ChallengeStoreLive = Layer.effect(
  ChallengeStore,
  Ref.make(HashMap.empty<string, ChallengeRecord>()),
)

// RATE LIMITER

export class RpcRateLimiter extends Context.Tag('RpcRateLimiter')<
  RpcRateLimiter,
  RateLimiter
>() {}

export const RpcRateLimiterLive = Layer.effect(
  RpcRateLimiter,
  Effect.gen(function* () {
    const config = yield* AppConfig
    return yield* makeRateLimiter(
      config.loginRateLimitMax,
      config.loginRateLimitWindowSeconds,
    )
  }),
)

// PASSKEY STORE

const derivePasskeyFilePath = (bannerFilePath: string): string => {
  const lastSlash = bannerFilePath.lastIndexOf('/')
  const directory =
    lastSlash === -1 ? '.' : bannerFilePath.slice(0, lastSlash) || '/'
  return `${directory}/passkeys.json`
}

export type PasskeyStoreService = Readonly<{
  list: () => Effect.Effect<ReadonlyArray<StoredPasskey>>
  add: (passkey: StoredPasskey) => Effect.Effect<void>
  remove: (credentialId: string) => Effect.Effect<void>
  updateCounter: (credentialId: string, counter: number) => Effect.Effect<void>
}>

export class PasskeyStore extends Context.Tag('PasskeyStore')<
  PasskeyStore,
  PasskeyStoreService
>() {}

export const PasskeyStoreLive = Layer.effect(
  PasskeyStore,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const passkeyFilePath = derivePasskeyFilePath(config.bannerFilePath)
    const initial = yield* readPasskeysFromDisk(passkeyFilePath)
    const passkeysRef = yield* Ref.make<ReadonlyArray<StoredPasskey>>(initial)

    const persist = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const current = yield* Ref.get(passkeysRef)
        yield* writePasskeysToDisk(passkeyFilePath, current).pipe(
          Effect.tapError(error =>
            Effect.logError('passkey persist failed', {
              error: String(error),
            }),
          ),
          Effect.catchAll(() => Effect.void),
        )
      })

    const list = () => Ref.get(passkeysRef)

    const add = (passkey: StoredPasskey): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Ref.update(passkeysRef, passkeys => [...passkeys, passkey])
        yield* persist()
      })

    const remove = (credentialId: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Ref.update(passkeysRef, passkeys =>
          passkeys.filter(p => p.credentialId !== credentialId),
        )
        yield* persist()
      })

    const updateCounter = (
      credentialId: string,
      counter: number,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Ref.update(passkeysRef, passkeys =>
          passkeys.map(p =>
            p.credentialId === credentialId ? { ...p, counter } : p,
          ),
        )
        yield* persist()
      })

    return { list, add, remove, updateCounter }
  }),
)

// NONCE TRACKER

export class UpdateNonceTracker extends Context.Tag('UpdateNonceTracker')<
  UpdateNonceTracker,
  NonceTracker
>() {}

export const UpdateNonceTrackerLive = Layer.effect(
  UpdateNonceTracker,
  Effect.gen(function* () {
    const config = yield* AppConfig
    return yield* makeNonceTracker(config.nonceRetentionSeconds)
  }),
)
