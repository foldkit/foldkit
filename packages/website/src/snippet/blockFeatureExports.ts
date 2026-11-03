// blocks/settings/definition.ts
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message, OutMessage } from './message'
import { Model } from './model'
import { SettingsStore } from './service'

const SettingsKey = Symbol('Settings')

export const SettingsDefinition = Block.makeDefinition('Settings', {
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

export const SettingsBlock = SettingsDefinition.contract

// blocks/settings/block.ts

import { ApplicationDefinition, SettingsDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const layer = SettingsDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, receive, view, EffectsLayer }
  }),
).layer

// blocks/settings/index.ts
export { SettingsBlock } from './definition'
export { layer } from './block'

// blocks/index.ts
export { SettingsBlock } from './settings'
export * as Settings from './settings'

// Parent model.ts
import { SettingsBlock } from './blocks'

export const Model = Schema.Struct({ settings: SettingsBlock.Model })
export type Model = typeof Model.Type

// Parent composition.ts

export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({ fold: foldSettingsOutMessage })

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

// Parent block.ts
import { Settings } from './blocks'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return { children: [settings], init, update, view }
  }),
).provide(Settings.layer)
