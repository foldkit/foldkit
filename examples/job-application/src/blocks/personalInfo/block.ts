import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import { Field } from 'foldkit/fieldValidation'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { DatePicker, Listbox } from '@foldkit/ui'

import { PronounOption } from '../../domain'

export const PronounsListboxBlock = Listbox.makeBlock(
  PronounOption.PronounOption,
)

export const Model = Schema.Struct({
  firstName: Field(Schema.String),
  lastName: Field(Schema.String),
  email: Field(Schema.String),
  emailValidationId: Schema.Number,
  phone: Field(Schema.String),
  pronouns: PronounsListboxBlock.Model,
  maybeSelectedPronoun: Schema.Option(PronounOption.PronounOption),
  customPronouns: Schema.String,
  portfolioUrl: Field(Schema.String),
  availableDate: DatePicker.DatePickerBlock.Model,
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

export const InMessage = defineInMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const PersonalInfoKey = Symbol('PersonalInfo')
export const PersonalInfoBlock = Block.make('PersonalInfo', {
  key: PersonalInfoKey,
  InitArgs: Schema.Tuple([CalendarDate]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
  ChildInitContext: CalendarDate,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} = PersonalInfoBlock
