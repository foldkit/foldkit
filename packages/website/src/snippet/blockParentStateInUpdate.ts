import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const CurrentUser = Schema.Struct({ name: Schema.String })
type CurrentUser = typeof CurrentUser.Type
const Theme = Schema.Literals(['Light', 'Dark'])

const AccountSettingsModel = Schema.Struct({
  theme: Theme,
  auditTrail: Schema.Array(Schema.String),
})
const AccountSettingsMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})

const AccountSettings = Block.define('AccountSettings', {
  Model: AccountSettingsModel,
  Message: AccountSettingsMessage,
})
const AccountSettingsComposition = AccountSettings.makeComposition()

const accountSettingsInit = AccountSettingsComposition.makeInit(() => ({
  model: AccountSettingsModel.make({
    theme: 'Light',
    auditTrail: [],
  }),
}))
const accountSettingsUpdate = AccountSettingsComposition.makeUpdate(
  (model, message, currentUser: CurrentUser) =>
    AccountSettingsMessage.match(message, {
      ChangedTheme: ({ theme }) => ({
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
const accountSettingsBlock = AccountSettingsComposition.makeBlock({
  init: accountSettingsInit,
  update: accountSettingsUpdate,
  view: accountSettingsView,
})

const ProfileModel = Schema.Struct({
  currentUser: CurrentUser,
  accountSettings: AccountSettingsModel,
})
const ProfileMessage = defineMessageUnion({
  GotAccountSettingsMessage: { message: AccountSettingsMessage },
})
const Profile = Block.define('Profile', {
  Model: ProfileModel,
  Message: ProfileMessage,
})

export const AccountSettingsBinding = Profile.bindChild(accountSettingsBlock, {
  field: 'accountSettings',
  parentMessage: ProfileMessage.GotAccountSettingsMessage,
  fromParentMessage: {
    parentMessage: ProfileMessage.GotAccountSettingsMessage,
    args: (model, { message }) => Option.some([message, model.currentUser]),
  },
})

export const ProfileComposition = Profile.makeComposition({
  childBindings: [AccountSettingsBinding],
})
