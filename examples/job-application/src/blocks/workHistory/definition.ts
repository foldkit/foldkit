import { Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Block, Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { WorkHistoryEntry as Entry } from './blocks'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.WorkHistoryEntryBlock.Model),
  today: Calendar.CalendarDate,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  CompletedGenerateWorkHistoryEntryId: { entryId: Schema.String },
  RemovedEntry: { entryId: Schema.String },
})
export type Message = typeof Message.Type

export const InMessage = defineMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const WorkHistoryKey = Symbol('WorkHistory')

export const WorkHistoryDefinition = Block.makeDefinition('WorkHistory', {
  key: WorkHistoryKey,
  Init: Schema.Tuple([Calendar.CalendarDate, Schema.String]),
  view: { kind: 'Element' },
  effects: { services: [SecureRandom.SecureRandom] },
  Model,
  Message,
  InMessage,
  ChildInitContext: Schema.Struct({
    today: Calendar.CalendarDate,
    initialEntryId: Schema.String,
  }),
})

export const { makeFieldsStep, makeCommandsStep } = WorkHistoryDefinition
