import { ApplicationBlock, makeFieldsStep } from './blockProfileContract'
import * as Settings from './blockSettings'

export const SettingsBinding = ApplicationBlock.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({
        previewTheme: () => theme,
      })),
  }),
})
