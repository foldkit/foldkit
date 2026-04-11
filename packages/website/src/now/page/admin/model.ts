import {
  RegisteredPasskeySummary,
  SessionToken,
  StatusBanner,
} from '@foldkit/now-shared'
import { Option, Schema as S } from 'effect'

// DRAFT (plain-string editable form of StatusBanner before validation)

export const BannerDraft = S.Struct({
  message: S.String,
  avatarUrl: S.String,
  profileHandle: S.String,
  profileUrl: S.String,
})
export type BannerDraft = typeof BannerDraft.Type

export const statusBannerToDraft = (banner: StatusBanner): BannerDraft => ({
  message: banner.message,
  avatarUrl: banner.avatarUrl,
  profileHandle: banner.profileHandle,
  profileUrl: banner.profileUrl,
})

// STATE

export const Loading = S.TaggedStruct('Loading', {})
export type Loading = typeof Loading.Type

export const Locked = S.TaggedStruct('Locked', {
  passphraseValue: S.String,
  maybeLoginError: S.OptionFromSelf(S.String),
  canUsePasskey: S.Boolean,
  canUsePassphrase: S.Boolean,
})
export type Locked = typeof Locked.Type

export const LoggingIn = S.TaggedStruct('LoggingIn', {
  method: S.Literal('Passkey', 'Passphrase'),
  canUsePasskey: S.Boolean,
  canUsePassphrase: S.Boolean,
  passphraseValue: S.String,
})
export type LoggingIn = typeof LoggingIn.Type

export const SaveBannerState = S.Union(
  S.TaggedStruct('SaveIdle', {}),
  S.TaggedStruct('Saving', {}),
  S.TaggedStruct('SavedAt', { savedAtMillis: S.Number }),
  S.TaggedStruct('SaveFailed', { reason: S.String }),
)
export type SaveBannerState = typeof SaveBannerState.Type

export const RegisterPasskeyState = S.Union(
  S.TaggedStruct('RegisterIdle', { labelDraft: S.String }),
  S.TaggedStruct('Registering', {}),
  S.TaggedStruct('RegisterFailed', {
    reason: S.String,
    labelDraft: S.String,
  }),
)
export type RegisterPasskeyState = typeof RegisterPasskeyState.Type

export const PasskeysSection = S.Union(
  S.TaggedStruct('LoadingPasskeys', {}),
  S.TaggedStruct('LoadedPasskeys', {
    passkeys: S.Array(RegisteredPasskeySummary),
    registerState: RegisterPasskeyState,
    passphraseEnabled: S.Boolean,
  }),
  S.TaggedStruct('FailedLoadPasskeys', { reason: S.String }),
)
export type PasskeysSection = typeof PasskeysSection.Type

export const Unlocked = S.TaggedStruct('Unlocked', {
  sessionToken: SessionToken,
  sessionExpiresAt: S.Number,
  bannerDraft: BannerDraft,
  savedBanner: StatusBanner,
  saveState: SaveBannerState,
  passkeysSection: PasskeysSection,
})
export type Unlocked = typeof Unlocked.Type

export const Model = S.Union(Loading, Locked, LoggingIn, Unlocked)
export type Model = typeof Model.Type

// INIT

export const init = (): Model => Loading.make({})

export const initialLocked = (
  canUsePasskey: boolean,
  canUsePassphrase: boolean,
): Locked =>
  Locked.make({
    passphraseValue: '',
    maybeLoginError: Option.none(),
    canUsePasskey,
    canUsePassphrase,
  })
