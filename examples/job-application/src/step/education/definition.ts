import { Schema } from 'effect'
import { Block, Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Entry from './entry/definition'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.Model),
  today: Calendar.CalendarDate,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateEducationEntryId: { entryId: Schema.String },
  FailedGenerateEducationEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  GotEntryMessage: {
    entryId: Schema.String,
    message: Entry.Message,
  },
})

export type Message = typeof Message.Type

export const Education = Block.define('Education', {
  Model,
  Message,
  Startup: Schema.Struct({
    today: Calendar.CalendarDate,
    initialEntryId: Schema.String,
  }),
})
