import {
  StatusBanner,
  type StatusBanner as StatusBannerType,
} from '@foldkit/now-shared'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  authenticateWithPassphrase,
  beginPasskeyLogin,
  beginRegisterPasskey,
  deletePasskey,
  finishPasskeyLogin,
  finishRegisterPasskey,
  loadPasskeys,
  loadRegistrationStatus,
  saveBanner,
} from './command'
import { FailedSaveBanner, type Message } from './message'
import {
  type BannerDraft,
  Locked,
  LoggingIn,
  type Model,
  PasskeysSection,
  RegisterPasskeyState,
  SaveBannerState,
  Unlocked,
  initialLocked,
  statusBannerToDraft,
} from './model'

type UpdateResult = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const noop = (model: Model): UpdateResult => [model, []]

const withBannerDraftField =
  (fieldUpdater: (draft: BannerDraft) => BannerDraft) =>
  (model: Model): UpdateResult => {
    if (model._tag !== 'Unlocked') {
      return noop(model)
    }
    const nextDraft = fieldUpdater(model.bannerDraft)
    return [evo(model, { bannerDraft: () => nextDraft }), []]
  }

const withPasskeysLoaded =
  (
    updater: (
      passkeys: ReadonlyArray<
        import('@foldkit/now-shared').RegisteredPasskeySummary
      >,
      registerState: RegisterPasskeyState,
      passphraseEnabled: boolean,
    ) => {
      passkeys: ReadonlyArray<
        import('@foldkit/now-shared').RegisteredPasskeySummary
      >
      registerState: RegisterPasskeyState
      passphraseEnabled: boolean
    },
  ) =>
  (
    model: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateResult => {
    if (model._tag !== 'Unlocked') {
      return [model, commands]
    }
    if (model.passkeysSection._tag !== 'LoadedPasskeys') {
      return [model, commands]
    }
    const { passkeys, registerState, passphraseEnabled } = updater(
      model.passkeysSection.passkeys,
      model.passkeysSection.registerState,
      model.passkeysSection.passphraseEnabled,
    )
    return [
      evo(model, {
        passkeysSection: () =>
          PasskeysSection.members[1].make({
            passkeys,
            registerState,
            passphraseEnabled,
          }),
      }),
      commands,
    ]
  }

const onUnlockedLoginSuccess = (
  sessionToken: import('@foldkit/now-shared').SessionToken,
  expiresAt: number,
  knownBanner: StatusBannerType,
): UpdateResult => {
  const unlocked = Unlocked.make({
    sessionToken,
    sessionExpiresAt: expiresAt,
    bannerDraft: statusBannerToDraft(knownBanner),
    savedBanner: knownBanner,
    saveState: SaveBannerState.members[0].make({}),
    passkeysSection: PasskeysSection.members[0].make({}),
  })
  return [unlocked, [loadPasskeys(sessionToken)]]
}

export const update =
  (knownBanner: StatusBannerType) =>
  (model: Model, message: Message): UpdateResult =>
    M.value(message).pipe(
      M.tagsExhaustive({
        SucceededLoadRegistrationStatus: ({
          hasRegisteredPasskey,
          passphraseEnabled,
        }): UpdateResult => {
          if (model._tag !== 'Loading') {
            return noop(model)
          }
          return [initialLocked(hasRegisteredPasskey, passphraseEnabled), []]
        },
        FailedLoadRegistrationStatus: (): UpdateResult => {
          if (model._tag !== 'Loading') {
            return noop(model)
          }
          return [initialLocked(false, true), []]
        },

        UpdatedPassphraseField: ({ value }): UpdateResult => {
          if (model._tag === 'Locked') {
            return [evo(model, { passphraseValue: () => value }), []]
          }
          if (model._tag === 'LoggingIn') {
            return [evo(model, { passphraseValue: () => value }), []]
          }
          return noop(model)
        },

        ClickedLoginWithPasskey: (): UpdateResult => {
          if (model._tag !== 'Locked') {
            return noop(model)
          }
          return [
            LoggingIn.make({
              method: 'Passkey',
              canUsePasskey: model.canUsePasskey,
              canUsePassphrase: model.canUsePassphrase,
              passphraseValue: model.passphraseValue,
            }),
            [beginPasskeyLogin],
          ]
        },

        SucceededBeginPasskeyLogin: ({ options }): UpdateResult => {
          if (model._tag !== 'LoggingIn' || model.method !== 'Passkey') {
            return noop(model)
          }
          return [model, [finishPasskeyLogin(options)]]
        },

        SucceededPasskeyLogin: ({ sessionToken, expiresAt }): UpdateResult =>
          onUnlockedLoginSuccess(sessionToken, expiresAt, knownBanner),

        FailedPasskeyLogin: ({ reason }): UpdateResult => {
          const base =
            model._tag === 'LoggingIn' || model._tag === 'Locked'
              ? {
                  canUsePasskey:
                    model._tag === 'LoggingIn'
                      ? model.canUsePasskey
                      : model.canUsePasskey,
                  canUsePassphrase:
                    model._tag === 'LoggingIn'
                      ? model.canUsePassphrase
                      : model.canUsePassphrase,
                  passphraseValue:
                    model._tag === 'LoggingIn'
                      ? model.passphraseValue
                      : model.passphraseValue,
                }
              : {
                  canUsePasskey: false,
                  canUsePassphrase: true,
                  passphraseValue: '',
                }
          return [
            Locked.make({
              passphraseValue: base.passphraseValue,
              maybeLoginError: Option.some(reason),
              canUsePasskey: base.canUsePasskey,
              canUsePassphrase: base.canUsePassphrase,
            }),
            [],
          ]
        },

        SubmittedPassphraseForm: (): UpdateResult => {
          if (model._tag !== 'Locked') {
            return noop(model)
          }
          if (model.passphraseValue.length === 0) {
            return noop(model)
          }
          return [
            LoggingIn.make({
              method: 'Passphrase',
              canUsePasskey: model.canUsePasskey,
              canUsePassphrase: model.canUsePassphrase,
              passphraseValue: model.passphraseValue,
            }),
            [authenticateWithPassphrase(model.passphraseValue)],
          ]
        },

        SucceededPassphraseLogin: ({ sessionToken, expiresAt }): UpdateResult =>
          onUnlockedLoginSuccess(sessionToken, expiresAt, knownBanner),

        FailedPassphraseLogin: ({ reason }): UpdateResult => {
          const base =
            model._tag === 'LoggingIn' || model._tag === 'Locked' ? model : null
          if (base === null) {
            return noop(model)
          }
          return [
            Locked.make({
              passphraseValue: '',
              maybeLoginError: Option.some(reason),
              canUsePasskey: base.canUsePasskey,
              canUsePassphrase: base.canUsePassphrase,
            }),
            [],
          ]
        },

        ClickedLogout: (): UpdateResult => [
          initialLocked(true, true),
          [loadRegistrationStatus],
        ],

        UpdatedBannerMessageField: ({ value }) =>
          withBannerDraftField(banner => ({ ...banner, message: value }))(
            model,
          ),
        UpdatedBannerAvatarUrlField: ({ value }) =>
          withBannerDraftField(banner => ({ ...banner, avatarUrl: value }))(
            model,
          ),
        UpdatedBannerProfileHandleField: ({ value }) =>
          withBannerDraftField(banner => ({
            ...banner,
            profileHandle: value,
          }))(model),
        UpdatedBannerProfileUrlField: ({ value }) =>
          withBannerDraftField(banner => ({ ...banner, profileUrl: value }))(
            model,
          ),

        ClickedSaveBanner: (): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          const decodeResult = S.decodeUnknownEither(StatusBanner)(
            model.bannerDraft,
          )
          if (decodeResult._tag === 'Left') {
            const reason = String(decodeResult.left)
            return [
              evo(model, {
                saveState: () => SaveBannerState.members[3].make({ reason }),
              }),
              [
                Command.define(
                  'ReportLocalValidationFailure',
                  FailedSaveBanner,
                )(Effect.succeed(FailedSaveBanner({ reason }))),
              ],
            ]
          }
          return [
            evo(model, {
              saveState: () => SaveBannerState.members[1].make({}),
            }),
            [saveBanner(model.sessionToken, decodeResult.right)],
          ]
        },

        SucceededSaveBanner: ({ banner, savedAtMillis }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [
            evo(model, {
              savedBanner: () => banner,
              bannerDraft: () => statusBannerToDraft(banner),
              saveState: () =>
                SaveBannerState.members[2].make({ savedAtMillis }),
            }),
            [],
          ]
        },

        FailedSaveBanner: ({ reason }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [
            evo(model, {
              saveState: () => SaveBannerState.members[3].make({ reason }),
            }),
            [],
          ]
        },

        ClickedResetBannerDraft: (): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [
            evo(model, {
              bannerDraft: () => statusBannerToDraft(model.savedBanner),
              saveState: () => SaveBannerState.members[0].make({}),
            }),
            [],
          ]
        },

        SucceededLoadPasskeys: ({
          passkeys,
          passphraseEnabled,
        }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[1].make({
                  passkeys,
                  registerState: RegisterPasskeyState.members[0].make({
                    labelDraft: '',
                  }),
                  passphraseEnabled,
                }),
            }),
            [],
          ]
        },

        FailedLoadPasskeys: ({ reason }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[2].make({ reason }),
            }),
            [],
          ]
        },

        UpdatedPasskeyLabelField: ({ value }): UpdateResult =>
          withPasskeysLoaded((passkeys, registerState, passphraseEnabled) => {
            const nextRegisterState =
              registerState._tag === 'Registering'
                ? registerState
                : RegisterPasskeyState.members[0].make({ labelDraft: value })
            return {
              passkeys,
              registerState: nextRegisterState,
              passphraseEnabled,
            }
          })(model, []),

        ClickedRegisterPasskey: (): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          if (model.passkeysSection._tag !== 'LoadedPasskeys') {
            return noop(model)
          }
          const registerState = model.passkeysSection.registerState
          if (registerState._tag === 'Registering') {
            return noop(model)
          }
          const labelDraft =
            registerState._tag === 'RegisterIdle'
              ? registerState.labelDraft
              : registerState.labelDraft
          if (labelDraft.trim().length === 0) {
            return noop(model)
          }
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[1].make({
                  passkeys:
                    model.passkeysSection._tag === 'LoadedPasskeys'
                      ? model.passkeysSection.passkeys
                      : [],
                  registerState: RegisterPasskeyState.members[1].make({}),
                  passphraseEnabled:
                    model.passkeysSection._tag === 'LoadedPasskeys'
                      ? model.passkeysSection.passphraseEnabled
                      : true,
                }),
            }),
            [beginRegisterPasskey(model.sessionToken)],
          ]
        },

        SucceededBeginPasskeyRegistration: ({ options }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          if (model.passkeysSection._tag !== 'LoadedPasskeys') {
            return noop(model)
          }
          const registerState = model.passkeysSection.registerState
          if (registerState._tag !== 'Registering') {
            return noop(model)
          }
          return [
            model,
            [finishRegisterPasskey(model.sessionToken, 'New passkey', options)],
          ]
        },

        SucceededRegisterPasskey: ({ passkey }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          if (model.passkeysSection._tag !== 'LoadedPasskeys') {
            return noop(model)
          }
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[1].make({
                  passkeys: [
                    ...(model.passkeysSection._tag === 'LoadedPasskeys'
                      ? model.passkeysSection.passkeys
                      : []),
                    passkey,
                  ],
                  registerState: RegisterPasskeyState.members[0].make({
                    labelDraft: '',
                  }),
                  passphraseEnabled:
                    model.passkeysSection._tag === 'LoadedPasskeys'
                      ? model.passkeysSection.passphraseEnabled
                      : true,
                }),
            }),
            [],
          ]
        },

        FailedRegisterPasskey: ({ reason }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          if (model.passkeysSection._tag !== 'LoadedPasskeys') {
            return noop(model)
          }
          const current = model.passkeysSection
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[1].make({
                  passkeys: current.passkeys,
                  registerState: RegisterPasskeyState.members[2].make({
                    reason,
                    labelDraft: '',
                  }),
                  passphraseEnabled: current.passphraseEnabled,
                }),
            }),
            [],
          ]
        },

        ClickedDeletePasskey: ({ credentialId }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          return [model, [deletePasskey(model.sessionToken, credentialId)]]
        },

        SucceededDeletePasskey: ({ credentialId }): UpdateResult => {
          if (model._tag !== 'Unlocked') {
            return noop(model)
          }
          if (model.passkeysSection._tag !== 'LoadedPasskeys') {
            return noop(model)
          }
          const current = model.passkeysSection
          return [
            evo(model, {
              passkeysSection: () =>
                PasskeysSection.members[1].make({
                  passkeys: current.passkeys.filter(
                    p => p.credentialId !== credentialId,
                  ),
                  registerState: current.registerState,
                  passphraseEnabled: current.passphraseEnabled,
                }),
            }),
            [],
          ]
        },

        FailedDeletePasskey: (): UpdateResult => noop(model),

        DetectedSessionExpired: (): UpdateResult => [
          initialLocked(true, true),
          [loadRegistrationStatus],
        ],
      }),
    )
