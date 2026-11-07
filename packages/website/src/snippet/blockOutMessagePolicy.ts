import {
  makeFieldsStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
} from './blockProfileContract'
import * as Settings from './blockSettings'

export const SettingsBinding = makeRequiredFieldBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({
        previewTheme: () => theme,
      })),
  }),
})
