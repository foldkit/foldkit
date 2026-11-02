// page/settings/definition.ts
import { Schema } from 'effect'
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

// page/settings/block.ts
import { Effect } from 'effect'

import { SettingsDefinition } from './definition'
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

// page/settings/index.ts
export { SettingsBlock } from './definition'
export { layer } from './block'

// Parent model.ts
import { SettingsBlock } from './page/settings'

export const Model = Schema.Struct({ settings: SettingsBlock.Model })
export type Model = typeof Model.Type

// Parent composition.ts
import { ApplicationDefinition } from './definition'

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
import * as Settings from './page/settings'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return { children: [settings], init, update, view }
  }),
).provide(Settings.layer)
