import { Config, Effect, type Option, type Redacted as RedactedType } from 'effect'
import { Redacted } from 'effect'

export type AppConfigShape = Readonly<{
  port: number
  origin: string
  corsOrigins: ReadonlyArray<string>
  rpId: string
  rpName: string
  sessionSecret: RedactedType.Redacted<string>
  sessionTtlSeconds: number
  maybePassphraseHash: Option.Option<RedactedType.Redacted<string>>
  recoveryPassphraseEnabled: boolean
  bannerFilePath: string
  loginRateLimitMax: number
  loginRateLimitWindowSeconds: number
  updateRateLimitMax: number
  updateRateLimitWindowSeconds: number
  auditIpSalt: RedactedType.Redacted<string>
  updateRequestMaxAgeSeconds: number
  nonceRetentionSeconds: number
}>

export class AppConfig extends Effect.Service<AppConfig>()('AppConfig', {
  effect: Effect.gen(function* () {
    const port = yield* Config.number('PORT').pipe(Config.withDefault(3002))

    const origin = yield* Config.string('NOW_ORIGIN').pipe(
      Config.withDefault('http://localhost:5173'),
    )

    const corsOrigins = yield* Config.array(
      Config.string(),
      'NOW_CORS_ORIGINS',
    ).pipe(
      Config.withDefault<ReadonlyArray<string>>(['http://localhost:5173']),
    )

    const rpId = yield* Config.string('NOW_RP_ID').pipe(
      Config.withDefault('localhost'),
    )

    const rpName = yield* Config.string('NOW_RP_NAME').pipe(
      Config.withDefault('Foldkit Now'),
    )

    const sessionSecret = yield* Config.redacted('NOW_SESSION_SECRET')

    const sessionTtlSeconds = yield* Config.number(
      'NOW_SESSION_TTL_SECONDS',
    ).pipe(Config.withDefault(900))

    const maybePassphraseHash = yield* Config.option(
      Config.redacted('NOW_ADMIN_PASSPHRASE_HASH'),
    )

    const recoveryPassphraseEnabled = yield* Config.boolean(
      'NOW_RECOVERY_PASSPHRASE_ENABLED',
    ).pipe(Config.withDefault(true))

    const bannerFilePath = yield* Config.string('NOW_BANNER_FILE_PATH').pipe(
      Config.withDefault('/data/banner.json'),
    )

    const loginRateLimitMax = yield* Config.number(
      'NOW_LOGIN_RATE_LIMIT_MAX',
    ).pipe(Config.withDefault(5))

    const loginRateLimitWindowSeconds = yield* Config.number(
      'NOW_LOGIN_RATE_LIMIT_WINDOW_SECONDS',
    ).pipe(Config.withDefault(900))

    const updateRateLimitMax = yield* Config.number(
      'NOW_UPDATE_RATE_LIMIT_MAX',
    ).pipe(Config.withDefault(10))

    const updateRateLimitWindowSeconds = yield* Config.number(
      'NOW_UPDATE_RATE_LIMIT_WINDOW_SECONDS',
    ).pipe(Config.withDefault(60))

    const auditIpSalt = yield* Config.redacted('NOW_AUDIT_IP_SALT').pipe(
      Config.withDefault(
        // NOTE: A default salt is still better than raw IPs. For production
        // set NOW_AUDIT_IP_SALT to a random 32+ byte string rotated periodically.
        // The default is only used for local development.
        Redacted.make('foldkit-now-local-dev-ip-salt-do-not-use-in-prod'),
      ),
    )

    const updateRequestMaxAgeSeconds = yield* Config.number(
      'NOW_UPDATE_REQUEST_MAX_AGE_SECONDS',
    ).pipe(Config.withDefault(30))

    const nonceRetentionSeconds = yield* Config.number(
      'NOW_NONCE_RETENTION_SECONDS',
    ).pipe(Config.withDefault(120))

    return {
      port,
      origin,
      corsOrigins,
      rpId,
      rpName,
      sessionSecret,
      sessionTtlSeconds,
      maybePassphraseHash,
      recoveryPassphraseEnabled,
      bannerFilePath,
      loginRateLimitMax,
      loginRateLimitWindowSeconds,
      updateRateLimitMax,
      updateRateLimitWindowSeconds,
      auditIpSalt,
      updateRequestMaxAgeSeconds,
      nonceRetentionSeconds,
    }
  }),
}) {}
