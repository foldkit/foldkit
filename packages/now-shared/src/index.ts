import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema as S } from 'effect'

// VALIDATION HELPERS

const AVATAR_URL_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  'github.com',
  'avatars.githubusercontent.com',
])

const PROFILE_URL_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  'x.com',
  'twitter.com',
  'bsky.app',
  'github.com',
])

const HTTPS_PROTOCOL = 'https:'

const isAllowedHttpsUrl =
  (allowlist: ReadonlySet<string>) =>
  (value: string): boolean => {
    try {
      const url = new URL(value)
      return url.protocol === HTTPS_PROTOCOL && allowlist.has(url.host)
    } catch {
      return false
    }
  }

const CONTROL_CHARACTER_REGEX = /[\u0000-\u001F\u007F]/u

const hasNoControlCharacters = (value: string): boolean =>
  !CONTROL_CHARACTER_REGEX.test(value)

// STATUS BANNER

export const StatusBannerMessageText = S.String.pipe(
  S.minLength(1),
  S.maxLength(160),
  S.filter(hasNoControlCharacters, {
    message: () => 'must not contain control characters',
  }),
  S.brand('StatusBannerMessageText'),
)
export type StatusBannerMessageText = typeof StatusBannerMessageText.Type

export const AvatarUrl = S.String.pipe(
  S.maxLength(512),
  S.filter(isAllowedHttpsUrl(AVATAR_URL_HOST_ALLOWLIST), {
    message: () =>
      'avatarUrl must be HTTPS on an allowed host (github.com, avatars.githubusercontent.com)',
  }),
  S.brand('AvatarUrl'),
)
export type AvatarUrl = typeof AvatarUrl.Type

export const ProfileUrl = S.String.pipe(
  S.maxLength(512),
  S.filter(isAllowedHttpsUrl(PROFILE_URL_HOST_ALLOWLIST), {
    message: () =>
      'profileUrl must be HTTPS on an allowed host (x.com, twitter.com, bsky.app, github.com)',
  }),
  S.brand('ProfileUrl'),
)
export type ProfileUrl = typeof ProfileUrl.Type

export const ProfileHandle = S.String.pipe(
  S.pattern(/^@[a-zA-Z0-9_]{1,30}$/u, {
    message: () =>
      'profileHandle must start with @ and contain 1-30 alphanumeric or underscore characters',
  }),
  S.brand('ProfileHandle'),
)
export type ProfileHandle = typeof ProfileHandle.Type

export const StatusBanner = S.Struct({
  message: StatusBannerMessageText,
  avatarUrl: AvatarUrl,
  profileHandle: ProfileHandle,
  profileUrl: ProfileUrl,
})
export type StatusBanner = typeof StatusBanner.Type

// SESSION

export const SessionToken = S.String.pipe(S.brand('SessionToken'))
export type SessionToken = typeof SessionToken.Type

export const SessionIssue = S.Struct({
  sessionToken: SessionToken,
  expiresAt: S.Number,
})
export type SessionIssue = typeof SessionIssue.Type

// REGISTERED PASSKEY

export const RegisteredPasskeySummary = S.Struct({
  credentialId: S.String,
  label: S.String,
  registeredAt: S.Number,
})
export type RegisteredPasskeySummary = typeof RegisteredPasskeySummary.Type

// WEBAUTHN CEREMONY

export const PublicKeyCredentialDescriptor = S.Struct({
  id: S.String,
  type: S.Literal('public-key'),
  transports: S.optional(S.Array(S.String)),
})
export type PublicKeyCredentialDescriptor =
  typeof PublicKeyCredentialDescriptor.Type

export const UserVerificationRequirement = S.Literal(
  'required',
  'preferred',
  'discouraged',
)
export type UserVerificationRequirement = typeof UserVerificationRequirement.Type

