import { Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { SettingsStore, Theme } from './blockDefinition'
import { SettingsBlock, layer as SettingsLayer } from './blockSettings'

export const Model = Schema.Struct({
  settings: SettingsBlock.Model,
  themeChangeCount: Schema.Number,
})
export type Model = typeof Model.Type

const Message = defineMessageUnion({ RequestedDarkTheme: {} })
type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme, changeCount: Schema.Number },
})
export type OutMessage = typeof OutMessage.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  effects: { services: [SettingsStore] },
  Model,
  Message,
  OutMessage,
})

const {
  makeOutMessageStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = ApplicationBlock

export const SettingsBinding = makeRequiredFieldBinding(SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeOutMessageStep(model =>
        OutMessage.ChangedTheme({
          theme,
          changeCount: model.themeChangeCount,
        }),
      ),
  }),
})

const changeTheme = (theme: Theme) => {
  const requestThemeChange = SettingsBinding.requestThemeChange({ theme })

  return (model: Parameters<typeof requestThemeChange>[0]) =>
    requestThemeChange(
      modifyFields(model, { themeChangeCount: Number.increment }),
    )
}

const ApplicationComposition = makeComposition({
  bindings: [SettingsBinding],
})

export const update = ApplicationComposition.makeUpdate({
  RequestedDarkTheme: changeTheme('Dark'),
})

const init = ApplicationComposition.makeInit(() => ({
  model: { themeChangeCount: 3 },
}))

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
}).pipe(Layer.provide(SettingsLayer))
