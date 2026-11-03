import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { DatePickerBlock } from '@foldkit/ui/datePicker'
import { makeBlock as makeListboxBlock } from '@foldkit/ui/listbox'

export const PronounsListboxBlock = makeListboxBlock()

export const Model = Schema.Struct({
  firstName: Field(Schema.String),
  lastName: Field(Schema.String),
  email: Field(Schema.String),
  emailValidationId: Schema.Number,
  phone: Field(Schema.String),
  pronouns: PronounsListboxBlock.Model,
  maybeSelectedPronoun: Schema.Option(Schema.String),
  customPronouns: Schema.String,
  portfolioUrl: Field(Schema.String),
  availableDate: DatePickerBlock.Model,
  maybeAvailableDate: Schema.Option(CalendarDate),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedFirstName: { value: Schema.String },
  UpdatedLastName: { value: Schema.String },
  UpdatedEmail: { value: Schema.String },
  CompletedValidateEmailAsync: {
    validationId: Schema.Number,
    field: Field(Schema.String),
  },
  UpdatedPhone: { value: Schema.String },
  UpdatedCustomPronouns: { value: Schema.String },
  UpdatedPortfolioUrl: { value: Schema.String },
})
export type Message = typeof Message.Type

export const InMessage = defineMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const PersonalInfoKey = Symbol('PersonalInfo')

export const PersonalInfoDefinition = Block.makeDefinition('PersonalInfo', {
  key: PersonalInfoKey,
  Init: Schema.Tuple([CalendarDate]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
  ChildInitContext: CalendarDate,
})

export const { makeFieldsStep, makeNoopStep } = PersonalInfoDefinition
