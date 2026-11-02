import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { DatePickerBlock } from '@foldkit/ui'

export const Model = Schema.Struct({
  id: Schema.String,
  company: Field(Schema.String),
  title: Field(Schema.String),
  startDate: DatePickerBlock.Model,
  maybeStartDate: Schema.Option(CalendarDate),
  endDate: DatePickerBlock.Model,
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

export const InMessage = defineMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})
export type OutMessage = typeof OutMessage.Type

export const WorkHistoryEntryKey = Symbol('WorkHistoryEntry')

export const WorkHistoryEntryDefinition = Block.makeDefinition(
  'WorkHistoryEntry',
  {
    key: WorkHistoryEntryKey,
    Init: Schema.Tuple([Schema.String, CalendarDate]),
    view: { kind: 'Element' },
    Model,
    Message,
    InMessage,
    OutMessage,
    ChildInitContext: Schema.Struct({
      entryId: Schema.String,
      today: CalendarDate,
    }),
  },
)

export const { makeFieldsStep, makeOutMessageStep, makeNoopStep } =
  WorkHistoryEntryDefinition