export const AuthenticationOptions = S.Struct({
  challenge: S.String,
  allowCredentials: S.Array(PublicKeyCredentialDescriptor),
  timeout: S.Number,
  rpId: S.String,
  userVerification: UserVerificationRequirement,
})
export type AuthenticationOptions = typeof AuthenticationOptions.Type

export const AuthenticatorAssertionResponsePayload = S.Struct({
  clientDataJSON: S.String,
  authenticatorData: S.String,
  signature: S.String,
  userHandle: S.optional(S.String),
})
export type AuthenticatorAssertionResponsePayload =
  typeof AuthenticatorAssertionResponsePayload.Type

export const AuthenticationResponse = S.Struct({
  id: S.String,
  rawId: S.String,
  type: S.Literal('public-key'),
  response: AuthenticatorAssertionResponsePayload,
  clientExtensionResults: S.Unknown,
  authenticatorAttachment: S.optional(
    S.Literal('platform', 'cross-platform'),
  ),
})
export type AuthenticationResponse = typeof AuthenticationResponse.Type

export const PublicKeyCredentialUserEntity = S.Struct({
  id: S.String,
  name: S.String,
  displayName: S.String,
})
export type PublicKeyCredentialUserEntity =
  typeof PublicKeyCredentialUserEntity.Type

export const PublicKeyCredentialRpEntity = S.Struct({
  id: S.String,
  name: S.String,
})
export type PublicKeyCredentialRpEntity =
  typeof PublicKeyCredentialRpEntity.Type

export const PublicKeyCredentialParameters = S.Struct({
  type: S.Literal('public-key'),
  alg: S.Number,
})
export type PublicKeyCredentialParameters =
  typeof PublicKeyCredentialParameters.Type

export const AuthenticatorSelectionCriteria = S.Struct({
  residentKey: S.optional(
    S.Literal('discouraged', 'preferred', 'required'),
  ),
  userVerification: S.optional(UserVerificationRequirement),
  authenticatorAttachment: S.optional(
    S.Literal('platform', 'cross-platform'),
  ),
  requireResidentKey: S.optional(S.Boolean),
})
export type AuthenticatorSelectionCriteria =
  typeof AuthenticatorSelectionCriteria.Type

export const RegistrationOptions = S.Struct({
  challenge: S.String,
  rp: PublicKeyCredentialRpEntity,
  user: PublicKeyCredentialUserEntity,
  pubKeyCredParams: S.Array(PublicKeyCredentialParameters),
  timeout: S.Number,
  attestation: S.Literal('none', 'indirect', 'direct', 'enterprise'),
  excludeCredentials: S.Array(PublicKeyCredentialDescriptor),
  authenticatorSelection: AuthenticatorSelectionCriteria,
  extensions: S.optional(S.Unknown),
})
export type RegistrationOptions = typeof RegistrationOptions.Type

export const AuthenticatorAttestationResponsePayload = S.Struct({
  clientDataJSON: S.String,
  attestationObject: S.String,
  transports: S.optional(S.Array(S.String)),
  publicKeyAlgorithm: S.optional(S.Number),
  publicKey: S.optional(S.String),
  authenticatorData: S.optional(S.String),
})
export type AuthenticatorAttestationResponsePayload =
  typeof AuthenticatorAttestationResponsePayload.Type

export const RegistrationResponse = S.Struct({
  id: S.String,
  rawId: S.String,
  type: S.Literal('public-key'),
  response: AuthenticatorAttestationResponsePayload,
  clientExtensionResults: S.Unknown,
  authenticatorAttachment: S.optional(
    S.Literal('platform', 'cross-platform'),
  ),
})
export type RegistrationResponse = typeof RegistrationResponse.Type

// ERRORS

export class UnauthorizedError extends S.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  { message: S.String },
) {}

export class AuthenticationFailedError extends S.TaggedError<AuthenticationFailedError>()(
  'AuthenticationFailedError',
  { reason: S.String },
) {}

export class RateLimitedError extends S.TaggedError<RateLimitedError>()(
  'RateLimitedError',
  { retryAfterSeconds: S.Number },
) {}

