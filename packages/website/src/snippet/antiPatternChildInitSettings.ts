// definition.ts
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark'])
export type Theme = typeof Theme.Type

export const Message = defineMessageUnion({
  CompletedRefreshAvailableThemes: {},
})
export type Message = typeof Message.Type

export const InMessage = defineMessageUnion({
  RequestedRestore: { theme: Theme },
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  RestoredTheme: { theme: Theme },
})
export type OutMessage = typeof OutMessage.Type

export const Model = Schema.Struct({ theme: Theme })
export type Model = typeof Model.Type

const SettingsKey = Symbol('Settings')

export const SettingsDefinition = Block.makeDefinition('Settings', {
  key: SettingsKey,
  Init: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedRestore: { outMessage: OutMessage.RestoredTheme },
  },

  Model,
  Message,
  InMessage,
  OutMessage,
})

// settings.ts

import { modifyFields } from 'foldkit/struct'

import { EffectsLayer, RefreshAvailableThemes } from './command'
import { Message, Model, OutMessage, SettingsDefinition } from './definition'

const SettingsComposition = SettingsDefinition.makeComposition()

export const init = SettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'Light' }),
}))

export const update = SettingsComposition.makeUpdate({
  CompletedRefreshAvailableThemes: model => ({ model }),
})

export const receive = SettingsComposition.makeReceive({
  RequestedRestore: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
    commands: [RefreshAvailableThemes()],
    outMessage: OutMessage.RestoredTheme({ theme }),
  }),
})

export const block = SettingsDefinition.contract

export const layer = SettingsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      receive,
      EffectsLayer,
    }
  }),
).layer
