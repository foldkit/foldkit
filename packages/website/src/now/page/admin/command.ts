import {
  AuthenticationOptions,
  AuthenticationResponse,
  RegisteredPasskeySummary,
  type RegistrationOptions,
  RegistrationResponse,
  type SessionIssue,
  SessionToken,
  type StatusBanner,
} from '@foldkit/now-shared'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'

import { NowClient } from '../../rpc'
import {
  FailedDeletePasskey,
  FailedLoadPasskeys,
  FailedLoadRegistrationStatus,
  FailedPasskeyLogin,
  FailedPassphraseLogin,
  FailedRegisterPasskey,
  FailedSaveBanner,
  SucceededBeginPasskeyLogin,
  SucceededBeginPasskeyRegistration,
  SucceededDeletePasskey,
  SucceededLoadPasskeys,
  SucceededLoadRegistrationStatus,
  SucceededPasskeyLogin,
  SucceededPassphraseLogin,
  SucceededRegisterPasskey,
  SucceededSaveBanner,
} from './message'

type KnownAuthenticatorTransport =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb'

const KNOWN_AUTHENTICATOR_TRANSPORTS: ReadonlySet<string> = new Set([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
])

const isKnownTransport = (
  value: string,
): value is KnownAuthenticatorTransport =>
  KNOWN_AUTHENTICATOR_TRANSPORTS.has(value)

const toKnownTransports = (
  transports: ReadonlyArray<string> | undefined,
): Array<KnownAuthenticatorTransport> | undefined => {
  if (transports === undefined) {
    return undefined
  }
  const filtered = transports.filter(isKnownTransport)
  return filtered.length === 0 ? undefined : [...filtered]
}

// LOAD REGISTRATION STATUS

const LoadRegistrationStatus = Command.define(
  'LoadRegistrationStatus',
  SucceededLoadRegistrationStatus,
  FailedLoadRegistrationStatus,
)

export const loadRegistrationStatus = LoadRegistrationStatus(
  Effect.gen(function* () {
    const client = yield* NowClient
    const status = yield* client.passkeyRegistrationStatus({})
    return SucceededLoadRegistrationStatus({
      hasRegisteredPasskey: status.hasRegisteredPasskey,
      passphraseEnabled: status.passphraseEnabled,
    })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedLoadRegistrationStatus())),
    Effect.provide(NowClient.Default),
  ),
)

// PASSKEY LOGIN

const BeginPasskeyLogin = Command.define(
  'BeginPasskeyLogin',
  SucceededBeginPasskeyLogin,
  FailedPasskeyLogin,
)

export const beginPasskeyLogin = BeginPasskeyLogin(
  Effect.gen(function* () {
    const client = yield* NowClient
    const options = yield* client.beginAuthentication({})
    return SucceededBeginPasskeyLogin({ options })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedPasskeyLogin({ reason: String(error) })),
    ),
    Effect.provide(NowClient.Default),
  ),
)

const FinishPasskeyLogin = Command.define(
  'FinishPasskeyLogin',
  SucceededPasskeyLogin,
  FailedPasskeyLogin,
)

