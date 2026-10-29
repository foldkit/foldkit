import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  Message,
  Model,
  OutMessage,
  SaveTheme,
  SettingsComposition,
  Theme,
  makeNoopStep,
  makeStep,
} from './blockDefinition'

const changeThemeStep = makeStep((model, theme: Theme) => ({
  model: modifyFields(model, { theme: () => theme }),
  commands: [SaveTheme({ theme })],
  outMessage: OutMessage.ChangedTheme({ theme }),
}))

const update = SettingsComposition.makeUpdate({
  ChangedTheme: (model, { theme }) => changeThemeStep(model, theme),
  RequestedThemeChange: (model, { theme }) => changeThemeStep(model, theme),
  RequestedReset: model => changeThemeStep(model, 'System'),
  CompletedSaveTheme: makeNoopStep(),
  FailedSaveTheme: makeNoopStep(),
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
