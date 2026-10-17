import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { DatePicker, Listbox } from '@foldkit/ui'

export const PronounsListbox = Listbox.create()

export const Model = Schema.Struct({
  firstName: Field(Schema.String),
  lastName: Field(Schema.String),
  email: Field(Schema.String),
  emailValidationId: Schema.Number,
  phone: Field(Schema.String),
  pronouns: PronounsListbox.Model,
  maybeSelectedPronoun: Schema.Option(Schema.String),
  customPronouns: Schema.String,
  portfolioUrl: Field(Schema.String),
  availableDate: DatePicker.Model,
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
  GotPronounsMessage: { message: PronounsListbox.Message },
  UpdatedCustomPronouns: { value: Schema.String },
  UpdatedPortfolioUrl: { value: Schema.String },
  GotAvailableDateMessage: { message: DatePicker.Message },
})

export type Message = typeof Message.Type

export const PersonalInfo = Block.define('PersonalInfo', {
  Model,
  Message,
  Startup: CalendarDate,
})
