import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Theme = Schema.Literals(['Light', 'Dark', 'System'])
type Theme = typeof Theme.Type

const ThemePickerModel = Schema.Struct({ theme: Theme })
const ThemePickerMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})

const ThemePicker = Block.define('ThemePicker', {
  Model: ThemePickerModel,
  Message: ThemePickerMessage,
})
const ThemePickerComposition = ThemePicker.makeComposition()

const themePickerInit = ThemePickerComposition.makeInit((theme: Theme) => ({
  model: ThemePickerModel.make({ theme }),
}))
const themePickerUpdate = ThemePickerComposition.makeUpdate((model, message) =>
  ThemePickerMessage.match(message, {
    ChangedTheme: ({ theme }) => ({
      model: modifyFields(model, { theme: () => theme }),
    }),
  }),
)
const themePickerView = ThemePickerComposition.makeView((model, h) =>
  h.p([], [`Theme: ${model.theme}`]),
)
const themePickerBlock = ThemePickerComposition.makeBlock({
  init: themePickerInit,
  update: themePickerUpdate,
  view: themePickerView,
})

const ProfileModel = Schema.Struct({
  username: Schema.String,
  themePicker: ThemePickerModel,
})
const ProfileMessage = defineMessageUnion({
  GotThemePickerMessage: { message: ThemePickerMessage },
})
const ProfileStartup = Schema.Struct({
  username: Schema.String,
  savedTheme: Theme,
})
type ProfileStartup = typeof ProfileStartup.Type

const Profile = Block.define('Profile', {
  Model: ProfileModel,
  Message: ProfileMessage,
  Startup: ProfileStartup,
})

const ThemePickerBinding = Profile.bindChild(themePickerBlock, {
  field: 'themePicker',
  parentMessage: ProfileMessage.GotThemePickerMessage,
  init: {
    args: ({ savedTheme }) => [savedTheme],
  },
})

const ProfileComposition = Profile.makeComposition({
  childBindings: [ThemePickerBinding],
})

export const init = ProfileComposition.makeInit((startup: ProfileStartup) => ({
  startup,
  model: { username: startup.username },
}))
