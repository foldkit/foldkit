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

const { makeOutMessageStep } = ApplicationDefinition

export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeOutMessageStep(model =>
        OutMessage.ChangedTheme({
          theme,
          changeCount: model.themeChangeCount,
        }),
      ),
  }),
})

const changeThemeStep = (theme: typeof Theme.Type) => {
  const requestThemeChangeStep = SettingsBinding.requestThemeChange({ theme })

  return (model: Parameters<typeof requestThemeChangeStep>[0]) =>
    requestThemeChangeStep(
      modifyFields(model, { themeChangeCount: Number.increment }),
    )
}

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

export const update = ApplicationComposition.makeUpdate({
  RequestedDarkTheme: changeThemeStep('Dark'),
})
