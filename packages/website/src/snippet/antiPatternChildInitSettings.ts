// definition.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark'])

export const Message = defineMessageUnion({
  RequestedRestore: { theme: Theme },
  CompletedRefreshAvailableThemes: {},
})

export const OutMessage = defineMessageUnion({
  RestoredTheme: { theme: Theme },
})

export const Model = Schema.Struct({ theme: Theme })
export const SettingsDefinition = Block.makeDefinition('Settings', {
  Model,
  Message,
  OutMessage,
})

// settings.ts
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { EffectsLayer, RefreshAvailableThemes } from './command'
import { Message, Model, OutMessage, SettingsDefinition } from './definition'

const SettingsComposition = SettingsDefinition.makeComposition()
const requestRestore = Message.RequestedRestore

export const init = SettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'Light' }),
}))

export const update = SettingsComposition.makeUpdate({
  RequestedRestore: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
    commands: [RefreshAvailableThemes()],
    outMessage: OutMessage.RestoredTheme({ theme }),
  }),
  CompletedRefreshAvailableThemes: model => ({ model }),
})

const prepare = () =>
  SettingsComposition.prepareBlock({
    init,
    update,
    operations: { requestRestore },
    EffectsLayer,
  })
export const block: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
