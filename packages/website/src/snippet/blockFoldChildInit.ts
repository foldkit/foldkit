import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Theme = Schema.Literals(['Light', 'Dark', 'System'])
type Theme = typeof Theme.Type

const ThemePickerModel = Schema.Struct({ theme: Theme })
type ThemePickerModel = typeof ThemePickerModel.Type

const ThemePickerMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})
type ThemePickerMessage = typeof ThemePickerMessage.Type

const ThemePickerKey = Symbol('ThemePicker')

const ThemePickerDefinition = Block.makeDefinition('ThemePicker', {
  key: ThemePickerKey,
  Init: Schema.Tuple([Theme]),
  view: { kind: 'Element' },
  Model: ThemePickerModel,
  Message: ThemePickerMessage,
})

const ThemePickerComposition = ThemePickerDefinition.makeComposition()

const themePickerInit = ThemePickerComposition.makeInit(theme => ({
  model: ThemePickerModel.make({ theme }),
}))
const themePickerUpdate = ThemePickerComposition.makeUpdate({
  ChangedTheme: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})
const themePickerView = ThemePickerComposition.makeView((model, h) =>
  h.p([], [`Theme: ${model.theme}`]),
)
const ThemePickerBlock = ThemePickerDefinition.contract

const layer = ThemePickerDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init: themePickerInit,
      update: themePickerUpdate,
      view: themePickerView,
    }
  }),
).layer

const ProfileModel = Schema.Struct({
  username: Schema.String,
  themePicker: ThemePickerModel,
})
type ProfileModel = typeof ProfileModel.Type

const ProfileMessage = defineMessageUnion({})
type ProfileMessage = typeof ProfileMessage.Type

const ProfileChildInitContext = Schema.Struct({
  username: Schema.String,
  savedTheme: Theme,
})
type ProfileChildInitContext = typeof ProfileChildInitContext.Type

const ProfileKey = Symbol('Profile')

const ProfileDefinition = Block.makeDefinition('Profile', {
  key: ProfileKey,
  Init: Schema.Tuple([ProfileChildInitContext]),
  Model: ProfileModel,
  Message: ProfileMessage,
  ChildInitContext: ProfileChildInitContext,
})

const ThemePickerBinding = ProfileDefinition.makeBinding(ThemePickerBlock, {
  field: 'themePicker',
  init: {
    contextToArgs: ({ savedTheme }) => [savedTheme],
  },
})

const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [ThemePickerBinding],
})

export const init = ProfileComposition.makeInit(childInitContext => ({
  childInitContext,
  model: { username: childInitContext.username },
}))
