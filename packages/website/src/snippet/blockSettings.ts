import { modifyFields } from 'foldkit/struct'

import {
  Message,
  Model,
  OutMessage,
  SaveTheme,
  SettingsBlock,
  SettingsComposition,
  Theme,
  makeNoopStep,
  makeStep,
} from './blockDefinition'

const changeTheme = makeStep((model, theme: Theme) => ({
  model: modifyFields(model, { theme: () => theme }),
  commands: [SaveTheme({ theme })],
  outMessage: OutMessage.ChangedTheme({ theme }),
}))

const update = SettingsComposition.makeUpdate({
  ChangedTheme: (model, { theme }) => changeTheme(model, theme),
  CompletedSaveTheme: makeNoopStep(),
  FailedSaveTheme: makeNoopStep(),
})

const inMessageUpdate = SettingsComposition.makeInMessageUpdate({
  RequestedThemeChange: (model, { theme }) => changeTheme(model, theme),
  RequestedReset: model => changeTheme(model, 'System'),
})

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

export { SettingsBlock } from './blockDefinition'

export const layer = SettingsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: SaveTheme.layer,
})
