import { Match as M, Option, Schema as S } from 'effect'
import { Update } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { DatePicker } from '@foldkit/ui'

import { revealFieldErrors } from '../validation'

// FIELD VALIDATION

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

// MODEL

export const Model = S.Struct({
  id: S.String,
  company: Field(S.String),
  title: Field(S.String),
  startDate: DatePicker.Model,
  maybeStartDate: S.Option(CalendarDate),
  endDate: DatePicker.Model,
  maybeEndDate: S.Option(CalendarDate),
  isCurrentlyEmployed: S.Boolean,
  description: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedCompany: { value: S.String },
  UpdatedTitle: { value: S.String },
  GotStartDateMessage: { message: DatePicker.Message },
  GotEndDateMessage: { message: DatePicker.Message },
  ToggledCurrentlyEmployed: { isChecked: S.Boolean },
  UpdatedDescription: { value: S.String },
  ClickedRemoveSelf: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  Removed: {},
})

export type OutMessage = typeof OutMessage.Type

export type Removed = typeof OutMessage.Removed.Type

// INIT

export const init = (entryId: string, today: CalendarDate): Model => ({
  id: entryId,
  company: NotValidated({ value: '' }),
  title: NotValidated({ value: '' }),
  startDate: DatePicker.init({ id: `${entryId}-start`, today }),
  maybeStartDate: Option.none(),
  endDate: DatePicker.init({ id: `${entryId}-end`, today }),
  maybeEndDate: Option.none(),
  isCurrentlyEmployed: false,
  description: '',
})

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const foldStartDateOutMessage = M.type<DatePicker.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ChangedViewMonth: () => model => ({ model }),
    SelectedDate:
      ({ date }) =>
      model => ({
        model: evo(model, {
          maybeStartDate: () => Option.some(date),
          endDate: DatePicker.reflectMinDate(Option.some(date)),
        }),
      }),
    ClearedDate: () => model => ({
      model: evo(model, {
        maybeStartDate: () => Option.none(),
        endDate: DatePicker.reflectMinDate(Option.none()),
      }),
    }),
  }),
)

const foldStartDate = Update.foldChild({
  update: DatePicker.update,
  read: (model: Model) => Option.some(model.startDate),
  write: (model, nextStartDate) =>
    evo(model, { startDate: () => nextStartDate }),
  toParentMessage: message => Message.GotStartDateMessage({ message }),
  toParentOutMessage: () => undefined,
  foldOutMessage: foldStartDateOutMessage,
})

const foldEndDateOutMessage = M.type<DatePicker.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ChangedViewMonth: () => model => ({ model }),
    SelectedDate:
      ({ date }) =>
      model => ({
        model: evo(model, {
          maybeEndDate: () => Option.some(date),
          startDate: DatePicker.reflectMaxDate(Option.some(date)),
        }),
      }),
    ClearedDate: () => model => ({
      model: evo(model, {
        maybeEndDate: () => Option.none(),
        startDate: DatePicker.reflectMaxDate(Option.none()),
      }),
    }),
  }),
)

const foldEndDate = Update.foldChild({
  update: DatePicker.update,
  read: (model: Model) => Option.some(model.endDate),
  write: (model, nextEndDate) => evo(model, { endDate: () => nextEndDate }),
  toParentMessage: message => Message.GotEndDateMessage({ message }),
  toParentOutMessage: () => undefined,
  foldOutMessage: foldEndDateOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedCompany: ({ value }) => ({
      model: evo(model, { company: () => validateCompany(value) }),
    }),

    UpdatedTitle: ({ value }) => ({
      model: evo(model, { title: () => validateTitle(value) }),
    }),

    GotStartDateMessage: ({ message }) => foldStartDate(model, message),

    GotEndDateMessage: ({ message }) => foldEndDate(model, message),

    ToggledCurrentlyEmployed: ({ isChecked }) => ({
      model: evo(model, { isCurrentlyEmployed: () => isChecked }),
    }),

    UpdatedDescription: ({ value }) => ({
      model: evo(model, { description: () => value }),
    }),

    ClickedRemoveSelf: () => ({ model, outMessage: OutMessage.Removed() }),
  })

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])

export const revealErrors = (entry: Model): Model =>
  evo(entry, {
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })
