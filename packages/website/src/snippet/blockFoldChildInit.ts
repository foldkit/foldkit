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

export const ThemePickerKey = Symbol('ThemePicker')
export const ThemePickerBlock = Block.make('ThemePicker', {
  key: ThemePickerKey,
  InitArgs: Schema.Tuple([Theme]),
  view: { kind: 'Element' },
  Model: ThemePickerModel,
  Message: ThemePickerMessage,
})

const ThemePickerComposition = ThemePickerBlock.makeComposition()

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

const layer = ThemePickerBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: themePickerInit,
      update: themePickerUpdate,
      view: themePickerView,
    }
  }),
)

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

export const ProfileKey = Symbol('Profile')
const ProfileBlock = Block.make('Profile', {
  key: ProfileKey,
  InitArgs: Schema.Tuple([ProfileChildInitContext]),
  Model: ProfileModel,
  Message: ProfileMessage,
  ChildInitContext: ProfileChildInitContext,
})

const ThemePickerBinding = ProfileBlock.makeRequiredFieldBinding(
  ThemePickerBlock,
  {
    field: 'themePicker',
    init: {
      contextToArgs: ({ savedTheme }) => [savedTheme],
    },
  },
)

const ProfileComposition = ProfileBlock.makeComposition({
  bindings: [ThemePickerBinding],
})

export const init = ProfileComposition.makeInit(childInitContext => ({
  childInitContext,
  model: { username: childInitContext.username },
}))
