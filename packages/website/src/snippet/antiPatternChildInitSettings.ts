// block.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark'])
export type Theme = typeof Theme.Type

export const Message = defineMessageUnion({
  CompletedRefreshAvailableThemes: {},
})
export type Message = typeof Message.Type

export const InMessage = defineInMessageUnion({
  RequestedRestore: { theme: Theme },
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  RestoredTheme: { theme: Theme },
})
export type OutMessage = typeof OutMessage.Type

export const Model = Schema.Struct({ theme: Theme })
export type Model = typeof Model.Type

export const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedRestore: { outMessage: OutMessage.RestoredTheme },
  },

  Model,
  Message,
  InMessage,
  OutMessage,
})

const { makeComposition } = SettingsBlock

// settings.ts

import { modifyFields } from 'foldkit/struct'

import { EffectsLayer, RefreshAvailableThemes } from './command'

const SettingsComposition = makeComposition()

export const init = SettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'Light' }),
}))

export const update = SettingsComposition.makeUpdate({
  CompletedRefreshAvailableThemes: model => ({ model }),
})

export const inMessageUpdate = SettingsComposition.makeInMessageUpdate({
  RequestedRestore: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
    commands: [RefreshAvailableThemes()],
    outMessage: OutMessage.RestoredTheme({ theme }),
  }),
})

export const layer = SettingsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  EffectsLayer,
})
