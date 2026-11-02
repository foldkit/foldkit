import { Effect } from 'effect'

import { ApplicationDefinition, makeFieldsStep } from './blockProfileContract'
import * as Settings from './blockSettings'

export const SettingsBinding = ApplicationDefinition.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({
        previewTheme: () => theme,
      })),
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    displayName: 'Ada',
    previewTheme: 'System',
  },
}))

export const update = ApplicationComposition.makeUpdate({})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `${model.displayName}'s profile`,
  body: h.block(
    SettingsBinding.embedView({
      slotId: 'settings',
      model: model.settings,
    }),
  ),
}))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return { children: [settings], init, update, view }
  }),
).provide(Settings.layer)
