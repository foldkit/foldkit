import { Effect } from 'effect'

import { SaveTheme } from './blockDefinition'
import { ApplicationDefinition, makeFieldsStep } from './blockProfileContract'
import * as Settings from './blockSettings'

const SettingsDemo = Settings.SettingsBlock.replaceEffectsLayer(
  SaveTheme.toLayer(
    Effect.succeed(() =>
      Effect.succeed(Settings.SettingsBlock.Message.CompletedSaveTheme()),
    ),
  ),
)

export const SettingsBinding = ApplicationDefinition.makeBinding(SettingsDemo, {
  field: 'settings',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SettingsDemo, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({
        previewTheme: () => theme,
      })),
  }),
})
