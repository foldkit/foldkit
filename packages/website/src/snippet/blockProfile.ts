import { Effect, Layer } from 'effect'

import {
  ApplicationBlock,
  makeFieldsStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
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

export const ApplicationComposition = makeComposition({
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

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return {
      children: [settings],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Settings.layer))

export { ApplicationBlock } from './blockProfileContract'
