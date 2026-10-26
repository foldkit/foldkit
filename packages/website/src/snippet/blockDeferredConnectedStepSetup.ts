import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Settings from './blockSettings'

const Model = Schema.Struct({
  settings: Settings.SettingsBlock.Model,
  resetCount: Schema.Number,
})
export const Message = defineMessageUnion({ RequestedResetSettings: {} })
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeNoopStep } = ApplicationDefinition

export const SettingsBinding = ApplicationDefinition.makeBinding(
  Settings.SettingsBlock,
  { field: 'settings' },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Settings.SettingsBlock, {
    ChangedTheme: makeNoopStep,
  }),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})
