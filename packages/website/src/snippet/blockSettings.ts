import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  Message,
  Model,
  OutMessage,
  SaveTheme,
  SettingsDefinition,
  SettingsComposition,
  Theme,
} from './blockDefinition'

const changeTheme = SettingsDefinition.makeStep(
  (model, theme: typeof Theme.Type) => ({
    model: modifyFields(model, { theme: () => theme }),
    commands: [SaveTheme({ theme })],
    outMessage: OutMessage.ChangedTheme({ theme }),
  }),
)

const update = SettingsComposition.makeUpdate({
  ChangedTheme: (model, { theme }) => changeTheme(model, theme),
  RequestedThemeChange: (model, { theme }) => changeTheme(model, theme),
  RequestedReset: model => changeTheme(model, 'System'),
  CompletedSaveTheme: SettingsDefinition.makeNoopStep(),
  FailedSaveTheme: SettingsDefinition.makeNoopStep(),
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

const prepare = () =>
  SettingsComposition.prepareBlock({
    init,
    update,
    view,
    operations: {
      requestThemeChange: Message.RequestedThemeChange,
      requestReset: Message.RequestedReset,
    },
    EffectsLayer: SaveTheme.layer,
  })
export const SettingsBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
