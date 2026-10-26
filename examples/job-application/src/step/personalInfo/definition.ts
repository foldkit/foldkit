import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { DatePickerBlock, Listbox } from '@foldkit/ui'

export const PronounsListboxBlock = Listbox.create()

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

export const Message = defineMessageUnion({
  UpdatedFirstName: { value: Schema.String },
  UpdatedLastName: { value: Schema.String },
  UpdatedEmail: { value: Schema.String },
  CompletedValidateEmailAsync: {
    validationId: Schema.Number,
    field: Field(Schema.String),
  },
  UpdatedPhone: { value: Schema.String },
  RequestedRevealErrors: {},
  UpdatedCustomPronouns: { value: Schema.String },
  UpdatedPortfolioUrl: { value: Schema.String },
})

export const PersonalInfoDefinition = Block.makeDefinition('PersonalInfo', {
  Model,
  Message,
  ChildInitContext: CalendarDate,
})

export const { makeFieldsStep, makeNoopStep } = PersonalInfoDefinition
