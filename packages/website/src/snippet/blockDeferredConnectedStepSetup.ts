import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Settings from './blockSettings'

const Model = Schema.Struct({
  settings: Settings.SettingsBlock.Model,
  resetCount: Schema.Number,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({ RequestedResetSettings: {} })
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const {
  makeNoopStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = ApplicationBlock

export const SettingsBinding = makeRequiredFieldBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: makeNoopStep,
  }),
})
export const ApplicationComposition = makeComposition({
  bindings: [SettingsBinding],
})