export const finishPasskeyLogin = (options: AuthenticationOptions) =>
  FinishPasskeyLogin(
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          startAuthentication({
            optionsJSON: {
              challenge: options.challenge,
              allowCredentials: options.allowCredentials.map(credential => {
                const transports = toKnownTransports(credential.transports)
                return {
                  id: credential.id,
                  type: credential.type,
                  ...(transports !== undefined ? { transports } : {}),
                }
              }),
              timeout: options.timeout,
              rpId: options.rpId,
              userVerification: options.userVerification,
            },
          }),
        catch: error => new Error(String(error)),
      })

      const client = yield* NowClient
      const typedResponse = yield* S.decodeUnknown(AuthenticationResponse)(
        response,
      ).pipe(
        Effect.mapError(
          () =>
            new Error('authenticator response did not match expected shape'),
        ),
      )
      const issue: SessionIssue = yield* client.finishAuthentication({
        response: typedResponse,
      })
      return SucceededPasskeyLogin({
        sessionToken: issue.sessionToken,
        expiresAt: issue.expiresAt,
      })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedPasskeyLogin({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

// PASSPHRASE LOGIN

const AuthenticateWithPassphrase = Command.define(
  'AuthenticateWithPassphrase',
  SucceededPassphraseLogin,
  FailedPassphraseLogin,
)

export const authenticateWithPassphrase = (passphrase: string) =>
  AuthenticateWithPassphrase(
    Effect.gen(function* () {
      const client = yield* NowClient
      const issue = yield* client.authenticateWithPassphrase({ passphrase })
      return SucceededPassphraseLogin({
        sessionToken: issue.sessionToken,
        expiresAt: issue.expiresAt,
      })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedPassphraseLogin({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

// SAVE BANNER

const SaveBanner = Command.define(
  'SaveBanner',
  SucceededSaveBanner,
  FailedSaveBanner,
)

const randomNonce = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const saveBanner = (sessionToken: SessionToken, banner: StatusBanner) =>
  SaveBanner(
    Effect.gen(function* () {
      const client = yield* NowClient
      const issuedAt = Date.now()
      yield* client.updateStatusBanner({
        sessionToken,
        banner,
        nonce: randomNonce(),
        issuedAt,
      })
      return SucceededSaveBanner({ banner, savedAtMillis: Date.now() })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedSaveBanner({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

// LIST PASSKEYS

const LoadPasskeys = Command.define(
  'LoadPasskeys',
  SucceededLoadPasskeys,
  FailedLoadPasskeys,
)

export const loadPasskeys = (sessionToken: SessionToken) =>
  LoadPasskeys(
    Effect.gen(function* () {
      const client = yield* NowClient
      const result = yield* client.listRegisteredPasskeys({ sessionToken })
      return SucceededLoadPasskeys({
        passkeys: result.passkeys,
        passphraseEnabled: result.passphraseEnabled,
      })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedLoadPasskeys({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

// REGISTER PASSKEY

const BeginRegisterPasskey = Command.define(
  'BeginRegisterPasskey',
  SucceededBeginPasskeyRegistration,
  FailedRegisterPasskey,
)

export const beginRegisterPasskey = (sessionToken: SessionToken) =>
  BeginRegisterPasskey(
    Effect.gen(function* () {
      const client = yield* NowClient
      const options = yield* client.beginRegisterPasskey({ sessionToken })
      return SucceededBeginPasskeyRegistration({ options })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedRegisterPasskey({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

const FinishRegisterPasskey = Command.define(
  'FinishRegisterPasskey',
  SucceededRegisterPasskey,
  FailedRegisterPasskey,
)

export const finishRegisterPasskey = (
  sessionToken: SessionToken,
  label: string,
  options: RegistrationOptions,
) =>
  FinishRegisterPasskey(
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          startRegistration({
            optionsJSON: {
              challenge: options.challenge,
              rp: { ...options.rp },
              user: { ...options.user },
              pubKeyCredParams: options.pubKeyCredParams.map(params => ({
                type: params.type,
                alg: params.alg,
              })),
              timeout: options.timeout,
              attestation: options.attestation,
              excludeCredentials: options.excludeCredentials.map(credential => {
                const transports = toKnownTransports(credential.transports)
                return {
                  id: credential.id,
                  type: credential.type,
                  ...(transports !== undefined ? { transports } : {}),
                }
              }),
              authenticatorSelection: {
                ...(options.authenticatorSelection.residentKey !== undefined
                  ? {
                      residentKey: options.authenticatorSelection.residentKey,
                    }
                  : {}),
                ...(options.authenticatorSelection.userVerification !==
                undefined
                  ? {
                      userVerification:
                        options.authenticatorSelection.userVerification,
                    }
                  : {}),
                ...(options.authenticatorSelection.authenticatorAttachment !==
                undefined
                  ? {
                      authenticatorAttachment:
                        options.authenticatorSelection.authenticatorAttachment,
                    }
                  : {}),
                ...(options.authenticatorSelection.requireResidentKey !==
                undefined
                  ? {
                      requireResidentKey:
                        options.authenticatorSelection.requireResidentKey,
                    }
                  : {}),
              },
            },
          }),
        catch: error => new Error(String(error)),
      })

      const client = yield* NowClient
      const typedResponse = yield* S.decodeUnknown(RegistrationResponse)(
        response,
      ).pipe(
        Effect.mapError(
          () =>
            new Error(
              'authenticator registration response did not match expected shape',
            ),
        ),
      )
      const passkey: RegisteredPasskeySummary =
        yield* client.finishRegisterPasskey({
          sessionToken,
          label,
          response: typedResponse,
        })
      return SucceededRegisterPasskey({ passkey })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedRegisterPasskey({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )

// DELETE PASSKEY

const DeletePasskey = Command.define(
  'DeletePasskey',
  SucceededDeletePasskey,
  FailedDeletePasskey,
)

export const deletePasskey = (
  sessionToken: SessionToken,
  credentialId: string,
) =>
  DeletePasskey(
    Effect.gen(function* () {
      const client = yield* NowClient
      yield* client.deletePasskey({ sessionToken, credentialId })
      return SucceededDeletePasskey({ credentialId })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedDeletePasskey({ reason: String(error) })),
      ),
      Effect.provide(NowClient.Default),
    ),
  )
