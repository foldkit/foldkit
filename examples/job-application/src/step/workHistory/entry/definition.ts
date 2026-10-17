import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { DatePicker } from '@foldkit/ui'

export const Model = Schema.Struct({
  id: Schema.String,
  company: Field(Schema.String),
  title: Field(Schema.String),
  startDate: DatePicker.Model,
  maybeStartDate: Schema.Option(CalendarDate),
  endDate: DatePicker.Model,
  maybeEndDate: Schema.Option(CalendarDate),
  isCurrentlyEmployed: Schema.Boolean,
  description: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedCompany: { value: Schema.String },
  UpdatedTitle: { value: Schema.String },
  GotStartDateMessage: { message: DatePicker.Message },
  GotEndDateMessage: { message: DatePicker.Message },
  ToggledCurrentlyEmployed: { isChecked: Schema.Boolean },
  UpdatedDescription: { value: Schema.String },
  ClickedRemoveSelf: {},
})

export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})

export type OutMessage = typeof OutMessage.Type

export type Removed = typeof OutMessage.Removed.Type

export const WorkHistoryEntry = Block.define('WorkHistoryEntry', {
  Model,
  Message,
  OutMessage,
  Startup: Schema.Struct({ entryId: Schema.String, today: CalendarDate }),
})
