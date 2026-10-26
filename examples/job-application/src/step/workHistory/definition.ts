import { Schema } from 'effect'
import { Block, Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Entry from './entry'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.WorkHistoryEntryBlock.Model),
  today: Calendar.CalendarDate,
})

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateWorkHistoryEntryId: { entryId: Schema.String },
  FailedGenerateWorkHistoryEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  RequestedRevealErrors: {},
})

export const WorkHistoryDefinition = Block.makeDefinition('WorkHistory', {
  Model,
  Message,
  ChildInitContext: Schema.Struct({
    today: Calendar.CalendarDate,
    initialEntryId: Schema.String,
  }),
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  WorkHistoryDefinition
