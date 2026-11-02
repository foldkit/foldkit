import { Array, Effect, Schema } from 'effect'
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

const AccountSettingsKey = Symbol('AccountSettings')

const AccountSettingsDefinition = Block.makeDefinition('AccountSettings', {
  key: AccountSettingsKey,
  Init: Schema.Tuple([]),
  Context: Schema.Tuple([CurrentUser]),
  view: { kind: 'Element' },
  Model: AccountSettingsModel,
  Message: AccountSettingsMessage,
})

const AccountSettingsComposition = AccountSettingsDefinition.makeComposition()

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
const AccountSettingsBlock = AccountSettingsDefinition.contract

const layer = AccountSettingsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init: accountSettingsInit,
      update: accountSettingsUpdate,
      view: accountSettingsView,
    }
  }),
).layer

const ProfileModel = Schema.Struct({
  currentUser: CurrentUser,
  accountSettings: AccountSettingsModel,
})
type ProfileModel = typeof ProfileModel.Type

const ProfileMessage = defineMessageUnion({})
type ProfileMessage = typeof ProfileMessage.Type

const ProfileKey = Symbol('Profile')

const ProfileDefinition = Block.makeDefinition('Profile', {
  key: ProfileKey,
  Init: Schema.Tuple([]),
  Model: ProfileModel,
  Message: ProfileMessage,
})

export const AccountSettingsBinding = ProfileDefinition.makeBinding(
  AccountSettingsBlock,
  {
    field: 'accountSettings',
    delivery: {
      toUpdateContext: model => [model.currentUser],
    },
  },
)

export const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [AccountSettingsBinding],
})
