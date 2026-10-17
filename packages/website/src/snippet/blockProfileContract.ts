import { Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Settings from './blockSettings'

export const Model = Schema.Struct({
  displayName: Schema.String,
  settings: Settings.Model,
  previewTheme: Settings.Theme,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotSettingsMessage: { message: Settings.Message },
})
export type Message = typeof Message.Type

export const Application = defineApplication({ Model, Message })
