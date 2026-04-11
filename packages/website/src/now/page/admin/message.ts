import {
  AuthenticationOptions,
  RegisteredPasskeySummary,
  RegistrationOptions,
  SessionToken,
  StatusBanner,
} from '@foldkit/now-shared'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// STATUS / SESSION

export const SucceededLoadRegistrationStatus = m(
  'SucceededLoadRegistrationStatus',
  {
    hasRegisteredPasskey: S.Boolean,
    passphraseEnabled: S.Boolean,
  },
)
export const FailedLoadRegistrationStatus = m('FailedLoadRegistrationStatus')

// LOGIN

export const UpdatedPassphraseField = m('UpdatedPassphraseField', {
  value: S.String,
})

export const ClickedLoginWithPasskey = m('ClickedLoginWithPasskey')

export const SucceededBeginPasskeyLogin = m('SucceededBeginPasskeyLogin', {
  options: AuthenticationOptions,
})

export const FailedPasskeyLogin = m('FailedPasskeyLogin', {
  reason: S.String,
})

export const SucceededPasskeyLogin = m('SucceededPasskeyLogin', {
  sessionToken: SessionToken,
  expiresAt: S.Number,
})

export const SubmittedPassphraseForm = m('SubmittedPassphraseForm')

export const SucceededPassphraseLogin = m('SucceededPassphraseLogin', {
  sessionToken: SessionToken,
  expiresAt: S.Number,
})

export const FailedPassphraseLogin = m('FailedPassphraseLogin', {
  reason: S.String,
})

export const ClickedLogout = m('ClickedLogout')

// BANNER FORM

export const UpdatedBannerMessageField = m('UpdatedBannerMessageField', {
  value: S.String,
})
export const UpdatedBannerAvatarUrlField = m('UpdatedBannerAvatarUrlField', {
  value: S.String,
})
export const UpdatedBannerProfileHandleField = m(
  'UpdatedBannerProfileHandleField',
  { value: S.String },
)
export const UpdatedBannerProfileUrlField = m('UpdatedBannerProfileUrlField', {
  value: S.String,
})

export const ClickedSaveBanner = m('ClickedSaveBanner')
export const SucceededSaveBanner = m('SucceededSaveBanner', {
  banner: StatusBanner,
  savedAtMillis: S.Number,
})
export const FailedSaveBanner = m('FailedSaveBanner', {
  reason: S.String,
})

export const ClickedResetBannerDraft = m('ClickedResetBannerDraft')

// PASSKEY MANAGEMENT

export const SucceededLoadPasskeys = m('SucceededLoadPasskeys', {
  passkeys: S.Array(RegisteredPasskeySummary),
  passphraseEnabled: S.Boolean,
})
export const FailedLoadPasskeys = m('FailedLoadPasskeys', {
  reason: S.String,
})

export const UpdatedPasskeyLabelField = m('UpdatedPasskeyLabelField', {
  value: S.String,
})

export const ClickedRegisterPasskey = m('ClickedRegisterPasskey')

export const SucceededBeginPasskeyRegistration = m(
  'SucceededBeginPasskeyRegistration',
  { options: RegistrationOptions },
)

export const SucceededRegisterPasskey = m('SucceededRegisterPasskey', {
  passkey: RegisteredPasskeySummary,
})

export const FailedRegisterPasskey = m('FailedRegisterPasskey', {
  reason: S.String,
})

export const ClickedDeletePasskey = m('ClickedDeletePasskey', {
  credentialId: S.String,
})

export const SucceededDeletePasskey = m('SucceededDeletePasskey', {
  credentialId: S.String,
})

export const FailedDeletePasskey = m('FailedDeletePasskey', {
  reason: S.String,
})

// SESSION EXPIRED

export const DetectedSessionExpired = m('DetectedSessionExpired')

export const Message = S.Union(
  SucceededLoadRegistrationStatus,
  FailedLoadRegistrationStatus,
  UpdatedPassphraseField,
  ClickedLoginWithPasskey,
  SucceededBeginPasskeyLogin,
  FailedPasskeyLogin,
  SucceededPasskeyLogin,
  SubmittedPassphraseForm,
  SucceededPassphraseLogin,
  FailedPassphraseLogin,
  ClickedLogout,
  UpdatedBannerMessageField,
  UpdatedBannerAvatarUrlField,
  UpdatedBannerProfileHandleField,
  UpdatedBannerProfileUrlField,
  ClickedSaveBanner,
  SucceededSaveBanner,
  FailedSaveBanner,
  ClickedResetBannerDraft,
  SucceededLoadPasskeys,
  FailedLoadPasskeys,
  UpdatedPasskeyLabelField,
  ClickedRegisterPasskey,
  SucceededBeginPasskeyRegistration,
  SucceededRegisterPasskey,
  FailedRegisterPasskey,
  ClickedDeletePasskey,
  SucceededDeletePasskey,
  FailedDeletePasskey,
  DetectedSessionExpired,
)
export type Message = typeof Message.Type
