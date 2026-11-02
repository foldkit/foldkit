import { Effect, Number, Schema } from 'effect'
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

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  effects: { services: [SettingsStore] },
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

const changeTheme = (theme: Theme) => {
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

const init = ApplicationComposition.makeInit(() => ({
  model: { themeChangeCount: 3 },
}))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return { children: [settings], init, update }
  }),
).provide(SettingsLayer)
