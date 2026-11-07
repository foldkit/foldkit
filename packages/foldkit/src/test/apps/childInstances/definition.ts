import { Schema } from 'effect'

import { makeDefinition } from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
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
export const ApplicationDefinition = makeDefinition('OccurrenceApplication', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Schema.Array(Schema.Number)]),
  effects: { services: [CounterSource] },
  view: { kind: 'Element' },
})
export const { makeFieldsStep, makeStep } = ApplicationDefinition
