// Before: a Binding with an OutMessage policy, an operation, and embedView.
import { Block } from 'foldkit'

import { ApplicationDefinition, makeFieldsStep } from './definition'
import { SettingsBlock } from './settings'

export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      makeFieldsStep(() => ({ previewTheme: () => theme })),
  }),
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

const update = ApplicationComposition.makeUpdate({
  ClickedResetSettings: model => SettingsBinding.requestReset()(model),
})

const view = ApplicationComposition.makeView((model, h) => ({
  title: `Theme: ${model.previewTheme}`,
  body: h.main(
    [],
    [h.block(SettingsBinding.embedView({ model: model.settings }))],
  ),
}))
