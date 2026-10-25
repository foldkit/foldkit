import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Theme } from './blockDefinition'
import { SettingsBlock } from './blockSettings'

export const Model = Schema.Struct({
  settings: SettingsBlock.Model,
  themeChangeCount: Schema.Number,
})
const Message = defineMessageUnion({ RequestedDarkTheme: {} })
export const OutMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme, changeCount: Schema.Number },
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  OutMessage,
})
export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      ApplicationDefinition.makeOutMessageStep(model =>
        OutMessage.ChangedTheme({
          theme,
          changeCount: model.themeChangeCount,
        }),
      ),
  }),
})

const changeTheme = (theme: typeof Theme.Type) => {
  const requestThemeChange = SettingsBinding.requestThemeChange({ theme })

  return (model: Parameters<typeof requestThemeChange>[0]) =>
    requestThemeChange(
      modifyFields(model, { themeChangeCount: Number.increment }),
    )
}

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

export const update = ApplicationComposition.makeUpdate({
  RequestedDarkTheme: changeTheme('Dark'),
})
