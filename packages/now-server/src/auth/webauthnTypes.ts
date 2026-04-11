import type {
  AuthenticationResponse,
  RegistrationResponse,
} from '@foldkit/now-shared'
import type { VerifyAuthenticationResponseOpts } from '@simplewebauthn/server'

// NOTE: @simplewebauthn/types is a transitive dep and is not directly
// importable. We use the library's own parameter types to derive what the
// response JSON shape must look like, then coerce our Schema-typed payloads
// to it by filtering undefined optional fields.
type AuthenticationResponseJSON = VerifyAuthenticationResponseOpts['response']
type RegistrationResponseJSON = Parameters<
  typeof import('@simplewebauthn/server').verifyRegistrationResponse
>[0]['response']

type KnownTransport =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb'

const AUTHENTICATOR_TRANSPORT_SET: ReadonlySet<string> = new Set([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
])

const isKnownTransport = (value: string): value is KnownTransport =>
  AUTHENTICATOR_TRANSPORT_SET.has(value)

export const filterKnownTransports = (
  transports: ReadonlyArray<string> | undefined,
): Array<KnownTransport> | undefined => {
  if (transports === undefined) {
    return undefined
  }
  const filtered = transports.filter(isKnownTransport)
  return filtered.length === 0 ? undefined : [...filtered]
}

// NOTE: clientExtensionResults is passed through unchanged by the
// @simplewebauthn/server verify functions (not used for the signature
// verification itself), so we flatten it to an empty object when coercing
// our Schema-typed payload into the library's expected shape.
export const toAuthenticationResponseJSON = (
  payload: AuthenticationResponse,
): AuthenticationResponseJSON => ({
  id: payload.id,
  rawId: payload.rawId,
  type: 'public-key',
  response: {
    clientDataJSON: payload.response.clientDataJSON,
    authenticatorData: payload.response.authenticatorData,
    signature: payload.response.signature,
    ...(payload.response.userHandle !== undefined
      ? { userHandle: payload.response.userHandle }
      : {}),
  },
  clientExtensionResults: {},
  ...(payload.authenticatorAttachment !== undefined
    ? { authenticatorAttachment: payload.authenticatorAttachment }
    : {}),
})

export const toRegistrationResponseJSON = (
  payload: RegistrationResponse,
): RegistrationResponseJSON => ({
  id: payload.id,
  rawId: payload.rawId,
  type: 'public-key',
  response: {
    clientDataJSON: payload.response.clientDataJSON,
    attestationObject: payload.response.attestationObject,
    ...(payload.response.authenticatorData !== undefined
      ? { authenticatorData: payload.response.authenticatorData }
      : {}),
    ...(payload.response.publicKeyAlgorithm !== undefined
      ? { publicKeyAlgorithm: payload.response.publicKeyAlgorithm }
      : {}),
    ...(payload.response.publicKey !== undefined
      ? { publicKey: payload.response.publicKey }
      : {}),
    ...(payload.response.transports !== undefined
      ? { transports: filterKnownTransports(payload.response.transports) ?? [] }
      : {}),
  },
  clientExtensionResults: {},
  ...(payload.authenticatorAttachment !== undefined
    ? { authenticatorAttachment: payload.authenticatorAttachment }
    : {}),
})
