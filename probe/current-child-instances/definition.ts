import { Schema } from 'effect'

import { make } from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { CounterBlock, CounterSource } from './counter.js'

export const Model = Schema.Struct({
  counters: Schema.Array(CounterBlock.Instance),
  summary: Schema.Number,
  lastChangedCount: Schema.Number,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedAddCounter: { key: Schema.String, count: Schema.Number },
  ClickedAddAndIncrement: { key: Schema.String, count: Schema.Number },
  ClickedRemoveCounter: { key: Schema.String },
})
export type Message = typeof Message.Type
export const ApplicationKey = Symbol('OccurrenceApplication')
export const ApplicationDefinition = make('OccurrenceApplication', {
  key: ApplicationKey,
  Model,
  Message,
  Init: Schema.Tuple([Schema.Array(Schema.Number)]),
  effects: { services: [CounterSource] },
  view: { kind: 'Element' },
})
export const { makeFieldsStep, makeStep } = ApplicationDefinition
