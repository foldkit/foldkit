import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { SettingsBlock, SettingsStore, Theme } from './blockDefinition'

export const Model = Schema.Struct({
  displayName: Schema.String,
  settings: SettingsBlock.Model,
  previewTheme: Theme,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [SettingsStore] },
  Model,
  Message,
})

export const {
  makeFieldsStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = ApplicationBlock
