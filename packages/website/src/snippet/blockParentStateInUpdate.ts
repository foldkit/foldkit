import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const CurrentUser = Schema.Struct({ name: Schema.String })
type CurrentUser = typeof CurrentUser.Type

const Theme = Schema.Literals(['Light', 'Dark'])
type Theme = typeof Theme.Type

const AccountSettingsModel = Schema.Struct({
  theme: Theme,
  auditTrail: Schema.Array(Schema.String),
})
type AccountSettingsModel = typeof AccountSettingsModel.Type

const AccountSettingsMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})
type AccountSettingsMessage = typeof AccountSettingsMessage.Type

export const AccountSettingsKey = Symbol('AccountSettings')
export const AccountSettingsBlock = Block.make('AccountSettings', {
  key: AccountSettingsKey,
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([CurrentUser]),
  view: { kind: 'Element' },
  Model: AccountSettingsModel,
  Message: AccountSettingsMessage,
})

const AccountSettingsComposition = AccountSettingsBlock.makeComposition()

const accountSettingsInit = AccountSettingsComposition.makeInit(() => ({
  model: AccountSettingsModel.make({
    theme: 'Light',
    auditTrail: [],
  }),
}))
const accountSettingsUpdate = AccountSettingsComposition.makeUpdate.withContext(
  (currentUser: CurrentUser) => ({
    ChangedTheme: (model, { theme }) => ({
      model: modifyFields(model, {
        theme: () => theme,
        auditTrail: Array.append(currentUser.name),
      }),
    }),
  }),
)
const accountSettingsView = AccountSettingsComposition.makeView((model, h) =>
  h.p([], [`${model.theme}; audit: ${Array.join(model.auditTrail, ', ')}`]),
)

const layer = AccountSettingsBlock.makeLayer({
  init: accountSettingsInit,
  update: accountSettingsUpdate,
  view: accountSettingsView,
})

const ProfileModel = Schema.Struct({
  currentUser: CurrentUser,
  accountSettings: AccountSettingsModel,
})
type ProfileModel = typeof ProfileModel.Type

const ProfileMessage = defineMessageUnion({})
type ProfileMessage = typeof ProfileMessage.Type

export const ProfileKey = Symbol('Profile')
const ProfileBlock = Block.make('Profile', {
  key: ProfileKey,
  InitArgs: Schema.Tuple([]),
  Model: ProfileModel,
  Message: ProfileMessage,
})

export const AccountSettingsBinding = ProfileBlock.makeRequiredFieldBinding(
  AccountSettingsBlock,
  {
    field: 'accountSettings',
    delivery: {
      toUpdateContext: model => [model.currentUser],
    },
  },
)

export const ProfileComposition = ProfileBlock.makeComposition({
  bindings: [AccountSettingsBinding],
})
