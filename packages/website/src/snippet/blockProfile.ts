import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Application, Message, Model } from './blockProfileContract'
import * as Settings from './blockSettings'

const foldSettingsOutMessage = Settings.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedTheme:
    ({ theme }) =>
    model => ({
      model: modifyFields(model, { previewTheme: () => theme }),
    }),
})

export const SettingsBinding = Application.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  outMessage: { fold: foldSettingsOutMessage },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [SettingsBinding],
})

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    displayName: 'Ada',
    previewTheme: 'System',
  },
}))

export const update = ApplicationComposition.makeUpdate()

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `${model.displayName}'s profile`,
  body: h.block(
    SettingsBinding.embedView({
      slotId: 'settings',
      model: model.settings,
    }),
  ),
}))

export { Application, Message, Model }
