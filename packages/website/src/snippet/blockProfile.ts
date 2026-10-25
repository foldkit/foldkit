import { Block } from 'foldkit'

import type { Model } from './blockProfileContract'
import { ApplicationDefinition } from './blockProfileContract'
import * as Settings from './blockSettings'

export const SettingsBinding = ApplicationDefinition.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: ({ theme }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
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

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
