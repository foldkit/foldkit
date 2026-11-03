import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  count: Schema.Number,
  label: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
  ChangedLabel: { label: Schema.String },
  CompletedSave: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Saved: { count: Schema.Number },
})
export type OutMessage = typeof OutMessage.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()
export const { makeFieldsStep, makeStep, makeNoopStep } = ApplicationDefinition
