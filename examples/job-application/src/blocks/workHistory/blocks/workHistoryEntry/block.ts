import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { DatePicker } from '@foldkit/ui'

export const Model = Schema.Struct({
  id: Schema.String,
  company: Field(Schema.String),
  title: Field(Schema.String),
  startDate: DatePicker.DatePickerBlock.Model,
  maybeStartDate: Schema.Option(CalendarDate),
  endDate: DatePicker.DatePickerBlock.Model,
  maybeEndDate: Schema.Option(CalendarDate),
  isCurrentlyEmployed: Schema.Boolean,
  description: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedCompany: { value: Schema.String },
  UpdatedTitle: { value: Schema.String },
  ToggledCurrentlyEmployed: { isChecked: Schema.Boolean },
  UpdatedDescription: { value: Schema.String },
  ClickedRemoveSelf: {},
})
export type Message = typeof Message.Type

export const InMessage = defineInMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})
export type OutMessage = typeof OutMessage.Type

export const WorkHistoryEntryKey = Symbol('WorkHistoryEntry')
export const WorkHistoryEntryBlock = Block.make('WorkHistoryEntry', {
  key: WorkHistoryEntryKey,
  InitArgs: Schema.Tuple([Schema.String, CalendarDate]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
  OutMessage,
  ChildInitContext: Schema.Struct({
    entryId: Schema.String,
    today: CalendarDate,
  }),
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
} = WorkHistoryEntryBlock
