import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ isTicking: Schema.Boolean })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Ticked: {},
  CompletedLoadPreferences: {},
})
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})
