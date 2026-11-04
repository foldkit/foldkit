// blocks/settings/definition.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message, OutMessage } from './message'
import { Model } from './model'
import { SettingsStore } from './service'

export const SettingsKey = Symbol('Settings')

export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  inMessageOutputs: {
    RequestedReset: {
      outMessage: OutMessage.ChangedTheme,
    },
  },
  effects: { services: [SettingsStore] },
})

// blocks/settings/block.ts
import { Effect } from 'effect'

import { SettingsBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const layer = SettingsBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
)

// blocks/settings/index.ts
export { SettingsBlock, SettingsKey } from './definition'
export { layer } from './block'
export { isDirty } from './validation'

// blocks/index.ts
export { SettingsBlock } from './settings'
export * as Settings from './settings'
