import { Effect } from 'effect'
import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { SaveTheme } from './blockDefinition'
import { Application, Message, Model } from './blockProfileContract'
import * as Settings from './blockSettings'

const SettingsDemo = Settings.block.replaceEffectsLayer(
  SaveTheme.toLayer(
    Effect.succeed(() => Effect.succeed(Settings.Message.CompletedSaveTheme())),
  ),
)

const foldSettingsOutMessage = Settings.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedTheme:
    ({ theme }) =>
    model => ({
      model: modifyFields(model, { previewTheme: () => theme }),
    }),
})

export const SettingsBinding = Application.bindChild(SettingsDemo, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  outMessage: { fold: foldSettingsOutMessage },
})