export class InvalidNonceError extends S.TaggedError<InvalidNonceError>()(
  'InvalidNonceError',
  { message: S.String },
) {}

export class StaleRequestError extends S.TaggedError<StaleRequestError>()(
  'StaleRequestError',
  { message: S.String },
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  'ValidationError',
  { message: S.String },
) {}

export class RecoveryDisabledError extends S.TaggedError<RecoveryDisabledError>()(
  'RecoveryDisabledError',
  { message: S.String },
) {}

// RPC DEFINITIONS

export const beginAuthenticationRpc = Rpc.make('beginAuthentication', {
  payload: S.Struct({}),
  success: AuthenticationOptions,
  error: RateLimitedError,
})

export const finishAuthenticationRpc = Rpc.make('finishAuthentication', {
  payload: S.Struct({
    response: AuthenticationResponse,
  }),
  success: SessionIssue,
  error: S.Union(
    AuthenticationFailedError,
    RateLimitedError,
    InvalidNonceError,
  ),
})

export const authenticateWithPassphraseRpc = Rpc.make(
  'authenticateWithPassphrase',
  {
    payload: S.Struct({
      passphrase: S.String,
    }),
    success: SessionIssue,
    error: S.Union(
      AuthenticationFailedError,
      RateLimitedError,
      RecoveryDisabledError,
    ),
  },
)

export const updateStatusBannerRpc = Rpc.make('updateStatusBanner', {
  payload: S.Struct({
    sessionToken: SessionToken,
    banner: StatusBanner,
    nonce: S.String,
    issuedAt: S.Number,
  }),
  success: S.Void,
  error: S.Union(
    UnauthorizedError,
    RateLimitedError,
    InvalidNonceError,
    StaleRequestError,
    ValidationError,
  ),
})

export const subscribeStatusBannerRpc = Rpc.make('subscribeStatusBanner', {
  payload: S.Struct({}),
  success: StatusBanner,
  stream: true,
})

export const listRegisteredPasskeysRpc = Rpc.make('listRegisteredPasskeys', {
  payload: S.Struct({ sessionToken: SessionToken }),
  success: S.Struct({
    passkeys: S.Array(RegisteredPasskeySummary),
    passphraseEnabled: S.Boolean,
  }),
  error: UnauthorizedError,
})

export const passkeyRegistrationStatusRpc = Rpc.make(
  'passkeyRegistrationStatus',
  {
    payload: S.Struct({}),
    success: S.Struct({
      hasRegisteredPasskey: S.Boolean,
      passphraseEnabled: S.Boolean,
    }),
  },
)

export const beginRegisterPasskeyRpc = Rpc.make('beginRegisterPasskey', {
  payload: S.Struct({ sessionToken: SessionToken }),
  success: RegistrationOptions,
  error: UnauthorizedError,
})

export const finishRegisterPasskeyRpc = Rpc.make('finishRegisterPasskey', {
  payload: S.Struct({
    sessionToken: SessionToken,
    label: S.String,
    response: RegistrationResponse,
  }),
  success: RegisteredPasskeySummary,
  error: S.Union(
    UnauthorizedError,
    AuthenticationFailedError,
    ValidationError,
  ),
})

export const deletePasskeyRpc = Rpc.make('deletePasskey', {
  payload: S.Struct({
    sessionToken: SessionToken,
    credentialId: S.String,
  }),
  success: S.Void,
  error: S.Union(UnauthorizedError, ValidationError),
})

export class NowRpcs extends RpcGroup.make(
  beginAuthenticationRpc,
  finishAuthenticationRpc,
  authenticateWithPassphraseRpc,
  updateStatusBannerRpc,
  subscribeStatusBannerRpc,
  passkeyRegistrationStatusRpc,
  listRegisteredPasskeysRpc,
  beginRegisterPasskeyRpc,
  finishRegisterPasskeyRpc,
  deletePasskeyRpc,
) {}
