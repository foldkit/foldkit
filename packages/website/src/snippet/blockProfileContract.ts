import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Theme } from './blockDefinition'
import * as Settings from './blockSettings'

export const Model = Schema.Struct({
  displayName: Schema.String,
  settings: Settings.SettingsBlock.Model,
  previewTheme: Theme,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({})
export type Message = typeof Message.Type

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const { makeFieldsStep } = ApplicationDefinition
