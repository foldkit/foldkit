import { modifyFields } from 'foldkit/struct'

import {
  Message,
  Model,
  OutMessage,
  SaveTheme,
  Settings,
  SettingsComposition,
  Theme,
} from './blockDefinition'

const update = SettingsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ChangedTheme: ({ theme }) => ({
      model: modifyFields(model, { theme: () => theme }),
      commands: [SaveTheme({ theme })],
      outMessage: OutMessage.ChangedTheme({ theme }),
    }),
    CompletedSaveTheme: () => ({ model }),
    FailedSaveTheme: () => ({ model }),
  }),
)

const reset = Settings.step(model => ({
  model: modifyFields(model, { theme: () => 'System' }),
  commands: [SaveTheme({ theme: 'System' })],
  outMessage: OutMessage.ChangedTheme({ theme: 'System' }),
}))

const view = SettingsComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.p([], [`Theme: ${model.theme}`]),
      h.button(
        [h.OnClick(Message.ChangedTheme({ theme: 'Dark' }))],
        ['Use dark theme'],
      ),
    ],
  ),
)

const init = SettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'System' }),
}))

export const block = SettingsComposition.makeBlock({
  init,
  update,
  view,
  expose: { reset },
  EffectsLayer: SaveTheme.layer,
})

export { Message, Model, OutMessage, Theme }
