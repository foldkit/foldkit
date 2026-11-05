import {
  makeFieldsStep,
  makeBinding,
  makeOutMessageFold,
} from './blockProfileContract'
import * as Settings from './blockSettings'

export const SettingsBinding = makeBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({
        previewTheme: () => theme,
      })),
  }),
})
